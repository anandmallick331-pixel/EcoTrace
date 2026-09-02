"""
Destination and Location models.

Destination  — the tourism site / region being tracked.
Location     — one or more geographic points / regions attached to a Destination.
               Supports multi-location destinations (e.g. an archipelago).
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Destination(Base):
    __tablename__ = "destinations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    country_code: Mapped[str | None] = mapped_column(String(3))   # ISO 3166-1 alpha-3
    region: Mapped[str | None] = mapped_column(String(255))
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
    locations: Mapped[list["Location"]] = relationship(
        "Location", back_populates="destination", cascade="all, delete-orphan"
    )
    observations: Mapped[list["Observation"]] = relationship(  # type: ignore[name-defined]
        "Observation", back_populates="destination"
    )

    def __repr__(self) -> str:
        return f"<Destination id={self.id} name={self.name!r}>"


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str | None] = mapped_column(String(255))  # e.g. "Main Island", "North Coast"
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    # GeoJSON polygon / bounding-box stored as text for now; swap to PostGIS later if needed
    geojson: Mapped[str | None] = mapped_column(Text)

    # Relationships
    destination: Mapped["Destination"] = relationship(
        "Destination", back_populates="locations"
    )

    def __repr__(self) -> str:
        return f"<Location id={self.id} destination_id={self.destination_id} label={self.label!r}>"
