import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.secrets import decrypt_backup, encrypt_backup
from app.schemas.job import JobApplication
from app.schemas.resume import EducationItem, ExperienceItem, ProjectItem, ResumeDocument
from app.services.llm_service import (
    ConnectionUpdate,
    load_connection,
    save_connection,
    secret_key_path,
)
from app.services.tailoring_service import reverse_chronological, tailored_document, tailoring_plan


def example():
    doc = ResumeDocument()
    doc.experience = [
        ExperienceItem(
            company="Example",
            position="Developer",
            bullets=[
                "Documented workflows.",
                "Built Python APIs.",
                "Used Docker for Python services.",
            ],
        )
    ]
    job = JobApplication(
        company="Example", position="Backend", requirements=["Python", "Docker", "Kubernetes"]
    )
    return doc, job


def test_tailoring_preserves_evidence_and_original():
    doc, job = example()
    before = doc.model_dump_json()
    plan = tailoring_plan(doc, job)
    assert plan.missingRequirements == ["kubernetes"]
    result = tailored_document(doc, job, [item.id for item in plan.candidates])
    assert result.experience[0].bullets == [
        "Built Python APIs.",
        "Used Docker for Python services.",
        "Documented workflows.",
    ]
    assert doc.model_dump_json() == before
    doc.visibility.showExperience = False
    assert tailoring_plan(doc, job).candidates == []
    with pytest.raises(AppException):
        tailored_document(doc, job, ["forged-id"])


def test_tailoring_uses_dates_not_selection_or_match_score():
    doc, job = example()
    older = doc.experience[0]
    older.id, older.startDate, older.endDate = "older", "2018", "2020"
    current = ExperienceItem(
        id="current",
        startDate="2022-03",
        current=True,
        bullets=[
            "Original introduction.",
            "Built Python APIs.",
            "Used Docker for Python services.",
        ],
    )
    recent = ExperienceItem(
        id="recent", startDate="2024-01", endDate="2025-06", bullets=["Python."]
    )
    doc.experience = [older, recent, current]
    doc.projects = [
        ProjectItem(id="old-project", startDate="2019", endDate="2020", bullets=["Python Docker."]),
        ProjectItem(id="new-project", startDate="2025-03", endDate="Present", bullets=["Python."]),
    ]
    doc.education = [
        EducationItem(id="old-school", startDate="2012", endDate="2016"),
        EducationItem(id="new-school", startDate="2025", current=True),
    ]
    before = doc.model_dump_json()
    plan = tailoring_plan(doc, job)
    # Deliberately pass selections in reverse score/source order, and only part of the evidence.
    selected = [
        candidate.id for candidate in reversed(plan.candidates) if candidate.entryId != "recent"
    ]
    result = tailored_document(doc, job, selected)
    assert [item.id for item in result.experience] == ["current", "recent", "older"]
    assert [item.id for item in result.projects] == ["new-project", "old-project"]
    assert [item.id for item in result.education] == ["new-school", "old-school"]
    assert result.experience[0].bullets == [
        "Built Python APIs.",
        "Used Docker for Python services.",
        "Original introduction.",
    ]
    assert result.experience[1].bullets == recent.bullets
    for section in ("experience", "projects", "education"):
        source = {item.id: item.model_dump() for item in getattr(doc, section)}
        for item in getattr(result, section):
            values = item.model_dump()
            original = source[item.id]
            if "bullets" in values:
                assert sorted(values.pop("bullets")) == sorted(original.pop("bullets"))
            assert values == original
    assert doc.model_dump_json() == before


def test_chronology_preserves_unknown_date_slots_and_equal_dates():
    entries = [
        ExperienceItem(id="old", endDate="2020"),
        ExperienceItem(id="unknown", startDate="Spring 2024", endDate="last summer"),
        ExperienceItem(id="new-a", startDate="2021", endDate="2025-02"),
        ExperienceItem(id="new-b", startDate="2021", endDate="2025-02"),
        ExperienceItem(id="undated"),
        ExperienceItem(id="ongoing", startDate="2019", endDate="Devam ediyor"),
    ]
    assert [item.id for item in reverse_chronological(entries)] == [
        "ongoing",
        "unknown",
        "new-a",
        "new-b",
        "undated",
        "old",
    ]
    assert entries[1].startDate == "Spring 2024"
    assert entries[4].endDate == ""


def test_tailoring_api_copy_and_stale_plan(client):
    doc, job = example()
    original = client.post(
        "/api/resumes", json={"title": "Base", "initialData": doc.model_dump(mode="json")}
    ).json()
    saved_job = client.post(
        "/api/jobs",
        json={"company": job.company, "position": job.position, "requirements": job.requirements},
    ).json()
    url = f"/api/jobs/{saved_job['id']}/tailoring/{original['metadata']['id']}"
    plan = client.post(url).json()
    request = {
        "revision": plan["revision"],
        "jobUpdatedAt": plan["jobUpdatedAt"],
        "selected": [item["id"] for item in plan["candidates"]],
    }
    result = client.post(url + "/apply", json=request)
    assert result.status_code == 200
    assert result.json()["metadata"]["id"] != original["metadata"]["id"]
    assert result.json()["metadata"]["parentResumeId"] == original["metadata"]["id"]
    assert client.get(f"/api/resumes/{original['metadata']['id']}").json() == original
    request["revision"] += 1
    assert client.post(url + "/apply", json=request).status_code == 409
    request["revision"] -= 1
    client.put(f"/api/jobs/{saved_job['id']}", json={"description": "Changed"})
    assert client.post(url + "/apply", json=request).status_code == 409


def test_ai_key_encrypted_and_legacy_migrated():
    save_connection(ConnectionUpdate(model="test", apiKey="private-key"))
    path = Path(settings.ai_config_path)
    assert "private-key" not in path.read_text()
    assert "apiKey" not in json.loads(path.read_text())
    assert load_connection().apiKey.get_secret_value() == "private-key"
    path.write_text(json.dumps({"apiKey": "legacy-key", "model": "test"}))
    assert load_connection().apiKey.get_secret_value() == "legacy-key"
    assert "legacy-key" not in path.read_text()
    secret_key_path().unlink()
    with pytest.raises(AppException):
        load_connection()
    assert not secret_key_path().exists()


def test_encrypted_backup_integrity_and_api(client):
    password = "a-long-test-password"
    envelope = encrypt_backup(b'{"private":"CV content"}', password)
    assert "CV content" not in json.dumps(envelope)
    assert decrypt_backup(envelope, password) == b'{"private":"CV content"}'
    with pytest.raises(AppException):
        decrypt_backup(envelope, "wrong-password")
    envelope["ciphertext"] = "corrupt"
    with pytest.raises(AppException):
        decrypt_backup(envelope, password)
    saved = client.post("/api/resumes", json={"title": "Private CV"}).json()
    response = client.post("/api/workspace/backup/encrypted", json={"password": password})
    assert response.status_code == 200 and "Private CV" not in response.text
    envelope = response.json()
    assert (
        client.post(
            "/api/workspace/restore/encrypted",
            json={"password": "wrong-password", "envelope": envelope},
        ).status_code
        == 422
    )
    result = client.post(
        "/api/workspace/restore/encrypted", json={"password": password, "envelope": envelope}
    )
    assert result.status_code == 200 and result.json()["resumes"] == 1
    assert client.get(f"/api/resumes/{saved['metadata']['id']}").status_code == 200
    assert (
        client.post("/api/workspace/backup/encrypted", json={"password": "short"}).status_code
        == 422
    )
