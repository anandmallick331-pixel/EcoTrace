from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    ConfidenceLevel,
    DestinationSpecificity,
    ObservationStatus,
)
from app.schemas.destination import LocationResponse
from app.schemas.evidence import EvidenceResponse
from app.schemas.metric import MetricDefinitionResponse
from app.schemas.source import DatasetResponse, SourceResponse


class ObservationProvenanceResponse(BaseModel):
    """
    Complete lineage and provenance audit trail for an observation.
    Traces the observation through its semantic metric definition, parent dataset,
    publishing source organisation, location, and all supporting evidence artefacts.
    """

    # Observation core details & quality metadata
    observation_id: Annotated[int, Field(description="Unique observation record ID.", examples=[1])]
    destination_id: Annotated[int, Field(description="Target destination ID.", examples=[1])]
    location_id: Annotated[int | None, Field(default=None, description="Linked spatial location ID if location-specific.", examples=[1])] = None
    location: Annotated[LocationResponse | None, Field(default=None, description="Spatial location details if location-specific.")] = None
    period_start: Annotated[date, Field(description="Observation measurement period start (YYYY-MM-DD).", examples=["2024-01-01"])]
    period_end: Annotated[date, Field(description="Observation measurement period end (YYYY-MM-DD).", examples=["2024-06-30"])]
    original_value: Annotated[float | None, Field(default=None, description="Raw quantitative value. 0.0 is distinct from null.", examples=[12.4])] = None
    normalized_value: Annotated[float | None, Field(default=None, description="Standardized quantitative value. 0.0 is distinct from null.", examples=[12.4])] = None
    status: Annotated[ObservationStatus, Field(description="Data verification state.", examples=[ObservationStatus.VERIFIED])]
    confidence: Annotated[ConfidenceLevel, Field(description="Confidence rating.", examples=[ConfidenceLevel.HIGH])]
    destination_specificity: Annotated[DestinationSpecificity, Field(description="Geographic specificity.", examples=[DestinationSpecificity.DIRECT])]
    methodology: Annotated[str | None, Field(default=None, description="Derived or measured methodology context.")] = None
    assumptions: Annotated[str | None, Field(default=None, description="Baseline assumptions context.")] = None
    notes: Annotated[str | None, Field(default=None, description="Analytical commentary and notes.")] = None
    created_at: Annotated[datetime, Field(description="Ingestion timestamp.")]
    updated_at: Annotated[datetime, Field(description="Last update timestamp.")]

    # Lineage chain entities
    metric_definition: Annotated[
        MetricDefinitionResponse,
        Field(description="Full metric definition with code, category, unit, and directionality."),
    ]
    dataset: Annotated[
        DatasetResponse,
        Field(description="Parent dataset publication details and versioning."),
    ]
    source: Annotated[
        SourceResponse,
        Field(description="Originating publisher organisation and primary source details."),
    ]
    evidence: Annotated[
        list[EvidenceResponse],
        Field(default_factory=list, description="Array of supporting evidence artefacts (documents, surveys, satellite records)."),
    ]

    model_config = ConfigDict(from_attributes=True)
