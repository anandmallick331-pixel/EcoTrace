# CHILIKA WATER DATA PACKAGE

**Project:** S21 – Regenerative / Sustainable Tourism  
**Location:** Chilika Lagoon, Odisha, India  
**Dataset focus:** Water Quality only (raw, government-source-verified)  
**Team role:** Dataset research (raw evidence collection & verification)  
**Version:** WATER_V1  
**Last updated:** 2026-08-18  

---

## 1. Purpose

This package contains **raw, unaltered water-quality observations** for Chilika Lagoon drawn exclusively from official government sources (CDA, OSPCB, CPCB).

It is designed so that every numerical value is traceable:

```
SOURCE → DOCUMENT → PAGE/TABLE → LOCATION → DATE/PERIOD → RAW VALUE
```

No scores, no normalisation, no estimated missing values, and no mixing of CDA and OSPCB observations into a single derived series are performed here. Scoring and modelling are the responsibility of a later team.

---

## 2. Folder Structure

```
CHILIKA_WATER_DATA/
│
├── 01_RAW_DATA/
│   ├── CDA_2024_STATIONS_RAW.xlsx      ← 33-station lagoon set, 2024
│   ├── CDA_2024_NALABANA_RAW.xlsx      ← Nalabana (6 stations), 2024 – kept separate
│   ├── CDA_2025_STATIONS_RAW.xlsx      ← 33-station lagoon set, 2025
│   ├── CDA_2025_NALABANA_RAW.xlsx      ← Nalabana (6 stations), 2025 – kept separate
│   ├── OSPCB_MONTHLY_WQI_RAW.xlsx      ← placeholder (to be populated)
│   └── OSPCB_ANNUAL_LAKE_RAW.xlsx      ← placeholder (to be populated)
│
├── 02_SOURCES/
│   ├── SOURCE_REGISTER.xlsx            ← master list of every official document used
│   ├── CDA_2024/                       ← local copies / notes for 2024 CDA docs
│   ├── CDA_2025/                       ← local copies / notes for 2025 CDA docs
│   └── OSPCB/                          ← local copies / notes for OSPCB docs
│
├── 03_THRESHOLDS/
│   └── WATER_THRESHOLDS.xlsx           ← official Class SW-II + CDA desired conditions only
│
├── 04_VERIFICATION/
│   ├── VERIFICATION_CROSSCHECK.xlsx    ← verification status of key records
│   ├── EVIDENCE_INDEX.xlsx             ← page/table/screenshot pointers
│   └── DATA_GAPS.xlsx                  ← explicit list of missing / incomplete items
│
└── 05_DOCUMENTATION/
    ├── README.md                       ← this file
    └── DATA_DICTIONARY.xlsx            ← column definitions
```

---

## 3. Coverage

| Source | Period | Stations | Parameters |
|--------|--------|----------|------------|
| CDA Annual Sheet | 2024 | 33 lagoon + 6 Nalabana | FC, pH, DO, BOD, Turbidity (Turbidity incomplete for some 2024 stations) |
| CDA Annual Sheet | 2025 | 33 lagoon + 6 Nalabana | FC, pH, DO, BOD, Turbidity |
| CDA Health Report Card | 2023–24 | Zonal / lagoon-wide | Thresholds for clarity, DO, Chlorophyll-a |
| OSPCB Monthly WQI | 2024–2025 | Rambha, Satapada (so far) | Single-day observations (to be expanded) |
| OSPCB Annual Lakes | 2023 | Rambha, Satapada | Annual averages |
| CPCB | National standard | — | Class SW-II criteria |

---

## 4. Data Principles (non-negotiable)

1. **Raw government values are never altered.**
2. **Derived calculations are kept completely separate** (and are not produced by this team).
3. **Missing data is never estimated or filled.** Use `NA` / `NR` / `NM`.
4. **Every important value has a `source_id`.**
5. **Every source has an official URL or verified local PDF.**
6. **Important values have page/table references.**
7. **CDA and OSPCB values are never silently merged.**
8. **Nalabana is kept in its own files** and is never mixed into the 33-station lagoon set.
9. **No scores appear in any raw-data file.**

---

## 5. Source Hierarchy

1. **CDA** annual water-quality datasheets (highest spatial resolution for Chilika – 33 stations)
2. **OSPCB** monthly WQI bulletins and annual lake reports (independent government monitoring)
3. **CPCB** Designated Best Use criteria (national thresholds used by both CDA and OSPCB)

Secondary sources (news, blogs, Wikipedia, academic papers without primary data tables) are not used for numerical values.

---

## 6. How to use a number

1. Locate the row in the appropriate `*_RAW.xlsx` file.
2. Note the `source_id`.
3. Open `02_SOURCES/SOURCE_REGISTER.xlsx` and find that `source_id`.
4. Open the original PDF (or the page reference given).
5. Confirm the value, unit, station, and date/period.

If any of those steps fails, the record must be flagged in `04_VERIFICATION/`.

---

## 7. Known Gaps (see DATA_GAPS.xlsx for full list)

- Turbidity station-level numbers for several 2024 stations could not be cleanly recovered from the current PDF text extraction → marked `NA`.
- OSPCB monthly series currently limited to the stations clearly present in the available bulletins (mainly Rambha & Satapada).
- Human-readable station names are not printed next to station numbers in the CDA annual sheets; coordinates are the reliable key.

---

## 8. Next steps for the data-research team

1. Populate `OSPCB_MONTHLY_WQI_RAW.xlsx` from all available official OSPCB WQI PDFs that contain Chilika stations.
2. Populate `OSPCB_ANNUAL_LAKE_RAW.xlsx` from the 2023 (and later) annual lake reports.
3. Expand verification rows for every station-parameter combination that will be used in scoring.
4. Add screenshots of critical tables into an `EVIDENCE/` sub-folder if required by judges.

---

## 9. Contact / Ownership

Dataset research responsibility: [Team member names]  
All numerical values remain the property of the original government agencies (CDA, OSPCB, CPCB).  
This package only organises and cites those values for research and competition use.
