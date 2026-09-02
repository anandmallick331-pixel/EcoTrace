"""
Test suite for Konark Destination Ingestion Pipeline.
"""

import os
import sys
from datetime import date
from sqlalchemy import select

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal
from app.models.destination import Destination, Location
from app.models.enums import ConfidenceLevel, DestinationSpecificity, MetricDirection, ObservationStatus
from app.models.evidence import Evidence
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source
from app.services.konark_ingestion import run_konark_ingestion


def test_konark_ingestion_and_idempotency():
    db = SessionLocal()
    chilika_before = None
    bbsr_before = None
    try:
        ch = db.query(Destination).filter(Destination.name == "Chilika").first()
        if ch:
            chilika_before = db.query(Observation).filter(Observation.destination_id == ch.id).count()
        bb = db.query(Destination).filter(Destination.name == "Bhubaneswar").first()
        if bb:
            bbsr_before = db.query(Observation).filter(Observation.destination_id == bb.id).count()
    finally:
        db.close()

    # 1. Run Ingestion
    report = run_konark_ingestion(clean_existing=False)
    assert len(report.validation_errors) == 0, f"Validation errors: {report.validation_errors}"
    assert report.records_read == 57

    # 2. Re-run Ingestion (Idempotency Check)
    rerun_report = run_konark_ingestion(clean_existing=False)
    assert rerun_report.records_inserted == 0
    assert rerun_report.duplicate_preventions == 57
    assert len(rerun_report.validation_errors) == 0

    # 3. Database verification
    db = SessionLocal()
    try:
        # Check destination
        konark = db.query(Destination).filter(Destination.name == "Konark").first()
        assert konark is not None
        assert konark.country_code == "IND"
        assert konark.region == "Odisha"

        # Check locations
        locs = db.query(Location).filter(Location.destination_id == konark.id).all()
        assert len(locs) == 5
        loc_map = {l.label: l for l in locs}
        assert "Sun Temple / Konark World Heritage property" in loc_map
        assert "Archaeological Museum, Konark" in loc_map
        assert "Chandrabhaga Beach" in loc_map
        assert "Konark NAC / town centre" in loc_map
        assert "Balukhand-Konark Wildlife Sanctuary" in loc_map

        # Check coordinates (preserve nulls, do not convert null to 0.0)
        assert loc_map["Sun Temple / Konark World Heritage property"].latitude == 19.8875
        assert loc_map["Sun Temple / Konark World Heritage property"].longitude == 86.09472
        assert loc_map["Archaeological Museum, Konark"].latitude == 19.89116
        assert loc_map["Archaeological Museum, Konark"].longitude == 86.09447
        assert loc_map["Chandrabhaga Beach"].latitude is None
        assert loc_map["Chandrabhaga Beach"].longitude is None
        assert loc_map["Konark NAC / town centre"].latitude is None
        assert loc_map["Konark NAC / town centre"].longitude is None
        assert loc_map["Balukhand-Konark Wildlife Sanctuary"].latitude is None
        assert loc_map["Balukhand-Konark Wildlife Sanctuary"].longitude is None

        # Check observations (57 baseline + newly ingested verified geospatial records)
        obs = db.query(Observation).filter(Observation.destination_id == konark.id).all()
        assert len(obs) >= 57

        # Check evidence
        ev_count = (
            db.query(Evidence)
            .join(Observation, Evidence.observation_id == Observation.id)
            .filter(Observation.destination_id == konark.id)
            .count()
        )
        assert ev_count >= 50

        # Check specific key verified metrics
        tourist_total_2024 = (
            db.query(Observation)
            .join(MetricDefinition, Observation.metric_definition_id == MetricDefinition.id)
            .filter(
                Observation.destination_id == konark.id,
                MetricDefinition.code == "tourist_visits_total",
                Observation.period_start == date(2024, 1, 1),
            )
            .first()
        )
        assert tourist_total_2024 is not None
        assert tourist_total_2024.original_value == 6707821.0
        assert tourist_total_2024.status == ObservationStatus.VERIFIED

        # Check population
        pop_obs = (
            db.query(Observation)
            .join(MetricDefinition, Observation.metric_definition_id == MetricDefinition.id)
            .filter(
                Observation.destination_id == konark.id,
                MetricDefinition.code == "konark_nac_population",
            )
            .first()
        )
        assert pop_obs is not None
        assert pop_obs.original_value == 16779.0

        # Check estimated metric
        water_demand_obs = (
            db.query(Observation)
            .join(MetricDefinition, Observation.metric_definition_id == MetricDefinition.id)
            .filter(
                Observation.destination_id == konark.id,
                MetricDefinition.code == "estimated_water_demand",
            )
            .first()
        )
        assert water_demand_obs is not None
        assert water_demand_obs.original_value == 2265165.0
        assert water_demand_obs.destination_specificity == DestinationSpecificity.MODELLED

        # Check DATA_GAP rows (null value and null dataset_id, with notes explaining the gap)
        gap_water_obs = (
            db.query(Observation)
            .join(MetricDefinition, Observation.metric_definition_id == MetricDefinition.id)
            .filter(
                Observation.destination_id == konark.id,
                MetricDefinition.code == "water_consumption",
            )
            .first()
        )
        assert gap_water_obs is not None
        assert gap_water_obs.original_value is None
        assert gap_water_obs.normalized_value is None
        assert gap_water_obs.dataset_id is None
        assert "DATA_GAP" in (gap_water_obs.notes or "")

        # Check Chilika data remains strictly intact
        chilika = db.query(Destination).filter(Destination.name == "Chilika").first()
        if chilika and chilika_before is not None:
            chilika_obs_count = (
                db.query(Observation).filter(Observation.destination_id == chilika.id).count()
            )
            assert chilika_obs_count == chilika_before, f"Chilika observations altered: before={chilika_before}, after={chilika_obs_count}"

        # Check Bhubaneswar data remains strictly intact
        bbsr = db.query(Destination).filter(Destination.name == "Bhubaneswar").first()
        if bbsr and bbsr_before is not None:
            bbsr_obs_count = (
                db.query(Observation).filter(Observation.destination_id == bbsr.id).count()
            )
            assert bbsr_obs_count == bbsr_before, f"Bhubaneswar observations altered: before={bbsr_before}, after={bbsr_obs_count}"

    finally:
        db.close()


if __name__ == "__main__":
    test_konark_ingestion_and_idempotency()
    print("ALL KONARK INGESTION TESTS PASSED!")
