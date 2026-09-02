import pytest
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.destination import Destination
from app.schemas.scenario import ScenarioCreate
from app.services.puri_scenario import PuriScenarioEngine
from app.services.puri_ingestion import run_puri_ingestion


def test_puri_crowd_dispersion_scenario():
    """
    Verify Puri scenario engine simulates Grand Road crowd dispersion
    using verified 2024 footfall baseline (8,346,128 visits).
    """
    db = SessionLocal()
    try:
        run_puri_ingestion(clean_existing=False)
        dest = db.scalar(select(Destination).where(Destination.name.ilike("puri")))
        assert dest is not None

        engine = PuriScenarioEngine()
        payload = ScenarioCreate(
            intervention_type="grand_road_crowd_dispersion",
            parameter="dispersion_rate_pct",
            value=40.0,
            description="Apply a 40% crowd dispersion scenario across Grand Road",
        )

        scenario = engine.simulate_scenario(dest.id, payload, db)
        assert scenario is not None
        assert scenario.destination_id == dest.id
        assert scenario.projection_status == "completed"
        assert len(scenario.affected_metrics) == 1

        impact = scenario.affected_metrics[0]
        assert impact.metric_code == "grand_road_peak_crowd_density"
        assert impact.baseline_value == 8346128.0
        assert impact.projected_value == pytest.approx(8346128.0 * (1 - (40.0 * 0.15) / 100))
        assert "8,346,128" in scenario.assumptions[0]
    finally:
        db.close()


def test_puri_coastal_waste_scenario():
    """
    Verify Puri scenario engine simulates coastal waste diversion
    using verified OSPCB baseline (70.4 TPD).
    """
    db = SessionLocal()
    try:
        run_puri_ingestion(clean_existing=False)
        dest = db.scalar(select(Destination).where(Destination.name.ilike("puri")))
        assert dest is not None

        engine = PuriScenarioEngine()
        payload = ScenarioCreate(
            intervention_type="coastal_waste_management",
            parameter="segregation_efficiency_pct",
            value=50.0,
            description="Apply a 50% Micro-Composting and waste segregation intervention",
        )

        scenario = engine.simulate_scenario(dest.id, payload, db)
        assert scenario is not None
        assert scenario.destination_id == dest.id
        assert scenario.projection_status == "completed"
        assert len(scenario.affected_metrics) == 1

        impact = scenario.affected_metrics[0]
        assert impact.metric_code == "WASTE_MSW_UNPROCESSED_TPD"
        assert impact.baseline_value == 70.4
        assert impact.projected_value == pytest.approx(70.4 * (1 - (50.0 * 0.40) / 100))
        assert "70.4 TPD" in scenario.assumptions[0]
    finally:
        db.close()


def test_puri_unsupported_scenario_returns_none():
    """
    Verify unsupported intervention on Puri returns None and does not invent fake data.
    """
    db = SessionLocal()
    try:
        run_puri_ingestion(clean_existing=False)
        dest = db.scalar(select(Destination).where(Destination.name.ilike("puri")))
        assert dest is not None

        engine = PuriScenarioEngine()
        payload = ScenarioCreate(
            intervention_type="boat_electrification",  # Chilika-only
            parameter="electrification_rate_pct",
            value=50.0,
        )

        scenario = engine.simulate_scenario(dest.id, payload, db)
        assert scenario is None
    finally:
        db.close()
