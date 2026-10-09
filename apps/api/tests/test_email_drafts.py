def test_saved_details_generate_editable_templates_without_mutation(client):
    resume = client.post("/api/resumes", json={"title": "Email source"}).json()
    document = resume
    document["profile"]["firstName"] = "Ada"
    document["profile"]["lastName"] = "Example"
    client.put(
        f"/api/resumes/{resume['metadata']['id']}",
        json={"revision": resume["metadata"]["revision"], "document": document},
    )
    job = client.post(
        "/api/jobs",
        json={
            "company": "Example Co",
            "position": "Engineer",
            "linkedResumeId": resume["metadata"]["id"],
            "interviewAt": "2026-10-08T15:00:00",
        },
    ).json()
    for kind in ("follow-up", "thank-you", "negotiation"):
        response = client.post(
            f"/api/jobs/{job['id']}/email-draft",
            json={
                "kind": kind,
                "language": "tr",
                "recipientName": "Deniz",
                "requestedTerms": "Uzaktan çalışma seçeneğini görüşmek istiyorum.",
            },
        )
        assert response.status_code == 200
        assert "Example Co" in response.json()["body"]
        assert "Ada Example" in response.json()["body"]
        assert "Deniz" in response.json()["body"]
        if kind == "thank-you":
            assert "08.10.2026" in response.json()["body"]
        if kind == "negotiation":
            assert "Uzaktan çalışma" in response.json()["body"]
    assert client.get(f"/api/jobs/{job['id']}").json() == job


def test_templates_keep_unknown_facts_as_placeholders_and_validate_kind(client):
    job = client.post("/api/jobs", json={"company": "Example", "position": "Engineer"}).json()
    endpoint = f"/api/jobs/{job['id']}/email-draft"
    response = client.post(endpoint, json={"kind": "negotiation"}).json()
    assert "[Your name]" in response["body"]
    assert "[Enter the compensation" in response["body"]
    assert "No email is sent" in response["notice"]
    assert client.post(endpoint, json={"kind": "send"}).status_code == 422
    assert (
        client.post("/api/jobs/missing/email-draft", json={"kind": "follow-up"}).status_code == 404
    )
