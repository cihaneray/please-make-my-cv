from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.models import AIReviewHistoryModel
from app.db.session import get_db
from app.services.ai_review_history_service import (
    SaveReview,
    save_review,
    scope_hash,
    serialize_review,
)

router = APIRouter(prefix="/ai/reviews", tags=["AI Review History"])


@router.post("", status_code=201)
def record_review(request: SaveReview, db: Session = Depends(get_db)):
    # CV id/revision come from the validated snapshot, never a separate user-supplied association.
    return save_review(db, request)


@router.get("")
def list_reviews(
    resume_id: str = Query(alias="resumeId", min_length=1, max_length=36),
    job_description: str = Query(alias="jobDescription", default="", max_length=21000),
    language: Literal["en", "tr"] = "en",
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(AIReviewHistoryModel)
        .filter_by(scope_hash=scope_hash(resume_id, job_description, language))
        .order_by(AIReviewHistoryModel.created_at.desc(), AIReviewHistoryModel.id.desc())
        .limit(limit)
        .all()
    )
    return [serialize_review(row) for row in rows]


@router.get("/{review_id}")
def read_review(review_id: str, db: Session = Depends(get_db)):
    row = db.get(AIReviewHistoryModel, review_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Review history entry not found")
    return serialize_review(row)
