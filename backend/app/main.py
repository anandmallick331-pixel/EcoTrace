import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.routers import health
from app.routers.api import api_v1_router
from app.services.scenario import ScenarioService, CompositeScenarioEngine
from app.services.chilika_scenario import ChilikaScenarioEngine
from app.services.puri_scenario import PuriScenarioEngine

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "EcoTrace backend API. "
        "Tracks, verifies, and reports on regenerative tourism impact — "
        "ingesting sustainability observations, preserving full data provenance, "
        "and exposing metrics across destinations and time periods."
    ),
    
    docs_url="/docs",
    redoc_url="/redoc",
)

ScenarioService.register_engine(
    CompositeScenarioEngine([ChilikaScenarioEngine(), PuriScenarioEngine()])
)

# ── CORS Configuration ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)


@app.middleware("http")
async def catch_unhandled_exceptions_middleware(request: Request, call_next):
    """
    Middleware barrier catching unhandled exceptions and returning a secure 500 JSON payload,
    ensuring zero internal stack traces or database secrets leak to clients.
    """
    try:
        return await call_next(request)
    except Exception as exc:
        logger.error("Unhandled internal server error on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )


# ── Global Exception Handlers ──────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Standardized handler for HTTPExceptions (400, 404, 409, etc.)."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Standardized handler for schema validation failures (422)."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """Catch unhandled database uniqueness/integrity errors (409)."""
    logger.warning("Database integrity constraint violation: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "Database integrity constraint violation or duplicate record."},
    )


@app.exception_handler(500)
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all 500 handler ensuring zero internal stack traces, connection strings,
    or credentials leak to client responses in production.
    """
    logger.error("Unhandled internal server error on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ── Routers ────────────────────────────────────────────────────────────────────
# Root endpoints (for load balancers and backward compatibility)
app.include_router(health.router)

# Versioned API endpoints (/api/v1/...)
app.include_router(api_v1_router)


