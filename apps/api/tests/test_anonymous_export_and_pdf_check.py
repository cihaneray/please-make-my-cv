import io

from pypdf import PdfReader, PdfWriter

from app.schemas.resume import (
    CertificationItem,
    ExperienceItem,
    Profile,
    ProfileLink,
    ProjectItem,
    ResumeDocument,
    ResumeMetadata,
)
from app.services.anonymization_service import anonymize_document
from app.services.pdf_check_service import check_pdf


def sample_document() -> ResumeDocument:
    return ResumeDocument(
        metadata=ResumeMetadata(title="Ada Lovelace CV"),
        profile=Profile(
            firstName="Ada",
            lastName="Lovelace",
            email="ada@example.com",
            phone="+90 555 111 2233",
            location="Istanbul, Turkey",
            website="https://ada.example.com",
            linkedin="linkedin.com/in/ada",
            links=[ProfileLink(label="Portfolio", url="https://portfolio.example.com/ada")],
            headline="Software Engineer",
        ),
        summary="Ada Lovelace builds platforms. Contact ada@example.com in Istanbul, Turkey.",
        experience=[
            ExperienceItem(
                company="Example Corp",
                position="Engineer",
                location="Istanbul, Turkey",
                bullets=["Visit https://ada.example.com for more work."],
            )
        ],
        projects=[ProjectItem(name="Sample Project", url="https://ada.example.com/project")],
        certifications=[
            CertificationItem(
                name="Cloud Certificate",
                credentialId="ADA-123",
                credentialUrl="https://verify.example.com/ada",
            )
        ],
    )


def test_anonymous_copy_removes_known_identifiers_without_mutating_source():
    source = sample_document()
    anonymous = anonymize_document(source)
    assert anonymous.profile.firstName == "Candidate"
    assert not anonymous.profile.lastName
    assert not anonymous.profile.photo
    assert not anonymous.profile.email
    assert not anonymous.profile.phone
    assert not anonymous.profile.location
    assert not anonymous.profile.links
    assert not anonymous.experience[0].location
    assert not anonymous.projects[0].url
    assert not anonymous.certifications[0].credentialUrl
    assert not anonymous.certifications[0].credentialId
    assert "Ada" not in anonymous.summary
    assert "ada@example.com" not in anonymous.summary
    assert "ada.example.com" not in anonymous.experience[0].bullets[0]
    assert source.profile.firstName == "Ada"
    assert source.projects[0].url


def test_turkish_alias_and_neutral_filename(client):
    source = sample_document()
    source.metadata.language = "tr"
    response = client.post("/api/resumes/test/export/anonymous/pdf", json=source.model_dump())
    assert response.status_code == 200
    assert response.headers["content-disposition"] == 'attachment; filename="aday-cv.pdf"'
    assert PdfReader(io.BytesIO(response.content)).metadata.title == "Aday CV"


def test_anonymous_preview_and_pdf_route(client):
    source = sample_document()
    preview = client.post("/api/resumes/test/export/anonymous/preview", json=source.model_dump())
    assert preview.status_code == 200
    assert preview.json()["profile"]["firstName"] == "Candidate"
    response = client.post("/api/resumes/test/export/anonymous/pdf", json=source.model_dump())
    assert response.status_code == 200
    assert response.headers["content-disposition"] == 'attachment; filename="candidate-cv.pdf"'
    reader = PdfReader(io.BytesIO(response.content))
    extracted = " ".join(page.extract_text() or "" for page in reader.pages)
    assert "Candidate" in extracted
    for secret in ("Ada", "Lovelace", "ada@example.com", "Istanbul", "ada.example.com"):
        assert secret not in extracted
        assert secret not in str(reader.metadata)
    assert reader.metadata.title == "Candidate CV"
    assert not reader.metadata.author


def test_pdf_check_reads_generated_pdf_and_respects_hidden_sections():
    source = sample_document()
    source.visibility.showProjects = False
    report = check_pdf(source)
    assert report.pageCount >= 1
    assert not any(issue.code == "missing-contact" for issue in report.issues)
    assert not any("Sample Project" in issue.message for issue in report.issues)


def test_pdf_check_reports_missing_text_from_pdf_bytes(monkeypatch):
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)
    buffer = io.BytesIO()
    writer.write(buffer)
    monkeypatch.setattr(
        "app.services.pdf_check_service.render_pdf", lambda *args: buffer.getvalue()
    )
    report = check_pdf(sample_document())
    codes = {issue.code for issue in report.issues}
    assert {"empty-page", "missing-contact", "missing-content"} <= codes
