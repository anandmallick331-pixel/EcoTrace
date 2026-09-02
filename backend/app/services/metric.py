from typing import Sequence

from app.models.metric import MetricDefinition
from app.repositories.metric import MetricDefinitionRepository
from app.services.base import BaseService


class MetricDefinitionService(
    BaseService[MetricDefinition, MetricDefinitionRepository]
):
    """
    Domain service for MetricDefinition operations.
    """

    def __init__(self, repository: MetricDefinitionRepository) -> None:
        super().__init__(repository)

    def get_by_code(
        self, code: str, skip: int = 0, limit: int = 100
    ) -> Sequence[MetricDefinition]:
        """Fetch all versions of metric definitions matching a given code."""
        return self.repository.get_by_code(code, skip=skip, limit=limit)

    def get_by_code_version(
        self, code: str, version: str
    ) -> MetricDefinition | None:
        """Fetch a specific metric definition by its unique (code, version) pair."""
        return self.repository.get_by_code_version(code, version)
