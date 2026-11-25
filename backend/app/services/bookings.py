from datetime import datetime, timedelta

from sqlalchemy import insert, select
from sqlalchemy.engine import Connection

from backend.app.services.common import MUTATION_LOCK, DomainError, as_local, now_local
from backend.app.services.sessions import occupancy_for_connection
from backend.app.tables import absences, groups, recoveries, session_students, sessions, students

def register_absence(engine, student_id: int, session_id: int, registered_at: datetime | None = None) -> dict:
    registered = as_local(registered_at or now_local())
    with MUTATION_LOCK, engine.begin() as conn:
        session = conn.execute(select(sessions.c.starts_at, sessions.c.capacity).where(sessions.c.id == session_id)).first()
        if not session:
            raise DomainError("No se encontró la sesión.", 404)
        starts_at = as_local(session.starts_at)
        if registered > starts_at - timedelta(hours=24):
            raise DomainError("La ausencia debe registrarse al menos 24 horas antes del inicio de la clase.")
        assigned = conn.execute(select(session_students.c.student_id).where(session_students.c.session_id == session_id, session_students.c.student_id == student_id)).first()
        if not assigned:
            raise DomainError("El alumno no está asignado a esta sesión.", 409)
        existing = conn.execute(select(absences.c.id).where(absences.c.student_id == student_id, absences.c.session_id == session_id)).first()
        if existing:
            raise DomainError("Ya hay una ausencia registrada para este alumno y esta clase.", 409)
        if not conn.execute(select(students.c.id).where(students.c.id == student_id)).first():
            raise DomainError("No se encontró el alumno.", 404)
        result = conn.execute(insert(absences).values(student_id=student_id, session_id=session_id, registered_at=registered))
        occupied, capacity = occupancy_for_connection(conn, session_id, session.capacity)
        if occupied > capacity:
            raise DomainError("No se pudo actualizar la ocupación de la clase.", 409)
        return {"id": result.inserted_primary_key[0], "studentId": student_id, "sessionId": session_id, "registeredAt": registered.isoformat()}


def _eligible(conn: Connection, absence_id: int) -> list[dict]:
    origin = conn.execute(
        select(absences.c.id, absences.c.student_id, absences.c.registered_at, sessions.c.starts_at, groups.c.level, groups.c.modality)
        .join(sessions, sessions.c.id == absences.c.session_id)
        .join(groups, groups.c.id == sessions.c.group_id)
        .where(absences.c.id == absence_id, absences.c.status == "accepted")
    ).mappings().first()
    if not origin:
        raise DomainError("No se encontró la ausencia.", 404)
    original_start = as_local(origin.starts_at)
    if as_local(origin.registered_at) > original_start - timedelta(hours=24):
        raise DomainError("Esta ausencia no permite reservar una recuperación porque se registró fuera de plazo.")
    last_day = original_start.date() + timedelta(days=7)
    current_time = now_local()
    candidates = conn.execute(
        select(sessions.c.id, sessions.c.starts_at, sessions.c.duration_minutes, sessions.c.capacity, groups.c.id.label("group_id"), groups.c.name, groups.c.level, groups.c.modality)
        .join(groups, groups.c.id == sessions.c.group_id)
        .where(sessions.c.enabled.is_(True), groups.c.active.is_(True), groups.c.level == origin.level, groups.c.modality == origin.modality)
        .order_by(sessions.c.starts_at)
    ).mappings().all()
    result = []
    for candidate in candidates:
        starts_at = as_local(candidate.starts_at)
        if starts_at <= original_start or starts_at <= current_time or starts_at.date() > last_day:
            continue
        occupied, capacity = occupancy_for_connection(conn, candidate.id, candidate.capacity)
        if occupied < capacity:
            result.append({
                "id": candidate.id,
                "startsAt": starts_at.isoformat(),
                "durationMinutes": candidate.duration_minutes,
                "capacity": capacity,
                "occupancy": occupied,
                "freeSeats": capacity - occupied,
                "group": {"id": candidate.group_id, "name": candidate.name, "level": candidate.level, "modality": candidate.modality},
                "deadline": last_day.isoformat(),
            })
    return result


def eligible_recoveries(engine, absence_id: int) -> list[dict]:
    with engine.connect() as conn:
        return _eligible(conn, absence_id)


def list_absences(engine) -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(
            select(
                absences.c.id,
                absences.c.student_id,
                students.c.name.label("student_name"),
                absences.c.session_id,
                absences.c.registered_at,
                sessions.c.starts_at,
                sessions.c.duration_minutes.label("session_duration_minutes"),
                groups.c.name.label("group_name"),
                groups.c.level,
                groups.c.modality,
            )
            .join(students, students.c.id == absences.c.student_id)
            .join(sessions, sessions.c.id == absences.c.session_id)
            .join(groups, groups.c.id == sessions.c.group_id)
            .where(absences.c.status == "accepted")
            .order_by(sessions.c.starts_at.desc())
        ).mappings().all()
        result = []
        for row in rows:
            booked = conn.execute(select(recoveries.c.id).where(recoveries.c.absence_id == row.id, recoveries.c.status == "confirmed")).scalars().all()
            session_start = as_local(row.starts_at)
            result.append({
                "id": row.id,
                "studentId": row.student_id,
                "studentName": row.student_name,
                "sessionId": row.session_id,
                "sessionStartsAt": session_start.isoformat(),
                "deadline": (session_start.date() + timedelta(days=7)).isoformat(),
                "sessionDurationMinutes": row.session_duration_minutes,
                "groupName": row.group_name,
                "level": row.level,
                "modality": row.modality,
                "registeredAt": as_local(row.registered_at).isoformat(),
                "recoveryCount": len(booked),
            })
        return result


def book_recovery(engine, absence_id: int, session_id: int, confirmed_at: datetime | None = None) -> dict:
    confirmed = as_local(confirmed_at or now_local())
    with MUTATION_LOCK, engine.begin() as conn:
        options = _eligible(conn, absence_id)
        selected = next((item for item in options if item["id"] == session_id), None)
        if selected is None:
            raise DomainError("La sesión ya no tiene plaza o no cumple los requisitos de recuperación.", 409)
        result = conn.execute(insert(recoveries).values(absence_id=absence_id, session_id=session_id, confirmed_at=confirmed, status="confirmed"))
        occupied, capacity = occupancy_for_connection(conn, session_id, selected["capacity"])
        if occupied > capacity:
            raise DomainError("La sesión ya no tiene plazas disponibles.", 409)
        return {"id": result.inserted_primary_key[0], "absenceId": absence_id, "sessionId": session_id, "confirmedAt": confirmed.isoformat(), "status": "confirmed"}
