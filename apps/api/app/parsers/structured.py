from pydantic import ValidationError

from app.schemas.resume import ResumeDocument


def parse_document(data):
    if not isinstance(data, dict):
        return None, [], ["Document must be a top-level object."]
    payload = data.get("resume", data)
    if not isinstance(payload, dict):
        return None, [], ["resume must be an object."]
    metadata = payload.get("metadata", {})
    if not isinstance(metadata, dict):
        return None, [], ["metadata must be an object."]
    version = data.get("schemaVersion", metadata.get("schemaVersion", 1))
    if type(version) is not int or version != 1:
        return (
            None,
            [],
            [
                "Only integer schemaVersion 1 is supported. Convert newer documents before importing."
            ],
        )
    try:
        doc = ResumeDocument.model_validate(payload)

        def unknown(raw, model, path=""):
            errors = []
            if isinstance(raw, dict):
                for key, value in raw.items():
                    if key in {"schemaVersion", "target_market"}:
                        continue
                    if key not in type(model).model_fields:
                        errors.append(
                            f"{path}{key}: unknown field; preserve it in a custom section."
                        )
                    else:
                        parsed = getattr(model, key)
                        if isinstance(value, dict) and hasattr(type(parsed), "model_fields"):
                            errors += unknown(value, parsed, f"{path}{key}.")
                        elif isinstance(value, list) and isinstance(parsed, list):
                            for i, (v, item) in enumerate(zip(value, parsed)):
                                if hasattr(type(item), "model_fields"):
                                    errors += unknown(v, item, f"{path}{key}.{i}.")
            return errors

        errors = unknown(payload, doc)
        return (None if errors else doc), [], errors
    except ValidationError as exc:
        return None, [], [f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors()]
