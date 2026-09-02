from typing import Sequence

from app.models.enums import ObservationStatus
from app.models.observation import Observation
from app.repositories.observation import ObservationRepository
from app.services.base import BaseService


class ObservationService(BaseService[Observation, ObservationRepository]):
    """
    Domain service for Observation operations.
    """

    def __init__(self, repository: ObservationRepository) -> None:
        super().__init__(repository)

    def get_by_destination(
        self, destination_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Observation]:
        """Fetch all observations recorded for a specific destination."""
        return self.repository.get_by_destination(
            destination_id, skip=skip, limit=limit
        )

    def get_by_metric(
        self, metric_definition_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Observation]:
        """Fetch all observations referencing a specific metric definition."""
        return self.repository.get_by_metric(
            metric_definition_id, skip=skip, limit=limit
        )

    def get_by_dataset(
        self, dataset_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Observation]:
        """Fetch all observations sourced from a specific dataset."""
        return self.repository.get_by_dataset(dataset_id, skip=skip, limit=limit)

    def get_by_location(
        self, location_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Observation]:
        """Fetch all observations recorded for a specific sub-location."""
        return self.repository.get_by_location(location_id, skip=skip, limit=limit)

    def get_by_status(
        self, status: ObservationStatus | str, skip: int = 0, limit: int = 100
    ) -> Sequence[Observation]:
        """Fetch observations filtered by data quality / verification status."""
        return self.repository.get_by_status(status, skip=skip, limit=limit)

    def get_provenance(self, observation_id: int) -> dict[str, object] | None:
        """
        Trace the full provenance chain of an observation:
        Observation -> MetricDefinition -> Dataset -> Source -> Location -> Evidence items.
        """
        obs = self.get(observation_id)
        if not obs:
            return None

        return {
            "observation_id": obs.id,
            "destination_id": obs.destination_id,
            "location_id": obs.location_id,
            "location": obs.location,
            "period_start": obs.period_start,
            "period_end": obs.period_end,
            "original_value": obs.original_value,
            "normalized_value": obs.normalized_value,
            "status": obs.status,
            "confidence": obs.confidence,
            "destination_specificity": obs.destination_specificity,
            "methodology": obs.methodology,
            "assumptions": obs.assumptions,
            "notes": obs.notes,
            "created_at": obs.created_at,
            "updated_at": obs.updated_at,
            "metric_definition": obs.metric_definition,
            "dataset": obs.dataset,
            "source": obs.dataset.source if obs.dataset else None,
            "evidence": obs.evidence_items,
        }

