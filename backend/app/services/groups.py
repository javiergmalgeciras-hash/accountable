from datetime import date, datetime, timedelta

from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import IntegrityError

from backend.app.services.common import MUTATION_LOCK, DomainError, clean_required, now_local, parse_time
from backend.app.services.sessions import occupancy, refresh_roster
from backend.app.tables import absences, group_students, group_weekly_schedules, groups, recoveries, session_students, sessions, students


def _validate(payload: dict, student_count: int, *, legacy_duration_days: set[int] | None = None) -> dict:
    name = clean_required(payload["name"], "El nombre del grupo")
    level = clean_required(payload["level"], "El nivel", 40)
    modality = clean_required(payload["modality"], "La modalidad", 40)
    schedule_payload = payload.get("weeklySchedule")
    has_weekly_schedule = schedule_payload is not None
    if schedule_payload is None:
        schedule_payload = [{"weekday": payload.get("weekday"), "startTime": payload.get("startTime")}]
    capacity = payload.get("capacity")
    if not isinstance(schedule_payload, list) or not 1 <= len(schedule_payload) <= 7:
        raise DomainError("Selecciona al menos un día para el horario semanal.")
    schedule = []
    used_weekdays = set()
    for item in schedule_payload:
        if not isinstance(item, dict):
            raise DomainError("El horario semanal no es válido.")
        weekday = item.get("weekday")
        if not isinstance(weekday, int) or isinstance(weekday, bool) or not 0 <= weekday <= 6:
            raise DomainError("El día de la semana no es válido.")
        if weekday in used_weekdays:
            raise DomainError("Solo puede haber un horario por día de la semana.")
        used_weekdays.add(weekday)
        start_time = item.get("startTime")
        if not isinstance(start_time, str):
            raise DomainError("El horario debe tener formato HH:MM.")
        starts = parse_time(start_time)
        duration = item.get("durationMinutes")
        if duration is None and has_weekly_schedule and weekday not in (legacy_duration_days or set()):
            raise DomainError("Indica la duración de cada día en minutos.")
        if duration is not None and (not isinstance(duration, int) or isinstance(duration, bool) or duration < 1):
            raise DomainError("La duración debe ser un número entero de minutos mayor que cero.")
        schedule.append({"weekday": weekday, "start_time": starts.strftime("%H:%M"), "duration_minutes": duration})
    schedule.sort(key=lambda item: item["weekday"])
    first_schedule = schedule[0]
    if not isinstance(capacity, int) or not 1 <= capacity <= 50:
        raise DomainError("El aforo debe estar entre 1 y 50.")
    if student_count > capacity:
        raise DomainError("El aforo no puede ser menor que el número de alumnos asignados.")
    if payload.get("recurrence", "Semanal") != "Semanal":
        raise DomainError("La única recurrencia disponible en esta fase es semanal.")
    return {
        "name": name,
        "level": level,
        "modality": modality,
        "weekday": first_schedule["weekday"],
        "start_time": first_schedule["start_time"],
        "recurrence": payload.get("recurrence", "Semanal"),
        "capacity": capacity,
        "weekly_schedule": schedule,
    }


def _student_ids(conn, ids: list[int]) -> list[int]:
    chosen = list(dict.fromkeys(ids))
    if len(chosen) != len(ids):
        return chosen
    found = conn.execute(select(students.c.id).where(students.c.id.in_(chosen), students.c.active.is_(True))).scalars().all() if chosen else []
    if len(found) != len(chosen):
        raise DomainError("Uno o más alumnos no están disponibles.")
    return chosen


def _make_session(conn, group_id: int, starts_at: datetime, capacity: int, manual: bool = False, duration_minutes: int | None = None) -> int:
    result = conn.execute(insert(sessions).values(group_id=group_id, starts_at=starts_at, duration_minutes=duration_minutes, capacity=capacity, enabled=True, manual=manual))
    session_id = result.inserted_primary_key[0]
    ids = conn.execute(select(group_students.c.student_id).where(group_students.c.group_id == group_id)).scalars().all()
    for student_id in ids:
        conn.execute(insert(session_students).values(session_id=session_id, student_id=student_id))
    return session_id


def _make_recurrence(conn, group_id: int, values: dict, from_day: date, days: int = 42, include_past_today: bool = False) -> None:
    schedule = values.get("weekly_schedule") or [{"weekday": values["weekday"], "start_time": values["start_time"], "duration_minutes": values.get("duration_minutes")}]
    schedule_by_day = {item["weekday"]: (parse_time(item["start_time"]), item.get("duration_minutes")) for item in schedule}
    for offset in range(days):
        day = from_day + timedelta(days=offset)
        occurrence = schedule_by_day.get(day.weekday())
        if occurrence is None:
            continue
        starts, duration_minutes = occurrence
        start = datetime.combine(day, starts)
        if not include_past_today and start <= now_local():
            continue
        exists = conn.execute(select(sessions.c.id).where(sessions.c.group_id == group_id, sessions.c.starts_at == start)).first()
        if not exists:
            _make_session(conn, group_id, start, values["capacity"], duration_minutes=duration_minutes)


