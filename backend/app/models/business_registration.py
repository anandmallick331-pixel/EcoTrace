"""
BusinessRegistration model.

Tracks local enterprise registrations submitted for verification
and potential inclusion in EcoTrace low-impact recommendations.
"""

from datetime import datetime, timezone
import json

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import BusinessRegistrationStatus


class BusinessRegistration(Base):
    __tablename__ = "business_registrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tracking_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    business_type: Mapped[str] = mapped_column(String(100), nullable=False)
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    contact: Mapped[str] = mapped_column(String(255), nullable=False)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    price_range: Mapped[str] = mapped_column(String(100), nullable=False)
    local_employees: Mapped[int] = mapped_column(Integer, nullable=False)
    local_procurement_percent: Mapped[float] = mapped_column(Float, nullable=False)
    community_ownership: Mapped[str] = mapped_column(String(100), nullable=False)
    environmental_practices: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_details: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        default=BusinessRegistrationStatus.PENDING_VERIFICATION.value,
        nullable=False,
        index=True,
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    reviewed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    destination: Mapped["Destination"] = relationship("Destination")  # type: ignore[name-defined]

    @property
    def environmental_practices_list(self) -> list[str]:
        try:
            return json.loads(self.environmental_practices)
        except Exception:
            return [p.strip() for p in self.environmental_practices.split(",") if p.strip()]

    def __repr__(self) -> str:
        return f"<BusinessRegistration id={self.id} tracking_id={self.tracking_id!r} name={self.business_name!r} status={self.status!r}>"
