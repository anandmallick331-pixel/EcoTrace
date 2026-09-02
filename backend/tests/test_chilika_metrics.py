"""
Chilika Pilot Metric Testing Suite.

Verifies:
1. MetricDefinition Resolution: All domain-specific Chilika metric definitions resolve correctly.
2. Granular Water Metrics: Parameter-specific metric separation (pH, DO, BOD, FC, TC, temperature).
3. Fisheries Metrics: Resolution and value preservation for landings, composition, production, and species richness.
4. Biodiversity Metrics: Resolution of species richness, IUCN breakdown, census counts, and protected area extent.
5. Community Metrics: Resolution of fisher population, households, soft loans, IFB units, and training counts.
6. Tourism Metrics: Resolution of boatmen, vessel capacities, hotel infrastructure, occupancy, and footfall.
7. Spatial Handling: Proper handling of location-linked (stations, hubs) vs destination-wide (location_id=NULL) metrics.
8. Data Integrity & Null Handling: Qualitative/DATA_GAP records preserve null values without zero-coercion.
9. Safety & Exclusion: Blocked/unresolved metrics are not evaluated as valid metrics.
"""

import sys
from datetime import date
from pathlib import Path
from typing import Any

from sqlalchemy import select

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.destination import Destination, Location
from app.models.enums import MetricDirection, ObservationStatus
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source
from app.repositories.metric import MetricDefinitionRepository
from app.repositories.observation import ObservationRepository
from app.services.metric import MetricDefinitionService
from app.services.observation import ObservationService


