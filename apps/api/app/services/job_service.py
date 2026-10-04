import json
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundException
from app.db.models import ApplicationSnapshotModel, JobModel
from app.schemas.job import CreateJobRequest, JobApplication, JobStatus, UpdateJobRequest
from app.services.resume_service import ResumeService


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
                requirements=json.loads(m.requirements_json),
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
            requirements=json.loads(m.requirements_json),
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
            requirements_json=json.dumps(request.requirements),
            status=request.status.value,
            linked_resume_id=request.linkedResumeId,
        )
        db.add(model)
        if request.linkedResumeId:
            doc = ResumeService.get_resume(db, request.linkedResumeId)
            if request.status == JobStatus.APPLIED:
                db.add(
                    ApplicationSnapshotModel(
                        id=str(uuid.uuid4()), job_id=new_id, document_json=doc.model_dump_json()
                    )
                )
        db.commit()
        db.refresh(model)
        return JobService.get_job(db, new_id)

    @staticmethod
    def update_job(db: Session, job_id: str, request: UpdateJobRequest) -> JobApplication:
        m = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not m:
            raise EntityNotFoundException("Job", job_id)

        was_applied = m.status == JobStatus.APPLIED.value
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
        if request.requirements is not None:
            m.requirements_json = json.dumps(request.requirements)
        if request.status is not None:
            m.status = request.status.value
        if "linkedResumeId" in request.model_fields_set:
            m.linked_resume_id = request.linkedResumeId

        if m.linked_resume_id:
            doc = ResumeService.get_resume(db, m.linked_resume_id)
            if m.status == JobStatus.APPLIED.value and not was_applied:
                db.add(
                    ApplicationSnapshotModel(
                        id=str(uuid.uuid4()), job_id=m.id, document_json=doc.model_dump_json()
                    )
                )
        db.commit()
        db.refresh(m)
        return JobService.get_job(db, job_id)

    @staticmethod
    def delete_job(db: Session, job_id: str) -> None:
        m = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not m:
            raise EntityNotFoundException("Job", job_id)
        db.query(ApplicationSnapshotModel).filter_by(job_id=job_id).delete()
        db.delete(m)
        db.commit()
