"""
Comprehensive Database and API verification script for Phase 3.
"""

import sys
import os
import json

backend_dir = r"c:\S21_new\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal
from app.models.destination import Destination, Location
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source
from app.models.evidence import Evidence
from app.models.enums import ObservationStatus

def verify_database_and_apis():
    db = SessionLocal()
    report = {}
    try:
        # 1. Destination check
        destinations = db.query(Destination).all()
        dest_map = {d.name: d.id for d in destinations}
        puri_id = dest_map.get("Puri", 103)
        chilika_id = dest_map.get("Chilika", 44)
        bbsr_id = dest_map.get("Bhubaneswar", 100)
        konark_id = dest_map.get("Konark", 102)

        report["destinations"] = {d.name: d.id for d in destinations}

        # Puri specific checks
        puri_locs = db.query(Location).filter(Location.destination_id == puri_id).all()
        puri_obs = db.query(Observation).filter(Observation.destination_id == puri_id).all()
        puri_obs_count = len(puri_obs)
        
        # Count DATA_GAP rows: original_value is None and ('DATA_GAP' in notes or status == RAW)
        puri_gaps = [o for o in puri_obs if o.original_value is None and ("DATA_GAP" in (o.notes or "") or "DATA_GAP" in (o.methodology or ""))]
        puri_gap_count = len(puri_gaps)

        # Evidence count for Puri
        puri_evidence_count = (
            db.query(Evidence)
            .join(Observation, Evidence.observation_id == Observation.id)
            .filter(Observation.destination_id == puri_id)
            .count()
        )

        # Datasets and Sources linked
        sources_count = db.query(Source).count()
        datasets_count = db.query(Dataset).count()

        # Non-interference checks
        chilika_obs_count = db.query(Observation).filter(Observation.destination_id == chilika_id).count() if chilika_id else 0
        bbsr_obs_count = db.query(Observation).filter(Observation.destination_id == bbsr_id).count() if bbsr_id else 0
        konark_obs_count = db.query(Observation).filter(Observation.destination_id == konark_id).count() if konark_id else 0

        chilika_locs_count = db.query(Location).filter(Location.destination_id == chilika_id).count() if chilika_id else 0
        bbsr_locs_count = db.query(Location).filter(Location.destination_id == bbsr_id).count() if bbsr_id else 0
        konark_locs_count = db.query(Location).filter(Location.destination_id == konark_id).count() if konark_id else 0

        report["puri"] = {
            "destination_id": puri_id,
            "locations_count": len(puri_locs),
            "observations_count": puri_obs_count,
            "data_gap_count": puri_gap_count,
            "evidence_count": puri_evidence_count,
            "registered_sources_count": sources_count,
            "registered_datasets_count": datasets_count,
        }

        report["isolation_verification"] = {
            "chilika": {"id": chilika_id, "observations": chilika_obs_count, "locations": chilika_locs_count},
            "bhubaneswar": {"id": bbsr_id, "observations": bbsr_obs_count, "locations": bbsr_locs_count},
            "konark": {"id": konark_id, "observations": konark_obs_count, "locations": konark_locs_count},
        }

    finally:
        db.close()

    # 2. Test FastAPI endpoints via TestClient
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    api_results = {}

    # Test 1: GET /api/v1/destinations
    r1 = client.get("/api/v1/destinations")
    api_results["GET /api/v1/destinations"] = {
        "status_code": r1.status_code,
        "count": len(r1.json()) if r1.status_code == 200 else 0,
        "destinations": [f"ID {d.get('id')}: {d.get('name')}" for d in r1.json()] if r1.status_code == 200 else [],
    }

    # Test 2: GET /api/v1/locations?destination_id=103
    r2 = client.get(f"/api/v1/locations?destination_id={puri_id}")
    api_results[f"GET /api/v1/locations?destination_id={puri_id}"] = {
        "status_code": r2.status_code,
        "count": len(r2.json()) if r2.status_code == 200 else 0,
        "locations": [loc.get("label") or loc.get("name") for loc in r2.json()] if r2.status_code == 200 else [],
    }

    # Test 3: GET /api/v1/observations?destination_id=103
    r3 = client.get(f"/api/v1/observations?destination_id={puri_id}&limit=300")
    api_results[f"GET /api/v1/observations?destination_id={puri_id}"] = {
        "status_code": r3.status_code,
        "count": len(r3.json()) if r3.status_code == 200 else 0,
    }

    # Test 4: GET /api/v1/destinations/{puri_id}/scores
    r4 = client.get(f"/api/v1/destinations/{puri_id}/scores")
    api_results[f"GET /api/v1/destinations/{puri_id}/scores"] = {
        "status_code": r4.status_code,
        "response_data": r4.json() if r4.status_code == 200 else r4.text[:200],
    }

    # Test 5: GET /api/v1/destinations/{puri_id}/scores/overview
    r5 = client.get(f"/api/v1/destinations/{puri_id}/scores/overview")
    api_results[f"GET /api/v1/destinations/{puri_id}/scores/overview"] = {
        "status_code": r5.status_code,
        "response_data": r5.json() if r5.status_code == 200 else r5.text[:200],
    }

    # Also test /api/v1/destinations/{puri_id}
    r6 = client.get(f"/api/v1/destinations/{puri_id}")
    api_results[f"GET /api/v1/destinations/{puri_id}"] = {
        "status_code": r6.status_code,
        "data": r6.json() if r6.status_code == 200 else r6.text[:200],
    }

    print("=" * 80)
    print("PHASE 3: DATABASE VERIFICATION REPORT")
    print("=" * 80)
    print(json.dumps(report, indent=2))

    print("\n" + "=" * 80)
    print("PHASE 3: API ENDPOINT TESTING REPORT")
    print("=" * 80)
    print(json.dumps(api_results, indent=2))

if __name__ == "__main__":
    verify_database_and_apis()
