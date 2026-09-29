from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.schemas.resume import ResumeDocument
from app.services.ai_service import AIService
from app.services.llm_service import (
    ConnectionUpdate,
    completion,
    public_connection,
    review_resume,
    save_connection,
)

router = APIRouter(prefix="/ai", tags=["AI Assistance"])


class RewriteBulletRequest(BaseModel):
    bullet: str
    tone: str = "technical"  # "technical" | "concise" | "business"


class ImproveSummaryRequest(BaseModel):
    summary: str
    targetRole: str = ""


@router.post("/rewrite-bullet")
def rewrite_bullet(request: RewriteBulletRequest):
    return AIService.rewrite_bullet(request.bullet, request.tone)


@router.post("/improve-summary")
def improve_summary(request: ImproveSummaryRequest):
    return AIService.improve_summary(request.summary, request.targetRole)


class ReviewRequest(BaseModel):
    document: ResumeDocument
    jobDescription: str = Field(default="", max_length=21000)
    language: Literal["en", "tr"] = "en"


@router.get("/settings")
def get_settings():
    return public_connection()


@router.put("/settings")
def update_settings(request: ConnectionUpdate):
    return save_connection(request)


@router.post("/test")
def test_connection():
    completion('Return a JSON object with "ok": true.', {"task": "connection test; no resume data"})
    return {"ok": True, "message": "Connection succeeded and the model returned JSON."}


@router.post("/review")
def review(request: ReviewRequest):
    return review_resume(request.document, request.jobDescription, request.language)
