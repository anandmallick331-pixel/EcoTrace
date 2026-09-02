from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.destination import Destination
from app.repositories.base import BaseRepository


class DestinationRepository(BaseRepository[Destination]):
    """
    Repository for Destination entity operations.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(Destination, db)

    def get_by_name(self, name: str) -> Destination | None:
        """Fetch a destination by its exact name."""
        stmt = select(Destination).where(Destination.name == name)
        return self.db.scalars(stmt).first()

    def get_by_country(
        self, country_code: str, skip: int = 0, limit: int = 100
    ) -> Sequence[Destination]:
        """Fetch destinations by ISO 3166-1 alpha-3 country code."""
        stmt = (
            select(Destination)
            .where(Destination.country_code == country_code)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()
