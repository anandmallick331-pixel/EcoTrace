"""
ObservationReconciliation and ObservationReconciliationMember Models.

Implements Phase 3 additive, non-destructive reconciliation data layer:
- Links competing observations to an explicit reconciliation record.
- Preserves every original observation and provenance record verbatim.
- Tracks machine-readable resolution_method, human-readable resolution_reason,
  comparability_reason, and resolver_version.
- Links members with explicit roles: CANONICAL, ALTERNATIVE, CONTRIBUTING.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import (
    ConflictResolutionStatus,
    ReconciliationMemberRole,
    ResolutionMethod,
)


class ObservationReconciliation(Base):
    __tablename__ = "observation_reconciliations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    metric_id: Mapped[int] = mapped_column(
        ForeignKey("metric_definitions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True, index=True
    )

    status: Mapped[ConflictResolutionStatus] = mapped_column(
        Enum(ConflictResolutionStatus, name="conflictresolutionstatus"),
        nullable=False,
        default=ConflictResolutionStatus.UNRESOLVED_CONFLICT,
    )

    canonical_observation_id: Mapped[int | None] = mapped_column(
        ForeignKey("observations.id", ondelete="SET NULL"), nullable=True, index=True
    )

    reconciled_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    reconciled_unit: Mapped[str | None] = mapped_column(String(64), nullable=True)

    resolution_method: Mapped[ResolutionMethod] = mapped_column(
        Enum(ResolutionMethod, name="resolutionmethod"),
        nullable=False,
        default=ResolutionMethod.UNRESOLVED,
    )

    resolution_reason: Mapped[str] = mapped_column(Text, nullable=False)
    comparability_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    resolver_version: Mapped[str] = mapped_column(
        String(64), nullable=False, default="source_conflict_v1"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    destination: Mapped["Destination"] = relationship("Destination")  # type: ignore[name-defined]
    location: Mapped["Location | None"] = relationship("Location")  # type: ignore[name-defined]
    metric_definition: Mapped["MetricDefinition"] = relationship("MetricDefinition")  # type: ignore[name-defined]
    canonical_observation: Mapped["Observation | None"] = relationship(  # type: ignore[name-defined]
        "Observation", foreign_keys=[canonical_observation_id]
    )
    members: Mapped[list["ObservationReconciliationMember"]] = relationship(
        "ObservationReconciliationMember",
        back_populates="reconciliation",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<ObservationReconciliation id={self.id} "
            f"metric_id={self.metric_id} dest_id={self.destination_id} "
            f"status={self.status} method={self.resolution_method}>"
        )


class ObservationReconciliationMember(Base):
    __tablename__ = "observation_reconciliation_members"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    reconciliation_id: Mapped[int] = mapped_column(
        ForeignKey("observation_reconciliations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    observation_id: Mapped[int] = mapped_column(
        ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    role: Mapped[ReconciliationMemberRole] = mapped_column(
        Enum(ReconciliationMemberRole, name="reconciliationmemberrole"),
        nullable=False,
        default=ReconciliationMemberRole.ALTERNATIVE,
    )

    # Relationships
    reconciliation: Mapped["ObservationReconciliation"] = relationship(
        "ObservationReconciliation", back_populates="members"
    )
    observation: Mapped["Observation"] = relationship("Observation")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return (
            f"<ObservationReconciliationMember id={self.id} "
            f"recon_id={self.reconciliation_id} obs_id={self.observation_id} "
            f"role={self.role}>"
        )
