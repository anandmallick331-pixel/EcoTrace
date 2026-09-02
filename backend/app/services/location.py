from typing import Sequence

from app.models.destination import Location
from app.repositories.location import LocationRepository
from app.services.base import BaseService


class LocationService(BaseService[Location, LocationRepository]):
    """
    Domain service for Location operations.
    """

    def __init__(self, repository: LocationRepository) -> None:
        super().__init__(repository)

    def get_by_destination(
        self, destination_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Location]:
        """Fetch all locations belonging to a specific destination."""
        return self.repository.get_by_destination(
            destination_id, skip=skip, limit=limit
        )
