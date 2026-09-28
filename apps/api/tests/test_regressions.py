import io
from concurrent.futures import ThreadPoolExecutor

import pytest
from pypdf import PdfReader
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.exceptions import ConcurrencyConflictException
from app.db.base import Base
from app.exporters.html_pdf_exporter import HtmlPdfExporter
from app.exporters.json_exporter import JsonExporter
from app.exporters.yaml_exporter import YamlExporter
from app.matching.matcher import MatchingService
from app.parsers.json_parser import JsonParser
from app.parsers.yaml_parser import YamlParser
from app.schemas.resume import (
    CreateResumeRequest,
    CustomSection,
    CustomSectionItem,
    ResumeDocument,
    UpdateResumeRequest,
)
from app.services.ai_service import AIService
from app.services.resume_service import ResumeService


@pytest.mark.parametrize(
    "parser,payload",
    [
        (JsonParser, '{"resume": []}'),
        (JsonParser, '{"metadata": null}'),
        (JsonParser, '{"schemaVersion": "2"}'),
        (YamlParser, "resume: []"),
        (JsonParser, '{"unknown": "preserve me"}'),
    ],
)
def test_malformed_inputs_are_validation_errors(parser, payload):
    doc, _, errors = parser.parse(payload)
    assert doc is None and errors


@pytest.mark.parametrize(
    "parser,exporter", [(JsonParser, JsonExporter), (YamlParser, YamlExporter)]
)
def test_lossless_formats(parser, exporter):
    doc = ResumeDocument(
        customSections=[
            CustomSection(title="Awards", items=[CustomSectionItem(title="Award", bullets=["One"])])
        ]
    )
    doc.metadata.language = "tr"
    doc.metadata.targetMarket = "EU"
    result, _, errors = parser.parse(exporter.export(doc))
    assert not errors
    assert result.model_dump() == doc.model_dump()


def test_import_preserves_language_design(client):
    doc = ResumeDocument()
    doc.metadata.language = "tr"
    doc.metadata.targetMarket = "EU"
    doc.design.template = "technical"
    doc.metadata.templateId = "technical"
    response = client.post("/api/import/apply", json={"document": doc.model_dump()})
    assert response.status_code == 201
    value = response.json()
    assert value["metadata"]["language"] == "tr"
    assert value["metadata"]["targetMarket"] == "EU"
    assert value["design"]["template"] == "technical"


def test_metadata_conflict_and_history(client):
    original = client.post(
        "/api/resumes", json={"title": "Original", "templateId": "technical"}
    ).json()
    identifier = original["metadata"]["id"]
    assert original["design"]["template"] == "technical"
    response = client.patch(
        f"/api/resumes/{identifier}/metadata", json={"revision": 1, "title": "Renamed"}
    )
    assert response.status_code == 200 and response.json()["revision"] == 2
    assert (
        client.put(
            f"/api/resumes/{identifier}", json={"revision": 1, "document": original}
        ).status_code
        == 409
    )
    history = client.get(f"/api/resumes/{identifier}/history").json()
    assert history[0]["document"]["metadata"]["title"] == "Original"
    restored = client.post(f"/api/resumes/{identifier}/restore/1?expected_revision=2").json()
    assert restored["metadata"]["revision"] == 3
    assert restored["metadata"]["title"] == "Original"


def test_atomic_concurrent_writes(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'concurrent.db'}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        doc = ResumeService.create_resume(db, CreateResumeRequest(title="Concurrent"))

    def write(index):
        with Session(engine) as db:
            changed = doc.model_copy(deep=True)
            changed.summary = str(index)
            try:
                ResumeService.update_resume(
                    db, doc.metadata.id, UpdateResumeRequest(revision=1, document=changed)
                )
                return "saved"
            except ConcurrencyConflictException:
                return "conflict"

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(write, [1, 2]))
    assert sorted(outcomes) == ["conflict", "saved"]
    engine.dispose()


def test_html_safe_and_complete():
    doc = ResumeDocument(
        customSections=[
            CustomSection(title="Awards", items=[CustomSectionItem(title="UNIQUE_AWARD")])
        ]
    )
    doc.design.fontFamily = "</style><script>alert(1)</script>"
    doc.design.accentColor = "</style><script>alert(2)</script>"
    doc.metadata.language = '" onload=alert(3)'
    doc.design.template = ""
    output = HtmlPdfExporter.render_html(doc)
    assert "<script>" not in output
    assert "onload=" not in output
    assert "UNIQUE_AWARD" in output
    assert "Content-Security-Policy" in output


def test_empty_and_factual_rewrites():
    assert AIService.rewrite_bullet("")["suggestion"] == ""
    assert (
        AIService.rewrite_bullet("Reviewed Python pull requests")["suggestion"]
        == "Reviewed Python pull requests."
    )
    assert AIService.improve_summary("", "Engineer")["suggestion"] == ""


def test_unknown_job_is_unassessed():
    assert MatchingService.match(ResumeDocument(), "job", "Pastry chef").matchScore is None


