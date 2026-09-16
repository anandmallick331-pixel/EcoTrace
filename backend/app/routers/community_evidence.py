"""
FastAPI Router for Public Community Evidence Submissions (/api/v1/community-evidence).

Allows tourists, local residents, researchers, and other non-official users
to submit documents (PDF, CSV, XLSX), public URLs, and text bulletins.
Guarantees isolation: does NOT create verified observations or run ingestion
pipelines without official audit.
"""

import logging
from typing import Annotated, Any, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.enums import CommunityEvidenceStatus, UserRole
from app.schemas.community_evidence import (
    AcceptAndVerifyRequest,
    AcceptAndVerifyResponse,
    ClarificationRequest,
    CommunityEvidenceCreate,
    CommunityEvidenceListResponse,
    CommunityEvidencePublicListResponse,
    CommunityEvidencePublicResponse,
    CommunityEvidenceResponse,
    CommunityEvidenceStatusUpdate,
    RejectRequest,
)
from app.services.auth import (
    get_current_user_info,
    get_current_user_role,
    require_official_or_admin,
)
from app.services.community_evidence import CommunityEvidenceService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community-evidence", tags=["Public Community Evidence"])


def get_community_evidence_service(db: Annotated[Session, Depends(get_db)]) -> CommunityEvidenceService:
    return CommunityEvidenceService(db)


@router.post(
    "/submit",
    response_model=CommunityEvidenceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit public evidence (PDF, CSV, XLSX, URL, text bulletin)",
    description=(
        "Public endpoint for non-official contributors (tourists, residents, researchers). "
        "Stores the submitted source, assigns a unique ECO-SUB-xxxx identifier, and marks "
        "the record as SUBMITTED. Does NOT modify verified EcoTrace observations."
    ),
)
async def submit_public_evidence(
    request: Request,
    service: Annotated[CommunityEvidenceService, Depends(get_community_evidence_service)],
) -> CommunityEvidenceResponse:
    content_type = request.headers.get("content-type", "").lower()
    file_bytes: Optional[bytes] = None
    filename: Optional[str] = None
    file_mime: Optional[str] = None
    create_payload: Optional[CommunityEvidenceCreate] = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        file_field = form.get("file")
        
        if file_field is not None and hasattr(file_field, "read"):
            file_bytes = await file_field.read()
            filename = getattr(file_field, "filename", "evidence_document")
            file_mime = getattr(file_field, "content_type", None)
        elif isinstance(file_field, str) and file_field.strip():
            file_bytes = file_field.encode("utf-8")
            filename = "bulletin_text.txt"
            file_mime = "text/plain"

        dest_id_raw = form.get("destination_id")
        dest_id: Optional[int] = None
        if dest_id_raw is not None and str(dest_id_raw).strip() != "":
            try:
                dest_id = int(dest_id_raw)
            except (ValueError, TypeError):
                dest_id = None

        def _clean(val: object) -> Optional[str]:
            if val is None:
                return None
            s = str(val).replace("\x00", "").strip()
            return s if s else None

        sub_type = _clean(form.get("submission_type")) or "text"
        if filename:
            fn_lower = filename.lower()
            if fn_lower.endswith(".pdf"):
                sub_type = "pdf"
            elif fn_lower.endswith(".csv"):
                sub_type = "csv"
            elif fn_lower.endswith(".xlsx") or fn_lower.endswith(".xls"):
                sub_type = "xlsx"

        create_payload = CommunityEvidenceCreate(
            submission_type=sub_type,
            description=_clean(form.get("description")) or "Community Evidence Submission",
            destination_id=dest_id,
            destination_name=_clean(form.get("destination_name")),
            metric_code=_clean(form.get("metric_code")),
            contributor_name=_clean(form.get("contributor_name")),
            contributor_email=_clean(form.get("contributor_email")),
            contributor_contact=_clean(form.get("contributor_contact")),
            source_url=_clean(form.get("source_url")),
            raw_text=_clean(form.get("raw_text")),
            file_name=filename,
        )
    else:
        # JSON payload
        body = await request.json()
        create_payload = CommunityEvidenceCreate(**body)

    try:
        response = await service.submit_evidence(
            data=create_payload,
            file_bytes=file_bytes,
            filename=filename,
            content_type=file_mime,
        )
        return response
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        logger.error("Evidence submission error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence submission failed: {str(e)}",
        )


@router.get(
    "",
    response_model=Union[CommunityEvidenceListResponse, CommunityEvidencePublicListResponse],
    summary="List community evidence submissions",
    description=(
        "Retrieve community evidence submissions. "
        "Authenticated officials/admins receive the full schema with all files, data, and notes. "
        "Public/unauthenticated callers receive a privacy-preserving sanitized summary."
    ),
)
def list_community_evidence(
    service: Annotated[CommunityEvidenceService, Depends(get_community_evidence_service)],
    destination_id: Optional[int] = Query(None, description="Filter by destination ID"),
    status_filter: Optional[CommunityEvidenceStatus] = Query(
        None, alias="status", description="Filter by status (SUBMITTED, UNDER_REVIEW, VERIFIED, NEEDS_CLARIFICATION, REJECTED)"
    ),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    role: UserRole = Depends(get_current_user_role),
) -> Union[CommunityEvidenceListResponse, CommunityEvidencePublicListResponse]:
    is_official = role in (UserRole.OFFICIAL, UserRole.ADMIN)
    total, items = service.list_submissions(
        destination_id=destination_id,
        status=status_filter,
        limit=limit,
        offset=offset,
        is_official=is_official,
    )
    if is_official:
        return CommunityEvidenceListResponse(total=total, items=items)
    return CommunityEvidencePublicListResponse(total=total, items=items)


