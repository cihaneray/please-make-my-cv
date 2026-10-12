"""Portable backups. Restore is additive, validated, atomic, and never replaces existing rows."""

import json
import uuid
from datetime import datetime
from functools import lru_cache

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, SecretStr
from sqlalchemy import String, Text, func
from sqlalchemy.orm import Session

from app.core.stored_document import read_stored_document
from app.db.models import (
    AIReviewHistoryModel,
    ApplicationSnapshotModel,
    JobModel,
    LibraryItemModel,
    ResumeModel,
    ResumeRevisionModel,
)
from app.db.session import get_db
from app.schemas.job import JobApplication, JobStatus
from app.schemas.library import LibrarySnippet
from app.schemas.resume import ResumeDocument
from app.services.ai_review_history_service import SaveReview, make_review, serialize_review
from app.services.job_service import JobService
from app.services.library_service import LibraryService

router = APIRouter(prefix="/workspace", tags=["Workspace"])


def backup_timestamp(value: str) -> datetime:
    from app.core.exceptions import ValidationException

    try:
        return datetime.fromisoformat(value)
    except ValueError as exc:
        raise ValidationException("Backup contains an invalid timestamp.") from exc


@lru_cache(maxsize=128)
def metric_score(document_json: str):
    from app.analyzers.analyzer_service import AnalysisService

    return AnalysisService.analyze(
        ResumeDocument.model_validate_json(document_json)
    ).atsCompatibilityScore


@router.get("/metrics")
def workspace_metrics(db: Session = Depends(get_db)):
    scores, corrupt = [], []
    count = 0
    rows = db.query(ResumeModel).filter(ResumeModel.is_archived.is_(False)).yield_per(32)
    for row in rows:
        count += 1
        try:
            document = ResumeDocument.model_validate_json(row.document_json)
            scores.append(metric_score(document.model_dump_json(exclude={"profile": {"photo"}})))
        except ValueError:
            corrupt.append(row.id)
    return {
        "atsAverage": round(sum(scores) / len(scores), 1) if scores else None,
        "resumeCount": count,
        "corruptResumeIds": corrupt,
        "notice": "Some CVs contain invalid data and were excluded from the average."
        if corrupt
        else "Internal ATS heuristic; not an external ATS endorsement.",
    }


class HistoryEntry(BaseModel):
    createdAt: datetime | None = None
    resumeId: str
    revision: int
    document: ResumeDocument


class SnapshotEntry(BaseModel):
    createdAt: datetime | None = None
    jobId: str
    document: ResumeDocument


class Backup(BaseModel):
    version: int = Field(default=2, ge=1, le=2)
    resumes: list[ResumeDocument] = Field(default_factory=list)
    jobs: list[JobApplication] = Field(default_factory=list)
    library: list[LibrarySnippet] = Field(default_factory=list)
    history: list[HistoryEntry] = Field(default_factory=list)
    snapshots: list[SnapshotEntry] = Field(default_factory=list)
    aiReviews: list[dict] = Field(default_factory=list)
    parentBases: dict[str, ResumeDocument] = Field(default_factory=dict)
    ancestorBases: dict[str, dict[str, ResumeDocument]] = Field(default_factory=dict)


class BackupPassword(BaseModel):
    password: SecretStr = Field(min_length=12, max_length=1024)


class EncryptedRestore(BackupPassword):
    envelope: dict


@router.post("/backup/encrypted")
def encrypted_backup(request: BackupPassword, db: Session = Depends(get_db)):
    from fastapi import Response

    from app.core.secrets import encrypt_backup

    envelope = encrypt_backup(
        backup(db).model_dump_json().encode(), request.password.get_secret_value()
    )
    from app.core.config import settings
    from app.core.exceptions import AppException

    content = json.dumps(envelope)
    if (
        len(content.encode()) + len(request.password.get_secret_value().encode()) + 64
        > settings.max_upload_size_bytes
    ):
        raise AppException(
            "BACKUP_TOO_LARGE",
            "Encrypted backup exceeds the restore size limit. Increase MAX_UPLOAD_SIZE_BYTES before creating this backup.",
            413,
        )
    return Response(content, media_type="application/json", headers={"Cache-Control": "no-store"})


@router.post("/restore/encrypted")
def encrypted_restore(request: EncryptedRestore, db: Session = Depends(get_db)):
    from app.core.secrets import decrypt_backup

    data = Backup.model_validate_json(
        decrypt_backup(request.envelope, request.password.get_secret_value())
    )
    return restore(data, db)


