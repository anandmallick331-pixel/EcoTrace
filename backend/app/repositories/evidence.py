from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.evidence import Evidence
from app.repositories.base import BaseRepository


class EvidenceRepository(BaseRepository[Evidence]):
    """
    Repository for Evidence entity operations.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(Evidence, db)

    def get_by_observation(
        self, observation_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Evidence]:
        """Fetch all evidence items associated with an observation."""
        stmt = (
            select(Evidence)
            .where(Evidence.observation_id == observation_id)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()

    def get_by_source(
        self, source_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Evidence]:
        """Fetch all evidence items originating directly from a source."""
        stmt = (
            select(Evidence)
            .where(Evidence.source_id == source_id)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()

    def get_by_dataset(
        self, dataset_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Evidence]:
        """Fetch all evidence items referencing a specific dataset."""
        stmt = (
            select(Evidence)
            .where(Evidence.dataset_id == dataset_id)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()
