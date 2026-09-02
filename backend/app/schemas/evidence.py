from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import EvidenceType
from app.schemas.source import validate_http_url


class EvidenceBase(BaseModel):
    """Core attributes linking an observation to a verifiable evidence artefact."""

    observation_id: Annotated[
        int,
        Field(
            gt=0,
            description="Foreign key referencing the substantiated observation record.",
            examples=[1],
        ),
    ]
    source_id: Annotated[
        int,
        Field(
            gt=0,
            description="Foreign key referencing the originating authoritative source organisation.",
            examples=[1],
        ),
    ]
    dataset_id: Annotated[
        int | None,
        Field(
            default=None,
            gt=0,
            description="Optional foreign key referencing the specific dataset publication.",
            examples=[1],
        ),
    ] = None
    evidence_type: Annotated[
        EvidenceType,
        Field(
            default=EvidenceType.DOCUMENT,
            description="Classification of the evidence artefact ('document', 'api_response', 'survey', 'satellite', 'other').",
            examples=[EvidenceType.DOCUMENT],
        ),
    ] = EvidenceType.DOCUMENT
    reference_url: Annotated[
        str | None,
        Field(
            default=None,
            description="HTTP/HTTPS URI pointing directly to the primary source or document artefact.",
            examples=["https://example.org/reports/canopy-audit-2024.pdf"],
        ),
    ] = None
    raw_excerpt: Annotated[
        str | None,
        Field(
            default=None,
            description="Verbatim citation or extracted quantitative text from the source artefact.",
            examples=["Sector 4 native canopy ratio measured at 0.87 +/- 0.02."],
        ),
    ] = None
    notes: Annotated[
        str | None,
        Field(
            default=None,
            description="Analytical notes, extraction methodology, or verification commentary.",
            examples=["Corroborated with satellite multispectral imagery."],
        ),
    ] = None

    @field_validator("reference_url")
    @classmethod
    def validate_reference_url(cls, v: str | None) -> str | None:
        return validate_http_url(v)

    @model_validator(mode="after")
    def validate_evidence_payload(self) -> "EvidenceBase":
        has_url = bool(self.reference_url and self.reference_url.strip())
        has_excerpt = bool(self.raw_excerpt and self.raw_excerpt.strip())
        has_notes = bool(self.notes and self.notes.strip())
        if not (has_url or has_excerpt or has_notes):
            raise ValueError(
                "Evidence must contain at least one artefact reference: 'reference_url', 'raw_excerpt', or 'notes'"
            )
        return self


class EvidenceCreate(EvidenceBase):
    """Payload schema for registering a new supporting evidence item."""
    pass


class EvidenceUpdate(BaseModel):
    """Payload schema for modifying an existing evidence item."""

    evidence_type: Annotated[
        EvidenceType | None,
        Field(
            default=None,
            description="Updated evidence classification.",
        ),
    ] = None
    reference_url: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated reference URL.",
        ),
    ] = None
    raw_excerpt: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated source quotation or data excerpt.",
        ),
    ] = None
    notes: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated verification notes.",
        ),
    ] = None

    @field_validator("reference_url")
    @classmethod
    def validate_reference_url(cls, v: str | None) -> str | None:
        return validate_http_url(v)


class EvidenceResponse(EvidenceBase):
    """Output representation of a stored evidence artefact."""

    id: Annotated[int, Field(description="Unique evidence record ID.", examples=[1])]
    created_at: Annotated[datetime, Field(description="Timestamp when the evidence item was recorded.")]

    model_config = ConfigDict(from_attributes=True)
