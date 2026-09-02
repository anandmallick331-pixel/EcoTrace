"""
Pydantic schemas for BusinessRegistration.
"""

from datetime import datetime
from typing import Any
import json
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import BusinessRegistrationStatus


class BusinessRegistrationBase(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=255, description="Registered name of the enterprise")
    business_type: str = Field(..., min_length=2, max_length=100, description="Category of the business")
    destination_id: int = Field(..., description="Foreign key ID of the destination corridor")
    location: str = Field(..., min_length=2, max_length=255, description="Specific village, jetty, landmark")
    contact: str = Field(..., min_length=2, max_length=255, description="Primary contact name, phone, email")
    website: str | None = Field(None, max_length=255, description="Website or official social profile")
    price_range: str = Field(..., min_length=1, max_length=100, description="Approximate price range or tariff")
    local_employees: int = Field(..., ge=1, description="Number or ratio of local resident staff")
    local_procurement_percent: float = Field(..., ge=0.0, le=100.0, description="Percentage of supplies sourced locally")
    community_ownership: str = Field(..., min_length=2, max_length=100, description="Ownership structure")
    environmental_practices: list[str] = Field(default_factory=list, description="Active sustainability practices")
    evidence_details: str = Field(..., min_length=3, description="Statutory license, permit or co-op registration details")


class BusinessRegistrationCreate(BusinessRegistrationBase):
    pass


class BusinessRegistrationStatusUpdate(BaseModel):
    status: BusinessRegistrationStatus = Field(..., description="Target lifecycle status")
    reviewed_by: str = Field(..., min_length=2, max_length=255, description="Auditor / officer identity")
    review_notes: str | None = Field(None, description="Audit justification or rejection notes")


class BusinessRegistrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tracking_id: str
    business_name: str
    business_type: str
    destination_id: int
    destination_name: str | None = None
    location: str
    contact: str
    website: str | None
    price_range: str
    local_employees: int
    local_procurement_percent: float
    community_ownership: str
    environmental_practices: list[str]
    evidence_details: str
    status: BusinessRegistrationStatus
    submitted_at: datetime
    reviewed_at: datetime | None
    reviewed_by: str | None
    review_notes: str | None

    @field_validator("environmental_practices", mode="before")
    @classmethod
    def parse_practices(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
            return [p.strip() for p in v.split(",") if p.strip()]
        return []


class BusinessRegistrationListResponse(BaseModel):
    total: int
    items: list[BusinessRegistrationResponse]
