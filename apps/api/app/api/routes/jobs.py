from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.matching.matcher import MatchingService
from app.schemas.job import (
    CreateJobRequest,
    JobApplication,
    JobMatchAnalysis,
    JobStatus,
    UpdateJobRequest,
)
from app.services.job_service import JobService
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/jobs", tags=["Job Applications"])


@router.get("", response_model=list[JobApplication])
def list_jobs(
    status: JobStatus | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return JobService.list_jobs(db, status=status)


@router.post("", response_model=JobApplication, status_code=status.HTTP_201_CREATED)
def create_job(
    request: CreateJobRequest,
    db: Session = Depends(get_db),
):
    return JobService.create_job(db, request)


@router.get("/{job_id}", response_model=JobApplication)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
):
    return JobService.get_job(db, job_id)


@router.put("/{job_id}", response_model=JobApplication)
def update_job(
    job_id: str,
    request: UpdateJobRequest,
    db: Session = Depends(get_db),
):
    return JobService.update_job(db, job_id, request)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
):
    JobService.delete_job(db, job_id)


@router.post("/{job_id}/match/{resume_id}", response_model=JobMatchAnalysis)
def match_job_with_resume(
    job_id: str,
    resume_id: str,
    requirements: list[str] | None = Body(default=None, embed=True),
    db: Session = Depends(get_db),
):
    job = JobService.get_job(db, job_id)
    resume = ResumeService.get_resume(db, resume_id)
    return MatchingService.match(
        resume,
        job_id=job.id,
        job_description=job.description,
        requirements=requirements if requirements is not None else (job.requirements or None),
    )


@router.get("/{job_id}/snapshots")
def application_snapshots(job_id: str, db: Session = Depends(get_db)):
    import json

    from app.db.models import ApplicationSnapshotModel

    JobService.get_job(db, job_id)
    return [
        {
            "id": row.id,
            "createdAt": row.created_at.isoformat(),
            "document": json.loads(row.document_json),
        }
        for row in db.query(ApplicationSnapshotModel)
        .filter_by(job_id=job_id)
        .order_by(ApplicationSnapshotModel.created_at.desc())
        .all()
    ]
