from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.destination import Location
from app.repositories.base import BaseRepository


class LocationRepository(BaseRepository[Location]):
    """
    Repository for Location entity operations.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(Location, db)

    def get_by_destination(
        self, destination_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Location]:
        """Fetch all locations belonging to a specific destination."""
        stmt = (
            select(Location)
            .where(Location.destination_id == destination_id)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()
