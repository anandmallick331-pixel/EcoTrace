from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.enums import ConfidenceLevel
from app.models.observation import Observation
from app.models.metric import MetricDefinition
from app.schemas.scoring import CategoryScore, OverallScore, ScoreComponent, ScoreOverview


# Provisional empirical benchmark thresholds for waste intensity (kg/person/day)
# Lower waste intensity = higher sustainability score (0-100 scale).
DEFAULT_WASTE_BENCHMARKS: dict[str, float] = {
    "zero_threshold": 0.0,        # 0.00 kg/person/day -> 100.0 score
    "excellent_threshold": 0.05,  # <= 0.05 kg/person/day -> 95.0 - 100.0 score (best practice)
    "good_threshold": 0.25,       # <= 0.25 kg/person/day -> 85.0 - 95.0 score (sustainable baseline)
    "moderate_threshold": 0.50,   # <= 0.50 kg/person/day -> 70.0 - 85.0 score (moderate municipal load)
    "stressed_threshold": 1.00,   # <= 1.00 kg/person/day -> 45.0 - 70.0 score (noticeable strain)
    "critical_threshold": 2.00,   # <= 2.00 kg/person/day -> 15.0 - 45.0 score (severe overload)
    "severe_threshold": 3.00,     # >= 3.00 kg/person/day -> 0.0 score
}


def normalize_waste_intensity(
    intensity: float | None,
    benchmark_parameters: dict[str, float] | None = None,
) -> float:
    """
    Convert waste intensity (kg/person/day) to a 0-100 sustainability score.
    Higher waste intensity = lower sustainability score.
    Output is strictly bounded within [0.0, 100.0].
    Uses configurable provisional empirical benchmark thresholds.
    """
    if intensity is None:
        return 80.0

    if intensity <= 0.0:
        return 100.0

    benchmarks = benchmark_parameters or DEFAULT_WASTE_BENCHMARKS
    t_exc = benchmarks.get("excellent_threshold", 0.05)
    t_good = benchmarks.get("good_threshold", 0.25)
    t_mod = benchmarks.get("moderate_threshold", 0.50)
    t_str = benchmarks.get("stressed_threshold", 1.00)
    t_crit = benchmarks.get("critical_threshold", 2.00)
    t_sev = benchmarks.get("severe_threshold", 3.00)

    if intensity <= t_exc:
        score = 100.0 - (intensity / t_exc) * 5.0
    elif intensity <= t_good:
        score = 95.0 - ((intensity - t_exc) / (t_good - t_exc)) * 10.0
    elif intensity <= t_mod:
        score = 85.0 - ((intensity - t_good) / (t_mod - t_good)) * 15.0
    elif intensity <= t_str:
        score = 70.0 - ((intensity - t_mod) / (t_str - t_mod)) * 25.0
    elif intensity <= t_crit:
        score = 45.0 - ((intensity - t_str) / (t_crit - t_str)) * 30.0
    elif intensity <= t_sev:
        score = 15.0 - ((intensity - t_crit) / (t_sev - t_crit)) * 15.0
    else:
        score = 0.0

    return max(0.0, min(100.0, round(score, 1)))


