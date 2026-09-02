import math
from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import ConfidenceLevel, DestinationSpecificity, ObservationStatus


def validate_finite_number(val: float | None, field_name: str) -> float | None:
    if val is None:
        return None
    if not math.isfinite(val):
        raise ValueError(f"{field_name} must be a finite number (cannot be NaN or Infinite)")
    return val


class ObservationBase(BaseModel):
    """Core attributes representing a verified or raw sustainability measurement."""

    destination_id: Annotated[
        int,
        Field(
            gt=0,
            description="Foreign key referencing the target destination.",
            examples=[1],
        ),
    ]
    location_id: Annotated[
        int | None,
        Field(
            default=None,
            gt=0,
            description="Optional foreign key referencing a specific sub-destination Location (monitoring station, hub, facility). None indicates a destination-wide observation.",
            examples=[1],
        ),
    ] = None
    metric_definition_id: Annotated[
        int,
        Field(
            gt=0,
            description="Foreign key referencing the standardized metric definition.",
            examples=[1],
        ),
    ]
    dataset_id: Annotated[
        int | None,
        Field(
            default=None,
            gt=0,
            description="Foreign key referencing the parent dataset collection.",
            examples=[1],
        ),
    ] = None
    period_start: Annotated[
        date,
        Field(
            description="Start date of the observation measurement period (YYYY-MM-DD).",
            examples=["2024-01-01"],
        ),
    ]
    period_end: Annotated[
        date,
        Field(
            description="End date of the observation measurement period (inclusive, YYYY-MM-DD).",
            examples=["2024-06-30"],
        ),
    ]
    original_value: Annotated[
        float | None,
        Field(
            default=None,
            description="Raw numerical value as reported by source. 0.0 is distinct from null.",
            examples=[12.4],
        ),
    ] = None
    normalized_value: Annotated[
        float | None,
        Field(
            default=None,
            description="Harmonised numerical value converted to standard metric units. 0.0 is distinct from null.",
            examples=[12.4],
        ),
    ] = None
    status: Annotated[
        ObservationStatus,
        Field(
            default=ObservationStatus.RAW,
            description="Data review/verification state ('raw', 'verified', 'flagged', 'rejected').",
            examples=[ObservationStatus.VERIFIED],
        ),
    ] = ObservationStatus.RAW
    confidence: Annotated[
        ConfidenceLevel,
        Field(
            default=ConfidenceLevel.UNKNOWN,
            description="Data reliability confidence level ('high', 'medium', 'low', 'unknown').",
            examples=[ConfidenceLevel.HIGH],
        ),
    ] = ConfidenceLevel.UNKNOWN
    destination_specificity: Annotated[
        DestinationSpecificity,
        Field(
            default=DestinationSpecificity.DIRECT,
            description="Geographic resolution ('direct', 'regional', 'national', 'modelled').",
            examples=[DestinationSpecificity.DIRECT],
        ),
    ] = DestinationSpecificity.DIRECT
    methodology: Annotated[
        str | None,
        Field(
            default=None,
            description="Detailed calculation methodology or empirical measurement procedure.",
            examples=["LiDAR aerial survey combined with on-ground canopy transect sampling."],
        ),
    ] = None
    assumptions: Annotated[
        str | None,
        Field(
            default=None,
            description="Key scientific or contextual assumptions underpinning the measurement.",
            examples=["Standardized across non-alpine native forest zones."],
        ),
    ] = None
    notes: Annotated[
        str | None,
        Field(
            default=None,
            description="Optional analyst commentary or quality caveats.",
            examples=["Quarterly audit complete."],
        ),
    ] = None

    @field_validator("original_value")
    @classmethod
    def validate_original_value(cls, v: float | None) -> float | None:
        return validate_finite_number(v, "original_value")

    @field_validator("normalized_value")
    @classmethod
    def validate_normalized_value(cls, v: float | None) -> float | None:
        return validate_finite_number(v, "normalized_value")

    @model_validator(mode="after")
    def validate_observation_rules(self) -> "ObservationBase":
        # 1. Period check: period_end >= period_start
        if self.period_end < self.period_start:
            raise ValueError(
                f"period_end ({self.period_end}) must be greater than or equal to period_start ({self.period_start})"
            )
        return self


class ObservationCreate(ObservationBase):
    """Payload schema for creating a new observation record."""

    @model_validator(mode="after")
    def validate_create_rules(self) -> "ObservationCreate":
        # Value presence: new observation must provide at least original_value or normalized_value
        if self.original_value is None and self.normalized_value is None:
            raise ValueError("Observation must provide at least one of 'original_value' or 'normalized_value'")
        return self


class ObservationUpdate(BaseModel):
    """Payload schema for updating observation values, review status, and metadata."""

    location_id: Annotated[
        int | None,
        Field(
            default=None,
            gt=0,
            description="Updated location ID or None for destination-wide.",
        ),
    ] = None
    original_value: Annotated[
        float | None,
        Field(
            default=None,
            description="Updated raw quantitative measurement.",
        ),
    ] = None
    normalized_value: Annotated[
        float | None,
        Field(
            default=None,
            description="Updated harmonised measurement.",
        ),
    ] = None
    status: Annotated[
        ObservationStatus | None,
        Field(
            default=None,
            description="Updated review status.",
        ),
    ] = None
    confidence: Annotated[
        ConfidenceLevel | None,
        Field(
            default=None,
            description="Updated confidence level.",
        ),
    ] = None
    destination_specificity: Annotated[
        DestinationSpecificity | None,
        Field(
            default=None,
            description="Updated measurement resolution.",
        ),
    ] = None
    methodology: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated methodology explanation.",
        ),
    ] = None
    assumptions: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated assumptions context.",
        ),
    ] = None
    notes: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated analyst notes.",
        ),
    ] = None

    @field_validator("original_value")
    @classmethod
    def validate_original_value(cls, v: float | None) -> float | None:
        return validate_finite_number(v, "original_value")

    @field_validator("normalized_value")
    @classmethod
    def validate_normalized_value(cls, v: float | None) -> float | None:
        return validate_finite_number(v, "normalized_value")


class ObservationResponse(ObservationBase):
    """Output representation of a stored observation."""

    id: Annotated[int, Field(description="Unique observation record ID.", examples=[1])]
    created_at: Annotated[datetime, Field(description="Timestamp when the observation was ingested.")]
    updated_at: Annotated[datetime, Field(description="Timestamp when the observation was last modified.")]

    model_config = ConfigDict(from_attributes=True)
