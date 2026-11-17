import argparse
from datetime import date, datetime, time, timedelta

from sqlalchemy import delete, insert, select

from backend.app.database import get_engine, upgrade_database
from backend.app.services.groups import _make_recurrence
from backend.app.tables import (
    absences,
    calendar_days,
    group_students,
    groups,
    recoveries,
    session_students,
    sessions,
    students,
)

SEED_STUDENTS = 60
GROUPS = [
    {"name": "Reformer mañana", "level": "Inicial", "modality": "Reformer", "capacity": 8, "count": 6, "time": "08:00"},
    {"name": "Suelo intermedio", "level": "Intermedio", "modality": "Suelo", "capacity": 10, "count": 10, "time": "09:30"},
    {"name": "Reformer avanzado", "level": "Avanzado", "modality": "Reformer", "capacity": 8, "count": 5, "time": "11:00"},
    {"name": "Suelo inicial", "level": "Inicial", "modality": "Suelo", "capacity": 10, "count": 4, "time": "16:30"},
    {"name": "Reformer intermedio", "level": "Intermedio", "modality": "Reformer", "capacity": 8, "count": 8, "time": "18:00"},
    {"name": "Suelo noche", "level": "Intermedio", "modality": "Suelo", "capacity": 10, "count": 8, "time": "19:30"},
    {"name": "Reformer inicial tarde", "level": "Inicial", "modality": "Reformer", "capacity": 8, "count": 5, "time": "20:00"},
    {"name": "Reformer avanzado tarde", "level": "Avanzado", "modality": "Reformer", "capacity": 8, "count": 8, "time": "20:30"},
]


def clear_data(engine) -> None:
    with engine.begin() as conn:
        _clear(conn)


def _clear(conn) -> None:
    for table in (recoveries, absences, session_students, sessions, group_students, calendar_days, groups, students):
        conn.execute(delete(table))


def empty_data(engine) -> None:
    clear_data(engine)


