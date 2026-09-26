from typing import Any

import yaml
from pydantic import ValidationError

from app.schemas.resume import ResumeDocument


class YamlParser:
    @staticmethod
    def parse(text: str) -> tuple[ResumeDocument | None, list[str], list[str]]:
        warnings: list[str] = []
        errors: list[str] = []

        try:
            # Strictly use safe_load to guarantee security against arbitrary Python object instantiation
            data = yaml.safe_load(text)
        except yaml.YAMLError as e:
            return None, warnings, [f"YAML syntax error: {str(e)}"]

        if not isinstance(data, dict):
            return None, warnings, ["YAML document must be a dictionary/mapping."]

        resume_payload: dict[str, Any] = data.get("resume", data)

        schema_version = data.get("schemaVersion") or resume_payload.get("metadata", {}).get(
            "schemaVersion", 1
        )
        if isinstance(schema_version, int) and schema_version > 1:
            warnings.append(
                f"Schema version {schema_version} detected. Using backward-compatible parsing."
            )

        try:
            doc = ResumeDocument.model_validate(resume_payload)
            return doc, warnings, errors
        except ValidationError as e:
            validation_errors = [
                f"{'.'.join(str(loc) for loc in err['loc'])}: {err['msg']}" for err in e.errors()
            ]
            return None, warnings, validation_errors
