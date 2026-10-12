from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(UTC)


class ResumeModel(Base):
    __tablename__ = "resumes"

    parent_base_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    family_bases_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    target_role: Mapped[str] = mapped_column(String(255), default="")
    template_id: Mapped[str] = mapped_column(String(64), default="minimal")
    revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    __table_args__ = (Index("ix_resumes_archived_updated", "is_archived", "updated_at"),)
    parent_resume_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "resumes.id",
            name="fk_resume_parent",
            ondelete="SET NULL",
            deferrable=True,
            initially="DEFERRED",
        ),
        nullable=True,
        index=True,
    )
    document_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=now_utc, onupdate=now_utc, nullable=False
    )


class JobModel(Base):
    __tablename__ = "jobs"
    planning_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    requirements_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    timeline_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), default="")
    url: Mapped[str] = mapped_column(String(1024), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="saved", nullable=False)
    __table_args__ = (Index("ix_jobs_status_updated", "status", "updated_at"),)
    linked_resume_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "resumes.id",
            name="fk_job_resume",
            ondelete="SET NULL",
            deferrable=True,
            initially="DEFERRED",
        ),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=now_utc, onupdate=now_utc, nullable=False
    )


class LibraryItemModel(Base):
    details_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    __tablename__ = "library_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    type: Mapped[str] = mapped_column(String(32), default="bullet", nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(128), default="General")
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    variants_json: Mapped[str] = mapped_column(Text, default="[]")
    target_roles_json: Mapped[str] = mapped_column(Text, default="[]")
    metrics: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=now_utc, onupdate=now_utc, nullable=False
    )


class ResumeRevisionModel(Base):
    __tablename__ = "resume_revisions"
    resume_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    revision: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)


class ApplicationSnapshotModel(Base):
    __tablename__ = "application_snapshots"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_id: Mapped[str] = mapped_column(String(36), index=True)
    document_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)


class AIReviewHistoryModel(Base):
    """Independent snapshots survive edits and archival of the source CV."""

    __tablename__ = "ai_review_history"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    resume_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "resumes.id",
            name="fk_ai_review_resume",
            ondelete="CASCADE",
            deferrable=True,
            initially="DEFERRED",
        ),
        nullable=False,
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    scope_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    language: Mapped[str] = mapped_column(String(2), nullable=False)
    model: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    job_description: Mapped[str] = mapped_column(Text, nullable=False)
    document_json: Mapped[str] = mapped_column(Text, nullable=False)
    result_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, nullable=False)
    __table_args__ = (Index("ix_ai_review_scope_created", "scope_hash", "created_at"),)
