"""
Test suite for Bhubaneswar Destination Ingestion Pipeline.
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
from app.services.bhubaneswar_ingestion import run_bhubaneswar_ingestion


def test_bhubaneswar_ingestion_and_idempotency():
    db = SessionLocal()
    chilika_before = None
    try:
        ch = db.query(Destination).filter(Destination.name == "Chilika").first()
        if ch:
            chilika_before = db.query(Observation).filter(Observation.destination_id == ch.id).count()
    finally:
        db.close()

    # 1. Run Ingestion
    report = run_bhubaneswar_ingestion(clean_existing=False)
    assert len(report.validation_errors) == 0, f"Validation errors: {report.validation_errors}"
    assert report.records_read == 64

    # 2. Re-run Ingestion (Idempotency Check)
    rerun_report = run_bhubaneswar_ingestion(clean_existing=False)
    assert rerun_report.records_inserted == 0
    assert rerun_report.duplicate_preventions == 64
    assert len(rerun_report.validation_errors) == 0

    # 3. Database verification
    db = SessionLocal()
    try:
        # Check destination
        bbsr = db.query(Destination).filter(Destination.name == "Bhubaneswar").first()
        assert bbsr is not None
        assert bbsr.country_code == "IND"
        assert bbsr.region == "Odisha"

        # Check locations
        locs = db.query(Location).filter(Location.destination_id == bbsr.id).all()
        assert len(locs) >= 8
        loc_labels = [l.label for l in locs]
        assert "Khandagiri & Udayagiri" in loc_labels
        assert "Lingaraj Temple Zone" in loc_labels
        assert "Nandankanan Zoological Park" in loc_labels

        # Check observations (64 baseline + newly ingested verified geospatial records)
        obs = db.query(Observation).filter(Observation.destination_id == bbsr.id).all()
        assert len(obs) >= 64

        # Check evidence
        ev_count = (
            db.query(Evidence)
            .join(Observation, Evidence.observation_id == Observation.id)
            .filter(Observation.destination_id == bbsr.id)
            .count()
        )
        assert ev_count >= 64

        # Check specific key metrics
        tourist_total = (
            db.query(Observation)
            .join(MetricDefinition, Observation.metric_definition_id == MetricDefinition.id)
            .filter(
                Observation.destination_id == bbsr.id,
                MetricDefinition.code == "tourist_visits_total",
                Observation.period_start == date(2023, 1, 1),
            )
            .first()
        )
        assert tourist_total is not None
        assert tourist_total.original_value == 3680782.0

        # Check Chilika data remains intact
        chilika = db.query(Destination).filter(Destination.name == "Chilika").first()
        if chilika and chilika_before is not None:
            chilika_obs_count = (
                db.query(Observation).filter(Observation.destination_id == chilika.id).count()
            )
            assert chilika_obs_count == chilika_before, f"Chilika observations altered: before={chilika_before}, after={chilika_obs_count}"

    finally:
        db.close()


if __name__ == "__main__":
    test_bhubaneswar_ingestion_and_idempotency()
    print("ALL BHUBANESWAR INGESTION TESTS PASSED!")
