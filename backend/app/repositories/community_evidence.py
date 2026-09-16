"""
Repository for CommunityEvidenceSubmission model.
"""

from datetime import datetime, timezone
import random
from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.community_evidence import CommunityEvidenceSubmission
from app.models.destination import Destination
from app.models.enums import CommunityEvidenceStatus
from app.schemas.community_evidence import (
    CommunityEvidenceCreate,
    CommunityEvidenceStatusUpdate,
)


class CommunityEvidenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def _generate_submission_id(self) -> str:
        """
        Generates unique Submission ID matching ECO-SUB-1042 format.
        """
        for _ in range(30):
            rand_num = random.randint(1001, 9999)
            candidate = f"ECO-SUB-{rand_num}"
            existing = self.db.scalars(
                select(CommunityEvidenceSubmission.id).where(
                    CommunityEvidenceSubmission.submission_id == candidate
                )
            ).first()
            if not existing:
                return candidate
        
        # Fallback with timestamp microsecond
        now_micro = int(datetime.now(timezone.utc).timestamp() * 1000) % 10000
        return f"ECO-SUB-{now_micro:04d}"

    def create(
        self,
        data: CommunityEvidenceCreate,
        file_path: Optional[str] = None,
        file_content_type: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
    ) -> CommunityEvidenceSubmission:
        submission_id = self._generate_submission_id()
        
        # Resolve destination name if destination_id given
        dest_name = data.destination_name
        if data.destination_id is not None and not dest_name:
            dest = self.db.get(Destination, data.destination_id)
            if dest:
                dest_name = dest.name

        submission = CommunityEvidenceSubmission(
            submission_id=submission_id,
            submission_type=data.submission_type.lower() if data.submission_type else "text",
            description=data.description,
            destination_id=data.destination_id,
            destination_name=dest_name,
            metric_code=data.metric_code,
            contributor_name=data.contributor_name,
            contributor_email=data.contributor_email,
            contributor_contact=data.contributor_contact,
            source_url=data.source_url,
            file_name=data.file_name,
            file_content_type=file_content_type,
            file_size_bytes=file_size_bytes,
            file_path=file_path,
            raw_text=data.raw_text,
            status=CommunityEvidenceStatus.SUBMITTED.value,
            submitted_at=datetime.now(timezone.utc),
            reviewed_at=None,
            reviewed_by=None,
            review_notes=None,
        )

        self.db.add(submission)
        self.db.commit()
        self.db.refresh(submission)
        return submission

    def get_by_id(self, submission_pk: int) -> Optional[CommunityEvidenceSubmission]:
        stmt = (
            select(CommunityEvidenceSubmission)
            .options(joinedload(CommunityEvidenceSubmission.destination))
            .where(CommunityEvidenceSubmission.id == submission_pk)
        )
        return self.db.scalars(stmt).first()

    def get_by_submission_id(self, submission_id: str) -> Optional[CommunityEvidenceSubmission]:
        stmt = (
            select(CommunityEvidenceSubmission)
            .options(joinedload(CommunityEvidenceSubmission.destination))
            .where(CommunityEvidenceSubmission.submission_id == submission_id.strip())
        )
        return self.db.scalars(stmt).first()

    def get_multi(
        self,
        destination_id: Optional[int] = None,
        status: Optional[CommunityEvidenceStatus | str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[CommunityEvidenceSubmission]:
        stmt = select(CommunityEvidenceSubmission).options(
            joinedload(CommunityEvidenceSubmission.destination)
        )
        if destination_id is not None:
            stmt = stmt.where(CommunityEvidenceSubmission.destination_id == destination_id)
        if status is not None:
            status_val = status.value if isinstance(status, CommunityEvidenceStatus) else str(status)
            stmt = stmt.where(CommunityEvidenceSubmission.status == status_val)
            
        stmt = stmt.order_by(CommunityEvidenceSubmission.submitted_at.desc()).offset(offset).limit(limit)
        return self.db.scalars(stmt).all()

    def count(
        self,
        destination_id: Optional[int] = None,
        status: Optional[CommunityEvidenceStatus | str] = None,
    ) -> int:
        stmt = select(CommunityEvidenceSubmission.id)
        if destination_id is not None:
            stmt = stmt.where(CommunityEvidenceSubmission.destination_id == destination_id)
        if status is not None:
            status_val = status.value if isinstance(status, CommunityEvidenceStatus) else str(status)
            stmt = stmt.where(CommunityEvidenceSubmission.status == status_val)
        return len(self.db.scalars(stmt).all())

    def update_status(
        self,
        submission_pk: int,
        status_in: CommunityEvidenceStatusUpdate,
    ) -> Optional[CommunityEvidenceSubmission]:
        sub = self.get_by_id(submission_pk)
        if not sub:
            return None

        sub.status = (
            status_in.status.value
            if isinstance(status_in.status, CommunityEvidenceStatus)
            else str(status_in.status)
        )
        sub.reviewed_at = datetime.now(timezone.utc)
        sub.reviewed_by = status_in.reviewed_by
        sub.review_notes = status_in.review_notes

        self.db.commit()
        self.db.refresh(sub)
        return sub
