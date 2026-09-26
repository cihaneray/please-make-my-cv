from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.import_export import (
    ImportApplyRequest,
    ImportPreviewResult,
    ImportValidateRequest,
    ImportValidationResult,
)
from app.schemas.resume import CreateResumeRequest, ResumeDocument
from app.services.conversion_service import ConversionService
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/import", tags=["Import"])


@router.post("/validate", response_model=ImportValidationResult)
def validate_import_content(request: ImportValidateRequest):
    doc, detected_fmt, warnings, errors = ConversionService.parse(request.content, request.format)
    schema_ver = doc.metadata.schemaVersion if doc else 1
    return ImportValidationResult(
        valid=len(errors) == 0 and doc is not None,
        detectedFormat=detected_fmt,
        schemaVersion=schema_ver,
        warnings=warnings,
        errors=errors,
    )


@router.post("/preview", response_model=ImportPreviewResult)
def preview_import_content(request: ImportValidateRequest):
    doc, detected_fmt, warnings, errors = ConversionService.parse(request.content, request.format)

    summary: dict[str, int] = {}
    if doc:
        summary = {
            "experience": len(doc.experience),
            "education": len(doc.education),
            "projects": len(doc.projects),
            "skills": sum(len(g.skills) for g in doc.skills),
            "certifications": len(doc.certifications),
            "languages": len(doc.languages),
            "customSections": len(doc.customSections),
        }

    return ImportPreviewResult(
        valid=len(errors) == 0 and doc is not None,
        detectedFormat=detected_fmt,
        schemaVersion=doc.metadata.schemaVersion if doc else 1,
        warnings=warnings,
        errors=errors,
        previewDocument=doc,
        sectionSummary=summary,
    )


@router.post("/apply", response_model=ResumeDocument, status_code=status.HTTP_201_CREATED)
def apply_import(request: ImportApplyRequest, db: Session = Depends(get_db)):
    doc = request.document
    title = request.targetTitle or doc.metadata.title or "Imported Resume"

    create_req = CreateResumeRequest(
        title=title,
        targetRole=doc.metadata.targetRole,
        templateId=doc.metadata.templateId,
        initialData=doc,
    )
    return ResumeService.create_resume(db, create_req)
