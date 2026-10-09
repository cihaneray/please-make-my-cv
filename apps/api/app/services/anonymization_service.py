"""Build a reviewable anonymous copy of a draft without modifying its source."""

import re
from urllib.parse import urlsplit

from pydantic import BaseModel

from app.schemas.resume import ResumeDocument


def _known_values(document: ResumeDocument) -> list[str]:
    profile = document.profile
    values = [
        f"{profile.firstName} {profile.lastName}".strip(),
        profile.firstName,
        profile.lastName,
        profile.email,
        profile.phone,
        profile.location,
        profile.website,
        profile.linkedin,
        profile.github,
        *(link.url for link in profile.links),
    ]
    for value in list(values):
        if not value:
            continue
        parsed = urlsplit(value if "://" in value else f"https://{value}")
        if parsed.hostname:
            values.append(f"{parsed.netloc}{parsed.path}".rstrip("/"))
            values.append(f"www.{parsed.netloc}{parsed.path}".rstrip("/"))
    # Longer matches first so a full name or URL is removed as one span.
    return sorted(
        {value.strip() for value in values if value and value.strip()}, key=len, reverse=True
    )


def _redact(value: str, known_values: list[str]) -> str:
    for known in known_values:
        pattern = re.escape(known)
        if known[0].isalnum():
            pattern = r"(?<!\w)" + pattern
        if known[-1].isalnum():
            pattern += r"(?!\w)"
        value = re.sub(pattern, "[redacted]", value, flags=re.IGNORECASE)
    return value


def _redact_free_text(model: BaseModel, known_values: list[str]) -> None:
    for field_name in type(model).model_fields:
        value = getattr(model, field_name)
        if field_name in {"id", "photo", "startDate", "endDate", "issueDate", "expiryDate"}:
            continue
        if isinstance(value, str):
            setattr(model, field_name, _redact(value, known_values))
        elif isinstance(value, BaseModel):
            _redact_free_text(value, known_values)
        elif isinstance(value, list):
            for index, item in enumerate(value):
                if isinstance(item, BaseModel):
                    _redact_free_text(item, known_values)
                elif isinstance(item, str):
                    value[index] = _redact(item, known_values)


def anonymize_document(document: ResumeDocument) -> ResumeDocument:
    """Remove explicit identifiers and their known occurrences from visible text.

    This cannot discover unknown indirect identifiers; the caller must show the
    transformed document for a final manual review before PDF download.
    """
    known_values = _known_values(document)
    result = document.model_copy(deep=True)
    result.profile.headline = _redact(result.profile.headline, known_values)
    result.summary = _redact(result.summary, known_values)
    result.metadata.targetRole = _redact(result.metadata.targetRole, known_values)
    for entries in (
        result.experience,
        result.education,
        result.projects,
        result.skills,
        result.certifications,
        result.languages,
        result.customSections,
    ):
        for entry in entries:
            _redact_free_text(entry, known_values)
    alias = "Aday" if document.metadata.language.lower() == "tr" else "Candidate"
    result.metadata.title = f"{alias} CV"
    result.metadata.tags = []
    result.metadata.targetJob = None
    result.profile.firstName = alias
    result.profile.lastName = ""
    result.profile.photo = ""
    result.profile.email = ""
    result.profile.phone = ""
    result.profile.location = ""
    result.profile.website = ""
    result.profile.linkedin = ""
    result.profile.github = ""
    result.profile.links = []
    result.visibility.showPhoto = False
    for experience in result.experience:
        experience.location = ""
    for education in result.education:
        education.location = ""
    for project in result.projects:
        project.url = ""
    for certification in result.certifications:
        certification.credentialUrl = ""
        certification.credentialId = ""
    return result