def seed_data(engine, now: datetime | None = None) -> None:
    current = (now or datetime.now()).replace(tzinfo=None, microsecond=0)
    today = current.date()
    with engine.begin() as conn:
        _clear(conn)
        student_ids = []
        for index in range(SEED_STUDENTS):
            result = conn.execute(
                insert(students).values(
                    name=f"Alumna de prueba {index + 1:02d}",
                    normalized_name=f"alumna de prueba {index + 1:02d}",
                    phone=f"600000{index + 1:03d}",
                    active=True,
                    created_at=current,
                )
            )
            student_ids.append(result.inserted_primary_key[0])

        group_ids = []
        assigned: dict[int, list[int]] = {}
        cursor = 0
        for index, definition in enumerate(GROUPS):
            result = conn.execute(
                insert(groups).values(
                    name=definition["name"],
                    level=definition["level"],
                    modality=definition["modality"],
                    weekday=today.weekday(),
                    start_time=definition["time"],
                    recurrence="Semanal",
                    capacity=definition["capacity"],
                    active=True,
                )
            )
            group_id = result.inserted_primary_key[0]
            group_ids.append(group_id)
            members = student_ids[cursor : cursor + definition["count"]]
            cursor += definition["count"]
            assigned[group_id] = members
            for student_id in members:
                conn.execute(insert(group_students).values(group_id=group_id, student_id=student_id))
            _make_recurrence(conn, group_id, {"weekday": today.weekday(), "start_time": definition["time"], "capacity": definition["capacity"]}, today, days=42, include_past_today=True)

        # A recovery booked on the seventh natural day after the original class.
        historical_start = datetime.combine(today - timedelta(days=7), time(9, 0))
        historical_origin = _add_session(conn, group_ids[7], historical_start, GROUPS[7]["capacity"], assigned[group_ids[7]])
        historical_absence = conn.execute(
            insert(absences).values(student_id=assigned[group_ids[7]][0], session_id=historical_origin, registered_at=historical_start - timedelta(hours=24))
        ).inserted_primary_key[0]

        # The six day-of sessions show available and full classes, plus one recovery.
        for group_id, definition in zip(group_ids[:6], GROUPS[:6], strict=True):
            start = datetime.combine(today, time.fromisoformat(definition["time"]))
            session_id = conn.execute(select(sessions.c.id).where(sessions.c.group_id == group_id, sessions.c.starts_at == start)).scalar_one_or_none()
            if session_id is None:
                session_id = _add_session(conn, group_id, start, definition["capacity"], assigned[group_id])
            if group_id == group_ids[2]:
                conn.execute(insert(recoveries).values(absence_id=historical_absence, session_id=session_id, confirmed_at=current, status="confirmed"))

        # A class inside the 24-hour window demonstrates why an absence may be rejected.
        near_start = current + timedelta(hours=12)
        near_start = near_start.replace(minute=0 if near_start.minute < 30 else 30, second=0, microsecond=0)
        if near_start <= current + timedelta(hours=12):
            near_start += timedelta(minutes=30)
        near_session = _add_session(conn, group_ids[1], near_start, GROUPS[1]["capacity"], assigned[group_ids[1]])
        conn.execute(
            insert(absences).values(
                student_id=assigned[group_ids[1]][0],
                session_id=near_session,
                registered_at=current,
                status="rejected",
            )
        )

        # An absence is already registered for a class two days ahead; its recovery is bookable
        # through the inclusive seventh day and one session beyond that is excluded.
        origin_start = datetime.combine(today + timedelta(days=2), time(8, 30))
        origin_id = _add_session(conn, group_ids[0], origin_start, GROUPS[0]["capacity"], assigned[group_ids[0]])
        pending_absence = conn.execute(
            insert(absences).values(student_id=assigned[group_ids[0]][0], session_id=origin_id, registered_at=current)
        ).inserted_primary_key[0]
        inclusive_day = today + timedelta(days=9)
        excluded_day = today + timedelta(days=10)
        _add_session(conn, group_ids[6], datetime.combine(inclusive_day, time(16, 0)), GROUPS[6]["capacity"], assigned[group_ids[6]])
        _add_session(conn, group_ids[6], datetime.combine(excluded_day, time(17, 0)), GROUPS[6]["capacity"], assigned[group_ids[6]])

        holiday = today + timedelta(days=12)
        conn.execute(insert(calendar_days).values(day=holiday, is_non_working=True, note="Festivo de ejemplo"))
        manual_group = group_ids[3]
        _add_session(conn, manual_group, datetime.combine(holiday, time(10, 0)), GROUPS[3]["capacity"], assigned[manual_group], manual=True)


def _add_session(conn, group_id: int, start: datetime, capacity: int, members: list[int], manual: bool = False) -> int:
    existing = conn.execute(select(sessions.c.id).where(sessions.c.group_id == group_id, sessions.c.starts_at == start)).scalar_one_or_none()
    if existing is not None:
        return existing
    result = conn.execute(insert(sessions).values(group_id=group_id, starts_at=start, capacity=capacity, enabled=True, manual=manual))
    session_id = result.inserted_primary_key[0]
    for student_id in members:
        conn.execute(insert(session_students).values(session_id=session_id, student_id=student_id))
    return session_id


def confirmed(action: str, input_fn=input) -> bool:
    reply = input_fn(f"{action} datos de desarrollo. Escribe yes para confirmar: ").strip().casefold()
    if reply != "yes":
        print("Operación cancelada; no se cambiaron datos.")
        return False
    return True


def run_operation(engine, *, empty: bool = False, yes: bool = False, input_fn=input) -> bool:
    action = "Vaciar" if empty else "Reponer la semilla ficticia y vaciar los datos actuales"
    if not yes and not confirmed(action, input_fn):
        return False
    if empty:
        empty_data(engine)
        print("Datos locales vaciados.")
    else:
        seed_data(engine)
        print("Datos ficticios cargados.")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Gestiona los datos locales ficticios de Belén Pilates.")
    parser.add_argument("--empty", action="store_true", help="Vacía los datos locales en lugar de reponer la semilla.")
    parser.add_argument("--yes", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    upgrade_database()
    engine = get_engine()
    run_operation(engine, empty=args.empty, yes=args.yes)


if __name__ == "__main__":
    main()
