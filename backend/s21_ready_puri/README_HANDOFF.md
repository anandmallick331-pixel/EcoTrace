# REGENLEDGER S21 BACKEND HANDOFF: LOCATION 4 (PURI, ODISHA)
## EcoTrace / S21 Regenerative Tourism Platform

---

### 1. PACKAGE OVERVIEW
- **Destination**: Puri, Odisha (Destination ID: `103`, Slug: `puri`)
- **Total Canonical Observations**: `178`
- **Total S21 Observations Ingested**: `178` (100.0% 1:1 Reconciliation)
- **Target Metrics Defined**: `57`
- **Verified Sources**: `45`
- **Datasets**: `14`
- **Spatial Waypoint Locations**: `9`

---

### 2. RECONCILIATION OF OBSERVATION PROVENANCE

| Provenance Category | Canonical Count | S21 Observation Count | Reconciliation Match |
| :--- | :---: | :---: | :---: |
| **DIRECT** | 135 | 135 | **PASS (100%)** |
| **DIRECT_LOCATION_REFERENCE** | 9 | 9 | **PASS (100%)** |
| **DERIVED** | 10 | 10 | **PASS (100%)** |
| **ESTIMATED** | 0 | 0 | **PASS (100%)** |
| **PROXY** | 0 | 0 | **PASS (100%)** |
| **DATA_GAP** | 24 | 24 | **PASS (100%)** |
| **TOTAL OBSERVATIONS** | **178** | **178** | **PASS (178 / 178)** |

---

### 3. FRONTEND CONTRACT & UI RENDERING RULES

1. **Mandatory UI Captions**:
   - `DIRECT`: `DIRECT / VERIFIED`
   - `DERIVED`: `DERIVED / COMPUTED`
   - `ESTIMATED`: `ESTIMATE / MODEL`
   - `PROXY`: `PROXY / REGIONAL AVERAGE`
   - `CONTEXT_ONLY`: `CONTEXT ONLY / HISTORICAL`
   - `PARTIAL`: `PARTIAL EVIDENCE`
   - `UNRESOLVED`: `DATA GAP / UNAVAILABLE`
   - `BLOCKED`: `SAFEGUARD BLOCKED`

2. **Zero-Mock Enforcement**:
   - The frontend **MUST NEVER** substitute `0` or `0.0` for missing or unresolved values.
   - All `DATA_GAP` records must render the dedicated non-blocking data gap state with explicit audit disclosures.

3. **Semantic Distinction Safeguards**:
   - Water supply (`36-42 MLD`) must not be rendered as measured consumption.
   - Resident MSW (`70.4 TPD`) must not be rendered as commercial hospitality waste.
   - State average tourist spend (`₹2,496.25`) must not be multiplied by destination footfall to report municipal tourism revenue.
   - Srimandir 75m security buffer is never presented as cadastral parcel ownership GIS.
