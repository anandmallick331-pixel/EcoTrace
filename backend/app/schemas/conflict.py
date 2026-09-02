"""
Pydantic Schemas for Source Conflict Resolution Layer.
Deterministic, transparent schemas for auditing competing observations.
Strictly categorical — NO numeric hierarchy scores.
"""

from datetime import date, datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    ComparabilityStatus,
    ConfidenceLevel,
    ConflictResolutionStatus,
    DestinationSpecificity,
    ObservationStatus,
)


class ConflictObservationDetail(BaseModel):
    """Snapshot of an observation participating in a conflict evaluation."""

    observation_id: Annotated[int, Field(description="Database Observation ID.")]
    original_value: Annotated[float | None, Field(default=None, description="Raw reported value.")]
    normalized_value: Annotated[float | None, Field(default=None, description="Harmonized numerical value.")]
    unit: Annotated[str | None, Field(default=None, description="Measurement unit.")]
    period_start: Annotated[date, Field(description="Start date of observation period.")]
    period_end: Annotated[date, Field(description="End date of observation period.")]
    status: Annotated[ObservationStatus, Field(description="Data verification state.")]
    confidence: Annotated[ConfidenceLevel, Field(description="Subjective confidence rating.")]
    destination_specificity: Annotated[DestinationSpecificity, Field(description="Geographic specificity.")]
    methodology: Annotated[str | None, Field(default=None, description="Reported methodology or derivation.")]
    source_name: Annotated[str | None, Field(default=None, description="Originating source name.")]
    source_organisation: Annotated[str | None, Field(default=None, description="Originating organisation.")]
    dataset_name: Annotated[str | None, Field(default=None, description="Publishing dataset name.")]
    document_title: Annotated[str | None, Field(default=None, description="Supporting document title if documented.")]
    evidence_count: Annotated[int, Field(default=0, description="Number of linked evidence artefacts.")]

    model_config = ConfigDict(from_attributes=True)


class CategoricalFactors(BaseModel):
    """Categorical evidence criteria comparing primary vs competing observation."""

    verification_comparison: Annotated[str, Field(description="Verification status comparison.")]
    specificity_comparison: Annotated[str, Field(description="Geographic specificity comparison.")]
    confidence_comparison: Annotated[str, Field(description="Confidence level comparison.")]
    evidence_backing_comparison: Annotated[str, Field(description="Corroborating documentary evidence comparison.")]
    authority_tier_comparison: Annotated[str, Field(description="Statutory/official publisher hierarchy comparison.")]

    model_config = ConfigDict(from_attributes=True)


class SourceConflictResponse(BaseModel):
    """Full deterministic audit response for a detected source conflict."""

    id: Annotated[int, Field(description="Conflict record ID.")]
    destination_id: Annotated[int, Field(description="Target destination ID.")]
    destination_name: Annotated[str | None, Field(default=None, description="Destination name.")]
    metric_definition_id: Annotated[int, Field(description="Metric definition ID.")]
    metric_code: Annotated[str, Field(description="Stable metric code.")]
    metric_name: Annotated[str, Field(description="Human-readable metric name.")]

    primary_observation: Annotated[ConflictObservationDetail, Field(description="First observation evaluated.")]
    competing_observation: Annotated[ConflictObservationDetail, Field(description="Competing observation evaluated.")]

    comparability_status: Annotated[ComparabilityStatus, Field(description="Result of the strict comparability gate.")]
    resolution_status: Annotated[ConflictResolutionStatus, Field(description="Deterministic resolution outcome.")]
    canonical_observation_id: Annotated[int | None, Field(default=None, description="Designated canonical observation ID (if RESOLVED_CANONICAL).")]

    reconciled_value: Annotated[float | None, Field(default=None, description="Reconciled quantitative value if status is RECONCILED.")] = None
    resolution_method: Annotated[str | None, Field(default=None, description="Machine-readable resolution method.")] = None
    resolution_reason: Annotated[str | None, Field(default=None, description="Resolution rationale / reason.")] = None
    resolver_version: Annotated[str | None, Field(default="source_conflict_v1", description="Resolver version string.")] = "source_conflict_v1"

    observed_range: Annotated[str | None, Field(default=None, description="Observed value range for unresolved conflicts (e.g. '3.2M – 3.5M').")] = None
    disparate_dimensions: Annotated[list[str], Field(default_factory=list, description="Specific dimensions where observations diverge in scope.")]
    missing_evidence: Annotated[list[str], Field(default_factory=list, description="Missing evidence metadata preventing decisive resolution.")]

    categorical_factors: Annotated[CategoricalFactors | dict[str, Any], Field(description="Categorical evidence factor breakdown.")]
    resolution_rationale: Annotated[str, Field(description="Transparent human-readable justification.")]

    created_at: Annotated[datetime, Field(description="Conflict evaluation timestamp.")]
    updated_at: Annotated[datetime, Field(description="Last update timestamp.")]

    model_config = ConfigDict(from_attributes=True)


class ConflictSummaryResponse(BaseModel):
    """High-level summary metrics of source conflict states."""

    destination_id: Annotated[int | None, Field(default=None, description="Destination ID if filtered.")]
    total_conflicts: Annotated[int, Field(description="Total detected conflicts evaluated.")]
    resolved_canonical: Annotated[int, Field(description="Number of canonical resolutions established.")]
    reconciled: Annotated[int, Field(description="Number of reconciled observations.")]
    disparate_scope: Annotated[int, Field(default=0, description="Number of disparate scope relationships (non-conflicting).")] = 0
    compatibility_mismatch: Annotated[int, Field(description="Number of comparability mismatches / disparate scopes.")]
    unresolved_conflict: Annotated[int, Field(description="Number of unresolved conflicts preserved for transparent audit.")]

    model_config = ConfigDict(from_attributes=True)

