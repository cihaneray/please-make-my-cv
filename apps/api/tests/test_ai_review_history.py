from app.db.models import AIReviewHistoryModel


def review_payload(client, **overrides):
    document = client.post("/api/resumes", json={"title": "Reviewed CV"}).json()
    dimension = {"score": 18, "rationale": "Specific feedback"}
    return {
        "document": document,
        "jobDescription": "Backend developer",
        "language": "en",
        "result": {
            "score": 72,
            "summary": "Review complete",
            "model": "test-model",
            "provider": "ollama",
            "notice": "Subjective AI estimate",
            "clarity": dimension,
            "evidence": dimension,
            "completeness": dimension,
            "relevance": dimension,
            "strengths": ["Clear"],
            "recommendations": [],
            "questions": [],
        },
        **overrides,
    }


def test_snapshot_persists_and_never_changes_live_resume(client, db_session):
    payload = review_payload(client)
    resume_id = payload["document"]["metadata"]["id"]
    payload["document"]["summary"] = "Unsaved reviewed draft"
    saved = client.post("/api/ai/reviews", json=payload)
    assert saved.status_code == 201
    entry = saved.json()
    assert entry["resumeId"] == resume_id
    assert entry["revision"] == 1
    assert entry["model"] == "test-model"
    assert entry["createdAt"].endswith("+00:00")
    assert client.get(f"/api/resumes/{resume_id}").json()["summary"] != "Unsaved reviewed draft"
    db_session.expire_all()
    assert (
        client.get(f"/api/ai/reviews/{entry['id']}").json()["document"]["summary"]
        == "Unsaved reviewed draft"
    )
    params = {"resumeId": resume_id, "jobDescription": payload["jobDescription"], "language": "en"}
    assert client.get("/api/ai/reviews", params=params).json() == [entry]
    assert client.get("/api/ai/reviews", params={**params, "language": "tr"}).json() == []
    assert (
        client.get("/api/ai/reviews", params={**params, "jobDescription": "Other job"}).json() == []
    )
    assert client.get("/api/ai/reviews", params={**params, "resumeId": "another-cv"}).json() == []


def test_review_validation_and_missing_record(client, db_session):
    payload = review_payload(client)
    payload["result"]["clarity"]["score"] = 26
    assert client.post("/api/ai/reviews", json=payload).status_code == 422
    assert db_session.query(AIReviewHistoryModel).count() == 0
    payload = review_payload(client, jobDescription="x" * 21001)
    assert client.post("/api/ai/reviews", json=payload).status_code == 422
    assert client.get("/api/ai/reviews/missing").status_code == 404


def test_backup_restore_remaps_review_snapshot_and_preserves_result(client):
    payload = review_payload(client)
    original = client.post("/api/ai/reviews", json=payload).json()
    backup = client.get("/api/workspace/backup").json()
    assert backup["aiReviews"] == [original]
    assert client.post("/api/workspace/restore", json=backup).status_code == 200
    restored = client.get("/api/workspace/backup").json()["aiReviews"]
    assert len(restored) == 2
    copy = next(row for row in restored if row["id"] != original["id"])
    assert copy["resumeId"] != original["resumeId"]
    assert copy["document"]["metadata"]["id"] == copy["resumeId"]
    assert copy["createdAt"] == original["createdAt"]
    assert copy["result"] == original["result"]
    params = {
        "resumeId": copy["resumeId"],
        "jobDescription": copy["jobDescription"],
        "language": copy["language"],
    }
    assert client.get("/api/ai/reviews", params=params).json() == [copy]


def test_history_retained_on_archive_and_removed_on_permanent_delete(client):
    payload = review_payload(client)
    original = client.post("/api/ai/reviews", json=payload).json()
    client.delete(f"/api/resumes/{original['resumeId']}")
    backup = client.get("/api/workspace/backup").json()
    assert backup["aiReviews"] == [original]
    client.delete(f"/api/resumes/{original['resumeId']}?permanent=true")
    assert client.get("/api/workspace/backup").json()["aiReviews"] == []
    assert client.get(f"/api/ai/reviews/{original['id']}").status_code == 404


def test_review_requires_existing_cv(client):
    payload = review_payload(client)
    client.delete(f"/api/resumes/{payload['document']['metadata']['id']}?permanent=true")
    assert client.post("/api/ai/reviews", json=payload).status_code == 404
