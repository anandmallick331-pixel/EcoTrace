"""
Source Conflict Resolution Model for EcoTrace.

Stores deterministic, non-destructive evaluations of competing observations from
multiple sources reporting on the same destination and metric.
Preserves all historical and competing values verbatim.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import ComparabilityStatus, ConflictResolutionStatus


class SourceConflict(Base):
    __tablename__ = "source_conflicts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric_definition_id: Mapped[int] = mapped_column(
        ForeignKey("metric_definitions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    primary_observation_id: Mapped[int] = mapped_column(
        ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    competing_observation_id: Mapped[int] = mapped_column(
        ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Comparability gate result
    comparability_status: Mapped[ComparabilityStatus] = mapped_column(
        Enum(ComparabilityStatus, name="comparabilitystatus"),
        nullable=False,
        default=ComparabilityStatus.COMPARABLE,
    )

    # Resolution outcome
    resolution_status: Mapped[ConflictResolutionStatus] = mapped_column(
        Enum(ConflictResolutionStatus, name="conflictresolutionstatus"),
        nullable=False,
        default=ConflictResolutionStatus.UNRESOLVED_CONFLICT,
    )

    # Pointer to selected canonical observation (only set when resolution_status is RESOLVED_CANONICAL)
    canonical_observation_id: Mapped[int | None] = mapped_column(
        ForeignKey("observations.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Categorical evidence factors JSON (e.g. status, specificity, confidence, authority comparisons)
    # NO numeric scores permitted per strict user constraints.
    categorical_factors: Mapped[str | None] = mapped_column(Text)

    # Human-readable transparent explanation of the deterministic decision
    resolution_rationale: Mapped[str | None] = mapped_column(Text)

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
    metric_definition: Mapped["MetricDefinition"] = relationship("MetricDefinition")  # type: ignore[name-defined]
    primary_observation: Mapped["Observation"] = relationship(  # type: ignore[name-defined]
        "Observation", foreign_keys=[primary_observation_id]
    )
    competing_observation: Mapped["Observation"] = relationship(  # type: ignore[name-defined]
        "Observation", foreign_keys=[competing_observation_id]
    )
    canonical_observation: Mapped["Observation | None"] = relationship(  # type: ignore[name-defined]
        "Observation", foreign_keys=[canonical_observation_id]
    )

    def __repr__(self) -> str:
        return (
            f"<SourceConflict id={self.id} "
            f"dest_id={self.destination_id} "
            f"metric_id={self.metric_definition_id} "
            f"status={self.resolution_status}>"
        )
