import pytest
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.destination import Destination
from app.schemas.scenario import ScenarioCreate
from app.services.chilika_scenario import ChilikaScenarioEngine
from app.services.konark_ingestion import run_konark_ingestion


def test_konark_scenario_simulation():
    """
    Verify Konark scenario engine produces authentic What-If simulations
    using verified database observations.
    """
    db = SessionLocal()
    try:
        # 1. Ingest Konark
        run_konark_ingestion(clean_existing=False)
        dest = db.scalar(select(Destination).where(Destination.name.ilike("konark")))
        assert dest is not None

        # 2. Simulate valid Konark timed ticketing scenario
        engine = ChilikaScenarioEngine()
        payload = ScenarioCreate(
            intervention_type="heritage_timed_ticketing",
            parameter="timed_ticketing_adoption_pct",
            value=30.0,
            description="Apply a 30% timed ticketing adoption at Sun Temple",
        )

        scenario = engine.simulate_scenario(dest.id, payload, db)
        assert scenario is not None
        assert scenario.destination_id == dest.id
        assert scenario.projection_status == "completed"
        assert len(scenario.affected_metrics) == 1

        impact = scenario.affected_metrics[0]
        assert impact.metric_code == "tourist_visits_total"
        assert impact.baseline_value == 6707821.0
        assert impact.projected_value == pytest.approx(6707821.0 * 0.7)
        assert impact.delta == pytest.approx(-6707821.0 * 0.3)
        assert "Odisha Tourism Statistical Bulletin" in scenario.assumptions[0]
    finally:
        db.close()


def test_konark_unsupported_scenario_returns_none():
    """
    Verify unsupported intervention on Konark does not invent fake models.
    """
    db = SessionLocal()
    try:
        run_konark_ingestion(clean_existing=False)
        dest = db.scalar(select(Destination).where(Destination.name.ilike("konark")))
        assert dest is not None

        engine = ChilikaScenarioEngine()
        payload = ScenarioCreate(
            intervention_type="boat_electrification",  # Chilika-only
            parameter="electrification_rate_pct",
            value=50.0,
        )

        scenario = engine.simulate_scenario(dest.id, payload, db)
        assert scenario is None
    finally:
        db.close()
