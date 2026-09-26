from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.analyzers.analyzer_service import AnalysisService
from app.db.session import get_db
from app.schemas.analysis import ResumeAnalysisReport, ResumeComparisonReport
from app.schemas.resume import (
    CreateResumeRequest,
    PatchResumeMetadataRequest,
    ResumeDocument,
    ResumeSummaryResponse,
    UpdateResumeRequest,
)
from app.services.comparison_service import ComparisonService
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.get("", response_model=list[ResumeSummaryResponse])
def list_resumes(
    include_archived: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    return ResumeService.list_resumes(db, include_archived=include_archived)


@router.post("", response_model=ResumeDocument, status_code=status.HTTP_201_CREATED)
def create_resume(
    request: CreateResumeRequest,
    db: Session = Depends(get_db),
):
    return ResumeService.create_resume(db, request)


@router.get("/{resume_id}", response_model=ResumeDocument)
def get_resume(
    resume_id: str,
    db: Session = Depends(get_db),
):
    return ResumeService.get_resume(db, resume_id)


@router.put("/{resume_id}", response_model=ResumeDocument)
def update_resume(
    resume_id: str,
    request: UpdateResumeRequest,
    db: Session = Depends(get_db),
):
    return ResumeService.update_resume(db, resume_id, request)


@router.patch("/{resume_id}/metadata", response_model=ResumeSummaryResponse)
def patch_resume_metadata(
    resume_id: str,
    request: PatchResumeMetadataRequest,
    db: Session = Depends(get_db),
):
    return ResumeService.patch_metadata(db, resume_id, request)


@router.post("/{resume_id}/duplicate", response_model=ResumeDocument)
def duplicate_resume(
    resume_id: str,
    title: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return ResumeService.duplicate_resume(db, resume_id, new_title=title)


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: str,
    permanent: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    ResumeService.delete_resume(db, resume_id, permanent=permanent)


@router.get("/{resume_id}/analysis", response_model=ResumeAnalysisReport)
def analyze_resume(
    resume_id: str,
    db: Session = Depends(get_db),
):
    doc = ResumeService.get_resume(db, resume_id)
    return AnalysisService.analyze(doc)


@router.post("/{resume_id}/compare/{target_id}", response_model=ResumeComparisonReport)
def compare_resumes(
    resume_id: str,
    target_id: str,
    db: Session = Depends(get_db),
):
    source_doc = ResumeService.get_resume(db, resume_id)
    target_doc = ResumeService.get_resume(db, target_id)
    return ComparisonService.compare(source_doc, target_doc)