def _store_weekly_schedule(conn, group_id: int, schedule: list[dict]) -> None:
    conn.execute(delete(group_weekly_schedules).where(group_weekly_schedules.c.group_id == group_id))
    conn.execute(
        insert(group_weekly_schedules),
        [{"group_id": group_id, **item} for item in schedule],
    )


def _detail(conn, group_id: int) -> dict:
    row = conn.execute(select(groups).where(groups.c.id == group_id)).mappings().first()
    if not row:
        raise DomainError("No se encontró el grupo.", 404)
    ids = conn.execute(select(group_students.c.student_id).where(group_students.c.group_id == group_id)).scalars().all()
    schedule_rows = conn.execute(
        select(group_weekly_schedules.c.weekday, group_weekly_schedules.c.start_time, group_weekly_schedules.c.duration_minutes)
        .where(group_weekly_schedules.c.group_id == group_id)
        .order_by(group_weekly_schedules.c.weekday)
    ).all()
    schedule = [{"weekday": weekday, "startTime": start_time, "durationMinutes": duration} for weekday, start_time, duration in schedule_rows]
    if not schedule:
        schedule = [{"weekday": row.weekday, "startTime": row.start_time, "durationMinutes": None}]
    return {"id": row.id, "name": row.name, "level": row.level, "modality": row.modality, "weekday": schedule[0]["weekday"], "startTime": schedule[0]["startTime"], "weeklySchedule": schedule, "recurrence": row.recurrence, "capacity": row.capacity, "studentIds": ids, "active": row.active}


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
            group_values = {key: value for key, value in values.items() if key != "weekly_schedule"}
            result = conn.execute(insert(groups).values(**group_values, active=True))
        except IntegrityError as exc:
            if "UNIQUE constraint failed" in str(exc):
                raise DomainError("Ya existe un grupo con ese nombre.", 409) from exc
            raise
        group_id = result.inserted_primary_key[0]
        _store_weekly_schedule(conn, group_id, values["weekly_schedule"])
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
        existing_schedule = conn.execute(
            select(group_weekly_schedules.c.weekday, group_weekly_schedules.c.duration_minutes)
            .where(group_weekly_schedules.c.group_id == group_id)
        ).all()
        legacy_duration_days = {weekday for weekday, duration in existing_schedule if duration is None}
        if not existing_schedule:
            legacy_duration_days.add(existing.weekday)
        values = _validate(payload, len(chosen), legacy_duration_days=legacy_duration_days)
        occupancy_query = select(sessions.c.id, sessions.c.capacity).where(sessions.c.group_id == group_id, sessions.c.starts_at > now_local(), sessions.c.manual.is_(False))
        for session_id, _capacity in conn.execute(occupancy_query):
            occupied, _ = occupancy(engine, session_id, conn=conn)
            if occupied > values["capacity"]:
                raise DomainError("El aforo no puede quedar por debajo de la ocupación de una sesión futura.", 409)
        try:
            group_values = {key: value for key, value in values.items() if key != "weekly_schedule"}
            conn.execute(update(groups).where(groups.c.id == group_id).values(**group_values))
        except IntegrityError as exc:
            raise DomainError("Ya existe un grupo con ese nombre.", 409) from exc
        conn.execute(delete(group_students).where(group_students.c.group_id == group_id))
        _store_weekly_schedule(conn, group_id, values["weekly_schedule"])
        for student_id in chosen:
            conn.execute(insert(group_students).values(group_id=group_id, student_id=student_id))

        old_future = conn.execute(select(sessions.c.id, sessions.c.starts_at).where(sessions.c.group_id == group_id, sessions.c.starts_at > now_local(), sessions.c.manual.is_(False))).all()
        for session_id, starts_at in old_future:
            referenced = conn.execute(select(absences.c.id).where(absences.c.session_id == session_id).limit(1)).first() or conn.execute(select(recoveries.c.id).where(recoveries.c.session_id == session_id).limit(1)).first()
            if referenced:
                # Keep the session ID, date and interval stable because bookings point to this concrete class.
                conn.execute(update(sessions).where(sessions.c.id == session_id).values(capacity=values["capacity"]))
                continue
            conn.execute(delete(session_students).where(session_students.c.session_id == session_id))
            conn.execute(delete(sessions).where(sessions.c.id == session_id))
        _make_recurrence(conn, group_id, values, now_local().date())
        upcoming = conn.execute(select(sessions.c.id).where(sessions.c.group_id == group_id, sessions.c.starts_at > now_local(), sessions.c.manual.is_(False))).scalars().all()
        for session_id in upcoming:
            conn.execute(update(sessions).where(sessions.c.id == session_id).values(capacity=values["capacity"]))
            refresh_roster(conn, session_id, chosen)
            # Roster changes can interact with preserved absences and recovery bookings.
            occupancy(engine, session_id, conn=conn)
    with engine.connect() as conn:
        return _detail(conn, group_id)
