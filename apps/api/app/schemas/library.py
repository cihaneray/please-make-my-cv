from __future__ import annotations

import uuid
from datetime import UTC, datetime
from enum import Enum

from pydantic import BaseModel, Field


def default_uuid() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class LibraryItemType(str, Enum):
    BULLET = "bullet"
    EXPERIENCE = "experience"
    PROJECT = "project"
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


class UpdateLibrarySnippetRequest(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    variants: list[BulletVariant] | None = None
    targetRoles: list[str] | None = None
    metrics: str | None = None
