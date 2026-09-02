from typing import Sequence

from app.models.evidence import Evidence
from app.repositories.evidence import EvidenceRepository
from app.services.base import BaseService


class EvidenceService(BaseService[Evidence, EvidenceRepository]):
    """
    Domain service for Evidence operations.
    """

    def __init__(self, repository: EvidenceRepository) -> None:
        super().__init__(repository)

    def get_by_observation(
        self, observation_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Evidence]:
        """Fetch all evidence items associated with an observation."""
        return self.repository.get_by_observation(
            observation_id, skip=skip, limit=limit
        )

    def get_by_source(
        self, source_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Evidence]:
        """Fetch all evidence items originating directly from a source."""
        return self.repository.get_by_source(source_id, skip=skip, limit=limit)

    def get_by_dataset(
        self, dataset_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Evidence]:
        """Fetch all evidence items referencing a specific dataset."""
        return self.repository.get_by_dataset(
            dataset_id, skip=skip, limit=limit
        )
