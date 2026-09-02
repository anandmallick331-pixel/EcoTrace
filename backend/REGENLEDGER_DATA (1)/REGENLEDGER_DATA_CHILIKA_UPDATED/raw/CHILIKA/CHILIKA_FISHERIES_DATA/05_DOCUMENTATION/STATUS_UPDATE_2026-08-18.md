# Chilika Fisheries Dataset – Status Update 18 Aug 2026

## Official sources now retained in package

### Directorate of Fisheries, Odisha
- `Fish_Production_Odisha_Statistics.pdf` – continuous Chilika column 2000-01 to 2023-24(P)
- `Fish-Production-District-wise-2024-25P.pdf` – Chilika total **19,754 MT** (P)  
  - Khurda 10,886 | Puri 7,548 | Ganjam 1,320

### Chilika Development Authority
- `CDA_Fish_Shellfish_Diversity_2018.pdf` – Suresh et al. 2018 monograph  
  - **336 finfish** + **66 shellfish** (29 prawn/shrimp + 35 crab + 2 lobster)
- `CDA_Health_Report_Card_2021_22.pdf` – key landings + MSY + thresholds
- `CDA Health Report(2023-24).pdf` (already present)
- `CDA_Water_Quality_2025.pdf` (water quality only; no fisheries numbers)

### Planning & Convergence / DES
- `Odisha_Economic_Survey_2025_26.pdf` – full volume searched  
  - **No quantitative Chilika-specific fisherfolk / PFCS / boat / beneficiary numbers**

### FARD Annual Activity Reports
- 2023-24 and 2024-25 present; limited Chilika-specific community data

## RAW sheets status

| RAW file | Status | Key official values retained |
|----------|--------|------------------------------|
| CHILIKA_FISH_PRODUCTION_RAW.xlsx | **FILLED** | Continuous series 2000-01 → 2023-24(P) + 2024-25(P) 19,754 MT + district split |
| CHILIKA_FISH_LANDINGS_RAW.xlsx | **PARTIAL** | 2021-22 avg total catch 19,331.51 t; composition %; value; per-capita income of active fishers |
| CHILIKA_SPECIES_RAW.xlsx | **FILLED** | 336 finfish + 66 shellfish from 2018 CDA-CIFRI monograph (data to 2016) |
| CHILIKA_FISHERIES_INDICATORS_RAW.xlsx | **FILLED** | MSY = 11,500 t/yr (CIFRI 2005 threshold still used by CDA); desired commercial spp = 45; size thresholds; health grades 2021-22 |
| CHILIKA_FISHING_PRESSURE_RAW.xlsx | **EMPTY / GAP** | No official current boat count or effort series found |
| CHILIKA_FISHER_COMMUNITY_RAW.xlsx | **EMPTY / GAP** | No Chilika-specific fisherfolk / PFCS / beneficiary numbers in any retained official source |

## Strict rules followed
- Only official government / CDA sources used
- No Odisha-wide numbers labelled as Chilika
- No estimates or placeholders
- Every number linked to source_id → PDF → page/table
- Gaps explicitly recorded in DATA_GAPS.xlsx

## Still useful to upload (if available)
1. Odisha Economic Survey 2023-24 (full + statistical appendix)
2. Odisha Economic Survey 2024-25
3. Fish Atlas of Chilika 2009 (full PDF)
4. Any later CDA fisheries yield / landing centre tables beyond the report-card averages

## Next recommended order
Production (done) → Species (done) → Landings (partial) → Indicators (done) → Fishing Pressure (gap) → Fisher Community (gap)
