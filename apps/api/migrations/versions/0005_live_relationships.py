"""Constrain live CV relationships; keep historical submitted copies independent."""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    # Detach dangling live links without removing CVs or historical JSON copies.
    op.execute(
        sa.text(
            "UPDATE resumes SET parent_resume_id = NULL WHERE parent_resume_id IS NOT NULL AND parent_resume_id NOT IN (SELECT id FROM resumes)"
        )
    )
    op.execute(
        sa.text(
            "UPDATE jobs SET linked_resume_id = NULL WHERE linked_resume_id IS NOT NULL AND linked_resume_id NOT IN (SELECT id FROM resumes)"
        )
    )
    for table, column, name in [
        ("resumes", "parent_resume_id", "fk_resume_parent"),
        ("jobs", "linked_resume_id", "fk_job_resume"),
    ]:
        inspector = sa.inspect(op.get_bind())
        if not any(
            fk["constrained_columns"] == [column] for fk in inspector.get_foreign_keys(table)
        ):
            with op.batch_alter_table(table) as batch:
                batch.create_foreign_key(
                    name,
                    "resumes",
                    [column],
                    ["id"],
                    ondelete="SET NULL",
                    deferrable=True,
                    initially="DEFERRED",
                )
        if f"ix_{table}_{column}" not in {
            i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table)
        }:
            op.create_index(f"ix_{table}_{column}", table, [column])
    for table, name, columns in [
        ("resumes", "ix_resumes_archived_updated", ["is_archived", "updated_at"]),
        ("jobs", "ix_jobs_status_updated", ["status", "updated_at"]),
    ]:
        if name not in {i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table)}:
            op.create_index(name, table, columns)


def downgrade():
    op.drop_index("ix_jobs_status_updated", table_name="jobs")
    op.drop_index("ix_resumes_archived_updated", table_name="resumes")
    for table, column, name in [
        ("jobs", "linked_resume_id", "fk_job_resume"),
        ("resumes", "parent_resume_id", "fk_resume_parent"),
    ]:
        with op.batch_alter_table(table) as batch:
            batch.drop_index(f"ix_{table}_{column}")
            batch.drop_constraint(name, type_="foreignkey")
