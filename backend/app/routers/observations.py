from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.enums import ObservationStatus
from app.repositories.dataset import DatasetRepository
from app.repositories.destination import DestinationRepository
from app.repositories.metric import MetricDefinitionRepository
from app.repositories.observation import ObservationRepository
from app.schemas.observation import (
    ObservationCreate,
    ObservationResponse,
    ObservationUpdate,
)
from app.schemas.provenance import ObservationProvenanceResponse
from app.services.dataset import DatasetService
from app.services.destination import DestinationService
from app.services.metric import MetricDefinitionService
from app.services.observation import ObservationService

router = APIRouter(prefix="/observations", tags=["Observations"])


def get_observation_service(db: Session = Depends(get_db)) -> ObservationService:
    return ObservationService(ObservationRepository(db))


def get_destination_service(db: Session = Depends(get_db)) -> DestinationService:
    return DestinationService(DestinationRepository(db))


def get_metric_service(db: Session = Depends(get_db)) -> MetricDefinitionService:
    return MetricDefinitionService(MetricDefinitionRepository(db))


def get_dataset_service(db: Session = Depends(get_db)) -> DatasetService:
    return DatasetService(DatasetRepository(db))


@router.get(
    "",
    response_model=list[ObservationResponse],
    summary="List observations",
    description="Retrieve recorded sustainability observations with optional filters for destination, metric, dataset, or review status.",
    responses={
        status.HTTP_200_OK: {"description": "List of observations returned successfully."},
    },
)
def list_observations(
    destination_id: Annotated[int | None, Query(description="Filter observations by destination ID.", ge=1)] = None,
    location_id: Annotated[int | None, Query(description="Filter observations by location ID.", ge=1)] = None,
    metric_definition_id: Annotated[int | None, Query(description="Filter observations by metric definition ID.", ge=1)] = None,
    dataset_id: Annotated[int | None, Query(description="Filter observations by parent dataset ID.", ge=1)] = None,
    status_filter: Annotated[ObservationStatus | None, Query(alias="status", description="Filter by data review/verification status.")] = None,
    skip: Annotated[int, Query(ge=0, description="Number of records to skip for pagination.")] = 0,
    limit: Annotated[int, Query(ge=1, le=100, description="Maximum number of records to return.")] = 100,
    service: ObservationService = Depends(get_observation_service),
) -> list[ObservationResponse]:
    if destination_id is not None:
        return list(service.get_by_destination(destination_id, skip=skip, limit=limit))
    if location_id is not None:
        return list(service.get_by_location(location_id, skip=skip, limit=limit))
    if metric_definition_id is not None:
        return list(service.get_by_metric(metric_definition_id, skip=skip, limit=limit))
    if dataset_id is not None:
        return list(service.get_by_dataset(dataset_id, skip=skip, limit=limit))
    if status_filter is not None:
        return list(service.get_by_status(status_filter, skip=skip, limit=limit))
    return list(service.list(skip=skip, limit=limit))


from app.repositories.location import LocationRepository
from app.services.location import LocationService

def get_location_service(db: Session = Depends(get_db)) -> LocationService:
    return LocationService(LocationRepository(db))


@router.post(
    "",
    response_model=ObservationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an observation",
    description="Ingest a new observation. Requires valid destination, metric definition, and dataset foreign keys. Enforces natural-key uniqueness across (destination_id, location_id, metric_definition_id, dataset_id, period_start, period_end).",
    responses={
        status.HTTP_201_CREATED: {"description": "Observation created and stored successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Referenced destination, location, metric definition, or dataset not found."},
        status.HTTP_409_CONFLICT: {"description": "Observation already exists for the given natural key combination."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in observation payload (e.g. inverted dates or missing values)."},
    },
)
def create_observation(
    payload: ObservationCreate,
    observation_service: ObservationService = Depends(get_observation_service),
    destination_service: DestinationService = Depends(get_destination_service),
    location_service: LocationService = Depends(get_location_service),
    metric_service: MetricDefinitionService = Depends(get_metric_service),
    dataset_service: DatasetService = Depends(get_dataset_service),
) -> ObservationResponse:
    # 1. Verify foreign key entities exist
    if not destination_service.get(payload.destination_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination with ID {payload.destination_id} not found",
        )
    if payload.location_id is not None and not location_service.get(payload.location_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location with ID {payload.location_id} not found",
        )
    if not metric_service.get(payload.metric_definition_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric definition with ID {payload.metric_definition_id} not found",
        )
    if not dataset_service.get(payload.dataset_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with ID {payload.dataset_id} not found",
        )

    # 2. Persist with natural-key uniqueness guard
    try:
        return observation_service.create(**payload.model_dump(exclude_unset=True))
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Observation already exists for this destination, metric, dataset, and time period",
        )


