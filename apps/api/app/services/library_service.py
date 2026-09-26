import json
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundException
from app.db.models import LibraryItemModel
from app.schemas.library import (
    BulletVariant,
    CreateLibrarySnippetRequest,
    LibraryItemType,
    LibrarySnippet,
    UpdateLibrarySnippetRequest,
)


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class LibraryService:
    @staticmethod
    def list_snippets(
        db: Session,
        item_type: LibraryItemType | None = None,
        tag: str | None = None,
        query_text: str | None = None,
    ) -> list[LibrarySnippet]:
        q = db.query(LibraryItemModel)
        if item_type:
            q = q.filter(LibraryItemModel.type == item_type.value)
        models = q.order_by(LibraryItemModel.updated_at.desc()).all()

        results: list[LibrarySnippet] = []
        for m in models:
            tags = json.loads(m.tags_json) if m.tags_json else []
            variants = [
                BulletVariant.model_validate(v) for v in json.loads(m.variants_json or "[]")
            ]
            roles = json.loads(m.target_roles_json or "[]")

            if tag and tag not in tags:
                continue
            if query_text:
                q_lower = query_text.lower()
                if q_lower not in m.content.lower() and q_lower not in m.title.lower():
                    continue

            results.append(
                LibrarySnippet(
                    id=m.id,
                    type=LibraryItemType(m.type),
                    title=m.title,
                    content=m.content,
                    category=m.category,
                    tags=tags,
                    variants=variants,
                    targetRoles=roles,
                    metrics=m.metrics,
                    createdAt=m.created_at.isoformat(),
                    updatedAt=m.updated_at.isoformat(),
                )
            )
        return results

    @staticmethod
    def get_snippet(db: Session, snippet_id: str) -> LibrarySnippet:
        m = db.query(LibraryItemModel).filter(LibraryItemModel.id == snippet_id).first()
        if not m:
            raise EntityNotFoundException("LibrarySnippet", snippet_id)
        tags = json.loads(m.tags_json) if m.tags_json else []
        variants = [BulletVariant.model_validate(v) for v in json.loads(m.variants_json or "[]")]
        roles = json.loads(m.target_roles_json or "[]")

        return LibrarySnippet(
            id=m.id,
            type=LibraryItemType(m.type),
            title=m.title,
            content=m.content,
            category=m.category,
            tags=tags,
            variants=variants,
            targetRoles=roles,
            metrics=m.metrics,
            createdAt=m.created_at.isoformat(),
            updatedAt=m.updated_at.isoformat(),
        )

    @staticmethod
    def create_snippet(db: Session, request: CreateLibrarySnippetRequest) -> LibrarySnippet:
        new_id = str(uuid.uuid4())
        model = LibraryItemModel(
            id=new_id,
            type=request.type.value,
            title=request.title,
            content=request.content,
            category=request.category,
            tags_json=json.dumps(request.tags),
            variants_json=json.dumps([v.model_dump() for v in request.variants]),
            target_roles_json=json.dumps(request.targetRoles),
            metrics=request.metrics,
        )
        db.add(model)
        db.commit()
        db.refresh(model)
        return LibraryService.get_snippet(db, new_id)

    @staticmethod
    def update_snippet(
        db: Session, snippet_id: str, request: UpdateLibrarySnippetRequest
    ) -> LibrarySnippet:
        m = db.query(LibraryItemModel).filter(LibraryItemModel.id == snippet_id).first()
        if not m:
            raise EntityNotFoundException("LibrarySnippet", snippet_id)

        if request.title is not None:
            m.title = request.title
        if request.content is not None:
            m.content = request.content
        if request.category is not None:
            m.category = request.category
        if request.tags is not None:
            m.tags_json = json.dumps(request.tags)
        if request.variants is not None:
            m.variants_json = json.dumps([v.model_dump() for v in request.variants])
        if request.targetRoles is not None:
            m.target_roles_json = json.dumps(request.targetRoles)
        if request.metrics is not None:
            m.metrics = request.metrics

        db.commit()
        db.refresh(m)
        return LibraryService.get_snippet(db, snippet_id)

    @staticmethod
    def delete_snippet(db: Session, snippet_id: str) -> None:
        m = db.query(LibraryItemModel).filter(LibraryItemModel.id == snippet_id).first()
        if not m:
            raise EntityNotFoundException("LibrarySnippet", snippet_id)
        db.delete(m)
        db.commit()
