import socket

import httpx
import pytest
from pydantic import SecretStr

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.llm_transport import ModelTransport
from app.db.models import ResumeModel
from app.services import pdf_import_service as pdf


def test_host_origin_token_and_validation_contract(client, monkeypatch):
    assert client.get("/api/health", headers={"Host": "untrusted.example"}).status_code == 400
    assert (
        client.post(
            "/api/resumes",
            json={"title": "Blocked"},
            headers={"Origin": "https://untrusted.example"},
        ).status_code
        == 403
    )
    invalid = client.post("/api/resumes", json={"title": None})
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "VALIDATION_ERROR"
    monkeypatch.setattr(settings, "api_token", SecretStr("fixture-token"))
    assert client.get("/api/resumes").status_code == 401
    assert client.get("/api/health").status_code == 200
    assert (
        client.get("/api/resumes", headers={"Authorization": "Bearer fixture-token"}).status_code
        == 200
    )


def test_model_dns_validation_and_ip_pinning(monkeypatch):
    monkeypatch.setattr(settings, "llm_allowed_hosts", ["trusted.example"])

    def dns(ip):
        monkeypatch.setattr(
            socket,
            "getaddrinfo",
            lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443))],
        )

    transport = ModelTransport()
    seen = []
    transport.inner.close()
    transport.inner = httpx.MockTransport(
        lambda request: seen.append(request) or httpx.Response(200)
    )
    dns("8.8.8.8")
    transport.handle_request(httpx.Request("POST", "https://trusted.example/v1/chat/completions"))
    assert seen[0].url.host == "8.8.8.8"
    assert seen[0].headers["Host"] == "trusted.example"
    assert seen[0].extensions["sni_hostname"] == "trusted.example"
    for ip in ["127.0.0.1", "10.0.0.1", "169.254.169.254"]:
        dns(ip)
        with pytest.raises(AppException, match="not permitted"):
            transport.handle_request(httpx.Request("POST", "https://trusted.example/v1"))
    dns("169.254.169.254")
    with pytest.raises(AppException):
        transport.handle_request(httpx.Request("POST", "http://ollama/v1"))
    transport.close()


def test_corrupt_cv_is_reported_and_backup_does_not_silently_omit_it(client, db_session):
    cv = client.post("/api/resumes", json={"title": "Corrupt fixture"}).json()
    row = db_session.get(ResumeModel, cv["metadata"]["id"])
    row.document_json = "not-json"
    db_session.commit()
    assert client.get(f"/api/resumes/{row.id}").json()["error"]["code"] == "DOCUMENT_CORRUPT"
    assert client.get("/api/workspace/metrics").json()["corruptResumeIds"] == [row.id]
    assert client.get("/api/workspace/backup").json()["error"]["code"] == "BACKUP_CORRUPT_RECORD"


def test_pdf_import_capacity_is_bounded():
    acquired = []
    try:
        while pdf._slots.acquire(blocking=False):
            acquired.append(True)
        with pytest.raises(AppException) as result:
            pdf.review_pdf(b"%PDF-invalid", "fixture.pdf")
        assert result.value.code == "PDF_IMPORT_BUSY"
    finally:
        for _ in acquired:
            pdf._slots.release()


def test_corrupt_revision_returns_a_data_conflict(client, db_session):
    from app.db.models import ResumeRevisionModel

    cv = client.post("/api/resumes", json={"title": "History fixture"}).json()
    client.put(f"/api/resumes/{cv['metadata']['id']}", json={"revision": 1, "document": cv})
    row = db_session.get(ResumeRevisionModel, (cv["metadata"]["id"], 1))
    row.document_json = "invalid"
    db_session.commit()
    response = client.get(f"/api/resumes/{row.resume_id}/history")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DOCUMENT_CORRUPT"
    assert client.get("/api/workspace/backup").status_code == 409


def test_linked_cv_must_exist(client):
    response = client.post(
        "/api/jobs",
        json={"company": "Fixture", "position": "Engineer", "linkedResumeId": "missing"},
    )
    assert response.status_code == 422


def test_non_web_url_schemes_are_not_links():
    from app.exporters.html_pdf_exporter import _normalize_url

    assert _normalize_url("javascript:alert(1)") == ""
    assert _normalize_url("data:text/html,test") == ""
    assert _normalize_url("github.com/example") == "https://github.com/example"
    from app.exporters.html_pdf_exporter import HtmlPdfExporter
    from app.schemas.resume import ResumeDocument

    doc = ResumeDocument()
    doc.profile.website = "javascript:alert(1)"
    assert 'href=""' not in HtmlPdfExporter.render_html(doc)


def test_backup_is_bounded_before_loading_documents(client, monkeypatch):
    client.post("/api/resumes", json={"title": "Backup size fixture"})
    monkeypatch.setattr(settings, "max_upload_size_bytes", 1500)
    response = client.get("/api/workspace/backup")
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "BACKUP_TOO_LARGE"