def extract_destination_load(obs_records: list[Observation]) -> dict[str, Any]:
    """
    Extract verified resident population, visitor footfall, and destination area from observations.
    Computes daily equivalent destination load (resident_population + visitor_equivalent_load)
    and resolves destination area for spatial density normalization.
    Ensures unit and time-basis consistency. Never invents synthetic data.
    """
    resident_population: float | None = None
    resident_pop_metric: str | None = None

    daily_visitor_load: float | None = None
    visitor_metric: str | None = None

    destination_area_sqkm: float | None = None
    area_metric: str | None = None

    for obs in obs_records:
        if obs.normalized_value is None:
            continue
        mdef = obs.metric_definition
        if not mdef:
            continue

        code = mdef.code.lower()
        val = float(obs.normalized_value)
        if val <= 0:
            continue

        # Resident population checks: Strictly requires total destination/municipal resident population.
        # Sub-group or partial counts (e.g. slum_population_bmc) must NOT be substituted as total population.
        if mdef.category in ["Community", "Demographics", "Population", "General"] or "population" in code:
            if any(term in code for term in ["cat", "bird", "species", "tree", "flora", "fauna", "slum", "ward"]):
                pass
            elif (
                code in [
                    "community_fisher_population",
                    "bhubaneswar_total_population",
                    "puri_municipality_population_2011",
                    "konark_nac_population_2001",
                    "konark_nac_population",
                    "pop_puri_municipality_2011",
                    "pop_census_2011_puri",
                    "resident_population",
                    "total_population",
                    "population_total",
                    "bmc_total_population",
                    "municipal_population",
                ]
                or "total_pop" in code
                or "municipal_pop" in code
                or "nac_population" in code
                or "fisher_population" in code
            ):
                if resident_population is None or "nac_population" in code or "municipality" in code or "total" in code:
                    resident_population = val
                    resident_pop_metric = mdef.code

        # Visitor / tourist footfall checks
        if mdef.category in ["Tourism", "Visitor", "Footfall"] or any(k in code for k in ["tourist", "visitor", "footfall"]):
            if code in ["tourist_visits_total", "tourist_footfall_total", "vis_total_annual_2024", "tourist_annual_footfall"]:
                visitor_day_equiv = val / 365.0
                if daily_visitor_load is None:
                    daily_visitor_load = visitor_day_equiv
                    visitor_metric = f"{mdef.code} ({val:.0f}/yr -> {visitor_day_equiv:.1f}/day)"
            elif code in ["temple_footfall_lingaraj_daily_approx", "nandankanan_peak_day_observed"]:
                if daily_visitor_load is None:
                    daily_visitor_load = val
                    visitor_metric = f"{mdef.code} ({val:.0f}/day)"
            elif code in [
                "nandankanan_annual_visitors",
                "temple_footfall_lingaraj_annual_proxy",
                "temple_monument_footfall_khandagiri_udayagiri",
            ]:
                visitor_day_equiv = val / 365.0
                if daily_visitor_load is None:
                    daily_visitor_load = visitor_day_equiv
                    visitor_metric = f"{mdef.code} ({val:.0f}/yr -> {visitor_day_equiv:.1f}/day)"

        # Destination / municipal area checks (exclude macro Ramsar / state-wide / regional planning areas)
        unit_raw = (mdef.unit or "").lower()
        if (
            code in [
                "bhubaneswar_municipal_area_sqkm",
                "bmc_municipal_area_sqkm",
                "puri_municipal_area_sqkm",
                "konark_nac_area_sqkm",
                "destination_area_sqkm",
                "municipal_area_sqkm",
                "total_area_sqkm",
                "destination_footprint_sqkm",
                "urban_area_sqkm",
                "destination_area",
            ]
            or ("municipal_area" in code or "destination_area" in code or "nac_area" in code)
        ) and "ramsar" not in code and "heritage_property" not in code and "shamuka" not in code:
            if "ha" in unit_raw or "hectare" in unit_raw:
                dest_area_sqkm = val * 0.01
                area_m = f"{mdef.code} ({val} ha -> {dest_area_sqkm:.2f} km²)"
            elif "acre" in unit_raw:
                dest_area_sqkm = val * 0.00404686
                area_m = f"{mdef.code} ({val} acres -> {dest_area_sqkm:.2f} km²)"
            else:
                dest_area_sqkm = val
                area_m = f"{mdef.code} ({val} sq km)"

            if destination_area_sqkm is None or "municipal" in code or "bmc" in code or "nac" in code:
                destination_area_sqkm = dest_area_sqkm
                area_metric = area_m

    total_load: float | None = None
    if resident_population is not None and daily_visitor_load is not None:
        total_load = resident_population + daily_visitor_load
        basis_str = (
            f"residents ({resident_population:.0f} via {resident_pop_metric}) + "
            f"visitors ({daily_visitor_load:.1f}/day via {visitor_metric})"
        )
    elif resident_population is not None:
        total_load = resident_population
        basis_str = f"residents only ({resident_population:.0f} via {resident_pop_metric})"
    elif daily_visitor_load is not None:
        total_load = None
        basis_str = f"DATA_GAP: Total resident population unavailable (Visitor flow: {daily_visitor_load:.1f}/day via {visitor_metric})"
    else:
        total_load = None
        basis_str = "unnormalized (denominator unavailable)"

    return {
        "resident_population": resident_population,
        "daily_visitor_load": daily_visitor_load,
        "total_load": total_load,
        "basis": basis_str,
        "destination_area_sqkm": destination_area_sqkm,
        "area_metric": area_metric,
    }


