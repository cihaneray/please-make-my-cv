"""Persist planning dates and editable cover letters."""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    columns = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("jobs")}
    if "planning_json" not in columns:
        op.add_column(
            "jobs", sa.Column("planning_json", sa.Text(), nullable=False, server_default="{}")
        )


def downgrade():
    raise RuntimeError("Restore a workspace backup instead of deleting user data.")
