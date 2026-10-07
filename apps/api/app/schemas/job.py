from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


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


class JobEvent(BaseModel):
    id: str = Field(default_factory=default_uuid)
    status: JobStatus
    createdAt: str = Field(default_factory=now_iso)


class JobPlanning(BaseModel):
    interviewAt: str = Field(default="", max_length=40)
    followUpDate: str = Field(default="", max_length=10)
    coverLetter: str = Field(default="", max_length=20000)

    @field_validator("interviewAt", "followUpDate")
    @classmethod
    def valid_planning_date(cls, value, info):
        if value:
            if info.field_name == "followUpDate":
                date.fromisoformat(value)
            else:
                datetime.fromisoformat(value)
        return value


class JobApplication(JobPlanning):
    timeline: list[JobEvent] = Field(default_factory=list)
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


class CreateJobRequest(JobPlanning):
    requirements: list[str] = Field(default_factory=list, max_length=100)
    company: str
    position: str
    location: str = ""
    url: str = ""
    description: str = ""
    notes: str = ""
    status: JobStatus = JobStatus.SAVED
    linkedResumeId: str | None = None


class UpdateJobRequest(JobPlanning):
    requirements: list[str] | None = Field(default=None, max_length=100)
    company: str | None = None
    position: str | None = None
    location: str | None = None
    url: str | None = None
    description: str | None = None
    notes: str | None = None
    status: JobStatus | None = None
    linkedResumeId: str | None = None


class RequirementEvidence(BaseModel):
    requirement: str
    section: str
    entryId: str | None = None
    text: str


class JobMatchAnalysis(BaseModel):
    evidence: list[RequirementEvidence] = Field(default_factory=list)
    jobId: str
    resumeId: str
    matchScore: float | None  # 0 to 100
    matchedSkills: list[str] = Field(default_factory=list)
    missingSkills: list[str] = Field(default_factory=list)
    recommendedKeywords: list[str] = Field(default_factory=list)
    sectionFeedback: list[dict[str, str]] = Field(default_factory=list)
    summary: str = ""


class CoverLetterRequest(BaseModel):
    resumeId: str
    language: Literal["en", "tr"] = "en"
    useAI: bool = False


class TailoringCandidate(BaseModel):
    id: str
    section: Literal["experience", "projects"]
    entryId: str
    entryTitle: str
    bulletIndex: int
    text: str
    requirements: list[str]


class TailoringPlan(BaseModel):
    resumeId: str
    revision: int
    jobId: str
    jobUpdatedAt: str
    candidates: list[TailoringCandidate]
    missingRequirements: list[str]


class TailoringApplyRequest(BaseModel):
    revision: int
    jobUpdatedAt: str
    selected: list[str] = Field(min_length=1, max_length=500)


class CoverLetterResult(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    source: Literal["local", "ai"]
    notice: str
