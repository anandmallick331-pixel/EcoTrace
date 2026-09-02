"""
Comprehensive System & Health Probe Verification Script.
"""

import asyncio
import json
import sys
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import check_db_connection
from app.main import app


async def main() -> None:
    print("=" * 70)
    print("ECOTRACE SYSTEM HEALTH & PROBE VERIFICATION")
    print("=" * 70)

    # 1. Direct DB Connection Probe
    db_ok = check_db_connection()
    print(f"Direct PostgreSQL probe: check_db_connection() -> {db_ok}")
    assert db_ok is True, "PostgreSQL direct connection failed"

    # Helper for ASGI call
    async def call_endpoint(path: str) -> tuple[int, dict | str]:
        scope = {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "path": path,
            "raw_path": path.encode("ascii"),
            "query_string": b"",
            "headers": [],
        }
        res_body: list[bytes] = []
        status_code: int | None = None

        async def receive() -> dict:
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message: dict) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            elif message["type"] == "http.response.body":
                res_body.append(message.get("body", b""))

        await app(scope, receive, send)
        raw = b"".join(res_body).decode("utf-8")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = raw
        assert status_code is not None
        return status_code, parsed

    # 2. Probe /health
    s_health, r_health = await call_endpoint("/health")
    print(f"GET /health -> HTTP {s_health}, body={r_health}")
    assert s_health == 200
    assert isinstance(r_health, dict) and r_health.get("db_status") == "ok"

    # 3. Probe /api/v1/health
    s_v1_health, r_v1_health = await call_endpoint("/api/v1/health")
    print(f"GET /api/v1/health -> HTTP {s_v1_health}, body={r_v1_health}")
    assert s_v1_health == 200
    assert isinstance(r_v1_health, dict) and r_v1_health.get("db_status") == "ok"

    # 4. Probe /docs (Swagger UI)
    s_docs, r_docs = await call_endpoint("/docs")
    print(f"GET /docs -> HTTP {s_docs}, HTML length={len(r_docs)} chars")
    assert s_docs == 200
    assert "<html" in r_docs.lower() or "swagger" in r_docs.lower()

    # 5. Probe /redoc (ReDoc UI)
    s_redoc, r_redoc = await call_endpoint("/redoc")
    print(f"GET /redoc -> HTTP {s_redoc}, HTML length={len(r_redoc)} chars")
    assert s_redoc == 200

    # 6. Probe /openapi.json (OpenAPI 3.1 Spec)
    s_openapi, r_openapi = await call_endpoint("/openapi.json")
    print(f"GET /openapi.json -> HTTP {s_openapi}, Registered Paths={len(r_openapi.get('paths', {}))}")
    assert s_openapi == 200
    assert "paths" in r_openapi

    print("=" * 70)
    print("ALL LIVE SYSTEM PROBES PASSED (db_status=ok, /health=200, /docs=200)")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
