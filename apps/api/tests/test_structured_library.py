from app.exporters.html_pdf_exporter import HtmlPdfExporter
from app.schemas.job import JobApplication
from app.schemas.library import LibrarySnippet
from app.schemas.resume import CertificationItem, ProjectItem, ResumeDocument
from app.services.tailoring_service import tailored_document, tailoring_plan


def test_structured_library_roundtrip_backup_and_update(client):
    project = {
        "type": "project",
        "title": "API project",
        "content": "Built Python API",
        "project": {
            "name": "API project",
            "url": "https://example.com/full/path",
            "urlLabel": "Demo",
            "startDate": "2024",
            "bullets": ["Built Python API"],
            "technologies": ["Python"],
        },
    }
    certificate = {
        "type": "certification",
        "title": "AWS certificate",
        "content": "AWS certificate",
        "certification": {
            "name": "AWS certificate",
            "issuer": "AWS",
            "issueDate": "2025-04",
            "credentialUrl": "https://example.com/verify",
        },
    }
    saved = [client.post("/api/library", json=data) for data in [project, certificate]]
    assert all(response.status_code == 201 for response in saved)
    first = saved[0].json()
    assert client.get("/api/library").json()[0]["type"] == "certification"
    updated = client.put(
        f"/api/library/{first['id']}",
        json={"project": {**first["project"], "urlLabel": "View demo"}},
    )
    assert updated.json()["project"]["urlLabel"] == "View demo"
    backup = client.get("/api/workspace/backup").json()
    response = client.post("/api/workspace/restore", json=backup)
    assert response.status_code == 200
    items = client.get("/api/library").json()
    assert len(items) == 4
    assert (
        sum(
            item.get("project", {}).get("urlLabel") == "View demo"
            for item in items
            if item.get("project")
        )
        == 2
    )
    assert (
        sum(
            item.get("certification", {}).get("issuer") == "AWS"
            for item in items
            if item.get("certification")
        )
        == 2
    )


def test_job_selection_includes_library_projects_certifications_and_excludes_unselected():
    source = ResumeDocument(
        projects=[ProjectItem(id="other", name="Unrelated game")],
        certifications=[CertificationItem(name="Unrelated qualification")],
    )
    before = source.model_dump_json()
    snippets = [
        LibrarySnippet(
            type="project",
            title="Python service",
            content="Built Python service",
            project=ProjectItem(
                name="Python service",
                startDate="2025",
                url="https://example.com/path",
                urlLabel="Demo",
                bullets=["Built Python APIs"],
            ),
        ),
        LibrarySnippet(
            type="certification",
            title="AWS certification",
            content="AWS certification",
            certification=CertificationItem(
                name="AWS certification", issuer="AWS", issueDate="2024"
            ),
        ),
        LibrarySnippet(
            type="certification",
            title="Unrelated",
            content="Unrelated",
            certification=CertificationItem(name="Art"),
        ),
    ]
    job = JobApplication(
        company="Example", position="Backend Engineer", requirements=["Python", "AWS", "Docker"]
    )
    plan = tailoring_plan(source, job, snippets)
    assert {candidate.section for candidate in plan.candidates} == {"projects", "certifications"}
    assert plan.missingRequirements == ["docker"]
    result = tailored_document(
        source, job, [candidate.id for candidate in plan.candidates], snippets
    )
    assert [item.name for item in result.projects] == ["Python service"]
    assert [item.name for item in result.certifications] == ["AWS certification"]
    assert result.metadata.targetJob.company == "Example"
    assert result.metadata.targetRole == "Backend Engineer"
    assert source.model_dump_json() == before
    assert snippets[0].project.urlLabel == "Demo"


def test_link_label_changes_text_not_destination():
    document = ResumeDocument(
        projects=[
            ProjectItem(
                name="Game",
                url="https://store.steampowered.com/app/123/Long_Name",
                urlLabel="View on Steam",
            )
        ]
    )
    html = HtmlPdfExporter.render_html(document)
    assert 'href="https://store.steampowered.com/app/123/Long_Name"' in html
    assert ">View on Steam</a>" in html
    import io
    import zipfile

    from app.exporters.docx_exporter import render_docx

    with zipfile.ZipFile(io.BytesIO(render_docx(document))) as archive:
        assert "View on Steam" in archive.read("word/document.xml").decode()
        assert (
            "https://store.steampowered.com/app/123/Long_Name"
            in archive.read("word/_rels/document.xml.rels").decode()
        )


def test_wrong_structured_type_is_rejected(client):
    response = client.post(
        "/api/library",
        json={"content": "Example", "type": "bullet", "certification": {"name": "AWS"}},
    )
    assert response.status_code == 422
    assert client.get("/api/library").json() == []


def test_job_api_uses_library_evidence_and_rejects_changed_selection(client):
    saved = client.post(
        "/api/library",
        json={
            "type": "certification",
            "title": "AWS",
            "content": "AWS",
            "certification": {"name": "AWS", "issuer": "Amazon"},
        },
    ).json()
    resume = client.post("/api/resumes", json={"title": "Source"}).json()
    job = client.post(
        "/api/jobs",
        json={"company": "Example", "position": "Cloud Engineer", "requirements": ["AWS"]},
    ).json()
    url = f"/api/jobs/{job['id']}/tailoring/{resume['metadata']['id']}"
    plan = client.post(url).json()
    assert plan["candidates"][0]["librarySnippetId"] == saved["id"]
    selection = {
        "revision": plan["revision"],
        "jobUpdatedAt": plan["jobUpdatedAt"],
        "selected": [plan["candidates"][0]["id"]],
    }
    result = client.post(url + "/apply", json=selection)
    assert result.status_code == 200
    assert result.json()["certifications"][0]["issuer"] == "Amazon"
    assert result.json()["metadata"]["targetJob"]["company"] == "Example"
    client.put(
        f"/api/library/{saved['id']}", json={"certification": {"name": "AWS", "issuer": "Changed"}}
    )
    assert client.post(url + "/apply", json=selection).status_code == 422
    empty_job = client.post(
        "/api/jobs", json={"company": "Example", "position": "Unspecified"}
    ).json()
    assert (
        client.post(f"/api/jobs/{empty_job['id']}/tailoring/{resume['metadata']['id']}").status_code
        == 422
    )
