from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import pytest
from sqlalchemy import select, update

from backend.app.seed import _add_session, seed_data
from backend.app.services.bookings import book_recovery, eligible_recoveries, list_absences, register_absence
from backend.app.services.calendar import enable_manual_session, set_calendar_day
from backend.app.services.common import DomainError
from backend.app.services.groups import list_groups
from backend.app.services.sessions import get_session, list_sessions, occupancy
from backend.app.tables import sessions


def seeded(engine, moment):
    seed_data(engine, moment)
    return moment


def find_group(engine, name):
    return next(group for group in list_groups(engine) if group["name"] == name)


def find_session(engine, day, group_id, time_starts=None):
    found = [item for item in list_sessions(engine, day, day, group_id) if time_starts is None or item["startsAt"].startswith(f"{day.isoformat()}T{time_starts}")]
    return found[0]


def test_absence_accepts_exactly_24_hours_and_rejects_less_without_changing_occupancy(engine, fixed_clock):
    seeded(engine, fixed_clock)
    group = find_group(engine, "Reformer mañana")
    session = find_session(engine, fixed_clock.date() + timedelta(days=2), group["id"], "08:30")
    starts_at = datetime.fromisoformat(session["startsAt"])
    eligible_student = group["studentIds"][1]
    too_late_student = group["studentIds"][2]
    before, _ = occupancy(engine, session["id"])
    accepted = register_absence(engine, eligible_student, session["id"], starts_at - timedelta(hours=24))
    listed_absence = next(item for item in list_absences(engine) if item["id"] == accepted["id"])
    assert listed_absence["deadline"] == (starts_at.date() + timedelta(days=7)).isoformat()
    after_accept, _ = occupancy(engine, session["id"])
    assert accepted["studentId"] == eligible_student
    assert after_accept == before - 1

    with pytest.raises(DomainError, match="al menos 24 horas"):
        register_absence(engine, too_late_student, session["id"], starts_at - timedelta(hours=23, minutes=59))
    after_rejection, _ = occupancy(engine, session["id"])
    assert after_rejection == after_accept
    assert all(item["studentId"] != too_late_student for item in list_absences(engine))


def test_absence_releases_one_seat_and_recovery_uses_another(engine, fixed_clock):
    seeded(engine, fixed_clock)
    group = find_group(engine, "Reformer mañana")
    origin = find_session(engine, fixed_clock.date() + timedelta(days=2), group["id"], "08:30")
    original_occupancy = origin["occupancy"]
    absence = next(item for item in list_absences(engine) if item["sessionId"] == origin["id"])
    options = eligible_recoveries(engine, absence["id"])
    assert options
    assert all(item["group"]["level"] == group["level"] for item in options)
    assert all(item["group"]["modality"] == group["modality"] for item in options)
    assert all(0 < item["freeSeats"] for item in options)
    assert any(item["startsAt"].startswith((fixed_clock.date() + timedelta(days=9)).isoformat()) for item in options)
    assert not any(item["startsAt"].startswith((fixed_clock.date() + timedelta(days=10)).isoformat()) for item in options)

    target = next(item for item in options if item["startsAt"].startswith((fixed_clock.date() + timedelta(days=9)).isoformat()))
    before, _ = occupancy(engine, target["id"])
    booked = book_recovery(engine, absence["id"], target["id"])
    after, _ = occupancy(engine, target["id"])
    assert booked["absenceId"] == absence["id"]
    assert after == before + 1
    assert get_session(engine, origin["id"])["occupancy"] == original_occupancy


def test_recovery_can_be_later_on_the_original_day(engine, fixed_clock):
    seeded(engine, fixed_clock)
    today = fixed_clock.date()
    origin_group = find_group(engine, "Reformer mañana")
    origin = find_session(engine, today + timedelta(days=2), origin_group["id"], "08:30")
    absence = next(item for item in list_absences(engine) if item["sessionId"] == origin["id"])
    target_group = find_group(engine, "Reformer inicial tarde")
    target_start = datetime.fromisoformat(origin["startsAt"]).replace(hour=10, minute=0)
    with engine.begin() as conn:
        target_id = _add_session(conn, target_group["id"], target_start, target_group["capacity"], target_group["studentIds"])
    options = eligible_recoveries(engine, absence["id"])
    assert any(item["id"] == target_id for item in options)


def test_recovery_options_and_booking_exclude_past_sessions(engine, fixed_clock):
    seeded(engine, fixed_clock)
    today = fixed_clock.date()
    group = find_group(engine, "Reformer avanzado tarde")
    origin = find_session(engine, today - timedelta(days=7), group["id"], "09:00")
    absence = next(item for item in list_absences(engine) if item["sessionId"] == origin["id"])
    target_start = datetime.combine(today - timedelta(days=1), datetime.min.time()).replace(hour=10)
    with engine.begin() as conn:
        target_id = _add_session(conn, group["id"], target_start, group["capacity"], group["studentIds"])

    options = eligible_recoveries(engine, absence["id"])
    assert all(item["id"] != target_id for item in options)
    with pytest.raises(DomainError, match="no tiene plaza o no cumple"):
        book_recovery(engine, absence["id"], target_id)


def test_concurrent_recoveries_never_overbook_the_last_spaces(engine, fixed_clock):
    seeded(engine, fixed_clock)
    today = fixed_clock.date()
    group = find_group(engine, "Reformer mañana")
    origin = find_session(engine, today + timedelta(days=2), group["id"], "08:30")
    starting_at = datetime.fromisoformat(origin["startsAt"])
    seeded_absence = next(item for item in list_absences(engine) if item["sessionId"] == origin["id"])
    absence_ids = [seeded_absence["id"]]
    for student_id in group["studentIds"][1:4]:
        absence_ids.append(register_absence(engine, student_id, origin["id"], starting_at - timedelta(hours=24))["id"])
    options = eligible_recoveries(engine, absence_ids[0])
    target = next(item for item in options if item["startsAt"].startswith((today + timedelta(days=9)).isoformat()))
    with engine.begin() as conn:
        conn.execute(update(sessions).where(sessions.c.id == target["id"]).values(capacity=target["occupancy"] + 2))

    def reserve(absence_id):
        try:
            book_recovery(engine, absence_id, target["id"])
            return "booked"
        except DomainError:
            return "full"

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(reserve, absence_ids))
    assert results.count("booked") == 2
    assert occupancy(engine, target["id"])[0] == target["occupancy"] + 2


def test_non_working_day_keeps_recurrences_and_allows_a_manual_session(engine, fixed_clock):
    seeded(engine, fixed_clock)
    target_day = fixed_clock.date() + timedelta(days=14)
    calendar_item = set_calendar_day(engine, target_day, {"isNonWorking": True, "note": "Festivo de prueba"})
    group = find_group(engine, "Reformer mañana")
    recurrent = find_session(engine, target_day, group["id"], "08:00")
    assert calendar_item["isNonWorking"] is True
    assert recurrent["enabled"] is True
    manual = enable_manual_session(engine, {"groupId": group["id"], "startsAt": datetime.combine(target_day, datetime.min.time()).replace(hour=12, minute=15).isoformat()})
    assert manual["manual"] is True
    assert manual["enabled"] is True
    assert manual["durationMinutes"] == 60
    assert manual["startsAt"].startswith(f"{target_day.isoformat()}T12:15")
    assert len(list_sessions(engine, target_day, target_day, group["id"])) == 2
