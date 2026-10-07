from io import BytesIO
from zipfile import ZipFile

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph

from app.exporters.docx_exporter import render_docx
from app.schemas.import_export import DataFormat
from app.schemas.resume import ResumeDocument
from app.services.conversion_service import ConversionService


def paragraphs(word):
    return [Paragraph(node, word) for node in word.element.body.iter(qn("w:p"))]


def example():
    return ResumeDocument.model_validate(
        {
            "metadata": {"title": "Örnek CV", "language": "tr"},
            "profile": {
                "firstName": "Deniz",
                "lastName": "Yılmaz",
                "headline": "Engineer",
                "email": "deniz@example.com",
                "github": "github.com/example",
                "links": [
                    {"label": "Unsafe", "url": "javascript:alert(1)"},
                    {"label": "Malformed", "url": "http://["},
                ],
            },
            "summary": "Hidden summary",
            "experience": [
                {
                    "company": "Example",
                    "position": "Backend Engineer",
                    "startDate": "2022-03",
                    "current": True,
                    "bullets": ["Shipped <editable> APIs", "Reduced latency"],
                    "technologies": ["Python"],
                }
            ],
            "education": [
                {
                    "institution": "University",
                    "degree": "BSc",
                    "highlights": ["Thesis"],
                    "grade": "3.8",
                }
            ],
            "projects": [
                {
                    "name": "Search",
                    "role": "Maintainer",
                    "url": "https://example.com",
                    "bullets": ["Built search"],
                    "technologies": ["Docker"],
                }
            ],
            "skills": [{"category": "Backend", "skills": ["FastAPI"]}],
            "certifications": [
                {
                    "name": "Certification",
                    "issuer": "Issuer",
                    "issueDate": "2024-01",
                    "expiryDate": "2027-01",
                    "credentialId": "ABC",
                    "credentialUrl": "https://example.com/cert",
                }
            ],
            "languages": [{"language": "Türkçe", "proficiency": "Native"}],
            "customSections": [
                {
                    "title": "Volunteering",
                    "items": [
                        {
                            "title": "Mentor",
                            "subtitle": "Community",
                            "date": "2023",
                            "description": "Coaching",
                            "bullets": ["Hosted sessions"],
                        }
                    ],
                }
            ],
            "visibility": {"showSummary": False},
            "design": {"sectionOrder": ["skills", "experience"]},
        }
    )


def test_docx_is_editable_localized_and_respects_visibility_and_order():
    data = render_docx(example())
    word = Document(BytesIO(data))
    text = "\n".join(p.text for p in paragraphs(word))
    assert "Deniz Yılmaz" in text
    assert "Hidden summary" not in text
    assert text.index("YETKİNLİKLER") < text.index("İŞ DENEYİMİ") < text.index("EĞİTİM")
    for value in (
        "Mar 2022",
        "Devam Ediyor",
        "Shipped <editable> APIs",
        "Thesis",
        "3.8",
        "Built search",
        "Docker",
        "FastAPI",
        "Issuer",
        "Oca 2027",
        "ABC",
        "Türkçe",
        "Native",
        "Mentor",
        "Community",
        "Coaching",
        "Hosted sessions",
    ):
        assert value in text
    assert sum(p.style.name == "List Bullet" for p in word.paragraphs) == 5
    assert abs(word.sections[0].page_width.mm - 210) < 0.02
    assert word.paragraphs[0].style.name == "Title"
    with ZipFile(BytesIO(data)) as archive:
        relationships = archive.read("word/_rels/document.xml.rels").decode()
        assert "https://github.com/example" in relationships
        assert "https://example.com/cert" in relationships
        assert "javascript:" not in relationships
        assert "http://[" not in relationships
        assert b"w:numPr" in archive.read("word/styles.xml")


def test_saved_and_current_draft_docx_exports_do_not_save_draft(client):
    saved = client.post("/api/resumes", json={"title": "Saved document"}).json()
    resume_id = saved["metadata"]["id"]
    response = client.get(f"/api/resumes/{resume_id}/export?format=docx&download=true")
    assert response.status_code == 200
    assert response.headers["content-type"].endswith("wordprocessingml.document")
    assert 'filename="saved_document.docx"' in response.headers["content-disposition"]
    draft = example().model_dump()
    draft["metadata"]["id"] = resume_id
    draft["profile"]["firstName"] = "Unsaved name"
    response = client.post(f"/api/resumes/{resume_id}/export?format=docx", json=draft)
    assert response.status_code == 200
    assert "Unsaved name" in Document(BytesIO(response.content)).paragraphs[0].text
    after = client.get(f"/api/resumes/{resume_id}").json()
    assert after == saved
    assert (
        client.post(f"/api/resumes/{resume_id}/export?format=html", json=draft).status_code == 422
    )


def test_docx_filename_and_export_only_import():
    data, mime, filename = ConversionService.export(example(), DataFormat.DOCX)
    assert filename == "ornek_cv.docx"
    assert mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert ZipFile(BytesIO(data)).testzip() is None
    doc, detected, _, errors = ConversionService.parse("word data", DataFormat.DOCX)
    assert doc is None and detected == DataFormat.DOCX and errors


def test_technical_template_keeps_its_default_section_order():
    resume = example()
    resume.metadata.language = "en"
    resume.design.template = "technical"
    resume.design.sectionOrder = []
    word = Document(BytesIO(render_docx(resume)))
    text = "\n".join(p.text for p in paragraphs(word))
    assert (
        text.index("TECHNICAL SKILLS")
        < text.index("EXPERIENCE")
        < text.index("TECHNICAL PROJECTS")
        < text.index("EDUCATION")
    )
    date = next(p for p in paragraphs(word) if "Mar 2022" in p.text)
    assert date.paragraph_format.keep_with_next
    assert date.alignment == WD_ALIGN_PARAGRAPH.RIGHT


def test_word_style_matches_professional_preview_settings():
    resume = example()
    resume.design.template = "professional"
    resume.design.fontFamily = "Georgia"
    resume.design.fontSize = "12pt"
    resume.design.accentColor = "#943A20"
    word = Document(BytesIO(render_docx(resume)))
    assert word.paragraphs[0].text == "DENIZ YILMAZ"
    assert word.paragraphs[0].alignment == WD_ALIGN_PARAGRAPH.CENTER
    assert word.styles["Title"].font.size.pt == 24
    assert word.styles["Normal"].font.name == "Georgia"
    assert str(word.styles["Heading 1"].font.color.rgb) == "943A20"
    assert abs(word.sections[0].top_margin.mm - 15) < 0.02
    assert "İŞ DENEYİMİ & KARİYER GEÇMİŞİ" in "\n".join(p.text for p in paragraphs(word))
    contact = word.paragraphs[2]
    assert "deniz@example.com" in contact.text and "github.com/example" in contact.text
    assert contact._p.xpath("./w:pPr/w:pBdr/w:bottom")
