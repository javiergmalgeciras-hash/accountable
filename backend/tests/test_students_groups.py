from datetime import timedelta

import pytest
from sqlalchemy import insert, select

from backend.app.seed import seed_data
from backend.app.services.common import DomainError
from backend.app.services.groups import create_group, list_groups, update_group
from backend.app.services.students import create_student, deactivate_student, get_student, update_student
from backend.app.tables import absences, group_students, recoveries, session_students, sessions, students


def group_payload(**changes):
    values = {"name": "Reformer prueba", "level": "Inicial", "modality": "Reformer", "weekday": 1, "startTime": "09:00", "recurrence": "Semanal", "capacity": 2, "studentIds": []}
    values.update(changes)
    return values


def test_student_crud_optional_phone_and_stable_group_references(engine):
    first = create_student(engine, {"name": " Ana   Pérez ", "phone": "", "groupIds": []})
    group = create_group(engine, group_payload(studentIds=[first["id"]]))
    attached = get_student(engine, first["id"])
    edited = update_student(engine, first["id"], {"name": "Ana Pérez García", "phone": "600 123 456", "groupIds": attached["groupIds"]})
    assert first["id"] == edited["id"]
    assert first["phone"] is None
    assert edited["groupIds"] == [group["id"]]
    with engine.connect() as conn:
        assert conn.execute(select(group_students.c.student_id).where(group_students.c.group_id == group["id"])).scalar_one() == first["id"]
    assert deactivate_student(engine, first["id"])["active"] is False
    assert get_student(engine, first["id"])["active"] is False


def test_student_name_normalization_and_duplicate_rejection(engine):
    create_student(engine, {"name": "María López", "phone": None, "groupIds": []})
    with pytest.raises(DomainError, match="obligatorio"):
        create_student(engine, {"name": "  ", "phone": None, "groupIds": []})
    with pytest.raises(DomainError, match="Ya existe"):
        create_student(engine, {"name": "  MARÍA   LÓPEZ ", "phone": None, "groupIds": []})


def test_student_update_rejects_duplicate_but_keeps_original_record(engine):
    first = create_student(engine, {"name": "Ana", "groupIds": []})
    create_student(engine, {"name": "Bea", "groupIds": []})
    with pytest.raises(DomainError, match="Ya existe"):
        update_student(engine, first["id"], {"name": " BEA ", "groupIds": []})
    assert get_student(engine, first["id"])["name"] == "Ana"


def test_group_validates_capacity_and_assignment_references(engine):
    students_list = [create_student(engine, {"name": f"Alumna {index}", "groupIds": []}) for index in range(3)]
    with pytest.raises(DomainError, match="aforo"):
        create_group(engine, group_payload(studentIds=[item["id"] for item in students_list], capacity=2))
    with pytest.raises(DomainError, match="no están disponibles"):
        create_group(engine, group_payload(studentIds=[987654]))
    group = create_group(engine, group_payload(studentIds=[students_list[0]["id"]]))
    assert group["level"] == "Inicial"
    assert group["modality"] == "Reformer"
    assert group["recurrence"] == "Semanal"
    assert len(list_groups(engine)) == 1
    with pytest.raises(DomainError, match="aforo"):
        update_group(engine, group["id"], group_payload(capacity=1, studentIds=[item["id"] for item in students_list[:2]]))


def test_group_assignment_cannot_exceed_a_full_group(engine):
    members = [create_student(engine, {"name": f"Pilates {index}", "groupIds": []}) for index in range(3)]
    create_group(engine, group_payload(name="Completo", capacity=2, studentIds=[members[0]["id"], members[1]["id"]]))
    with pytest.raises(DomainError, match="plazas disponibles"):
        update_student(engine, members[2]["id"], {"name": "Pilates 2", "groupIds": [1]})


def test_group_creation_generates_six_weeks_of_concrete_sessions(engine):
    group = create_group(engine, group_payload())
    with engine.connect() as conn:
        generated = conn.execute(select(sessions.c.id).where(sessions.c.group_id == group["id"])).all()
    assert 5 <= len(generated) <= 7


def test_group_weekly_schedule_stores_per_day_durations_and_generates_sessions(engine, fixed_clock):
    schedule = [
        {"weekday": 0, "startTime": "09:00", "durationMinutes": 60},
        {"weekday": 2, "startTime": "11:00", "durationMinutes": 75},
        {"weekday": 4, "startTime": "17:00", "durationMinutes": 45},
    ]
    group = create_group(engine, group_payload(weeklySchedule=schedule, capacity=4))

    assert group["weeklySchedule"] == schedule
    with engine.connect() as conn:
        generated = conn.execute(
            select(sessions.c.starts_at, sessions.c.duration_minutes)
            .where(sessions.c.group_id == group["id"])
        ).all()
    expected = {item["weekday"]: item for item in schedule}
    assert generated
    for starts_at, duration in generated:
        rule = expected[starts_at.weekday()]
        assert starts_at.strftime("%H:%M") == rule["startTime"]
        assert duration == rule["durationMinutes"]
        assert starts_at > fixed_clock
    assert all(any(row.starts_at.weekday() == day for row in generated) for day in expected)


