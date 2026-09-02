# EcoTrace Backend — Claude Context

## Project
EcoTrace is the backend for SIH problem statement S21:
"Regenerative Tourism Impact Ledger for Local Communities and Natural Assets."

The backend must support:
- visitor/tourism impact data
- local economic/community/environmental metrics
- source and verification tracking
- evidence/provenance
- destination-level scoring
- future intervention/scenario simulation

## Fixed Architecture
DO NOT redesign the architecture.

Stack:
- Python 3.12
- FastAPI
- PostgreSQL 17
- SQLAlchemy
- Alembic
- Pydantic
- Uvicorn

Architecture:

Frontend
→ FastAPI routers
→ Pydantic schemas
→ Services
→ Repositories
→ SQLAlchemy
→ PostgreSQL

## Database
Database:
s21_db

Current core tables:
- destinations
- locations
- sources
- datasets
- metric_definitions
- observations
- evidence

Alembic migration:
18a0374d9ad5

The database schema already exists. DO NOT recreate or redesign it unless explicitly instructed.

## Core Relationships

Destination
→ Location

Source
→ Dataset

Destination
→ Observation

MetricDefinition
→ Observation

Dataset
→ Observation

Observation
→ Evidence

Evidence
→ Source
Evidence
→ Dataset (optional)

## Important Constraints
MetricDefinition:
UNIQUE(code, version)

Observation:
UNIQUE(
destination_id,
metric_definition_id,
dataset_id,
period_start,
period_end
)

## Existing Repository Layer

app/repositories/
- base.py
- destination.py
- location.py
- source.py
- dataset.py
- metric.py
- observation.py
- evidence.py

Repositories are already implemented and tested against PostgreSQL.

## Existing Service Layer

app/services/
- base.py
- destination.py
- location.py
- source.py
- dataset.py
- metric.py
- observation.py
- evidence.py
- scoring.py

Domain services already wrap repositories.

## Existing Validation

Pydantic schemas already exist under:

app/schemas/

Validation currently covers:
- non-empty names/codes
- ISO alpha-3 country code format
- latitude/longitude bounds
- HTTP/HTTPS URLs
- observation period ordering
- finite numeric values
- observation value presence
- evidence artefact presence
- enum validation

Do not duplicate or redesign validation unless explicitly asked.

## Existing API

Main API prefix:

/api/v1

Existing resources:
- /health
- /destinations
- /locations
- /sources
- /datasets
- /metrics
- /observations
- /evidence

There is also:

GET /api/v1/observations/{observation_id}/provenance

## Existing Provenance Layer

Provenance currently traces:

Observation
→ MetricDefinition
→ Dataset
→ Source
→ Evidence[]

It exposes:
- status
- confidence
- destination specificity
- methodology
- assumptions
- source
- dataset
- metric definition
- evidence

## Existing Scoring Contract

Scoring structure already exists.

Schemas:
- ScoreComponent
- CategoryScore
- OverallScore
- ScoreOverview

Service:
ScoringEngineInterface
ScoringService

APIs:
GET /api/v1/destinations/{destination_id}/scores
GET /api/v1/destinations/{destination_id}/scores/overview

IMPORTANT:
The actual scoring formula, weights and metric calculations are NOT finalized.
Do NOT invent them.
The scoring engine is intentionally pluggable so another team member can provide the final scoring logic later.

## Testing Status

Existing backend tests have already verified:
- PostgreSQL connectivity
- repository CRUD
- domain service operations
- validation
- API CRUD
- provenance
- scoring contract
- end-to-end integration

A 27/27 end-to-end integration suite has passed.

## Team Responsibilities

Saanjh:
- architecture
- database
- API
- integration

Dinesh:
- data ingestion
- cleaning
- normalization
- dataset preparation

Ananya:
- evidence/validation methodology
- metrics
- scoring
- testing/documentation

At the moment, Dinesh and Ananya have NOT handed over their final implementation/data.
Do not block Saanjh's work unnecessarily on them.
Build interfaces/contracts so their work can plug in later.

## Strict Development Rules

1. Preserve the existing architecture.
2. Do not redesign working code.
3. Do not change database schema without explicit instruction.
4. Do not create unnecessary abstractions.
5. Do not implement ML unless explicitly requested.
6. Do not invent scoring formulas or weights.
7. Do not invent data.
8. Prefer small focused changes.
9. Before changing code, inspect the existing relevant files.
10. Report exactly which files are changed.
11. Provide focused tests for every change.
12. Avoid unrelated refactoring.

## Current Development Stage

The remaining work is being completed in small steps.

Current immediate task will always be explicitly specified in the user prompt.