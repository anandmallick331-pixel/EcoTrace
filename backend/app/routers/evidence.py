from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories.dataset import DatasetRepository
from app.repositories.evidence import EvidenceRepository
from app.repositories.observation import ObservationRepository
from app.repositories.source import SourceRepository
from app.schemas.evidence import EvidenceCreate, EvidenceResponse, EvidenceUpdate
from app.services.dataset import DatasetService
from app.services.evidence import EvidenceService
from app.services.observation import ObservationService
from app.services.source import SourceService

router = APIRouter(prefix="/evidence", tags=["Evidence"])


def get_evidence_service(db: Session = Depends(get_db)) -> EvidenceService:
    return EvidenceService(EvidenceRepository(db))


def get_observation_service(db: Session = Depends(get_db)) -> ObservationService:
    return ObservationService(ObservationRepository(db))


def get_source_service(db: Session = Depends(get_db)) -> SourceService:
    return SourceService(SourceRepository(db))


def get_dataset_service(db: Session = Depends(get_db)) -> DatasetService:
    return DatasetService(DatasetRepository(db))


@router.get(
    "",
    response_model=list[EvidenceResponse],
    summary="List evidence",
    description="Retrieve evidence artefacts with optional filters for observation, publishing source, or dataset.",
    responses={
        status.HTTP_200_OK: {"description": "List of evidence records returned successfully."},
    },
)
def list_evidence(
    observation_id: Annotated[int | None, Query(description="Filter evidence by observation ID.", ge=1)] = None,
    source_id: Annotated[int | None, Query(description="Filter evidence by publishing source ID.", ge=1)] = None,
    dataset_id: Annotated[int | None, Query(description="Filter evidence by dataset ID.", ge=1)] = None,
    skip: Annotated[int, Query(ge=0, description="Number of records to skip for pagination.")] = 0,
    limit: Annotated[int, Query(ge=1, le=100, description="Maximum number of records to return.")] = 100,
    service: EvidenceService = Depends(get_evidence_service),
) -> list[EvidenceResponse]:
    if observation_id is not None:
        return list(service.get_by_observation(observation_id, skip=skip, limit=limit))
    if source_id is not None:
        return list(service.get_by_source(source_id, skip=skip, limit=limit))
    if dataset_id is not None:
        return list(service.get_by_dataset(dataset_id, skip=skip, limit=limit))
    return list(service.list(skip=skip, limit=limit))


@router.post(
    "",
    response_model=EvidenceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an evidence item",
    description="Register a verifiable evidence item supporting an observation. Verifies foreign key existence and ensures dataset belongs to source when provided.",
    responses={
        status.HTTP_201_CREATED: {"description": "Evidence item created successfully."},
        status.HTTP_400_BAD_REQUEST: {"description": "Dataset does not belong to specified Source."},
        status.HTTP_404_NOT_FOUND: {"description": "Referenced observation, source, or dataset not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error (e.g. empty artefact references or invalid URL)."},
    },
)
def create_evidence(
    payload: EvidenceCreate,
    evidence_service: EvidenceService = Depends(get_evidence_service),
    observation_service: ObservationService = Depends(get_observation_service),
    source_service: SourceService = Depends(get_source_service),
    dataset_service: DatasetService = Depends(get_dataset_service),
) -> EvidenceResponse:
    # 1. Verify observation and source exist
    if not observation_service.get(payload.observation_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID {payload.observation_id} not found",
        )
    if not source_service.get(payload.source_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source with ID {payload.source_id} not found",
        )
    if payload.dataset_id is not None:
        ds = dataset_service.get(payload.dataset_id)
        if not ds:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset with ID {payload.dataset_id} not found",
            )
        if ds.source_id != payload.source_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dataset {payload.dataset_id} does not belong to Source {payload.source_id}",
            )

    return evidence_service.create(**payload.model_dump(exclude_unset=True))


@router.get(
    "/{evidence_id}",
    response_model=EvidenceResponse,
    summary="Get evidence by ID",
    description="Retrieve a single evidence item by its internal database ID.",
    responses={
        status.HTTP_200_OK: {"description": "Evidence record returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Evidence item not found."},
    },
)
def get_evidence(
    evidence_id: Annotated[int, Path(description="Unique evidence record ID.", ge=1)],
    service: EvidenceService = Depends(get_evidence_service),
) -> EvidenceResponse:
    ev = service.get(evidence_id)
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence item with ID {evidence_id} not found",
        )
    return ev


@router.patch(
    "/{evidence_id}",
    response_model=EvidenceResponse,
    summary="Update evidence",
    description="Update mutable attributes of an evidence artefact (evidence type, reference URL, raw excerpt, notes).",
    responses={
        status.HTTP_200_OK: {"description": "Evidence record updated successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Evidence item not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in update payload."},
    },
)
def update_evidence(
    evidence_id: Annotated[int, Path(description="Unique evidence record ID.", ge=1)],
    payload: EvidenceUpdate,
    service: EvidenceService = Depends(get_evidence_service),
) -> EvidenceResponse:
    ev = service.get(evidence_id)
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence item with ID {evidence_id} not found",
        )
    return service.update(ev, **payload.model_dump(exclude_unset=True))


@router.delete(
    "/{evidence_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete evidence",
    description="Remove an evidence item from an observation's audit trail.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Evidence item deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Evidence item not found."},
    },
)
def delete_evidence(
    evidence_id: Annotated[int, Path(description="Unique evidence record ID.", ge=1)],
    service: EvidenceService = Depends(get_evidence_service),
) -> None:
    ev = service.get(evidence_id)
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence item with ID {evidence_id} not found",
        )
    service.delete(ev)
