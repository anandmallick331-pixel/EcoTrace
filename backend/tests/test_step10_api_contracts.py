"""
Step 10: Metric, Observation, Evidence, and Provenance API Contracts Test Suite.

Audits and verifies:
1. Complete OpenAPI specification generation & schema components.
2. Distinct handling of zero (0.0) vs null (None).
3. ConfidenceLevel.UNKNOWN distinct from null.
4. Observation contracts exposing metric, value, unit (via definition), period, status, confidence, methodology.
5. Evidence contracts exposing source, dataset, type, reference artefacts.
6. Provenance lineage contracts returning nested entities and evidence chains.
7. Consistent HTTP 400, 404, 409, and 422 error codes.
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Any

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app


async def api_call(method: str, path: str, body: dict[str, Any] | None = None) -> tuple[int, Any]:
    """Helper to execute requests against the FastAPI ASGI app directly."""
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


async def run_step10_contract_tests() -> None:
    results: list[tuple[str, bool, str]] = []

    def record_test(name: str, passed: bool, detail: str = "") -> None:
        results.append((name, passed, detail))
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name} {f'- {detail}' if detail else ''}")

    print("\n" + "=" * 75)
    print("STARTING STEP 10: METRIC & EVIDENCE API CONTRACTS AUDIT SUITE")
    print("=" * 75 + "\n")

    # ───────────────────────────────────────────────────────────────────────────
    # 1. OpenAPI Specification Audit
    # ───────────────────────────────────────────────────────────────────────────
    openapi_spec = app.openapi()
    record_test("OpenAPI: Generation succeeds", openapi_spec is not None and "paths" in openapi_spec)

    schemas = openapi_spec.get("components", {}).get("schemas", {})
    required_schemas = [
        "MetricDefinitionResponse",
        "MetricDefinitionCreate",
        "MetricDefinitionUpdate",
        "ObservationResponse",
        "ObservationCreate",
        "ObservationUpdate",
        "ObservationProvenanceResponse",
        "EvidenceResponse",
        "EvidenceCreate",
        "EvidenceUpdate",
        "SourceResponse",
        "SourceCreate",
        "DatasetResponse",
        "DatasetCreate",
        "MetricDirection",
        "ObservationStatus",
        "ConfidenceLevel",
        "DestinationSpecificity",
        "EvidenceType",
    ]
    all_schemas_present = all(s in schemas for s in required_schemas)
    record_test("OpenAPI: All required Step 10 schemas and enums documented", all_schemas_present)

    paths = openapi_spec.get("paths", {})
    required_paths = [
        "/api/v1/metrics",
        "/api/v1/metrics/{metric_id}",
        "/api/v1/metrics/code/{code}/version/{version}",
        "/api/v1/observations",
        "/api/v1/observations/{observation_id}",
        "/api/v1/observations/{observation_id}/provenance",
        "/api/v1/evidence",
        "/api/v1/evidence/{evidence_id}",
        "/api/v1/sources",
        "/api/v1/sources/{source_id}",
        "/api/v1/datasets",
        "/api/v1/datasets/{dataset_id}",
    ]
    all_paths_present = all(p in paths for p in required_paths)
    record_test("OpenAPI: All resource paths documented", all_paths_present)

    # ───────────────────────────────────────────────────────────────────────────
    # 2. Setup Base Test Entities
    # ───────────────────────────────────────────────────────────────────────────
    # Destination
    s, dest = await api_call(
        "POST",
        "/api/v1/destinations",
        {
            "name": "API Contract Destination",
            "country_code": "ISL",
            "region": "Nordurland",
            "description": "Geothermal and arctic ecosystem destination.",
        },
    )
    dest_id = dest["id"] if s == 201 else None
    record_test("Setup: Create Test Destination (201)", s == 201, f"dest_id={dest_id}")
    assert dest_id is not None

    # Source
    s, src = await api_call(
        "POST",
        "/api/v1/sources",
        {
            "name": "Icelandic Environmental Agency",
            "organisation": "Umhverfisstofnun",
            "url": "https://ust.is",
            "description": "Official government environmental surveillance agency.",
        },
    )
    src_id = src["id"] if s == 201 else None
    record_test("Setup: Create Test Source (201)", s == 201, f"src_id={src_id}")
    assert src_id is not None

    # Dataset
    s, ds = await api_call(
        "POST",
        "/api/v1/datasets",
        {
            "source_id": src_id,
            "name": "Geothermal Groundwater Quality Report 2024",
            "version": "1.0",
            "publication_date": "2024-04-15",
            "url": "https://ust.is/reports/groundwater-2024.pdf",
        },
    )
    ds_id = ds["id"] if s == 201 else None
    record_test("Setup: Create Test Dataset (201)", s == 201, f"ds_id={ds_id}")
    assert ds_id is not None

    # Metric Definition
    s, metric = await api_call(
        "POST",
        "/api/v1/metrics",
        {
            "code": "sulfur_dioxide_emission_flux",
            "version": "1.0",
            "name": "Sulfur Dioxide Emission Flux Rate",
            "category": "air_quality",
            "unit": "mg/m3",
            "direction": "lower_is_better",
            "description": "Ambient concentration of sulfur dioxide measured at perimeter stations.",
        },
    )
    metric_id = metric["id"] if s == 201 else None
    record_test("Setup: Create Test Metric (201)", s == 201, f"metric_id={metric_id}")
    assert metric_id is not None

    # ───────────────────────────────────────────────────────────────────────────
    # 3. Value Distinction: Zero (0.0) vs Null (None) & UNKNOWN
    # ───────────────────────────────────────────────────────────────────────────
    # Case A: Explicit 0.0 values (Zero is a valid physical measurement, NOT null)
    s, zero_obs = await api_call(
        "POST",
        "/api/v1/observations",
        {
            "destination_id": dest_id,
            "metric_definition_id": metric_id,
            "dataset_id": ds_id,
            "period_start": "2024-01-01",
            "period_end": "2024-01-31",
            "original_value": 0.0,
            "normalized_value": 0.0,
            "status": "verified",
            "confidence": "unknown",
            "destination_specificity": "direct",
            "methodology": "Optical absorption sensor with zero detected ppm.",
        },
    )
    zero_obs_id = zero_obs["id"] if s == 201 else None
    record_test("Create Observation with 0.0 values (201)", s == 201, f"obs_id={zero_obs_id}")
    assert zero_obs_id is not None

    # Verify response preserves 0.0 and does not convert to null
    is_zero_preserved = (
        zero_obs.get("original_value") == 0.0
        and zero_obs.get("original_value") is not None
        and zero_obs.get("normalized_value") == 0.0
        and zero_obs.get("normalized_value") is not None
        and zero_obs.get("confidence") == "unknown"
    )
    record_test("Contract: 0.0 values preserved distinct from None/null", is_zero_preserved)

    # Case B: Observation with original_value=None and normalized_value=4.5
    s, partial_obs = await api_call(
        "POST",
        "/api/v1/observations",
        {
            "destination_id": dest_id,
            "metric_definition_id": metric_id,
            "dataset_id": ds_id,
            "period_start": "2024-02-01",
            "period_end": "2024-02-28",
            "original_value": None,
            "normalized_value": 4.5,
            "status": "raw",
            "confidence": "medium",
            "destination_specificity": "regional",
        },
    )
    partial_obs_id = partial_obs["id"] if s == 201 else None
    record_test("Create Observation with original_value=None & normalized_value=4.5 (201)", s == 201)
    assert partial_obs_id is not None

    is_partial_valid = (
        partial_obs.get("original_value") is None
        and partial_obs.get("normalized_value") == 4.5
        and partial_obs.get("confidence") == "medium"
    )
    record_test("Contract: Null original_value preserved while normalized_value is populated", is_partial_valid)

    # ───────────────────────────────────────────────────────────────────────────
    # 4. Observation Contract Audit (Exposes metric, value, period, status, confidence, methodology)
    # ───────────────────────────────────────────────────────────────────────────
    s, fetched_obs = await api_call("GET", f"/api/v1/observations/{zero_obs_id}")
    obs_contract_valid = (
        s == 200
        and "id" in fetched_obs
        and "destination_id" in fetched_obs
        and "metric_definition_id" in fetched_obs
        and "dataset_id" in fetched_obs
        and fetched_obs["period_start"] == "2024-01-01"
        and fetched_obs["period_end"] == "2024-01-31"
        and fetched_obs["original_value"] == 0.0
        and fetched_obs["normalized_value"] == 0.0
        and fetched_obs["status"] == "verified"
        and fetched_obs["confidence"] == "unknown"
        and fetched_obs["destination_specificity"] == "direct"
        and "methodology" in fetched_obs
        and "created_at" in fetched_obs
        and "updated_at" in fetched_obs
    )
    record_test("Contract: ObservationResponse exposes all required metric/value/period/status fields", obs_contract_valid)

    # ───────────────────────────────────────────────────────────────────────────
    # 5. Evidence Contract Audit (Exposes source, dataset, type, reference)
    # ───────────────────────────────────────────────────────────────────────────
    s, ev = await api_call(
        "POST",
        "/api/v1/evidence",
        {
            "observation_id": zero_obs_id,
            "source_id": src_id,
            "dataset_id": ds_id,
            "evidence_type": "document",
            "reference_url": "https://ust.is/docs/audit-2024-01.pdf",
            "raw_excerpt": "Station Alpha SO2 readings for Jan 2024 recorded 0.0 mg/m3 baseline.",
            "notes": "Zero emissions verified across continuous gas chromatography array.",
        },
    )
    ev_id = ev["id"] if s == 201 else None
    record_test("Create Evidence item (201)", s == 201, f"ev_id={ev_id}")
    assert ev_id is not None

    s, fetched_ev = await api_call("GET", f"/api/v1/evidence/{ev_id}")
    ev_contract_valid = (
        s == 200
        and fetched_ev["observation_id"] == zero_obs_id
        and fetched_ev["source_id"] == src_id
        and fetched_ev["dataset_id"] == ds_id
        and fetched_ev["evidence_type"] == "document"
        and fetched_ev["reference_url"] == "https://ust.is/docs/audit-2024-01.pdf"
        and "Station Alpha" in fetched_ev["raw_excerpt"]
        and "notes" in fetched_ev
        and "created_at" in fetched_ev
    )
    record_test("Contract: EvidenceResponse exposes source/dataset/type/reference/notes", ev_contract_valid)

    # ───────────────────────────────────────────────────────────────────────────
    # 6. Provenance Contract Audit (Exposes full lineage graph)
    # ───────────────────────────────────────────────────────────────────────────
    s, prov = await api_call("GET", f"/api/v1/observations/{zero_obs_id}/provenance")
    prov_contract_valid = (
        s == 200
        and prov["observation_id"] == zero_obs_id
        and prov["original_value"] == 0.0
        and prov["normalized_value"] == 0.0
        and prov["status"] == "verified"
        and prov["confidence"] == "unknown"
        # Nested Metric Definition with unit & direction
        and prov["metric_definition"]["code"] == "sulfur_dioxide_emission_flux"
        and prov["metric_definition"]["unit"] == "mg/m3"
        and prov["metric_definition"]["direction"] == "lower_is_better"
        # Nested Dataset
        and prov["dataset"]["name"] == "Geothermal Groundwater Quality Report 2024"
        and prov["dataset"]["version"] == "1.0"
        # Nested Source
        and prov["source"]["name"] == "Icelandic Environmental Agency"
        and prov["source"]["organisation"] == "Umhverfisstofnun"
        # Evidence items array
        and len(prov["evidence"]) == 1
        and prov["evidence"][0]["reference_url"] == "https://ust.is/docs/audit-2024-01.pdf"
    )
    record_test("Contract: ObservationProvenanceResponse exposes complete lineage graph", prov_contract_valid)

    # ───────────────────────────────────────────────────────────────────────────
    # 7. Error Handling & HTTP Status Code Invariants (400, 404, 409, 422)
    # ───────────────────────────────────────────────────────────────────────────
    # 404 on missing entity IDs
    s, _ = await api_call("GET", "/api/v1/metrics/999999")
    record_test("Error Handling: Missing Metric ID returns 404", s == 404)

    s, _ = await api_call("GET", "/api/v1/observations/999999")
    record_test("Error Handling: Missing Observation ID returns 404", s == 404)

    s, _ = await api_call("GET", "/api/v1/evidence/999999")
    record_test("Error Handling: Missing Evidence ID returns 404", s == 404)

    s, _ = await api_call("GET", "/api/v1/sources/999999")
    record_test("Error Handling: Missing Source ID returns 404", s == 404)

    s, _ = await api_call("GET", "/api/v1/datasets/999999")
    record_test("Error Handling: Missing Dataset ID returns 404", s == 404)

    # 409 on duplicate records
    s, _ = await api_call(
        "POST",
        "/api/v1/metrics",
        {
            "code": "sulfur_dioxide_emission_flux",
            "version": "1.0",
            "name": "Duplicate Metric",
            "category": "air_quality",
            "unit": "mg/m3",
            "direction": "lower_is_better",
        },
    )
    record_test("Error Handling: Duplicate Metric (code, version) returns 409", s == 409)

    s, _ = await api_call("POST", "/api/v1/sources", {"name": "Icelandic Environmental Agency"})
    record_test("Error Handling: Duplicate Source name returns 409", s == 409)

    s, _ = await api_call(
        "POST",
        "/api/v1/observations",
        {
            "destination_id": dest_id,
            "metric_definition_id": metric_id,
            "dataset_id": ds_id,
            "period_start": "2024-01-01",
            "period_end": "2024-01-31",
            "original_value": 5.0,
        },
    )
    record_test("Error Handling: Duplicate Observation natural key returns 409", s == 409)

    # 400 on mismatched dataset and source in evidence
    # Create an independent second source
    s, other_src = await api_call("POST", "/api/v1/sources", {"name": "Secondary Mismatched Source"})
    other_src_id = other_src["id"] if s == 201 else None
    assert other_src_id is not None

    s, _ = await api_call(
        "POST",
        "/api/v1/evidence",
        {
            "observation_id": zero_obs_id,
            "source_id": other_src_id,  # Mismatched with ds_id
            "dataset_id": ds_id,
            "evidence_type": "document",
            "notes": "Mismatched source and dataset test.",
        },
    )
    record_test("Error Handling: Evidence with mismatched Source & Dataset returns 400", s == 400)

    # 422 on validation errors
    s, _ = await api_call(
        "POST",
        "/api/v1/metrics",
        {
            "code": "INVALID CODE WITH SPACES",
            "name": "Invalid Code Metric",
            "category": "test",
            "unit": "test",
            "direction": "lower_is_better",
        },
    )
    record_test("Error Handling: Metric with non-snake_case code returns 422", s == 422)

    s, _ = await api_call(
        "POST",
        "/api/v1/observations",
        {
            "destination_id": dest_id,
            "metric_definition_id": metric_id,
            "dataset_id": ds_id,
            "period_start": "2024-12-31",
            "period_end": "2024-01-01",  # Inverted period
            "original_value": 1.0,
        },
    )
    record_test("Error Handling: Inverted observation date period returns 422", s == 422)

    # ───────────────────────────────────────────────────────────────────────────
    # 8. Cleanup
    # ───────────────────────────────────────────────────────────────────────────
    if ev_id:
        s, _ = await api_call("DELETE", f"/api/v1/evidence/{ev_id}")
        assert s == 204
    if zero_obs_id:
        s, _ = await api_call("DELETE", f"/api/v1/observations/{zero_obs_id}")
        assert s == 204
    if partial_obs_id:
        s, _ = await api_call("DELETE", f"/api/v1/observations/{partial_obs_id}")
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
    if other_src_id:
        s, _ = await api_call("DELETE", f"/api/v1/sources/{other_src_id}")
        assert s == 204
    if dest_id:
        s, _ = await api_call("DELETE", f"/api/v1/destinations/{dest_id}")
        assert s == 204

    record_test("Cleanup: All created entities cleaned up cleanly", True)

    print("\n" + "=" * 75)
    passed_count = sum(1 for _, p, _ in results if p)
    total_count = len(results)
    print(f"STEP 10 API CONTRACTS SUMMARY: {passed_count}/{total_count} PASSED")
    print("=" * 75 + "\n")
    assert passed_count == total_count, "One or more contract audit tests failed"


if __name__ == "__main__":
    asyncio.run(run_step10_contract_tests())
