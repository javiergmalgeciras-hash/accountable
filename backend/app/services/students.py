from sqlalchemy import delete, insert, select, update
from sqlalchemy.engine import Connection

from backend.app.services.common import MUTATION_LOCK, DomainError, clean_required, normalize_name, now_local
from backend.app.services.sessions import occupancy_for_connection
from backend.app.tables import absences, group_students, groups, session_students, sessions, students


def _validate_groups(conn: Connection, student_id: int, group_ids: list[int]) -> list[int]:
    chosen = list(dict.fromkeys(group_ids))
    rows = conn.execute(select(groups.c.id, groups.c.capacity).where(groups.c.id.in_(chosen), groups.c.active.is_(True))).all() if chosen else []
    if len(rows) != len(chosen):
        raise DomainError("Uno o más grupos ya no están disponibles.")
    for row in rows:
        already_assigned = conn.execute(select(group_students.c.student_id).where(group_students.c.group_id == row.id, group_students.c.student_id == student_id)).first()
        count = conn.execute(select(group_students.c.student_id).where(group_students.c.group_id == row.id)).all()
        if not already_assigned and len(count) >= row.capacity:
            raise DomainError("El grupo no tiene plazas disponibles.", 409)
    return chosen


def _set_groups(conn: Connection, student_id: int, group_ids: list[int]) -> None:
    chosen = _validate_groups(conn, student_id, group_ids)
    current = {row.group_id for row in conn.execute(select(group_students.c.group_id).where(group_students.c.student_id == student_id))}
    conn.execute(delete(group_students).where(group_students.c.student_id == student_id, group_students.c.group_id.not_in(chosen))) if chosen else conn.execute(delete(group_students).where(group_students.c.student_id == student_id))
    for group_id in chosen:
        if group_id not in current:
            conn.execute(insert(group_students).values(student_id=student_id, group_id=group_id))
    # All future sessions follow current assignments; completed sessions keep their historical roster.
    affected_groups = current | set(chosen)
    if not affected_groups:
        return
    future = conn.execute(
        select(sessions.c.id, sessions.c.group_id, sessions.c.capacity)
        .where(sessions.c.starts_at > now_local(), sessions.c.group_id.in_(affected_groups))
    ).all()
    for session_id, group_id, capacity in future:
        rostered = conn.execute(select(session_students.c.student_id).where(session_students.c.session_id == session_id, session_students.c.student_id == student_id)).first()
        if group_id in chosen and not rostered:
            occupied, _ = occupancy_for_connection(conn, session_id, capacity)
            if occupied >= capacity:
                raise DomainError("Una sesión futura no tiene plazas disponibles.", 409)
            conn.execute(insert(session_students).values(session_id=session_id, student_id=student_id))
        elif group_id not in chosen and rostered:
            has_absence = conn.execute(
                select(absences.c.id).where(
                    absences.c.session_id == session_id,
                    absences.c.student_id == student_id,
                    absences.c.status == "accepted",
                )
            ).first()
            if not has_absence:
                conn.execute(delete(session_students).where(session_students.c.session_id == session_id, session_students.c.student_id == student_id))


def list_students(engine, search: str = "") -> list[dict]:
    term = normalize_name(search)
    with engine.connect() as conn:
        rows = conn.execute(select(students).where(students.c.active.is_(True)).order_by(students.c.name)).mappings().all()
        result = []
        for row in rows:
            if term and term not in row.normalized_name:
                continue
            assigned = conn.execute(select(group_students.c.group_id).where(group_students.c.student_id == row.id)).scalars().all()
            result.append({"id": row.id, "name": row.name, "phone": row.phone, "active": row.active, "groupIds": assigned})
        return result


def create_student(engine, payload: dict) -> dict:
    name = clean_required(payload["name"], "El nombre")
    normalized = normalize_name(name)
    phone = (payload.get("phone") or "").strip() or None
    with MUTATION_LOCK, engine.begin() as conn:
        if conn.execute(select(students.c.id).where(students.c.normalized_name == normalized)).first():
            raise DomainError("Ya existe un alumno con ese nombre.", 409)
        result = conn.execute(insert(students).values(name=name, normalized_name=normalized, phone=phone, active=True, created_at=now_local()))
        student_id = result.inserted_primary_key[0]
        _set_groups(conn, student_id, payload.get("groupIds", []))
    return get_student(engine, student_id)


def get_student(engine, student_id: int) -> dict:
    with engine.connect() as conn:
        row = conn.execute(select(students).where(students.c.id == student_id)).mappings().first()
        if not row:
            raise DomainError("No se encontró el alumno.", 404)
        group_ids = conn.execute(select(group_students.c.group_id).where(group_students.c.student_id == student_id)).scalars().all()
        return {"id": row.id, "name": row.name, "phone": row.phone, "active": row.active, "groupIds": group_ids}


def update_student(engine, student_id: int, payload: dict) -> dict:
    name = clean_required(payload["name"], "El nombre")
    normalized = normalize_name(name)
    phone = (payload.get("phone") or "").strip() or None
    with MUTATION_LOCK, engine.begin() as conn:
        existing = conn.execute(select(students.c.id).where(students.c.id == student_id)).first()
        if not existing:
            raise DomainError("No se encontró el alumno.", 404)
        duplicate = conn.execute(select(students.c.id).where(students.c.normalized_name == normalized, students.c.id != student_id)).first()
        if duplicate:
            raise DomainError("Ya existe un alumno con ese nombre.", 409)
        conn.execute(update(students).where(students.c.id == student_id).values(name=name, normalized_name=normalized, phone=phone))
        _set_groups(conn, student_id, payload.get("groupIds", []))
    return get_student(engine, student_id)


def deactivate_student(engine, student_id: int) -> dict:
    with MUTATION_LOCK, engine.begin() as conn:
        if not conn.execute(select(students.c.id).where(students.c.id == student_id)).first():
            raise DomainError("No se encontró el alumno.", 404)
        conn.execute(update(students).where(students.c.id == student_id).values(active=False))
        conn.execute(delete(group_students).where(group_students.c.student_id == student_id))
        # Upcoming sessions lose the assignment; completed session records stay intact.
        upcoming = conn.execute(select(sessions.c.id).where(sessions.c.starts_at > now_local())).scalars().all()
        for session_id in upcoming:
            has_absence = conn.execute(select(absences.c.id).where(absences.c.session_id == session_id, absences.c.student_id == student_id, absences.c.status == "accepted")).first()
            if not has_absence:
                conn.execute(delete(session_students).where(session_students.c.session_id == session_id, session_students.c.student_id == student_id))
    return {"id": student_id, "active": False}
