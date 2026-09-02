"""
Source and Dataset models.

Source  — the origin of data (organisation, agency, platform).
Dataset — a specific published collection from a Source (e.g. a report or API endpoint).
          Dataset.source_id preserves full provenance.
"""

from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    organisation: Mapped[str | None] = mapped_column(String(255))
    url: Mapped[str | None] = mapped_column(String(2048))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    datasets: Mapped[list["Dataset"]] = relationship(
        "Dataset", back_populates="source", cascade="all, delete-orphan"
    )
    evidence_items: Mapped[list["Evidence"]] = relationship(  # type: ignore[name-defined]
        "Evidence", back_populates="source"
    )

    def __repr__(self) -> str:
        return f"<Source id={self.id} name={self.name!r}>"


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    source_id: Mapped[int] = mapped_column(
        ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str | None] = mapped_column(String(64))
    publication_date: Mapped[date | None] = mapped_column(Date)
    url: Mapped[str | None] = mapped_column(String(2048))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    source: Mapped["Source"] = relationship("Source", back_populates="datasets")
    observations: Mapped[list["Observation"]] = relationship(  # type: ignore[name-defined]
        "Observation", back_populates="dataset"
    )
    evidence_items: Mapped[list["Evidence"]] = relationship(  # type: ignore[name-defined]
        "Evidence", back_populates="dataset"
    )

    def __repr__(self) -> str:
        return f"<Dataset id={self.id} name={self.name!r} source_id={self.source_id}>"
