import json

from app.schemas.resume import ResumeDocument


class JsonExporter:
    @staticmethod
    def export(doc: ResumeDocument) -> str:
        payload = {
            "schemaVersion": doc.metadata.schemaVersion,
            "resume": doc.model_dump(),
        }
        return json.dumps(payload, indent=2, ensure_ascii=False)
