import re
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import MetricDirection


class MetricDefinitionBase(BaseModel):
    """Core attributes defining a standardized sustainability metric."""

    code: Annotated[
        str,
        Field(
            min_length=2,
            max_length=128,
            description="Unique machine-readable snake_case identifier (e.g. 'co2_per_guest_night').",
            examples=["co2_per_guest_night"],
        ),
    ]
    version: Annotated[
        str,
        Field(
            default="1.0",
            description="Semantic version string of the metric methodology (e.g. '1.0', '2.1').",
            examples=["1.0"],
        ),
    ]
    name: Annotated[
        str,
        Field(
            min_length=1,
            max_length=255,
            description="Human-readable title of the metric.",
            examples=["CO2 Emissions per Guest Night"],
        ),
    ]
    category: Annotated[
        str,
        Field(
            min_length=1,
            max_length=128,
            description="Sustainability pillar or thematic domain (e.g. 'carbon', 'water', 'biodiversity').",
            examples=["carbon"],
        ),
    ]
    unit: Annotated[
        str,
        Field(
            min_length=1,
            max_length=64,
            description="Standardized unit of measurement (e.g. 'kg CO2e', 'L/guest', '%').",
            examples=["kg CO2e"],
        ),
    ]
    direction: Annotated[
        MetricDirection,
        Field(
            description="Optimization trajectory: 'higher_is_better', 'lower_is_better', or 'neutral'.",
            examples=[MetricDirection.LOWER_IS_BETTER],
        ),
    ]
    description: Annotated[
        str | None,
        Field(
            default=None,
            description="Methodological overview, calculation formulas, and standard boundaries.",
            examples=["Direct and indirect greenhouse gas emissions generated per guest night."],
        ),
    ]

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if not v:
            return "metric"
        v_clean = re.sub(r"[^a-zA-Z0-9_]+", "_", str(v).strip()).strip("_").lower()
        return v_clean or "metric"

    @field_validator("version", mode="before")
    @classmethod
    def validate_version(cls, v: str) -> str:
        if not v:
            return "1.0"
        v_str = str(v).strip().lstrip("vV").strip()
        if not re.match(r"^[0-9]+(\.[0-9]+)*$", v_str):
            m = re.search(r"[0-9]+(\.[0-9]+)*", str(v))
            return m.group(0) if m else "1.0"
        return v_str

    @field_validator("name", "category", "unit")
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Field cannot be empty or whitespace only")
        return v_stripped


class MetricDefinitionCreate(MetricDefinitionBase):
    """Payload schema for creating a new metric definition."""
    pass


class MetricDefinitionUpdate(BaseModel):
    """Payload schema for updating mutable fields of a metric definition."""

    name: Annotated[
        str | None,
        Field(
            default=None,
            min_length=1,
            max_length=255,
            description="Updated human-readable title.",
        ),
    ] = None
    category: Annotated[
        str | None,
        Field(
            default=None,
            min_length=1,
            max_length=128,
            description="Updated sustainability domain.",
        ),
    ] = None
    unit: Annotated[
        str | None,
        Field(
            default=None,
            min_length=1,
            max_length=64,
            description="Updated measurement unit.",
        ),
    ] = None
    direction: Annotated[
        MetricDirection | None,
        Field(
            default=None,
            description="Updated directionality preference.",
        ),
    ] = None
    description: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated methodological description.",
        ),
    ] = None

    @field_validator("name", "category", "unit")
    @classmethod
    def validate_non_empty_strings(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Field cannot be empty or whitespace only")
        return v_stripped


class MetricDefinitionResponse(MetricDefinitionBase):
    """Output representation of a stored metric definition."""

    id: Annotated[int, Field(description="Unique metric definition record ID.", examples=[1])]
    created_at: Annotated[datetime, Field(description="Timestamp when the metric definition was created.")]

    model_config = ConfigDict(from_attributes=True)