@router.get("/backup", response_model=Backup)
def backup(db: Session = Depends(get_db)):
    from app.core.config import settings
    from app.core.exceptions import AppException

    # Bound raw payload sizes in the DB before loading CVs/photos into memory.
    raw_size = 0
    for model in (
        ResumeModel,
        ResumeRevisionModel,
        ApplicationSnapshotModel,
        JobModel,
        LibraryItemModel,
        AIReviewHistoryModel,
    ):
        columns = [
            column for column in model.__table__.columns if isinstance(column.type, (String, Text))
        ]
        size = sum(func.coalesce(func.length(column), 0) for column in columns)
        raw_size += db.query(func.coalesce(func.sum(size), 0)).scalar()
    if raw_size > settings.max_upload_size_bytes - 1024:
        raise AppException(
            "BACKUP_TOO_LARGE",
            "Backup exceeds the restore size limit. Increase MAX_UPLOAD_SIZE_BYTES before exporting.",
            413,
        )
    jobs = JobService.list_jobs(db)
    snapshots = db.query(ApplicationSnapshotModel).all()
    known_jobs = {job.id for job in jobs}
    # Earlier versions left submitted copies behind when deleting their job.
    # Preserve those copies under an archived placeholder in portable backups.
    for snapshot in snapshots:
        if snapshot.job_id not in known_jobs:
            jobs.append(
                JobApplication(
                    id=snapshot.job_id,
                    company="Deleted job",
                    position="Recovered submitted copy",
                    status=JobStatus.ARCHIVED,
                )
            )
            known_jobs.add(snapshot.job_id)
    resumes = []
    for row in db.query(ResumeModel).all():
        try:
            document = ResumeDocument.model_validate_json(row.document_json)
            document.metadata.revision = row.revision
            document.metadata.isArchived = row.is_archived
            document.metadata.parentResumeId = row.parent_resume_id
            resumes.append(document)
        except ValueError as exc:
            from app.core.exceptions import AppException

            raise AppException(
                "BACKUP_CORRUPT_RECORD",
                "Backup could not include an invalid CV. Repair or restore this record first.",
                409,
                {"resumeId": row.id},
            ) from exc
    result = Backup(
        resumes=resumes,
        jobs=jobs,
        library=LibraryService.list_snippets(db),
        history=[
            HistoryEntry(
                resumeId=r.resume_id,
                revision=r.revision,
                createdAt=r.created_at,
                document=read_stored_document(r.document_json, f"{r.resume_id}:{r.revision}"),
            )
            for r in db.query(ResumeRevisionModel).all()
        ],
        snapshots=[
            SnapshotEntry(
                jobId=r.job_id,
                createdAt=r.created_at,
                document=read_stored_document(r.document_json, r.id),
            )
            for r in snapshots
        ],
        aiReviews=[serialize_review(r) for r in db.query(AIReviewHistoryModel).all()],
        parentBases={
            r.id: read_stored_document(r.parent_base_json, r.id)
            for r in db.query(ResumeModel).all()
            if r.parent_resume_id and r.parent_base_json
        },
        ancestorBases={
            r.id: json.loads(r.family_bases_json)
            for r in db.query(ResumeModel).all()
            if r.family_bases_json and r.family_bases_json != "{}"
        },
    )
    from app.core.config import settings
    from app.core.exceptions import AppException

    if len(result.model_dump_json().encode()) > settings.max_upload_size_bytes - 1024:
        raise AppException(
            "BACKUP_TOO_LARGE",
            "Backup exceeds the restore size limit. Increase MAX_UPLOAD_SIZE_BYTES before exporting.",
            413,
        )
    return result


