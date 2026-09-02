# EcoTrace Backend — Production Deployment Guide

This guide describes how to configure, migrate, and run the EcoTrace FastAPI backend in a production or staging environment.

---

## 1. System Requirements

- **Python**: `3.12+`
- **PostgreSQL**: `17+`
- **Process Manager / Server**: `uvicorn` (with multi-worker process management via systemd, supervisord, or container entrypoint)

---

## 2. Environment Variables

All settings are configured via environment variables or a `.env` file loaded at process startup.

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `ENV` | `string` | `development` | Environment mode (`production`, `staging`, `development`). |
| `DATABASE_URL` | `string` | *(required)* | PostgreSQL connection URI: `postgresql://user:password@host:5432/dbname`. |
| `CORS_ORIGINS` | `string` | `http://localhost:3000,http://localhost:5173` | Comma-separated list of allowed frontend origin URLs. |
| `LOG_LEVEL` | `string` | `INFO` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `APP_NAME` | `string` | `EcoTrace` | Public service title exposed in OpenAPI and health check. |
| `APP_VERSION` | `string` | `0.1.0` | Semantic version string. |

> **IMPORTANT**: Ensure `.env` is never committed to source control (verified by `.gitignore`). Pass credentials securely via environment variables or cloud secret managers (e.g. AWS Secrets Manager, Vault, GCP Secret Manager).

---

## 3. Installation

From the `backend/` directory:

```bash
# 1. Create and activate a Python 3.12 virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install production dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 4. Database Migrations

Apply database schema migrations using Alembic prior to starting the web service:

```bash
# Run latest migrations against target database
alembic upgrade head
```

---

## 5. Production Start Command

Start the Uvicorn ASGI server with multiple worker processes:

```bash
# Production multi-worker execution (binds to all interfaces on port 8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

*Recommended worker count: `(2 x $NUM_CORES) + 1` or 4 workers for standard deployment.*

---

## 6. Health & Readiness Probes

The service exposes root and versioned health endpoints for load balancers and orchestrators:

- **Endpoint**: `GET /health` or `GET /api/v1/health`
- **Expected Status**: `200 OK`
- **Response Format**:
  ```json
  {
    "status": "ok",
    "app": "EcoTrace",
    "version": "0.1.0",
    "environment": "production",
    "db_status": "ok"
  }
  ```

---

## 7. Security & Operations Checklist

1. **No Leaked Secrets**:
   - 500 error handlers catch unhandled exceptions, safely log the trace on the server, and return generic `{"detail": "Internal server error"}` to clients.
2. **CORS Isolation**:
   - Set `CORS_ORIGINS` to the exact production domain(s) of the frontend client (e.g. `https://ecotrace.example.com`).
3. **Database Connection Pooling**:
   - SQLAlchemy connection engine manages pooling automatically using `pool_pre_ping=True`.
