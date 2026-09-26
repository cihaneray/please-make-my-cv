def test_create_and_get_resume(client):
    create_payload = {
        "title": "Backend Lead Resume",
        "targetRole": "Staff Software Engineer",
        "templateId": "technical",
    }
    res = client.post("/api/resumes", json=create_payload)
    assert res.status_code == 201
    created = res.json()
    assert created["metadata"]["title"] == "Backend Lead Resume"
    assert created["metadata"]["revision"] == 1
    resume_id = created["metadata"]["id"]

    # Fetch
    res_get = client.get(f"/api/resumes/{resume_id}")
    assert res_get.status_code == 200
    fetched = res_get.json()
    assert fetched["metadata"]["id"] == resume_id


def test_optimistic_concurrency_conflict(client):
    # Create resume
    res = client.post("/api/resumes", json={"title": "Concurrency Test"})
    data = res.json()
    resume_id = data["metadata"]["id"]
    current_rev = data["metadata"]["revision"]

    # First update with correct revision
    data["profile"]["firstName"] = "Updated First"
    update_res1 = client.put(
        f"/api/resumes/{resume_id}", json={"revision": current_rev, "document": data}
    )
    assert update_res1.status_code == 200
    updated_data = update_res1.json()
    assert updated_data["metadata"]["revision"] == 2

    # Second update using STALE revision (current_rev = 1, but db is now 2) -> MUST return 409 Conflict!
    data["profile"]["firstName"] = "Stale Overwrite Attempt"
    conflict_res = client.put(
        f"/api/resumes/{resume_id}", json={"revision": current_rev, "document": data}
    )
    assert conflict_res.status_code == 409
    error_body = conflict_res.json()
    assert error_body["error"]["code"] == "CONCURRENCY_CONFLICT"


def test_duplicate_resume(client):
    res = client.post("/api/resumes", json={"title": "Master CV"})
    orig_id = res.json()["metadata"]["id"]

    res_dup = client.post(f"/api/resumes/{orig_id}/duplicate?title=Forked%20Variant")
    assert res_dup.status_code == 200
    dup_data = res_dup.json()
    assert dup_data["metadata"]["title"] == "Forked Variant"
    assert dup_data["metadata"]["parentResumeId"] == orig_id
    assert dup_data["metadata"]["id"] != orig_id


def test_source_api_roundtrip(client):
    res = client.post("/api/resumes", json={"title": "Source Edit Test"})
    resume_id = res.json()["metadata"]["id"]

    # Validate valid YAML
    yaml_snippet = """
    schemaVersion: 1
    resume:
      profile:
        firstName: Alan
        lastName: Turing
    """
    val_res = client.post(
        f"/api/resumes/{resume_id}/source/validate",
        json={"format": "yaml", "content": yaml_snippet},
    )
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True

    # Apply YAML
    apply_res = client.put(
        f"/api/resumes/{resume_id}/source",
        json={"format": "yaml", "content": yaml_snippet, "revision": 1},
    )
    assert apply_res.status_code == 200
    applied_doc = apply_res.json()
    assert applied_doc["profile"]["firstName"] == "Alan"
    assert applied_doc["metadata"]["revision"] == 2
