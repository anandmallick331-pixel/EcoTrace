import re
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DestinationBase(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=255)]
    description: str | None = None
    country_code: str | None = None
    region: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Destination name cannot be empty or whitespace only")
        return v_stripped

    @field_validator("country_code")
    @classmethod
    def validate_country_code(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v_upper = v.strip().upper()
        if not re.match(r"^[A-Z]{3}$", v_upper):
            raise ValueError("country_code must be a 3-letter ISO 3166-1 alpha-3 code (e.g. 'IND', 'GRC')")
        return v_upper


class DestinationCreate(DestinationBase):
    pass


class DestinationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    country_code: str | None = None
    region: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Destination name cannot be empty or whitespace only")
        return v_stripped

    @field_validator("country_code")
    @classmethod
    def validate_country_code(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v_upper = v.strip().upper()
        if not re.match(r"^[A-Z]{3}$", v_upper):
            raise ValueError("country_code must be a 3-letter ISO 3166-1 alpha-3 code")
        return v_upper


class DestinationResponse(DestinationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LocationBase(BaseModel):
    destination_id: Annotated[int, Field(gt=0)]
    label: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    geojson: str | None = None

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float | None) -> float | None:
        if v is not None and not (-90.0 <= v <= 90.0):
            raise ValueError("latitude must be between -90.0 and 90.0 degrees")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float | None) -> float | None:
        if v is not None and not (-180.0 <= v <= 180.0):
            raise ValueError("longitude must be between -180.0 and 180.0 degrees")
        return v


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    label: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    geojson: str | None = None

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float | None) -> float | None:
        if v is not None and not (-90.0 <= v <= 90.0):
            raise ValueError("latitude must be between -90.0 and 90.0 degrees")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float | None) -> float | None:
        if v is not None and not (-180.0 <= v <= 180.0):
            raise ValueError("longitude must be between -180.0 and 180.0 degrees")
        return v


class LocationResponse(LocationBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
