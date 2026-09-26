import json
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import ConcurrencyConflictException, EntityNotFoundException
from app.db.models import ResumeModel
from app.schemas.resume import (
    CreateResumeRequest,
    PatchResumeMetadataRequest,
    ResumeDocument,
    ResumeSummaryResponse,
    UpdateResumeRequest,
)


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class ResumeService:
    @staticmethod
    def list_resumes(db: Session, include_archived: bool = False) -> list[ResumeSummaryResponse]:
        query = db.query(ResumeModel)
        if not include_archived:
            query = query.filter(ResumeModel.is_archived.is_(False))
        models = query.order_by(ResumeModel.updated_at.desc()).all()

        results: list[ResumeSummaryResponse] = []
        for m in models:
            # Parse stats
            try:
                doc_dict = json.loads(m.document_json)
                exp_count = len(doc_dict.get("experience", []))
                skill_count = sum(len(g.get("skills", [])) for g in doc_dict.get("skills", []))
            except Exception:
                exp_count = 0
                skill_count = 0

            results.append(
                ResumeSummaryResponse(
                    id=m.id,
                    title=m.title,
                    targetRole=m.target_role,
                    templateId=m.template_id,
                    revision=m.revision,
                    updatedAt=m.updated_at.isoformat(),
                    createdAt=m.created_at.isoformat(),
                    parentResumeId=m.parent_resume_id,
                    isArchived=m.is_archived,
                    stats={"experienceCount": exp_count, "skillsCount": skill_count},
                )
            )
        return results

    @staticmethod
    def get_resume(db: Session, resume_id: str) -> ResumeDocument:
        model = db.query(ResumeModel).filter(ResumeModel.id == resume_id).first()
        if not model:
            raise EntityNotFoundException("Resume", resume_id)

        doc_dict = json.loads(model.document_json)
        doc = ResumeDocument.model_validate(doc_dict)
        # Ensure model revision and id match database
        doc.metadata.id = model.id
        doc.metadata.title = model.title
        doc.metadata.targetRole = model.target_role
        doc.metadata.templateId = model.template_id
        doc.metadata.revision = model.revision
        doc.metadata.isArchived = model.is_archived
        doc.metadata.parentResumeId = model.parent_resume_id
        return doc

    @staticmethod
    def create_resume(db: Session, request: CreateResumeRequest) -> ResumeDocument:
        doc = request.initialData or ResumeDocument()
        new_id = str(uuid.uuid4())
        doc.metadata.id = new_id
        doc.metadata.title = request.title
        doc.metadata.targetRole = request.targetRole
        doc.metadata.templateId = request.templateId
        doc.metadata.revision = 1
        doc.metadata.createdAt = now_iso()
        doc.metadata.updatedAt = now_iso()

        model = ResumeModel(
            id=new_id,
            title=doc.metadata.title,
            target_role=doc.metadata.targetRole,
            template_id=doc.metadata.templateId,
            revision=1,
            is_archived=False,
            parent_resume_id=doc.metadata.parentResumeId,
            document_json=json.dumps(doc.model_dump(), ensure_ascii=False),
        )
        db.add(model)
        db.commit()
        db.refresh(model)
        return doc

    @staticmethod
    def update_resume(db: Session, resume_id: str, request: UpdateResumeRequest) -> ResumeDocument:
        model = db.query(ResumeModel).filter(ResumeModel.id == resume_id).first()
        if not model:
            raise EntityNotFoundException("Resume", resume_id)

        # Optimistic concurrency check (Section 16)
        if model.revision != request.revision:
            raise ConcurrencyConflictException(
                current_revision=model.revision, attempted_revision=request.revision
            )

        new_revision = model.revision + 1
        updated_doc = request.document
        updated_doc.metadata.id = resume_id
        updated_doc.metadata.revision = new_revision
        updated_doc.metadata.updatedAt = now_iso()

        model.title = updated_doc.metadata.title
        model.target_role = updated_doc.metadata.targetRole
        model.template_id = updated_doc.metadata.templateId
        model.revision = new_revision
        model.document_json = json.dumps(updated_doc.model_dump(), ensure_ascii=False)

        db.commit()
        db.refresh(model)
        return updated_doc

    @staticmethod
    def duplicate_resume(
        db: Session, resume_id: str, new_title: str | None = None
    ) -> ResumeDocument:
        existing = ResumeService.get_resume(db, resume_id)
        new_doc = existing.model_copy(deep=True)
        new_id = str(uuid.uuid4())
        new_doc.metadata.id = new_id
        new_doc.metadata.title = new_title or f"{existing.metadata.title} (Copy)"
        new_doc.metadata.parentResumeId = existing.metadata.id
        new_doc.metadata.revision = 1
        new_doc.metadata.createdAt = now_iso()
        new_doc.metadata.updatedAt = now_iso()

        model = ResumeModel(
            id=new_id,
            title=new_doc.metadata.title,
            target_role=new_doc.metadata.targetRole,
            template_id=new_doc.metadata.templateId,
            revision=1,
            is_archived=False,
            parent_resume_id=existing.metadata.id,
            document_json=json.dumps(new_doc.model_dump(), ensure_ascii=False),
        )
        db.add(model)
        db.commit()
        db.refresh(model)
        return new_doc

    @staticmethod
    def patch_metadata(
        db: Session, resume_id: str, patch: PatchResumeMetadataRequest
    ) -> ResumeSummaryResponse:
        model = db.query(ResumeModel).filter(ResumeModel.id == resume_id).first()
        if not model:
            raise EntityNotFoundException("Resume", resume_id)

        doc_dict = json.loads(model.document_json)

        if patch.title is not None:
            model.title = patch.title
            doc_dict["metadata"]["title"] = patch.title
        if patch.targetRole is not None:
            model.target_role = patch.targetRole
            doc_dict["metadata"]["targetRole"] = patch.targetRole
        if patch.templateId is not None:
            model.template_id = patch.templateId
            doc_dict["metadata"]["templateId"] = patch.templateId
        if patch.isArchived is not None:
            model.is_archived = patch.isArchived
            doc_dict["metadata"]["isArchived"] = patch.isArchived
        if patch.tags is not None:
            doc_dict["metadata"]["tags"] = patch.tags

        model.document_json = json.dumps(doc_dict, ensure_ascii=False)
        db.commit()
        db.refresh(model)

        return ResumeSummaryResponse(
            id=model.id,
            title=model.title,
            targetRole=model.target_role,
            templateId=model.template_id,
            revision=model.revision,
            updatedAt=model.updated_at.isoformat(),
            createdAt=model.created_at.isoformat(),
            parentResumeId=model.parent_resume_id,
            isArchived=model.is_archived,
        )

    @staticmethod
    def delete_resume(db: Session, resume_id: str, permanent: bool = False) -> None:
        model = db.query(ResumeModel).filter(ResumeModel.id == resume_id).first()
        if not model:
            raise EntityNotFoundException("Resume", resume_id)

        if permanent:
            db.delete(model)
        else:
            # Soft delete (Section 63)
            model.is_archived = True
        db.commit()
