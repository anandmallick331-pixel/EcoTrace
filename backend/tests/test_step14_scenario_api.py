"""
Step 14: Scenario API Structure & Pluggable Intervention Contract Test Suite.

Audits and verifies:
1. POST /api/v1/destinations/{destination_id}/scenarios contract.
2. GET /api/v1/destinations/{destination_id}/scenarios/{scenario_id} retrieval.
3. Clean uncomputed null/empty response values by default (no hardcoded projections/ML).
4. Proper 404 for unknown destination and unknown scenario.
5. Pluggable ScenarioEngineInterface custom engine registration & delegation.
6. Complete OpenAPI documentation for scenario routes and schemas.
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Any

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session

from app.main import app
from app.schemas.scenario import ScenarioCreate, ScenarioMetricImpact, ScenarioResponse
from app.services.scenario import ScenarioEngineInterface, ScenarioService


async def api_call(method: str, path: str, body: dict[str, Any] | None = None) -> tuple[int, Any]:
    """Helper to execute requests directly against ASGI app."""
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


class MockInterventionEngine(ScenarioEngineInterface):
    """Test engine verifying pluggable scenario integration."""

    def __init__(self) -> None:
        self.simulated: dict[str, ScenarioResponse] = {}

    def simulate_scenario(
        self, destination_id: int, payload: ScenarioCreate, db: Session
    ) -> ScenarioResponse | None:
        scenario_id = "mock-sim-12345"
        resp = ScenarioResponse(
            scenario_id=scenario_id,
            destination_id=destination_id,
            intervention_type=payload.intervention_type,
            parameter=payload.parameter,
            value=payload.value,
            description=payload.description,
            baseline_score=50.0,
            projected_score=62.5,
            score_change=12.5,
            affected_metrics=[
                ScenarioMetricImpact(
                    metric_code="co2_per_guest_night",
                    metric_name="CO2 per Guest Night",
                    baseline_value=10.0,
                    projected_value=7.0,
                    delta=-3.0,
                    unit="kg CO2e",
                )
            ],
            confidence=None,
            assumptions=["Mock pluggable engine simulation assumption."],
            projection_status="completed",
        )
        self.simulated[scenario_id] = resp
        return resp

    def get_scenario(
        self, destination_id: int, scenario_id: str, db: Session
    ) -> ScenarioResponse | None:
        sc = self.simulated.get(scenario_id)
        if sc and sc.destination_id == destination_id:
            return sc
        return None


async def run_step14_scenario_tests() -> None:
    results: list[tuple[str, bool, str]] = []

    def record_test(name: str, passed: bool, detail: str = "") -> None:
        results.append((name, passed, detail))
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name} {f'- {detail}' if detail else ''}")

    print("\n" + "=" * 75)
    print("STARTING STEP 14: SCENARIO API STRUCTURE & PLUGGABLE CONTRACT TEST SUITE")
    print("=" * 75 + "\n")

    # ───────────────────────────────────────────────────────────────────────────
    # 1. OpenAPI Specification Audit
    # ───────────────────────────────────────────────────────────────────────────
    openapi_spec = app.openapi()
    record_test("OpenAPI: Generation succeeds", openapi_spec is not None and "paths" in openapi_spec)

    schemas = openapi_spec.get("components", {}).get("schemas", {})
    record_test("OpenAPI: ScenarioCreate schema documented", "ScenarioCreate" in schemas)
    record_test("OpenAPI: ScenarioResponse schema documented", "ScenarioResponse" in schemas)
    record_test("OpenAPI: ScenarioMetricImpact schema documented", "ScenarioMetricImpact" in schemas)

    paths = openapi_spec.get("paths", {})
    record_test(
        "OpenAPI: POST /api/v1/destinations/{destination_id}/scenarios path registered",
        "/api/v1/destinations/{destination_id}/scenarios" in paths,
    )
    record_test(
        "OpenAPI: GET /api/v1/destinations/{destination_id}/scenarios/{scenario_id} path registered",
        "/api/v1/destinations/{destination_id}/scenarios/{scenario_id}" in paths,
    )

    # ───────────────────────────────────────────────────────────────────────────
    # 2. Base Destination Setup
    # ───────────────────────────────────────────────────────────────────────────
    s, dest = await api_call(
        "POST",
        "/api/v1/destinations",
        {
            "name": "Scenario Test Destination",
            "country_code": "NOR",
            "region": "Vestland",
            "description": "Fjord region evaluating cruise ship emission interventions.",
        },
    )
    dest_id = dest["id"] if s == 201 else None
    record_test("Setup: Create Test Destination (201)", s == 201, f"dest_id={dest_id}")
    assert dest_id is not None

    # ───────────────────────────────────────────────────────────────────────────
    # 3. Uncomputed Scenario Creation Contract
    # ───────────────────────────────────────────────────────────────────────────
    scenario_payload = {
        "intervention_type": "renewable_transition",
        "parameter": "renewable_energy_share_pct",
        "value": 85.0,
        "description": "Mandate 85% renewable energy transition across maritime and hotel operators by 2028.",
    }

    s, created_sc = await api_call("POST", f"/api/v1/destinations/{dest_id}/scenarios", scenario_payload)
    record_test("Create Scenario simulation (201)", s == 201)
    assert s == 201
    scenario_id = created_sc.get("scenario_id")
    record_test("Contract: Scenario ID generated", bool(scenario_id), f"scenario_id={scenario_id}")

    is_uncomputed_clean = (
        created_sc.get("destination_id") == dest_id
        and created_sc.get("intervention_type") == "renewable_transition"
        and created_sc.get("parameter") == "renewable_energy_share_pct"
        and created_sc.get("value") == 85.0
        and created_sc.get("baseline_score") is None
        and created_sc.get("projected_score") is None
        and created_sc.get("score_change") is None
        and created_sc.get("affected_metrics") == []
        and created_sc.get("confidence") is None
        and created_sc.get("assumptions") == []
        and created_sc.get("projection_status") == "uncomputed"
    )
    record_test("Contract: Uncomputed Scenario returns clean null/empty fields", is_uncomputed_clean)

    # ───────────────────────────────────────────────────────────────────────────
    # 4. Scenario Retrieval
    # ───────────────────────────────────────────────────────────────────────────
    s, fetched_sc = await api_call("GET", f"/api/v1/destinations/{dest_id}/scenarios/{scenario_id}")
    record_test("Get Scenario by ID (200)", s == 200)
    record_test(
        "Contract: Retrieved scenario matches created scenario",
        fetched_sc.get("scenario_id") == scenario_id
        and fetched_sc.get("intervention_type") == "renewable_transition"
        and fetched_sc.get("projection_status") == "uncomputed",
    )

    # ───────────────────────────────────────────────────────────────────────────
    # 5. Error Handling (404 & 422)
    # ───────────────────────────────────────────────────────────────────────────
    # Unknown destination on POST
    s, _ = await api_call("POST", "/api/v1/destinations/999999/scenarios", scenario_payload)
    record_test("Error Handling: POST to unknown destination returns 404", s == 404)

    # Unknown destination on GET
    s, _ = await api_call("GET", f"/api/v1/destinations/999999/scenarios/{scenario_id}")
    record_test("Error Handling: GET with unknown destination returns 404", s == 404)

    # Unknown scenario ID on GET
    s, _ = await api_call("GET", f"/api/v1/destinations/{dest_id}/scenarios/non-existent-uuid-9999")
    record_test("Error Handling: GET with unknown scenario ID returns 404", s == 404)

    # Validation errors on POST
    s, _ = await api_call(
        "POST",
        f"/api/v1/destinations/{dest_id}/scenarios",
        {
            "intervention_type": "",  # Empty min_length=1
            "parameter": "test",
            "value": 10.0,
        },
    )
    record_test("Error Handling: Empty intervention_type returns 422", s == 422)

    # ───────────────────────────────────────────────────────────────────────────
    # 6. Pluggable ScenarioEngineInterface Test
    # ───────────────────────────────────────────────────────────────────────────
    mock_engine = MockInterventionEngine()
    ScenarioService.register_engine(mock_engine)

    s, pluggable_sc = await api_call("POST", f"/api/v1/destinations/{dest_id}/scenarios", scenario_payload)
    record_test("Pluggable Engine: POST simulation uses registered engine (201)", s == 201)
    is_engine_output_valid = (
        pluggable_sc.get("scenario_id") == "mock-sim-12345"
        and pluggable_sc.get("baseline_score") == 50.0
        and pluggable_sc.get("projected_score") == 62.5
        and pluggable_sc.get("score_change") == 12.5
        and pluggable_sc.get("projection_status") == "completed"
        and len(pluggable_sc.get("affected_metrics", [])) == 1
    )
    record_test("Pluggable Engine: Custom calculations and metric deltas populated", is_engine_output_valid)

    s, fetched_pluggable_sc = await api_call("GET", f"/api/v1/destinations/{dest_id}/scenarios/mock-sim-12345")
    record_test("Pluggable Engine: GET retrieves from registered engine (200)", s == 200 and fetched_pluggable_sc.get("baseline_score") == 50.0)

    # Reset engine back to default uncomputed behavior
    ScenarioService.register_engine(None)  # type: ignore[arg-type]

    # Verify uncomputed fallback works again
    s, reset_sc = await api_call("POST", f"/api/v1/destinations/{dest_id}/scenarios", scenario_payload)
    record_test("Pluggable Engine: Reset returns to default uncomputed contract", s == 201 and reset_sc.get("projection_status") == "uncomputed")

    # ───────────────────────────────────────────────────────────────────────────
    # 7. Cleanup
    # ───────────────────────────────────────────────────────────────────────────
    s, _ = await api_call("DELETE", f"/api/v1/destinations/{dest_id}")
    record_test("Cleanup: Delete test destination (204)", s == 204)

    print("\n" + "=" * 75)
    passed_count = sum(1 for _, p, _ in results if p)
    total_count = len(results)
    print(f"STEP 14 SCENARIO API SUMMARY: {passed_count}/{total_count} PASSED")
    print("=" * 75 + "\n")
    assert passed_count == total_count, "One or more scenario tests failed"


if __name__ == "__main__":
    asyncio.run(run_step14_scenario_tests())
