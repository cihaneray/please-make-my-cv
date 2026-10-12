"""Selective three-way CV updates. No inference or automatic rewriting."""

import hashlib
import json
from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.exceptions import ConcurrencyConflictException, ValidationException
from app.db.models import ResumeModel, ResumeRevisionModel
from app.schemas.resume import ResumeDocument
from app.services.resume_service import ResumeService

SECTIONS = (
    "experience",
    "education",
    "projects",
    "skills",
    "certifications",
    "languages",
    "customSections",
)
FACTS = {
    "experience": ("company", "position", "startDate", "endDate", "current"),
    "education": ("institution", "degree", "fieldOfStudy", "startDate", "endDate", "current"),
    "projects": ("name", "role", "startDate", "endDate"),
    "certifications": ("name", "issuer", "issueDate", "expiryDate", "credentialId"),
}
NARRATIVE_FACTS = {"position", "degree", "fieldOfStudy", "name", "role"}
MAX_FAMILY = 100


class Choice(BaseModel):
    targetId: str = Field(min_length=1, max_length=36)
    targetRevision: int = Field(ge=1)
    changeId: str = Field(min_length=64, max_length=64)


class ApplyFamilyRequest(BaseModel):
    sourceRevision: int = Field(ge=1)
    choices: list[Choice] = Field(min_length=1, max_length=400)
    overwriteCustomized: bool = False


