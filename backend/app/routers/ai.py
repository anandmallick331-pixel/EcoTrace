"""
FastAPI Router for EcoTrace AI Assistant (/api/v1/ai).
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.ai import AIAssistantStatus, AIAskRequest, AIAskResponse
from app.services.ai_assistant import AIAssistantService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.get(
    "/status",
    response_model=AIAssistantStatus,
    summary="Get EcoTrace AI Assistant service status and grounding metadata",
)
def get_ai_status(
    db: Annotated[Session, Depends(get_db)],
) -> AIAssistantStatus:
    service = AIAssistantService(db)
    return service.get_status()


@router.post(
    "/ask",
    response_model=AIAskResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask EcoTrace AI a grounded question about destination impact, evidence, or scenarios",
)
def ask_ai(
    request: AIAskRequest,
    db: Annotated[Session, Depends(get_db)],
) -> AIAskResponse:
    """
    Submits a natural-language query to the data-grounded EcoTrace AI assistant.
    Retrieves destination observations, empirical scores, provenance evidence, and scenarios,
    returning a structured response with supporting metrics and citations.
    """
    service = AIAssistantService(db)
    try:
        response = service.ask(request)
        return response
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        )
    except Exception as exc:
        logger.error("Error processing AI request for destination %s: %s", request.destination_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate grounded AI answer.",
        )
