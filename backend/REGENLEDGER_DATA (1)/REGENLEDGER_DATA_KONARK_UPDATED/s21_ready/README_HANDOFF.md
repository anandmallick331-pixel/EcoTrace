# REGENLEDGER KONARK – S21 HANDOFF README

## Package purpose
Complete, traceable, ingestion-ready REGENLEDGER package for **Konark, Odisha** compatible with the FastAPI + PostgreSQL backend and React frontend used for Chilika and Bhubaneswar.

## Ingestion order
1. `01_DESTINATION.xlsx` → destinations table
2. `02_LOCATIONS.xlsx` → locations (FK destination_slug)
3. `04_SOURCES.xlsx` → sources
4. `05_DATASETS.xlsx` → datasets (FK source_code)
5. `03_METRIC_DEFINITIONS.xlsx` → metric_definitions
6. `06_OBSERVATIONS.xlsx` → observations (FK metric_code, source_code, dataset_code)
7. `07_DASHBOARD_SUMMARY.xlsx` → frontend dashboard cards

## Natural keys
- Destination: `slug = konark`
- Locations: `temp_id` + `destination_slug`
- Metrics: `code` (stable)
- Sources: `source_code`
- Datasets: `dataset_code`
- Observations: composite (metric_code + year + geographic_scope + value_type)

## Status meanings (backend + frontend)
| status | value_type | Frontend treatment |
|--------|------------|--------------------|
| VERIFIED | DIRECT | value + official source |
| DERIVED | DERIVED | value + “Calculated from verified inputs” + formula |
| ESTIMATED | ESTIMATED | value + “Estimated” badge + methodology + limitations |
| PROXY | PROXY | value + “Proxy – not the original target metric” |
| CONTEXT_ONLY | — | contextual information, not performance score |
| STRUCTURAL_NOT_APPLICABLE | — | “Not applicable for this geometry/data type” |
| DATA_GAP | DATA_GAP | “Data not available in verified sources.” |

## DATA_GAP source exception (mandatory)
Genuine DATA_GAP observation rows intentionally represent the **absence** of verified evidence.

For these rows only:
- `source_code` = NULL
- `dataset_code` = NULL
- `status` = DATA_GAP
- `value_type` = DATA_GAP
- `notes` must state that no verified source was identified and the row is not an estimate

Do **not** invent placeholder source IDs such as DATA_GAP_SOURCE, UNKNOWN_SOURCE, or KONARK_GAP.
The null source is intentional and schema-valid for DATA_GAP rows.

## Critical rules enforced
- RAW layer is immutable (copied under raw/).
- PROCESSED_LAYER_MODE = PASSTHROUGH (see metadata/KONARK_PROCESSING_LAYER_SPEC.xlsx).
- No fabricated visitor, waste tonnage, water consumption, carrying capacity, wages, or composite scores.
- Proxies and estimates never close the original official gap.
- Geographic scopes locked: Sun Temple ≠ Konark NAC ≠ WLS ≠ Puri district.
- Multiple official conservation series retained separately.
- Frontend cannot mistake ESTIMATED demand for measured consumption, or estimated waste for measured tonnage.
- Representative GIS points are never treated as cadastral boundaries.

## Gaps remaining (official) — 9 critical
1. water_consumption (measured)
2. solid_waste_tonnage (measured)
3. property_species_inventory
4. formal carrying capacity
5. local monetary retention rate
6. destination-specific tourism expenditure
7. water quality station series for Konark/Chandrabhaga
8. full non-ASI / broader visitor series
9. full cadastral / ownership GIS

See CRITICAL_GAPS_RESOLUTION.md and framework gap files.
