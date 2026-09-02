"""
API Router for Source Conflict Resolution Layer.
Exposes isolated, non-destructive endpoints for auditing conflicting sources,
reviewing the comparability gate, and inspecting canonical selections.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.enums import ConflictResolutionStatus
from app.schemas.conflict import ConflictSummaryResponse, SourceConflictResponse
from app.services.conflict_resolution import SourceConflictResolutionService

router = APIRouter(prefix="/conflicts", tags=["Source Conflicts"])


def get_conflict_service(db: Session = Depends(get_db)) -> SourceConflictResolutionService:
    return SourceConflictResolutionService(db)


@router.get(
    "/summary",
    response_model=ConflictSummaryResponse,
    summary="Get source conflict summary statistics",
    description="Retrieve high-level metrics on detected source conflicts, canonical resolutions, reconciliations, and unresolved conflicts.",
)
def get_conflict_summary(
    destination_id: Annotated[int | None, Query(description="Filter by destination ID.", ge=1)] = None,
    service: SourceConflictResolutionService = Depends(get_conflict_service),
) -> ConflictSummaryResponse:
    return service.get_summary(destination_id)


@router.get(
    "",
    response_model=list[SourceConflictResponse],
    summary="List source conflicts",
    description="Retrieve evaluated source conflicts across destinations with optional filtering by destination ID, metric ID, or resolution status.",
)
def list_conflicts(
    destination_id: Annotated[int | None, Query(description="Filter by destination ID.", ge=1)] = None,
    destination: Annotated[int | None, Query(description="Filter by destination ID (alias).", ge=1)] = None,
    metric_id: Annotated[int | None, Query(description="Filter by metric definition ID.", ge=1)] = None,
    metric: Annotated[int | None, Query(description="Filter by metric definition ID (alias).", ge=1)] = None,
    metric_definition_id: Annotated[int | None, Query(description="Filter by metric definition ID (alias).", ge=1)] = None,
    resolution_status: Annotated[ConflictResolutionStatus | None, Query(alias="status", description="Filter by resolution outcome.")] = None,
    service: SourceConflictResolutionService = Depends(get_conflict_service),
) -> list[SourceConflictResponse]:
    from sqlalchemy import select
    from sqlalchemy.orm import joinedload
    from app.models.conflict import SourceConflict
    from app.models.observation import Observation

    dest_filter = destination if destination is not None else destination_id
    metric_filter = metric if metric is not None else (metric_id if metric_id is not None else metric_definition_id)

    stmt = (
        select(SourceConflict)
        .options(
            joinedload(SourceConflict.destination),
            joinedload(SourceConflict.metric_definition),
            joinedload(SourceConflict.primary_observation).joinedload(Observation.dataset).joinedload(Observation.dataset.property.mapper.class_.source),
            joinedload(SourceConflict.competing_observation).joinedload(Observation.dataset).joinedload(Observation.dataset.property.mapper.class_.source),
        )
        .order_by(SourceConflict.id)
    )

    if dest_filter is not None:
        stmt = stmt.where(SourceConflict.destination_id == dest_filter)
    if metric_filter is not None:
        stmt = stmt.where(SourceConflict.metric_definition_id == metric_filter)
    if resolution_status is not None:
        stmt = stmt.where(SourceConflict.resolution_status == resolution_status)

    conflicts = list(service.db.scalars(stmt).unique().all())
    return [service.serialize_conflict(c) for c in conflicts]


# ── Phase 3: ObservationReconciliation Endpoints ──────────────────────────────

from app.schemas.reconciliation import ObservationReconciliationResponse


@router.get(
    "/reconciliations",
    response_model=list[ObservationReconciliationResponse],
    summary="List observation reconciliation records",
    description="Fetch formal Phase 3 ObservationReconciliation records with all members and roles (CANONICAL, ALTERNATIVE, CONTRIBUTING).",
)
def list_reconciliations(
    destination_id: Annotated[int | None, Query(description="Filter by destination ID.", ge=1)] = None,
    service: SourceConflictResolutionService = Depends(get_conflict_service),
) -> list[ObservationReconciliationResponse]:
    if destination_id is not None:
        recons = service.get_reconciliations_for_destination(destination_id)
    else:
        from sqlalchemy import select
        from app.models.reconciliation import ObservationReconciliation
        stmt = select(ObservationReconciliation).order_by(ObservationReconciliation.id)
        recons = list(service.db.scalars(stmt).unique().all())

    return [service.serialize_reconciliation(r) for r in recons]


@router.get(
    "/reconciliations/{reconciliation_id}",
    response_model=ObservationReconciliationResponse,
    summary="Get observation reconciliation by ID",
    description="Fetch a specific ObservationReconciliation record with its members, roles, machine-readable method, and resolver version.",
    responses={
        status.HTTP_200_OK: {"description": "Reconciliation record returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Reconciliation record not found."},
    },
)
def get_reconciliation(
    reconciliation_id: Annotated[int, Path(description="Reconciliation record ID.", ge=1)],
    service: SourceConflictResolutionService = Depends(get_conflict_service),
) -> ObservationReconciliationResponse:
    recon = service.get_reconciliation_by_id(reconciliation_id)
    if not recon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation reconciliation with ID {reconciliation_id} not found",
        )
    return service.serialize_reconciliation(recon)


@router.post(
    "/scan/{destination_id}",
    response_model=list[SourceConflictResponse],
    summary="Scan and evaluate destination source conflicts",
    description="Deterministically scans destination observations, applies the comparability gate, evaluates categorical evidence hierarchy, and records canonical outcomes.",
)
def scan_destination_conflicts(
    destination_id: Annotated[int, Path(description="Destination ID to scan.", ge=1)],
    service: SourceConflictResolutionService = Depends(get_conflict_service),
) -> list[SourceConflictResponse]:
    conflicts = service.scan_and_resolve_destination(destination_id)
    return [service.serialize_conflict(c) for c in conflicts]


@router.get(
    "/{conflict_id}",
    response_model=SourceConflictResponse,
    summary="Get conflict by ID",
    description="Retrieve detailed audit record of a specific source conflict, including categorical hierarchy factors and resolution rationale.",
    responses={
        status.HTTP_200_OK: {"description": "Conflict record returned successfully."},
        status.HTTP_404_NOT_FOUND: {"description": "Conflict record not found."},
    },
)
def get_conflict(
    conflict_id: Annotated[int, Path(description="Conflict record ID.", ge=1)],
    service: SourceConflictResolutionService = Depends(get_conflict_service),
) -> SourceConflictResponse:
    conflict = service.get_conflict_by_id(conflict_id)
    if not conflict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source conflict with ID {conflict_id} not found",
        )
    return service.serialize_conflict(conflict)

