from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import ObservationStatus
from app.models.observation import Observation
from app.repositories.base import BaseRepository


class ObservationRepository(BaseRepository[Observation]):
    """
    Repository for Observation entity operations.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(Observation, db)

    def get_by_destination(
        self, destination_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Observation]:
        """Fetch all observations recorded for a specific destination."""
        stmt = (
            select(Observation)
            .where(Observation.destination_id == destination_id)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()

    def get_by_metric(
        self, metric_definition_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Observation]:
        """Fetch all observations referencing a specific metric definition."""
        stmt = (
            select(Observation)
            .where(Observation.metric_definition_id == metric_definition_id)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()

    def get_by_dataset(
        self, dataset_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Observation]:
        """Fetch all observations sourced from a specific dataset."""
        stmt = (
            select(Observation)
            .where(Observation.dataset_id == dataset_id)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()

    def get_by_location(
        self, location_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Observation]:
        """Fetch all observations recorded for a specific sub-location."""
        stmt = (
            select(Observation)
            .where(Observation.location_id == location_id)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()

    def get_by_status(
        self, status: ObservationStatus | str, skip: int = 0, limit: int = 100
    ) -> Sequence[Observation]:
        """Fetch observations filtered by data quality / verification status."""
        stmt = (
            select(Observation)
            .where(Observation.status == status)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()
