# BBSR REGENLEDGER – Updated Package for S21 Frontend/Backend Integration

**Generated:** 2026-08-23T12:35:32.243128Z  
**Rule:** Nothing deleted from original REGENLEDGER_DATA. All original files remain under their original paths.  
**Additions:** `s21_ready/` layer + updated framework status + new derivation log.

## What changed (and what did not)

| Action | Detail |
|--------|--------|
| Preserved | Every original raw / processed / derived / framework / quality / pipeline / metadata file |
| Added | `s21_ready/` – destination, locations, metric definitions, sources, datasets, observations ready for ingestion |
| Added | Traceable derivations for: MSW estimate, partial green %, tourism pressure proxy, local hospitality structure % |
| Updated | `framework/BHUBANESWAR_METRIC_STATUS_TABLE_UPDATED.xlsx` – key dashboard metrics now AVAILABLE |
| Not invented | No primary measurements fabricated. No scoring weights invented. No “true” local retention % claimed |
| Still DATA_GAP | Temple footfall, turbidity, true local retention rate, actual wages, official carrying capacity, locked eco-health / equity composites |

## How the frontend should stop showing pure Uncomputed

1. Ingest `s21_ready/01_DESTINATION.xlsx` → create destination `bhubaneswar`.
2. Ingest locations, sources, datasets, metric definitions, observations.
3. For dashboard cards use `07_DASHBOARD_SUMMARY.xlsx` guidance:
   - Environmental → show **partial_green_cover_pct** (label “Partial known green cover – inventory incomplete”).
   - Community → show literacy, park count, slum population as components (do not invent equity score).
   - Local Retention → show **local_hospitality_structure_pct** with explicit caption “Structural hotel-category proxy – not measured retention”.
   - Tourism pressure → show visits/bed proxy with caption.
   - Visitor volume → official 2023 total.
   - Waste → show estimated TPD with **Estimated** badge and formula tooltip.
4. Scores endpoint can remain null for overall composite until Ananya locks weights; individual metric values are now non-null and provenance-backed.

## Key derived values (all formula-traceable)

| Metric | Value | Formula (plain) | Confidence |
|--------|-------|-----------------|------------|
| Known forest acres | 2700 | 1200 + 1500 | HIGH |
| Partial green % | 5.874% | known forest / BMC area | MEDIUM |
| Est. MSW TPD | 44.64 | (186 × 800) × 300 g / 1e6 | LOW (proxy pop) |
| Tourism pressure 2023 | 257.8 visits/bed | 3,680,782 / 14,278 | MEDIUM |
| Local hospitality structure | 74.5% | (151+74)/302 | MEDIUM |

## Provenance guarantee

Every observation in `06_OBSERVATIONS.xlsx` carries:
- `status` (VERIFIED / DERIVED / ESTIMATED)
- `confidence`
- `calculation_formula` (when derived)
- `input_record_ids` / `source_code` / `dataset_code`
- Explicit notes that prevent mis-labelling (e.g. proxy ≠ measured retention)

## Integration steps for team

1. Copy this entire `REGENLEDGER_DATA_BBSR_UPDATED` folder into `backend/REGENLEDGER_DATA` (or alongside).
2. Run / adapt existing Chilika-style ingestion against `s21_ready/*.xlsx`.
3. Map `metric_code` → `metric_definitions.code`.
4. Keep original domain processed files as the audit archive.
5. Frontend: prefer `07_DASHBOARD_SUMMARY` for card labels; fall back to full observations for ledger/evidence panel.

## Still required from other members / future data

- Official BMC population (to upgrade MSW from ESTIMATED → better estimate or measured).
- OSPCB turbidity / water quality series.
- ASI or Temple Trust site footfall.
- Merchant / co-op ledger for true local retention %.
- Locked scoring weights for ECO_HEALTH_INDEX and EQUITY_SCORE.

---
*No data was deleted. All derivations are arithmetic on existing official numbers and are fully documented.*
