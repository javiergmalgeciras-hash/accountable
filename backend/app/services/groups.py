from datetime import date, datetime, timedelta

from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import IntegrityError

from backend.app.services.common import MUTATION_LOCK, DomainError, clean_required, now_local, parse_time
from backend.app.services.sessions import refresh_roster
from backend.app.tables import group_students, groups, recoveries, session_students, sessions, students, absences


def _validate(payload: dict, student_count: int) -> dict:
    name = clean_required(payload["name"], "El nombre del grupo")
    level = clean_required(payload["level"], "El nivel", 40)
    modality = clean_required(payload["modality"], "La modalidad", 40)
    weekday = payload.get("weekday")
    capacity = payload.get("capacity")
    if not isinstance(weekday, int) or not 0 <= weekday <= 6:
        raise DomainError("El día de la semana no es válido.")
    if not isinstance(capacity, int) or not 1 <= capacity <= 50:
        raise DomainError("El aforo debe estar entre 1 y 50.")
    if student_count > capacity:
        raise DomainError("El aforo no puede ser menor que el número de alumnos asignados.")
    if payload.get("recurrence", "Semanal") != "Semanal":
        raise DomainError("La única recurrencia disponible en esta fase es semanal.")
    starts = parse_time(payload["startTime"])
    return {
        "name": name,
        "level": level,
        "modality": modality,
        "weekday": weekday,
        "start_time": starts.strftime("%H:%M"),
        "recurrence": payload.get("recurrence", "Semanal"),
        "capacity": capacity,
    }


def _student_ids(conn, ids: list[int]) -> list[int]:
    chosen = list(dict.fromkeys(ids))
    if len(chosen) != len(ids):
        return chosen
    found = conn.execute(select(students.c.id).where(students.c.id.in_(chosen), students.c.active.is_(True))).scalars().all() if chosen else []
    if len(found) != len(chosen):
        raise DomainError("Uno o más alumnos no están disponibles.")
    return chosen


def _make_session(conn, group_id: int, starts_at: datetime, capacity: int, manual: bool = False) -> int:
    result = conn.execute(insert(sessions).values(group_id=group_id, starts_at=starts_at, capacity=capacity, enabled=True, manual=manual))
    session_id = result.inserted_primary_key[0]
    ids = conn.execute(select(group_students.c.student_id).where(group_students.c.group_id == group_id)).scalars().all()
    for student_id in ids:
        conn.execute(insert(session_students).values(session_id=session_id, student_id=student_id))
    return session_id


def _make_recurrence(conn, group_id: int, values: dict, from_day: date, days: int = 42, include_past_today: bool = False) -> None:
    weekday = values["weekday"]
    starts = parse_time(values["start_time"])
    for offset in range(days):
        day = from_day + timedelta(days=offset)
        if day.weekday() != weekday:
            continue
        start = datetime.combine(day, starts)
        if not include_past_today and start <= now_local():
            continue
        exists = conn.execute(select(sessions.c.id).where(sessions.c.group_id == group_id, sessions.c.starts_at == start)).first()
        if not exists:
            _make_session(conn, group_id, start, values["capacity"])


def _detail(conn, group_id: int) -> dict:
    row = conn.execute(select(groups).where(groups.c.id == group_id)).mappings().first()
    if not row:
        raise DomainError("No se encontró el grupo.", 404)
    ids = conn.execute(select(group_students.c.student_id).where(group_students.c.group_id == group_id)).scalars().all()
    return {"id": row.id, "name": row.name, "level": row.level, "modality": row.modality, "weekday": row.weekday, "startTime": row.start_time, "recurrence": row.recurrence, "capacity": row.capacity, "studentIds": ids, "active": row.active}


def list_groups(engine) -> list[dict]:
    with engine.connect() as conn:
        ids = conn.execute(select(groups.c.id).where(groups.c.active.is_(True)).order_by(groups.c.weekday, groups.c.start_time, groups.c.name)).scalars().all()
        return [_detail(conn, group_id) for group_id in ids]


def create_group(engine, payload: dict) -> dict:
    student_ids = payload.get("studentIds", [])
    with MUTATION_LOCK, engine.begin() as conn:
        chosen = _student_ids(conn, student_ids)
        values = _validate(payload, len(chosen))
        try:
            result = conn.execute(insert(groups).values(**values, active=True))
        except IntegrityError as exc:
            if "UNIQUE constraint failed" in str(exc):
                raise DomainError("Ya existe un grupo con ese nombre.", 409) from exc
            raise
        group_id = result.inserted_primary_key[0]
        for student_id in chosen:
            conn.execute(insert(group_students).values(group_id=group_id, student_id=student_id))
        _make_recurrence(conn, group_id, values, now_local().date())
    with engine.connect() as conn:
        return _detail(conn, group_id)


def update_group(engine, group_id: int, payload: dict) -> dict:
    student_ids = payload.get("studentIds", [])
    with MUTATION_LOCK, engine.begin() as conn:
        existing = conn.execute(select(groups).where(groups.c.id == group_id)).mappings().first()
        if not existing:
            raise DomainError("No se encontró el grupo.", 404)
        chosen = _student_ids(conn, student_ids)
        values = _validate(payload, len(chosen))
        occupancy_query = select(sessions.c.id, sessions.c.capacity).where(sessions.c.group_id == group_id, sessions.c.starts_at > now_local(), sessions.c.manual.is_(False))
        for session_id, _capacity in conn.execute(occupancy_query):
            from backend.app.services.sessions import occupancy

            occupied, _ = occupancy(engine, session_id, conn=conn)
            if occupied > values["capacity"]:
                raise DomainError("El aforo no puede quedar por debajo de la ocupación de una sesión futura.", 409)
        try:
            conn.execute(update(groups).where(groups.c.id == group_id).values(**values))
        except IntegrityError as exc:
            raise DomainError("Ya existe un grupo con ese nombre.", 409) from exc
        conn.execute(delete(group_students).where(group_students.c.group_id == group_id))
        for student_id in chosen:
            conn.execute(insert(group_students).values(group_id=group_id, student_id=student_id))

        old_future = conn.execute(select(sessions.c.id, sessions.c.starts_at).where(sessions.c.group_id == group_id, sessions.c.starts_at > now_local(), sessions.c.manual.is_(False))).all()
        for session_id, starts_at in old_future:
            referenced = conn.execute(select(absences.c.id).where(absences.c.session_id == session_id).limit(1)).first() or conn.execute(select(recoveries.c.id).where(recoveries.c.session_id == session_id).limit(1)).first()
            if referenced:
                conn.execute(update(sessions).where(sessions.c.id == session_id).values(capacity=values["capacity"]))
                continue
            conn.execute(delete(session_students).where(session_students.c.session_id == session_id))
            conn.execute(delete(sessions).where(sessions.c.id == session_id))
        _make_recurrence(conn, group_id, values, now_local().date())
        upcoming = conn.execute(select(sessions.c.id).where(sessions.c.group_id == group_id, sessions.c.starts_at > now_local(), sessions.c.manual.is_(False))).scalars().all()
        for session_id in upcoming:
            conn.execute(update(sessions).where(sessions.c.id == session_id).values(capacity=values["capacity"]))
            refresh_roster(conn, session_id, chosen)
    with engine.connect() as conn:
        return _detail(conn, group_id)
