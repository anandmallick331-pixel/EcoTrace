# CHILIKA TOURISM DATA PACKAGE — FINAL

**Domain:** Tourism  
**Destination:** Chilika Lake, Odisha  
**Version:** TOURISM_V2_FINAL  
**Updated:** 2026-08-18  
**Source policy:** Government of Odisha primary/official sources only.

## Source set included

### Odisha Tourism Department
1. **Odisha Tourism Statistical Bulletin 2024**
   - Tourist-centre footfall for Chilika (Satapada), Chilika (Rambha), Chilika (Barkul)
   - Place-wise hotel establishments, rooms and beds
   - Chilika-area hotel occupancy
   - Identified tourist centres

2. **Odisha Tourism Annual Report 2023-24**
   - Boatmen tourism orientation/life-saving training
   - Chilika cruise/houseboat infrastructure where explicitly reported

### Chilika Development Authority (CDA)
3. **CDA Annual Report 2010-11**
   - Satapada Visitor Centre
   - Sustainable ecotourism training for Chilika boat operators
   - Tourism-related visitor facilities

4. **CDA Annual Report 2011-12 / 2012-13**
   - Satapada Visitor Centre and dolphin/waterbird watching facilities
   - Satapada-Jahnikuda ferry access
   - Historical Chilika tourist inflow (2000-08 period)

5. **Official CDA webpages** are recorded in SOURCE_REGISTER.xlsx:
   - Visit Chilika
   - How to Reach Chilika
   - Satapada
   - Satapada Interpretation Centre

## RAW datasets

- `CHILIKA_TOURIST_FOOTFALL_RAW.xlsx`
- `CHILIKA_HOTEL_FACILITIES_RAW.xlsx`
- `CHILIKA_HOTEL_OCCUPANCY_RAW.xlsx`
- `CHILIKA_TOURISM_INFRASTRUCTURE_RAW.xlsx`
- `CHILIKA_BOATING_TOURISM_RAW.xlsx`

All observations retain source IDs, source pages/sections, geographic scope, verification status and notes.

## Important interpretation rules

1. **Do not combine Satapada, Rambha and Barkul into a single "Chilika tourist count" unless the source itself reports a Chilika-wide total.**
2. **Do not convert boatmen trained into total active boatmen.**
3. **Do not convert cruise capacity into tourist visits.**
4. The CDA `0.43 million` tourist-inflow figure is a **historical 2000-08 period figure**, not an annual value.
5. The `>70,000 people benefited` from the Satapada-Jahnikuda ferry is an **access/community-benefit observation**, not tourist footfall.
6. No score is calculated in the RAW files.
7. Missing current boating fleet/trip data remains a documented gap rather than an estimate.
8. Historical CDA observations and current Odisha Tourism statistics must not be treated as the same time series.

## Remaining documented gaps

- Current total active tourist boats / annual boat trips
- Current visitor-centre attendance/capacity
- Any other current Chilika-specific tourism indicators not explicitly reported by an official source

A documented data gap is preferred over an unsupported estimate.
