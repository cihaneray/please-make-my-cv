from __future__ import annotations

import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, Field, model_validator


def default_uuid() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class ProfileLink(BaseModel):
    id: str = Field(default_factory=default_uuid)
    label: str = ""
    url: str = ""


class Profile(BaseModel):
    firstName: str = ""
    lastName: str = ""
    headline: str = ""  # Professional Title
    email: str = ""
    phone: str = ""
    location: str = ""
    website: str = ""
    linkedin: str = ""
    github: str = ""
    links: list[ProfileLink] = Field(default_factory=list)


class ExperienceItem(BaseModel):
    id: str = Field(default_factory=default_uuid)
    company: str = ""
    position: str = ""
    location: str = ""
    startDate: str = ""
    endDate: str = ""
    current: bool = False
    summary: str = ""
    bullets: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    id: str = Field(default_factory=default_uuid)
    institution: str = ""
    degree: str = ""
    fieldOfStudy: str = ""
    location: str = ""
    startDate: str = ""
    endDate: str = ""
    current: bool = False
    grade: str = ""
    highlights: list[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    id: str = Field(default_factory=default_uuid)
    name: str = ""
    role: str = ""
    url: str = ""
    startDate: str = ""
    endDate: str = ""
    bullets: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)


class SkillGroup(BaseModel):
    id: str = Field(default_factory=default_uuid)
    category: str = ""
    skills: list[str] = Field(default_factory=list)


class CertificationItem(BaseModel):
    id: str = Field(default_factory=default_uuid)
    name: str = ""
    issuer: str = ""
    issueDate: str = ""
    expiryDate: str = ""
    credentialUrl: str = ""
    credentialId: str = ""


class LanguageItem(BaseModel):
    id: str = Field(default_factory=default_uuid)
    language: str = ""
    proficiency: str = ""  # Native, Fluent, Professional, Intermediate, Elementary


class CustomSectionItem(BaseModel):
    id: str = Field(default_factory=default_uuid)
    title: str = ""
    subtitle: str = ""
    date: str = ""
    description: str = ""
    bullets: list[str] = Field(default_factory=list)


class CustomSection(BaseModel):
    id: str = Field(default_factory=default_uuid)
    title: str = "Custom Section"
    items: list[CustomSectionItem] = Field(default_factory=list)


class DesignSettings(BaseModel):
    template: str = "minimal"  # 'minimal' | 'technical' | 'professional'
    fontFamily: str = "Inter"
    fontSize: str = "10pt"
    spacing: str = "compact"  # 'compact' | 'normal' | 'relaxed'
    margins: str = "normal"  # 'compact' | 'normal' | 'spacious'
    accentColor: str = "#0F172A"


class VisibilitySettings(BaseModel):
    showSummary: bool = True
    showExperience: bool = True
    showEducation: bool = True
    showProjects: bool = True
    showSkills: bool = True
    showCertifications: bool = True
    showLanguages: bool = True


class ResumeMetadata(BaseModel):
    id: str = Field(default_factory=default_uuid)
    schemaVersion: int = 1
    title: str = "Untitled Resume"
    targetRole: str = ""
    templateId: str = "minimal"
    language: str = "en"
    targetMarket: str = "TR"
    tags: list[str] = Field(default_factory=list)
    revision: int = 1
    createdAt: str = Field(default_factory=now_iso)
    updatedAt: str = Field(default_factory=now_iso)
    parentResumeId: str | None = None
    isArchived: bool = False

    @model_validator(mode="before")
    @classmethod
    def check_target_market(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "target_market" in data and "targetMarket" not in data:
                data["targetMarket"] = data["target_market"]
        return data


class ResumeDocument(BaseModel):
    """Canonical Single-Source-Of-Truth Resume Data Model."""

    metadata: ResumeMetadata = Field(default_factory=ResumeMetadata)
    profile: Profile = Field(default_factory=Profile)
    summary: str = ""
    experience: list[ExperienceItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    skills: list[SkillGroup] = Field(default_factory=list)
    certifications: list[CertificationItem] = Field(default_factory=list)
    languages: list[LanguageItem] = Field(default_factory=list)
    customSections: list[CustomSection] = Field(default_factory=list)
    design: DesignSettings = Field(default_factory=DesignSettings)
    visibility: VisibilitySettings = Field(default_factory=VisibilitySettings)


# Request and Response schemas
class CreateResumeRequest(BaseModel):
    title: str = "Untitled Resume"
    targetRole: str = ""
    templateId: str = "minimal"
    language: str = "en"
    targetMarket: str = "TR"
    initialData: ResumeDocument | None = None

    @model_validator(mode="before")
    @classmethod
    def check_target_market(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "target_market" in data and "targetMarket" not in data:
                data["targetMarket"] = data["target_market"]
        return data


class UpdateResumeRequest(BaseModel):
    revision: int
    document: ResumeDocument


class PatchResumeMetadataRequest(BaseModel):
    title: str | None = None
    targetRole: str | None = None
    templateId: str | None = None
    language: str | None = None
    targetMarket: str | None = None
    tags: list[str] | None = None
    isArchived: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def check_target_market(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "target_market" in data and "targetMarket" not in data:
                data["targetMarket"] = data["target_market"]
        return data


class ResumeSummaryResponse(BaseModel):
    id: str
    title: str
    targetRole: str
    templateId: str
    language: str = "en"
    targetMarket: str = "TR"
    revision: int
    updatedAt: str
    createdAt: str
    parentResumeId: str | None = None
    isArchived: bool = False
    stats: dict[str, int] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def check_target_market(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "target_market" in data and "targetMarket" not in data:
                data["targetMarket"] = data["target_market"]
        return data
