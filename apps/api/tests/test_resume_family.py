from copy import deepcopy

from app.db.models import ResumeModel


def create_family(client):
    root = client.post("/api/resumes", json={"title": "Root CV"}).json()
    root["summary"] = "Built APIs."
    root["experience"] = [
        {
            "id": "job-a",
            "company": "Example",
            "position": "Engineer",
            "location": "",
            "startDate": "2020-01",
            "endDate": "",
            "current": True,
            "summary": "",
            "bullets": ["Built APIs.", "Used Python."],
            "technologies": ["Python"],
        }
    ]
    root = save(client, root)
    a = client.post(
        f"/api/resumes/{root['metadata']['id']}/duplicate", params={"title": "Variant A"}
    ).json()
    b = client.post(
        f"/api/resumes/{root['metadata']['id']}/duplicate", params={"title": "Variant B"}
    ).json()
    return root, a, b


def save(client, doc):
    response = client.put(
        f"/api/resumes/{doc['metadata']['id']}",
        json={"revision": doc["metadata"]["revision"], "document": doc},
    )
    assert response.status_code == 200, response.text
    return response.json()


def preview(client, doc):
    response = client.get(f"/api/resumes/{doc['metadata']['id']}/family")
    assert response.status_code == 200, response.text
    return response.json()


def choice(variant, change):
    return {
        "targetId": variant["id"],
        "targetRevision": variant["revision"],
        "changeId": change["id"],
    }


def apply(client, source, choices, overwrite=False):
    return client.post(
        f"/api/resumes/{source['metadata']['id']}/family/apply",
        json={
            "sourceRevision": source["metadata"]["revision"],
            "choices": choices,
            "overwriteCustomized": overwrite,
        },
    )


def test_selective_updates_preserve_custom_wording_and_source(client):
    root, a, b = create_family(client)
    a["experience"][0]["bullets"] = ["Tailored Python evidence."]
    a = save(client, a)
    root["experience"][0]["startDate"] = "2019-01"
    root["experience"][0]["bullets"] = ["Built reliable APIs.", "Used Python."]
    root = save(client, root)
    report = preview(client, root)
    variant = next(v for v in report["variants"] if v["id"] == a["metadata"]["id"])
    date = next(c for c in variant["changes"] if c["field"] == "startDate")
    bullets = next(c for c in variant["changes"] if c["field"] == "bullets")
    assert date["status"] == "safe" and bullets["status"] == "customized"
    assert apply(client, root, [choice(variant, bullets)]).status_code == 422
    assert apply(client, root, [choice(variant, date)]).status_code == 200
    updated = client.get(f"/api/resumes/{variant['id']}").json()
    assert updated["experience"][0]["startDate"] == "2019-01"
    assert updated["experience"][0]["bullets"] == ["Tailored Python evidence."]
    assert updated["metadata"]["revision"] == a["metadata"]["revision"] + 1
    assert client.get(f"/api/resumes/{root['metadata']['id']}").json() == root
    assert client.get(f"/api/resumes/{b['metadata']['id']}").json() == b
    history = client.get(f"/api/resumes/{variant['id']}/history").json()
    assert any(h["document"]["experience"][0]["startDate"] == "2020-01" for h in history)
    variant = next(v for v in preview(client, root)["variants"] if v["id"] == variant["id"])
    assert not any(c["field"] == "startDate" for c in variant["changes"])
    assert any(c["field"] == "bullets" for c in variant["changes"])


def test_explicit_custom_override_and_partial_baseline(client):
    root, a, _ = create_family(client)
    a["summary"] = "Tailored introduction."
    a = save(client, a)
    root["summary"] = "Built reliable services."
    root["experience"][0]["position"] = "Senior Engineer"
    root = save(client, root)
    variant = next(v for v in preview(client, root)["variants"] if v["id"] == a["metadata"]["id"])
    summary = next(c for c in variant["changes"] if c["section"] == "summary")
    assert apply(client, root, [choice(variant, summary)], True).status_code == 200
    variant = next(v for v in preview(client, root)["variants"] if v["id"] == a["metadata"]["id"])
    position = next(c for c in variant["changes"] if c["field"] == "position")
    assert position["status"] == "safe"
    assert apply(client, root, [choice(variant, position)]).status_code == 200


