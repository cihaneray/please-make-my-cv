from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai_service import AIService

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
