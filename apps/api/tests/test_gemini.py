import json

import httpx
import pytest
from test_llm import feedback

from app.core.exceptions import AppException
from app.services import llm_service as llm


def configure_gemini(**kwargs):
    return llm.save_connection(
        llm.ConnectionUpdate(
            provider="gemini",
            enabled=True,
            model="models/gemini-test",
            apiKey="gemini-secret",
            **kwargs,
        )
    )


def mock_transport(monkeypatch, handler):
    original = httpx.Client
    monkeypatch.setattr(
        llm.httpx,
        "Client",
        lambda **kwargs: original(**{**kwargs, "transport": httpx.MockTransport(handler)}),
    )


def test_native_gemini_review_and_connection_test(client, monkeypatch):
    public = configure_gemini()
    assert public["baseUrl"] == "https://generativelanguage.googleapis.com/v1beta"
    assert public["hasApiKey"] is True
    assert "gemini-secret" not in json.dumps(public)
    calls = []

    def handle(request):
        assert (
            str(request.url)
            == "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent"
        )
        assert request.headers["x-goog-api-key"] == "gemini-secret"
        assert "Authorization" not in request.headers
        assert not request.url.query
        body = json.loads(request.content)
        assert body["generationConfig"]["responseMimeType"] == "application/json"
        assert body["generationConfig"]["maxOutputTokens"] == 8192
        assert body["systemInstruction"]["parts"][0]["text"]
        content = json.loads(body["contents"][0]["parts"][0]["text"])
        assert body["contents"][0]["role"] == "user"
        calls.append(content)
        result = {"ok": True}
        if "resume" in content:
            assert "summary" in body["generationConfig"]["responseJsonSchema"]["required"]
            assert "private@example.com" not in json.dumps(content)
            assert "PrivateName" not in json.dumps(content)
            result = feedback()
            result["recommendations"][0].update(
                fieldId="field-0", suggestedText="Developed reliable services."
            )
        text = json.dumps(result)
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "finishReason": "STOP",
                        "content": {
                            "parts": [
                                {"thought": True, "text": "Internal thought not for the user"},
                                {"text": text[: len(text) // 2]},
                                {"text": text[len(text) // 2 :]},
                            ]
                        },
                    }
                ]
            },
        )

    mock_transport(monkeypatch, handle)
    assert client.post("/api/ai/test").json()["ok"] is True
    assert "resume" not in calls[0]
    doc = client.post("/api/resumes", json={}).json()
    doc["summary"] = "Built reliable services."
    doc["profile"].update(firstName="PrivateName", email="private@example.com")
    response = client.post(
        "/api/ai/review", json={"document": doc, "jobDescription": "Engineer", "language": "en"}
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["provider"] == "gemini"
    assert result["score"] == 70
    assert result["recommendations"][0]["edit"]["before"] == doc["summary"]
    assert "Internal thought" not in response.text
    assert "gemini-secret" not in response.text
    assert "gemini-secret" not in client.get("/api/ai/settings").text


def test_gemini_requires_a_key_and_a_valid_model(client):
    payload = {"provider": "gemini", "enabled": True, "model": "gemini-test"}
    assert client.put("/api/ai/settings", json=payload).json()["error"]["code"] == "AI_KEY_REQUIRED"
    for model in ("../other", "gemini-test?key=leak", "models/models/test"):
        response = client.put(
            "/api/ai/settings", json={**payload, "apiKey": "secret", "model": model}
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "AI_MODEL_INVALID"
    assert (
        client.put("/api/ai/settings", json={"provider": "gemini", "enabled": False}).status_code
        == 200
    )


@pytest.mark.parametrize(
    "response,code",
    [
        ({"promptFeedback": {"blockReason": "SAFETY"}}, "AI_RESPONSE_BLOCKED"),
        ({"candidates": [{"finishReason": "SAFETY"}]}, "AI_RESPONSE_BLOCKED"),
        ({"candidates": [{"finishReason": "RECITATION"}]}, "AI_RESPONSE_BLOCKED"),
        (
            {
                "candidates": [
                    {"finishReason": "MAX_TOKENS", "content": {"parts": [{"text": "{}"}]}}
                ]
            },
            "AI_INVALID_RESPONSE",
        ),
        ({"candidates": []}, "AI_INVALID_RESPONSE"),
        (
            {"candidates": [{"finishReason": "STOP", "content": {"parts": []}}]},
            "AI_INVALID_RESPONSE",
        ),
        (
            {
                "candidates": [
                    {"finishReason": "STOP", "content": {"parts": [{"text": "not json"}]}}
                ]
            },
            "AI_INVALID_RESPONSE",
        ),
        (
            {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "[]"}]}}]},
            "AI_INVALID_RESPONSE",
        ),
    ],
)
def test_gemini_rejects_blocked_incomplete_and_malformed_output(monkeypatch, response, code):
    configure_gemini()
    mock_transport(monkeypatch, lambda request: httpx.Response(200, json=response))
    with pytest.raises(AppException) as error:
        llm.completion("Return JSON", {})
    assert error.value.code == code
    assert error.value.status_code == 502