def test_stale_or_unrelated_choices_are_atomic(client):
    root, a, b = create_family(client)
    root["summary"] = "New summary."
    root = save(client, root)
    report = preview(client, root)
    choices = [choice(v, v["changes"][0]) for v in report["variants"]]
    b["summary"] = "Edited independently."
    b = save(client, b)
    assert apply(client, root, choices).status_code == 409
    assert client.get(f"/api/resumes/{a['metadata']['id']}").json() == a
    old_source = deepcopy(root)
    root["summary"] = "Another source edit."
    root = save(client, root)
    assert apply(client, old_source, choices).status_code == 409
    assert (
        apply(
            client,
            root,
            [
                {
                    "targetId": root["metadata"]["id"],
                    "targetRevision": root["metadata"]["revision"],
                    "changeId": "0" * 64,
                }
            ],
        ).status_code
        == 422
    )


def test_omitted_entries_stay_omitted_and_additions_are_explicit(client):
    root, a, _ = create_family(client)
    a["experience"] = []
    a = save(client, a)
    root["experience"][0]["position"] = "Senior Engineer"
    new = deepcopy(root["experience"][0])
    new["id"] = "job-b"
    new["company"] = "New company"
    root["experience"].append(new)
    root = save(client, root)
    variant = next(v for v in preview(client, root)["variants"] if v["id"] == a["metadata"]["id"])
    assert all(c["entryId"] != "job-a" for c in variant["changes"])
    addition = next(c for c in variant["changes"] if c["action"] == "add")
    assert apply(client, root, [choice(variant, addition)]).status_code == 200
    updated = client.get(f"/api/resumes/{variant['id']}").json()
    assert [e["id"] for e in updated["experience"]] == ["job-b"]


def test_translated_titles_are_not_treated_as_factual_conflicts(client):
    root, a, b = create_family(client)
    a["metadata"]["language"] = "tr"
    a["experience"][0]["position"] = "Mühendis"
    a["experience"][0]["startDate"] = "2021-01"
    a = save(client, a)
    b["experience"][0]["position"] = "Senior Engineer"
    b = save(client, b)
    report = preview(client, root)
    assert any(
        f["documentId"] == a["metadata"]["id"] and f["field"] == "startDate"
        for f in report["findings"]
    )
    assert not any(
        f["documentId"] == a["metadata"]["id"] and f["field"] == "position"
        for f in report["findings"]
    )
    assert any(
        f["documentId"] == b["metadata"]["id"] and f["field"] == "position"
        for f in report["findings"]
    )
    client.delete(f"/api/resumes/{b['metadata']['id']}")
    assert not any(
        f["documentId"] == b["metadata"]["id"] for f in preview(client, root)["findings"]
    )


def test_legacy_baseline_recovery_and_missing_provenance(client, db_session):
    root, a, _ = create_family(client)
    model = db_session.get(ResumeModel, a["metadata"]["id"])
    model.parent_base_json = None
    db_session.commit()
    root["summary"] = "Updated."
    root = save(client, root)
    variant = next(v for v in preview(client, root)["variants"] if v["id"] == a["metadata"]["id"])
    assert variant["hasBaseline"]
    assert variant["changes"][0]["status"] == "safe"


def test_backup_preserves_baselines_and_parent_deletion_detaches(client, db_session):
    root, a, _ = create_family(client)
    root["summary"] = "Updated."
    root = save(client, root)
    backup = client.get("/api/workspace/backup").json()
    assert a["metadata"]["id"] in backup["parentBases"]
    assert client.post("/api/workspace/restore", json=backup).status_code == 200
    roots = [d for d in client.get("/api/resumes").json() if d["title"] == "Root CV"]
    restored = next(d for d in roots if d["id"] != root["metadata"]["id"])
    report = client.get(f"/api/resumes/{restored['id']}/family").json()
    assert len(report["variants"]) == 2
    assert all(v["hasBaseline"] and v["changes"] for v in report["variants"])
    assert (
        client.delete(
            f"/api/resumes/{root['metadata']['id']}", params={"permanent": True}
        ).status_code
        == 204
    )
    db_session.expire_all()
    child = db_session.get(ResumeModel, a["metadata"]["id"])
    assert child.parent_resume_id is None and child.parent_base_json is None


