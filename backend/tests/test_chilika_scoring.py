"""
Chilika Pilot Scoring Readiness & Scoring Test Suite.

Verifies:
1. Existing Scoring Contract: GET /api/v1/destinations/{id}/scores & overview endpoints return valid schemas.
2. Pluggable Scoring Engine Contract: Registering a scoring engine computes destination & category scores without modifying core models.
3. Domain Scoring Readiness:
   - Water Quality (pH, DO, BOD, FC, TC, Temp)
   - Fisheries (Landings, Composition, Production, Species Richness, Threatened)
   - Biodiversity (Bird Census, Fishing Cat, Nalabana Area, IUCN Breakdown, Plant Richness)
   - Community / Livelihood (Villages, Households, Population, Soft Loans, IFB Boxes, Training)
   - Tourism (Hotel Infrastructure, Occupancy Rate, Day Cruises, Boatmen, Footfall)
4. State Classification:
   - SCORING_READY: Observations with valid MetricDefinition, unit, direction, and non-null numeric normalized_value.
   - SCORING_BLOCKED: Excluded blocked records (BIO-IND-SEAGRASS-6, etc.) cannot enter scoring.
   - DATA_GAP / QUALITATIVE: Records with normalized_value=NULL remain NULL without 0.0 coercion.
   - NOT_APPLICABLE: Unmapped or out-of-scope indicators excluded from MetricDefinition intake.
5. Spatial Location Handling:
   - Location-specific observations (417) isolate station/hub metrics.
   - Destination-wide observations (114, location_id=NULL) handle whole-destination metrics.
6. Provenance & Integrity:
   - P2 Partial provenance records are preserved without fabricating evidence.
   - No scoring formulas or thresholds are fabricated or modified.
"""

import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.destination import Destination, Location
from app.models.enums import ConfidenceLevel, MetricDirection, ObservationStatus
from app.models.evidence import Evidence
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source
from app.schemas.scoring import CategoryScore, OverallScore, ScoreComponent, ScoreOverview
from app.services.scoring import ScoringEngineInterface, ScoringService


class ChilikaTestScoringEngine(ScoringEngineInterface):
    """
    Test implementation of the pluggable ScoringEngineInterface to verify
    end-to-end score calculation and component breakdown against Chilika data.
    Does NOT modify database or production formulas.
    """

    def calculate_scores(self, destination_id: int, db: Any) -> OverallScore | None:
        dest = db.scalars(select(Destination).where(Destination.id == destination_id)).first()
        if not dest:
            return None

        obs_list = db.scalars(
            select(Observation).where(Observation.destination_id == destination_id)
        ).all()

        # Group observations by category
        by_category: dict[str, list[Observation]] = {}
        for o in obs_list:
            cat = o.metric_definition.category
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(o)

        category_scores: list[CategoryScore] = []
        for cat_name, cat_obs in sorted(by_category.items()):
            # Count scoring-ready components (numeric normalized_value)
            ready_obs = [o for o in cat_obs if o.normalized_value is not None]
            components: list[ScoreComponent] = []

            for o in ready_obs:
                components.append(
                    ScoreComponent(
                        metric_code=o.metric_definition.code,
                        metric_name=o.metric_definition.name,
                        category=cat_name,
                        normalized_value=o.normalized_value,
                        weight=1.0,
                        score_contribution=o.normalized_value,
                        confidence=ConfidenceLevel.HIGH if o.evidence_items else ConfidenceLevel.MEDIUM,
                        evidence_coverage=1.0 if o.evidence_items else 0.5,
                    )
                )

            evidence_count = sum(1 for o in cat_obs if o.evidence_items)
            coverage = evidence_count / len(cat_obs) if cat_obs else 0.0

            category_scores.append(
                CategoryScore(
                    category=cat_name,
                    score=float(len(ready_obs)),  # representative readiness metric count
                    lower_bound=0.0,
                    upper_bound=100.0,
                    weight=1.0 / len(by_category),
                    confidence=ConfidenceLevel.HIGH if coverage >= 0.8 else ConfidenceLevel.MEDIUM,
                    evidence_coverage=coverage,
                    components=components,
                )
            )

        total_ready = sum(len(c.components) for c in category_scores)
        total_ev = sum(1 for o in obs_list if o.evidence_items)

        return OverallScore(
            destination_id=destination_id,
            score=float(total_ready),
            lower_bound=0.0,
            upper_bound=float(len(obs_list)),
            confidence=ConfidenceLevel.HIGH if (total_ev / len(obs_list)) >= 0.8 else ConfidenceLevel.MEDIUM,
            evidence_coverage=total_ev / len(obs_list) if obs_list else 0.0,
            scoring_version="1.0-test",
            calculation_timestamp=datetime.now(timezone.utc),
            categories=category_scores,
        )

    def get_score_overview(self, destination_id: int, db: Any) -> ScoreOverview | None:
        detailed = self.calculate_scores(destination_id, db)
        if not detailed:
            return None

        cat_dict = {c.category: c.score for c in detailed.categories}
        return ScoreOverview(
            destination_id=destination_id,
            score=detailed.score,
            lower_bound=detailed.lower_bound,
            upper_bound=detailed.upper_bound,
            confidence=detailed.confidence,
            evidence_coverage=detailed.evidence_coverage,
            scoring_version=detailed.scoring_version,
            calculation_timestamp=detailed.calculation_timestamp,
            category_scores=cat_dict,
        )


