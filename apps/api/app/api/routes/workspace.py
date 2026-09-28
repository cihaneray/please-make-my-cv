"""Portable backups. Restore is additive, validated, atomic, and never replaces existing rows."""

import json
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.models import (
    ApplicationSnapshotModel,
    JobModel,
    LibraryItemModel,
    ResumeModel,
    ResumeRevisionModel,
)
from app.db.session import get_db
from app.schemas.job import JobApplication
from app.schemas.library import LibrarySnippet
from app.schemas.resume import ResumeDocument
from app.services.job_service import JobService
from app.services.library_service import LibraryService
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/workspace", tags=["Workspace"])


class HistoryEntry(BaseModel):
    resumeId: str
    revision: int
    document: ResumeDocument


class SnapshotEntry(BaseModel):
    jobId: str
    document: ResumeDocument


class Backup(BaseModel):
    version: int = Field(default=1, ge=1, le=1)
    resumes: list[ResumeDocument] = Field(default_factory=list)
    jobs: list[JobApplication] = Field(default_factory=list)
    library: list[LibrarySnippet] = Field(default_factory=list)
    history: list[HistoryEntry] = Field(default_factory=list)
    snapshots: list[SnapshotEntry] = Field(default_factory=list)


@router.get("/backup", response_model=Backup)
def backup(db: Session = Depends(get_db)):
    return Backup(
        resumes=[
            ResumeService.get_resume(db, row.id) for row in ResumeService.list_resumes(db, True)
        ],
        jobs=JobService.list_jobs(db),
        library=LibraryService.list_snippets(db),
        history=[
            HistoryEntry(
                resumeId=r.resume_id,
                revision=r.revision,
                document=ResumeDocument.model_validate_json(r.document_json),
            )
            for r in db.query(ResumeRevisionModel).all()
        ],
        snapshots=[
            SnapshotEntry(
                jobId=r.job_id, document=ResumeDocument.model_validate_json(r.document_json)
            )
            for r in db.query(ApplicationSnapshotModel).all()
        ],
    )


@router.post("/restore")
def restore(data: Backup, db: Session = Depends(get_db)):
    from app.core.exceptions import ValidationException

    if len({d.metadata.id for d in data.resumes}) != len(data.resumes) or len(
        {j.id for j in data.jobs}
    ) != len(data.jobs):
        raise ValidationException("Backup contains duplicate resume or job identifiers.")
    ids = {doc.metadata.id: str(uuid.uuid4()) for doc in data.resumes}
    jobs = {job.id: str(uuid.uuid4()) for job in data.jobs}
    for doc in data.resumes:
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
                document_json=doc.model_dump_json(),
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
            )
        )
    db.commit()
    return {
        "resumes": len(ids),
        "jobs": len(jobs),
        "library": len(data.library),
        "message": "Restored as new records; existing data was preserved.",
    }
