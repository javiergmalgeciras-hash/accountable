"""Store a separate weekly time for each group weekday."""

from alembic import op
import sqlalchemy as sa

revision = "0002_group_weekly_schedules"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "group_weekly_schedules",
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("weekday", sa.Integer(), primary_key=True),
        sa.Column("start_time", sa.String(5), nullable=False),
    )
    op.execute(
        sa.text(
            "INSERT INTO group_weekly_schedules (group_id, weekday, start_time) "
            "SELECT id, weekday, start_time FROM groups"
        )
    )


def downgrade() -> None:
    op.drop_table("group_weekly_schedules")
