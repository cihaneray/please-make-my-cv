import io
from datetime import datetime

from pypdf import PdfWriter

from app.analyzers.analyzer_service import AnalysisService
from app.db.models import ApplicationSnapshotModel, JobModel, ResumeRevisionModel
from app.schemas.resume import ResumeDocument


def create(client, **data):
    response = client.post("/api/resumes", json=data)
    assert response.status_code == 201
    return response.json()


def test_metrics_use_real_active_resume_scores(client):
    assert client.get("/api/workspace/metrics").json()["atsAverage"] is None
    a = create(client)
    b = create(
        client,
        initialData={
            "profile": {"firstName": "Ada", "email": "ada@example.com"},
            "summary": "Python developer",
        },
    )
    expected = round(
        sum(
            AnalysisService.analyze(ResumeDocument.model_validate(d)).atsCompatibilityScore
            for d in [a, b]
        )
        / 2,
        1,
    )
    assert client.get("/api/workspace/metrics").json()["atsAverage"] == expected
    client.delete(f"/api/resumes/{a['metadata']['id']}")
    metrics = client.get("/api/workspace/metrics").json()
    assert metrics["resumeCount"] == 1
    assert (
        metrics["atsAverage"]
        == AnalysisService.analyze(ResumeDocument.model_validate(b)).atsCompatibilityScore
    )


def test_backup_preserves_dates_and_timeline(client, db_session):
    doc = create(client)
    rid = doc["metadata"]["id"]
    job = client.post(
        "/api/jobs", json={"company": "Example", "position": "Developer", "linkedResumeId": rid}
    ).json()
    jid = job["id"]
    client.put(f"/api/jobs/{jid}", json={"status": "applied"})
    historical = datetime(2020, 1, 2, 12)
    db_session.get(JobModel, jid).created_at = historical
    db_session.query(ApplicationSnapshotModel).filter_by(job_id=jid).first().created_at = historical
    doc["summary"] = "Updated"
    client.put(f"/api/resumes/{rid}", json={"revision": 1, "document": doc})
    db_session.query(ResumeRevisionModel).filter_by(resume_id=rid).first().created_at = historical
    db_session.commit()
    backup = client.get("/api/workspace/backup").json()
    assert backup["version"] == 2
    assert client.post("/api/workspace/restore", json=backup).status_code == 200
    restored = next(j for j in client.get("/api/jobs").json() if j["id"] != jid)
    assert restored["createdAt"] == historical.isoformat()
    assert [event["status"] for event in restored["timeline"]] == ["saved", "applied"]
    shots = client.get(f"/api/jobs/{restored['id']}/snapshots").json()
    assert shots[0]["createdAt"] == historical.isoformat()
    history = client.get(f"/api/resumes/{restored['linkedResumeId']}/history").json()
    assert history[0]["createdAt"] == historical.isoformat()


def test_v1_backup_still_restores(client):
    doc = create(client)
    old = {
        "version": 1,
        "resumes": [doc],
        "history": [{"resumeId": doc["metadata"]["id"], "revision": 1, "document": doc}],
    }
    assert client.post("/api/workspace/restore", json=old).status_code == 200


def test_delete_detaches_live_links_and_preserves_submitted_copy(client):
    doc = create(client)
    rid = doc["metadata"]["id"]
    child = client.post(f"/api/resumes/{rid}/duplicate").json()
    job = client.post(
        "/api/jobs",
        json={
            "company": "Example",
            "position": "Developer",
            "linkedResumeId": rid,
            "status": "applied",
        },
    ).json()
    assert client.delete(f"/api/resumes/{rid}?permanent=true").status_code == 204
    assert client.get(f"/api/jobs/{job['id']}").json()["linkedResumeId"] is None
    assert (
        client.get(f"/api/resumes/{child['metadata']['id']}").json()["metadata"]["parentResumeId"]
        is None
    )
    assert len(client.get(f"/api/jobs/{job['id']}/snapshots").json()) == 1


def test_timeline_records_transitions_not_note_edits(client):
    job = client.post("/api/jobs", json={"company": "Example", "position": "Developer"}).json()
    jid = job["id"]
    client.put(f"/api/jobs/{jid}", json={"status": "interview"})
    client.put(f"/api/jobs/{jid}", json={"notes": "Meeting tomorrow", "status": "interview"})
    assert [e["status"] for e in client.get(f"/api/jobs/{jid}").json()["timeline"]] == [
        "saved",
        "interview",
    ]


def test_evidence_links_to_actual_entry_and_respects_visibility(client):
    doc = create(
        client,
        initialData={
            "experience": [
                {
                    "id": "role-1",
                    "position": "Developer",
                    "company": "Example",
                    "bullets": ["Built k8s deployments"],
                }
            ],
            "skills": [{"id": "skills-1", "category": "Backend", "skills": ["Python"]}],
        },
    )
    rid = doc["metadata"]["id"]
    job = client.post(
        "/api/jobs",
        json={
            "company": "Example",
            "position": "Developer",
            "requirements": ["Kubernetes", "Python", "Rust"],
        },
    ).json()
    match = client.post(f"/api/jobs/{job['id']}/match/{rid}").json()
    assert match["matchScore"] == 66.7
    assert {
        "requirement": "kubernetes",
        "section": "experience",
        "entryId": "role-1",
        "text": "Built k8s deployments",
    } in match["evidence"]
    doc["visibility"]["showExperience"] = False
    client.put(f"/api/resumes/{rid}", json={"revision": 1, "document": doc})
    match = client.post(f"/api/jobs/{job['id']}/match/{rid}").json()
    assert match["matchScore"] == 33.3
    assert all(e["section"] != "experience" for e in match["evidence"])


def test_comparison_is_field_specific_and_does_not_write(client):
    source = create(
        client,
        initialData={"experience": [{"id": "role", "company": "Old", "position": "Developer"}]},
    )
    target = ResumeDocument.model_validate(source).model_dump()
    target["experience"][0]["company"] = "New"
    target["profile"]["firstName"] = "Ada"
    response = client.post("/api/resumes/compare-drafts", json={"source": source, "target": target})
    assert response.status_code == 200
    changes = response.json()["changes"]
    assert len(changes) == 2
    assert any(
        c["details"] == {"field": "company", "entryId": "role", "from": "Old", "to": "New"}
        for c in changes
    )
    assert client.get(f"/api/resumes/{source['metadata']['id']}").json() == source


def test_pdf_checks_use_actual_pages(client, monkeypatch):
    import app.services.pdf_check_service as service

    writer = PdfWriter()
    for _ in range(3):
        writer.add_blank_page(width=595, height=842)
    stream = io.BytesIO()
    writer.write(stream)
    monkeypatch.setattr(service, "render_pdf", lambda doc, checks: stream.getvalue())
    doc = create(client)
    result = client.post(f"/api/resumes/{doc['metadata']['id']}/pdf-check", json=doc).json()
    assert result["pageCount"] == 3
    assert {"empty-page", "sparse-last-page", "long-document"} <= {
        i["code"] for i in result["issues"]
    }


def test_turkish_education_and_role_requirements(client):
    from app.exporters.html_pdf_exporter import HtmlPdfExporter

    doc = ResumeDocument(
        metadata={"language": "tr", "targetRole": "Backend Software Engineer"},
        education=[
            {
                "id": "edu",
                "institution": "Example",
                "degree": "Lisans",
                "fieldOfStudy": "Bilgisayar",
            }
        ],
    )
    assert "Lisans - Bilgisayar" in HtmlPdfExporter.render_html(doc)
    assert not any(i.ruleId.startswith("job") for i in AnalysisService.analyze(doc).issues)
