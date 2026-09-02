from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings
from app.db import check_db_connection

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    environment: str
    db_status: str  # "ok" | "unreachable"


@router.get("/health", response_model=HealthResponse, summary="Health check")
def health_check() -> HealthResponse:
    """
    Returns the current operational status of the API.
    db_status reflects whether the PostgreSQL connection is reachable.
    Used by load balancers, monitoring tools, and CI pipelines.
    """
    db_ok = check_db_connection()
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.env,
        db_status="ok" if db_ok else "unreachable",
    )
