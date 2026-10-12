from __future__ import annotations

import uuid
from datetime import UTC, datetime
from enum import Enum

from pydantic import BaseModel, Field, model_validator

from app.schemas.resume import CertificationItem, ProjectItem


def default_uuid() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class LibraryItemType(str, Enum):
    BULLET = "bullet"
    EXPERIENCE = "experience"
    PROJECT = "project"
    CERTIFICATION = "certification"
    SKILL = "skill"


class BulletVariant(BaseModel):
    id: str = Field(default_factory=default_uuid)
    type: str  # "technical" | "concise" | "business" | "general"
    text: str


class LibrarySnippet(BaseModel):
    id: str = Field(default_factory=default_uuid)
    type: LibraryItemType = LibraryItemType.BULLET
    title: str = ""
    content: str  # Primary text / accomplishment
    category: str = "General"
    tags: list[str] = Field(default_factory=list)
    variants: list[BulletVariant] = Field(default_factory=list)
    targetRoles: list[str] = Field(default_factory=list)
    metrics: str = ""
    project: ProjectItem | None = Field(
        default=None, json_schema_extra={"typescriptOptional": True}
    )
    certification: CertificationItem | None = Field(
        default=None, json_schema_extra={"typescriptOptional": True}
    )
    createdAt: str = Field(default_factory=now_iso)
    updatedAt: str = Field(default_factory=now_iso)


class CreateLibrarySnippetRequest(BaseModel):
    type: LibraryItemType = LibraryItemType.BULLET
    title: str = ""
    content: str
    category: str = "General"
    tags: list[str] = Field(default_factory=list)
    variants: list[BulletVariant] = Field(default_factory=list)
    targetRoles: list[str] = Field(default_factory=list)
    metrics: str = ""
    project: ProjectItem | None = Field(
        default=None, json_schema_extra={"typescriptOptional": True}
    )
    certification: CertificationItem | None = Field(
        default=None, json_schema_extra={"typescriptOptional": True}
    )

    @model_validator(mode="after")
    def valid_details(self):
        if self.project and (self.type != LibraryItemType.PROJECT or not self.project.name.strip()):
            raise ValueError("Project details require the project type and a project name.")
        if self.certification and (
            self.type != LibraryItemType.CERTIFICATION or not self.certification.name.strip()
        ):
            raise ValueError("Certification details require the certification type and a name.")
        return self


class UpdateLibrarySnippetRequest(BaseModel):
    type: LibraryItemType | None = Field(
        default=None, json_schema_extra={"typescriptOptional": True}
    )
    project: ProjectItem | None = Field(
        default=None, json_schema_extra={"typescriptOptional": True}
    )
    certification: CertificationItem | None = Field(
        default=None, json_schema_extra={"typescriptOptional": True}
    )
    title: str | None = None
    content: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    variants: list[BulletVariant] | None = None
    targetRoles: list[str] | None = None
    metrics: str | None = None
