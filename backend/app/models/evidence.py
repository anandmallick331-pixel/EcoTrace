"""
Evidence model.

Links an Observation back to the specific Source and Dataset that produced it,
and optionally stores a reference to the raw artefact (URL, file path, excerpt).
Provenance is always preserved — Evidence rows are never deleted when an Observation
is updated; only when the Observation itself is deleted (cascade).
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import EvidenceType


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # ── Foreign keys ─────────────────────────────────────────────────────────
    observation_id: Mapped[int] = mapped_column(
        ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_id: Mapped[int] = mapped_column(
        ForeignKey("sources.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    dataset_id: Mapped[int | None] = mapped_column(
        ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # ── Evidence artefact ─────────────────────────────────────────────────────
    evidence_type: Mapped[EvidenceType] = mapped_column(
        Enum(EvidenceType, name="evidencetype"),
        nullable=False,
        default=EvidenceType.DOCUMENT,
    )
    # URL or file path to the raw artefact
    reference_url: Mapped[str | None] = mapped_column(String(2048))
    # Verbatim excerpt from the source document / API response
    raw_excerpt: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    observation: Mapped["Observation"] = relationship(
        "Observation", back_populates="evidence_items"
    )
    source: Mapped["Source"] = relationship(  # type: ignore[name-defined]
        "Source", back_populates="evidence_items"
    )
    dataset: Mapped["Dataset"] = relationship(  # type: ignore[name-defined]
        "Dataset", back_populates="evidence_items"
    )

    def __repr__(self) -> str:
        return (
            f"<Evidence id={self.id} "
            f"observation_id={self.observation_id} "
            f"source_id={self.source_id} "
            f"type={self.evidence_type}>"
        )
