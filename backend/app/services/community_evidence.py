"""
Service for Community Evidence Submissions.

Enforces public evidence isolation:
- Public evidence is stored safely with status = SUBMITTED.
- Generates a unique Submission ID (e.g. ECO-SUB-1042).
- Public submissions MUST NOT directly create/update VERIFIED observations.
- Does NOT run normal verified ingestion yet.
- Does NOT modify scoring or conflict resolution.
"""

from datetime import datetime, timezone
import logging
import os
import re
from typing import Any, Optional, Sequence
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.community_evidence import CommunityEvidenceSubmission
from app.models.enums import CommunityEvidenceStatus
from app.repositories.community_evidence import CommunityEvidenceRepository
from app.schemas.community_evidence import (
    CommunityEvidenceCreate,
    CommunityEvidencePublicResponse,
    CommunityEvidenceResponse,
    CommunityEvidenceStatusUpdate,
)

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "community_evidence")


class CommunityEvidenceService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CommunityEvidenceRepository(db)

    def _ensure_upload_dir(self) -> str:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        return UPLOAD_DIR

    def _sanitize_filename(self, filename: str) -> str:
        clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)
        return clean[:128]

    def _to_response_schema(self, sub: CommunityEvidenceSubmission) -> CommunityEvidenceResponse:
        dest_name = sub.destination_name
        if not dest_name and sub.destination:
            dest_name = sub.destination.name

        return CommunityEvidenceResponse(
            id=sub.id,
            submission_id=sub.submission_id,
            submission_type=sub.submission_type,
            description=sub.description,
            destination_id=sub.destination_id,
            destination_name=dest_name,
            metric_code=sub.metric_code,
            contributor_name=sub.contributor_name,
            contributor_email=sub.contributor_email,
            contributor_contact=sub.contributor_contact,
            source_url=sub.source_url,
            file_name=sub.file_name,
            file_content_type=sub.file_content_type,
            file_size_bytes=sub.file_size_bytes,
            raw_text=sub.raw_text,
            status=CommunityEvidenceStatus(sub.status),
            submitted_at=sub.submitted_at,
            last_updated_at=sub.last_updated_at or sub.submitted_at,
            reviewed_at=sub.reviewed_at,
            reviewed_by=sub.reviewed_by,
            reviewer_role=sub.reviewer_role,
            decision_reason=sub.decision_reason,
            review_notes=sub.review_notes,
            clarification_request=sub.clarification_request,
            message="Evidence submitted successfully.",
            notice="Your evidence will be reviewed by an authorized EcoTrace official before becoming verified data.",
        )

    def _to_public_response_schema(self, sub: CommunityEvidenceSubmission) -> CommunityEvidencePublicResponse:
        dest_name = sub.destination_name
        if not dest_name and sub.destination:
            dest_name = sub.destination.name

        # Extract short title / heading from description
        raw_desc = (sub.description or "").strip()
        first_line = raw_desc.split("\n")[0].strip() if raw_desc else "Community Evidence Submission"
        title = first_line[:100] if len(first_line) > 100 else first_line
        if not title:
            title = "Community Evidence Submission"

        return CommunityEvidencePublicResponse(
            id=sub.id,
            submission_id=sub.submission_id,
            title=title,
            destination_id=sub.destination_id,
            destination_name=dest_name,
            submission_type=sub.submission_type,
            status=CommunityEvidenceStatus(sub.status),
            submitted_at=sub.submitted_at,
            contributor_name=sub.contributor_name or "Community Contributor",
        )

    async def submit_evidence(
        self,
        data: CommunityEvidenceCreate,
        file_bytes: Optional[bytes] = None,
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> CommunityEvidenceResponse:
        """
        Creates a Community Evidence Submission record.
        Saves file if provided, assigns unique ECO-SUB-xxxx ID, sets status SUBMITTED.
        Does NOT alter verified EcoTrace observations or run verified ingestion pipeline.
        """
        file_path: Optional[str] = None
        file_size_bytes: Optional[int] = None
        final_filename = filename or data.file_name

        if file_bytes is not None and len(file_bytes) > 0:
            upload_dir = self._ensure_upload_dir()
            safe_name = self._sanitize_filename(final_filename or "evidence_file.bin")
            timestamp = int(datetime.now(timezone.utc).timestamp())
            stored_name = f"{timestamp}_{safe_name}"
            target_path = os.path.join(upload_dir, stored_name)
            
            try:
                with open(target_path, "wb") as f:
                    f.write(file_bytes)
                file_path = target_path
                file_size_bytes = len(file_bytes)
                final_filename = safe_name
            except Exception as e:
                logger.warning("Could not persist file to disk: %s", e)
                file_path = None
                file_size_bytes = len(file_bytes)

        if final_filename:
            data.file_name = final_filename

        submission = self.repo.create(
            data=data,
            file_path=file_path,
            file_content_type=content_type,
            file_size_bytes=file_size_bytes,
        )

        logger.info(
            "Created community evidence submission %s (type=%s, destination=%s, status=%s)",
            submission.submission_id,
            submission.submission_type,
            submission.destination_id,
            submission.status,
        )
        return self._to_response_schema(submission)

    def get_by_id_or_submission_id(
        self, id_or_code: str, is_official: bool = False
    ) -> Optional[Any]:
        sub: Optional[CommunityEvidenceSubmission] = None
        if id_or_code.isdigit():
            sub = self.repo.get_by_id(int(id_or_code))
        if not sub:
            sub = self.repo.get_by_submission_id(id_or_code)
        if not sub:
            return None
        if is_official:
            return self._to_response_schema(sub)
        return self._to_public_response_schema(sub)

    def list_submissions(
        self,
        destination_id: Optional[int] = None,
        status: Optional[CommunityEvidenceStatus | str] = None,
        limit: int = 100,
        offset: int = 0,
        is_official: bool = False,
    ) -> tuple[int, list[Any]]:
        items = self.repo.get_multi(
            destination_id=destination_id,
            status=status,
            limit=limit,
            offset=offset,
        )
        total = self.repo.count(destination_id=destination_id, status=status)
        if is_official:
            return total, [self._to_response_schema(item) for item in items]
        return total, [self._to_public_response_schema(item) for item in items]

    def update_status(
        self,
        id_or_code: str,
        status_update: CommunityEvidenceStatusUpdate,
    ) -> Optional[CommunityEvidenceResponse]:
        sub: Optional[CommunityEvidenceSubmission] = None
        if id_or_code.isdigit():
            sub = self.repo.get_by_id(int(id_or_code))
        if not sub:
            sub = self.repo.get_by_submission_id(id_or_code)
        if not sub:
            return None

        updated = self.repo.update_status(sub.id, status_update)
        if not updated:
            return None
        return self._to_response_schema(updated)

    async def accept_and_verify(
        self,
        id_or_code: str,
        reviewer_name: Optional[str],
        reason: str,
        override_dest_id: Optional[int] = None,
        override_metric_code: Optional[str] = None,
    ) -> tuple[CommunityEvidenceResponse, Optional[dict]]:
        """
        Critical Acceptance Flow:
        Directly reuses already-stored file/URL/text and pipes it into the EXISTING
        EvidenceIngestionService pipeline without downloading or re-uploading.
        Updates status to VERIFIED with mandatory reviewer reason.
        """
        from app.schemas.evidence_ingestion import AutoIngestRequest
        from app.services.evidence_ingestion import EvidenceIngestionService

        sub: Optional[CommunityEvidenceSubmission] = None
        if id_or_code.isdigit():
            sub = self.repo.get_by_id(int(id_or_code))
        if not sub:
            sub = self.repo.get_by_submission_id(id_or_code)
        if not sub:
            raise ValueError(f"Community submission {id_or_code!r} not found")

        # 1. Read stored file bytes if available
        file_bytes: Optional[bytes] = None
        if sub.file_path and os.path.exists(sub.file_path):
            try:
                with open(sub.file_path, "rb") as f:
                    file_bytes = f.read()
            except Exception as e:
                logger.warning("Could not read stored file from %s: %s", sub.file_path, e)

        # 2. Build AutoIngestRequest directly from stored submission metadata
        dest_id = override_dest_id or sub.destination_id
        metric_code = override_metric_code or sub.metric_code
        src_org = (
            f"{sub.contributor_name} (Community Contribution)"
            if sub.contributor_name
            else "EcoTrace Community Evidence Registry"
        )

        auto_req = AutoIngestRequest(
            source_url=sub.source_url,
            raw_text=sub.raw_text,
            file_name=sub.file_name,
            document_title=sub.description[:120],
            source_organization=src_org,
            destination_id=dest_id,
            suggested_metric_code=metric_code,
            force_status="verified",
            dry_run=False,
        )

        # 3. Execute Existing Auto Data Ingestion Pipeline directly
        ingestion_svc = EvidenceIngestionService(self.db)
        ingestion_res = await ingestion_svc.execute_auto_ingestion(
            request=auto_req,
            file_bytes=file_bytes,
            filename=sub.file_name,
        )

        # 4. Update community submission status based on auto-ingestion pipeline result
        is_fully_verified = ingestion_res.success and (getattr(ingestion_res, "ingestion_status", "") or "").upper() == "VERIFIED"
        sub.status = CommunityEvidenceStatus.VERIFIED.value if is_fully_verified else CommunityEvidenceStatus.UNDER_REVIEW.value
        now_dt = datetime.now(timezone.utc)
        sub.reviewed_at = now_dt
        sub.last_updated_at = now_dt
        sub.reviewed_by = reviewer_name or "EcoTrace Statutory Reviewer"
        sub.reviewer_role = "OFFICIAL"
        sub.decision_reason = reason
        obs_id_str = f" [Observation ID: {ingestion_res.observation_id}]" if ingestion_res.observation_id else ""
        if is_fully_verified:
            sub.review_notes = f"Accepted & Verified: {reason}{obs_id_str}"
        else:
            sub.review_notes = f"Accepted for processing, observation flagged for additional verification: {reason}{obs_id_str}"
        sub.clarification_request = None
        self.db.commit()
        self.db.refresh(sub)

        logger.info(
            "Community submission %s successfully accepted & processed into observation %s (status: %s)",
            sub.submission_id,
            ingestion_res.observation_id,
            getattr(ingestion_res, "ingestion_status", "COMPLETED"),
        )

        return self._to_response_schema(sub), ingestion_res.model_dump()

    def request_clarification(
        self,
        id_or_code: str,
        reviewer_name: Optional[str],
        reason: str,
        clarification_instructions: str,
    ) -> CommunityEvidenceResponse:
        sub: Optional[CommunityEvidenceSubmission] = None
        if id_or_code.isdigit():
            sub = self.repo.get_by_id(int(id_or_code))
        if not sub:
            sub = self.repo.get_by_submission_id(id_or_code)
        if not sub:
            raise ValueError(f"Community submission {id_or_code!r} not found")

        sub.status = CommunityEvidenceStatus.NEEDS_CLARIFICATION.value
        now_dt = datetime.now(timezone.utc)
        sub.reviewed_at = now_dt
        sub.last_updated_at = now_dt
        sub.reviewed_by = reviewer_name or "EcoTrace Statutory Reviewer"
        sub.reviewer_role = "OFFICIAL"
        sub.decision_reason = reason
        sub.clarification_request = clarification_instructions
        sub.review_notes = f"Clarification Requested: {reason}\nAction Required: {clarification_instructions}"
        self.db.commit()
        self.db.refresh(sub)
        return self._to_response_schema(sub)

    def reject_submission(
        self,
        id_or_code: str,
        reviewer_name: Optional[str],
        reason: str,
    ) -> CommunityEvidenceResponse:
        sub: Optional[CommunityEvidenceSubmission] = None
        if id_or_code.isdigit():
            sub = self.repo.get_by_id(int(id_or_code))
        if not sub:
            sub = self.repo.get_by_submission_id(id_or_code)
        if not sub:
            raise ValueError(f"Community submission {id_or_code!r} not found")

        sub.status = CommunityEvidenceStatus.REJECTED.value
        now_dt = datetime.now(timezone.utc)
        sub.reviewed_at = now_dt
        sub.last_updated_at = now_dt
        sub.reviewed_by = reviewer_name or "EcoTrace Statutory Reviewer"
        sub.reviewer_role = "OFFICIAL"
        sub.decision_reason = reason
        sub.clarification_request = None
        sub.review_notes = f"Rejected: {reason}"
        self.db.commit()
        self.db.refresh(sub)
        return self._to_response_schema(sub)
