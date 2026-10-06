"""Portable backups. Restore is additive, validated, atomic, and never replaces existing rows."""

import json
import uuid
from datetime import datetime

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
from app.schemas.job import JobApplication, JobStatus
from app.schemas.library import LibrarySnippet
from app.schemas.resume import ResumeDocument
from app.services.job_service import JobService
from app.services.library_service import LibraryService
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/workspace", tags=["Workspace"])


def backup_timestamp(value: str) -> datetime:
    from app.core.exceptions import ValidationException

    try:
        return datetime.fromisoformat(value)
    except ValueError as exc:
        raise ValidationException("Backup contains an invalid timestamp.") from exc


@router.get("/metrics")
def workspace_metrics(db: Session = Depends(get_db)):
    from app.analyzers.analyzer_service import AnalysisService

    scores = [
        AnalysisService.analyze(ResumeService.get_resume(db, row.id)).atsCompatibilityScore
        for row in ResumeService.list_resumes(db)
    ]
    return {
        "atsAverage": round(sum(scores) / len(scores), 1) if scores else None,
        "resumeCount": len(scores),
        "notice": "Internal ATS heuristic; not an external ATS endorsement.",
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


@router.get("/backup", response_model=Backup)
def backup(db: Session = Depends(get_db)):
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
    return Backup(
        resumes=[
            ResumeService.get_resume(db, row.id) for row in ResumeService.list_resumes(db, True)
        ],
        jobs=jobs,
        library=LibraryService.list_snippets(db),
        history=[
            HistoryEntry(
                resumeId=r.resume_id,
                revision=r.revision,
                createdAt=r.created_at,
                document=ResumeDocument.model_validate_json(r.document_json),
            )
            for r in db.query(ResumeRevisionModel).all()
        ],
        snapshots=[
            SnapshotEntry(
                jobId=r.job_id,
                createdAt=r.created_at,
                document=ResumeDocument.model_validate_json(r.document_json),
            )
            for r in snapshots
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
    db.commit()
    return {
        "resumes": len(ids),
        "jobs": len(jobs),
        "library": len(data.library),
        "message": "Restored as new records; existing data was preserved.",
    }
