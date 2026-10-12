"""Keep the source baseline for selective variant updates."""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    columns = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("resumes")}
    if "parent_base_json" not in columns:
        op.add_column("resumes", sa.Column("parent_base_json", sa.Text(), nullable=True))
    if "family_bases_json" not in columns:
        op.add_column(
            "resumes",
            sa.Column("family_bases_json", sa.Text(), nullable=False, server_default="{}"),
        )


def downgrade():
    with op.batch_alter_table("resumes") as batch:
        batch.drop_column("family_bases_json")
        batch.drop_column("parent_base_json")
