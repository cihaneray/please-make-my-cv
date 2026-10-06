from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.matching.matcher import MatchingService
from app.schemas.job import (
    CoverLetterRequest,
    CoverLetterResult,
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


@router.post("/{job_id}/cover-letter", response_model=CoverLetterResult)
def generate_cover_letter(job_id: str, request: CoverLetterRequest, db: Session = Depends(get_db)):
    from app.services.cover_letter_service import cover_letter

    job = JobService.get_job(db, job_id)
    document = ResumeService.get_resume(db, request.resumeId)
    return cover_letter(document, job, request.language, request.useAI)


@router.post("/{job_id}/package")
def download_application_package(job_id: str, db: Session = Depends(get_db)):
    import io
    import re
    import unicodedata
    import zipfile
    from urllib.parse import quote

    from fastapi import HTTPException, Response

    from app.exporters.pdf_exporter import render_pdf

    job = JobService.get_job(db, job_id)
    if not job.linkedResumeId:
        raise HTTPException(status_code=400, detail="Link a CV before downloading a package.")
    if not job.coverLetter.strip():
        raise HTTPException(
            status_code=400, detail="Save a cover letter before downloading a package."
        )
    document = ResumeService.get_resume(db, job.linkedResumeId)
    pdf = render_pdf(document)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("cv.pdf", pdf)
        archive.writestr("cover-letter.txt", job.coverLetter.encode("utf-8"))
    stem = re.sub(r"[^\w-]+", "-", f"{job.company}-{job.position}", flags=re.UNICODE).strip("-")[
        :100
    ]
    filename = f"{stem or 'application'}-application.zip"
    ascii_name = unicodedata.normalize("NFKD", filename).encode("ascii", "ignore").decode()
    return Response(
        buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}"
        },
    )
