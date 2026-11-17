from datetime import datetime

import pytest
from sqlalchemy import select

from backend.app.seed import seed_data
from backend.app.services.common import DomainError
from backend.app.services.groups import create_group, list_groups, update_group
from backend.app.services.students import create_student, deactivate_student, get_student, update_student
from backend.app.tables import group_students, students


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
    from backend.app.tables import sessions

    group = create_group(engine, group_payload())
    with engine.connect() as conn:
        generated = conn.execute(select(sessions.c.id).where(sessions.c.group_id == group["id"])).all()
    assert 5 <= len(generated) <= 7