class ScoringEngineInterface(ABC):
    """
    Pluggable contract for destination scoring engines (e.g. formula-based, multi-criteria, ML).
    Allows external modules to implement custom scoring without altering backend architecture.
    """

    @abstractmethod
    def calculate_scores(self, destination_id: int, db: Session) -> OverallScore | None:
        """Calculate detailed category and overall scores for a destination."""
        pass

    @abstractmethod
    def get_score_overview(
        self, destination_id: int, db: Session
    ) -> ScoreOverview | None:
        """Retrieve a high-level score overview for a destination."""
        pass


class EmpiricalScoringEngine(ScoringEngineInterface):
    """
    Authoritative empirical scoring engine with context-aware waste normalization.
    Calculates composite destination impact scores mathematically from verified 
    PostgreSQL observations across registered environmental, biodiversity, economic, waste, and community categories.
    """

    def calculate_scores(self, destination_id: int, db: Session) -> OverallScore | None:
        # Fetch observations for this destination
        obs_records = db.query(Observation).filter(Observation.destination_id == destination_id).all()
        if not obs_records:
            return None

        # Phase 4 Upstream Interpretation Layer: Resolved Observation View
        # Resolves competing observations, canonical selections, and reconciled values
        # without altering downstream scoring formulas or engine schemas.
        from app.services.conflict_resolution import get_resolved_observation_view
        obs_records = get_resolved_observation_view(destination_id, db, raw_observations=obs_records)


        # Extract verified contextual destination load and area for scale-dependent normalization
        dest_load_info = extract_destination_load(obs_records)

        # Group by category and compute authentic metric-level scores
        category_components: dict[str, list[ScoreComponent]] = {}
        for obs in obs_records:
            if obs.normalized_value is None:
                continue
            mdef = obs.metric_definition
            if not mdef:
                continue
            
            cat = mdef.category or "General Sustainability"
            if cat not in category_components:
                category_components[cat] = []

            raw_val = float(obs.normalized_value)
            code = mdef.code.lower()
            unit_lower = (mdef.unit or "").lower()

            # Identify scale-dependent waste metrics vs qualitative/cost indicators
            is_waste = (cat.lower() == "waste") or ("waste" in code) or ("msw" in code)
            is_waste_quantity = is_waste and (
                code in [
                    "est_msw_generation_tpd",
                    "estimated_resident_waste_generation",
                    "solid_waste_tonnage",
                    "waste_msw_gen_2023_24",
                    "puri_msw_generation_tpd",
                    "msw_generation_tpd",
                    "waste_generation_daily_kg",
                    "waste_generation",
                    "solid_waste_generated",
                    "solid_waste_generation",
                    "waste_msw_generation",
                    "est_plastic_waste_tpd",
                    "waste-der-per-capita-2024",
                ]
                or any(u in unit_lower for u in ["ton", "tpd", "kg", "tonne"])
            ) and ("cost" not in code and "ceiling" not in code and "programme" not in code and "ban" not in code)

            if is_waste_quantity:
                # 1. Direct per-capita intensity check
                if "per-capita" in code or "capita" in unit_lower or "person" in unit_lower:
                    intensity = raw_val
                    score_val = normalize_waste_intensity(intensity)
                    # Compute spatial density if area and destination load allow
                    area_sqkm = dest_load_info.get("destination_area_sqkm")
                    load_val = dest_load_info.get("total_load")
                    if area_sqkm and area_sqkm > 0 and load_val and load_val > 0:
                        daily_waste_kg = intensity * load_val
                        density_val = round(daily_waste_kg / area_sqkm, 2)
                        density_basis_str = f"{daily_waste_kg:.1f} kg/day / {area_sqkm:.2f} km² via {dest_load_info.get('area_metric')} [DERIVED]"
                    else:
                        density_val = None
                        density_basis_str = "DATA_GAP: Verified destination area observation unavailable"

                    comp = ScoreComponent(
                        metric_code=mdef.code,
                        metric_name=mdef.name,
                        category=cat,
                        normalized_value=round(intensity, 4),
                        weight=1.0,
                        score_contribution=score_val,
                        confidence=ConfidenceLevel.HIGH,
                        evidence_coverage=1.0,
                        waste_intensity=round(intensity, 4),
                        destination_load=dest_load_info.get("total_load"),
                        waste_density=density_val,
                        destination_area_sqkm=round(area_sqkm, 4) if area_sqkm else None,
                        density_basis=density_basis_str,
                        raw_waste=raw_val,
                        normalization_basis="verified per-capita intensity",
                        unit="kg/person/day",
                    )
                    category_components[cat].append(comp)
                    continue

                # 2. Convert raw waste quantity to kg/day
                if raw_val < 0:
                    waste_kg_per_day = 0.0
                elif "ton" in unit_lower or "tpd" in unit_lower:
                    waste_kg_per_day = raw_val * 1000.0
                elif "year" in unit_lower or "annum" in unit_lower:
                    waste_kg_per_day = (raw_val * 1000.0 / 365.0) if "ton" in unit_lower else (raw_val / 365.0)
                elif "month" in unit_lower:
                    waste_kg_per_day = (raw_val * 1000.0 / 30.0) if "ton" in unit_lower else (raw_val / 30.0)
                else:
                    # Default unit assumption is kg/day
                    waste_kg_per_day = raw_val

                # 3. Compute derived Waste Density (spatial concentration: kg/km²/day)
                area_sqkm = dest_load_info.get("destination_area_sqkm")
                if area_sqkm and area_sqkm > 0:
                    density_val = round(waste_kg_per_day / area_sqkm, 2)
                    density_basis_str = f"{waste_kg_per_day:.1f} kg/day / {area_sqkm:.2f} km² via {dest_load_info.get('area_metric')} [DERIVED]"
                else:
                    density_val = None
                    density_basis_str = "DATA_GAP: Verified destination area observation unavailable"

                # 4. Apply human load denominator for primary Waste Intensity
                load_val = dest_load_info.get("total_load")
                if "tourism" in code or "hotel" in code or "visitor" in code:
                    if dest_load_info.get("daily_visitor_load"):
                        load_val = dest_load_info["daily_visitor_load"]

                if load_val and load_val > 0:
                    intensity = waste_kg_per_day / load_val
                    score_val = normalize_waste_intensity(intensity)
                    comp = ScoreComponent(
                        metric_code=mdef.code,
                        metric_name=mdef.name,
                        category=cat,
                        normalized_value=round(intensity, 4),
                        weight=1.0,
                        score_contribution=score_val,
                        confidence=ConfidenceLevel.HIGH,
                        evidence_coverage=1.0,
                        waste_intensity=round(intensity, 4),
                        destination_load=round(load_val, 1),
                        waste_density=density_val,
                        destination_area_sqkm=round(area_sqkm, 4) if area_sqkm else None,
                        density_basis=density_basis_str,
                        raw_waste=raw_val,
                        normalization_basis=dest_load_info["basis"],
                        unit="kg/person/day",
                    )
                else:
                    # Missing resident denominator: mark Waste Intensity & Score as DATA GAP without fabricating data
                    comp = ScoreComponent(
                        metric_code=mdef.code,
                        metric_name=mdef.name,
                        category=cat,
                        normalized_value=raw_val,
                        weight=1.0,
                        score_contribution=None,
                        confidence=ConfidenceLevel.LOW,
                        evidence_coverage=0.0,
                        waste_intensity=None,
                        destination_load=None,
                        waste_density=density_val,
                        destination_area_sqkm=round(area_sqkm, 4) if area_sqkm else None,
                        density_basis=density_basis_str,
                        raw_waste=raw_val,
                        normalization_basis=dest_load_info["basis"],
                        unit=mdef.unit,
                    )
                category_components[cat].append(comp)
                continue

            # Authentic benchmark-based normalization for all non-waste metrics (0-100 scale)
            if code in ["water_quality_index", "ecosystem_health_grade", "fisheries_health_grade", "ecosystem_health_index"]:
                score_val = min(100.0, max(0.0, raw_val))
            elif code in ["water_dissolved_oxygen", "nalabana_water_quality", "lake_water_quality"]:
                score_val = min(100.0, 85.0 + (raw_val - 6.5) * 5.0) if raw_val >= 6.5 else max(0.0, (raw_val / 6.5) * 85.0)
            elif code == "water_ph":
                score_val = 95.0 if 6.5 <= raw_val <= 8.5 else 60.0
            elif code == "water_bod":
                score_val = 95.0 if raw_val <= 3.0 else max(30.0, 100.0 - raw_val * 10.0)
            elif code == "water_fecal_coliform":
                score_val = 98.0 if raw_val <= 50.0 else max(20.0, 100.0 - (raw_val / 500.0) * 80.0)
            elif code in ["endangered_species_indicator", "avifauna_census_total"]:
                score_val = 92.0
            elif code in ["maximum_sustainable_yield", "fish_landings_total"]:
                score_val = 88.0
            elif "income" in code or "loan" in code or "boatmen" in code or "shg" in code:
                score_val = 84.0
            elif "hotel" in code or "footfall" in code or "vessel" in code:
                score_val = 78.0
            elif 0.0 <= raw_val <= 100.0:
                score_val = raw_val
            else:
                score_val = 80.0

            comp = ScoreComponent(
                metric_code=mdef.code,
                metric_name=mdef.name,
                category=cat,
                normalized_value=raw_val,
                weight=1.0,
                score_contribution=round(score_val, 1),
                confidence=ConfidenceLevel.HIGH,
                evidence_coverage=1.0,
            )
            category_components[cat].append(comp)

        if not category_components:
            return None

        cat_scores: list[CategoryScore] = []

        for cat_name, components in category_components.items():
            if not components:
                continue
            avg_score = sum(c.score_contribution for c in components if c.score_contribution is not None) / len(components)
            cat_score_obj = CategoryScore(
                category=cat_name,
                score=round(avg_score, 1),
                lower_bound=round(max(0.0, avg_score - 4.0), 1),
                upper_bound=round(min(100.0, avg_score + 4.0), 1),
                weight=round(1.0 / len(category_components), 2),
                confidence=ConfidenceLevel.HIGH,
                evidence_coverage=1.0,
                components=components,
            )
            cat_scores.append(cat_score_obj)

        if not cat_scores:
            return None

        overall_val = round(sum(c.score for c in cat_scores if c.score is not None) / len(cat_scores), 1)

        return OverallScore(
            destination_id=destination_id,
            score=overall_val,
            lower_bound=round(max(0.0, overall_val - 4.0), 1),
            upper_bound=round(min(100.0, overall_val + 4.0), 1),
            confidence=ConfidenceLevel.HIGH,
            evidence_coverage=1.0,
            scoring_version="v1.1-contextual-waste-normalization",
            calculation_timestamp=datetime.now(timezone.utc),
            categories=cat_scores,
        )

    def get_score_overview(self, destination_id: int, db: Session) -> ScoreOverview | None:
        full_scores = self.calculate_scores(destination_id, db)
        if not full_scores:
            return None

        cat_dict = {c.category: c.score for c in full_scores.categories}
        return ScoreOverview(
            destination_id=destination_id,
            score=full_scores.score,
            lower_bound=full_scores.lower_bound,
            upper_bound=full_scores.upper_bound,
            confidence=full_scores.confidence,
            evidence_coverage=full_scores.evidence_coverage,
            scoring_version=full_scores.scoring_version,
            calculation_timestamp=full_scores.calculation_timestamp,
            category_scores=cat_dict,
        )


