from typing import Sequence

from app.models.source import Dataset
from app.repositories.dataset import DatasetRepository
from app.services.base import BaseService


class DatasetService(BaseService[Dataset, DatasetRepository]):
    """
    Domain service for Dataset operations.
    """

    def __init__(self, repository: DatasetRepository) -> None:
        super().__init__(repository)

    def get_by_source(
        self, source_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Dataset]:
        """Fetch all datasets published by a specific source."""
        return self.repository.get_by_source(source_id, skip=skip, limit=limit)

    def get_by_name(
        self, name: str, skip: int = 0, limit: int = 100
    ) -> Sequence[Dataset]:
        """Fetch datasets matching a specific name."""
        return self.repository.get_by_name(name, skip=skip, limit=limit)
