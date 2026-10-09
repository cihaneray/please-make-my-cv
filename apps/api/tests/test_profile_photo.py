import base64
from io import BytesIO
from zipfile import ZipFile

import pytest
from pydantic import ValidationError
from pypdf import PdfReader

from app.exporters.docx_exporter import render_docx
from app.exporters.html_pdf_exporter import HtmlPdfExporter
from app.exporters.pdf_exporter import render_pdf
from app.schemas.resume import Profile, ResumeDocument
from app.services.llm_service import sanitized_document

PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1cAAAAASUVORK5CYII="
PHOTO = "data:image/png;base64," + PNG


def test_legacy_resume_has_no_photo_and_photo_is_not_sent_to_ai():
    doc = ResumeDocument()
    assert doc.profile.photo == ""
    assert '<img class="profile-photo"' not in HtmlPdfExporter.render_html(doc)
    doc.profile = Profile(photo=PHOTO)
    assert 'class="profile-photo"' in HtmlPdfExporter.render_html(doc)
    assert PHOTO not in str(sanitized_document(doc))
    assert ResumeDocument.model_validate_json(doc.model_dump_json()).profile.photo == PHOTO


@pytest.mark.parametrize(
    "photo",
    [
        "https://example.com/photo.jpg",
        "data:image/svg+xml;base64,PHN2Zz4=",
        "data:image/png;base64,ZmFrZQ==",
        "data:image/jpeg;base64," + PNG,
        "data:image/png;base64," + base64.b64encode(b"x" * (256 * 1024 + 1)).decode(),
    ],
)
def test_photo_rejects_external_urls_invalid_data_and_oversized_images(photo):
    with pytest.raises(ValidationError):
        Profile(photo=photo)


def test_photo_embeds_in_word_and_can_be_hidden():
    doc = ResumeDocument(profile=Profile(photo=PHOTO, firstName="Photo", lastName="Test"))
    word = render_docx(doc)
    with ZipFile(BytesIO(word)) as archive:
        assert any(name.startswith("word/media/") for name in archive.namelist())
        assert b"Photo Test" in archive.read("word/document.xml")
    doc.visibility.showPhoto = False
    assert 'class="profile-photo"' not in HtmlPdfExporter.render_html(doc)
    with ZipFile(BytesIO(render_docx(doc))) as archive:
        assert not any(name.startswith("word/media/") for name in archive.namelist())


def test_photo_is_embedded_in_pdf_for_all_templates():
    doc = ResumeDocument(profile=Profile(photo=PHOTO, firstName="Photo", lastName="Test"))
    for template in ("minimal", "professional", "technical"):
        doc.design.template = template
        reader = PdfReader(BytesIO(render_pdf(doc)))
        assert len(reader.pages) == 1
        assert "PHOTO TEST" in reader.pages[0].extract_text().upper()
        assert len(reader.pages[0].images) > 0
