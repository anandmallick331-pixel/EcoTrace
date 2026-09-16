"""
Community Evidence Submission model.

Tracks public evidence submissions contributed by tourists, local residents,
researchers, and other non-official users. Submissions are safely held with
status SUBMITTED and unique Submission IDs (e.g., ECO-SUB-1042) until reviewed
and verified by authorized officials.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import CommunityEvidenceStatus, CommunityEvidenceType


class CommunityEvidenceSubmission(Base):
    __tablename__ = "community_evidence_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    submission_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    submission_type: Mapped[str] = mapped_column(
        String(32),
        default=CommunityEvidenceType.TEXT.value,
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    destination_id: Mapped[int | None] = mapped_column(
        ForeignKey("destinations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    destination_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metric_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    # Contributor info (optional)
    contributor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contributor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contributor_contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # Source artefact data
    source_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Status & Audit
    status: Mapped[str] = mapped_column(
        String(50),
        default=CommunityEvidenceStatus.SUBMITTED.value,
        nullable=False,
        index=True,
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    reviewed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reviewer_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    clarification_request: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    destination: Mapped["Destination | None"] = relationship("Destination")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<CommunityEvidenceSubmission id={self.id} submission_id={self.submission_id!r} type={self.submission_type!r} status={self.status!r}>"
