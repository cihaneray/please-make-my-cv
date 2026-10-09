from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.db.session import get_db
from app.schemas.analysis import PdfImportReport
from app.schemas.import_export import (
    ImportApplyRequest,
    ImportPreviewResult,
    ImportValidateRequest,
    ImportValidationResult,
)
from app.schemas.resume import CreateResumeRequest, ResumeDocument
from app.services.conversion_service import ConversionService
from app.services.pdf_import_service import review_pdf
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
    if request.overwriteExistingId is not None:
        from app.core.exceptions import ValidationException

        raise ValidationException(
            "Import creates a new resume. Use revision-protected updates to replace an existing document."
        )
    doc = request.document.model_copy(deep=True)
    doc.metadata.parentResumeId = None
    title = request.targetTitle or doc.metadata.title or "Imported Resume"

    create_req = CreateResumeRequest(
        title=title,
        targetRole=doc.metadata.targetRole,
        templateId=doc.design.template
        if "design" in doc.model_fields_set
        else doc.metadata.templateId,
        initialData=doc,
    )
    return ResumeService.create_resume(db, create_req)


@router.post("/pdf", response_model=PdfImportReport)
async def preview_pdf_import(file: UploadFile = File(...)):
    data = await file.read(4 * 1024 * 1024 + 1)
    await file.close()
    # PDF parsing runs in a bounded child process, outside the async request loop.
    return await run_in_threadpool(review_pdf, data, (file.filename or "resume.pdf")[:255])
