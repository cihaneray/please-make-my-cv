import re
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.exporters.html_pdf_exporter import HtmlPdfExporter
from app.schemas.resume import DesignSettings, PageFitRequest, ResumeDocument
from app.services.page_fit_service import suggest_page_fit


def test_section_order_changes_output_and_defaults_remain_compatible():
    doc = ResumeDocument.model_validate(
        {
            "summary": "Summary evidence",
            "skills": [{"category": "Tools", "skills": ["Python"]}],
            "experience": [{"position": "Developer", "company": "Example"}],
            "customSections": [{"title": "Volunteering", "items": []}],
        }
    )
    doc.design.sectionOrder = ["customSections", "skills", "summary"]
    output = HtmlPdfExporter.render_html(doc)
    assert re.findall(r'<section data-studio-section="([^"]+)"', output) == [
        "customSections",
        "skills",
        "summary",
        "experience",
    ]
    legacy = ResumeDocument.model_validate({})
    assert legacy.design.sectionOrder == []
    with pytest.raises(ValidationError):
        DesignSettings(sectionOrder=["summary", "summary"])
    with pytest.raises(ValidationError):
        DesignSettings(sectionOrder=["untrusted"])


def test_page_fit_measures_candidates_without_mutating_text(monkeypatch):
    calls = []

    def measure(doc):
        calls.append(doc.model_dump())
        return SimpleNamespace(pageCount=2 if doc.design.margins == "compact" else 3)

    monkeypatch.setattr("app.services.page_fit_service.check_pdf", measure)
    doc = ResumeDocument(summary="Keep all claims unchanged")
    doc.design.spacing = "normal"
    original = doc.model_dump()
    report = suggest_page_fit(PageFitRequest(document=doc, targetPages=2))
    assert report.currentPages == 3
    assert any(option.pageCount == 2 for option in report.options)
    assert all(float(option.design.fontSize.removesuffix("pt")) >= 9.5 for option in report.options)
    assert doc.model_dump() == original
    assert all(candidate["summary"] == doc.summary for candidate in calls)


def test_job_planning_preserves_dates_letter_and_backup(client):
    job = client.post(
        "/api/jobs",
        json={
            "company": "Example",
            "position": "Developer",
            "interviewAt": "2026-10-07T14:30",
            "followUpDate": "2026-10-09",
            "coverLetter": "My editable letter",
        },
    ).json()
    changed = client.put(f"/api/jobs/{job['id']}", json={"status": "interview"}).json()
    assert changed["interviewAt"] == job["interviewAt"]
    assert changed["coverLetter"] == job["coverLetter"]
    cleared = client.put(f"/api/jobs/{job['id']}", json={"interviewAt": ""}).json()
    assert cleared["interviewAt"] == "" and cleared["followUpDate"] == "2026-10-09"
    assert (
        client.put(f"/api/jobs/{job['id']}", json={"followUpDate": "not-a-date"}).status_code == 422
    )
    backup = client.get("/api/workspace/backup").json()
    assert client.post("/api/workspace/restore", json=backup).status_code == 200
    restored = next(row for row in client.get("/api/jobs").json() if row["id"] != job["id"])
    assert restored["followUpDate"] == cleared["followUpDate"]
    assert restored["coverLetter"] == "My editable letter"


def test_local_cover_letter_quotes_only_visible_cv_evidence(client):
    doc = client.post(
        "/api/resumes",
        json={
            "initialData": {
                "profile": {"firstName": "Ada"},
                "experience": [
                    {
                        "company": "Example",
                        "position": "Developer",
                        "bullets": ["Delivered a Python API"],
                    }
                ],
                "projects": [{"name": "Hidden", "bullets": ["Hidden project claim"]}],
                "visibility": {"showProjects": False},
            }
        },
    ).json()
    job = client.post(
        "/api/jobs",
        json={
            "company": "Target company",
            "position": "Engineer",
            "requirements": ["Python"],
            "description": "Must have Rust experience",
        },
    ).json()
    letter = client.post(
        f"/api/jobs/{job['id']}/cover-letter",
        json={"resumeId": doc["metadata"]["id"], "language": "tr"},
    ).json()
    assert letter["source"] == "local"
    assert "Delivered a Python API" in letter["text"]
    assert "Hidden project claim" not in letter["text"] and "Rust" not in letter["text"]
    assert "Target company" in letter["text"]


def test_ai_cover_letter_minimizes_contact_data_and_validates_result(client, monkeypatch):
    captured = {}

    def completion(system, payload):
        captured.update(payload)
        return {"text": "An editable evidence-based draft"}

    monkeypatch.setattr("app.services.cover_letter_service.completion", completion)
    doc = client.post(
        "/api/resumes", json={"initialData": {"profile": {"email": "private@example.com"}}}
    ).json()
    job = client.post("/api/jobs", json={"company": "Example", "position": "Engineer"}).json()
    body = {"resumeId": doc["metadata"]["id"], "useAI": True}
    response = client.post(f"/api/jobs/{job['id']}/cover-letter", json=body)
    assert response.status_code == 200 and response.json()["source"] == "ai"
    assert "private@example.com" not in str(captured)
    monkeypatch.setattr("app.services.cover_letter_service.completion", lambda *args: {"text": ""})
    assert client.post(f"/api/jobs/{job['id']}/cover-letter", json=body).status_code == 502


def test_local_cover_letter_reports_excessive_source_length(client):
    doc = client.post(
        "/api/resumes",
        json={"initialData": {"experience": [{"bullets": ["x" * 20000]}]}},
    ).json()
    job = client.post("/api/jobs", json={"company": "Example", "position": "Developer"}).json()
    response = client.post(
        f"/api/jobs/{job['id']}/cover-letter",
        json={"resumeId": doc["metadata"]["id"]},
    )
    assert response.status_code == 422
    assert "LETTER_TOO_LONG" in response.text
