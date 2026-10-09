import json
from unittest.mock import MagicMock

import httpx
import pytest
from playwright.sync_api import Error as PlaywrightError

from app.core.config import settings
from app.core.exceptions import AppException
from app.exporters.pdf_exporter import launch_browser
from app.schemas.resume import ResumeDocument
from app.services import llm_service as llm


def configure(**kwargs):
    return llm.save_connection(llm.ConnectionUpdate(enabled=True, model="test-model", **kwargs))


def feedback():
    return {
        "summary": "Clear but needs evidence.",
        "clarity": {"score": 20, "rationale": "Clear writing"},
        "evidence": {"score": 10, "rationale": "Missing outcomes"},
        "completeness": {"score": 15, "rationale": "Missing dates"},
        "relevance": {"score": 25, "rationale": "Job fit"},
        "strengths": ["Readable"],
        "recommendations": [
            {
                "section": "experience",
                "priority": "high",
                "evidence": "No outcomes",
                "advice": "Add a verified outcome",
                "suggestedText": "",
            }
        ],
        "questions": ["What changed?"],
    }


def test_settings_never_return_key_and_drop_on_endpoint_change(client, monkeypatch):
    monkeypatch.setattr(settings, "llm_allowed_hosts", ["other.example"])
    value = {"enabled": True, "model": "test", "apiKey": "secret-test-key"}
    response = client.put("/api/ai/settings", json=value)
    assert response.status_code == 200
    assert response.json()["hasApiKey"] is True
    assert "secret-test-key" not in response.text
    assert "secret-test-key" not in client.get("/api/ai/settings").text
    client.put("/api/ai/settings", json={"enabled": True, "model": "new-model"})
    assert llm.load_connection().apiKey.get_secret_value() == "secret-test-key"
    client.put(
        "/api/ai/settings",
        json={"enabled": True, "model": "test", "baseUrl": "https://other.example/v1"},
    )
    assert llm.load_connection().apiKey is None


def test_settings_clear_disable_and_invalid_url(client):
    configure(apiKey="secret")
    assert client.put("/api/ai/settings", json={"clearApiKey": True}).status_code == 200
    assert llm.load_connection().apiKey is None
    assert client.post("/api/ai/test").status_code == 409
    assert (
        client.put(
            "/api/ai/settings", json={"baseUrl": "https://user:password@example.com"}
        ).status_code
        == 422
    )
    assert (
        client.put("/api/ai/settings", json={"baseUrl": "http://remote.example"}).status_code == 422
    )
    assert client.put("/api/ai/settings", json={"enabled": True, "model": ""}).status_code == 422


@pytest.mark.parametrize(
    "provider,base",
    [("openai-compatible", "https://api.example/v1"), ("ollama", "http://localhost:11434")],
)
def test_wire_protocol_redaction_and_score(monkeypatch, provider, base):
    monkeypatch.setattr(settings, "llm_allowed_hosts", ["api.example"])
    configure(provider=provider, baseUrl=base, apiKey="private")
    captured = {}
    original = httpx.Client

    def handle(request):
        captured["body"] = json.loads(request.content)
        assert str(request.url).endswith("/v1/chat/completions")
        assert request.headers["Authorization"] == "Bearer private"
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"finish_reason": "stop", "message": {"content": json.dumps(feedback())}}
                ]
            },
        )

    monkeypatch.setattr(
        llm.httpx,
        "Client",
        lambda **kwargs: original(**{**kwargs, "transport": httpx.MockTransport(handle)}),
    )
    doc = ResumeDocument()
    doc.profile.firstName = "PrivateName"
    doc.profile.email = "private@example.com"
    doc.summary = "Contact secret@example.com for details"
    result = llm.review_resume(doc, "", "en")
    assert result["score"] == 60
    assert result["relevance"] is None
    payload = captured["body"]["messages"][1]["content"]
    assert "PrivateName" not in payload and "secret@example.com" not in payload
    assert "private@example.com" not in payload
    assert llm.review_resume(doc, "Engineer", "en")["score"] == 70


@pytest.mark.parametrize("status", [401, 429, 500])
def test_upstream_errors_do_not_leak_body(monkeypatch, status):
    configure()
    original = httpx.Client
    monkeypatch.setattr(
        llm.httpx,
        "Client",
        lambda **kwargs: original(
            transport=httpx.MockTransport(
                lambda request: httpx.Response(status, text="secret-provider-body")
            ),
            **kwargs,
        ),
    )
    with pytest.raises(AppException) as error:
        llm.completion("JSON", {})
    assert error.value.status_code == 502
    assert "secret-provider-body" not in error.value.message


def test_invalid_review_is_rejected(monkeypatch):
    configure()
    monkeypatch.setattr(
        llm,
        "completion",
        lambda *args: {**feedback(), "clarity": {"score": 999, "rationale": "bad"}},
    )
    with pytest.raises(AppException) as error:
        llm.review_resume(ResumeDocument(), "", "en")
    assert error.value.code == "AI_INVALID_RESPONSE"


def test_browser_falls_back_to_installed_edge(monkeypatch):
    monkeypatch.setattr(settings, "pdf_browser_channel", None)
    monkeypatch.setattr(settings, "pdf_browser_executable", None)
    playwright = MagicMock()
    browser = object()
    playwright.chromium.launch.side_effect = [PlaywrightError("missing"), browser]
    assert launch_browser(playwright) is browser
    assert playwright.chromium.launch.call_args.kwargs["channel"] == "msedge"


def test_browser_failure_is_actionable(monkeypatch):
    monkeypatch.setattr(settings, "pdf_browser_channel", "chrome")
    monkeypatch.setattr(settings, "pdf_browser_executable", None)
    playwright = MagicMock()
    playwright.chromium.launch.side_effect = PlaywrightError("missing")
    with pytest.raises(AppException) as error:
        launch_browser(playwright)
    assert "playwright install chromium" in error.value.message
    assert playwright.chromium.launch.call_count == 1


@pytest.mark.parametrize("kind", ["timeout", "invalid-json", "truncated"])
def test_timeout_and_malformed_responses(monkeypatch, kind):
    configure()
    original = httpx.Client

    def handle(request):
        if kind == "timeout":
            raise httpx.ReadTimeout("private network details", request=request)
        content = "not json" if kind == "invalid-json" else "{}"
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "finish_reason": "length" if kind == "truncated" else "stop",
                        "message": {"content": content},
                    }
                ]
            },
        )

    monkeypatch.setattr(
        llm.httpx,
        "Client",
        lambda **kwargs: original(**{**kwargs, "transport": httpx.MockTransport(handle)}),
    )
    with pytest.raises(AppException) as error:
        llm.completion("JSON", {})
    assert error.value.status_code == (504 if kind == "timeout" else 502)
    assert "private network details" not in error.value.message
