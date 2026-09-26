import yaml

from app.schemas.resume import ResumeDocument


class YamlExporter:
    @staticmethod
    def export(doc: ResumeDocument) -> str:
        payload = {
            "schemaVersion": doc.metadata.schemaVersion,
            "resume": doc.model_dump(),
        }
        return yaml.dump(payload, sort_keys=False, allow_unicode=True, indent=2)
