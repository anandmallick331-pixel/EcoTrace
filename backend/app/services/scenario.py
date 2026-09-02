import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.schemas.scenario import ScenarioCreate, ScenarioResponse


class ScenarioEngineInterface(ABC):
    """
    Pluggable contract for destination intervention scenario engines.
    Allows counterfactual simulations or ML projections to be connected
    without modifying core backend architecture.
    """

    @abstractmethod
    def simulate_scenario(
        self, destination_id: int, payload: ScenarioCreate, db: Session
    ) -> ScenarioResponse | None:
        """Simulate an intervention scenario for a destination."""
        pass

    @abstractmethod
    def get_scenario(
        self, destination_id: int, scenario_id: str, db: Session
    ) -> ScenarioResponse | None:
        """Retrieve a specific scenario projection by ID."""
        pass


class CompositeScenarioEngine(ScenarioEngineInterface):
    """
    Composite engine chaining multiple destination-specific scenario engines.
    Delegates sequentially and returns the first valid projection result.
    """

    def __init__(
        self, engines: list[ScenarioEngineInterface] | None = None
    ) -> None:
        self.engines = engines or []

    def add_engine(self, engine: ScenarioEngineInterface) -> None:
        self.engines.append(engine)

    def simulate_scenario(
        self, destination_id: int, payload: ScenarioCreate, db: Session
    ) -> ScenarioResponse | None:
        for engine in self.engines:
            result = engine.simulate_scenario(destination_id, payload, db)
            if result is not None:
                return result
        return None

    def get_scenario(
        self, destination_id: int, scenario_id: str, db: Session
    ) -> ScenarioResponse | None:
        for engine in self.engines:
            result = engine.get_scenario(destination_id, scenario_id, db)
            if result is not None:
                return result
        return None



class ScenarioService:
    """
    Backend service managing scenario simulations.
    Delegates to a registered ScenarioEngineInterface implementation if available;
    otherwise generates a clean uncomputed ScenarioResponse contract.
    """

    _engine: ScenarioEngineInterface | None = None
    _scenarios: dict[str, ScenarioResponse] = {}

    def __init__(self, db: Session) -> None:
        self.db = db

    @classmethod
    def register_engine(cls, engine: ScenarioEngineInterface) -> None:
        """Register a pluggable scenario calculation engine."""
        cls._engine = engine

    def create_scenario(
        self, destination_id: int, payload: ScenarioCreate
    ) -> ScenarioResponse:
        """
        Create a new scenario simulation.
        Returns uncomputed contract with null/empty fields when no engine is active.
        """
        if self._engine:
            result = self._engine.simulate_scenario(destination_id, payload, self.db)
            if result is not None:
                self._scenarios[result.scenario_id] = result
                return result

        scenario_id = str(uuid.uuid4())
        uncomputed = ScenarioResponse(
            scenario_id=scenario_id,
            destination_id=destination_id,
            intervention_type=payload.intervention_type,
            parameter=payload.parameter,
            value=payload.value,
            description=payload.description,
            baseline_score=None,
            projected_score=None,
            score_change=None,
            affected_metrics=[],
            confidence=None,
            assumptions=[],
            projection_status="uncomputed",
            created_at=datetime.now(timezone.utc),
        )
        self._scenarios[scenario_id] = uncomputed
        return uncomputed

    def get_scenario(
        self, destination_id: int, scenario_id: str
    ) -> ScenarioResponse | None:
        """
        Retrieve a scenario projection by scenario_id for a given destination.
        """
        if self._engine:
            result = self._engine.get_scenario(destination_id, scenario_id, self.db)
            if result is not None:
                return result

        scenario = self._scenarios.get(scenario_id)
        if scenario and scenario.destination_id == destination_id:
            return scenario
        return None
