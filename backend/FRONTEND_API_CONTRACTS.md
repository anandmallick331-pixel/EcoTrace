# EcoTrace API Contracts & Frontend Mock Integration Guide
> **STATUS**: `MOCK / EXAMPLE SPECIFICATION`  
> **PURPOSE**: Contract reference for frontend developers and UI integration testing.  
> **API VERSION**: `/api/v1`  
> **BASE URL**: `http://localhost:8000/api/v1`  
> **NOTE**: The JSON payloads below contain realistic mock/example data strictly matching active Pydantic schemas.

---

## Table of Contents
1. [Destination Overview](#1-destination-overview)
2. [Destination Metrics & Observations](#2-destination-metrics--observations)
3. [Metric Evidence & Provenance](#3-metric-evidence--provenance)
4. [Source & Dataset Publications](#4-source--dataset-publications)
5. [Score Overview](#5-score-overview)
6. [Full Score with Components Breakdown](#6-full-score-with-components-breakdown)
7. [Scenario Simulation & Intervention Projection](#7-scenario-simulation--intervention-projection)
8. [Standard Error Responses (400 / 404 / 409 / 422)](#8-standard-error-responses)

---

## 1. Destination Overview

### `GET /api/v1/destinations/{destination_id}`
Retrieves core geographic and administrative metadata for a destination.

#### Mock Response (`200 OK`)
```json
{
  "id": 1,
  "name": "[MOCK] Fiordland Biosphere Reserve",
  "country_code": "NZL",
  "region": "South Island",
  "description": "Glacial fiord ecological reserve with high visitor impact monitoring and marine sanctuary zones.",
  "created_at": "2026-01-15T08:30:00Z",
  "updated_at": "2026-01-15T08:30:00Z"
}
```

### `GET /api/v1/locations?destination_id={destination_id}`
Retrieves geographic boundary points or measurement stations associated with the destination.

#### Mock Response (`200 OK`)
```json
[
  {
    "id": 101,
    "destination_id": 1,
    "label": "[MOCK] Milford Sound Ranger Monitoring Station",
    "latitude": -44.6715,
    "longitude": 167.9256,
    "geojson": null
  },
  {
    "id": 102,
    "destination_id": 1,
    "label": "[MOCK] Doubtful Sound Marine Sanctuary Outpost",
    "latitude": -45.3167,
    "longitude": 166.9833,
    "geojson": null
  }
]
```

---

## 2. Destination Metrics & Observations

### `GET /api/v1/metrics`
Lists semantic definitions for standardized sustainability indicators.

#### Mock Response (`200 OK`)
```json
[
  {
    "id": 1,
    "code": "co2_per_guest_night",
    "version": "1.0",
    "name": "Carbon Intensity per Tourist Night",
    "category": "carbon",
    "unit": "kg CO2e",
    "direction": "lower_is_better",
    "description": "Scope 1 and 2 greenhouse gas emissions per commercial guest night in destination accommodations.",
    "created_at": "2026-01-10T12:00:00Z"
  },
  {
    "id": 2,
    "code": "native_canopy_coverage_ratio",
    "version": "1.0",
    "name": "Native Canopy & Understory Coverage Ratio",
    "category": "biodiversity",
    "unit": "ratio (0-1)",
    "direction": "higher_is_better",
    "description": "Proportion of protected area covered by undisturbed indigenous flora.",
    "created_at": "2026-01-10T12:00:00Z"
  }
]
```

### `GET /api/v1/observations?destination_id=1`
Retrieves quantitative observations recorded for a destination.

#### Mock Response (`200 OK`)
```json
[
  {
    "id": 501,
    "destination_id": 1,
    "metric_definition_id": 1,
    "dataset_id": 10,
    "period_start": "2025-01-01",
    "period_end": "2025-06-30",
    "original_value": 14.8,
    "normalized_value": 14.8,
    "status": "verified",
    "confidence": "high",
    "destination_specificity": "direct",
    "methodology": "Aggregated utility meter audits across 42 certified lodges.",
    "assumptions": "Electricity emissions factored using national grid intensity factor of 0.12 kg CO2e/kWh.",
    "notes": "12% reduction observed compared to 2024 H1 baseline.",
    "created_at": "2025-07-15T10:00:00Z",
    "updated_at": "2025-07-20T14:30:00Z"
  },
  {
    "id": 502,
    "destination_id": 1,
    "metric_definition_id": 2,
    "dataset_id": 10,
    "period_start": "2025-01-01",
    "period_end": "2025-12-31",
    "original_value": 0.88,
    "normalized_value": 0.88,
    "status": "verified",
    "confidence": "high",
    "destination_specificity": "direct",
    "methodology": "Sentinel-2 multispectral NDVI analysis cross-validated with 16 ground transect plots.",
    "assumptions": "Excludes subalpine rocky scree above 1200m elevation.",
    "notes": "Canopy stability verified across all 4 sectors.",
    "created_at": "2026-01-10T09:00:00Z",
    "updated_at": "2026-01-10T09:00:00Z"
  }
]
```

---

## 3. Metric Evidence & Provenance

### `GET /api/v1/observations/{observation_id}/provenance`
Returns the complete audit trail and lineage graph connecting an observation to its metric definition, publishing dataset, source organization, and supporting artefacts.

#### Mock Response (`200 OK`)
```json
{
  "observation_id": 501,
  "destination_id": 1,
  "period_start": "2025-01-01",
  "period_end": "2025-06-30",
  "original_value": 14.8,
  "normalized_value": 14.8,
  "status": "verified",
  "confidence": "high",
  "destination_specificity": "direct",
  "methodology": "Aggregated utility meter audits across 42 certified lodges.",
  "assumptions": "Electricity emissions factored using national grid intensity factor of 0.12 kg CO2e/kWh.",
  "notes": "12% reduction observed compared to 2024 H1 baseline.",
  "created_at": "2025-07-15T10:00:00Z",
  "updated_at": "2025-07-20T14:30:00Z",
  "metric_definition": {
    "id": 1,
    "code": "co2_per_guest_night",
    "version": "1.0",
    "name": "Carbon Intensity per Tourist Night",
    "category": "carbon",
    "unit": "kg CO2e",
    "direction": "lower_is_better",
    "description": "Scope 1 and 2 greenhouse gas emissions per commercial guest night in destination accommodations.",
    "created_at": "2026-01-10T12:00:00Z"
  },
  "dataset": {
    "id": 10,
    "source_id": 2,
    "name": "Fiordland Environmental State & Tourism Impact 2025",
    "version": "2025.1",
    "publication_date": "2025-07-01",
    "url": "https://www.doc.govt.nz/reports/fiordland-2025.pdf",
    "description": "Annual environmental census covering commercial tourism energy and waste footprints.",
    "created_at": "2025-07-05T08:00:00Z"
  },
  "source": {
    "id": 2,
    "name": "New Zealand Department of Conservation (DOC)",
    "organisation": "DOC NZ",
    "url": "https://www.doc.govt.nz",
    "description": "Official government conservation agency maintaining national monitoring networks.",
    "created_at": "2026-01-05T08:00:00Z"
  },
  "evidence": [
    {
      "id": 901,
      "observation_id": 501,
      "source_id": 2,
      "dataset_id": 10,
      "evidence_type": "document",
      "reference_url": "https://www.doc.govt.nz/reports/fiordland-canopy-2025-h1.pdf",
      "raw_excerpt": "Section 3.2: Fiordland lodging carbon footprint averaged 14.8 kg CO2e per guest night across 114,000 recorded guest nights.",
      "notes": "Verified against energy retailer billing data.",
      "created_at": "2025-07-15T11:00:00Z"
    },
    {
      "id": 902,
      "observation_id": 501,
      "source_id": 2,
      "dataset_id": 10,
      "evidence_type": "survey",
      "reference_url": "https://www.doc.govt.nz/surveys/lodge-energy-audit-2025.csv",
      "raw_excerpt": "42 of 45 commercial lodge operators submitted verified meter logs.",
      "notes": "Audited by independent environmental verifier.",
      "created_at": "2025-07-15T11:30:00Z"
    }
  ]
}
```

---

## 4. Source & Dataset Publications

### `GET /api/v1/sources/{source_id}`
Retrieves details of an authoritative data provider or agency.

#### Mock Response (`200 OK`)
```json
{
  "id": 2,
  "name": "[MOCK] New Zealand Department of Conservation (DOC)",
  "organisation": "DOC NZ",
  "url": "https://www.doc.govt.nz",
  "description": "Official government conservation agency maintaining national monitoring networks.",
  "created_at": "2026-01-05T08:00:00Z"
}
```

### `GET /api/v1/datasets/{dataset_id}`
Retrieves a specific publication or catalogued report from a source.

#### Mock Response (`200 OK`)
```json
{
  "id": 10,
  "source_id": 2,
  "name": "[MOCK] Fiordland Environmental State & Tourism Impact 2025",
  "version": "2025.1",
  "publication_date": "2025-07-01",
  "url": "https://www.doc.govt.nz/reports/fiordland-2025.pdf",
  "description": "Annual environmental census covering commercial tourism energy and waste footprints.",
  "created_at": "2025-07-05T08:00:00Z"
}
```

---

## 5. Score Overview

### `GET /api/v1/destinations/{destination_id}/scores/overview`
High-level summary of sustainability performance and data verification coverage.

#### Mock Response (`200 OK` - Computed State)
```json
{
  "destination_id": 1,
  "score": 78.4,
  "lower_bound": 74.2,
  "upper_bound": 82.6,
  "confidence": "high",
  "evidence_coverage": 0.85,
  "scoring_version": "1.0.0",
  "calculation_timestamp": "2026-08-20T10:00:00Z",
  "category_scores": {
    "biodiversity": 88.5,
    "carbon": 82.0,
    "water": 76.2,
    "community": 74.0,
    "waste": 62.5
  }
}
```

#### Mock Response (`200 OK` - Uncomputed Default State)
```json
{
  "destination_id": 1,
  "score": null,
  "lower_bound": null,
  "upper_bound": null,
  "confidence": null,
  "evidence_coverage": null,
  "scoring_version": null,
  "calculation_timestamp": null,
  "category_scores": {}
}
```

---

## 6. Full Score with Components Breakdown

### `GET /api/v1/destinations/{destination_id}/scores`
Composite sustainability score with hierarchical category and metric-level components.

#### Mock Response (`200 OK` - Computed State)
```json
{
  "destination_id": 1,
  "score": 78.4,
  "lower_bound": 74.2,
  "upper_bound": 82.6,
  "confidence": "high",
  "evidence_coverage": 0.85,
  "scoring_version": "1.0.0",
  "calculation_timestamp": "2026-08-20T10:00:00Z",
  "categories": [
    {
      "category": "biodiversity",
      "score": 88.5,
      "lower_bound": 84.0,
      "upper_bound": 92.0,
      "weight": 0.30,
      "confidence": "high",
      "evidence_coverage": 0.90,
      "components": [
        {
          "metric_code": "native_canopy_coverage_ratio",
          "metric_name": "Native Canopy & Understory Coverage Ratio",
          "category": "biodiversity",
          "normalized_value": 0.88,
          "weight": 0.60,
          "score_contribution": 52.8,
          "confidence": "high",
          "evidence_coverage": 0.95
        },
        {
          "metric_code": "kea_population_index",
          "metric_name": "Alpine Kea Indicator Index",
          "category": "biodiversity",
          "normalized_value": 1.15,
          "weight": 0.40,
          "score_contribution": 35.7,
          "confidence": "medium",
          "evidence_coverage": 0.85
        }
      ]
    },
    {
      "category": "carbon",
      "score": 82.0,
      "lower_bound": 78.0,
      "upper_bound": 86.0,
      "weight": 0.25,
      "confidence": "high",
      "evidence_coverage": 0.92,
      "components": [
        {
          "metric_code": "co2_per_guest_night",
          "metric_name": "Carbon Intensity per Tourist Night",
          "category": "carbon",
          "normalized_value": 14.8,
          "weight": 1.0,
          "score_contribution": 82.0,
          "confidence": "high",
          "evidence_coverage": 0.92
        }
      ]
    }
  ]
}
```

#### Mock Response (`200 OK` - Uncomputed Default State)
```json
{
  "destination_id": 1,
  "score": null,
  "lower_bound": null,
  "upper_bound": null,
  "confidence": null,
  "evidence_coverage": null,
  "scoring_version": null,
  "calculation_timestamp": null,
  "categories": []
}
```

---

## 7. Scenario Simulation & Intervention Projection

### `POST /api/v1/destinations/{destination_id}/scenarios`
Simulates a counterfactual or projected intervention for a destination.

#### Request Body
```json
{
  "intervention_type": "renewable_transition",
  "parameter": "renewable_share_pct",
  "value": 85.0,
  "description": "Mandate 85% renewable electricity generation for all lodging and marine transport by 2028."
}
```

#### Mock Response (`201 Created` - Projected Engine State)
```json
{
  "scenario_id": "4a71d43a-8671-46e3-9993-9c84e622ef01",
  "destination_id": 1,
  "intervention_type": "renewable_transition",
  "parameter": "renewable_share_pct",
  "value": 85.0,
  "description": "Mandate 85% renewable electricity generation for all lodging and marine transport by 2028.",
  "baseline_score": 78.4,
  "projected_score": 84.6,
  "score_change": 6.2,
  "affected_metrics": [
    {
      "metric_code": "co2_per_guest_night",
      "metric_name": "Carbon Intensity per Tourist Night",
      "baseline_value": 14.8,
      "projected_value": 7.2,
      "delta": -7.6,
      "unit": "kg CO2e"
    }
  ],
  "confidence": "high",
  "assumptions": [
    "Grid interconnect capacity remains stable.",
    "Visitor volume remains constant at 114,000 annual guest nights."
  ],
  "projection_status": "completed",
  "created_at": "2026-08-21T12:00:00Z"
}
```

#### Mock Response (`201 Created` - Default Uncomputed State)
```json
{
  "scenario_id": "8b92e51f-29c8-47a1-85b4-3a5c1234abcd",
  "destination_id": 1,
  "intervention_type": "renewable_transition",
  "parameter": "renewable_share_pct",
  "value": 85.0,
  "description": "Mandate 85% renewable electricity generation for all lodging and marine transport by 2028.",
  "baseline_score": null,
  "projected_score": null,
  "score_change": null,
  "affected_metrics": [],
  "confidence": null,
  "assumptions": [],
  "projection_status": "uncomputed",
  "created_at": "2026-08-21T12:00:00Z"
}
```

### `GET /api/v1/destinations/{destination_id}/scenarios/{scenario_id}`
Retrieves the projection results for an existing scenario simulation.

#### Mock Response (`200 OK`)
```json
{
  "scenario_id": "4a71d43a-8671-46e3-9993-9c84e622ef01",
  "destination_id": 1,
  "intervention_type": "renewable_transition",
  "parameter": "renewable_share_pct",
  "value": 85.0,
  "description": "Mandate 85% renewable electricity generation for all lodging and marine transport by 2028.",
  "baseline_score": 78.4,
  "projected_score": 84.6,
  "score_change": 6.2,
  "affected_metrics": [
    {
      "metric_code": "co2_per_guest_night",
      "metric_name": "Carbon Intensity per Tourist Night",
      "baseline_value": 14.8,
      "projected_value": 7.2,
      "delta": -7.6,
      "unit": "kg CO2e"
    }
  ],
  "confidence": "high",
  "assumptions": [
    "Grid interconnect capacity remains stable.",
    "Visitor volume remains constant at 114,000 annual guest nights."
  ],
  "projection_status": "completed",
  "created_at": "2026-08-21T12:00:00Z"
}
```

---

## 8. Standard Error Responses

### `404 Not Found` (Missing Resource)
```json
{
  "detail": "Destination with ID 999999 not found"
}
```

### `409 Conflict` (Duplicate Natural Key / Unique Constraint)
```json
{
  "detail": "Observation already exists for this destination, metric, dataset, and time period"
}
```

### `422 Unprocessable Entity` (Schema Validation Error)
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "period_end"],
      "msg": "Value error, period_end (2024-01-01) must be greater than or equal to period_start (2024-06-30)",
      "input": "2024-01-01"
    }
  ]
}
```

### `400 Bad Request` (Relational Inconsistency)
```json
{
  "detail": "Dataset 12 does not belong to Source 5"
}
```
