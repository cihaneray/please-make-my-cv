import json

import pytest
from pydantic import ValidationError

from app.core.exceptions import AppException
from app.schemas.resume import ExperienceItem, ResumeDocument
from app.services import ai_missing_facts_service as facts
from app.services import llm_service as llm


def proposal(field_id="field-2", text="Built an API used by two internal teams."):
    return {
        "section": "experience",
        "priority": "high",
        "evidence": "User supplied: two teams",
        "advice": "Review the added context",
        "suggestedText": text,
        "fieldId": field_id,
    }


def request():
    return facts.MissingFactsRequest(
        document=ResumeDocument(
            summary="Engineer.",
            experience=[ExperienceItem(id="stable-id", bullets=["Built an API."])],
        ),
        answers=[
            facts.MissingFactAnswer(question="Who used the API?", answer="Two internal teams.")
        ],
    )


def test_proposals_use_answers_and_stable_targets_without_mutating_draft(monkeypatch):
    llm.save_connection(llm.ConnectionUpdate(enabled=True, model="test"))
    value = request()
    before = value.document.model_dump()
    captured = {}

    def complete(system, payload, *args):
        captured.update(system=system, payload=payload)
        return {"recommendations": [proposal()]}

    monkeypatch.setattr(llm, "completion", complete)
    result = facts.generate_missing_facts(value)
    edit = result["recommendations"][0]["edit"]
    assert edit["target"] == {
        "section": "experience",
        "field": "bullets",
        "entryId": "stable-id",
        "index": 0,
    }
    assert edit["before"] == "Built an API."
    assert edit["documentId"] == value.document.metadata.id
    assert value.document.model_dump() == before
    assert (
        captured["payload"]["userSuppliedAnswers"][0]["provenance"]
        == "user supplied; not independently verified"
    )
    assert "untrusted data" in captured["system"]
    assert "Never infer metrics" in captured["system"]
    assert "Preserve existing known facts" in captured["system"]
    assert "not independently verified" in result["notice"]


def test_unknown_targets_and_placeholders_are_advice_only(monkeypatch):
    llm.save_connection(llm.ConnectionUpdate(enabled=True, model="test"))
    monkeypatch.setattr(
        llm,
        "completion",
        lambda *args: {
            "recommendations": [
                proposal("metadata.title"),
                proposal(text="Built [number] APIs."),
                proposal(text="Built an API."),
            ]
        },
    )
    assert all(
        item["edit"] is None for item in facts.generate_missing_facts(request())["recommendations"]
    )


def test_redacts_answers_and_omits_unsafe_fields(monkeypatch):
    llm.save_connection(llm.ConnectionUpdate(enabled=True, model="test"))
    value = request()
    value.document.summary = "Contact me at person@example.com"
    value.answers[0].answer = "Ask person@example.com about the API."
    captured = {}

    def complete(system, payload, *args):
        captured.update(payload)
        return {"recommendations": []}

    monkeypatch.setattr(llm, "completion", complete)
    facts.generate_missing_facts(value)
    assert "person@example.com" not in json.dumps(captured)
    assert all(item["section"] != "summary" for item in captured["editableFields"])


def test_empty_answers_rejected_and_invalid_model_response_handled(monkeypatch):
    with pytest.raises(ValidationError):
        facts.MissingFactsRequest(document=ResumeDocument(), answers=[])
    with pytest.raises(ValidationError):
        facts.MissingFactAnswer(question="Question", answer="  ")
    llm.save_connection(llm.ConnectionUpdate(enabled=True, model="test"))
    monkeypatch.setattr(
        llm, "completion", lambda *args: {"recommendations": [{"fieldId": "field-0"}]}
    )
    with pytest.raises(AppException) as error:
        facts.generate_missing_facts(request())
    assert error.value.code == "AI_INVALID_RESPONSE"


def test_endpoint_requires_answers_and_returns_proposals(client, monkeypatch):
    llm.save_connection(llm.ConnectionUpdate(enabled=True, model="test"))
    monkeypatch.setattr(llm, "completion", lambda *args: {"recommendations": [proposal()]})
    value = request().model_dump(mode="json")
    response = client.post("/api/ai/missing-facts", json=value)
    assert response.status_code == 200, response.text
    assert response.json()["recommendations"][0]["edit"]["target"]["entryId"] == "stable-id"
    value["answers"] = []
    assert client.post("/api/ai/missing-facts", json=value).status_code == 422
