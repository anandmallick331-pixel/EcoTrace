from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories.metric import MetricDefinitionRepository
from app.schemas.metric import (
    MetricDefinitionCreate,
    MetricDefinitionResponse,
    MetricDefinitionUpdate,
)
from app.services.metric import MetricDefinitionService

router = APIRouter(prefix="/metrics", tags=["Metrics"])


def get_metric_service(db: Session = Depends(get_db)) -> MetricDefinitionService:
    return MetricDefinitionService(MetricDefinitionRepository(db))


@router.get(
    "",
    response_model=list[MetricDefinitionResponse],
    summary="List metric definitions",
    description="Retrieve standardized sustainability metric definitions with optional code filtering and pagination.",
    responses={
        status.HTTP_200_OK: {"description": "List of metric definitions returned successfully."},
    },
)
def list_metrics(
    code: Annotated[str | None, Query(description="Filter by exact metric code (snake_case identifier).")] = None,
    skip: Annotated[int, Query(ge=0, description="Number of records to skip for pagination.")] = 0,
    limit: Annotated[int, Query(ge=1, le=100, description="Maximum number of records to return.")] = 100,
    service: MetricDefinitionService = Depends(get_metric_service),
) -> list[MetricDefinitionResponse]:
    if code:
        return list(service.get_by_code(code, skip=skip, limit=limit))
    return list(service.list(skip=skip, limit=limit))


@router.post(
    "",
    response_model=MetricDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a metric definition",
    description="Register a new standardized metric definition. The combination of (code, version) must be unique.",
    responses={
        status.HTTP_201_CREATED: {"description": "Metric definition created successfully."},
        status.HTTP_409_CONFLICT: {"description": "Metric definition with the specified (code, version) already exists."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in metric payload."},
    },
)
def create_metric(
    payload: MetricDefinitionCreate,
    service: MetricDefinitionService = Depends(get_metric_service),
) -> MetricDefinitionResponse:
    existing = service.get_by_code_version(payload.code, payload.version)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Metric definition '{payload.code}' version '{payload.version}' already exists",
        )
    return service.create(**payload.model_dump(exclude_unset=True))


@router.get(
    "/{metric_id}",
    response_model=MetricDefinitionResponse,
    summary="Get metric definition by ID",
    description="Retrieve a single metric definition by its internal database ID.",
    responses={
        status.HTTP_200_OK: {"description": "Metric definition retrieved successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Metric definition not found."},
    },
)
def get_metric(
    metric_id: Annotated[int, Path(description="Unique metric definition record ID.", ge=1)],
    service: MetricDefinitionService = Depends(get_metric_service),
) -> MetricDefinitionResponse:
    metric = service.get(metric_id)
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric definition with ID {metric_id} not found",
        )
    return metric


@router.get(
    "/code/{code}/version/{version}",
    response_model=MetricDefinitionResponse,
    summary="Get metric by code and version",
    description="Retrieve a specific version of a metric definition by its snake_case code identifier and version string.",
    responses={
        status.HTTP_200_OK: {"description": "Metric definition retrieved successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Metric definition not found for given code and version."},
    },
)
def get_metric_by_code_version(
    code: Annotated[str, Path(description="Metric snake_case code (e.g. 'co2_per_guest_night').")],
    version: Annotated[str, Path(description="Metric version string (e.g. '1.0').")],
    service: MetricDefinitionService = Depends(get_metric_service),
) -> MetricDefinitionResponse:
    metric = service.get_by_code_version(code, version)
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric definition with code '{code}' version '{version}' not found",
        )
    return metric


@router.patch(
    "/{metric_id}",
    response_model=MetricDefinitionResponse,
    summary="Update metric definition",
    description="Update mutable attributes (name, category, unit, direction, description) of an existing metric definition.",
    responses={
        status.HTTP_200_OK: {"description": "Metric definition updated successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Metric definition not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in update payload."},
    },
)
def update_metric(
    metric_id: Annotated[int, Path(description="Unique metric definition record ID.", ge=1)],
    payload: MetricDefinitionUpdate,
    service: MetricDefinitionService = Depends(get_metric_service),
) -> MetricDefinitionResponse:
    metric = service.get(metric_id)
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric definition with ID {metric_id} not found",
        )
    return service.update(metric, **payload.model_dump(exclude_unset=True))


@router.delete(
    "/{metric_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete metric definition",
    description="Remove an unreferenced metric definition from the system.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Metric definition deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Metric definition not found."},
    },
)
def delete_metric(
    metric_id: Annotated[int, Path(description="Unique metric definition record ID.", ge=1)],
    service: MetricDefinitionService = Depends(get_metric_service),
) -> None:
    metric = service.get(metric_id)
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric definition with ID {metric_id} not found",
        )
    service.delete(metric)