def test_group_edit_preserves_sessions_referenced_by_absence_and_recovery(engine, fixed_clock):
    student = create_student(engine, {"name": "Alumna reservada", "groupIds": []})
    group = create_group(engine, group_payload(weekday=2, startTime="09:00", capacity=4, studentIds=[student["id"]]))
    with engine.begin() as conn:
        future = conn.execute(
            select(sessions.c.id, sessions.c.starts_at, sessions.c.duration_minutes)
            .where(sessions.c.group_id == group["id"], sessions.c.starts_at > fixed_clock)
            .order_by(sessions.c.starts_at)
        ).all()
        original, recovery_target = future[:2]
        absence_id = conn.execute(
            insert(absences).values(
                student_id=student["id"],
                session_id=original.id,
                registered_at=original.starts_at - timedelta(hours=30),
                status="accepted",
            )
        ).inserted_primary_key[0]
        conn.execute(
            insert(recoveries).values(
                absence_id=absence_id,
                session_id=recovery_target.id,
                confirmed_at=fixed_clock,
                status="confirmed",
            )
        )

    update_group(
        engine,
        group["id"],
        group_payload(
            weekday=2,
            startTime="11:00",
            weeklySchedule=[{"weekday": 2, "startTime": "11:00", "durationMinutes": 60}],
            capacity=4,
            studentIds=[student["id"]],
        ),
    )

    with engine.connect() as conn:
        preserved = conn.execute(
            select(sessions.c.id, sessions.c.starts_at, sessions.c.duration_minutes)
            .where(sessions.c.id.in_([original.id, recovery_target.id]))
            .order_by(sessions.c.id)
        ).all()
        new_occurrence = conn.execute(
            select(sessions.c.id, sessions.c.duration_minutes)
            .where(sessions.c.group_id == group["id"], sessions.c.starts_at == original.starts_at.replace(hour=11))
        ).first()
        recovery = conn.execute(select(recoveries.c.session_id).where(recoveries.c.absence_id == absence_id)).scalar_one()
        absence_session = conn.execute(select(absences.c.session_id).where(absences.c.id == absence_id)).scalar_one()

    assert [(row.id, row.starts_at, row.duration_minutes) for row in preserved] == [
        (original.id, original.starts_at, original.duration_minutes),
        (recovery_target.id, recovery_target.starts_at, recovery_target.duration_minutes),
    ]
    assert new_occurrence is not None
    assert new_occurrence.duration_minutes == 60
    assert absence_session == original.id
    assert recovery == recovery_target.id


def test_group_edit_rolls_back_roster_change_that_overbooks_confirmed_recovery(engine, fixed_clock):
    students_list = [create_student(engine, {"name": f"Reserva {index}", "groupIds": []}) for index in range(3)]
    first_id, second_id, replacement_id = [student["id"] for student in students_list]
    group = create_group(engine, group_payload(weekday=2, startTime="09:00", capacity=2, studentIds=[first_id, second_id]))
    with engine.begin() as conn:
        future = conn.execute(
            select(sessions.c.id, sessions.c.starts_at)
            .where(sessions.c.group_id == group["id"], sessions.c.starts_at > fixed_clock)
            .order_by(sessions.c.starts_at)
        ).all()
        original, target = future[:2]
        absence_ids = []
        for row in (original, target):
            absence_ids.append(conn.execute(
                insert(absences).values(
                    student_id=first_id,
                    session_id=row.id,
                    registered_at=row.starts_at - timedelta(hours=30),
                    status="accepted",
                )
            ).inserted_primary_key[0])
        conn.execute(
            insert(recoveries).values(
                absence_id=absence_ids[0],
                session_id=target.id,
                confirmed_at=fixed_clock,
                status="confirmed",
            )
        )

    with pytest.raises(DomainError, match="ocupación guardada no es válida"):
        update_group(
            engine,
            group["id"],
            group_payload(weekday=2, startTime="09:00", capacity=2, studentIds=[second_id, replacement_id]),
        )

    with engine.connect() as conn:
        current_members = conn.execute(select(group_students.c.student_id).where(group_students.c.group_id == group["id"])).scalars().all()
        target_roster = conn.execute(select(session_students.c.student_id).where(session_students.c.session_id == target.id)).scalars().all()
    assert set(current_members) == {first_id, second_id}
    assert set(target_roster) == {first_id, second_id}
