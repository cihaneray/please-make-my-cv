from __future__ import annotations

import uuid
from datetime import UTC, datetime
from enum import Enum

from pydantic import BaseModel, Field


def default_uuid() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class JobStatus(str, Enum):
    SAVED = "saved"
    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class JobApplication(BaseModel):
    requirements: list[str] = Field(default_factory=list, max_length=100)
    id: str = Field(default_factory=default_uuid)
    company: str
    position: str
    location: str = ""
    url: str = ""
    description: str = ""
    notes: str = ""
    status: JobStatus = JobStatus.SAVED
    linkedResumeId: str | None = None
    createdAt: str = Field(default_factory=now_iso)
    updatedAt: str = Field(default_factory=now_iso)


class CreateJobRequest(BaseModel):
    requirements: list[str] = Field(default_factory=list, max_length=100)
    company: str
    position: str
    location: str = ""
    url: str = ""
    description: str = ""
    notes: str = ""
    status: JobStatus = JobStatus.SAVED
    linkedResumeId: str | None = None


class UpdateJobRequest(BaseModel):
    requirements: list[str] | None = Field(default=None, max_length=100)
    company: str | None = None
    position: str | None = None
    location: str | None = None
    url: str | None = None
    description: str | None = None
    notes: str | None = None
    status: JobStatus | None = None
    linkedResumeId: str | None = None


class JobMatchAnalysis(BaseModel):
    jobId: str
    resumeId: str
    matchScore: float | None  # 0 to 100
    matchedSkills: list[str] = Field(default_factory=list)
    missingSkills: list[str] = Field(default_factory=list)
    recommendedKeywords: list[str] = Field(default_factory=list)
    sectionFeedback: list[dict[str, str]] = Field(default_factory=list)
    summary: str = ""
