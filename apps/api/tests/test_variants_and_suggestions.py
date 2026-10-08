import pytest
from test_llm import configure, feedback

from app.schemas.resume import ExperienceItem, ResumeDocument
from app.services import llm_service as llm


def test_variant_preserves_source_and_copies_unsaved_draft(client):
    source = client.post("/api/resumes", json={"title": "Main resume", "language": "tr"}).json()
    draft = {**source, "summary": "Unsaved original facts"}
    target = {"company": "Acme", "position": "Engineer", "description": "Build reliable services"}
    response = client.post(
        f"/api/resumes/{source['metadata']['id']}/variants",
        json={"document": draft, "targetJob": target},
    )
    assert response.status_code == 201, response.text
    variant = response.json()
    assert variant["metadata"]["id"] != source["metadata"]["id"]
    assert variant["metadata"]["parentResumeId"] == source["metadata"]["id"]
    assert variant["metadata"]["targetRole"] == "Engineer"
    assert variant["metadata"]["targetJob"] == target
    assert variant["metadata"]["language"] == "tr"
    assert variant["metadata"]["revision"] == 1
    assert variant["summary"] == "Unsaved original facts"
    assert client.get(f"/api/resumes/{source['metadata']['id']}").json() == source
    assert (
        client.get(f"/api/resumes/{variant['metadata']['id']}").json()["metadata"]["targetJob"]
        == target
    )


def test_variant_rejects_stale_or_wrong_source_and_empty_job(client):
    doc = client.post("/api/resumes", json={}).json()
    path = f"/api/resumes/{doc['metadata']['id']}/variants"
    payload = {"document": doc, "targetJob": {"position": "Engineer", "description": "Build"}}
    doc["metadata"]["revision"] += 1
    assert client.post(path, json=payload).status_code == 409
    doc["metadata"]["revision"] = 1
    doc["metadata"]["id"] = "wrong"
    assert client.post(path, json=payload).status_code == 422
    payload["targetJob"]["position"] = "   "
    assert client.post(path, json=payload).status_code == 422


def test_review_returns_server_resolved_field_edits(monkeypatch):
    configure()
    doc = ResumeDocument(
        summary="Built reliable services.",
        experience=[ExperienceItem(id="stable-entry", bullets=["Built an API."])],
    )
    response = feedback()
    response["recommendations"] = [
        {
            "section": "summary",
            "priority": "high",
            "evidence": "Built services",
            "advice": "Clarify wording",
            "suggestedText": "Developed reliable services.",
            "fieldId": "field-0",
        },
        {
            "section": "experience",
            "priority": "medium",
            "evidence": "Built API",
            "advice": "Clarify",
            "suggestedText": "Developed an API.",
            "fieldId": "field-2",
        },
        {
            "section": "metadata",
            "priority": "low",
            "evidence": "",
            "advice": "Invalid target",
            "suggestedText": "Hacked",
            "fieldId": "metadata.title",
        },
    ]
    monkeypatch.setattr(llm, "completion", lambda *args: response)
    result = llm.review_resume(doc, "", "en")
    first, second, invalid = result["recommendations"]
    assert first["edit"]["before"] == doc.summary
    assert first["edit"]["after"] == "Developed reliable services."
    assert first["edit"]["documentId"] == doc.metadata.id
    assert second["edit"]["target"] == {
        "section": "experience",
        "field": "bullets",
        "entryId": "stable-entry",
        "index": 0,
    }
    assert invalid["edit"] is None
    assert doc.summary == "Built reliable services."


def test_redacted_fields_are_never_replaceable():
    doc = ResumeDocument(
        summary="Email candidate@example.com",
        experience=[ExperienceItem(summary="Safe text", bullets=["Call +1 555 555 1234"])],
    )
    fields = llm.editable_fields(doc)
    assert len(fields) == 1
    assert fields["field-0"]["before"] == "Safe text"


@pytest.mark.parametrize(
    "before,after",
    [
        ("", "Built scalable services."),
        ("Built an API.", "Built an API for [Product/Industry]."),
        ("Built an API.", "Built an API for <company>."),
    ],
)
def test_empty_or_placeholder_suggestions_remain_advice_only(monkeypatch, before, after):
    configure()
    raw = feedback()
    raw["recommendations"][0].update(fieldId="field-0", suggestedText=after)
    monkeypatch.setattr(llm, "completion", lambda *args: raw)
    result = llm.review_resume(ResumeDocument(summary=before), "", "en")
    assert result["recommendations"][0]["edit"] is None
    assert result["recommendations"][0]["suggestedText"] == after
