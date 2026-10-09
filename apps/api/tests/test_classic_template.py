from io import BytesIO

from pypdf import PdfReader

from app.exporters.html_pdf_exporter import HtmlPdfExporter
from app.exporters.pdf_exporter import render_pdf
from app.schemas.resume import ResumeDocument


def test_classic_preserves_entry_hierarchy_dates_contacts_and_section_order():
    doc = ResumeDocument.model_validate(
        {
            "metadata": {"language": "tr"},
            "profile": {
                "firstName": "Example",
                "lastName": "Candidate",
                "links": [{"label": "Portfolio", "url": "https://example.com"}],
            },
            "design": {"template": "classic", "fontSize": "8pt", "sectionOrder": []},
            "summary": "Documented work.",
            "skills": [{"category": "Backend", "skills": ["Python"]}],
            "experience": [
                {
                    "position": "Engineer",
                    "company": "Example Co",
                    "startDate": "2024-07",
                    "endDate": "2024-08",
                    "bullets": ["Built services."],
                }
            ],
            "projects": [
                {
                    "name": "Project Example",
                    "role": "System design",
                    "startDate": "2026",
                    "bullets": ["Measured results."],
                }
            ],
            "education": [
                {
                    "institution": "Example University",
                    "degree": "Masters",
                    "startDate": "2026-07",
                    "endDate": "2028-07 (Beklenen)",
                }
            ],
            "customSections": [{"title": "Certificates", "items": [{"bullets": ["Cloud course"]}]}],
        }
    )
    html = HtmlPdfExporter.render_html(doc)
    assert html.index("Engineer") < html.index("Example Co")
    assert html.index("Project Example") < html.index("System design")
    assert "07/2024 - 08/2024" in html
    assert "07/2026 - 07/2028 (Beklenen)" in html
    assert "Portfolio</a>" in html
    assert html.index('data-studio-section="skills"') < html.index(
        'data-studio-section="experience"'
    )
    assert "<div> </div>" not in html
    reader = PdfReader(BytesIO(render_pdf(doc)))
    assert len(reader.pages) == 1
    text = reader.pages[0].extract_text()
    for phrase in ("Engineer", "Example Co", "Masters", "Cloud course", "Portfolio"):
        assert phrase in text
