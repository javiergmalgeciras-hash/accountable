from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
)

metadata = MetaData()

students = Table(
    "students",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(120), nullable=False),
    Column("normalized_name", String(120), nullable=False, unique=True),
    Column("phone", String(40)),
    Column("active", Boolean, nullable=False, default=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

groups = Table(
    "groups",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(120), nullable=False, unique=True),
    Column("level", String(40), nullable=False),
    Column("modality", String(40), nullable=False),
    Column("weekday", Integer, nullable=False),
    Column("start_time", String(5), nullable=False),
    Column("recurrence", String(30), nullable=False, default="Semanal"),
    Column("capacity", Integer, nullable=False),
    Column("active", Boolean, nullable=False, default=True),
)

group_weekly_schedules = Table(
    "group_weekly_schedules",
    metadata,
    Column("group_id", ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    Column("weekday", Integer, primary_key=True),
    Column("start_time", String(5), nullable=False),
    Column("duration_minutes", Integer),
)

group_students = Table(
    "group_students",
    metadata,
    Column("group_id", ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    Column("student_id", ForeignKey("students.id", ondelete="CASCADE"), primary_key=True),
)

sessions = Table(
    "sessions",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("group_id", ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False),
    Column("starts_at", DateTime(timezone=True), nullable=False),
    Column("duration_minutes", Integer),
    Column("capacity", Integer, nullable=False),
    Column("enabled", Boolean, nullable=False, default=True),
    Column("manual", Boolean, nullable=False, default=False),
    UniqueConstraint("group_id", "starts_at", name="uq_session_group_start"),
)
Index("ix_sessions_starts_at", sessions.c.starts_at)

session_students = Table(
    "session_students",
    metadata,
    Column("session_id", ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True),
    Column("student_id", ForeignKey("students.id", ondelete="RESTRICT"), primary_key=True),
)

absences = Table(
    "absences",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("student_id", ForeignKey("students.id", ondelete="RESTRICT"), nullable=False),
    Column("session_id", ForeignKey("sessions.id", ondelete="RESTRICT"), nullable=False),
    Column("registered_at", DateTime(timezone=True), nullable=False),
    Column("status", String(20), nullable=False, default="accepted"),
    UniqueConstraint("student_id", "session_id", name="uq_absence_student_session"),
)

recoveries = Table(
    "recoveries",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("absence_id", ForeignKey("absences.id", ondelete="RESTRICT"), nullable=False),
    Column("session_id", ForeignKey("sessions.id", ondelete="RESTRICT"), nullable=False),
    Column("confirmed_at", DateTime(timezone=True), nullable=False),
    Column("status", String(20), nullable=False, default="confirmed"),
)

calendar_days = Table(
    "calendar_days",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("day", Date, nullable=False, unique=True),
    Column("is_non_working", Boolean, nullable=False, default=True),
    Column("note", Text),
)

