# CRITICAL GAPS RESOLUTION – KONARK

Authoritative list of **9 official data gaps**. All remain **UNRESOLVED**. Estimates/proxies do not close them.

---

## GAP 1 — Actual water consumption
- **Status:** UNRESOLVED
- **What exists:** `estimated_water_demand` = 2,265,165 L/day (ESTIMATED: 16,779 × 135 LPCD)
- **What does NOT exist:** Measured water consumption series for Konark NAC
- **Sources checked:** H&UD ULB population, OSUWSP-type norm, package water outlay records
- **Frontend representation:** ESTIMATED demand + UNRESOLVED consumption (never present demand as consumption)
- **Remaining requirement:** Konark NAC / PHED measured consumption series

## GAP 2 — Measured solid-waste tonnage
- **Status:** UNRESOLVED
- **What exists:** `estimated_resident_waste_generation` ≈ 5.034 tonnes/day (ESTIMATED: 16,779 × 300 g/person/day)
- **What does NOT exist:** Measured solid-waste generation/collection/treatment tonnage
- **Sources checked:** Programme docs, sanitation cost ceiling, population
- **Frontend representation:** ESTIMATED resident generation + UNRESOLVED measured tonnage
- **Remaining requirement:** Konark NAC SWM annual report / DPR with measured TPD

## GAP 3 — Property-specific species inventory
- **Status:** UNRESOLVED
- **What exists:** Sanctuary-level blackbuck census negative observations (Balukhand-Konark WLS)
- **What does NOT exist:** Species inventory for Sun Temple WH property
- **Sources checked:** Odisha Forest Dept Annual Activity Reports
- **Frontend representation:** CONTEXT (sanctuary) + UNRESOLVED property inventory
- **Remaining requirement:** ASI/UNESCO property-level ecological survey

## GAP 4 — Formal carrying capacity
- **Status:** UNRESOLVED
- **What exists:** ASI-ticketed visitor volume series (context only)
- **What does NOT exist:** Official or scientifically defensible carrying capacity / peak limit
- **Sources checked:** Package tourism, heritage, ASI context records
- **Frontend representation:** UNRESOLVED_DATA_GAP (volume is DIRECT context only)
- **Remaining requirement:** Official capacity study / ASI / police / temple administration orders

## GAP 5 — Local monetary tourism retention
- **Status:** UNRESOLVED
- **What exists:** Hotel stock (structural context only)
- **What does NOT exist:** Compatible tourism expenditure + locally retained tourism income
- **Sources checked:** ODT hotel series
- **Frontend representation:** STRUCTURAL_PROXY (labelled) + UNRESOLVED monetary retention
- **Remaining requirement:** Compatible monetary series

## GAP 6 — Destination-specific tourism expenditure
- **Status:** UNRESOLVED
- **What exists:** Odisha-wide expenditure figures (CONTEXT only)
- **What does NOT exist:** Konark-compatible destination-specific expenditure series
- **Sources checked:** ODT Statistical Bulletins
- **Frontend representation:** UNRESOLVED_DATA_GAP
- **Remaining requirement:** Destination-specific survey

## GAP 7 — Verified Konark water-quality station series
- **Status:** UNRESOLVED
- **What exists:** None in package
- **What does NOT exist:** OSPCB / equivalent pH, DO, BOD, turbidity for Konark or Chandrabhaga stations
- **Sources checked:** Package OSPCB notes / environment records
- **Frontend representation:** UNRESOLVED_DATA_GAP
- **Remaining requirement:** Verified station observations with station, date, metric, source

## GAP 8 — Full non-ASI / broader visitor series
- **Status:** UNRESOLVED
- **Current representation:** PARTIAL — ASI-ticketed day-visitor series is AVAILABLE (DIRECT); this does not close the broader non-ASI / all-channel visitor series gap
- **What exists:** ASI-ticketed day-visitor series 2018–2024 (DIRECT / AVAILABLE)
- **What does NOT exist:** Broader non-ASI / all-channel visitor series
- **Sources checked:** ODT Statistical Bulletins 2018–2024
- **Frontend representation:** ASI series DIRECT_AVAILABLE (partial representation of the broader visitor concept); broader series UNRESOLVED_DATA_GAP
- **Remaining requirement:** Future bulletins if they publish non-ASI series
- **Note:** Do not mark the gap itself as PARTIAL or CLOSED merely because the related ASI series exists. Do not downgrade the valid ASI series.

## GAP 9 — Full cadastral / ownership GIS
- **Status:** UNRESOLVED
- **What exists:** Representative GIS points (official UNESCO coordinate + reference-only points)
- **What does NOT exist:** Authoritative cadastral / ownership polygon layer
- **Sources checked:** UNESCO WHC, Bhulekh notes, GIS RAW
- **Frontend representation:** CONTEXT_ONLY (points) + UNRESOLVED cadastral. Point ≠ boundary ≠ ownership geometry.
- **Remaining requirement:** Authoritative cadastral / ownership polygon dataset with official provenance
