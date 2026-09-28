"""Adopt existing databases and add history and application snapshots without deleting data."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    existing = set(sa.inspect(op.get_bind()).get_table_names())

    def create(name, *columns):
        if name not in existing:
            op.create_table(name, *columns)

    def string(name, length=255, nullable=False):
        return sa.Column(name, sa.String(length), nullable=nullable)

    def timestamps():
        return [
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        ]

    create(
        "resumes",
        sa.Column("id", sa.String(36), primary_key=True),
        string("title"),
        string("target_role"),
        string("template_id", 64),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        string("parent_resume_id", 36, True),
        sa.Column("document_json", sa.Text(), nullable=False),
        *timestamps(),
    )
    create(
        "jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        string("company"),
        string("position"),
        string("location"),
        string("url", 1024),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        string("status", 32),
        string("linked_resume_id", 36, True),
        *timestamps(),
    )
    create(
        "library_items",
        sa.Column("id", sa.String(36), primary_key=True),
        string("type", 32),
        string("title"),
        sa.Column("content", sa.Text(), nullable=False),
        string("category", 128),
        sa.Column("tags_json", sa.Text(), nullable=False),
        sa.Column("variants_json", sa.Text(), nullable=False),
        sa.Column("target_roles_json", sa.Text(), nullable=False),
        string("metrics"),
        *timestamps(),
    )
    create(
        "resume_revisions",
        sa.Column("resume_id", sa.String(36), primary_key=True),
        sa.Column("revision", sa.Integer(), primary_key=True),
        sa.Column("document_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    create(
        "application_snapshots",
        sa.Column("id", sa.String(36), primary_key=True),
        string("job_id", 36),
        sa.Column("document_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    indexes = {i["name"] for i in sa.inspect(op.get_bind()).get_indexes("application_snapshots")}
    if "ix_application_snapshots_job_id" not in indexes:
        op.create_index("ix_application_snapshots_job_id", "application_snapshots", ["job_id"])


def downgrade():
    raise RuntimeError("Restore a workspace backup instead of deleting user data.")
