from datetime import datetime

from sqlalchemy import inspect, select

from backend.app.seed import empty_data, run_operation, seed_data
from backend.app.tables import absences, groups, recoveries, sessions, students


def test_initial_migration_creates_domain_tables(engine):
    names = set(inspect(engine).get_table_names())
    assert {"students", "groups", "group_students", "sessions", "session_students", "absences", "recoveries", "calendar_days"} <= names


def test_seed_contains_only_fictitious_pilates_data_and_empty_removes_it(engine):
    seed_data(engine, datetime(2026, 11, 17, 12, 0))
    with engine.connect() as conn:
        student_rows = conn.execute(select(students.c.name, students.c.phone)).all()
        group_names = conn.execute(select(groups.c.name)).scalars().all()
        recovery_count = conn.execute(select(recoveries.c.id)).all()
        session_rows = conn.execute(select(sessions.c.starts_at)).all()
        absence_statuses = conn.execute(select(absences.c.status)).scalars().all()
    assert len(student_rows) >= 50
    assert all(name.startswith("Alumna de prueba") for name, _ in student_rows)
    assert all(phone and phone.startswith("600") for _, phone in student_rows)
    assert "Reformer mañana" in group_names
    assert recovery_count
    assert "accepted" in absence_statuses
    assert "rejected" in absence_statuses
    assert any((row.starts_at - datetime(2026, 11, 17, 12, 0)).total_seconds() < 24 * 60 * 60 for row in session_rows if row.starts_at >= datetime(2026, 11, 17, 12, 0))
    empty_data(engine)
    with engine.connect() as conn:
        assert conn.execute(select(students.c.id)).all() == []


def test_seed_and_empty_commands_require_explicit_yes(engine):
    seed_data(engine, datetime(2026, 11, 17, 12, 0))
    with engine.connect() as conn:
        before = len(conn.execute(select(students.c.id)).all())
    assert run_operation(engine, empty=True, input_fn=lambda _: "no") is False
    with engine.connect() as conn:
        assert len(conn.execute(select(students.c.id)).all()) == before
    assert run_operation(engine, empty=True, input_fn=lambda _: "yes") is True
    with engine.connect() as conn:
        assert conn.execute(select(students.c.id)).all() == []


def test_mvp_database_ignores_shared_database_environment(engine, monkeypatch):
    from backend.app.database import database_url

    monkeypatch.setenv("DATABASE_URL", "postgresql://not-used.example/pilates")
    monkeypatch.setenv("SUPABASE_URL", "https://not-used.example")
    assert database_url().startswith("sqlite:")
