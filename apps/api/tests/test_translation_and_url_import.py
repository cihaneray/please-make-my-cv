import json
import socket

import httpx
import pytest

from app.core.exceptions import AppException
from app.schemas.resume import ResumeDocument
from app.services import job_url_service as urls
from app.services import translation_service as translation


def test_translation_preserves_identity_metrics_and_source(monkeypatch, client):
    document = ResumeDocument.model_validate(
        {
            "profile": {"firstName": "Ada", "email": "ada@example.com"},
            "summary": "Built Python services with 30% improvement.",
            "skills": [{"skills": ["Python"]}],
        }
    )
    original = document.model_dump()

    def complete(system, payload):
        assert payload["targetLanguage"] == "tr"
        assert "30" not in json.dumps(payload)
        return {
            "translations": [
                text.replace("Built", "Geliştirdi")
                .replace("services with", "servisleri")
                .replace("improvement", "iyileştirme")
                for text in payload["texts"]
            ]
        }

    monkeypatch.setattr(translation, "completion", complete)
    result = translation.translate_document(document, "tr")
    assert "Python" in result["document"].summary
    assert "30%" in result["document"].summary
    assert result["document"].metadata.id == document.metadata.id
    assert result["document"].profile == document.profile
    assert document.model_dump() == original
    response = client.post("/api/ai/translate", json={"document": original, "targetLanguage": "tr"})
    assert response.status_code == 200
    assert client.get("/api/resumes").json() == []


@pytest.mark.parametrize(
    "output",
    [
        {"translations": []},
        {"translations": ["Invented 999 awards"]},
        {"translations": ["Removed metric"]},
        {"translations": [None]},
        {"translations": ["[[KEEP_0]]"], "metadata": {}},
    ],
)
def test_translation_rejects_malformed_or_changed_facts(monkeypatch, output):
    document = ResumeDocument(summary="Improved by 30%")
    monkeypatch.setattr(translation, "completion", lambda *args: output)
    with pytest.raises(AppException):
        translation.translate_document(document, "tr")
    assert document.summary == "Improved by 30%"


def test_translation_allows_grammar_to_reorder_protected_tokens(monkeypatch):
    document = ResumeDocument.model_validate(
        {
            "summary": "Built Python services with 30% improvement.",
            "skills": [{"skills": ["Python"]}],
        }
    )
    source = document.model_dump()
    monkeypatch.setattr(
        translation,
        "completion",
        lambda *args: {
            "translations": ["[[KEEP_1]] iyileştirme sağlayan [[KEEP_0]] servisleri geliştirdi."]
        },
    )
    result = translation.translate_document(document, "tr")
    assert result["document"].summary == "30% iyileştirme sağlayan Python servisleri geliştirdi."
    assert document.model_dump() == source


@pytest.mark.parametrize(
    "value",
    [
        "[[KEEP_0]] [[KEEP_0]] [[KEEP_1]]",
        "[[KEEP_0]] [[KEEP_2]]",
        "[[KEEP_0]] 31%",
        "[[KEEP_0]] [[KEEP_1]] 999",
        "[[KEEP_0]] [[KEEP_1]] [[KEEP_unknown]]",
        "[[KEEP_1]]",
    ],
)
def test_translation_reordering_still_rejects_fact_changes(monkeypatch, value):
    document = ResumeDocument.model_validate(
        {
            "summary": "Built Python services with 30% improvement.",
            "skills": [{"skills": ["Python"]}],
        }
    )
    monkeypatch.setattr(translation, "completion", lambda *args: {"translations": [value]})
    with pytest.raises(AppException) as error:
        translation.translate_document(document, "tr")
    assert error.value.code == "TRANSLATION_FACT_CHANGED"


def test_translation_tokens_cannot_move_between_fields(monkeypatch):
    document = ResumeDocument.model_validate(
        {
            "summary": "Built Python services with 30% improvement.",
            "experience": [{"summary": "Cut costs by 40%."}],
            "skills": [{"skills": ["Python"]}],
        }
    )
    monkeypatch.setattr(
        translation,
        "completion",
        lambda *args: {
            "translations": [
                "[[KEEP_0]] servisleri geliştirdi.",
                "[[KEEP_0]] [[KEEP_1]] tasarruf sağladı.",
            ]
        },
    )
    with pytest.raises(AppException) as error:
        translation.translate_document(document, "tr")
    assert error.value.code == "TRANSLATION_FACT_CHANGED"


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "http://user:pass@example.com/",
        "http://localhost/",
        "https://example.com:8080/",
        "http://metadata.google.internal/",
        "http://example.com\\@127.0.0.1/",
        "https://example.com/\n",
    ],
)
def test_rejects_unsafe_url_syntax(url):
    with pytest.raises(AppException):
        urls.validate_url(url)


@pytest.mark.parametrize(
    "address",
    ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fc00::1", "::ffff:127.0.0.1", "224.0.0.1"],
)
def test_rejects_private_dns_even_with_public_answer(monkeypatch, address):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *args: [
            (None, None, None, None, ("93.184.216.34", 443)),
            (None, None, None, None, (address, 443)),
        ],
    )
    with pytest.raises(AppException):
        urls.public_addresses("example.com", 443, 3)


