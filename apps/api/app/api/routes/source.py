from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationException
from app.db.session import get_db
from app.schemas.import_export import (
    DataFormat,
    SourceApplyRequest,
    SourceValidationRequest,
    SourceValidationResponse,
)
from app.schemas.resume import ResumeDocument, UpdateResumeRequest
from app.services.conversion_service import ConversionService
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/resumes/{resume_id}/source", tags=["Source Editor"])


@router.get("")
def get_resume_source(
    resume_id: str,
    format: DataFormat = Query(default=DataFormat.YAML),
    db: Session = Depends(get_db),
):
    if format not in (DataFormat.JSON, DataFormat.YAML):
        raise ValidationException("Use the Export endpoint for Markdown, HTML or PDF.")
    doc = ResumeService.get_resume(db, resume_id)
    text, mime_type, filename = ConversionService.export(doc, format)
    return {
        "format": format.value,
        "content": text,
        "revision": doc.metadata.revision,
    }


@router.post("/validate", response_model=SourceValidationResponse)
def validate_source(
    resume_id: str,
    request: SourceValidationRequest,
    db: Session = Depends(get_db),
):
    if request.format not in (DataFormat.JSON, DataFormat.YAML):
        raise ValidationException(
            "Source editing supports lossless JSON and YAML only. Use Import for Markdown."
        )
    doc, detected_fmt, warnings, errors = ConversionService.parse(request.content, request.format)
    return SourceValidationResponse(
        valid=len(errors) == 0 and doc is not None,
        errors=errors,
        warnings=warnings,
        normalizedDocument=doc,
    )


@router.put("", response_model=ResumeDocument)
def apply_source(
    resume_id: str,
    request: SourceApplyRequest,
    db: Session = Depends(get_db),
):
    if request.format not in (DataFormat.JSON, DataFormat.YAML):
        raise ValidationException(
            "Source editing supports lossless JSON and YAML only. Use Import for Markdown."
        )
    doc, detected_fmt, warnings, errors = ConversionService.parse(request.content, request.format)
    if errors or doc is None:
        raise ValidationException(
            "Source content contains syntax or schema errors.", details=errors
        )

    # Use ResumeService for transactional update & optimistic locking check
    update_req = UpdateResumeRequest(revision=request.revision, document=doc)
    return ResumeService.update_resume(db, resume_id, update_req)