@router.get(
    "/{observation_id}",
    response_model=ObservationResponse,
    summary="Get observation by ID",
    description="Retrieve a single observation record by its internal database ID.",
    responses={
        status.HTTP_200_OK: {"description": "Observation record returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Observation not found."},
    },
)
def get_observation(
    observation_id: Annotated[int, Path(description="Unique observation record ID.", ge=1)],
    service: ObservationService = Depends(get_observation_service),
) -> ObservationResponse:
    obs = service.get(observation_id)
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID {observation_id} not found",
        )
    return obs


@router.patch(
    "/{observation_id}",
    response_model=ObservationResponse,
    summary="Update observation",
    description="Update mutable observation values, status, confidence, methodology, or notes.",
    responses={
        status.HTTP_200_OK: {"description": "Observation record updated successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Observation not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in update payload."},
    },
)
def update_observation(
    observation_id: Annotated[int, Path(description="Unique observation record ID.", ge=1)],
    payload: ObservationUpdate,
    service: ObservationService = Depends(get_observation_service),
) -> ObservationResponse:
    obs = service.get(observation_id)
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID {observation_id} not found",
        )
    return service.update(obs, **payload.model_dump(exclude_unset=True))


@router.delete(
    "/{observation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete observation",
    description="Delete an observation and cascade-delete all associated evidence items.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Observation deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Observation not found."},
    },
)
def delete_observation(
    observation_id: Annotated[int, Path(description="Unique observation record ID.", ge=1)],
    service: ObservationService = Depends(get_observation_service),
) -> None:
    obs = service.get(observation_id)
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID {observation_id} not found",
        )
    service.delete(obs)


@router.get(
    "/{observation_id}/provenance",
    response_model=ObservationProvenanceResponse,
    summary="Get complete observation provenance and evidence lineage",
    description="Fetch full audit lineage for an observation, traversing its metric definition, parent dataset, publishing source, and all supporting evidence artefacts.",
    responses={
        status.HTTP_200_OK: {"description": "Complete observation provenance and evidence lineage returned."},
        status.HTTP_404_NOT_FOUND: {"description": "Observation not found."},
    },
)
def get_observation_provenance(
    observation_id: Annotated[int, Path(description="Unique observation record ID.", ge=1)],
    service: ObservationService = Depends(get_observation_service),
) -> ObservationProvenanceResponse:
    provenance = service.get_provenance(observation_id)
    if not provenance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID {observation_id} not found",
        )
    return ObservationProvenanceResponse.model_validate(provenance)


from app.schemas.conflict import SourceConflictResponse


@router.get(
    "/{observation_id}/conflicts",
    response_model=list[SourceConflictResponse],
    summary="Get conflicts involving an observation",
    description="Retrieve evaluated source conflicts in which this observation participates (as primary, competing, or canonical).",
    responses={
        status.HTTP_200_OK: {"description": "List of conflicts involving this observation returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Observation not found."},
    },
)
def get_observation_conflicts(
    observation_id: Annotated[int, Path(description="Unique observation record ID.", ge=1)],
    db: Session = Depends(get_db),
    service: ObservationService = Depends(get_observation_service),
) -> list[SourceConflictResponse]:
    obs = service.get(observation_id)
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation with ID {observation_id} not found",
        )

    from sqlalchemy import or_, select
    from sqlalchemy.orm import joinedload
    from app.models.conflict import SourceConflict
    from app.models.observation import Observation
    from app.services.conflict_resolution import SourceConflictResolutionService

    stmt = (
        select(SourceConflict)
        .where(
            or_(
                SourceConflict.primary_observation_id == observation_id,
                SourceConflict.competing_observation_id == observation_id,
                SourceConflict.canonical_observation_id == observation_id,
            )
        )
        .options(
            joinedload(SourceConflict.destination),
            joinedload(SourceConflict.metric_definition),
            joinedload(SourceConflict.primary_observation).joinedload(Observation.dataset).joinedload(Observation.dataset.property.mapper.class_.source),
            joinedload(SourceConflict.competing_observation).joinedload(Observation.dataset).joinedload(Observation.dataset.property.mapper.class_.source),
        )
        .order_by(SourceConflict.id)
    )
    conflicts = list(db.scalars(stmt).unique().all())
    conflict_service = SourceConflictResolutionService(db)
    return [conflict_service.serialize_conflict(c) for c in conflicts]