def mock_network(monkeypatch, handler):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda host, *args: [
            (
                None,
                None,
                None,
                None,
                ("93.184.216.34" if host == "example.com" else "127.0.0.1", 443),
            )
        ],
    )
    monkeypatch.setattr(httpx, "HTTPTransport", lambda **kwargs: httpx.MockTransport(handler))


def test_redirect_is_revalidated_and_connection_is_pinned(monkeypatch):
    calls = []

    def handle(request):
        calls.append(request)
        assert request.url.host == "93.184.216.34"
        assert request.headers["host"] == "example.com"
        assert request.extensions["sni_hostname"] == "example.com"
        assert "cookie" not in request.headers
        return httpx.Response(
            302, headers={"location": "https://private.example/job", "set-cookie": "session=secret"}
        )

    mock_network(monkeypatch, handle)
    with pytest.raises(AppException):
        urls.import_job_url("https://example.com/job")
    assert len(calls) == 1


def test_repeated_host_resolves_again_on_redirect(monkeypatch):
    lookups = []

    def resolve(*args):
        lookups.append(args)
        return [
            (None, None, None, None, ("93.184.216.34" if len(lookups) == 1 else "127.0.0.1", 443))
        ]

    monkeypatch.setattr(socket, "getaddrinfo", resolve)
    monkeypatch.setattr(
        httpx,
        "HTTPTransport",
        lambda **kwargs: httpx.MockTransport(
            lambda request: httpx.Response(302, headers={"location": "/next"})
        ),
    )
    with pytest.raises(AppException):
        urls.import_job_url("https://example.com/job")
    assert len(lookups) == 2


def test_body_and_compression_are_bounded(monkeypatch):
    mock_network(
        monkeypatch,
        lambda request: httpx.Response(
            200,
            headers={"content-type": "text/html"},
            stream=httpx.ByteStream(b"a" * (urls.MAX_BYTES + 1)),
        ),
    )
    with pytest.raises(AppException):
        urls.import_job_url("https://example.com/job")
    mock_network(
        monkeypatch,
        lambda request: httpx.Response(
            200,
            headers={"content-type": "text/html", "content-encoding": "br"},
            stream=httpx.ByteStream(b"compressed"),
        ),
    )
    with pytest.raises(AppException):
        urls.import_job_url("https://example.com/job")


def test_structured_import_is_inert_and_does_not_create_job(monkeypatch, client):
    html = (
        '<script type="application/ld+json">'
        + json.dumps(
            {
                "@graph": [
                    {
                        "@type": "JobPosting",
                        "title": "Engineer",
                        "hiringOrganization": {"name": "Acme"},
                        "description": "<p>Build Python services</p>",
                    }
                ]
            }
        )
        + "</script><script>bad()</script>"
    )
    mock_network(
        monkeypatch,
        lambda request: httpx.Response(
            200, headers={"content-type": "text/html"}, stream=httpx.ByteStream(html.encode())
        ),
    )
    response = client.post("/api/jobs/import-url", json={"url": "https://example.com/job"})
    assert response.status_code == 200, response.text
    assert response.json()["company"] == "Acme"
    assert response.json()["description"] == "Build Python services"
    assert response.json()["extraction"] == "structured"
    assert client.get("/api/jobs").json() == []


def test_fallback_excludes_script_and_requires_fields():
    result = urls.extract_job(
        "<script>secret()</script><style>secret</style><h1>Role</h1><p>Readable text</p>",
        "https://example.com",
    )
    assert result["extraction"] == "text"
    assert result["company"] == result["position"] == ""
    assert "secret" not in result["description"]


def test_redirect_hop_limit_and_no_cookie_replay(monkeypatch):
    requests = []

    def handler(request):
        requests.append(request)
        assert "cookie" not in request.headers
        return httpx.Response(302, headers={"location": "/next", "set-cookie": "session=secret"})

    mock_network(monkeypatch, handler)
    with pytest.raises(AppException):
        urls.import_job_url("https://example.com/job")
    assert len(requests) == 4


def test_deadline_stops_request_before_network(monkeypatch):
    monkeypatch.setattr(urls, "DEADLINE_SECONDS", 0)

    def forbidden(*args):
        pytest.fail("Network must not be contacted after deadline")

    monkeypatch.setattr(socket, "getaddrinfo", forbidden)
    with pytest.raises(AppException):
        urls.import_job_url("https://example.com/job")


def test_malformed_and_multiple_postings_use_editable_fallback():
    html = '<script type="application/ld+json">bad JSON</script><h1>Job page</h1>'
    assert urls.extract_job(html, "https://example.com")["extraction"] == "text"
    two = [
        {"@type": "JobPosting", "title": "A", "description": "First"},
        {"@type": "JobPosting", "title": "B", "description": "Second"},
    ]
    html = '<script type="application/ld+json">' + json.dumps(two) + "</script><p>Pick a role</p>"
    assert urls.extract_job(html, "https://example.com")["extraction"] == "text"
