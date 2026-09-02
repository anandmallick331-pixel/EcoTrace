# REGENLEDGER PURI — Backend Handoff README

## 1. Package

**Destination:** PURI_CORE_TOURISM_DESTINATION  
**Location:** Puri, Odisha, India  
**Package version:** 1.0  
**Package creation date:** 2026-08-24  
**Backend handoff status:** READY_FOR_BACKEND_HANDOFF  
**Methodology version:** 1.0

This package is the Location 4 / Puri backend handoff for the REGENLEDGER system.

The package contains final outputs, QA, processed domain data, methodology, provenance/evidence mappings, reconciliation files, and supporting methodological controls.

---

## 2. Backend Priority Files

### Primary final outputs

- `FINAL_OUTPUTS/PURI_FINAL_REPORT_CARD.xlsx`
  - Primary user-facing report card.
  - Overall score is currently **NOT_SCORED**.
  - Blue Flag metric is scored at the metric layer.

- `FINAL_OUTPUTS/PURI_METRIC_SCORES.xlsx`
  - Primary machine-readable metric scoring output.
  - Current state: **1 scored metric; 56 NOT_SCORED**.

- `FINAL_OUTPUTS/PURI_DOMAIN_SCORECARD_FINAL.xlsx`
  - Domain aggregation output.
  - Current state: **0 numerical domain scores**.

- `FINAL_OUTPUTS/PURI_OVERALL_SCORECARD.xlsx`
  - Overall aggregation output.
  - Current state: **NOT_SCORED / NO_SCORED_DOMAINS**.

### Final QA / readiness

- `_QA/PURI_FINAL_END_TO_END_QA.xlsx`
- `_QA/PURI_FINAL_BACKEND_READINESS_REPORT.xlsx`
- `_QA/PURI_METRIC_SCORECARD_QA.xlsx`
- `_QA/PURI_SOURCE_REGISTER_VALIDATION.xlsx`
- `_QA/PURI_CROSS_DOMAIN_VALIDATION_REPORT.xlsx`

The end-to-end QA records **PASS / READY_FOR_BACKEND_HANDOFF**.

---

## 3. Package Structure

```text
PURI_BACKEND_HANDOFF/
├── FINAL_OUTPUTS/
├── PROCESSED_DATA/
├── METHODOLOGY/
├── PROVENANCE_AND_REFERENCES/
├── RECONCILIATION/
├── SUPPORTING_METHODOLOGY/
├── _QA/
└── README.md
```

### PROCESSED_DATA

Contains the 14 Puri processed domain workbooks:

- biodiversity
- community
- economic
- employment
- environment
- expenditure
- GIS
- heritage
- local business
- ownership
- tourism
- visitor
- waste
- water

These are processed-domain inputs for the analytical/scoring pipeline.

### METHODOLOGY

Contains the metric dictionary and scoring/aggregation specifications, including:

- metric dictionary;
- normalization/scoring methodology;
- scoring engine specification;
- domain aggregation methodology;
- overall aggregation methodology.

The metric dictionary contains **57 metrics across 14 domains**.

### PROVENANCE_AND_REFERENCES

Contains:

- metric-to-evidence mapping;
- final scoring reference registry;
- scoring-direction reference.

### RECONCILIATION

Contains domain/process reconciliation files for:

- employment;
- processing readiness;
- tourism;
- water.

### SUPPORTING_METHODOLOGY

Contains the system controls for:

- confidence taxonomy;
- estimation/leakage/retention rules;
- evidence schema;
- limitations;
- provenance rules;
- verification taxonomy.

---

## 4. Backend Ingestion / Usage Order

Recommended backend consumption order:

1. Read the metric dictionary and methodology files.
2. Read processed domain data.
3. Read provenance/evidence mappings.
4. Read final metric scores.
5. Read domain scorecard.
6. Read overall scorecard.
7. Use final QA/readiness files as audit controls.
8. Use the final report card as the user-facing assembled output.

Do not infer missing scores from blank cells. The package intentionally distinguishes scored metrics from NOT_SCORED metrics and documented data gaps.

---

## 5. Metric / Value Semantics

The package uses explicit metric and evidence status controls.

Do not convert:

