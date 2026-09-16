"""
Pydantic Schemas for Community Evidence Submissions.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CommunityEvidenceStatus, CommunityEvidenceType


class CommunityEvidenceCreate(BaseModel):
    submission_type: str = Field(
        default="text",
        description="Format of the submission (pdf, csv, xlsx, url, text)",
    )
    description: str = Field(
        ...,
        min_length=3,
        description="Description of what the evidence contains and context",
    )
    destination_id: Optional[int] = Field(
        default=None,
        description="Optional destination ID (e.g. 44 for Chilika, 103 for Puri)",
    )
    destination_name: Optional[str] = Field(
        default=None,
        description="Optional destination name if destination_id not known",
    )
    metric_code: Optional[str] = Field(
        default=None,
        description="Optional sustainability metric code or label",
    )
    contributor_name: Optional[str] = Field(
        default=None,
        description="Optional contributor name",
    )
    contributor_email: Optional[str] = Field(
        default=None,
        description="Optional contributor email address",
    )
    contributor_contact: Optional[str] = Field(
        default=None,
        description="Optional contributor phone or affiliation",
    )
    source_url: Optional[str] = Field(
        default=None,
        description="Optional public URL where the evidence is hosted",
    )
    raw_text: Optional[str] = Field(
        default=None,
        description="Optional bulletin/text content or excerpt",
    )
    file_name: Optional[str] = Field(
        default=None,
        description="Optional filename of the uploaded file",
    )


class CommunityEvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    submission_id: str
    submission_type: str
    description: str
    destination_id: Optional[int] = None
    destination_name: Optional[str] = None
    metric_code: Optional[str] = None
    contributor_name: Optional[str] = None
    contributor_email: Optional[str] = None
    contributor_contact: Optional[str] = None
    source_url: Optional[str] = None
    file_name: Optional[str] = None
    file_content_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    raw_text: Optional[str] = None
    status: CommunityEvidenceStatus = CommunityEvidenceStatus.SUBMITTED
    submitted_at: datetime
    last_updated_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    reviewer_role: Optional[str] = None
    decision_reason: Optional[str] = None
    review_notes: Optional[str] = None
    clarification_request: Optional[str] = None
    message: str = "Evidence submitted successfully."
    notice: str = "Your evidence will be reviewed by an authorized EcoTrace official before becoming verified data."


class CommunityEvidencePublicResponse(BaseModel):
    """
    Sanitized public schema for Community Evidence Submissions.
    Exposes only safe, non-confidential metadata:
    - Submission ID
    - Short evidence title / heading
    - Destination
    - Submission type (PDF / CSV / XLSX / URL / Bulletin / Text)
    - Status
    - Submitted date/time (IST-ready)
    - Contributor NAME ONLY

    Excludes all confidential data:
    - uploaded file contents & previews
    - file paths & sizes
    - raw text / extracted values
    - source URLs & document links
    - email addresses & phone numbers
    - detailed metric values & methodology
    - reviewer internal notes & decisions
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    submission_id: str
    title: str
    destination_id: Optional[int] = None
    destination_name: Optional[str] = None
    submission_type: str
    status: CommunityEvidenceStatus = CommunityEvidenceStatus.SUBMITTED
    submitted_at: datetime
    contributor_name: Optional[str] = None


class CommunityEvidenceListResponse(BaseModel):
    total: int
    items: List[CommunityEvidenceResponse]


class CommunityEvidencePublicListResponse(BaseModel):
    total: int
    items: List[CommunityEvidencePublicResponse]


class CommunityEvidenceStatusUpdate(BaseModel):
    status: CommunityEvidenceStatus
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None


class AcceptAndVerifyRequest(BaseModel):
    reviewer_name: Optional[str] = Field(None, description="Name or identifier of the reviewing official")
    reason: str = Field(
        ...,
        min_length=3,
        description="Mandatory reason justifying acceptance into verified data",
    )
    override_destination_id: Optional[int] = Field(None, description="Optional corrected destination ID")
    override_metric_code: Optional[str] = Field(None, description="Optional corrected metric code")


class ClarificationRequest(BaseModel):
    reviewer_name: Optional[str] = Field(None, description="Name or identifier of the reviewing official")
    reason: str = Field(
        ...,
        min_length=3,
        description="Mandatory reason explaining why clarification is required",
    )
    clarification_instructions: str = Field(
        ...,
        min_length=3,
        description="Specific instructions or missing details requested from contributor",
    )


class RejectRequest(BaseModel):
    reviewer_name: Optional[str] = Field(None, description="Name or identifier of the reviewing official")
    reason: str = Field(
        ...,
        min_length=3,
        description="Mandatory reason detailing why evidence was rejected",
    )


class AcceptAndVerifyResponse(BaseModel):
    submission: CommunityEvidenceResponse
    ingestion_success: bool
    observation_id: Optional[int] = None
    message: str
    details: Optional[dict] = None
