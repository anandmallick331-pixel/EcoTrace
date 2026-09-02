"""
EcoTrace End-to-End Integration Test Suite.
Covers complete flow:
Destination -> Location -> Source -> Dataset -> MetricDefinition -> Observation -> Evidence -> Provenance -> Scores.
Includes validation failures, 404 checks, 409 conflict checks, and complete cleanup.
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app



async def api_call(method: str, path: str, body: dict[str, Any] | None = None) -> tuple[int, Any]:
    """Helper to execute requests against the FastAPI ASGI app without external dependencies."""
    body_bytes = json.dumps(body).encode("utf-8") if body is not None else b""
    headers = (
        [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body_bytes)).encode("ascii")),
        ]
        if body is not None
        else []
    )

    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": method,
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": b"",
        "headers": headers,
    }

    body_sent = False

    async def receive() -> dict[str, Any]:
        nonlocal body_sent
        if not body_sent:
            body_sent = True
            return {"type": "http.request", "body": body_bytes, "more_body": False}
        return {"type": "http.request", "body": b"", "more_body": False}

    status_code: int | None = None
    response_body: list[bytes] = []

    async def send(message: dict[str, Any]) -> None:
        nonlocal status_code
        if message["type"] == "http.response.start":
            status_code = message["status"]
        elif message["type"] == "http.response.body":
            response_body.append(message.get("body", b""))

    await app(scope, receive, send)
    raw_content = b"".join(response_body).decode("utf-8")
    content = json.loads(raw_content) if raw_content else None
    assert status_code is not None
    return status_code, content


async def run_e2e_tests() -> None:
    results: list[tuple[str, bool, str]] = []

    def record_test(name: str, passed: bool, detail: str = "") -> None:
        results.append((name, passed, detail))
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name} {f'- {detail}' if detail else ''}")

    print("\n" + "=" * 70)
    print("STARTING ECOTRACE END-TO-END INTEGRATION TEST SUITE")
    print("=" * 70 + "\n")

    # ───────────────────────────────────────────────────────────────────────────
    # 1. Health Endpoints
    # ───────────────────────────────────────────────────────────────────────────
    s, res = await api_call("GET", "/health")
    record_test("Health Endpoint (/health)", s == 200 and res.get("status") == "ok", f"db_status={res.get('db_status')}")

    s, res = await api_call("GET", "/api/v1/health")
    record_test("Versioned Health Endpoint (/api/v1/health)", s == 200 and res.get("status") == "ok")

    # ───────────────────────────────────────────────────────────────────────────
    # 2. Validation Failures (Pre-flight checks)
    # ───────────────────────────────────────────────────────────────────────────
    s, _ = await api_call("POST", "/api/v1/destinations", {"name": "   "})
    record_test("Validation: Empty destination name rejected (422)", s == 422)

    s, _ = await api_call("POST", "/api/v1/destinations", {"name": "Test", "country_code": "INVALID_CODE"})
    record_test("Validation: Invalid country code rejected (422)", s == 422)

    s, _ = await api_call("POST", "/api/v1/locations", {"destination_id": 1, "latitude": 95.0})
    record_test("Validation: Latitude out of range rejected (422)", s == 422)

    s, _ = await api_call("POST", "/api/v1/sources", {"name": "Test Source", "url": "ftp://not-http.org"})
    record_test("Validation: Invalid URL scheme rejected (422)", s == 422)

    s, _ = await api_call(
        "POST",
        "/api/v1/observations",
        {
            "destination_id": 1,
            "metric_definition_id": 1,
            "dataset_id": 1,
            "period_start": "2024-06-30",
            "period_end": "2024-01-01",
            "original_value": 10.0,
        },
    )
    record_test("Validation: Inverted observation period rejected (422)", s == 422)

    s, _ = await api_call(
        "POST",
        "/api/v1/observations",
        {
            "destination_id": 1,
            "metric_definition_id": 1,
            "dataset_id": 1,
            "period_start": "2024-01-01",
            "period_end": "2024-06-30",
            "original_value": None,
            "normalized_value": None,
        },
    )
    record_test("Validation: Observation missing both values rejected (422)", s == 422)

    s, _ = await api_call(
        "POST",
        "/api/v1/evidence",
        {
            "observation_id": 1,
            "source_id": 1,
            "evidence_type": "document",
            "reference_url": None,
            "raw_excerpt": None,
            "notes": None,
        },
    )
    record_test("Validation: Completely empty evidence artefact payload rejected (422)", s == 422)

    # ───────────────────────────────────────────────────────────────────────────
    # 3. Happy Path: Destination & Location
    # ───────────────────────────────────────────────────────────────────────────
    s, dest = await api_call(
        "POST",
        "/api/v1/destinations",
        {
            "name": "E2E Fiordland Biosphere",
            "country_code": "NZL",
            "region": "South Island",
            "description": "Glacial fiord ecological reserve with high visitor monitoring.",
        },
    )
    dest_id = dest["id"] if s == 201 else None
    record_test("Create Destination (201)", s == 201, f"destination_id={dest_id}")
    assert dest_id is not None

    s, loc = await api_call(
        "POST",
        "/api/v1/locations",
        {
            "destination_id": dest_id,
            "label": "Milford Sound Ranger Outpost",
            "latitude": -44.6715,
            "longitude": 167.9256,
        },
    )
    loc_id = loc["id"] if s == 201 else None
    record_test("Create Location under Destination (201)", s == 201, f"location_id={loc_id}")

    # ───────────────────────────────────────────────────────────────────────────
    # 4. Happy Path: Source & Dataset + Conflict Handling
    # ───────────────────────────────────────────────────────────────────────────
    s, src = await api_call(
        "POST",
        "/api/v1/sources",
        {
            "name": "New Zealand Department of Conservation (DOC)",
            "organisation": "DOC NZ",
            "url": "https://www.doc.govt.nz",
            "description": "Official government conservation agency.",
        },
    )
    src_id = src["id"] if s == 201 else None
    record_test("Create Source (201)", s == 201, f"source_id={src_id}")
    assert src_id is not None

    # Duplicate Source conflict check
    s, _ = await api_call("POST", "/api/v1/sources", {"name": "New Zealand Department of Conservation (DOC)"})
    record_test("Conflict: Duplicate Source name rejected (409)", s == 409)

    s, ds = await api_call(
        "POST",
        "/api/v1/datasets",
        {
            "source_id": src_id,
            "name": "Fiordland Environmental State & Tourism Impact 2024",
            "version": "2024.1",
            "publication_date": "2024-03-01",
            "url": "https://www.doc.govt.nz/reports/fiordland-2024.pdf",
        },
    )
    ds_id = ds["id"] if s == 201 else None
    record_test("Create Dataset under Source (201)", s == 201, f"dataset_id={ds_id}")
    assert ds_id is not None

    # ───────────────────────────────────────────────────────────────────────────
    # 5. Happy Path: Metric Definition + (code, version) Conflict Handling
    # ───────────────────────────────────────────────────────────────────────────
    s, metric = await api_call(
        "POST",
        "/api/v1/metrics",
        {
            "code": "indigenous_vegetation_density",
            "version": "1.0",
            "name": "Native Canopy & Understory Coverage Ratio",
            "category": "biodiversity",
            "unit": "ratio (0-1)",
            "direction": "higher_is_better",
            "description": "Proportion of protected area covered by intact native flora.",
        },
    )
    metric_id = metric["id"] if s == 201 else None
    record_test("Create MetricDefinition (201)", s == 201, f"metric_id={metric_id}")
    assert metric_id is not None

    # Duplicate Metric (code, version) conflict check
    s, _ = await api_call(
        "POST",
        "/api/v1/metrics",
        {
            "code": "indigenous_vegetation_density",
            "version": "1.0",
            "name": "Duplicate Metric",
            "category": "biodiversity",
            "unit": "ratio",
            "direction": "higher_is_better",
        },
    )
    record_test("Conflict: Duplicate Metric (code, version) rejected (409)", s == 409)

    # ───────────────────────────────────────────────────────────────────────────
    # 6. Happy Path: Observation & Natural Key Conflict Handling
    # ───────────────────────────────────────────────────────────────────────────
    obs_payload = {
        "destination_id": dest_id,
        "metric_definition_id": metric_id,
        "dataset_id": ds_id,
        "period_start": "2024-01-01",
        "period_end": "2024-06-30",
        "original_value": 0.87,
        "normalized_value": 0.87,
        "status": "verified",
        "confidence": "high",
        "destination_specificity": "direct",
        "methodology": "LiDAR aerial canopy density survey combined with on-ground transect verification.",
        "assumptions": "Standardized to non-alpine native forest ecosystems.",
    }

    s, obs = await api_call("POST", "/api/v1/observations", obs_payload)
    obs_id = obs["id"] if s == 201 else None
    record_test("Create Observation linking Destination, Metric & Dataset (201)", s == 201, f"observation_id={obs_id}")
    assert obs_id is not None

    # Natural key duplicate conflict check
    s, _ = await api_call("POST", "/api/v1/observations", obs_payload)
    record_test("Conflict: Duplicate Observation natural key rejected (409)", s == 409)

    # ───────────────────────────────────────────────────────────────────────────
    # 7. Happy Path: Evidence & Provenance Linking
    # ───────────────────────────────────────────────────────────────────────────
    s, ev1 = await api_call(
        "POST",
        "/api/v1/evidence",
        {
            "observation_id": obs_id,
            "source_id": src_id,
            "dataset_id": ds_id,
            "evidence_type": "document",
            "reference_url": "https://www.doc.govt.nz/reports/fiordland-canopy-2024-h1.pdf",
            "raw_excerpt": "Fiordland Sector 4 native canopy ratio measured at 0.87 +/- 0.02 across 12 monitoring grids.",
        },
    )
    ev1_id = ev1["id"] if s == 201 else None
    record_test("Create Primary Evidence (Document) (201)", s == 201, f"evidence_id={ev1_id}")

    s, ev2 = await api_call(
        "POST",
        "/api/v1/evidence",
        {
            "observation_id": obs_id,
            "source_id": src_id,
            "evidence_type": "satellite",
            "reference_url": "https://sentinel.esa.int/data/fiordland-ndvi-2024",
            "notes": "Multispectral Sentinel-2 NDVI vegetative index correlation cross-check.",
        },
    )
    ev2_id = ev2["id"] if s == 201 else None
    record_test("Create Supporting Evidence (Satellite) (201)", s == 201, f"evidence_id={ev2_id}")

    # Cross-source mismatched dataset validation
    s, _ = await api_call(
        "POST",
        "/api/v1/evidence",
        {
            "observation_id": obs_id,
            "source_id": 999999,  # unknown source
            "evidence_type": "document",
            "notes": "Invalid source test",
        },
    )
    record_test("Error Handling: Evidence referencing unknown source rejected (404)", s == 404)

    # ───────────────────────────────────────────────────────────────────────────
    # 8. Provenance API Verification
    # ───────────────────────────────────────────────────────────────────────────
    s, prov = await api_call("GET", f"/api/v1/observations/{obs_id}/provenance")
    prov_valid = (
        s == 200
        and prov.get("observation_id") == obs_id
        and prov.get("status") == "verified"
        and prov.get("confidence") == "high"
        and prov.get("destination_specificity") == "direct"
        and prov.get("original_value") == 0.87
        and prov.get("metric_definition", {}).get("code") == "indigenous_vegetation_density"
        and prov.get("dataset", {}).get("name") == "Fiordland Environmental State & Tourism Impact 2024"
        and prov.get("source", {}).get("name") == "New Zealand Department of Conservation (DOC)"
        and len(prov.get("evidence", [])) == 2
    )
    record_test("Provenance API: Complete Observation Lineage Graph (200)", prov_valid)

    s, _ = await api_call("GET", "/api/v1/observations/999999/provenance")
    record_test("Provenance API: Unknown Observation ID rejected (404)", s == 404)

    # ───────────────────────────────────────────────────────────────────────────
    # 9. Score API Verification
    # ───────────────────────────────────────────────────────────────────────────
    s, score_res = await api_call("GET", f"/api/v1/destinations/{dest_id}/scores")
    score_valid = (
        s == 200
        and score_res.get("destination_id") == dest_id
        and score_res.get("score") is None
        and score_res.get("categories") == []
    )
    record_test("Score API: Uncomputed Destination OverallScore Contract (200)", score_valid)

    s, overview_res = await api_call("GET", f"/api/v1/destinations/{dest_id}/scores/overview")
    overview_valid = (
        s == 200
        and overview_res.get("destination_id") == dest_id
        and overview_res.get("score") is None
        and overview_res.get("category_scores") == {}
    )
    record_test("Score API: Uncomputed Destination ScoreOverview Contract (200)", overview_valid)

    s, _ = await api_call("GET", "/api/v1/destinations/999999/scores")
    record_test("Score API: Unknown Destination ID rejected (404)", s == 404)

    # ───────────────────────────────────────────────────────────────────────────
    # 10. Scenario API Verification
    # ───────────────────────────────────────────────────────────────────────────
    s, sc_res = await api_call(
        "POST",
        f"/api/v1/destinations/{dest_id}/scenarios",
        {
            "intervention_type": "visitor_cap",
            "parameter": "daily_visitor_cap",
            "value": 1500.0,
            "description": "Cap peak daily visitors to 1500 to preserve forest understory.",
        },
    )
    sc_id = sc_res.get("scenario_id") if s == 201 else None
    record_test("Scenario API: Create uncomputed scenario simulation (201)", s == 201, f"scenario_id={sc_id}")
    assert sc_id is not None

    s, sc_get = await api_call("GET", f"/api/v1/destinations/{dest_id}/scenarios/{sc_id}")
    sc_valid = (
        s == 200
        and sc_get.get("scenario_id") == sc_id
        and sc_get.get("destination_id") == dest_id
        and sc_get.get("projection_status") == "uncomputed"
        and sc_get.get("baseline_score") is None
    )
    record_test("Scenario API: Retrieve uncomputed scenario projection (200)", sc_valid)

    s, _ = await api_call("GET", f"/api/v1/destinations/999999/scenarios/{sc_id}")
    record_test("Scenario API: Unknown destination returns 404", s == 404)

    # ───────────────────────────────────────────────────────────────────────────
    # 11. Complete Cleanup Verification
    # ───────────────────────────────────────────────────────────────────────────
    if ev1_id:
        s, _ = await api_call("DELETE", f"/api/v1/evidence/{ev1_id}")
        assert s == 204
    if ev2_id:
        s, _ = await api_call("DELETE", f"/api/v1/evidence/{ev2_id}")
        assert s == 204
    if obs_id:
        s, _ = await api_call("DELETE", f"/api/v1/observations/{obs_id}")
        assert s == 204
    if metric_id:
        s, _ = await api_call("DELETE", f"/api/v1/metrics/{metric_id}")
        assert s == 204
    if ds_id:
        s, _ = await api_call("DELETE", f"/api/v1/datasets/{ds_id}")
        assert s == 204
    if src_id:
        s, _ = await api_call("DELETE", f"/api/v1/sources/{src_id}")
        assert s == 204
    if loc_id:
        s, _ = await api_call("DELETE", f"/api/v1/locations/{loc_id}")
        assert s == 204
    if dest_id:
        s, _ = await api_call("DELETE", f"/api/v1/destinations/{dest_id}")
        assert s == 204

    # Confirm 404 after deletion
    s, _ = await api_call("GET", f"/api/v1/destinations/{dest_id}")
    record_test("Cleanup Verification: Deleted entities return 404", s == 404)

    print("\n" + "=" * 70)
    passed_count = sum(1 for _, p, _ in results if p)
    total_count = len(results)
    print(f"E2E INTEGRATION TEST SUMMARY: {passed_count}/{total_count} PASSED")
    print("=" * 70 + "\n")
    assert passed_count == total_count, "One or more integration tests failed"


if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
