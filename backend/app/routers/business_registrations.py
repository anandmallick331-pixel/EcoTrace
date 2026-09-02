"""
FastAPI Router for Business Registrations (/api/v1/business-registrations).
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.enums import BusinessRegistrationStatus
from app.repositories.business_registration import BusinessRegistrationRepository
from app.schemas.business_registration import (
    BusinessRegistrationCreate,
    BusinessRegistrationListResponse,
    BusinessRegistrationResponse,
    BusinessRegistrationStatusUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/business-registrations", tags=["Business Registrations"])


def _to_response_schema(reg) -> BusinessRegistrationResponse:
    dest_name = reg.destination.name if getattr(reg, "destination", None) else None
    return BusinessRegistrationResponse(
        id=reg.id,
        tracking_id=reg.tracking_id,
        business_name=reg.business_name,
        business_type=reg.business_type,
        destination_id=reg.destination_id,
        destination_name=dest_name,
        location=reg.location,
        contact=reg.contact,
        website=reg.website,
        price_range=reg.price_range,
        local_employees=reg.local_employees,
        local_procurement_percent=reg.local_procurement_percent,
        community_ownership=reg.community_ownership,
        environmental_practices=reg.environmental_practices_list,
        evidence_details=reg.evidence_details,
        status=BusinessRegistrationStatus(reg.status),
        submitted_at=reg.submitted_at,
        reviewed_at=reg.reviewed_at,
        reviewed_by=reg.reviewed_by,
        review_notes=reg.review_notes,
    )


@router.post(
    "",
    response_model=BusinessRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new local business registration for verification",
)
def create_business_registration(
    data: BusinessRegistrationCreate,
    db: Annotated[Session, Depends(get_db)],
) -> BusinessRegistrationResponse:
    """
    Submits a new local enterprise registration into the EcoTrace Consensus Registry.
    Always initializes with status PENDING_VERIFICATION and generates a server-side tracking ID.
    """
    repo = BusinessRegistrationRepository(db)
    reg = repo.create(data)
    logger.info(
        "Registered business %r for destination %s with tracking_id=%s (status=%s)",
        reg.business_name,
        reg.destination_id,
        reg.tracking_id,
        reg.status,
    )
    return _to_response_schema(reg)


@router.get(
    "",
    response_model=BusinessRegistrationListResponse,
    summary="List business registrations with optional destination and status filters",
)
def list_business_registrations(
    db: Annotated[Session, Depends(get_db)],
    destination_id: int | None = Query(None, description="Filter by destination ID"),
    status_filter: BusinessRegistrationStatus | None = Query(
        None, alias="status", description="Filter by status (PENDING_VERIFICATION, UNDER_AUDIT, VERIFIED, REJECTED)"
    ),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> BusinessRegistrationListResponse:
    repo = BusinessRegistrationRepository(db)
    items = repo.get_multi(
        destination_id=destination_id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    total = repo.count(destination_id=destination_id, status=status_filter)
    return BusinessRegistrationListResponse(
        total=total,
        items=[_to_response_schema(r) for r in items],
    )


@router.get(
    "/{id_or_tracking}",
    response_model=BusinessRegistrationResponse,
    summary="Retrieve registration details by database ID or tracking ID",
)
def get_business_registration(
    id_or_tracking: str,
    db: Annotated[Session, Depends(get_db)],
) -> BusinessRegistrationResponse:
    repo = BusinessRegistrationRepository(db)
    reg = None
    if id_or_tracking.isdigit():
        reg = repo.get_by_id(int(id_or_tracking))
    if not reg:
        reg = repo.get_by_tracking_id(id_or_tracking)
    
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business registration not found for identifier {id_or_tracking!r}",
        )
    return _to_response_schema(reg)


@router.patch(
    "/{id_or_tracking}/status",
    response_model=BusinessRegistrationResponse,
    summary="Update verification status (VERIFIED / REJECTED / UNDER_AUDIT)",
)
def update_business_registration_status(
    id_or_tracking: str,
    status_data: BusinessRegistrationStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> BusinessRegistrationResponse:
    repo = BusinessRegistrationRepository(db)
    reg = None
    if id_or_tracking.isdigit():
        reg = repo.get_by_id(int(id_or_tracking))
    if not reg:
        reg = repo.get_by_tracking_id(id_or_tracking)

    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business registration not found for identifier {id_or_tracking!r}",
        )

    updated = repo.update_status(reg.id, status_data)
    logger.info(
        "Updated business registration %s (id=%s) status to %s by %s",
        reg.tracking_id,
        reg.id,
        status_data.status.value,
        status_data.reviewed_by,
    )
    return _to_response_schema(updated)


@router.delete(
    "/{id_or_tracking}",
    status_code=status.HTTP_200_OK,
    summary="Delete a business registration permanently from history",
)
def delete_business_registration(
    id_or_tracking: str,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    repo = BusinessRegistrationRepository(db)
    reg = None
    if id_or_tracking.isdigit():
        reg = repo.get_by_id(int(id_or_tracking))
    if not reg:
        reg = repo.get_by_tracking_id(id_or_tracking)

    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business registration not found for identifier {id_or_tracking!r}",
        )

    reg_id = reg.id
    tracking_id = reg.tracking_id
    success = repo.delete(reg_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete registration {tracking_id}",
        )

    logger.info("Deleted business registration %s (id=%s) from history", tracking_id, reg_id)
    return {"status": "deleted", "id": reg_id, "tracking_id": tracking_id}

