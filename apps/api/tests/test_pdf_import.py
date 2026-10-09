from io import BytesIO

from pypdf import PdfWriter

from app.exporters.pdf_exporter import render_pdf
from app.schemas.resume import ResumeDocument
from app.services.pdf_import_service import draft_from_text, inspect_pdf


def example():
    return ResumeDocument.model_validate(
        {
            "profile": {
                "firstName": "Deniz",
                "lastName": "Example",
                "email": "deniz@example.com",
                "phone": "+90 555 123 45 67",
            },
            "summary": "Backend engineer delivering reliable services with documented results and careful testing.",
            "experience": [
                {
                    "company": "Example Technology",
                    "position": "Developer",
                    "bullets": ["Reduced API response time by 35 percent."],
                }
            ],
            "education": [{"institution": "Example University", "degree": "Computer Science"}],
            "skills": [{"category": "Backend", "skills": ["Python", "PostgreSQL"]}],
            "projects": [
                {"name": "Task queue", "bullets": ["Built a reliable queue for background tasks."]}
            ],
        }
    )


def test_pdf_review_is_explicit_local_and_import_preserves_text(client):
    data = render_pdf(example())
    before = client.get("/api/resumes").json()
    response = client.post(
        "/api/import/pdf", files={"file": ("example.pdf", data, "application/pdf")}
    )
    assert response.status_code == 200, response.text
    report = response.json()
    assert report["valid"]
    assert report["pageCount"] == 1
    assert report["atsScore"] == sum(check["points"] for check in report["checks"])
    assert report["atsScore"] == 100
    assert "Python" in report["extractedText"]
    assert "experience" in report["detectedSections"]
    assert report["previewDocument"]["profile"]["email"] == "deniz@example.com"
    assert "Reduced API" in report["previewDocument"]["experience"][0]["summary"]
    assert client.get("/api/resumes").json() == before
    saved = client.post("/api/import/apply", json={"document": report["previewDocument"]})
    assert saved.status_code == 201
    assert saved.json()["profile"]["email"] == "deniz@example.com"
    assert saved.json()["metadata"]["id"] != report["previewDocument"]["metadata"]["id"]


def test_turkish_headings_and_unknown_content_are_preserved():
    text = "Deniz Example\ndeniz@example.com\nÖZET\nBackend geliştirici\nİŞ DENEYİMİ\nExample AŞ\n2022 - 2025\n• Gecikmeyi yüzde 35 azalttım.\nEĞİTİM\nÖrnek Üniversite\nBECERİLER\nBackend: Python, PostgreSQL\nSERTİFİKALAR\nExample Certificate"
    doc, sections = draft_from_text(text, "cv.pdf")
    assert "experience" in sections
    assert doc.profile.firstName == "Deniz"
    assert "2022 - 2025" in doc.experience[0].summary
    assert doc.experience[0].company == ""
    assert doc.skills[0].skills == ["Python", "PostgreSQL"]
    assert any("Example Certificate" in i.description for s in doc.customSections for i in s.items)


def test_blank_or_scanned_pdf_has_no_fake_score_and_cannot_preview():
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    buffer = BytesIO()
    writer.write(buffer)
    report = inspect_pdf(buffer.getvalue(), "scan.pdf")
    assert report.atsScore is None
    assert not report.valid
    assert report.previewDocument is None
    assert "OCR" in report.warnings[0]


def test_encrypted_and_malformed_pdf_return_readable_errors(client):
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    writer.encrypt("secret")
    buffer = BytesIO()
    writer.write(buffer)
    for data in (buffer.getvalue(), b"not a pdf", b"%PDF-1.7 broken"):
        response = client.post(
            "/api/import/pdf", files={"file": ("broken.pdf", data, "application/pdf")}
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "PDF_READ_FAILED"


def test_large_pdf_and_too_many_pages_are_rejected(client):
    response = client.post(
        "/api/import/pdf",
        files={"file": ("large.pdf", b"%PDF-" + b"x" * (4 * 1024 * 1024), "application/pdf")},
    )
    assert response.status_code == 413
    writer = PdfWriter()
    for _ in range(11):
        writer.add_blank_page(width=595, height=842)
    buffer = BytesIO()
    writer.write(buffer)
    response = client.post(
        "/api/import/pdf", files={"file": ("long.pdf", buffer.getvalue(), "application/pdf")}
    )
    assert response.status_code == 422
    assert "1 to 10" in response.json()["error"]["message"]
