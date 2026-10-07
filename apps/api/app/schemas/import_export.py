from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.resume import ResumeDocument


class DataFormat(str, Enum):
    JSON = "json"
    YAML = "yaml"
    MARKDOWN = "markdown"
    PDF = "pdf"
    DOCX = "docx"
    HTML = "html"


class ImportValidateRequest(BaseModel):
    format: DataFormat | None = None
    content: str = Field(max_length=5 * 1024 * 1024)


class ImportValidationResult(BaseModel):
    valid: bool
    detectedFormat: DataFormat
    schemaVersion: int = 1
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


class ImportPreviewResult(BaseModel):
    valid: bool
    detectedFormat: DataFormat
    schemaVersion: int = 1
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    previewDocument: ResumeDocument | None = None
    sectionSummary: dict[str, int] = Field(default_factory=dict)


class ImportApplyRequest(BaseModel):
    document: ResumeDocument
    overwriteExistingId: str | None = None
    targetTitle: str | None = None


class SourceValidationRequest(BaseModel):
    format: DataFormat  # JSON | YAML | MARKDOWN
    content: str = Field(max_length=5 * 1024 * 1024)


class SourceValidationResponse(BaseModel):
    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    normalizedDocument: ResumeDocument | None = None


class SourceApplyRequest(BaseModel):
    format: DataFormat
    content: str = Field(max_length=5 * 1024 * 1024)
    revision: int


class ExportRequest(BaseModel):
    format: DataFormat
    templateId: str | None = None


class ExportResponse(BaseModel):
    format: DataFormat
    mimeType: str
    filename: str
    content: str | None = None  # Text content for JSON/YAML/Markdown
