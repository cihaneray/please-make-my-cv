"""Keep structured project and certification evidence in the career library."""

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    if "details_json" not in {
        c["name"] for c in sa.inspect(op.get_bind()).get_columns("library_items")
    }:
        op.add_column(
            "library_items",
            sa.Column("details_json", sa.Text(), nullable=False, server_default="{}"),
        )


def downgrade():
    with op.batch_alter_table("library_items") as batch:
        batch.drop_column("details_json")
