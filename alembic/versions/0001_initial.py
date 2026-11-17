"""Create the local Pilates MVP schema."""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("normalized_name", sa.String(120), nullable=False, unique=True),
        sa.Column("phone", sa.String(40)),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("level", sa.String(40), nullable=False),
        sa.Column("modality", sa.String(40), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.String(5), nullable=False),
        sa.Column("recurrence", sa.String(30), nullable=False, server_default="Semanal"),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "group_students",
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("manual", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("group_id", "starts_at", name="uq_session_group_start"),
    )
    op.create_table(
        "session_students",
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="RESTRICT"), primary_key=True),
    )
    op.create_table(
        "absences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("sessions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="accepted"),
        sa.UniqueConstraint("student_id", "session_id", name="uq_absence_student_session"),
    )
    op.create_table(
        "recoveries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("absence_id", sa.Integer(), sa.ForeignKey("absences.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("sessions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="confirmed"),
    )
    op.create_table(
        "calendar_days",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("day", sa.Date(), nullable=False, unique=True),
        sa.Column("is_non_working", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("note", sa.Text()),
    )
    op.create_index("ix_sessions_starts_at", "sessions", ["starts_at"])


def downgrade() -> None:
    op.drop_index("ix_sessions_starts_at", table_name="sessions")
    op.drop_table("calendar_days")
    op.drop_table("recoveries")
    op.drop_table("absences")
    op.drop_table("session_students")
    op.drop_table("sessions")
    op.drop_table("group_students")
    op.drop_table("groups")
    op.drop_table("students")
