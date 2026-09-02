from app.models.source import Source
from app.repositories.source import SourceRepository
from app.services.base import BaseService


class SourceService(BaseService[Source, SourceRepository]):
    """
    Domain service for Source operations.
    """

    def __init__(self, repository: SourceRepository) -> None:
        super().__init__(repository)

    def get_by_name(self, name: str) -> Source | None:
        """Fetch a source by its exact unique name."""
        return self.repository.get_by_name(name)
