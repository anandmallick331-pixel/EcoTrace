from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories.destination import DestinationRepository
from app.schemas.destination import (
    DestinationCreate,
    DestinationResponse,
    DestinationUpdate,
)
from app.schemas.scenario import ScenarioCreate, ScenarioResponse
from app.schemas.scoring import OverallScore, ScoreOverview
from app.services.destination import DestinationService
from app.services.scenario import ScenarioService
from app.services.scoring import ScoringService

router = APIRouter(prefix="/destinations", tags=["Destinations"])


def get_destination_service(db: Session = Depends(get_db)) -> DestinationService:
    return DestinationService(DestinationRepository(db))


def get_scoring_service(db: Session = Depends(get_db)) -> ScoringService:
    return ScoringService(db)


def get_scenario_service(db: Session = Depends(get_db)) -> ScenarioService:
    return ScenarioService(db)


@router.get(
    "",
    response_model=list[DestinationResponse],
    summary="List destinations",
    description="Retrieve all registered destinations with optional filtering by ISO-3 country code or exact destination name.",
    responses={
        status.HTTP_200_OK: {"description": "List of destinations returned successfully."},
    },
)
def list_destinations(
    country_code: Annotated[str | None, Query(description="Filter by ISO-3 country code (e.g. 'NZL', 'ISL').")] = None,
    name: Annotated[str | None, Query(description="Filter by exact destination name.")] = None,
    skip: Annotated[int, Query(ge=0, description="Number of records to skip for pagination.")] = 0,
    limit: Annotated[int, Query(ge=1, le=100, description="Maximum number of records to return.")] = 100,
    service: DestinationService = Depends(get_destination_service),
) -> list[DestinationResponse]:
    if name:
        dest = service.get_by_name(name)
        return [dest] if dest else []
    if country_code:
        return list(service.get_by_country(country_code, skip=skip, limit=limit))
    return list(service.list(skip=skip, limit=limit))


@router.post(
    "",
    response_model=DestinationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a destination",
    description="Register a new geographic destination.",
    responses={
        status.HTTP_201_CREATED: {"description": "Destination registered successfully."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in destination payload."},
    },
)
def create_destination(
    payload: DestinationCreate,
    service: DestinationService = Depends(get_destination_service),
) -> DestinationResponse:
    return service.create(**payload.model_dump(exclude_unset=True))


@router.get(
    "/{destination_id}",
    response_model=DestinationResponse,
    summary="Get destination by ID",
    description="Retrieve a single destination record by its internal database ID.",
    responses={
        status.HTTP_200_OK: {"description": "Destination record returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Destination not found."},
    },
)
def get_destination(
    destination_id: Annotated[int, Path(description="Unique destination record ID.", ge=1)],
    service: DestinationService = Depends(get_destination_service),
) -> DestinationResponse:
    dest = service.get(destination_id)
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination with ID {destination_id} not found",
        )
    return dest


@router.patch(
    "/{destination_id}",
    response_model=DestinationResponse,
    summary="Update destination",
    description="Update mutable attributes (name, country_code, region, description) of an existing destination.",
    responses={
        status.HTTP_200_OK: {"description": "Destination updated successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Destination not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in update payload."},
    },
)
def update_destination(
    destination_id: Annotated[int, Path(description="Unique destination record ID.", ge=1)],
    payload: DestinationUpdate,
    service: DestinationService = Depends(get_destination_service),
) -> DestinationResponse:
    dest = service.get(destination_id)
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination with ID {destination_id} not found",
        )
    return service.update(dest, **payload.model_dump(exclude_unset=True))


@router.delete(
    "/{destination_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete destination",
    description="Remove a destination record and all its associated child locations and scores.",
    responses={
        status.HTTP_204_NO_CONTENT: {"description": "Destination deleted successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Destination not found."},
    },
)
def delete_destination(
    destination_id: Annotated[int, Path(description="Unique destination record ID.", ge=1)],
    service: DestinationService = Depends(get_destination_service),
) -> None:
    dest = service.get(destination_id)
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination with ID {destination_id} not found",
        )
    service.delete(dest)


@router.get(
    "/{destination_id}/scores",
    response_model=OverallScore,
    summary="Get destination sustainability scores and category breakdown",
    description="Fetch the aggregated composite sustainability score and thematic category score breakdown for a destination.",
    responses={
        status.HTTP_200_OK: {"description": "Sustainability scores returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Destination not found."},
    },
)
def get_destination_scores(
    destination_id: Annotated[int, Path(description="Unique destination record ID.", ge=1)],
    destination_service: DestinationService = Depends(get_destination_service),
    scoring_service: ScoringService = Depends(get_scoring_service),
) -> OverallScore:
    dest = destination_service.get(destination_id)
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination with ID {destination_id} not found",
        )
    return scoring_service.get_scores(destination_id)


@router.get(
    "/{destination_id}/scores/overview",
    response_model=ScoreOverview,
    summary="Get destination sustainability score overview",
    description="Fetch a summary overview of destination score, verification completeness, and category highlights.",
    responses={
        status.HTTP_200_OK: {"description": "Score overview returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Destination not found."},
    },
)
def get_destination_score_overview(
    destination_id: Annotated[int, Path(description="Unique destination record ID.", ge=1)],
    destination_service: DestinationService = Depends(get_destination_service),
    scoring_service: ScoringService = Depends(get_scoring_service),
) -> ScoreOverview:
    dest = destination_service.get(destination_id)
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination with ID {destination_id} not found",
        )
    return scoring_service.get_score_overview(destination_id)


# ── Scenario Simulation & Intervention Endpoints ─────────────────────────────

@router.post(
    "/{destination_id}/scenarios",
    response_model=ScenarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a destination scenario simulation",
    description="Initialize an intervention scenario projection for a destination. Connects to pluggable scenario engines, or returns a standardized uncomputed projection contract with null/empty metrics by default.",
    responses={
        status.HTTP_201_CREATED: {"description": "Scenario simulation contract generated successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Destination not found."},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error in scenario payload."},
    },
)
def create_destination_scenario(
    destination_id: Annotated[int, Path(description="Target destination ID.", ge=1)],
    payload: ScenarioCreate,
    destination_service: DestinationService = Depends(get_destination_service),
    scenario_service: ScenarioService = Depends(get_scenario_service),
) -> ScenarioResponse:
    dest = destination_service.get(destination_id)
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination with ID {destination_id} not found",
        )
    return scenario_service.create_scenario(destination_id, payload)


@router.get(
    "/{destination_id}/scenarios/{scenario_id}",
    response_model=ScenarioResponse,
    summary="Get destination scenario simulation by ID",
    description="Retrieve the projection results, affected metrics, score deltas, and assumptions for a specific scenario simulation ID.",
    responses={
        status.HTTP_200_OK: {"description": "Scenario simulation retrieved successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Destination or scenario not found."},
    },
)
def get_destination_scenario(
    destination_id: Annotated[int, Path(description="Target destination ID.", ge=1)],
    scenario_id: Annotated[str, Path(description="Unique scenario simulation ID (UUID).")],
    destination_service: DestinationService = Depends(get_destination_service),
    scenario_service: ScenarioService = Depends(get_scenario_service),
) -> ScenarioResponse:
    dest = destination_service.get(destination_id)
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination with ID {destination_id} not found",
        )
    scenario = scenario_service.get_scenario(destination_id, scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario with ID '{scenario_id}' not found for Destination {destination_id}",
        )
    return scenario

