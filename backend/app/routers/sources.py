from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories.source import SourceRepository
from app.schemas.source import SourceCreate, SourceResponse, SourceUpdate
from app.services.source import SourceService

router = APIRouter(prefix="/sources", tags=["Sources"])


def get_source_service(db: Session = Depends(get_db)) -> SourceService:
    return SourceService(SourceRepository(db))


@router.get(
    "",
    response_model=list[SourceResponse],
    summary="List sources",
    description="Retrieve registered data publisher sources with optional name filtering and pagination.",
    responses={
        status.HTTP_200_OK: {"description": "List of sources returned successfully."},
    },
)
def list_sources(
    name: Annotated[str | None, Query(description="Filter by exact source name.")] = None,
    skip: Annotated[int, Query(ge=0, description="Number of records to skip for pagination.")] = 0,
    limit: Annotated[int, Query(ge=1, le=100, description="Maximum number of records to return.")] = 100,
    service: SourceService = Depends(get_source_service),
) -> list[SourceResponse]:
    if name:
        src = service.get_by_name(name)
        return [src] if src else []
    return list(service.list(skip=skip, limit=limit))


@router.post(
    "",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a source",
    description="Register a new authoritative data source publisher. The source name must be unique.",
    responses={
        status.HTTP_201_CREATED: {"description": "Source registered successfully."},
        status.HTTP_409_CONFLICT: {"description": "Source with given name already exists."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in source payload."},
    },
)
def create_source(
    payload: SourceCreate,
    service: SourceService = Depends(get_source_service),
) -> SourceResponse:
    existing = service.get_by_name(payload.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Source with name '{payload.name}' already exists",
        )
    return service.create(**payload.model_dump(exclude_unset=True))


@router.get(
    "/{source_id}",
    response_model=SourceResponse,
    summary="Get source by ID",
    description="Retrieve a single source record by its internal database ID.",
    responses={
        status.HTTP_200_OK: {"description": "Source record returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Source not found."},
    },
)
def get_source(
    source_id: Annotated[int, Path(description="Unique source record ID.", ge=1)],
    service: SourceService = Depends(get_source_service),
) -> SourceResponse:
    src = service.get(source_id)
    if not src:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source with ID {source_id} not found",
        )
    return src


@router.patch(
    "/{source_id}",
    response_model=SourceResponse,
    summary="Update source",
    description="Update mutable organization attributes (name, organisation, url, description) of an existing source.",
    responses={
        status.HTTP_200_OK: {"description": "Source record updated successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Source not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in update payload."},
    },
)
def update_source(
    source_id: Annotated[int, Path(description="Unique source record ID.", ge=1)],
    payload: SourceUpdate,
    service: SourceService = Depends(get_source_service),
) -> SourceResponse:
    src = service.get(source_id)
    if not src:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source with ID {source_id} not found",
        )
    return service.update(src, **payload.model_dump(exclude_unset=True))


@router.delete(
    "/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete source",
    description="Remove a source record from the system along with cascading deletion of its datasets.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Source deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Source not found."},
    },
)
def delete_source(
    source_id: Annotated[int, Path(description="Unique source record ID.", ge=1)],
    service: SourceService = Depends(get_source_service),
) -> None:
    src = service.get(source_id)
    if not src:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source with ID {source_id} not found",
        )
    service.delete(src)