@router.get(
    "/{id_or_submission_id}",
    response_model=Union[CommunityEvidenceResponse, CommunityEvidencePublicResponse],
    summary="Get community evidence submission by database ID or ECO-SUB-xxxx ID",
)
def get_community_evidence(
    id_or_submission_id: str,
    service: Annotated[CommunityEvidenceService, Depends(get_community_evidence_service)],
    role: UserRole = Depends(get_current_user_role),
) -> Union[CommunityEvidenceResponse, CommunityEvidencePublicResponse]:
    is_official = role in (UserRole.OFFICIAL, UserRole.ADMIN)
    sub = service.get_by_id_or_submission_id(id_or_submission_id, is_official=is_official)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Community evidence submission not found for identifier {id_or_submission_id!r}",
        )
    return sub


@router.post(
    "/{id_or_submission_id}/accept-and-verify",
    response_model=AcceptAndVerifyResponse,
    summary="Accept and verify community submission (Official Action)",
    description=(
        "Directly reuses already-stored file/URL/reference and pipes it into the EXISTING "
        "Auto Data Ingestion Pipeline. Creates verified observation, checks comparability & conflicts, "
        "and updates submission status to VERIFIED."
    ),
)
async def accept_and_verify_community_evidence(
    id_or_submission_id: str,
    payload: AcceptAndVerifyRequest,
    service: Annotated[CommunityEvidenceService, Depends(get_community_evidence_service)],
    user_info: Annotated[dict, Depends(get_current_user_info)],
    _auth: Annotated[UserRole, Depends(require_official_or_admin)],
) -> AcceptAndVerifyResponse:
    reviewer = payload.reviewer_name or user_info.get("name") or "EcoTrace Statutory Reviewer"
    try:
        sub_resp, ingestion_details = await service.accept_and_verify(
            id_or_code=id_or_submission_id,
            reviewer_name=reviewer,
            reason=payload.reason,
            override_dest_id=payload.override_destination_id,
            override_metric_code=payload.override_metric_code,
        )
        obs_id = ingestion_details.get("observation_id") if ingestion_details else None
        return AcceptAndVerifyResponse(
            submission=sub_resp,
            ingestion_success=True,
            observation_id=obs_id,
            message=f"Community submission {id_or_submission_id} accepted and ingested into verified data.",
            details=ingestion_details,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        )
    except Exception as e:
        logger.error("Accept & Verify error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Acceptance & Ingestion failed: {str(e)}",
        )


@router.post(
    "/{id_or_submission_id}/request-clarification",
    response_model=CommunityEvidenceResponse,
    summary="Request clarification from contributor (Official Action)",
)
def request_clarification_community_evidence(
    id_or_submission_id: str,
    payload: ClarificationRequest,
    service: Annotated[CommunityEvidenceService, Depends(get_community_evidence_service)],
    user_info: Annotated[dict, Depends(get_current_user_info)],
    _auth: Annotated[UserRole, Depends(require_official_or_admin)],
) -> CommunityEvidenceResponse:
    reviewer = payload.reviewer_name or user_info.get("name") or "EcoTrace Statutory Reviewer"
    try:
        return service.request_clarification(
            id_or_code=id_or_submission_id,
            reviewer_name=reviewer,
            reason=payload.reason,
            clarification_instructions=payload.clarification_instructions,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        )


@router.post(
    "/{id_or_submission_id}/reject",
    response_model=CommunityEvidenceResponse,
    summary="Reject community submission (Official Action)",
)
def reject_community_evidence(
    id_or_submission_id: str,
    payload: RejectRequest,
    service: Annotated[CommunityEvidenceService, Depends(get_community_evidence_service)],
    user_info: Annotated[dict, Depends(get_current_user_info)],
    _auth: Annotated[UserRole, Depends(require_official_or_admin)],
) -> CommunityEvidenceResponse:
    reviewer = payload.reviewer_name or user_info.get("name") or "EcoTrace Statutory Reviewer"
    try:
        return service.reject_submission(
            id_or_code=id_or_submission_id,
            reviewer_name=reviewer,
            reason=payload.reason,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        )


@router.patch(
    "/{id_or_submission_id}/status",
    response_model=CommunityEvidenceResponse,
    summary="Update community evidence review status (Official Action)",
)
def update_community_evidence_status(
    id_or_submission_id: str,
    status_data: CommunityEvidenceStatusUpdate,
    service: Annotated[CommunityEvidenceService, Depends(get_community_evidence_service)],
    _auth: Annotated[UserRole, Depends(require_official_or_admin)],
) -> CommunityEvidenceResponse:
    updated = service.update_status(id_or_submission_id, status_data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Community evidence submission not found for identifier {id_or_submission_id!r}",
        )
    return updated