def test_pdf_content_and_long_document(client):
    doc = ResumeDocument(
        customSections=[
            CustomSection(
                title="Awards",
                items=[
                    CustomSectionItem(
                        title="UNIQUE_AWARD",
                        bullets=[f"Unique accomplishment number {i}" for i in range(100)],
                    )
                ],
            )
        ]
    )
    response = client.post("/api/resumes/draft/export", json=doc.model_dump())
    assert response.status_code == 200, response.text[:500] if response.status_code != 200 else ""
    assert response.content.startswith(b"%PDF-")
    assert response.headers["content-type"] == "application/pdf"
    reader = PdfReader(io.BytesIO(response.content))
    assert len(reader.pages) > 1
    text = "\n".join(page.extract_text() for page in reader.pages)
    assert "UNIQUE_AWARD" in text
    assert "Unique accomplishment number 99" in text


def test_backup_restore_additive_and_validated(client):
    client.post("/api/resumes", json={"title": "Keep me"})
    backup = client.get("/api/workspace/backup").json()
    response = client.post("/api/workspace/restore", json=backup)
    assert response.status_code == 200
    assert len(client.get("/api/resumes").json()) == 2
    invalid = dict(backup, version=999)
    assert client.post("/api/workspace/restore", json=invalid).status_code == 422
    assert len(client.get("/api/resumes").json()) == 2


def test_markdown_source_cannot_replace_document(client):
    doc = client.post("/api/resumes", json={}).json()
    response = client.put(
        f"/api/resumes/{doc['metadata']['id']}/source",
        json={"revision": 1, "format": "markdown", "content": "# Name"},
    )
    assert response.status_code == 422


def test_body_limit(client):
    response = client.post("/api/import/preview", content=b"x" * (5 * 1024 * 1024 + 1))
    assert response.status_code == 413


def test_unlink_and_application_snapshot(client):
    doc = client.post("/api/resumes", json={}).json()
    job = client.post(
        "/api/jobs",
        json={
            "company": "Company",
            "position": "Role",
            "linkedResumeId": doc["metadata"]["id"],
            "status": "applied",
        },
    ).json()
    snapshots = client.get(f"/api/jobs/{job['id']}/snapshots").json()
    assert len(snapshots) == 1
    response = client.put(f"/api/jobs/{job['id']}", json={"linkedResumeId": None})
    assert response.status_code == 200 and response.json()["linkedResumeId"] is None


def test_repository_fixture_accepts_yaml_dates():
    from pathlib import Path

    fixture = (
        Path(__file__).resolve().parents[3]
        / "packages/shared/fixtures/software_engineer_resume.yaml"
    )
    doc, _, errors = YamlParser.parse(fixture.read_text(encoding="utf8"))
    assert not errors
    assert doc.experience[0].startDate == "2022"


def test_custom_requirements_support_other_occupations(client):
    doc = client.post(
        "/api/resumes", json={"initialData": {"summary": "Experienced in cake decorating"}}
    ).json()
    job = client.post("/api/jobs", json={"company": "Bakery", "position": "Chef"}).json()
    response = client.post(
        f"/api/jobs/{job['id']}/match/{doc['metadata']['id']}",
        json={"requirements": ["cake decorating", "food safety"]},
    )
    assert response.status_code == 200
    assert response.json()["matchScore"] == 50
    assert response.json()["matchedSkills"] == ["cake decorating"]


def test_migrations_adopt_existing_database(tmp_path):
    from pathlib import Path

    from alembic import command
    from alembic.config import Config

    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    # Model-created legacy data remains after the baseline and repeated startup.
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        doc = ResumeService.create_resume(db, CreateResumeRequest(title="Preserve"))
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        command.upgrade(config, "head")
    with Session(engine) as db:
        assert ResumeService.get_resume(db, doc.metadata.id).metadata.title == "Preserve"
    engine.dispose()


def test_yaml_aliases_are_rejected():
    doc, _, errors = YamlParser.parse("profile: &recursive {links: [*recursive]}")
    assert doc is None and errors


def test_analysis_marks_job_relevance_unassessed(client):
    response = client.post("/api/resumes/draft/analysis", json=ResumeDocument().model_dump())
    assert response.status_code == 200
    assert response.json()["atsBreakdown"]["job_relevance"] is None


def test_markdown_human_fields_are_parsed():
    from app.exporters.markdown_exporter import MarkdownExporter
    from app.parsers.markdown_parser import MarkdownParser
    from app.schemas.resume import CertificationItem, LanguageItem, Profile, SkillGroup

    doc = ResumeDocument(
        profile=Profile(
            firstName="Name",
            headline="Engineer",
            email="name@example.test",
            linkedin="https://linkedin.com/in/name",
            github="https://github.com/name",
        ),
        certifications=[CertificationItem(name="Certificate")],
        languages=[LanguageItem(language="English", proficiency="Native")],
        skills=[SkillGroup(category="Backend", skills=["Python"])],
    )
    parsed, warnings, errors = MarkdownParser.parse(MarkdownExporter.export(doc))
    assert not errors and any("lossy" in warning for warning in warnings)
    assert parsed.profile.headline == "Engineer"
    assert parsed.profile.linkedin == doc.profile.linkedin
    assert parsed.profile.github == doc.profile.github
    assert parsed.certifications[0].name == "Certificate"
    assert parsed.languages[0].proficiency == "Native"
    assert parsed.skills[0].skills == ["Python"]
