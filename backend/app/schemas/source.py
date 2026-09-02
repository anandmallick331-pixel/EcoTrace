import re
from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


def validate_http_url(url: str | None) -> str | None:
    if url is None:
        return None
    url_stripped = url.strip()
    if not url_stripped:
        return None
    if not re.match(r"^https?://[^\s/$.?#].[^\s]*$", url_stripped, re.IGNORECASE):
        raise ValueError("URL must be a valid HTTP or HTTPS address (e.g. 'https://example.org')")
    return url_stripped


class SourceBase(BaseModel):
    """Core attributes identifying a data provider, NGO, academic institution, or government agency."""

    name: Annotated[
        str,
        Field(
            min_length=1,
            max_length=255,
            description="Unique name of the data publishing organization or platform.",
            examples=["New Zealand Department of Conservation (DOC)"],
        ),
    ]
    organisation: Annotated[
        str | None,
        Field(
            default=None,
            max_length=255,
            description="Parent body or organizational umbrella.",
            examples=["DOC NZ"],
        ),
    ] = None
    url: Annotated[
        str | None,
        Field(
            default=None,
            description="Official homepage or public domain portal URI.",
            examples=["https://www.doc.govt.nz"],
        ),
    ] = None
    description: Annotated[
        str | None,
        Field(
            default=None,
            description="Institutional mandate, credibility notes, or coverage scope.",
            examples=["Official government conservation agency maintaining national monitoring networks."],
        ),
    ] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Source name cannot be empty or whitespace only")
        return v_stripped

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        return validate_http_url(v)


class SourceCreate(SourceBase):
    """Payload schema for registering a new data source."""
    pass


class SourceUpdate(BaseModel):
    """Payload schema for updating data source metadata."""

    name: Annotated[
        str | None,
        Field(
            default=None,
            min_length=1,
            max_length=255,
            description="Updated source organization name.",
        ),
    ] = None
    organisation: Annotated[
        str | None,
        Field(
            default=None,
            max_length=255,
            description="Updated parent organization.",
        ),
    ] = None
    url: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated homepage URL.",
        ),
    ] = None
    description: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated description.",
        ),
    ] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Source name cannot be empty or whitespace only")
        return v_stripped

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        return validate_http_url(v)


class SourceResponse(SourceBase):
    """Output representation of a stored data source."""

    id: Annotated[int, Field(description="Unique source record ID.", examples=[1])]
    created_at: Annotated[datetime, Field(description="Timestamp when the source was registered.")]

    model_config = ConfigDict(from_attributes=True)


class DatasetBase(BaseModel):
    """Core attributes identifying a specific data release, report, or API endpoint collection."""

    source_id: Annotated[
        int,
        Field(
            gt=0,
            description="Foreign key referencing the publishing source organization.",
            examples=[1],
        ),
    ]
    name: Annotated[
        str,
        Field(
            min_length=1,
            max_length=255,
            description="Name or title of the dataset collection/report.",
            examples=["Fiordland Environmental State & Tourism Impact 2024"],
        ),
    ]
    version: Annotated[
        str | None,
        Field(
            default=None,
            max_length=64,
            description="Publication version or edition identifier.",
            examples=["2024.1"],
        ),
    ] = None
    publication_date: Annotated[
        date | None,
        Field(
            default=None,
            description="Date when the dataset was officially released (YYYY-MM-DD).",
            examples=["2024-03-01"],
        ),
    ] = None
    url: Annotated[
        str | None,
        Field(
            default=None,
            description="Direct link to download report or access API documentation.",
            examples=["https://www.doc.govt.nz/reports/fiordland-2024.pdf"],
        ),
    ] = None
    description: Annotated[
        str | None,
        Field(
            default=None,
            description="Scope, data collection dates, and methodologies summarized.",
            examples=["Annual environmental census covering terrestrial and marine reserve sectors."],
        ),
    ] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Dataset name cannot be empty or whitespace only")
        return v_stripped

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        return validate_http_url(v)


class DatasetCreate(DatasetBase):
    """Payload schema for creating a dataset under a source."""
    pass


class DatasetUpdate(BaseModel):
    """Payload schema for updating dataset release metadata."""

    name: Annotated[
        str | None,
        Field(
            default=None,
            min_length=1,
            max_length=255,
            description="Updated dataset name.",
        ),
    ] = None
    version: Annotated[
        str | None,
        Field(
            default=None,
            max_length=64,
            description="Updated version tag.",
        ),
    ] = None
    publication_date: Annotated[
        date | None,
        Field(
            default=None,
            description="Updated publication date (YYYY-MM-DD).",
        ),
    ] = None
    url: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated download/access URL.",
        ),
    ] = None
    description: Annotated[
        str | None,
        Field(
            default=None,
            description="Updated dataset description.",
        ),
    ] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Dataset name cannot be empty or whitespace only")
        return v_stripped

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        return validate_http_url(v)


class DatasetResponse(DatasetBase):
    """Output representation of a stored dataset collection."""

    id: Annotated[int, Field(description="Unique dataset record ID.", examples=[1])]
    created_at: Annotated[datetime, Field(description="Timestamp when the dataset was catalogued.")]

    model_config = ConfigDict(from_attributes=True)