def test_variant_baseline_uses_unsaved_source_draft(client, db_session):
    root, _, _ = create_family(client)
    root["summary"] = "Unsaved source wording."
    response = client.post(
        f"/api/resumes/{root['metadata']['id']}/variants",
        json={
            "document": root,
            "targetJob": {"company": "Target", "position": "Engineer", "description": "Python"},
        },
    )
    assert response.status_code == 201, response.text
    child = db_session.get(ResumeModel, response.json()["metadata"]["id"])
    import json

    assert json.loads(child.parent_base_json)["summary"] == "Unsaved source wording."


def test_new_entries_follow_source_order_without_reordering_existing_copy(client):
    root, a, _ = create_family(client)
    new_entry = deepcopy(root["experience"][0])
    new_entry["id"] = "new-role"
    new_entry["position"] = "Latest role"
    root["experience"].insert(0, new_entry)
    root = save(client, root)
    variant = next(v for v in preview(client, root)["variants"] if v["id"] == a["metadata"]["id"])
    addition = next(c for c in variant["changes"] if c["action"] == "add")
    assert apply(client, root, [choice(variant, addition)]).status_code == 200
    updated = client.get(f"/api/resumes/{variant['id']}").json()
    assert [e["id"] for e in updated["experience"]] == ["new-role", "job-a"]


def test_empty_family_has_no_comparable_fields(client):
    root = client.post("/api/resumes", json={"title": "Empty family"}).json()
    report = preview(client, root)
    assert report["comparedFields"] == 0
    assert report["findings"] == []


def test_descendant_versions_keep_ancestor_provenance_and_custom_fields(client, db_session):
    root, a, _ = create_family(client)
    a["experience"][0]["bullets"] = ["Tailored wording."]
    a = save(client, a)
    grandchild = client.post(
        f"/api/resumes/{a['metadata']['id']}/duplicate", params={"title": "Translated version"}
    ).json()
    grandchild["metadata"]["language"] = "tr"
    grandchild["summary"] = "API geliştirdi."
    grandchild = save(client, grandchild)
    root["experience"][0]["startDate"] = "2018-01"
    root["summary"] = "Built reliable APIs."
    root = save(client, root)
    report = preview(client, root)
    child = next(v for v in report["variants"] if v["id"] == grandchild["metadata"]["id"])
    date = next(c for c in child["changes"] if c["field"] == "startDate")
    assert date["status"] == "safe"
    assert next(c for c in child["changes"] if c["section"] == "summary")["status"] == "customized"
    assert apply(client, root, [choice(child, date)]).status_code == 200
    saved = client.get(f"/api/resumes/{child['id']}").json()
    assert saved["experience"][0]["startDate"] == "2018-01"
    assert saved["experience"][0]["bullets"] == ["Tailored wording."]
    assert saved["summary"] == "API geliştirdi."
    assert saved["metadata"]["parentResumeId"] == a["metadata"]["id"]
    # Syncing the intermediate copy never loses the descendant's own baseline.
    intermediate = next(
        v for v in preview(client, root)["variants"] if v["id"] == a["metadata"]["id"]
    )
    assert (
        apply(
            client,
            root,
            [
                choice(
                    intermediate,
                    next(c for c in intermediate["changes"] if c["field"] == "startDate"),
                )
            ],
        ).status_code
        == 200
    )
    root["experience"][0]["startDate"] = "2017-01"
    root = save(client, root)
    child = next(v for v in preview(client, root)["variants"] if v["id"] == saved["metadata"]["id"])
    assert next(c for c in child["changes"] if c["field"] == "startDate")["status"] == "safe"
    backup = client.get("/api/workspace/backup").json()
    assert child["id"] in backup["ancestorBases"]
    assert client.post("/api/workspace/restore", json=backup).status_code == 200
    client.delete(f"/api/resumes/{a['metadata']['id']}")
    assert any(v["id"] == child["id"] for v in preview(client, root)["variants"])


def test_malformed_ancestor_baseline_restore_is_atomic(client):
    root, a, _ = create_family(client)
    unrelated = client.post("/api/resumes", json={"title": "Unrelated"}).json()
    backup = client.get("/api/workspace/backup").json()
    backup["ancestorBases"] = {a["metadata"]["id"]: {unrelated["metadata"]["id"]: unrelated}}
    before = len(client.get("/api/resumes", params={"include_archived": True}).json())
    assert client.post("/api/workspace/restore", json=backup).status_code == 422
    assert len(client.get("/api/resumes", params={"include_archived": True}).json()) == before
