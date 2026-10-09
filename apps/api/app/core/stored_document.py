"""Treat stored document corruption as a data conflict, not malformed user input."""

from app.core.exceptions import AppException
from app.schemas.resume import ResumeDocument


def read_stored_document(content: str, record_id: str) -> ResumeDocument:
    try:
        return ResumeDocument.model_validate_json(content)
    except ValueError as exc:
        raise AppException(
            "DOCUMENT_CORRUPT",
            "Stored CV data is invalid. Repair or restore this record first.",
            409,
            {"recordId": record_id},
        ) from exc
