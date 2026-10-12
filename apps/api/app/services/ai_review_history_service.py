"""Store reviewed input without saving or mutating the live resume."""

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundException
from app.db.models import AIReviewHistoryModel, ResumeModel
from app.schemas.resume import ResumeDocument


class ReviewDimension(BaseModel):
    score: float = Field(ge=0, le=25, allow_inf_nan=False)
    rationale: str = Field(max_length=10000)


class ReviewEditTarget(BaseModel):
    section: Literal["summary", "experience", "projects"]
    field: Literal["summary", "bullets"]
    entryId: str | None = Field(default=None, max_length=128)
    index: int | None = Field(default=None, ge=0, le=10000)


class ReviewEdit(BaseModel):
    documentId: str = Field(min_length=1, max_length=36)
    target: ReviewEditTarget
    before: str = Field(max_length=20000)
    after: str = Field(max_length=20000)


class ReviewRecommendation(BaseModel):
    section: str = Field(max_length=128)
    priority: str = Field(max_length=64)
    evidence: str = Field(max_length=20000)
    advice: str = Field(max_length=20000)
    suggestedText: str = Field(max_length=20000)
    edit: ReviewEdit | None = None


class ReviewResult(BaseModel):
    model_config = ConfigDict(extra="allow")
    score: float = Field(ge=0, le=100, allow_inf_nan=False)
    summary: str = Field(max_length=20000)
    model: str = Field(min_length=1, max_length=255)
    provider: str = Field(min_length=1, max_length=64)
    notice: str = Field(max_length=10000)
    clarity: ReviewDimension
    evidence: ReviewDimension
    completeness: ReviewDimension
    relevance: ReviewDimension | None = None
    strengths: list[str] = Field(max_length=100)
    recommendations: list[ReviewRecommendation] = Field(max_length=100)
    questions: list[str] = Field(max_length=100)

    @model_validator(mode="after")
    def bounded_result(self):
        if len(self.model_dump_json().encode()) > 200000:
            raise ValueError("Review result exceeds 200 KB")
        return self


class SaveReview(BaseModel):
    document: ResumeDocument
    jobDescription: str = Field(default="", max_length=21000)
    language: Literal["en", "tr"] = "en"
    result: ReviewResult

    @model_validator(mode="after")
    def bounded_snapshot(self):
        if not 1 <= len(self.document.metadata.id) <= 36 or self.document.metadata.revision < 1:
            raise ValueError("Snapshot requires a valid CV id and positive revision")
        if len(self.document.model_dump_json().encode()) > 1000000:
            raise ValueError("Reviewed CV exceeds 1 MB")
        if any(
            item.edit and item.edit.documentId != self.document.metadata.id
            for item in self.result.recommendations
        ):
            raise ValueError("Review edit refers to another CV")
        return self


def scope_hash(resume_id: str, job_description: str, language: str) -> str:
    # Exact target text avoids silently comparing two different job descriptions.
    return hashlib.sha256(json.dumps([resume_id, job_description, language]).encode()).hexdigest()


def serialize_review(row: AIReviewHistoryModel) -> dict:
    return {
        "id": row.id,
        "resumeId": row.resume_id,
        "revision": row.revision,
        "jobDescription": row.job_description,
        "language": row.language,
        "model": row.model,
        "provider": row.provider,
        "createdAt": row.created_at.replace(tzinfo=UTC).isoformat(),
        "document": json.loads(row.document_json),
        "result": json.loads(row.result_json),
    }


def make_review(request: SaveReview, *, created_at: datetime | None = None) -> AIReviewHistoryModel:
    return AIReviewHistoryModel(
        id=str(uuid.uuid4()),
        resume_id=request.document.metadata.id,
        revision=request.document.metadata.revision,
        scope_hash=scope_hash(
            request.document.metadata.id, request.jobDescription, request.language
        ),
        language=request.language,
        model=request.result.model,
        provider=request.result.provider,
        job_description=request.jobDescription,
        document_json=request.document.model_dump_json(),
        result_json=request.result.model_dump_json(),
        created_at=created_at or datetime.now(UTC),
    )


def save_review(db: Session, request: SaveReview) -> dict:
    if db.get(ResumeModel, request.document.metadata.id) is None:
        raise EntityNotFoundException("Resume", request.document.metadata.id)
    row = make_review(request)
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize_review(row)