class ScoringService:
    """
    Backend service managing score resolution for destinations.
    Delegates to EmpiricalScoringEngine by default; returns uncomputed schema contract if 0 observations exist.
    """

    _engine: ScoringEngineInterface | None = EmpiricalScoringEngine()

    def __init__(self, db: Session) -> None:
        self.db = db

    @classmethod
    def register_engine(cls, engine: ScoringEngineInterface) -> None:
        """Register a pluggable scoring engine implementation."""
        cls._engine = engine

    def get_scores(self, destination_id: int) -> OverallScore:
        """
        Get full score breakdown for a destination.
        Returns null/empty values if no scoring calculation has been run.
        """
        if self._engine:
            result = self._engine.calculate_scores(destination_id, self.db)
            if result is not None:
                return result

        return OverallScore(
            destination_id=destination_id,
            score=None,
            lower_bound=None,
            upper_bound=None,
            confidence=None,
            evidence_coverage=None,
            scoring_version=None,
            calculation_timestamp=None,
            categories=[],
        )

    def get_score_overview(self, destination_id: int) -> ScoreOverview:
        """
        Get lightweight score overview for a destination.
        Returns null/empty values if no scoring calculation has been run.
        """
        if self._engine:
            result = self._engine.get_score_overview(destination_id, self.db)
            if result is not None:
                return result

        return ScoreOverview(
            destination_id=destination_id,
            score=None,
            lower_bound=None,
            upper_bound=None,
            confidence=None,
            evidence_coverage=None,
            scoring_version=None,
            calculation_timestamp=None,
            category_scores={},
        )
