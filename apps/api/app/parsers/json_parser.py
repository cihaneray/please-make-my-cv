import json
from typing import Any

from pydantic import ValidationError

from app.schemas.resume import ResumeDocument


class JsonParser:
    @staticmethod
    def parse(text: str) -> tuple[ResumeDocument | None, list[str], list[str]]:
        warnings: list[str] = []
        errors: list[str] = []

        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            return (
                None,
                warnings,
                [f"Invalid JSON syntax at line {e.lineno}, column {e.colno}: {e.msg}"],
            )

        if not isinstance(data, dict):
            return None, warnings, ["JSON payload must be a top-level object."]

        # Check for wrapped 'resume' key or direct ResumeDocument
        resume_payload: dict[str, Any] = data.get("resume", data)

        schema_version = data.get("schemaVersion") or resume_payload.get("metadata", {}).get(
            "schemaVersion", 1
        )
        if schema_version > 1:
            warnings.append(
                f"Document schemaVersion {schema_version} is newer than current version (1). Some fields may be migrated."
            )

        try:
            doc = ResumeDocument.model_validate(resume_payload)
            return doc, warnings, errors
        except ValidationError as e:
            validation_errors = [
                f"{'.'.join(str(loc) for loc in err['loc'])}: {err['msg']}" for err in e.errors()
            ]
            return None, warnings, validation_errors
