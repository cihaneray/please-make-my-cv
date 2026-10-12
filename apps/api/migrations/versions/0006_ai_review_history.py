"""Persist AI review snapshots and their exact comparison scope."""

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    existing = sa.inspect(op.get_bind()).get_table_names()
    if "ai_review_history" not in existing:
        op.create_table(
            "ai_review_history",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("resume_id", sa.String(36), nullable=False),
            sa.Column("revision", sa.Integer(), nullable=False),
            sa.Column("scope_hash", sa.String(64), nullable=False),
            sa.Column("language", sa.String(2), nullable=False),
            sa.Column("model", sa.String(255), nullable=False),
            sa.Column("provider", sa.String(64), nullable=False),
            sa.Column("job_description", sa.Text(), nullable=False),
            sa.Column("document_json", sa.Text(), nullable=False),
            sa.Column("result_json", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["resume_id"],
                ["resumes.id"],
                name="fk_ai_review_resume",
                ondelete="CASCADE",
                deferrable=True,
                initially="DEFERRED",
            ),
        )
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("ai_review_history")}
    if "ix_ai_review_scope_created" not in indexes:
        op.create_index("ix_ai_review_scope_created", "ai_review_history", ["scope_hash", "created_at"])


def downgrade():
    op.drop_table("ai_review_history")
