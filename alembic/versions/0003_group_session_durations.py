"""Add per-weekday and per-session class durations."""

from alembic import op
import sqlalchemy as sa

revision = "0003_group_session_durations"
down_revision = "0002_group_weekly_schedules"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("group_weekly_schedules", sa.Column("duration_minutes", sa.Integer(), nullable=True))
    op.add_column("sessions", sa.Column("duration_minutes", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("sessions") as batch_op:
        batch_op.drop_column("duration_minutes")
    with op.batch_alter_table("group_weekly_schedules") as batch_op:
        batch_op.drop_column("duration_minutes")
