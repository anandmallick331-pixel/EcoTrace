from typing import Sequence

from app.models.destination import Destination
from app.repositories.destination import DestinationRepository
from app.services.base import BaseService


class DestinationService(BaseService[Destination, DestinationRepository]):
    """
    Domain service for Destination operations.
    """

    def __init__(self, repository: DestinationRepository) -> None:
        super().__init__(repository)

    def get_by_name(self, name: str) -> Destination | None:
        """Fetch a destination by its exact name."""
        return self.repository.get_by_name(name)

    def get_by_country(
        self, country_code: str, skip: int = 0, limit: int = 100
    ) -> Sequence[Destination]:
        """Fetch destinations filtered by ISO 3166-1 alpha-3 country code."""
        return self.repository.get_by_country(country_code, skip=skip, limit=limit)
