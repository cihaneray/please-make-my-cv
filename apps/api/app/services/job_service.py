import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundException
from app.db.models import JobModel
from app.schemas.job import CreateJobRequest, JobApplication, JobStatus, UpdateJobRequest


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class JobService:
    @staticmethod
    def list_jobs(db: Session, status: JobStatus | None = None) -> list[JobApplication]:
        query = db.query(JobModel)
        if status:
            query = query.filter(JobModel.status == status.value)
        models = query.order_by(JobModel.updated_at.desc()).all()

        return [
            JobApplication(
                id=m.id,
                company=m.company,
                position=m.position,
                location=m.location,
                url=m.url,
                description=m.description,
                notes=m.notes,
                status=JobStatus(m.status),
                linkedResumeId=m.linked_resume_id,
                createdAt=m.created_at.isoformat(),
                updatedAt=m.updated_at.isoformat(),
            )
            for m in models
        ]

    @staticmethod
    def get_job(db: Session, job_id: str) -> JobApplication:
        m = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not m:
            raise EntityNotFoundException("Job", job_id)
        return JobApplication(
            id=m.id,
            company=m.company,
            position=m.position,
            location=m.location,
            url=m.url,
            description=m.description,
            notes=m.notes,
            status=JobStatus(m.status),
            linkedResumeId=m.linked_resume_id,
            createdAt=m.created_at.isoformat(),
            updatedAt=m.updated_at.isoformat(),
        )

    @staticmethod
    def create_job(db: Session, request: CreateJobRequest) -> JobApplication:
        new_id = str(uuid.uuid4())
        model = JobModel(
            id=new_id,
            company=request.company,
            position=request.position,
            location=request.location,
            url=request.url,
            description=request.description,
            notes=request.notes,
            status=request.status.value,
            linked_resume_id=request.linkedResumeId,
        )
        db.add(model)
        db.commit()
        db.refresh(model)
        return JobService.get_job(db, new_id)

    @staticmethod
    def update_job(db: Session, job_id: str, request: UpdateJobRequest) -> JobApplication:
        m = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not m:
            raise EntityNotFoundException("Job", job_id)

        if request.company is not None:
            m.company = request.company
        if request.position is not None:
            m.position = request.position
        if request.location is not None:
            m.location = request.location
        if request.url is not None:
            m.url = request.url
        if request.description is not None:
            m.description = request.description
        if request.notes is not None:
            m.notes = request.notes
        if request.status is not None:
            m.status = request.status.value
        if request.linkedResumeId is not None:
            m.linked_resume_id = request.linkedResumeId

        db.commit()
        db.refresh(m)
        return JobService.get_job(db, job_id)

    @staticmethod
    def delete_job(db: Session, job_id: str) -> None:
        m = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not m:
            raise EntityNotFoundException("Job", job_id)
        db.delete(m)
        db.commit()
