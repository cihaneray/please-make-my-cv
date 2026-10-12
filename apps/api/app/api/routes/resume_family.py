from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.resume_family_service import ApplyFamilyRequest, apply_family, preview_family

router = APIRouter(prefix="/resumes", tags=["CV Family"])


@router.get("/{resume_id}/family")
def preview(resume_id: str, db: Session = Depends(get_db)):
    return preview_family(db, resume_id)


@router.post("/{resume_id}/family/apply")
def apply(resume_id: str, request: ApplyFamilyRequest, db: Session = Depends(get_db)):
    return apply_family(db, resume_id, request)
