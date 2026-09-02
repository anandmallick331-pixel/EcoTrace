from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories.dataset import DatasetRepository
from app.repositories.source import SourceRepository
from app.schemas.source import DatasetCreate, DatasetResponse, DatasetUpdate
from app.services.dataset import DatasetService
from app.services.source import SourceService

router = APIRouter(prefix="/datasets", tags=["Datasets"])


def get_dataset_service(db: Session = Depends(get_db)) -> DatasetService:
    return DatasetService(DatasetRepository(db))


def get_source_service(db: Session = Depends(get_db)) -> SourceService:
    return SourceService(SourceRepository(db))


@router.get(
    "",
    response_model=list[DatasetResponse],
    summary="List datasets",
    description="Retrieve catalogued datasets with optional filters for parent source organisation or dataset name.",
    responses={
        status.HTTP_200_OK: {"description": "List of datasets returned successfully."},
    },
)
def list_datasets(
    source_id: Annotated[int | None, Query(description="Filter by publishing source ID.", ge=1)] = None,
    name: Annotated[str | None, Query(description="Filter by dataset name.")] = None,
    skip: Annotated[int, Query(ge=0, description="Number of records to skip for pagination.")] = 0,
    limit: Annotated[int, Query(ge=1, le=100, description="Maximum number of records to return.")] = 100,
    service: DatasetService = Depends(get_dataset_service),
) -> list[DatasetResponse]:
    if source_id is not None:
        return list(service.get_by_source(source_id, skip=skip, limit=limit))
    if name:
        return list(service.get_by_name(name, skip=skip, limit=limit))
    return list(service.list(skip=skip, limit=limit))


@router.post(
    "",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a dataset",
    description="Register a new dataset release under an existing publishing source organisation.",
    responses={
        status.HTTP_201_CREATED: {"description": "Dataset created successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Parent source not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in dataset payload."},
    },
)
def create_dataset(
    payload: DatasetCreate,
    dataset_service: DatasetService = Depends(get_dataset_service),
    source_service: SourceService = Depends(get_source_service),
) -> DatasetResponse:
    # Verify publishing source exists
    if not source_service.get(payload.source_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent source with ID {payload.source_id} not found",
        )
    return dataset_service.create(**payload.model_dump(exclude_unset=True))


@router.get(
    "/{dataset_id}",
    response_model=DatasetResponse,
    summary="Get dataset by ID",
    description="Retrieve a single dataset record by its internal database ID.",
    responses={
        status.HTTP_200_OK: {"description": "Dataset record returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Dataset not found."},
    },
)
def get_dataset(
    dataset_id: Annotated[int, Path(description="Unique dataset record ID.", ge=1)],
    service: DatasetService = Depends(get_dataset_service),
) -> DatasetResponse:
    ds = service.get(dataset_id)
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with ID {dataset_id} not found",
        )
    return ds


@router.patch(
    "/{dataset_id}",
    response_model=DatasetResponse,
    summary="Update dataset",
    description="Update mutable dataset attributes (name, version, publication date, url, description).",
    responses={
        status.HTTP_200_OK: {"description": "Dataset record updated successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Dataset not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in update payload."},
    },
)
def update_dataset(
    dataset_id: Annotated[int, Path(description="Unique dataset record ID.", ge=1)],
    payload: DatasetUpdate,
    service: DatasetService = Depends(get_dataset_service),
) -> DatasetResponse:
    ds = service.get(dataset_id)
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with ID {dataset_id} not found",
        )
    return service.update(ds, **payload.model_dump(exclude_unset=True))


@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete dataset",
    description="Remove a dataset record from the system.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Dataset deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Dataset not found."},
    },
)
def delete_dataset(
    dataset_id: Annotated[int, Path(description="Unique dataset record ID.", ge=1)],
    service: DatasetService = Depends(get_dataset_service),
) -> None:
    ds = service.get(dataset_id)
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with ID {dataset_id} not found",
        )
    service.delete(ds)
