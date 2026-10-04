"""Store application status history without inventing historical transitions."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    columns = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("jobs")}
    if "timeline_json" not in columns:
        op.add_column(
            "jobs", sa.Column("timeline_json", sa.Text(), nullable=False, server_default="[]")
        )


def downgrade():
    raise RuntimeError("Restore a workspace backup instead of deleting user data.")
