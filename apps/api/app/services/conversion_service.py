from app.exporters.html_pdf_exporter import HtmlPdfExporter
from app.exporters.json_exporter import JsonExporter
from app.exporters.markdown_exporter import MarkdownExporter
from app.exporters.yaml_exporter import YamlExporter
from app.parsers.json_parser import JsonParser
from app.parsers.markdown_parser import MarkdownParser
from app.parsers.yaml_parser import YamlParser
from app.schemas.import_export import DataFormat
from app.schemas.resume import ResumeDocument


class ConversionService:
    @staticmethod
    def parse(
        content: str,
        format_hint: DataFormat | None = None,
    ) -> tuple[ResumeDocument | None, DataFormat, list[str], list[str]]:
        """Parses raw text into canonical ResumeDocument with auto-detection if format_hint is omitted."""
        stripped = content.strip()
        detected_format = format_hint

        if not detected_format:
            if stripped.startswith("{") or stripped.startswith("["):
                detected_format = DataFormat.JSON
            elif stripped.startswith("#"):
                detected_format = DataFormat.MARKDOWN
            else:
                detected_format = DataFormat.YAML

        if detected_format == DataFormat.JSON:
            doc, warnings, errors = JsonParser.parse(content)
            return doc, DataFormat.JSON, warnings, errors
        elif detected_format == DataFormat.MARKDOWN:
            doc, warnings, errors = MarkdownParser.parse(content)
            return doc, DataFormat.MARKDOWN, warnings, errors
        else:
            doc, warnings, errors = YamlParser.parse(content)
            return doc, DataFormat.YAML, warnings, errors

    @staticmethod
    def export(doc: ResumeDocument, target_format: DataFormat) -> tuple[str, str, str]:
        """Exports ResumeDocument into the target format, returning (content, mime_type, filename)."""
        base_name = doc.metadata.title.lower().replace(" ", "_") or "resume"

        if target_format == DataFormat.JSON:
            text = JsonExporter.export(doc)
            return text, "application/json", f"{base_name}.json"
        elif target_format == DataFormat.YAML:
            text = YamlExporter.export(doc)
            return text, "application/x-yaml", f"{base_name}.yaml"
        elif target_format == DataFormat.MARKDOWN:
            text = MarkdownExporter.export(doc)
            return text, "text/markdown", f"{base_name}.md"
        elif target_format == DataFormat.PDF:
            html_text = HtmlPdfExporter.render_html(doc)
            return html_text, "text/html", f"{base_name}.html"
        else:
            text = JsonExporter.export(doc)
            return text, "application/json", f"{base_name}.json"