@router.post("/restore")
def restore(data: Backup, db: Session = Depends(get_db)):
    from app.core.exceptions import ValidationException

    if len({d.metadata.id for d in data.resumes}) != len(data.resumes) or len(
        {j.id for j in data.jobs}
    ) != len(data.jobs):
        raise ValidationException("Backup contains duplicate resume or job identifiers.")
    ids = {doc.metadata.id: str(uuid.uuid4()) for doc in data.resumes}
    jobs = {job.id: str(uuid.uuid4()) for job in data.jobs}
    baseline_map = {}
    documents_by_id = {doc.metadata.id: doc for doc in data.resumes}
    for child_id, base in data.parentBases.items():
        child = documents_by_id.get(child_id)
        if (
            not child
            or child.metadata.parentResumeId != base.metadata.id
            or base.metadata.id not in ids
        ):
            raise ValidationException(
                "Variant baseline refers to a missing or different source CV."
            )
        base = base.model_copy(deep=True)
        base.metadata.id = ids[base.metadata.id]
        base.metadata.parentResumeId = ids.get(base.metadata.parentResumeId)
        baseline_map[child_id] = base.model_dump_json()
    ancestor_map = {}
    for child_id, values in data.ancestorBases.items():
        if child_id not in ids:
            raise ValidationException("Ancestor baseline refers to a missing CV.")
        restored_values = {}
        lineage = set()
        parent_id = documents_by_id[child_id].metadata.parentResumeId
        while parent_id and parent_id in documents_by_id:
            if parent_id in lineage or parent_id == child_id:
                raise ValidationException("CV baseline relationships contain a cycle.")
            lineage.add(parent_id)
            parent_id = documents_by_id[parent_id].metadata.parentResumeId
        for source_id, base in values.items():
            if source_id not in lineage or base.metadata.id != source_id:
                raise ValidationException("Ancestor baseline has an invalid source reference.")
            base = base.model_copy(deep=True)
            base.metadata.id = ids[source_id]
            base.metadata.parentResumeId = ids.get(base.metadata.parentResumeId)
            restored_values[ids[source_id]] = base.model_dump(mode="json")
        ancestor_map[child_id] = json.dumps(restored_values, ensure_ascii=False)
    # Validate review snapshots before adding any rows; old backups simply omit them.
    reviews = []
    review_ids = set()
    for entry in data.aiReviews:
        review = SaveReview.model_validate(entry)
        if (
            entry.get("resumeId") != review.document.metadata.id
            or entry.get("revision") != review.document.metadata.revision
        ):
            raise ValidationException("AI review snapshot has inconsistent CV context.")
        if not entry.get("id") or entry["id"] in review_ids:
            raise ValidationException("AI review history has missing or duplicate identifiers.")
        review_ids.add(entry["id"])
        source_id = review.document.metadata.id
        restored_id = ids.get(source_id)
        if restored_id is None:
            raise ValidationException("AI review history refers to a missing CV.")
        review.document.metadata.id = restored_id
        review.document.metadata.parentResumeId = ids.get(review.document.metadata.parentResumeId)
        for recommendation in review.result.recommendations:
            if recommendation.edit:
                recommendation.edit.documentId = restored_id
        reviews.append(make_review(review, created_at=backup_timestamp(entry["createdAt"])))
    for doc in data.resumes:
        original_resume_id = doc.metadata.id
        doc = doc.model_copy(deep=True)
        doc.metadata.id = ids[doc.metadata.id]
        doc.metadata.parentResumeId = ids.get(doc.metadata.parentResumeId)
        doc.metadata.templateId = doc.design.template
        db.add(
            ResumeModel(
                id=doc.metadata.id,
                title=doc.metadata.title,
                target_role=doc.metadata.targetRole,
                template_id=doc.design.template,
                revision=doc.metadata.revision,
                is_archived=doc.metadata.isArchived,
                parent_resume_id=doc.metadata.parentResumeId,
                parent_base_json=baseline_map.get(original_resume_id),
                family_bases_json=ancestor_map.get(original_resume_id, "{}"),
                document_json=doc.model_dump_json(),
                created_at=backup_timestamp(doc.metadata.createdAt),
                updated_at=backup_timestamp(doc.metadata.updatedAt),
            )
        )
    for job in data.jobs:
        db.add(
            JobModel(
                id=jobs[job.id],
                company=job.company,
                position=job.position,
                location=job.location,
                url=job.url,
                description=job.description,
                notes=job.notes,
                planning_json=json.dumps(
                    {
                        key: getattr(job, key)
                        for key in ("interviewAt", "followUpDate", "coverLetter")
                    }
                ),
                requirements_json=json.dumps(job.requirements),
                timeline_json=json.dumps([event.model_dump() for event in job.timeline]),
                created_at=backup_timestamp(job.createdAt),
                updated_at=backup_timestamp(job.updatedAt),
                status=job.status.value,
                linked_resume_id=ids.get(job.linkedResumeId),
            )
        )
    for item in data.library:
        db.add(
            LibraryItemModel(
                id=str(uuid.uuid4()),
                type=item.type.value,
                title=item.title,
                content=item.content,
                category=item.category,
                tags_json=json.dumps(item.tags),
                variants_json=json.dumps([v.model_dump() for v in item.variants]),
                target_roles_json=json.dumps(item.targetRoles),
                metrics=item.metrics,
                created_at=backup_timestamp(item.createdAt),
                updated_at=backup_timestamp(item.updatedAt),
            )
        )
    seen = set()
    for row in data.history:
        key = (row.resumeId, row.revision)
        if row.resumeId not in ids or key in seen:
            raise ValidationException(
                "Backup history has missing references or duplicate revisions."
            )
        seen.add(key)
        row.document.metadata.id = ids[row.resumeId]
        row.document.metadata.parentResumeId = ids.get(row.document.metadata.parentResumeId)
        db.add(
            ResumeRevisionModel(
                resume_id=ids[row.resumeId],
                revision=row.revision,
                document_json=row.document.model_dump_json(),
                created_at=row.createdAt or backup_timestamp(row.document.metadata.updatedAt),
            )
        )
    for row in data.snapshots:
        if row.jobId not in jobs:
            raise ValidationException("Snapshot refers to a missing job.")
        db.add(
            ApplicationSnapshotModel(
                id=str(uuid.uuid4()),
                job_id=jobs[row.jobId],
                document_json=row.document.model_dump_json(),
                created_at=row.createdAt or backup_timestamp(row.document.metadata.updatedAt),
            )
        )
    db.add_all(reviews)
    db.commit()
    return {
        "resumes": len(ids),
        "jobs": len(jobs),
        "library": len(data.library),
        "message": "Restored as new records; existing data was preserved.",
    }
