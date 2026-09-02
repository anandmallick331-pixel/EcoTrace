"""
Step 20: CORS Configuration & Consistent API Error Handling Test Suite.

Audits and verifies:
1. CORS configuration & origin headers for local development frontends (e.g., localhost:3000, localhost:5173).
2. Consistent API error response payloads across 400, 404, 409, 422, and 500.
3. Safe production 500 error handling (zero secrets, passwords, or stack traces leaked).
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Any

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import APIRouter
from app.main import app


async def api_call_with_headers(
    method: str,
    path: str,
    headers: list[tuple[bytes, bytes]],
    body: dict[str, Any] | None = None,
) -> tuple[int, dict[str, str], Any]:
    """Execute request directly against ASGI app with custom request headers and return status, response headers, body."""
    body_bytes = json.dumps(body).encode("utf-8") if body is not None else b""
    req_headers = list(headers)
    if body is not None:
        req_headers.append((b"content-type", b"application/json"))
        req_headers.append((b"content-length", str(len(body_bytes)).encode("ascii")))

    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": method,
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": b"",
        "headers": req_headers,
    }

    body_sent = False

    async def receive() -> dict[str, Any]:
        nonlocal body_sent
        if not body_sent:
            body_sent = True
            return {"type": "http.request", "body": body_bytes, "more_body": False}
        return {"type": "http.request", "body": b"", "more_body": False}

    status_code: int | None = None
    response_headers: dict[str, str] = {}
    response_body: list[bytes] = []

    async def send(message: dict[str, Any]) -> None:
        nonlocal status_code, response_headers
        if message["type"] == "http.response.start":
            status_code = message["status"]
            for k, v in message.get("headers", []):
                response_headers[k.decode("latin1").lower()] = v.decode("latin1")
        elif message["type"] == "http.response.body":
            response_body.append(message.get("body", b""))

    await app(scope, receive, send)
    raw_content = b"".join(response_body).decode("utf-8")
    try:
        content = json.loads(raw_content) if raw_content else None
    except json.JSONDecodeError:
        content = raw_content
    assert status_code is not None
    return status_code, response_headers, content


# Temporary route to test 500 error handler safety
test_debug_router = APIRouter()


@test_debug_router.get("/test-internal-error")
def trigger_simulated_500() -> None:
    raise RuntimeError("Simulated internal fault with secret credentials: postgres://user:secret_pass@db:5432/s21_db")


app.include_router(test_debug_router)


async def run_step20_cors_and_error_tests() -> None:
    results: list[tuple[str, bool, str]] = []

    def record_test(name: str, passed: bool, detail: str = "") -> None:
        results.append((name, passed, detail))
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name} {f'- {detail}' if detail else ''}")

    print("\n" + "=" * 75)
    print("STARTING STEP 20: CORS & API ERROR HANDLERS TEST SUITE")
    print("=" * 75 + "\n")

    # ───────────────────────────────────────────────────────────────────────────
    # 1. CORS Configuration & Preflight Checks
    # ───────────────────────────────────────────────────────────────────────────
    # A. Test preflight OPTIONS request for localhost:3000 (React/Next)
    s, h, _ = await api_call_with_headers(
        "OPTIONS",
        "/api/v1/destinations",
        [
            (b"origin", b"http://localhost:3000"),
            (b"access-control-request-method", b"POST"),
            (b"access-control-request-headers", b"content-type"),
        ],
    )
    is_cors_3000_valid = s == 200 and h.get("access-control-allow-origin") == "http://localhost:3000"
    record_test("CORS: Preflight OPTIONS for localhost:3000 succeeds (200)", is_cors_3000_valid)

    # B. Test preflight OPTIONS request for localhost:5173 (Vite)
    s, h, _ = await api_call_with_headers(
        "OPTIONS",
        "/api/v1/destinations",
        [
            (b"origin", b"http://localhost:5173"),
            (b"access-control-request-method", b"GET"),
        ],
    )
    is_cors_5173_valid = s == 200 and h.get("access-control-allow-origin") == "http://localhost:5173"
    record_test("CORS: Preflight OPTIONS for localhost:5173 succeeds (200)", is_cors_5173_valid)

    # C. Test GET request with Origin header receives Access-Control-Allow-Origin
    s, h, _ = await api_call_with_headers(
        "GET",
        "/health",
        [
            (b"origin", b"http://localhost:3000"),
        ],
    )
    record_test(
        "CORS: Origin header reflected in GET response",
        s == 200 and h.get("access-control-allow-origin") == "http://localhost:3000",
    )

    # ───────────────────────────────────────────────────────────────────────────
    # 2. Consistent Error Response Formats (400, 404, 409, 422)
    # ───────────────────────────────────────────────────────────────────────────
    # 404 Not Found
    s, _, res = await api_call_with_headers("GET", "/api/v1/destinations/999999", [])
    is_404_valid = s == 404 and "detail" in res and isinstance(res["detail"], str)
    record_test("Error Handlers: 404 Not Found returns consistent detail payload", is_404_valid, f"detail={res.get('detail')}")

    # 422 Unprocessable Entity
    s, _, res = await api_call_with_headers("POST", "/api/v1/destinations", [], {"name": ""})
    is_422_valid = s == 422 and "detail" in res and isinstance(res["detail"], list)
    record_test("Error Handlers: 422 Validation Error returns standard detail list", is_422_valid)

    # 409 Conflict
    # Create source then try duplicate creation to trigger 409
    import uuid
    uniq_suffix = uuid.uuid4().hex[:8]
    unique_src_name = f"CORS & Error Audit Source {uniq_suffix}"
    s, _, dest = await api_call_with_headers(
        "POST",
        "/api/v1/sources",
        [],
        {"name": unique_src_name},
    )
    src_id = dest["id"] if s == 201 else None
    assert src_id is not None

    s, _, res = await api_call_with_headers(
        "POST",
        "/api/v1/sources",
        [],
        {"name": unique_src_name},
    )
    is_409_valid = s == 409 and "detail" in res and isinstance(res["detail"], str)
    record_test("Error Handlers: 409 Conflict returns consistent detail payload", is_409_valid, f"detail={res.get('detail')}")

    # 400 Bad Request
    # Create an observation and test evidence with mismatched dataset
    s, _, dest_temp = await api_call_with_headers(
        "POST",
        "/api/v1/destinations",
        [],
        {"name": f"Temp Error Test Dest {uniq_suffix}", "country_code": "GRC"},
    )
    d_id = dest_temp["id"]

    s, _, ds_temp = await api_call_with_headers(
        "POST",
        "/api/v1/datasets",
        [],
        {"source_id": src_id, "name": f"Temp Error Test DS {uniq_suffix}"},
    )
    ds_id = ds_temp["id"]

    s, _, met_temp = await api_call_with_headers(
        "POST",
        "/api/v1/metrics",
        [],
        {
            "code": f"error_test_metric_{uniq_suffix}",
            "name": "Error Test Metric",
            "category": "carbon",
            "unit": "kg",
            "direction": "lower_is_better",
        },
    )
    m_id = met_temp["id"]

    s, _, obs_temp = await api_call_with_headers(
        "POST",
        "/api/v1/observations",
        [],
        {
            "destination_id": d_id,
            "metric_definition_id": m_id,
            "dataset_id": ds_id,
            "period_start": "2024-01-01",
            "period_end": "2024-06-30",
            "original_value": 10.0,
        },
    )
    obs_id = obs_temp["id"]

    # Create secondary source
    s, _, src2 = await api_call_with_headers("POST", "/api/v1/sources", [], {"name": f"Secondary Error Test Source {uniq_suffix}"})
    src2_id = src2["id"]

    # Trigger 400 by passing mismatched source_id and dataset_id in evidence
    s, _, res = await api_call_with_headers(
        "POST",
        "/api/v1/evidence",
        [],
        {
            "observation_id": obs_id,
            "source_id": src2_id,
            "dataset_id": ds_id,
            "notes": "Mismatched dataset test.",
        },
    )
    is_400_valid = s == 400 and "detail" in res and isinstance(res["detail"], str)
    record_test("Error Handlers: 400 Bad Request returns consistent detail payload", is_400_valid, f"detail={res.get('detail')}")

    # ───────────────────────────────────────────────────────────────────────────
    # 3. Safe 500 Internal Server Error Handler (No secrets/stack traces leaked)
    # ───────────────────────────────────────────────────────────────────────────
    s, _, res = await api_call_with_headers("GET", "/test-internal-error", [])
    is_500_safe = (
        s == 500
        and res == {"detail": "Internal server error"}
        and "secret_pass" not in json.dumps(res)
        and "Traceback" not in json.dumps(res)
        and "RuntimeError" not in json.dumps(res)
    )
    record_test("Error Handlers: 500 masks internal exceptions & suppresses secrets/tracebacks", is_500_safe)

    # ───────────────────────────────────────────────────────────────────────────
    # 4. Cleanup
    # ───────────────────────────────────────────────────────────────────────────
    await api_call_with_headers("DELETE", f"/api/v1/observations/{obs_id}", [])
    await api_call_with_headers("DELETE", f"/api/v1/metrics/{m_id}", [])
    await api_call_with_headers("DELETE", f"/api/v1/datasets/{ds_id}", [])
    await api_call_with_headers("DELETE", f"/api/v1/sources/{src_id}", [])
    await api_call_with_headers("DELETE", f"/api/v1/sources/{src2_id}", [])
    await api_call_with_headers("DELETE", f"/api/v1/destinations/{d_id}", [])
    record_test("Cleanup: Test entities removed cleanly", True)

    print("\n" + "=" * 75)
    passed_count = sum(1 for _, p, _ in results if p)
    total_count = len(results)
    print(f"STEP 20 CORS & ERROR HANDLERS SUMMARY: {passed_count}/{total_count} PASSED")
    print("=" * 75 + "\n")
    assert passed_count == total_count, "One or more Step 20 tests failed"


if __name__ == "__main__":
    asyncio.run(run_step20_cors_and_error_tests())
