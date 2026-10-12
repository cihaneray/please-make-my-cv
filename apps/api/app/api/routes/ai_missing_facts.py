from fastapi import APIRouter

from app.services.ai_missing_facts_service import MissingFactsRequest, generate_missing_facts

router = APIRouter(prefix="/ai", tags=["AI Assistance"])


@router.post("/missing-facts")
def missing_facts(request: MissingFactsRequest):
    return generate_missing_facts(request)