def digest(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()


def baseline(db: Session, source: ResumeDocument, child: ResumeModel) -> dict | None:
    ancestors = json.loads(child.family_bases_json or "{}")
    if source.metadata.id in ancestors:
        return ResumeDocument.model_validate(ancestors[source.metadata.id]).model_dump(mode="json")
    if child.parent_base_json:
        original = ResumeDocument.model_validate_json(child.parent_base_json)
        if original.metadata.id == source.metadata.id:
            return original.model_dump(mode="json")
    # Derived/translated variants inherit the nearest parent's original source.
    if child.parent_resume_id and child.parent_resume_id != source.metadata.id:
        parent = db.get(ResumeModel, child.parent_resume_id)
        if parent:
            return baseline(db, source, parent)
    # Legacy copies: use only a saved source snapshot from before the copy existed.
    created = ResumeDocument.model_validate_json(child.document_json).metadata.createdAt
    candidates = [source.model_dump(mode="json")]
    candidates += [
        ResumeDocument.model_validate_json(row.document_json).model_dump(mode="json")
        for row in db.query(ResumeRevisionModel).filter_by(resume_id=source.metadata.id).all()
    ]
    try:
        before = [
            doc
            for doc in candidates
            if datetime.fromisoformat(doc["metadata"]["updatedAt"])
            <= datetime.fromisoformat(created)
        ]
        return (
            max(before, key=lambda doc: datetime.fromisoformat(doc["metadata"]["updatedAt"]))
            if before
            else None
        )
    except (ValueError, TypeError):
        return None


def changes_for(source: dict, target: dict, base: dict | None) -> list[dict]:
    changes = []

    def add(section, entry_id, field, before, after, old, action="field"):
        if before == after:
            return
        customized = base is None or before != old
        entries = source.get(section, []) if section in SECTIONS else []
        context = next((entry for entry in entries if entry["id"] == entry_id), None)
        if context is None and base and section in SECTIONS:
            context = next((entry for entry in base[section] if entry["id"] == entry_id), None)
        entry_label = next(
            (
                context.get(key)
                for key in ("position", "name", "institution", "category", "language", "title")
                if context and context.get(key)
            ),
            "",
        )
        item = {
            "label": entry_label,
            "section": section,
            "entryId": entry_id,
            "field": field,
            "before": before,
            "after": after,
            "baseline": old,
            "action": action,
            "status": "customized" if customized else "safe",
            "followingIds": [entry["id"] for entry in entries[entries.index(context) + 1 :]]
            if action == "add" and context in entries
            else [],
        }
        item["id"] = digest(item)
        changes.append(item)

    if base is None:
        # Without provenance no field may be classified as safe.
        return changes
    for field, after in source["profile"].items():
        if field != "photo" and after != base["profile"].get(field):
            add(
                "profile",
                None,
                field,
                target["profile"].get(field),
                after,
                base["profile"].get(field),
            )
    if source["summary"] != base["summary"]:
        add("summary", None, "summary", target["summary"], source["summary"], base["summary"])
    for section in SECTIONS:
        new = {entry["id"]: entry for entry in source[section]}
        old = {entry["id"]: entry for entry in base[section]}
        current = {entry["id"]: entry for entry in target[section]}
        for entry_id, entry in new.items():
            if entry_id not in old:
                if entry_id not in current:
                    add(section, entry_id, "", None, entry, None, "add")
                continue
            # An intentionally omitted entry stays omitted.
            if entry_id not in current:
                continue
            for field, after in entry.items():
                if field != "id" and after != old[entry_id].get(field):
                    add(
                        section,
                        entry_id,
                        field,
                        current[entry_id].get(field),
                        after,
                        old[entry_id].get(field),
                    )
        for entry_id, entry in old.items():
            if entry_id not in new and entry_id in current:
                add(section, entry_id, "", current[entry_id], None, entry, "remove")
    return changes


def family_documents(db: Session, source_id: str):
    source = ResumeService.get_resume(db, source_id)
    root_id = source_id
    seen = set()
    node = source
    while node.metadata.parentResumeId:
        if node.metadata.id in seen:
            raise ValidationException("CV relationship contains a cycle.")
        seen.add(node.metadata.id)
        root_id = node.metadata.parentResumeId
        node = ResumeService.get_resume(db, root_id)
    rows = db.query(ResumeModel.id, ResumeModel.parent_resume_id).all()
    related = {root_id}
    for _ in range(MAX_FAMILY):
        expanded = related | {row.id for row in rows if row.parent_resume_id in related}
        if expanded == related:
            break
        related = expanded
        if len(related) > MAX_FAMILY:
            raise ValidationException("Limit CV families to 100 related documents.")
    return source, root_id, db.query(ResumeModel).filter(ResumeModel.id.in_(related)).all()


def preview_family(db: Session, source_id: str):
    source, root_id, family = family_documents(db, source_id)
    data = source.model_dump(mode="json")
    variants = []
    findings = []
    compared_fields = 0
    descendants = {source_id}
    for _ in range(MAX_FAMILY):
        expanded = descendants | {row.id for row in family if row.parent_resume_id in descendants}
        if expanded == descendants:
            break
        descendants = expanded
    for model in family:
        if model.is_archived:
            continue
        target = ResumeService.get_resume(db, model.id).model_dump(mode="json")
        if model.id in descendants and model.id != source_id:
            base = baseline(db, source, model)
            variants.append(
                {
                    "id": model.id,
                    "title": model.title,
                    "revision": model.revision,
                    "language": target["metadata"]["language"],
                    "hasBaseline": base is not None,
                    "changes": changes_for(data, target, base),
                }
            )
    root = ResumeService.get_resume(db, root_id).model_dump(mode="json")
    for model in family:
        if model.id == root_id or model.is_archived:
            continue
        target = ResumeService.get_resume(db, model.id).model_dump(mode="json")
        same_language = target["metadata"]["language"] == root["metadata"]["language"]
        for section, fields in FACTS.items():
            root_entries = {entry["id"]: entry for entry in root[section]}
            for entry in target[section]:
                other = root_entries.get(entry["id"])
                if not other:
                    continue
                for field in fields:
                    if not same_language and field in NARRATIVE_FACTS:
                        continue
                    compared_fields += 1
                    a, b = other[field], entry[field]
                    # Minor whitespace/case differences are formatting, not findings.
                    equal = (
                        a.strip().casefold() == b.strip().casefold()
                        if isinstance(a, str) and isinstance(b, str)
                        else a == b
                    )
                    if not equal:
                        findings.append(
                            {
                                "documentId": model.id,
                                "title": model.title,
                                "section": section,
                                "entryId": entry["id"],
                                "field": field,
                                "source": a,
                                "variant": b,
                            }
                        )
    return {
        "source": {
            "id": source_id,
            "title": source.metadata.title,
            "revision": source.metadata.revision,
        },
        "root": {"id": root_id, "title": root["metadata"]["title"]},
        "documents": [{"id": row.id, "title": row.title} for row in family if not row.is_archived],
        "variants": variants,
        "findings": findings,
        "comparedFields": compared_fields,
    }


def set_change(doc: dict, item: dict):
    section, entry_id, field = item["section"], item["entryId"], item["field"]
    if section == "summary":
        doc["summary"] = deepcopy(item["after"])
    elif section == "profile":
        doc["profile"][field] = deepcopy(item["after"])
    elif item["action"] == "add":
        if not any(entry["id"] == entry_id for entry in doc[section]):
            following = next(
                (
                    entry_id
                    for entry_id in item.get("followingIds", [])
                    if any(entry["id"] == entry_id for entry in doc[section])
                ),
                None,
            )
            insertion = next(
                (index for index, entry in enumerate(doc[section]) if entry["id"] == following),
                len(doc[section]),
            )
            doc[section].insert(insertion, deepcopy(item["after"]))
    elif item["action"] == "remove":
        doc[section] = [entry for entry in doc[section] if entry["id"] != entry_id]
    else:
        entry = next((entry for entry in doc[section] if entry["id"] == entry_id), None)
        if entry is not None:
            entry[field] = deepcopy(item["after"])


def apply_family(db: Session, source_id: str, request: ApplyFamilyRequest):
    db.execute(
        select(ResumeModel).where(ResumeModel.id == source_id).with_for_update()
    ).scalar_one_or_none()
    report = preview_family(db, source_id)
    if report["source"]["revision"] != request.sourceRevision:
        raise ConcurrencyConflictException(report["source"]["revision"], request.sourceRevision)
    selected = {(choice.targetId, choice.changeId): choice for choice in request.choices}
    if len(selected) != len(request.choices):
        raise ValidationException("Duplicate changes are not allowed.")
    variants = {item["id"]: item for item in report["variants"]}
    updates = {}
    for (target_id, change_id), choice in selected.items():
        variant = variants.get(target_id)
        if not variant:
            raise ValidationException("Selected CV is not an active descendant of this source.")
        if variant["revision"] != choice.targetRevision:
            raise ConcurrencyConflictException(variant["revision"], choice.targetRevision)
        change = next((item for item in variant["changes"] if item["id"] == change_id), None)
        if not change:
            raise ValidationException(
                "Selected change is no longer available. Refresh the preview."
            )
        if change["status"] == "customized" and not request.overwriteCustomized:
            raise ValidationException("Customized fields require explicit overwrite confirmation.")
        updates.setdefault(target_id, []).append(change)
    source = ResumeService.get_resume(db, source_id)
    try:
        for target_id, selected_changes in updates.items():
            model = db.get(ResumeModel, target_id)
            previous = model.document_json
            doc = ResumeService.get_resume(db, target_id).model_dump(mode="json")
            base = baseline(db, source, model)
            for change in selected_changes:
                set_change(doc, change)
                set_change(base, change)
            doc["metadata"]["revision"] = model.revision + 1
            doc["metadata"]["updatedAt"] = datetime.now(UTC).isoformat()
            validated = ResumeDocument.model_validate(doc)
            old_revision = model.revision
            inherited = json.loads(model.family_bases_json or "{}")
            inherited[source_id] = base
            result = db.execute(
                update(ResumeModel)
                .where(ResumeModel.id == target_id, ResumeModel.revision == old_revision)
                .values(
                    document_json=validated.model_dump_json(),
                    revision=old_revision + 1,
                    parent_base_json=json.dumps(base, ensure_ascii=False)
                    if model.parent_resume_id == source_id
                    else model.parent_base_json,
                    family_bases_json=json.dumps(inherited, ensure_ascii=False),
                )
                .execution_options(synchronize_session=False)
            )
            if result.rowcount != 1:
                raise ConcurrencyConflictException(old_revision + 1, old_revision)
            if not db.get(ResumeRevisionModel, (target_id, old_revision)):
                db.add(
                    ResumeRevisionModel(
                        resume_id=target_id, revision=old_revision, document_json=previous
                    )
                )
        # Detect a source edit that occurred while assembling the batch.
        db.expire_all()
        if db.get(ResumeModel, source_id).revision != request.sourceRevision:
            raise ConcurrencyConflictException(
                db.get(ResumeModel, source_id).revision, request.sourceRevision
            )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"updated": list(updates), "count": len(updates)}
