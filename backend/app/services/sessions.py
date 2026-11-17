from datetime import date, datetime

from sqlalchemy import delete, insert, select
from sqlalchemy.engine import Connection

from backend.app.services.common import DomainError, now_local, to_iso
from backend.app.tables import absences, groups, recoveries, session_students, sessions, students


def occupancy(engine, session_id: int, *, conn: Connection | None = None) -> tuple[int, int]:
    owns_connection = conn is None
    connection = conn or engine.connect()
    try:
        session = connection.execute(select(sessions.c.capacity).where(sessions.c.id == session_id)).first()
        if not session:
            raise DomainError("No se encontró la sesión.", 404)
        base = connection.execute(select(session_students.c.student_id).where(session_students.c.session_id == session_id)).scalars().all()
        excused = connection.execute(select(absences.c.student_id).where(absences.c.session_id == session_id, absences.c.status == "accepted")).scalars().all()
        booked = connection.execute(select(recoveries.c.id).where(recoveries.c.session_id == session_id, recoveries.c.status == "confirmed")).scalars().all()
        occupied = len(base) - len(excused) + len(booked)
        if occupied < 0 or occupied > session.capacity:
            raise DomainError("La ocupación guardada no es válida para el aforo de esta sesión.", 409)
        return occupied, session.capacity
    finally:
        if owns_connection:
            connection.close()


def _detail(conn: Connection, session_id: int) -> dict:
    row = conn.execute(
        select(sessions, groups.c.name.label("group_name"), groups.c.level, groups.c.modality)
        .join(groups, groups.c.id == sessions.c.group_id)
        .where(sessions.c.id == session_id)
    ).mappings().first()
    if not row:
        raise DomainError("No se encontró la sesión.", 404)
    roster = conn.execute(
        select(students.c.id, students.c.name, students.c.phone)
        .join(session_students, session_students.c.student_id == students.c.id)
        .where(session_students.c.session_id == session_id)
        .order_by(students.c.name)
    ).mappings().all()
    absence_rows = conn.execute(
        select(absences.c.id, absences.c.student_id, students.c.name, absences.c.registered_at)
        .join(students, students.c.id == absences.c.student_id)
        .where(absences.c.session_id == session_id, absences.c.status == "accepted")
    ).mappings().all()
    recovery_rows = conn.execute(
        select(recoveries.c.id, recoveries.c.absence_id, recoveries.c.confirmed_at, students.c.id.label("student_id"), students.c.name)
        .join(absences, absences.c.id == recoveries.c.absence_id)
        .join(students, students.c.id == absences.c.student_id)
        .where(recoveries.c.session_id == session_id, recoveries.c.status == "confirmed")
    ).mappings().all()
    occupied, capacity = occupancy_for_connection(conn, session_id, row.capacity)
    free = capacity - occupied
    absence_ids = {item.student_id for item in absence_rows}
    names = {person.id: person.name for person in roster}
    people = [{"id": person.id, "name": person.name, "phone": person.phone, "absent": person.id in absence_ids} for person in roster]
    start = row.starts_at
    return {
        "id": row.id,
        "startsAt": to_iso(start),
        "capacity": capacity,
        "occupancy": occupied,
        "freeSeats": free,
        "status": "Completa" if free == 0 else "Disponible",
        "enabled": row.enabled,
        "manual": row.manual,
        "group": {"id": row.group_id, "name": row.group_name, "level": row.level, "modality": row.modality},
        "students": people,
        "absences": [{"id": item.id, "studentId": item.student_id, "name": item.name, "registeredAt": to_iso(item.registered_at)} for item in absence_rows],
        "recoveries": [{"id": item.id, "studentId": item.student_id, "name": item.name, "confirmedAt": to_iso(item.confirmed_at)} for item in recovery_rows],
        "labels": ["Ausencia"] * len(absence_rows) + ["Recuperación"] * len(recovery_rows),
    }


def occupancy_for_connection(conn: Connection, session_id: int, capacity: int) -> tuple[int, int]:
    base = conn.execute(select(session_students.c.student_id).where(session_students.c.session_id == session_id)).scalars().all()
    excused = conn.execute(select(absences.c.id).where(absences.c.session_id == session_id, absences.c.status == "accepted")).scalars().all()
    booked = conn.execute(select(recoveries.c.id).where(recoveries.c.session_id == session_id, recoveries.c.status == "confirmed")).scalars().all()
    occupied = len(base) - len(excused) + len(booked)
    if occupied < 0 or occupied > capacity:
        raise DomainError("La ocupación guardada no es válida para el aforo de esta sesión.", 409)
    return occupied, capacity


def get_session(engine, session_id: int) -> dict:
    with engine.connect() as conn:
        return _detail(conn, session_id)


def list_sessions(engine, start: date, end: date, group_id: int | None = None) -> list[dict]:
    if end < start:
        raise DomainError("El final del rango debe ser posterior al inicio.")
    if (end - start).days > 42:
        raise DomainError("El rango de agenda no puede superar 43 días.")
    with engine.connect() as conn:
        query = select(sessions.c.id).where(sessions.c.starts_at >= datetime.combine(start, datetime.min.time()), sessions.c.starts_at < datetime.combine(end.fromordinal(end.toordinal() + 1), datetime.min.time())).order_by(sessions.c.starts_at)
        if group_id is not None:
            query = query.where(sessions.c.group_id == group_id)
        ids = conn.execute(query).scalars().all()
        return [_detail(conn, session_id) for session_id in ids]


def refresh_roster(conn: Connection, session_id: int, student_ids: list[int]) -> None:
    existing = conn.execute(select(session_students.c.student_id).where(session_students.c.session_id == session_id)).scalars().all()
    excused = set(conn.execute(select(absences.c.student_id).where(absences.c.session_id == session_id, absences.c.status == "accepted")).scalars().all())
    for student_id in existing:
        if student_id not in student_ids and student_id not in excused:
            conn.execute(delete(session_students).where(session_students.c.session_id == session_id, session_students.c.student_id == student_id))
    for student_id in student_ids:
        if student_id not in existing:
            conn.execute(insert(session_students).values(session_id=session_id, student_id=student_id))
