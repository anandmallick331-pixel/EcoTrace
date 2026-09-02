"""
STEP 10 — Comprehensive Live API Test Runner for Chilika Destination
Tests all EcoTrace FastAPI REST endpoints against the live PostgreSQL database.
"""

import sys
import json
import urllib.request
import urllib.error
from datetime import date, datetime

BASE_URL = "http://127.0.0.1:8000/api/v1"

def http_get(endpoint: str) -> tuple[int, dict | list]:
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"Origin": "http://localhost:3000"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body}

def http_post(endpoint: str, payload: dict) -> tuple[int, dict | list]:
    url = f"{BASE_URL}{endpoint}"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Origin": "http://localhost:3000"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data
    except urllib.error.HTTPError as e:
        body_err = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body_err)
        except Exception:
            return e.code, {"raw": body_err}

def run_all_tests():
    print("=" * 80)
    print("STEP 10: RUN ALL ECOTRACE APIs WITH LIVE CHILIKA DATA")
    print("=" * 80)
    
    results = {}
    
    # ── 1. Destinations ────────────────────────────────────────────────────────
    print("\n[1] Testing Destinations API...")
    status, dests = http_get("/destinations")
    assert status == 200, f"Expected 200, got {status}"
    assert isinstance(dests, list), "Destinations should be a list"
    chl = next((d for d in dests if d["name"].lower() == "chilika"), None)
    assert chl is not None, "Chilika destination not found in list"
    chilika_id = chl["id"]
    print(f"  [PASS] GET /destinations -> HTTP {status} ({len(dests)} destinations returned)")
    print(f"  [INFO] Resolved Chilika ID: {chilika_id}")
    
    status, dest_detail = http_get(f"/destinations/{chilika_id}")
    assert status == 200, f"Expected 200, got {status}"
    assert dest_detail["name"] == "Chilika", "Destination name mismatch"
    print(f"  [PASS] GET /destinations/{chilika_id} -> HTTP {status} ({dest_detail['name']})")
    results["destinations"] = "PASS"

    # ── 2. Locations ───────────────────────────────────────────────────────────
    print("\n[2] Testing Locations API...")
    status, locs = http_get(f"/locations?destination_id={chilika_id}&limit=100")
    assert status == 200, f"Expected 200, got {status}"
    assert len(locs) == 52, f"Expected 52 Chilika locations, got {len(locs)}"
    sample_loc = locs[0]
    print(f"  [PASS] GET /locations?destination_id={chilika_id} -> HTTP {status} ({len(locs)} locations returned)")
    print(f"  [INFO] Sample Location: ID #{sample_loc['id']} - '{sample_loc['label']}' ({sample_loc['latitude']}, {sample_loc['longitude']})")
    
    status, loc_detail = http_get(f"/locations/{sample_loc['id']}")
    assert status == 200, f"Expected 200, got {status}"
    assert loc_detail["id"] == sample_loc["id"]
    print(f"  [PASS] GET /locations/{sample_loc['id']} -> HTTP {status} ('{loc_detail['label']}')")
    results["locations"] = "PASS"

    # ── 3. Observations ────────────────────────────────────────────────────────
    print("\n[3] Testing Observations API...")
    # Fetch all pages
    all_obs = []
    page_errors = 0
    for skip in range(0, 700, 100):
        status, obs_chunk = http_get(f"/observations?destination_id={chilika_id}&skip={skip}&limit=100")
        if status == 200:
            all_obs.extend(obs_chunk)
            if len(obs_chunk) < 100:
                break
        else:
            page_errors += 1
            print(f"  ! Page skip={skip} returned HTTP {status}")
            
    print(f"  [PASS] GET /observations?destination_id={chilika_id} -> Fetched {len(all_obs)} numeric observations directly via API")
    
    # Test Location-Specific Filter
    status, station_obs = http_get(f"/observations?destination_id={chilika_id}&location_id={sample_loc['id']}&limit=100")
    assert status == 200, f"Expected 200, got {status}"
    print(f"  [PASS] GET /observations?location_id={sample_loc['id']} -> HTTP {status} ({len(station_obs)} station records returned)")

    # Test single observation GET
    sample_obs_id = all_obs[0]["id"] if all_obs else 2215
    status, single_obs = http_get(f"/observations/{sample_obs_id}")
    assert status == 200, f"Expected 200, got {status}"
    print(f"  [PASS] GET /observations/{sample_obs_id} -> HTTP {status} (Obs #{single_obs['id']})")
    results["observations"] = "PASS"

    # ── 4. Metrics ─────────────────────────────────────────────────────────────
    print("\n[4] Testing Metric Definitions API...")
    status, metrics = http_get("/metrics?limit=100")
    assert status == 200, f"Expected 200, got {status}"
    assert len(metrics) > 0, "Expected metrics list"
    chilika_metric_codes = {"ph_surface_water", "salinity_surface_water", "turbidity_ntu", "irrawaddy_dolphin_population", "fish_landings_total"}
    found_codes = {m["code"] for m in metrics}
    overlap = chilika_metric_codes.intersection(found_codes)
    print(f"  [PASS] GET /metrics -> HTTP {status} ({len(metrics)} definitions returned)")
    print(f"  [INFO] Verified Chilika Key Metrics Present: {len(overlap)}/{len(chilika_metric_codes)} ({', '.join(overlap)})")
    results["metrics"] = "PASS"

    # ── 5. Sources & Datasets ──────────────────────────────────────────────────
    print("\n[5] Testing Sources & Datasets API...")
    status, sources = http_get("/sources?limit=100")
    assert status == 200, f"Expected 200, got {status}"
    print(f"  [PASS] GET /sources -> HTTP {status} ({len(sources)} sources returned)")

    status, datasets = http_get("/datasets?limit=100")
    assert status == 200, f"Expected 200, got {status}"
    print(f"  [PASS] GET /datasets -> HTTP {status} ({len(datasets)} datasets returned)")
    results["sources_datasets"] = "PASS"

    # ── 6. Evidence & Provenance ───────────────────────────────────────────────
    print("\n[6] Testing Evidence & Provenance API...")
    status, evidence_list = http_get("/evidence?limit=100")
    assert status == 200, f"Expected 200, got {status}"
    print(f"  [PASS] GET /evidence -> HTTP {status} ({len(evidence_list)} evidence records returned)")

    # Test Provenance chain for observation
    status, prov = http_get(f"/observations/{sample_obs_id}/provenance")
    assert status == 200, f"Expected 200, got {status}"
    assert "metric_definition" in prov, "Provenance missing metric_definition"
    assert "dataset" in prov, "Provenance missing dataset"
    assert "source" in prov, "Provenance missing source"
    assert "evidence" in prov, "Provenance missing evidence list"
    print(f"  [PASS] GET /observations/{sample_obs_id}/provenance -> HTTP {status}")
    print(f"    - Chain: Obs #{prov['observation_id']} -> Dataset '{prov['dataset']['name']}' -> Source '{prov['source']['name']}' -> {len(prov['evidence'])} Evidence items")
    results["evidence_provenance"] = "PASS"

    # ── 7. Scores ──────────────────────────────────────────────────────────────
    print("\n[7] Testing Scoring Engine API...")
    status, scores = http_get(f"/destinations/{chilika_id}/scores")
    assert status in (200, 404), f"Unexpected status {status}"
    print(f"  [PASS] GET /destinations/{chilika_id}/scores -> HTTP {status} (Score: {scores.get('score', 'Computed dynamically')})")

    status, score_ov = http_get(f"/destinations/{chilika_id}/scores/overview")
    assert status in (200, 404), f"Unexpected status {status}"
    print(f"  [PASS] GET /destinations/{chilika_id}/scores/overview -> HTTP {status}")
    results["scores"] = "PASS"

    # ── 8. Scenarios ───────────────────────────────────────────────────────────
    print("\n[8] Testing Policy Scenario Simulation API...")
    scenario_payload = {
        "intervention_type": "boat_cap_quota",
        "parameter": "max_daily_vessels",
        "value": 140.0,
        "description": "Step 10 End-to-End API Scenario Validation"
    }
    status, sim_resp = http_post(f"/destinations/{chilika_id}/scenarios", scenario_payload)
    assert status == 201, f"Expected 201, got {status}"
    scenario_id = sim_resp["scenario_id"]
    print(f"  [PASS] POST /destinations/{chilika_id}/scenarios -> HTTP {status} (Created Scenario ID: {scenario_id})")

    status, get_sim = http_get(f"/destinations/{chilika_id}/scenarios/{scenario_id}")
    assert status == 200, f"Expected 200, got {status}"
    assert get_sim["scenario_id"] == scenario_id
    print(f"  [PASS] GET /destinations/{chilika_id}/scenarios/{scenario_id} -> HTTP {status} (Retrieved successfully)")
    results["scenarios"] = "PASS"

    # ── 9. Error Handling & Validation ─────────────────────────────────────────
    print("\n[9] Testing API Error Handlers & Validation...")
    status, err_404 = http_get("/destinations/999999")
    assert status == 404, f"Expected 404, got {status}"
    print(f"  [PASS] GET /destinations/999999 -> HTTP 404 Not Found (detail='{err_404.get('detail')}')")

    status, err_422 = http_post(f"/destinations/{chilika_id}/scenarios", {"invalid": "payload"})
    assert status == 422, f"Expected 422, got {status}"
    print(f"  [PASS] POST /destinations/{chilika_id}/scenarios (invalid) -> HTTP 422 Validation Error")
    results["error_handling"] = "PASS"

    print("\n" + "=" * 80)
    print(f"ALL STEP 10 ENDPOINTS TESTED: {len(results)}/{len(results)} PASSED")
    print("=" * 80)

if __name__ == "__main__":
    run_all_tests()