@pytest.mark.parametrize("status", [400, 403, 429])
def test_gemini_errors_do_not_leak_response_body(monkeypatch, status):
    configure_gemini()
    mock_transport(
        monkeypatch,
        lambda request: httpx.Response(status, text="gemini-secret private-provider-details"),
    )
    with pytest.raises(AppException) as error:
        llm.completion("Return JSON", {})
    assert error.value.status_code == 502
    assert "gemini-secret" not in error.value.message
    assert "private-provider-details" not in error.value.message


def test_switching_to_gemini_never_reuses_other_provider_key(client):
    client.put(
        "/api/ai/settings",
        json={"enabled": True, "model": "test", "apiKey": "other-provider-secret"},
    )
    response = client.put(
        "/api/ai/settings", json={"provider": "gemini", "model": "gemini-test", "enabled": True}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "AI_KEY_REQUIRED"
    # Failed validation must not replace the previous connection.
    assert llm.load_connection().provider == "openai-compatible"


def test_gemini_retries_temporary_unavailability_then_succeeds(monkeypatch):
    configure_gemini()
    calls = []
    delays = []

    def handle(request):
        calls.append(request)
        if len(calls) < 3:
            return httpx.Response(503, text="private-provider-details")
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {"finishReason": "STOP", "content": {"parts": [{"text": '{"ok": true}'}]}}
                ]
            },
        )

    mock_transport(monkeypatch, handle)
    monkeypatch.setattr(llm.time, "sleep", delays.append)
    assert llm.completion("Return JSON", {}) == {"ok": True}
    assert len(calls) == 3
    assert delays == [1, 2]


def test_gemini_retry_limit_and_timeout_are_safe(monkeypatch):
    configure_gemini()
    calls = []
    timeout = False
    monkeypatch.setattr(llm.time, "sleep", lambda delay: None)

    def unavailable(request):
        calls.append(request)
        if timeout:
            raise httpx.ReadTimeout("private network details", request=request)
        return httpx.Response(503, text="gemini-secret private-provider-details")

    mock_transport(monkeypatch, unavailable)
    with pytest.raises(AppException) as error:
        llm.completion("Return JSON", {})
    assert len(calls) == 3
    assert "temporarily unavailable" in error.value.message
    assert "gemini-secret" not in error.value.message
    calls.clear()
    timeout = True
    with pytest.raises(AppException) as error:
        llm.completion("Return JSON", {})
    assert error.value.code == "AI_TIMEOUT"
    assert len(calls) == 1


def test_gemini_cover_letter_uses_text_schema(client, monkeypatch):
    configure_gemini()

    def handle(request):
        body = json.loads(request.content)
        schema = body["generationConfig"]["responseJsonSchema"]
        assert schema["required"] == ["text"]
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "finishReason": "STOP",
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(
                                        {"text": "Sayın ekip, Python deneyimimle başvuruyorum."}
                                    )
                                }
                            ]
                        },
                    }
                ]
            },
        )

    mock_transport(monkeypatch, handle)
    doc = client.post("/api/resumes", json={}).json()
    job = client.post("/api/jobs", json={"company": "Example", "position": "Engineer"}).json()
    response = client.post(
        f"/api/jobs/{job['id']}/cover-letter",
        json={"resumeId": doc["metadata"]["id"], "language": "tr", "useAI": True},
    )
    assert response.status_code == 200
    assert response.json()["source"] == "ai"