- DATA_GAP → measured value;
- historical value → current value;
- district-level value → site-level value;
- national context → Puri value;
- proxy/estimate → direct measurement;
- investment pipeline → realized expenditure;
- context-only evidence → performance metric.

Where a metric is unavailable, retain its documented gap status.

---

## 6. Current Scoring State

The package is **not** a fully scored destination package.

Current documented state:

- Metrics expected: **57**
- Metrics verified: **57**
- Scored metrics: **1**
- NOT_SCORED metrics: **56**
- Scored domains: **0**
- Overall destination score: **NOT_SCORED**

The one scored metric is the documented **Blue Flag** metric.

Do not convert NOT_SCORED metrics to zero unless a separate frontend contract explicitly requires a non-numeric display state.

---

## 7. Data Gaps

Known Puri gaps remain explicit in the readiness and metric-gap artifacts.

Examples documented by the package include:

- current Puri tourism employment;
- Puri tourism expenditure;
- Puri tourism GVA/GDP;
- Golden Beach regular nesting inventory;
- site-specific shoreline erosion rate;
- air-quality station mapped to selected sites;
- site-specific hotel rooms/beds.

Additional gaps may be present in the metric dictionary and final readiness reports.

Do not silently close these gaps using unrelated geography, historical values, or national/state aggregates.

---

## 8. Provenance / Source Handling

The readiness report records:

- **153 valid registered sources**;
- **5 known source-register metadata gaps**;
- **2 search-gap markers** used as documentation rather than evidence;
- **12 blank source IDs** on pure DATA_GAP placeholders;
- **0 fabricated sources**;
- **0 unexpected missing source IDs**.

The known source metadata gaps are documented as non-blocking warnings. They should not be treated as evidence fabrication or silently repaired from unverified metadata.

---

## 9. Geography and Temporal Rules

Respect the geography and temporal scopes stored in the metric dictionary, evidence mapping, and readiness reports.

Examples:

- `PURI_DISTRICT` ≠ individual Puri site;
- `PURI` ≠ a specific beach/temple unless explicitly defined;
- `INDIA` context ≠ Puri measurement;
- historical 2002 employment ≠ current Puri employment;
- district investment pipeline ≠ site-level realized tourism expenditure.

Do not aggregate across incompatible geographies or periods without an explicit methodology rule.

---

## 10. QA / Readiness

The package-level validation records:

- package structure: PASS;
- final outputs present: PASS;
- methodology present: PASS;
- provenance present: PASS;
- metric definitions: PASS;
- record IDs: PASS;
- duplicate record IDs: 0;
- missing record IDs: 0;
- extra record IDs: 0;
- fabricated sources: 0;
- gap-marker validity: PASS.

Known provenance metadata warnings are explicitly documented and non-blocking.

The final backend readiness decision is:

**READY_FOR_BACKEND_HANDOFF**

---

## 11. Immutability / Change Control

Files marked immutable in the package manifest should not be modified during backend ingestion.

If corrections are required:

1. create a documented revised version;
2. preserve the original artifact;
3. update provenance and QA records;
4. rerun the relevant reconciliation checks.

Do not overwrite source evidence without a documented revision trail.

---

## 12. Important Packaging Note

The original package currently contains a directory named `README.md/` holding:

- `PURI_BACKEND_HANDOFF_MANIFEST.xlsx`
- `PURI_BACKEND_HANDOFF_QA.xlsx`

The required README is this **`README.md` file at the package root**.

Those two Excel files should be retained as supporting handoff QA/manifest artifacts when repackaging. If the package is rebuilt, place them under a non-conflicting folder such as `HANDOFF_SUPPORT/` and keep this README at:

```text
PURI_BACKEND_HANDOFF/README.md
```

---

## 13. Final Handoff

**Destination:** Puri, Odisha  
**Status:** READY_FOR_BACKEND_HANDOFF  
**Metrics:** 57  
**Verified:** 57  
**Scored:** 1  
**Not scored:** 56  
**Overall score:** NOT_SCORED  
**Final E2E QA:** PASS

The package is intended to be consumed as an evidence-grounded analytical handoff. Preserve the distinction between verified evidence, contextual information, derived values, data gaps, and scored outputs throughout backend integration.
