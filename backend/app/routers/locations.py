from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories.destination import DestinationRepository
from app.repositories.location import LocationRepository
from app.schemas.destination import (
    LocationCreate,
    LocationResponse,
    LocationUpdate,
)
from app.services.destination import DestinationService
from app.services.location import LocationService

router = APIRouter(prefix="/locations", tags=["Locations"])


def get_location_service(db: Session = Depends(get_db)) -> LocationService:
    return LocationService(LocationRepository(db))


def get_destination_service(db: Session = Depends(get_db)) -> DestinationService:
    return DestinationService(DestinationRepository(db))


@router.get("", response_model=list[LocationResponse], summary="List locations")
def list_locations(
    destination_id: Annotated[int | None, Query(description="Filter by parent destination ID")] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    service: LocationService = Depends(get_location_service),
) -> list[LocationResponse]:
    if destination_id is not None:
        return list(service.get_by_destination(destination_id, skip=skip, limit=limit))
    return list(service.list(skip=skip, limit=limit))


@router.post(
    "",
    response_model=LocationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a location",
)
def create_location(
    payload: LocationCreate,
    location_service: LocationService = Depends(get_location_service),
    destination_service: DestinationService = Depends(get_destination_service),
) -> LocationResponse:
    # Verify parent destination exists
    if not destination_service.get(payload.destination_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent destination with ID {payload.destination_id} not found",
        )
    return location_service.create(**payload.model_dump(exclude_unset=True))


@router.get("/{location_id}", response_model=LocationResponse, summary="Get location by ID")
def get_location(
    location_id: int,
    service: LocationService = Depends(get_location_service),
) -> LocationResponse:
    loc = service.get(location_id)
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location with ID {location_id} not found",
        )
    return loc


@router.patch("/{location_id}", response_model=LocationResponse, summary="Update location")
def update_location(
    location_id: int,
    payload: LocationUpdate,
    service: LocationService = Depends(get_location_service),
) -> LocationResponse:
    loc = service.get(location_id)
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location with ID {location_id} not found",
        )
    return service.update(loc, **payload.model_dump(exclude_unset=True))


@router.delete(
    "/{location_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete location",
)
def delete_location(
    location_id: int,
    service: LocationService = Depends(get_location_service),
) -> None:
    loc = service.get(location_id)
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location with ID {location_id} not found",
        )
    service.delete(loc)
