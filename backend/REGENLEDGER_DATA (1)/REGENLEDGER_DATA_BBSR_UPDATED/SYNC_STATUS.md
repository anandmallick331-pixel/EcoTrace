# Sync status — single source of truth

Updated: 2026-08-23T13:10:14.243828

Original framework files were updated so they no longer conflict with s21_ready:

| File | Change |
|------|--------|
| framework/BHUBANESWAR_METRIC_STATUS_TABLE.xlsx | Replaced with filled statuses (AVAILABLE / DERIVED / ESTIMATED / ILLUSTRATIVE) |
| framework/BHUBANESWAR_COMPUTATIONAL_GAP_MATRIX.xlsx | recommended_resolution_type updated for GAP_005, GAP_007, GAP_008, TURBIDITY, GAP_004 |
| framework/BHUBANESWAR_GAP_MASTER_RECONCILIATION.xlsx | Statuses closed/partial + new rows for TURBIDITY, TEMPLE, RETENTION, WAGES, CC, ECO, EQUITY |
| framework/BHUBANESWAR_DERIVATION_FORMULA_REGISTER.xlsx | New formulas appended; MSW formula marked executed |
| framework/BHUBANESWAR_GAP_RESOLUTION_GATE.xlsx | RESOLUTION_LOG sheet added |
| derived/.../BHUBANESWAR_DERIVED_OBSERVATIONS.xlsx | New derived rows appended |
| quality_reports/.../BHUBANESWAR_DATA_GAP_AUDIT.xlsx | Statuses flipped for closed gaps |

s21_ready/ remains the ingestion layer for the backend.
Original raw/processed domain files are unchanged (still the audit archive).

No metric that we filled still appears as pure DATA_GAP_UNRESOLVED in the primary status tables.
True remaining gaps (actual paid wages survey, true retention ledger, formal CC study, locked composite weights) stay honestly open.