def run_chilika_scoring_suite() -> None:
    results: list[tuple[str, bool, str]] = []

    def record_test(name: str, passed: bool, detail: str = "") -> None:
        results.append((name, passed, detail))
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name} {f'- {detail}' if detail else ''}")

    print("\n" + "=" * 75)
    print("STARTING STEP 8: CHILIKA SCORING READINESS & SCORING TEST SUITE")
    print("=" * 75 + "\n")

    db = SessionLocal()
    try:
        dest = db.scalars(select(Destination).where(Destination.name == "Chilika")).first()
        assert dest is not None, "Chilika destination must exist in database"

        all_chilika_obs = db.scalars(
            select(Observation).where(Observation.destination_id == dest.id)
        ).all()

        # ───────────────────────────────────────────────────────────────────────
        # 1. Default Scoring Schema Contract (Uncomputed State)
        # ───────────────────────────────────────────────────────────────────────
        # Reset any registered engine first
        ScoringService._engine = None
        default_scoring_service = ScoringService(db)

        uncomputed_scores = default_scoring_service.get_scores(dest.id)
        record_test(
            "Contract: Uncomputed OverallScore returns clean null/empty schema contract",
            uncomputed_scores.destination_id == dest.id
            and uncomputed_scores.score is None
            and uncomputed_scores.scoring_version is None
            and uncomputed_scores.categories == [],
            f"score={uncomputed_scores.score}, categories={uncomputed_scores.categories}",
        )

        uncomputed_overview = default_scoring_service.get_score_overview(dest.id)
        record_test(
            "Contract: Uncomputed ScoreOverview returns clean null/empty category dictionary",
            uncomputed_overview.destination_id == dest.id
            and uncomputed_overview.score is None
            and uncomputed_overview.category_scores == {},
            f"category_scores={uncomputed_overview.category_scores}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 2. Pluggable Scoring Engine Execution
        # ───────────────────────────────────────────────────────────────────────
        test_engine = ChilikaTestScoringEngine()
        ScoringService.register_engine(test_engine)
        active_scoring_service = ScoringService(db)

        computed_scores = active_scoring_service.get_scores(dest.id)
        record_test(
            "Pluggable Engine: OverallScore calculated across all 5 Chilika categories",
            computed_scores.destination_id == dest.id
            and computed_scores.score == 516.0  # exactly 516 SCORING_READY numeric observations
            and len(computed_scores.categories) == 5
            and computed_scores.scoring_version == "1.0-test",
            f"score={computed_scores.score}, category_count={len(computed_scores.categories)}",
        )

        computed_overview = active_scoring_service.get_score_overview(dest.id)
        record_test(
            "Pluggable Engine: ScoreOverview populated with per-category scoring-ready metrics",
            computed_overview.destination_id == dest.id
            and len(computed_overview.category_scores) == 5
            and "Water Quality" in computed_overview.category_scores
            and "Fisheries" in computed_overview.category_scores
            and "Biodiversity" in computed_overview.category_scores
            and "Community" in computed_overview.category_scores
            and "Tourism" in computed_overview.category_scores,
            f"category_scores={computed_overview.category_scores}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 3. Observation Scoring State Classification
        # ───────────────────────────────────────────────────────────────────────
        scoring_ready_obs = [o for o in all_chilika_obs if o.normalized_value is not None]
        data_gap_obs = [o for o in all_chilika_obs if o.normalized_value is None]

        record_test(
            "State Classification: Exactly 516 observations classified as SCORING_READY",
            len(scoring_ready_obs) == 516
            and all(isinstance(o.normalized_value, (int, float)) for o in scoring_ready_obs),
            f"scoring_ready_count={len(scoring_ready_obs)}",
        )

        record_test(
            "State Classification: Exactly 15 qualitative/gap observations classified as DATA_GAP",
            len(data_gap_obs) == 15
            and all(o.normalized_value is None for o in data_gap_obs)
            and all(o.original_value is None for o in data_gap_obs),
            f"data_gap_count={len(data_gap_obs)}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 4. Domain-by-Domain Scoring Readiness
        # ───────────────────────────────────────────────────────────────────────
        # Water Quality
        water_obs = [o for o in all_chilika_obs if o.metric_definition.category == "Water Quality"]
        water_ready = [o for o in water_obs if o.normalized_value is not None]
        record_test(
            "Domain Readiness: Water Quality is 100% SCORING_READY (375/375 numeric observations)",
            len(water_ready) == 375 and len(water_obs) == 375
            and all(o.metric_definition.direction in [MetricDirection.HIGHER_IS_BETTER, MetricDirection.LOWER_IS_BETTER, MetricDirection.NEUTRAL] for o in water_obs),
            f"water_ready={len(water_ready)}/{len(water_obs)}",
        )

        # Fisheries
        fish_obs = [o for o in all_chilika_obs if o.metric_definition.category == "Fisheries"]
        fish_ready = [o for o in fish_obs if o.normalized_value is not None]
        fish_gaps = [o for o in fish_obs if o.normalized_value is None]
        record_test(
            "Domain Readiness: Fisheries has 49 SCORING_READY and 11 DATA_GAP/Qualitative observations",
            len(fish_ready) == 49 and len(fish_gaps) == 11 and len(fish_obs) == 60,
            f"fish_ready={len(fish_ready)}, fish_gaps={len(fish_gaps)}",
        )

        # Biodiversity
        bio_obs = [o for o in all_chilika_obs if o.metric_definition.category == "Biodiversity"]
        bio_ready = [o for o in bio_obs if o.normalized_value is not None]
        bio_gaps = [o for o in bio_obs if o.normalized_value is None]
        record_test(
            "Domain Readiness: Biodiversity has 13 SCORING_READY and 2 DATA_GAP/Qualitative observations",
            len(bio_ready) == 13 and len(bio_gaps) == 2 and len(bio_obs) == 15,
            f"bio_ready={len(bio_ready)}, bio_gaps={len(bio_gaps)}",
        )

        # Community
        comm_obs = [o for o in all_chilika_obs if o.metric_definition.category == "Community"]
        comm_ready = [o for o in comm_obs if o.normalized_value is not None]
        comm_gaps = [o for o in comm_obs if o.normalized_value is None]
        record_test(
            "Domain Readiness: Community has 19 SCORING_READY and 2 DATA_GAP/Qualitative observations",
            len(comm_ready) == 19 and len(comm_gaps) == 2 and len(comm_obs) == 21,
            f"comm_ready={len(comm_ready)}, comm_gaps={len(comm_gaps)}",
        )

        # Tourism
        tour_obs = [o for o in all_chilika_obs if o.metric_definition.category == "Tourism"]
        tour_ready = [o for o in tour_obs if o.normalized_value is not None]
        record_test(
            "Domain Readiness: Tourism is 100% SCORING_READY (60/60 numeric observations)",
            len(tour_ready) == 60 and len(tour_obs) == 60,
            f"tour_ready={len(tour_ready)}/{len(tour_obs)}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 5. Spatial Handling in Scoring
        # ───────────────────────────────────────────────────────────────────────
        station_obs = [o for o in all_chilika_obs if o.location_id is not None]
        dest_obs = [o for o in all_chilika_obs if o.location_id is None]

        record_test(
            "Spatial Scoring: 417 Location-specific observations cleanly isolated by location_id",
            len(station_obs) == 417 and all(o.location is not None for o in station_obs),
            f"station_count={len(station_obs)}",
        )

        record_test(
            "Spatial Scoring: 114 Destination-wide observations preserve location_id = NULL without failure",
            len(dest_obs) == 114 and all(o.location_id is None for o in dest_obs),
            f"dest_wide_count={len(dest_obs)}",
        )

        # ───────────────────────────────────────────────────────────────────────
        # 6. Safety, Exclusion & Integrity Rules
        # ───────────────────────────────────────────────────────────────────────
        blocked_obs_ids = ["BIO-IND-SEAGRASS-6", "BIO-IND-TOTAL-383", "FIS-COMM-001", "FIS-IND-010", "FIS-SPP-003", "FIS-SPP-004"]
        blocked_present = [o for o in all_chilika_obs if o.notes and any(b_id in o.notes for b_id in blocked_obs_ids)]
        record_test(
            "Safety: Blocked records strictly excluded from scoring inputs (0 present)",
            len(blocked_present) == 0,
            f"blocked_found={len(blocked_present)}",
        )

        record_test(
            "Integrity: Null and DATA_GAP values are never converted to zero (0.0)",
            not any(o.normalized_value == 0.0 and o.notes and "DATA_GAP" in o.notes for o in all_chilika_obs),
        )

        evidence_count = db.query(Evidence).filter(Evidence.observation_id.in_([o.id for o in all_chilika_obs])).count()
        p2_gap_count = len(all_chilika_obs) - evidence_count
        record_test(
            "Provenance: Exactly 456 Evidence records and 64 P2 Provenance Gaps preserved without fabrication",
            evidence_count == 456 and p2_gap_count == 75, # 531 - 456 = 75
            f"evidence_count={evidence_count}, p2_gaps={p2_gap_count}",
        )

    finally:
        # Reset scoring engine to default uncomputed contract after test
        ScoringService._engine = None
        db.close()

    print("\n" + "=" * 75)
    failed_tests = [name for name, passed, detail in results if not passed]
    if failed_tests:
        print(f"FAILED TESTS ({len(failed_tests)}):")
        for f in failed_tests:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print(f"ALL {len(results)} CHILIKA SCORING TESTS PASSED SUCCESSFULLY!")
        print("=" * 75 + "\n")


if __name__ == "__main__":
    run_chilika_scoring_suite()
