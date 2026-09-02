# CHILIKA FISHERIES DATA PACKAGE

**Project:** S21 – Chilika Ecological Health / Risk Assessment  
**Location:** Chilika Lagoon, Odisha, India  
**Data domain:** Fisheries (raw, government-source-only)  
**Role:** Data research only – no scores  
**Version:** FISHERIES_V1 (initial)  
**Last updated:** 2026-08-18  

---

## Structure

```
CHILIKA_FISHERIES_DATA/
├── 01_RAW_DATA/
│   ├── CHILIKA_FISH_PRODUCTION_RAW.xlsx   ← Priority 1 (started)
│   ├── CHILIKA_FISH_SPECIES_RAW.xlsx      ← Priority 2 (skeleton)
│   ├── CHILIKA_FISHING_PRESSURE_RAW.xlsx  ← Priority 3 (skeleton)
│   └── CHILIKA_FISHER_COMMUNITY_RAW.xlsx  ← Priority 4 (skeleton)
├── 02_SOURCES/
│   ├── SOURCE_REGISTER.xlsx
│   ├── ODISHA_FISHERIES/
│   └── CDA/
├── 03_REFERENCE/
├── 04_VERIFICATION/
│   ├── VERIFICATION_CROSSCHECK.xlsx
│   ├── EVIDENCE_INDEX.xlsx
│   └── DATA_GAPS.xlsx
└── 05_DOCUMENTATION/
    └── README.md
```

## Current production values (verified)

| Financial Year | Fish (t) | Shrimp/Prawn (t) | Crab (t) | Total (t) | Source |
|----------------|----------|------------------|----------|-----------|--------|
| 2023-24 | 14,413.12 | 6,109.59 | 424.71 | 20,947.42 | Assembly reply (Minister) |
| 2024-25 | 13,344.25 | 5,970.58 | 439.47 | 19,754.30 | Assembly reply (Minister) |

CDA Health Report average annual total landings 2023–2024: **20,657.30 tons**  
MSY reference (CIFRI-ICAR 2005, used by CDA): **11,500 t/yr**

## Principles

1. Raw government values never altered.
2. Production, species, pressure, and community kept in separate files.
3. Missing values = NA / NR / NM – never estimated or zero-filled.
4. Odisha-wide or district totals never substituted for Chilika.
5. No scores calculated at this stage.

## Next actions

1. Download official Fisheries Statistics PDFs from fisheries.odisha.gov.in and extract multi-year Chilika production.
2. Extract official species inventory from CDA Fish Atlas / related publications.
3. Compile fishing pressure and fisher-community indicators from CDA and Fisheries Department sources.
