"""Persist editable job requirements without changing existing jobs."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("jobs")}
    if "requirements_json" not in columns:
        op.add_column(
            "jobs", sa.Column("requirements_json", sa.Text(), nullable=False, server_default="[]")
        )


def downgrade():
    raise RuntimeError("Restore a workspace backup instead of deleting user data.")
