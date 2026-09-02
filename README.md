# EcoTrace — Integrated Ecotourism Impact Ledger & Observability Platform

EcoTrace is an evidence-grounded observability platform that pairs a FastAPI backend REST API with a React/Vite interactive frontend to track carrying capacity thresholds, biodiversity metrics, local community economics, and cryptographic ledger entries across ecotourism corridors.

---

## 📁 Integrated Project Structure

```
project/
├── frontend/                     # React + Vite Frontend Application
│   ├── src/                      # React components, pages, services, types
│   ├── .env                      # Frontend environment configuration (VITE_API_URL)
│   ├── package.json              # Frontend dependencies and scripts
│   └── vite.config.ts            # Vite dev server configuration (Port 3000)
│
├── backend/                      # FastAPI Python Backend Application
│   ├── app/                      # Models, schemas, routers, db, services
│   ├── tests/                    # Pytest test suite
│   ├── requirements.txt          # Python package dependencies
│   ├── .env                      # Backend environment settings & DB connection
│   └── venv/                     # Python virtual environment
│
├── scripts/                      # Cross-platform developer scripts
│   └── start-backend.js          # Node helper script to spawn FastAPI uvicorn server
│
├── package.json                  # Root npm package for one-command development
└── README.md                     # Project documentation & setup instructions
```

---

## ⚡ Quick Start Guide (One-Command Development)

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **Python**: v3.10 or higher

### 2. Initial Setup
Install root dependencies and initialize Python virtual environment (if not already created):

```bash
# Install root Node dependencies (includes concurrently runner)
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Setup backend Python environment (if setting up from scratch)
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\pip.exe install -r requirements.txt
# On Linux/macOS:
./venv/bin/pip install -r requirements.txt
cd ..
```

### 3. Run Development Server (Both Frontend & Backend)

From the **PROJECT ROOT**, run:

```bash
npm run dev
```

This starts:
- 🟢 **FastAPI Backend**: `http://127.0.0.1:8000` (API routes at `/api/v1`)
- 🔵 **React Frontend**: `http://localhost:3000`

---

## ⚙️ Ports & Service Endpoints

| Service | Host / Port | Description |
| :--- | :--- | :--- |
| **Frontend UI** | `http://localhost:3000` | React / Vite Dashboard |
| **Backend REST API** | `http://127.0.0.1:8000/api/v1` | FastAPI Endpoints |
| **Interactive API Docs** | `http://127.0.0.1:8000/docs` | Swagger / OpenAPI Explorer |
| **OpenAPI Specification**| `http://127.0.0.1:8000/openapi.json` | JSON OpenAPI Schema |

---

## 🧪 Available Scripts

From the **PROJECT ROOT**:

- `npm run dev`: Starts both backend (port 8000) and frontend (port 3000) concurrently with colored terminal logs.
- `npm run dev:frontend`: Starts only the React frontend server.
- `npm run dev:backend`: Starts only the FastAPI uvicorn backend server.
- `npm run build:frontend`: Builds the production bundle of the React frontend.
- `npm run test:backend`: Executes the backend pytest suite.
