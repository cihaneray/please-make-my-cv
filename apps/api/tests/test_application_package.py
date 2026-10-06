import io
import zipfile

from pypdf import PdfReader


def create_resume(client):
    response = client.post("/api/resumes", json={"title": "Application CV"})
    assert response.status_code == 201
    document = response.json()
    document["profile"].update(firstName="Alex", lastName="Morgan", email="alex@example.com")
    saved = client.put(
        f"/api/resumes/{document['metadata']['id']}",
        json={"document": document, "revision": document["metadata"]["revision"]},
    )
    assert saved.status_code == 200
    return saved.json()


def test_package_contains_actual_pdf_and_utf8_letter_without_mutation(client):
    document = create_resume(client)
    letter = "Sayın ekip,\nTürkçe ön yazı — gerçek kayıtlı metin."
    job = client.post(
        "/api/jobs",
        json={
            "company": "Örnek / ../ Teknoloji",
            "position": "Backend Engineer",
            "linkedResumeId": document["metadata"]["id"],
            "coverLetter": letter,
        },
    ).json()
    response = client.post(f"/api/jobs/{job['id']}/package")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "filename*=UTF-8''" in response.headers["content-disposition"]
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        assert archive.namelist() == ["cv.pdf", "cover-letter.txt"]
        assert archive.read("cover-letter.txt").decode("utf-8") == letter
        pdf = PdfReader(io.BytesIO(archive.read("cv.pdf")))
        assert "ALEX" in "".join(page.extract_text() for page in pdf.pages).upper()
    assert client.get(f"/api/jobs/{job['id']}").json() == job
    assert client.get(f"/api/resumes/{document['metadata']['id']}").json() == document
    assert client.get(f"/api/jobs/{job['id']}/snapshots").json() == []


def test_package_requires_saved_cv_and_letter(client):
    job = client.post("/api/jobs", json={"company": "Example", "position": "Developer"}).json()
    assert client.post(f"/api/jobs/{job['id']}/package").status_code == 400
    document = create_resume(client)
    client.put(f"/api/jobs/{job['id']}", json={"linkedResumeId": document["metadata"]["id"]})
    assert client.post(f"/api/jobs/{job['id']}/package").status_code == 400
    assert client.post("/api/jobs/nonexistent/package").status_code == 404


def test_package_pdf_failure_does_not_return_a_partial_zip(client, monkeypatch):
    from fastapi import HTTPException

    document = create_resume(client)
    job = client.post(
        "/api/jobs",
        json={
            "company": "Example",
            "position": "Developer",
            "linkedResumeId": document["metadata"]["id"],
            "coverLetter": "Saved letter",
        },
    ).json()

    def fail(*args, **kwargs):
        raise HTTPException(status_code=503, detail="PDF rendering unavailable")

    monkeypatch.setattr("app.exporters.pdf_exporter.render_pdf", fail)
    response = client.post(f"/api/jobs/{job['id']}/package")
    assert response.status_code == 503
    assert response.headers["content-type"] == "application/json"