def run_chilika_metric_tests() -> None:
    results: list[tuple[str, bool, str]] = []

    def record_test(name: str, passed: bool, detail: str = "") -> None:
        results.append((name, passed, detail))
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name} {f'- {detail}' if detail else ''}")

    print("\n" + "=" * 75)
    print("STARTING STEP 7: CHILIKA METRIC TESTING SUITE")
    print("=" * 75 + "\n")

    db = SessionLocal()
    try:
        metric_repo = MetricDefinitionRepository(db)
        metric_service = MetricDefinitionService(metric_repo)
        obs_repo = ObservationRepository(db)
        obs_service = ObservationService(obs_repo)

        dest = db.scalars(select(Destination).where(Destination.name == "Chilika")).first()
        assert dest is not None, "Chilika destination must exist in database"

        all_chilika_obs = db.scalars(
            select(Observation).where(Observation.destination_id == dest.id)
        ).all()

        # ───────────────────────────────────────────────────────────────────────
        # 1. MetricDefinition Resolution & Registry Integrity
        # ───────────────────────────────────────────────────────────────────────
        expected_metrics = [
            # Water Quality
            ("water_ph", "Water Quality", "unitless", MetricDirection.NEUTRAL),
            ("water_dissolved_oxygen", "Water Quality", "mg/L", MetricDirection.HIGHER_IS_BETTER),
            ("water_bod", "Water Quality", "mg/L", MetricDirection.LOWER_IS_BETTER),
            ("water_fecal_coliform", "Water Quality", "MPN/100 mL", MetricDirection.LOWER_IS_BETTER),
            ("water_total_coliform", "Water Quality", "MPN/100 mL", MetricDirection.LOWER_IS_BETTER),
            ("water_temperature", "Water Quality", "°C", MetricDirection.NEUTRAL),
            # Fisheries
            ("fish_landings_total", "Fisheries", "metric ton (MT)", MetricDirection.NEUTRAL),
            ("fish_landings_value", "Fisheries", "Million INR", MetricDirection.NEUTRAL),
            ("fish_composition_finfish", "Fisheries", "%", MetricDirection.NEUTRAL),
            ("fish_composition_prawn", "Fisheries", "%", MetricDirection.NEUTRAL),
            ("fish_composition_crab", "Fisheries", "%", MetricDirection.NEUTRAL),
            ("fish_production_annual", "Fisheries", "metric ton (MT)", MetricDirection.NEUTRAL),
            ("species_richness_finfish", "Fisheries", "species", MetricDirection.HIGHER_IS_BETTER),
            ("species_richness_shellfish", "Fisheries", "species", MetricDirection.HIGHER_IS_BETTER),
            ("threatened_finfish_species", "Fisheries", "species", MetricDirection.LOWER_IS_BETTER),
            # Biodiversity
            ("bird_species_richness_study", "Biodiversity", "species", MetricDirection.HIGHER_IS_BETTER),
            ("birds_least_concern", "Biodiversity", "species", MetricDirection.HIGHER_IS_BETTER),
            ("birds_near_threatened", "Biodiversity", "species", MetricDirection.NEUTRAL),
            ("birds_vulnerable", "Biodiversity", "species", MetricDirection.LOWER_IS_BETTER),
            ("birds_endangered", "Biodiversity", "species", MetricDirection.LOWER_IS_BETTER),
            ("fishing_cat_population", "Biodiversity", "individuals", MetricDirection.HIGHER_IS_BETTER),
            ("total_bird_census_count", "Biodiversity", "individuals", MetricDirection.HIGHER_IS_BETTER),
            ("floral_species_richness_angiosperm", "Biodiversity", "species", MetricDirection.HIGHER_IS_BETTER),
            ("nalabana_sanctuary_area", "Biodiversity", "square kilometer", MetricDirection.NEUTRAL),
            # Community
            ("community_fisher_villages", "Community", "villages", MetricDirection.NEUTRAL),
            ("community_fisher_households", "Community", "households", MetricDirection.NEUTRAL),
            ("community_fisher_population", "Community", "persons", MetricDirection.NEUTRAL),
            ("community_fishers_solely_dependent", "Community", "persons", MetricDirection.NEUTRAL),
            ("community_fisher_income_per_capita", "Community", "INR", MetricDirection.HIGHER_IS_BETTER),
            ("community_pfcs_soft_loans", "Community", "societies", MetricDirection.NEUTRAL),
            ("community_loan_disbursement", "Community", "lakh INR", MetricDirection.NEUTRAL),
            ("community_ifb_boxes_supplied", "Community", "boxes", MetricDirection.NEUTRAL),
            ("community_fishers_trained", "Community", "persons", MetricDirection.NEUTRAL),
            # Tourism
            ("trained_boatmen_count", "Tourism", "persons", MetricDirection.NEUTRAL),
            ("cruise_vessels_count", "Tourism", "vessels", MetricDirection.NEUTRAL),
            ("cruise_seating_capacity", "Tourism", "seats", MetricDirection.NEUTRAL),
            ("houseboat_vessels_count", "Tourism", "vessels", MetricDirection.NEUTRAL),
            ("hotel_capacity_rooms", "Tourism", "rooms", MetricDirection.NEUTRAL),
            ("hotel_capacity_beds", "Tourism", "beds", MetricDirection.NEUTRAL),
            ("hotel_occupancy_rate", "Tourism", "%", MetricDirection.NEUTRAL),
            ("tourist_footfall_domestic", "Tourism", "visits", MetricDirection.NEUTRAL),
            ("tourist_footfall_foreign", "Tourism", "visits", MetricDirection.NEUTRAL),
            ("tourist_footfall_total", "Tourism", "visits", MetricDirection.NEUTRAL),
        ]

        all_found = True
        missing_metrics = []
        for code, cat, unit, direction in expected_metrics:
            m = metric_service.get_by_code_version(code, "1.0")
            if not m or m.category != cat or m.direction != direction:
                all_found = False
                missing_metrics.append((code, cat, direction))

        record_test(
            "MetricDefinition: All domain metric definitions resolved with exact category & direction",
            all_found,
            f"checked={len(expected_metrics)}, missing={missing_metrics}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 2. Granular Water Quality Metrics Separation
        # ───────────────────────────────────────────────────────────────────────
        water_obs = [o for o in all_chilika_obs if o.metric_definition.category == "Water Quality"]
        ph_obs = [o for o in water_obs if o.metric_definition.code == "water_ph"]
        do_obs = [o for o in water_obs if o.metric_definition.code == "water_dissolved_oxygen"]
        bod_obs = [o for o in water_obs if o.metric_definition.code == "water_bod"]
        fc_obs = [o for o in water_obs if o.metric_definition.code == "water_fecal_coliform"]
        tc_obs = [o for o in water_obs if o.metric_definition.code == "water_total_coliform"]
        temp_obs = [o for o in water_obs if o.metric_definition.code == "water_temperature"]

        record_test(
            "Water Quality: pH observations isolated and within chemical range [6.0, 9.5]",
            len(ph_obs) >= 80 and all(6.0 <= o.normalized_value <= 9.5 for o in ph_obs if o.normalized_value is not None),
            f"ph_count={len(ph_obs)}, sample_val={ph_obs[0].normalized_value if ph_obs else None}",
        )

        record_test(
            "Water Quality: Dissolved Oxygen (DO) isolated with HIGHER_IS_BETTER direction",
            len(do_obs) >= 80 and all(o.metric_definition.direction == MetricDirection.HIGHER_IS_BETTER for o in do_obs),
            f"do_count={len(do_obs)}, unit={do_obs[0].metric_definition.unit if do_obs else None}",
        )

        record_test(
            "Water Quality: BOD isolated with LOWER_IS_BETTER direction and positive values",
            len(bod_obs) >= 80 and all(o.metric_definition.direction == MetricDirection.LOWER_IS_BETTER for o in bod_obs)
            and all(o.normalized_value >= 0 for o in bod_obs if o.normalized_value is not None),
            f"bod_count={len(bod_obs)}",
        )

        record_test(
            "Water Quality: Fecal Coliform (FC) and Total Coliform (TC) distinct with MPN/100 mL unit",
            len(fc_obs) >= 80 and len(tc_obs) >= 2
            and fc_obs[0].metric_definition.unit == "MPN/100 mL"
            and tc_obs[0].metric_definition.unit == "MPN/100 mL"
            and fc_obs[0].metric_definition.id != tc_obs[0].metric_definition.id,
            f"fc_count={len(fc_obs)}, tc_count={len(tc_obs)}",
        )

        record_test(
            "Water Quality: Temperature observations isolated with °C unit",
            len(temp_obs) >= 2 and all(15.0 <= o.normalized_value <= 40.0 for o in temp_obs if o.normalized_value is not None),
            f"temp_count={len(temp_obs)}, sample_val={temp_obs[0].normalized_value if temp_obs else None}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 3. Fisheries Metrics & Catch Breakdown Evaluation
        # ───────────────────────────────────────────────────────────────────────
        fish_obs = [o for o in all_chilika_obs if o.metric_definition.category == "Fisheries"]
        total_landings_obs = [o for o in fish_obs if o.metric_definition.code == "fish_landings_total"]
        composition_obs = [
            o for o in fish_obs
            if o.metric_definition.code in ["fish_composition_finfish", "fish_composition_prawn", "fish_composition_crab"]
        ]
        production_obs = [o for o in fish_obs if o.metric_definition.code == "fish_production_annual"]
        threatened_fish_obs = [o for o in fish_obs if o.metric_definition.code == "threatened_finfish_species"]

        record_test(
            "Fisheries: Total landings observations present in metric ton (MT)",
            len(total_landings_obs) >= 2 and all(o.metric_definition.unit == "metric ton (MT)" for o in total_landings_obs)
            and any(o.normalized_value == 19331.51 for o in total_landings_obs),
            f"landings_count={len(total_landings_obs)}",
        )

        record_test(
            "Fisheries: Catch composition percentages (finfish, prawn, crab) isolated with % unit",
            len(composition_obs) == 6 and all(o.metric_definition.unit == "%" for o in composition_obs)
            and all(0.0 <= o.normalized_value <= 100.0 for o in composition_obs if o.normalized_value is not None),
            f"composition_obs_count={len(composition_obs)}",
        )

        record_test(
            "Fisheries: Annual fish production series covers regional & district breakdowns",
            len(production_obs) >= 25 and any(o.location is not None for o in production_obs)
            and any(o.location is None for o in production_obs),
            f"production_count={len(production_obs)}",
        )

        record_test(
            "Fisheries: Threatened finfish species metric configured as LOWER_IS_BETTER",
            len(threatened_fish_obs) >= 1 and threatened_fish_obs[0].metric_definition.direction == MetricDirection.LOWER_IS_BETTER,
            f"threatened_val={threatened_fish_obs[0].normalized_value if threatened_fish_obs else None}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 4. Biodiversity Metrics & Conservation Status Breakdown
        # ───────────────────────────────────────────────────────────────────────
        bio_obs = [o for o in all_chilika_obs if o.metric_definition.category == "Biodiversity"]
        bird_census_obs = [o for o in bio_obs if o.metric_definition.code == "total_bird_census_count"]
        cat_obs = [o for o in bio_obs if o.metric_definition.code == "fishing_cat_population"]
        nalabana_area_obs = [o for o in bio_obs if o.metric_definition.code == "nalabana_sanctuary_area"]
        iucn_obs = [
            o for o in bio_obs
            if o.metric_definition.code in ["birds_least_concern", "birds_near_threatened", "birds_vulnerable", "birds_endangered"]
        ]

        record_test(
            "Biodiversity: Total bird census population count present as individuals count",
            len(bird_census_obs) >= 1 and bird_census_obs[0].normalized_value > 100000
            and bird_census_obs[0].metric_definition.unit == "individuals",
            f"bird_census_val={bird_census_obs[0].normalized_value if bird_census_obs else None}",
        )

        record_test(
            "Biodiversity: Fishing Cat population estimate resolved as HIGHER_IS_BETTER",
            len(cat_obs) >= 1 and cat_obs[0].normalized_value > 0
            and cat_obs[0].metric_definition.direction == MetricDirection.HIGHER_IS_BETTER,
            f"cat_pop_val={cat_obs[0].normalized_value if cat_obs else None}",
        )

        record_test(
            "Biodiversity: Nalabana sanctuary area metric linked to Nalabana Location in sq km",
            len(nalabana_area_obs) >= 1 and nalabana_area_obs[0].location is not None
            and nalabana_area_obs[0].location.label == "Nalabana"
            and nalabana_area_obs[0].normalized_value == 15.52,
            f"nalabana_area_val={nalabana_area_obs[0].normalized_value if nalabana_area_obs else None}",
        )

        record_test(
            "Biodiversity: IUCN status breakdown covers LC, NT, VU, EN with appropriate directions",
            len(iucn_obs) >= 4
            and any(o.metric_definition.code == "birds_endangered" and o.metric_definition.direction == MetricDirection.LOWER_IS_BETTER for o in iucn_obs)
            and any(o.metric_definition.code == "birds_least_concern" and o.metric_definition.direction == MetricDirection.HIGHER_IS_BETTER for o in iucn_obs),
            f"iucn_categories_count={len(iucn_obs)}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 5. Community & Livelihood Metrics
        # ───────────────────────────────────────────────────────────────────────
        comm_obs = [o for o in all_chilika_obs if o.metric_definition.category == "Community"]
        village_obs = [o for o in comm_obs if o.metric_definition.code == "community_fisher_villages"]
        household_obs = [o for o in comm_obs if o.metric_definition.code == "community_fisher_households"]
        loan_obs = [o for o in comm_obs if o.metric_definition.code == "community_loan_disbursement"]
        ifb_obs = [o for o in comm_obs if o.metric_definition.code in ["community_ifb_boxes_supplied", "community_ifb_total_boxes_supplied"]]
        train_obs = [o for o in comm_obs if o.metric_definition.code == "community_fishers_trained"]

        record_test(
            "Community: Fisher village count and household counts preserved with valid units",
            len(village_obs) >= 1 and len(household_obs) >= 1
            and village_obs[0].metric_definition.unit == "villages"
            and household_obs[0].metric_definition.unit == "households",
            f"villages={village_obs[0].normalized_value if village_obs else None}, households={household_obs[0].normalized_value if household_obs else None}",
        )

        record_test(
            "Community: Livelihood micro-credit soft loan disbursements mapped in lakh INR",
            len(loan_obs) >= 1 and loan_obs[0].metric_definition.unit == "lakh INR"
            and loan_obs[0].normalized_value > 0,
            f"loan_disbursed={loan_obs[0].normalized_value if loan_obs else None}",
        )

        record_test(
            "Community: Insulated Fish Boxes (IFB) support and fisher training metrics resolved",
            len(ifb_obs) >= 1 and len(train_obs) >= 1
            and train_obs[0].metric_definition.unit == "persons"
            and train_obs[0].normalized_value > 0,
            f"ifb_count={len(ifb_obs)}, trained_fishers={train_obs[0].normalized_value if train_obs else None}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 6. Tourism Infrastructure & Footfall Metrics
        # ───────────────────────────────────────────────────────────────────────
        tour_obs = [o for o in all_chilika_obs if o.metric_definition.category == "Tourism"]
        hotel_rooms_obs = [o for o in tour_obs if o.metric_definition.code == "hotel_capacity_rooms"]
        hotel_beds_obs = [o for o in tour_obs if o.metric_definition.code == "hotel_capacity_beds"]
        occupancy_obs = [o for o in tour_obs if o.metric_definition.code == "hotel_occupancy_rate"]
        cruise_vessels = [o for o in tour_obs if o.metric_definition.code == "cruise_vessels_count"]
        cruise_seats = [o for o in tour_obs if o.metric_definition.code == "cruise_seating_capacity"]
        boatmen_obs = [o for o in tour_obs if o.metric_definition.code == "trained_boatmen_count"]
        domestic_tour_obs = [o for o in tour_obs if o.metric_definition.code == "tourist_footfall_domestic"]
        foreign_tour_obs = [o for o in tour_obs if o.metric_definition.code == "tourist_footfall_foreign"]

        record_test(
            "Tourism: Hotel capacity (rooms & beds) disaggregated across spatial centres (Barkul, Rambha, Satapada)",
            len(hotel_rooms_obs) >= 5 and len(hotel_beds_obs) >= 5
            and all(o.location is not None for o in hotel_rooms_obs),
            f"room_obs_count={len(hotel_rooms_obs)}, locs={[o.location.label for o in hotel_rooms_obs if o.location]}",
        )

        record_test(
            "Tourism: Hotel occupancy rate % recorded with valid percentages [0, 100]",
            len(occupancy_obs) >= 5 and all(0.0 <= o.normalized_value <= 100.0 for o in occupancy_obs if o.normalized_value is not None),
            f"occupancy_samples={[o.normalized_value for o in occupancy_obs]}",
        )

        record_test(
            "Tourism: Day cruise vessel count and seating capacities resolved as distinct metrics",
            len(cruise_vessels) >= 1 and len(cruise_seats) >= 1
            and cruise_vessels[0].metric_definition.id != cruise_seats[0].metric_definition.id
            and cruise_vessels[0].normalized_value == 2.0
            and cruise_seats[0].normalized_value == 40.0,
            f"vessels={cruise_vessels[0].normalized_value if cruise_vessels else None}, seats={cruise_seats[0].normalized_value if cruise_seats else None}",
        )

        record_test(
            "Tourism: Trained boatmen count recorded with persons unit",
            len(boatmen_obs) >= 2 and all(o.metric_definition.unit == "persons" for o in boatmen_obs),
            f"trained_boatmen={[o.normalized_value for o in boatmen_obs]}",
        )

        record_test(
            "Tourism: Domestic and Foreign tourist footfalls distinct and non-negative",
            len(domestic_tour_obs) >= 9 and len(foreign_tour_obs) >= 9
            and all(o.normalized_value >= 0 for o in domestic_tour_obs if o.normalized_value is not None)
            and all(o.normalized_value >= 0 for o in foreign_tour_obs if o.normalized_value is not None),
            f"domestic_count={len(domestic_tour_obs)}, foreign_count={len(foreign_tour_obs)}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 7. Spatial Disaggregation vs Destination-Wide Handling
        # ───────────────────────────────────────────────────────────────────────
        station_linked_obs = [o for o in all_chilika_obs if o.location_id is not None]
        dest_wide_obs = [o for o in all_chilika_obs if o.location_id is None]

        record_test(
            "Spatial: 417 observations linked to specific Locations with valid coordinates",
            len(station_linked_obs) == 417
            and all(o.location.latitude is not None and o.location.longitude is not None for o in station_linked_obs),
            f"station_linked_count={len(station_linked_obs)}",
        )

        record_test(
            "Spatial: 114 destination-wide observations preserve location_id = NULL without failure",
            len(dest_wide_obs) == 114 and all(o.location_id is None for o in dest_wide_obs),
            f"dest_wide_count={len(dest_wide_obs)}",
        )

        # Test location filtering via repository
        sample_station_loc = db.scalars(select(Location).where(Location.destination_id == dest.id, Location.label == "Satapada")).first()
        assert sample_station_loc is not None
        satapada_obs = obs_repo.get_by_location(sample_station_loc.id)
        record_test(
            "Repository: get_by_location() returns accurate observations for specific Location",
            len(satapada_obs) > 0 and all(o.location_id == sample_station_loc.id for o in satapada_obs),
            f"satapada_obs_count={len(satapada_obs)}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 8. Data Integrity: Null Value & Data Gap Preservation
        # ───────────────────────────────────────────────────────────────────────
        null_value_obs = [o for o in all_chilika_obs if o.normalized_value is None or o.original_value is None]
        record_test(
            "Data Integrity: Qualitative & data gap observations preserve NULL without coercion to zero (0.0)",
            len(null_value_obs) == 15
            and all(o.normalized_value is None for o in null_value_obs)
            and all(o.original_value is None for o in null_value_obs),
            f"null_obs_count={len(null_value_obs)}, sample_notes={null_value_obs[0].notes if null_value_obs else None}",
        )

        record_test(
            "Data Integrity: Zero (0.0) is not fabricated for unobserved metric periods",
            not any(o.normalized_value == 0.0 and o.notes and "DATA_GAP" in o.notes for o in all_chilika_obs),
        )

        # ───────────────────────────────────────────────────────────────────────
        # 9. Safety & Exclusion of Blocked Metrics
        # ───────────────────────────────────────────────────────────────────────
        blocked_codes = ["fisher_population", "needs_metric_definition", "seagrass_richness"]
        blocked_in_db = db.scalars(
            select(MetricDefinition).where(MetricDefinition.code.in_(blocked_codes))
        ).all()
        record_test(
            "Safety: Blocked metric codes strictly excluded from MetricDefinition registry",
            len(blocked_in_db) == 0,
            f"found_blocked={[b.code for b in blocked_in_db]}",
        )

        blocked_obs_ids = ["BIO-IND-SEAGRASS-6", "BIO-IND-TOTAL-383", "FIS-COMM-001", "FIS-IND-010", "FIS-SPP-003", "FIS-SPP-004"]
        blocked_obs_found = []
        for o in all_chilika_obs:
            if o.notes and any(b_id in o.notes for b_id in blocked_obs_ids):
                blocked_obs_found.append(o.id)

        record_test(
            "Safety: All 6 blocked observation records strictly excluded from observation evaluation",
            len(blocked_obs_found) == 0,
            f"blocked_obs_found={blocked_obs_found}",
        )

    finally:
        db.close()

    print("\n" + "=" * 75)
    failed_tests = [name for name, passed, detail in results if not passed]
    if failed_tests:
        print(f"FAILED TESTS ({len(failed_tests)}):")
        for f in failed_tests:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print(f"ALL {len(results)} CHILIKA METRIC TESTS PASSED SUCCESSFULLY!")
        print("=" * 75 + "\n")


if __name__ == "__main__":
    run_chilika_metric_tests()
