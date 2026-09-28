import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.exceptions import ConcurrencyConflictException, EntityNotFoundException
from app.db.models import ResumeModel, ResumeRevisionModel
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
                meta = doc_dict.get("metadata", {})
                lang = meta.get("language", "en")
                market = meta.get("targetMarket") or meta.get("target_market", "TR")
                exp_count = len(doc_dict.get("experience", []))
                skill_count = sum(len(g.get("skills", [])) for g in doc_dict.get("skills", []))
            except Exception:
                lang = "en"
                market = "TR"
                exp_count = 0
                skill_count = 0

            results.append(
                ResumeSummaryResponse(
                    id=m.id,
                    title=m.title,
                    targetRole=m.target_role,
                    templateId=m.template_id,
                    language=lang,
                    targetMarket=market,
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
        doc = request.initialData.model_copy(deep=True) if request.initialData else ResumeDocument()
        new_id = str(uuid.uuid4())
        doc.metadata.id = new_id
        doc.metadata.title = request.title
        doc.metadata.targetRole = request.targetRole
        if "templateId" in request.model_fields_set or not request.initialData:
            doc.design.template = request.templateId
        doc.metadata.templateId = doc.design.template
        if "language" in request.model_fields_set:
            doc.metadata.language = request.language
        if "targetMarket" in request.model_fields_set:
            doc.metadata.targetMarket = request.targetMarket
        doc.metadata.isArchived = False
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

        updated_doc = request.document.model_copy(deep=True)
        updated_doc.metadata.id = resume_id
        updated_doc.metadata.createdAt = ResumeDocument.model_validate_json(
            model.document_json
        ).metadata.createdAt
        updated_doc.metadata.parentResumeId = model.parent_resume_id
        updated_doc.metadata.revision = request.revision + 1
        updated_doc.metadata.updatedAt = now_iso()
        updated_doc.metadata.templateId = updated_doc.design.template
        previous = model.document_json
        result = db.execute(
            update(ResumeModel)
            .where(ResumeModel.id == resume_id, ResumeModel.revision == request.revision)
            .values(
                title=updated_doc.metadata.title,
                target_role=updated_doc.metadata.targetRole,
                template_id=updated_doc.design.template,
                revision=updated_doc.metadata.revision,
                is_archived=updated_doc.metadata.isArchived,
                document_json=updated_doc.model_dump_json(),
            )
            .execution_options(synchronize_session=False)
        )
        if result.rowcount != 1:
            db.rollback()
            db.expire_all()
            current = db.get(ResumeModel, resume_id)
            raise ConcurrencyConflictException(current.revision if current else 0, request.revision)
        if not db.get(ResumeRevisionModel, (resume_id, request.revision)):
            db.add(
                ResumeRevisionModel(
                    resume_id=resume_id, revision=request.revision, document_json=previous
                )
            )
        db.commit()
        db.expire_all()
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
        new_doc.metadata.isArchived = False
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

        doc = ResumeService.get_resume(db, resume_id)
        for field in patch.model_fields_set - {"revision"}:
            value = getattr(patch, field)
            if value is not None:
                setattr(doc.metadata, field, value)
                if field == "templateId":
                    doc.design.template = value
        ResumeService.update_resume(
            db, resume_id, UpdateResumeRequest(revision=patch.revision, document=doc)
        )
        return next(r for r in ResumeService.list_resumes(db, True) if r.id == resume_id)

    @staticmethod
    def delete_resume(db: Session, resume_id: str, permanent: bool = False) -> None:
        model = db.query(ResumeModel).filter(ResumeModel.id == resume_id).first()
        if not model:
            raise EntityNotFoundException("Resume", resume_id)

        if permanent:
            db.query(ResumeRevisionModel).filter_by(resume_id=resume_id).delete()
            db.delete(model)
        else:
            # Soft delete (Section 63)
            doc = ResumeService.get_resume(db, resume_id)
            doc.metadata.isArchived = True
            ResumeService.update_resume(
                db, resume_id, UpdateResumeRequest(revision=model.revision, document=doc)
            )
        db.commit()
