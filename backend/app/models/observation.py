"""
Observation model.

A single measured or derived data point for a (Destination, MetricDefinition, Dataset, period)
combination.  All provenance fields (dataset, methodology, assumptions) are stored verbatim
so nothing is ever discarded.
"""

from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import ConfidenceLevel, DestinationSpecificity, ObservationStatus


class Observation(Base):
    __tablename__ = "observations"
    __table_args__ = (
        UniqueConstraint(
            "destination_id",
            "location_id",
            "metric_definition_id",
            "dataset_id",
            "period_start",
            "period_end",
            name="uq_observation_natural_key",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # ── Foreign keys ─────────────────────────────────────────────────────────
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    metric_definition_id: Mapped[int] = mapped_column(
        ForeignKey("metric_definitions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    dataset_id: Mapped[int | None] = mapped_column(
        ForeignKey("datasets.id", ondelete="RESTRICT"), nullable=True, index=True
    )

    # ── Time period ───────────────────────────────────────────────────────────
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)

    # ── Values ────────────────────────────────────────────────────────────────
    original_value: Mapped[float | None] = mapped_column(Float)     # as reported in source
    normalized_value: Mapped[float | None] = mapped_column(Float)   # after unit harmonisation

    # ── Quality / provenance metadata ─────────────────────────────────────────
    status: Mapped[ObservationStatus] = mapped_column(
        Enum(ObservationStatus, name="observationstatus"),
        nullable=False,
        default=ObservationStatus.RAW,
    )
    confidence: Mapped[ConfidenceLevel] = mapped_column(
        Enum(ConfidenceLevel, name="confidencelevel"),
        nullable=False,
        default=ConfidenceLevel.UNKNOWN,
    )
    destination_specificity: Mapped[DestinationSpecificity] = mapped_column(
        Enum(DestinationSpecificity, name="destinationspecificity"),
        nullable=False,
        default=DestinationSpecificity.DIRECT,
    )
    methodology: Mapped[str | None] = mapped_column(Text)   # how the value was derived
    assumptions: Mapped[str | None] = mapped_column(Text)   # any assumptions made
    notes: Mapped[str | None] = mapped_column(Text)

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

    # ── Relationships ─────────────────────────────────────────────────────────
    destination: Mapped["Destination"] = relationship(  # type: ignore[name-defined]
        "Destination", back_populates="observations"
    )
    location: Mapped["Location | None"] = relationship(  # type: ignore[name-defined]
        "Location"
    )
    metric_definition: Mapped["MetricDefinition"] = relationship(  # type: ignore[name-defined]
        "MetricDefinition", back_populates="observations"
    )
    dataset: Mapped["Dataset"] = relationship(  # type: ignore[name-defined]
        "Dataset", back_populates="observations"
    )
    evidence_items: Mapped[list["Evidence"]] = relationship(
        "Evidence", back_populates="observation", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<Observation id={self.id} "
            f"destination_id={self.destination_id} "
            f"metric_definition_id={self.metric_definition_id} "
            f"period={self.period_start}–{self.period_end}>"
        )
