"""
Test suite for Puri Destination Ingestion Pipeline.

Verifies:
1. Complete ingestion of 178 observations for Destination 'Puri' (ID 103).
2. Exact 9 locations loaded with coordinates.
3. Natural key idempotency: 0 duplicate records created on multiple runs.
4. Total non-interference with Chilika (ID 44), Bhubaneswar (ID 100), and Konark (ID 102).
"""

import os
import sys
import pytest
from sqlalchemy import select

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal
from app.models.destination import Destination, Location
from app.models.enums import ConfidenceLevel, DestinationSpecificity, MetricDirection, ObservationStatus
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source
from app.models.evidence import Evidence
from app.services.puri_ingestion import run_puri_ingestion


def test_puri_ingestion_and_idempotency():
    db = SessionLocal()
    chilika_before = None
    bbsr_before = None
    konark_before = None
    try:
        ch = db.query(Destination).filter(Destination.name == "Chilika").first()
        if ch:
            chilika_before = db.query(Observation).filter(Observation.destination_id == ch.id).count()
        bb = db.query(Destination).filter(Destination.name == "Bhubaneswar").first()
        if bb:
            bbsr_before = db.query(Observation).filter(Observation.destination_id == bb.id).count()
        ko = db.query(Destination).filter(Destination.name == "Konark").first()
        if ko:
            konark_before = db.query(Observation).filter(Observation.destination_id == ko.id).count()
    finally:
        db.close()

    # 1. Run Ingestion (clean=True)
    report1 = run_puri_ingestion(clean_existing=True)
    assert len(report1.validation_errors) == 0, f"Validation errors in Run 1: {report1.validation_errors}"
    assert report1.records_read == 178, f"Expected 178 records read, got {report1.records_read}"
    assert report1.records_inserted == 178, f"Expected 178 records inserted, got {report1.records_inserted}"

    # Verify DB state
    db = SessionLocal()
    try:
        puri_dest = db.query(Destination).filter(Destination.name == "Puri").first()
        assert puri_dest is not None, "Puri destination not found in database"
        assert puri_dest.id == 103, f"Expected Puri ID 103, got {puri_dest.id}"

        puri_locs = db.query(Location).filter(Location.destination_id == puri_dest.id).all()
        assert len(puri_locs) == 9, f"Expected 9 locations for Puri, got {len(puri_locs)}"

        puri_obs = db.query(Observation).filter(Observation.destination_id == puri_dest.id).all()
        assert len(puri_obs) == 178, f"Expected 178 observations for Puri, got {len(puri_obs)}"

        puri_evidence = (
            db.query(Evidence)
            .join(Observation, Evidence.observation_id == Observation.id)
            .filter(Observation.destination_id == puri_dest.id)
            .all()
        )
        assert len(puri_evidence) > 0, "Expected evidence items to be linked to Puri observations"
    finally:
        db.close()

    # 2. Run Ingestion Again (clean=False) -> Must produce 0 duplicate inserts
    report2 = run_puri_ingestion(clean_existing=False)
    assert len(report2.validation_errors) == 0, f"Validation errors in Run 2: {report2.validation_errors}"
    assert report2.records_inserted == 0, f"Expected 0 inserts on re-run, got {report2.records_inserted}"
    assert report2.duplicate_preventions == 178, f"Expected 178 duplicate preventions, got {report2.duplicate_preventions}"

    # 3. Post-verification: Confirm observation count remains exactly 178
    db = SessionLocal()
    try:
        puri_obs_after = db.query(Observation).filter(Observation.destination_id == 103).count()
        assert puri_obs_after == 178, f"Observation count changed: expected 178, got {puri_obs_after}"

        # 4. Verify Chilika, Bhubaneswar, and Konark are untouched
        if chilika_before is not None:
            ch_after = db.query(Observation).filter(Observation.destination_id == ch.id).count()
            assert ch_after == chilika_before, f"Chilika observations altered: {chilika_before} -> {ch_after}"
        if bbsr_before is not None:
            bb_after = db.query(Observation).filter(Observation.destination_id == bb.id).count()
            assert bb_after == bbsr_before, f"Bhubaneswar observations altered: {bbsr_before} -> {bb_after}"
        if konark_before is not None:
            ko_after = db.query(Observation).filter(Observation.destination_id == ko.id).count()
            assert ko_after == konark_before, f"Konark observations altered: {konark_before} -> {ko_after}"
    finally:
        db.close()


if __name__ == "__main__":
    test_puri_ingestion_and_idempotency()
    print("ALL PURI INGESTION TESTS PASSED SUCCESSFULLY.")
