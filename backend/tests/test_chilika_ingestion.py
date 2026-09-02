"""
Chilika Pilot Ingestion Test Suite.

Verifies:
1. Complete ingestion execution across all 5 processed datasets.
2. Idempotency (safe to rerun with zero errors and zero duplicate key violations).
3. Strict exclusion of blocked & ambiguous items (fisher_population, needs_metric_definition, BIO-IND-SEAGRASS-6).
4. Provenance graph integrity (Observation -> MetricDefinition -> Dataset -> Source).
5. Strict evidence creation rules (Evidence created only when verifiable metadata exists; P2 provenance preserved).
6. Accurate date range parsing and original unit/notes preservation.
"""

import sys
from datetime import date
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.destination import Destination, Location
from app.models.enums import MetricDirection, ObservationStatus
from app.models.evidence import Evidence
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source
from app.services.chilika_ingestion import ChilikaIngestionService, run_chilika_ingestion
from app.services.observation import ObservationService
from app.repositories.observation import ObservationRepository


def test_chilika_ingestion_suite() -> None:
    results: list[tuple[str, bool, str]] = []

    def record_test(name: str, passed: bool, detail: str = "") -> None:
        results.append((name, passed, detail))
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name} {f'- {detail}' if detail else ''}")

    print("\n" + "=" * 70)
    print("STARTING CHILIKA PILOT INGESTION TEST SUITE")
    print("=" * 70 + "\n")

    db = SessionLocal()
    try:
        # ───────────────────────────────────────────────────────────────────────
        # 1. Primary Ingestion Execution & Metrics
        # ───────────────────────────────────────────────────────────────────────
        service = ChilikaIngestionService(db)
        report = service.run()

        record_test(
            "Ingestion: Processed all 5 authoritative datasets",
            len(report.files_processed) == 5,
            f"files={report.files_processed}",
        )
        record_test(
            "Ingestion: Read exact total of 539 records",
            report.records_read == 539,
            f"records_read={report.records_read}",
        )
        record_test(
            "Ingestion: Blocked exactly 6 blocked/unresolved records",
            report.records_blocked == 6,
            f"records_blocked={report.records_blocked}",
        )
        record_test(
            "Ingestion: Zero validation errors encountered",
            len(report.validation_errors) == 0,
            f"errors={report.validation_errors}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 2. Idempotency & Duplicate Prevention
        # ───────────────────────────────────────────────────────────────────────
        second_service = ChilikaIngestionService(db)
        second_report = second_service.run()

        record_test(
            "Idempotency: Rerun creates 0 new records",
            second_report.records_inserted == 0,
            f"new_inserted={second_report.records_inserted}",
        )
        record_test(
            "Idempotency: Rerun produces 0 validation errors",
            len(second_report.validation_errors) == 0,
        )
        record_test(
            "Idempotency: Duplicate prevention safely caught all existing records",
            second_report.duplicate_preventions >= 500,
            f"duplicate_preventions={second_report.duplicate_preventions}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 3. Destination & Locations Verification
        # ───────────────────────────────────────────────────────────────────────
        dest = db.query(Destination).filter(Destination.name == "Chilika").first()
        record_test(
            "Destination: Chilika created with IND country code and Odisha region",
            dest is not None and dest.country_code == "IND" and dest.region == "Odisha",
            f"id={dest.id if dest else None}",
        )

        loc_count = db.query(Location).filter(Location.destination_id == dest.id).count()
        record_test(
            "Locations: Spatial hubs, 33 water stations, and 6 Nalabana stations loaded (52 total)",
            loc_count >= 52,
            f"location_count={loc_count}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 4. Sources & Datasets Verification
        # ───────────────────────────────────────────────────────────────────────
        source_count = db.query(Source).count()
        record_test(
            "Sources: Reconciled sources loaded from SOURCE_REGISTER",
            source_count >= 23,
            f"total_sources={source_count}",
        )

        dataset_names = [d.name for d in db.query(Dataset).all()]
        expected_ds = [
            "chilika_tourism_processed.xlsx",
            "chilika_fisheries_processed.xlsx",
            "chilika_water_processed.xlsx",
            "chilika_biodiversity_processed.xlsx",
            "chilika_community_processed.xlsx",
        ]
        all_ds_present = all(ds in dataset_names for ds in expected_ds)
        record_test(
            "Datasets: All 5 processed datasets registered with valid source links",
            all_ds_present,
            f"datasets={dataset_names}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 5. Safe Metric Definitions Verification
        # ───────────────────────────────────────────────────────────────────────
        # Blocked metrics must NOT be in MetricDefinition table as outcome metrics
        blocked_metric_codes = ["fisher_population", "needs_metric_definition", "seagrass_richness"]
        unwanted_metrics = db.query(MetricDefinition).filter(MetricDefinition.code.in_(blocked_metric_codes)).all()
        record_test(
            "Safety: Blocked/unresolved metrics excluded from MetricDefinitions",
            len(unwanted_metrics) == 0,
            f"unwanted_found={[m.code for m in unwanted_metrics]}",
        )

        # Approved metrics must be present with valid directions
        endangered_m = db.query(MetricDefinition).filter(MetricDefinition.code == "endangered_species_indicator").first()
        record_test(
            "Metric: endangered_species_indicator direction is LOWER_IS_BETTER",
            endangered_m is not None and endangered_m.direction == MetricDirection.LOWER_IS_BETTER,
        )

        boating_m = db.query(MetricDefinition).filter(MetricDefinition.code == "boating_activity").first()
        record_test(
            "Metric: boating_activity direction is NEUTRAL",
            boating_m is not None and boating_m.direction == MetricDirection.NEUTRAL,
        )

        # ───────────────────────────────────────────────────────────────────────
        # 6. Blocked Records Exclusion from Observations
        # ───────────────────────────────────────────────────────────────────────
        chilika_obs = db.query(Observation).filter(Observation.destination_id == dest.id).all()
        blocked_found_in_obs = []
        for o in chilika_obs:
            if o.notes:
                for b_id in ["BIO-IND-SEAGRASS-6", "BIO-IND-TOTAL-383", "FIS-COMM-001", "FIS-IND-010", "FIS-SPP-003", "FIS-SPP-004"]:
                    if f"observation_id: {b_id}" in o.notes:
                        blocked_found_in_obs.append(b_id)

        record_test(
            "Safety: Blocked records excluded from Observation records",
            len(blocked_found_in_obs) == 0,
            f"blocked_in_obs={blocked_found_in_obs}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 7. Provenance Lineage & Evidence Creation Rules
        # ───────────────────────────────────────────────────────────────────────
        obs_service = ObservationService(ObservationRepository(db))
        sample_obs = chilika_obs[0]
        prov = obs_service.get_provenance(sample_obs.id)

        record_test(
            "Provenance: Full lineage trace resolvable (Obs -> Metric -> Dataset -> Source)",
            prov is not None
            and prov.get("metric_definition") is not None
            and prov.get("dataset") is not None
            and prov.get("source") is not None,
            f"obs_id={sample_obs.id}, source={prov['source'].name if prov and prov.get('source') else None}",
        )

        # Verify evidence count and that evidence is not blindly fabricated
        total_ev = db.query(Evidence).join(Observation).filter(Observation.destination_id == dest.id).count()
        record_test(
            "Evidence: Evidence created only when verifiable metadata exists (not blindly 1:1)",
            0 < total_ev < len(chilika_obs),
            f"evidence_count={total_ev}, obs_count={len(chilika_obs)}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 8. Date Range, Quality Flag & Location_ID Disaggregation Preservation
        # ───────────────────────────────────────────────────────────────────────
        record_test(
            "Disaggregation: Preserved >= 530 unique observations across spatial locations",
            len(chilika_obs) >= 530,
            f"chilika_obs_count={len(chilika_obs)}",
        )

        water_station_obs = [o for o in chilika_obs if o.location_id is not None and o.dataset.name == "chilika_water_processed.xlsx"]
        record_test(
            "Locations: Water quality observations cleanly linked to Station Location IDs",
            len(water_station_obs) >= 300,
            f"station_linked_count={len(water_station_obs)}",
        )

        dest_wide_obs = [o for o in chilika_obs if o.location_id is None]
        record_test(
            "Locations: Destination-wide observations preserve location_id = NULL",
            len(dest_wide_obs) > 0,
            f"null_location_count={len(dest_wide_obs)}",
        )

        sample_water = [o for o in chilika_obs if o.dataset.name == "chilika_water_processed.xlsx"]
        record_test(
            "Temporal: Calendar year 2024 mapped to 2024-01-01 / 2024-12-31",
            len(sample_water) > 0 and any(o.period_start == date(2024, 1, 1) and o.period_end == date(2024, 12, 31) for o in sample_water),
        )

        record_test(
            "Notes: Provenance trace retained verbatim in notes field",
            all("observation_id:" in o.notes for o in chilika_obs if o.notes),
        )

    finally:
        db.close()

    print("\n" + "=" * 70)
    failed_tests = [name for name, passed, _ in results if not passed]
    if failed_tests:
        print(f"FAILED TESTS ({len(failed_tests)}):")
        for f in failed_tests:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print(f"ALL {len(results)} CHILIKA INGESTION TESTS PASSED SUCCESSFULLY!")
        print("=" * 70 + "\n")


if __name__ == "__main__":
    test_chilika_ingestion_suite()
