"""
MetricDefinition model.

Defines what a metric IS — its code, name, category, unit, direction, etc.
Versioned so definitions can evolve without invalidating historical Observations.
Observations reference a specific MetricDefinition.id (and therefore a specific version).
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import MetricDirection


class MetricDefinition(Base):
    __tablename__ = "metric_definitions"
    __table_args__ = (
        UniqueConstraint("code", "version", name="uq_metric_definitions_code_version"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Stable identifier used in code (e.g. "co2_per_tourist_day")
    code: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0")

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False)   # e.g. "carbon", "water"
    unit: Mapped[str] = mapped_column(String(64), nullable=False)        # e.g. "kg CO₂e", "%"
    direction: Mapped[MetricDirection] = mapped_column(
        Enum(MetricDirection, name="metricdirection"), nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    observations: Mapped[list["Observation"]] = relationship(  # type: ignore[name-defined]
        "Observation", back_populates="metric_definition"
    )

    def __repr__(self) -> str:
        return f"<MetricDefinition id={self.id} code={self.code!r} v{self.version}>"
