"""
Pydantic Schemas for Phase 3 ObservationReconciliation and Members.
"""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    ConflictResolutionStatus,
    ReconciliationMemberRole,
    ResolutionMethod,
)
from app.schemas.conflict import ConflictObservationDetail


class ObservationReconciliationMemberResponse(BaseModel):
    """Member observation participating in a reconciliation record with explicit role."""

    id: Annotated[int, Field(description="Reconciliation member ID.")]
    reconciliation_id: Annotated[int, Field(description="Parent reconciliation record ID.")]
    observation_id: Annotated[int, Field(description="Underlying observation ID.")]
    role: Annotated[ReconciliationMemberRole, Field(description="Role: CANONICAL, ALTERNATIVE, or CONTRIBUTING.")]
    observation: Annotated[ConflictObservationDetail | None, Field(default=None, description="Detailed observation snapshot.")]

    model_config = ConfigDict(from_attributes=True)


class ObservationReconciliationResponse(BaseModel):
    """Formal audit trail of observation reconciliation per Phase 3 requirements."""

    id: Annotated[int, Field(description="Reconciliation record ID.")]
    metric_id: Annotated[int, Field(description="Metric definition ID.")]
    metric_code: Annotated[str, Field(description="Stable metric code.")]
    metric_name: Annotated[str, Field(description="Metric name.")]
    destination_id: Annotated[int, Field(description="Destination ID.")]
    destination_name: Annotated[str | None, Field(default=None, description="Destination name.")]
    location_id: Annotated[int | None, Field(default=None, description="Location ID if localized.")]

    status: Annotated[ConflictResolutionStatus, Field(description="Status: SELECTED, RECONCILED, UNRESOLVED_CONFLICT, or DISPARATE_SCOPE.")]
    canonical_observation_id: Annotated[int | None, Field(default=None, description="Canonical observation ID if selected.")]

    reconciled_value: Annotated[float | None, Field(default=None, description="Reconciled quantitative value if methodologically combined.")]
    reconciled_unit: Annotated[str | None, Field(default=None, description="Reconciled measurement unit.")]

    resolution_method: Annotated[ResolutionMethod, Field(description="Machine-readable resolution method.")]
    resolution_reason: Annotated[str, Field(description="Human-readable justification describing decisive factors.")]
    comparability_reason: Annotated[str | None, Field(default=None, description="Comparability gate explanation.")]

    resolver_version: Annotated[str, Field(default="source_conflict_v1", description="Versioning identifier for the reconciliation methodology.")]

    members: Annotated[list[ObservationReconciliationMemberResponse], Field(default_factory=list, description="Associated observations and their roles.")]

    created_at: Annotated[datetime, Field(description="Creation timestamp.")]
    updated_at: Annotated[datetime, Field(description="Last update timestamp.")]

    model_config = ConfigDict(from_attributes=True)
