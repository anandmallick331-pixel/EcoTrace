from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.source import Dataset
from app.repositories.base import BaseRepository


class DatasetRepository(BaseRepository[Dataset]):
    """
    Repository for Dataset entity operations.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(Dataset, db)

    def get_by_source(
        self, source_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Dataset]:
        """Fetch all datasets published by a specific source."""
        stmt = (
            select(Dataset)
            .where(Dataset.source_id == source_id)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()

    def get_by_name(
        self, name: str, skip: int = 0, limit: int = 100
    ) -> Sequence[Dataset]:
        """Fetch datasets matching a specific name."""
        stmt = (
            select(Dataset)
            .where(Dataset.name == name)
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all()
