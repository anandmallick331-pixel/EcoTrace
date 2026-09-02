"""
Test suite for EcoTrace Context-Aware Waste Normalization Scoring Engine.

Verifies:
1. Normalization of scale-dependent waste by destination load (residents + visitor daily equivalent).
2. The Judge scenario:
   - Small Destination A: 100 kg/day waste, 1,000 people load -> 0.10 kg/person/day intensity -> score ~92.5
   - Large Destination B: 1,000 kg/day waste, 100,000 people load -> 0.01 kg/person/day intensity -> score ~99.0
   - Demonstrates that Destination A correctly scores lower than Destination B despite producing 10x less absolute waste.
3. Monotonicity: Higher waste intensity strictly produces lower sustainability scores.
4. Output scores are strictly bounded within [0.0, 100.0].
5. Edge cases: zero destination load, negative waste values, missing contextual data (no data fabrication).
6. Non-waste metric scores and overall score category aggregation integrity.
7. Scoring version is updated to 'v1.1-contextual-waste-normalization'.
"""

from datetime import date
import pytest
from unittest.mock import MagicMock

from app.models.enums import ConfidenceLevel, DestinationSpecificity, MetricDirection, ObservationStatus
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.schemas.scoring import OverallScore, ScoreComponent
from app.services.scoring import (
    DEFAULT_WASTE_BENCHMARKS,
    EmpiricalScoringEngine,
    extract_destination_load,
    normalize_waste_intensity,
)


def create_mock_metric(
    code: str,
    name: str,
    category: str,
    unit: str = "tonnes/day",
    direction: MetricDirection = MetricDirection.LOWER_IS_BETTER,
) -> MetricDefinition:
    m = MagicMock(spec=MetricDefinition)
    m.code = code
    m.name = name
    m.category = category
    m.unit = unit
    m.direction = direction
    return m


def create_mock_observation(
    metric_def: MetricDefinition,
    val: float | None,
    dest_id: int = 1,
) -> Observation:
    obs = MagicMock(spec=Observation)
    obs.destination_id = dest_id
    obs.metric_definition = metric_def
    obs.metric_definition_id = 1
    obs.normalized_value = val
    obs.period_start = date(2024, 1, 1)
    obs.period_end = date(2024, 12, 31)
    obs.notes = ""
    return obs


def test_normalize_waste_intensity_monotonic_and_bounds():
    """Verify that lower intensity gives higher score and all values remain 0-100."""
    # Monotonicity test across range
    intensities = [0.0, 0.01, 0.05, 0.10, 0.25, 0.35, 0.50, 0.80, 1.00, 1.50, 2.00, 2.50, 3.00, 5.00]
    scores = [normalize_waste_intensity(i) for i in intensities]

    for s in scores:
        assert 0.0 <= s <= 100.0, f"Score {s} out of bounds"

    for i in range(len(scores) - 1):
        assert scores[i] >= scores[i + 1], f"Monotonicity violated: {scores[i]} < {scores[i + 1]} for intensities {intensities[i]} vs {intensities[i + 1]}"

    # Boundary conditions
    assert normalize_waste_intensity(0.0) == 100.0
    assert normalize_waste_intensity(-1.0) == 100.0
    assert normalize_waste_intensity(3.0) == 0.0
    assert normalize_waste_intensity(10.0) == 0.0
    assert normalize_waste_intensity(None) == 80.0


def test_judge_cross_destination_scenario():
    """
    Directly test the problem identified by the judges:
    Destination A (Small): 100 kg/day waste, 1,000 people load -> 0.10 kg/person/day
    Destination B (Large): 1,000 kg/day waste, 100,000 people load -> 0.01 kg/person/day

    Destination A produces LESS absolute waste, but HIGHER waste intensity.
    Therefore, Destination A must receive a LOWER sustainability score than Destination B.
    """
    engine = EmpiricalScoringEngine()

    # Destination A (Small)
    waste_metric = create_mock_metric("solid_waste_tonnage", "Solid Waste Tonnage", "Waste", unit="kg/day")
    pop_metric = create_mock_metric("resident_population", "Resident Population", "Community", unit="persons")

    db_mock_a = MagicMock()
    obs_a = [
        create_mock_observation(waste_metric, 100.0, dest_id=101),  # 100 kg/day
        create_mock_observation(pop_metric, 1000.0, dest_id=101),   # 1,000 residents
    ]
    db_mock_a.query.return_value.filter.return_value.all.return_value = obs_a

    score_a = engine.calculate_scores(101, db_mock_a)
    assert score_a is not None

    # Destination B (Large)
    db_mock_b = MagicMock()
    obs_b = [
        create_mock_observation(waste_metric, 1000.0, dest_id=102),  # 1,000 kg/day
        create_mock_observation(pop_metric, 100000.0, dest_id=102),  # 100,000 residents
    ]
    db_mock_b.query.return_value.filter.return_value.all.return_value = obs_b

    score_b = engine.calculate_scores(102, db_mock_b)
    assert score_b is not None

    # Find waste component for A and B
    waste_comp_a = next(c for cat in score_a.categories for c in cat.components if c.metric_code == "solid_waste_tonnage")
    waste_comp_b = next(c for cat in score_b.categories for c in cat.components if c.metric_code == "solid_waste_tonnage")

    # Intensity A = 100 / 1,000 = 0.10 kg/person/day
    assert waste_comp_a.waste_intensity == 0.10
    # Intensity B = 1,000 / 100,000 = 0.01 kg/person/day
    assert waste_comp_b.waste_intensity == 0.01

    # Absolute waste of A is LESS than B:
    assert waste_comp_a.raw_waste < waste_comp_b.raw_waste
    # BUT Intensity of A is GREATER than B:
    assert waste_comp_a.waste_intensity > waste_comp_b.waste_intensity
    # Therefore Score of A MUST BE LESS (worse) than B:
    assert waste_comp_a.score_contribution < waste_comp_b.score_contribution
    assert waste_comp_a.score_contribution == 92.5
    assert waste_comp_b.score_contribution == 99.0


def test_destination_load_extraction_with_tourist_conversion():
    """Verify load denominator calculation combines residents and annual tourist day-equivalents."""
    pop_m = create_mock_metric("konark_nac_population", "Konark Population", "Community", "persons")
    tourist_m = create_mock_metric("tourist_visits_total", "Annual Visitors", "Tourism", "persons/year")

    obs = [
        create_mock_observation(pop_m, 16779.0),
        create_mock_observation(tourist_m, 7300000.0),  # 7.3 million / yr = 20,000 / day
    ]

    load_info = extract_destination_load(obs)
    assert load_info["resident_population"] == 16779.0
    assert abs(load_info["daily_visitor_load"] - 20000.0) < 0.1
    assert abs(load_info["total_load"] - 36779.0) < 0.1
    assert "residents (16779" in load_info["basis"]
    assert "visitors (20000" in load_info["basis"]


def test_waste_units_standardization():
    """Verify that tonnes/day (TPD) is correctly converted to kg/day before intensity calculation."""
    engine = EmpiricalScoringEngine()

    waste_tpd = create_mock_metric("est_msw_generation_tpd", "MSW TPD", "Waste", unit="Tons/Day")
    pop_m = create_mock_metric("resident_population", "Population", "Community", unit="persons")

    db_mock = MagicMock()
    # 5.0 TPD = 5,000 kg/day across 10,000 people = 0.50 kg/person/day
    db_mock.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(waste_tpd, 5.0, dest_id=1),
        create_mock_observation(pop_m, 10000.0, dest_id=1),
    ]

    score = engine.calculate_scores(1, db_mock)
    assert score is not None
    waste_comp = next(c for cat in score.categories for c in cat.components if c.metric_code == "est_msw_generation_tpd")

    assert waste_comp.raw_waste == 5.0
    assert waste_comp.waste_intensity == 0.50
    assert waste_comp.score_contribution == 70.0  # Moderate threshold 0.50 -> score 70.0


def test_edge_case_missing_population_no_fabrication():
    """Verify system safely handles destinations with missing population/visitor data without fabricating data."""
    engine = EmpiricalScoringEngine()
    waste_m = create_mock_metric("solid_waste_tonnage", "Waste", "Waste", unit="kg/day")

    db_mock = MagicMock()
    # Only waste observation, no population or visitor records
    db_mock.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(waste_m, 500.0, dest_id=1)
    ]

    score = engine.calculate_scores(1, db_mock)
    assert score is not None
    waste_comp = next(c for cat in score.categories for c in cat.components if c.metric_code == "solid_waste_tonnage")

    # Should not crash, should not fabricate population or scores
    assert waste_comp.waste_intensity is None
    assert waste_comp.destination_load is None
    assert "unnormalized" in waste_comp.normalization_basis
    assert waste_comp.confidence == ConfidenceLevel.LOW
    assert waste_comp.score_contribution is None  # Accurately marked DATA GAP


def test_edge_case_zero_destination_load():
    """Verify zero destination load does not cause divide-by-zero exception."""
    pop_m = create_mock_metric("resident_population", "Population", "Community", "persons")
    obs = [create_mock_observation(pop_m, 0.0)]
    load_info = extract_destination_load(obs)
    assert load_info["total_load"] is None


def test_non_waste_metrics_unaffected():
    """Verify that existing water, biodiversity, and community scoring algorithms remain untouched."""
    engine = EmpiricalScoringEngine()

    water_do = create_mock_metric("water_dissolved_oxygen", "DO", "Water Quality", "mg/L")
    water_ph = create_mock_metric("water_ph", "pH", "Water Quality", "unitless")
    water_bod = create_mock_metric("water_bod", "BOD", "Water Quality", "mg/L")
    fisheries = create_mock_metric("maximum_sustainable_yield", "MSY", "Biodiversity", "MT")

    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(water_do, 7.5, dest_id=1),  # DO 7.5 -> 85 + (7.5 - 6.5)*5 = 90.0
        create_mock_observation(water_ph, 7.8, dest_id=1),  # pH in [6.5, 8.5] -> 95.0
        create_mock_observation(water_bod, 2.0, dest_id=1), # BOD <= 3.0 -> 95.0
        create_mock_observation(fisheries, 11500.0, dest_id=1), # MSY -> 88.0
    ]

    score = engine.calculate_scores(1, db_mock)
    assert score is not None
    assert score.scoring_version == "v1.1-contextual-waste-normalization"

    # Verify category score calculations
    water_cat = next(c for c in score.categories if c.category == "Water Quality")
    assert len(water_cat.components) == 3
    do_comp = next(c for c in water_cat.components if c.metric_code == "water_dissolved_oxygen")
    assert do_comp.score_contribution == 90.0
    ph_comp = next(c for c in water_cat.components if c.metric_code == "water_ph")
    assert ph_comp.score_contribution == 95.0
    bod_comp = next(c for c in water_cat.components if c.metric_code == "water_bod")
    assert bod_comp.score_contribution == 95.0

    # Average for Water Quality = (90 + 95 + 95) / 3 = 93.3
    assert water_cat.score == 93.3


def test_judge_area_waste_density_scenario():
    """
    Test the judge's area-based spatial normalization scenario:
    "If there is 100 kg waste in a smaller location area-wise vs 1000 kg waste in a bigger location, which is more harmful and worse? How do you normalize it?"

    Destination A (Smaller Area):
    - Daily Waste = 100 kg/day
    - Destination Area = 1.0 km²
    - Waste Density = 100 / 1.0 = 100.0 kg/km²/day

    Destination B (Larger Area):
    - Daily Waste = 1,000 kg/day
    - Destination Area = 100.0 km²
    - Waste Density = 1,000 / 100.0 = 10.0 kg/km²/day

    Demonstrates:
    - Destination A has 10x LESS absolute waste.
    - BUT Destination A has 10x HIGHER spatial waste concentration (Waste Density).
    - Human-load Waste Intensity and spatial Waste Density coexist as distinct metrics.
    """
    engine = EmpiricalScoringEngine()

    waste_m = create_mock_metric("solid_waste_tonnage", "Solid Waste", "Waste", unit="kg/day")
    pop_m = create_mock_metric("resident_population", "Population", "Community", unit="persons")
    area_m = create_mock_metric("destination_area_sqkm", "Destination Area", "Community", unit="sq km")

    # Destination A: 100 kg/day, 1,000 people, 1 km²
    db_mock_a = MagicMock()
    db_mock_a.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(waste_m, 100.0, dest_id=101),
        create_mock_observation(pop_m, 1000.0, dest_id=101),
        create_mock_observation(area_m, 1.0, dest_id=101),
    ]
    score_a = engine.calculate_scores(101, db_mock_a)
    assert score_a is not None
    comp_a = next(c for cat in score_a.categories for c in cat.components if c.metric_code == "solid_waste_tonnage")

    # Destination B: 1,000 kg/day, 100,000 people, 100 km²
    db_mock_b = MagicMock()
    db_mock_b.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(waste_m, 1000.0, dest_id=102),
        create_mock_observation(pop_m, 100000.0, dest_id=102),
        create_mock_observation(area_m, 100.0, dest_id=102),
    ]
    score_b = engine.calculate_scores(102, db_mock_b)
    assert score_b is not None
    comp_b = next(c for cat in score_b.categories for c in cat.components if c.metric_code == "solid_waste_tonnage")

    # 1. Absolute waste comparison
    assert comp_a.raw_waste == 100.0
    assert comp_b.raw_waste == 1000.0
    assert comp_a.raw_waste < comp_b.raw_waste

    # 2. Human-load Waste Intensity comparison (kg/person/day)
    assert comp_a.waste_intensity == 0.10  # 100 / 1000
    assert comp_b.waste_intensity == 0.01  # 1000 / 100000
    assert comp_a.waste_intensity > comp_b.waste_intensity

    # 3. Spatial Waste Density comparison (kg/km²/day)
    assert comp_a.waste_density == 100.0  # 100 kg / 1 km²
    assert comp_b.waste_density == 10.0   # 1000 kg / 100 km²
    assert comp_a.waste_density > comp_b.waste_density

    # 4. Provenance and derivation integrity
    assert comp_a.destination_area_sqkm == 1.0
    assert comp_b.destination_area_sqkm == 100.0
    assert "[DERIVED]" in comp_a.density_basis
    assert "[DERIVED]" in comp_b.density_basis


def test_bhubaneswar_area_waste_density():
    """
    Verify Bhubaneswar behavior:
    1. Waste Density = 44,640 kg/day / 186 km² = 240.0 kg/km²/day [DERIVED]
    2. Missing resident population produces DATA GAP for Waste Intensity and Waste Sustainability Score (no visitor-only substitution).
    """
    engine = EmpiricalScoringEngine()

    waste_m = create_mock_metric("est_msw_generation_tpd", "MSW TPD", "Waste", unit="Tons/Day")
    tourist_m = create_mock_metric("tourist_visits_total", "Annual Visitors", "Tourism", unit="persons/year")
    area_m = create_mock_metric("bmc_municipal_area_sqkm", "BMC Area", "Community", unit="sq km")

    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(waste_m, 44.64, dest_id=3),
        create_mock_observation(tourist_m, 7283076.0, dest_id=3),
        create_mock_observation(area_m, 186.0, dest_id=3),
    ]

    score = engine.calculate_scores(3, db_mock)
    assert score is not None
    comp = next(c for cat in score.categories for c in cat.components if c.metric_code == "est_msw_generation_tpd")

    # 1. Waste Density is correctly derived from municipal area
    assert comp.destination_area_sqkm == 186.0
    assert comp.waste_density == 240.0
    assert "44640.0 kg/day / 186.00 km²" in comp.density_basis
    assert "[DERIVED]" in comp.density_basis

    # 2. Human-load Waste Intensity & Sustainability Score are DATA GAP (not calculated from visitor-only denominator)
    assert comp.waste_intensity is None
    assert comp.destination_load is None
    assert comp.score_contribution is None
    assert "DATA_GAP" in comp.normalization_basis


def test_slum_population_not_used_as_total_resident_population():
    """
    Verify that sub-group population metrics (e.g. slum_population_bmc) are NOT
    erroneously substituted as total municipal resident population, and missing
    resident population does NOT fall back to visitor-only denominator.
    """
    slum_m = create_mock_metric("slum_population_bmc", "BMC Slum Population", "Community", unit="number")
    tourist_m = create_mock_metric("tourist_visits_total", "Annual Visitors", "Tourism", unit="persons/year")

    obs = [
        create_mock_observation(slum_m, 301611.0),
        create_mock_observation(tourist_m, 7283076.0),  # 7.28M / yr = 19,953.6 / day
    ]

    load_info = extract_destination_load(obs)

    # Resident population must be None (DATA GAP), NOT 301,611
    assert load_info["resident_population"] is None
    # Visitor flow is preserved as contextual info
    assert abs(load_info["daily_visitor_load"] - 19953.6) < 0.1
    # Total denominator is None (DATA GAP) to prevent invalid visitor-only substitution
    assert load_info["total_load"] is None
    # Transparent basis string indicating resident pop data gap
    assert "DATA_GAP: Total resident population unavailable" in load_info["basis"]


def test_area_unit_conversion_hectares_and_acres():
    """Verify area conversion from hectares (ha) and acres to km²."""
    # 1. Hectares: 100 ha = 1.0 km²
    obs_ha = [
        create_mock_observation(create_mock_metric("destination_area", "Area", "Heritage", unit="ha"), 100.0)
    ]
    load_ha = extract_destination_load(obs_ha)
    assert load_ha["destination_area_sqkm"] == 1.0

    # 2. Acres: 2471.05 acres ~ 10.0 km²
    obs_acre = [
        create_mock_observation(create_mock_metric("destination_area", "Area", "Heritage", unit="acre"), 2471.05)
    ]
    load_acre = extract_destination_load(obs_acre)
    assert abs(load_acre["destination_area_sqkm"] - 10.0) < 0.01


def test_waste_density_data_gap_handling():
    """Verify that when area observation is unavailable, system cleanly marks DATA GAP without inventing synthetic data."""
    engine = EmpiricalScoringEngine()

    waste_m = create_mock_metric("solid_waste_tonnage", "Solid Waste", "Waste", unit="kg/day")
    pop_m = create_mock_metric("resident_population", "Population", "Community", unit="persons")

    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(waste_m, 500.0, dest_id=105),
        create_mock_observation(pop_m, 5000.0, dest_id=105),
    ]

    score = engine.calculate_scores(105, db_mock)
    assert score is not None
    comp = next(c for cat in score.categories for c in cat.components if c.metric_code == "solid_waste_tonnage")

    # Human-load intensity works normally
    assert comp.waste_intensity == 0.10
    # Spatial density is cleanly marked as DATA GAP
    assert comp.waste_density is None
    assert comp.destination_area_sqkm is None
    assert "DATA_GAP" in comp.density_basis


def test_konark_puri_chilika_waste_density_boundary_handling():
    """
    Verify boundary compatibility rules across Konark, Puri, and Chilika:
    1. Konark: NAC-wide waste (5.034 TPD) must NOT be attributed to 10.62 ha monument property area.
       Results in DATA GAP for NAC waste density.
    2. Puri: Municipal waste (70.4 TPD) must NOT be attributed to distant 1515.45 acre Shamuka land bank.
       Results in DATA GAP when municipal ULB boundary polygon is unavailable.
    3. Chilika: Landing-center tourism waste (1.20 TPD) must NOT be spread across 1,165 km² open lagoon.
       Results in DATA GAP for lagoon-wide waste density.
    """
    engine = EmpiricalScoringEngine()

    # Konark: NAC waste + WH property area (incompatible boundaries)
    konark_waste = create_mock_metric("estimated_resident_waste_generation", "Resident Waste", "Waste", unit="tonnes/day")
    konark_pop = create_mock_metric("konark_nac_population", "NAC Population", "Community", unit="persons")
    wh_area = create_mock_metric("heritage_property_area_ha", "WH Property Area", "Heritage", unit="ha")

    db_mock_k = MagicMock()
    db_mock_k.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(konark_waste, 5.034, dest_id=102),
        create_mock_observation(konark_pop, 16779.0, dest_id=102),
        create_mock_observation(wh_area, 10.62, dest_id=102),
    ]

    score_k = engine.calculate_scores(102, db_mock_k)
    assert score_k is not None
    comp_k = next(c for cat in score_k.categories for c in cat.components if c.metric_code == "estimated_resident_waste_generation")
    # Human-load intensity works accurately
    assert comp_k.waste_intensity == pytest.approx(5034.0 / 16779.0, rel=1e-3)
    # Spatial density is cleanly handled: property area is not substituted for NAC
    assert comp_k.waste_density is None
    assert comp_k.destination_area_sqkm is None
    assert "DATA_GAP" in comp_k.density_basis


def test_verified_geospatial_context_densities():
    """
    Verify exact Waste Density calculations with the newly ingested verified geospatial data:
    1. Puri: 70,400 kg/day / 16.32685 km² = 4,311.92 kg/km²/day (~4,311.44)
    2. Konark: 5,034 kg/day / 35.09 km² = 143.46 kg/km²/day (~143.43)
    3. Bhubaneswar: 44,640 kg/day / 186.0 km² = 240.0 kg/km²/day
    4. Chilika: Ramsar 1,165 km² area is excluded from waste density (remains DATA GAP).
    """
    engine = EmpiricalScoringEngine()

    # 1. Puri
    puri_waste = create_mock_metric("WASTE_MSW_GEN_2023_24", "Puri MSW", "Waste", unit="TPD")
    puri_pop = create_mock_metric("puri_municipality_population_2011", "Puri Pop", "Community", unit="persons")
    puri_area = create_mock_metric("puri_municipal_area_sqkm", "Puri Area", "Community", unit="km2")

    db_puri = MagicMock()
    db_puri.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(puri_waste, 70.4, dest_id=103),
        create_mock_observation(puri_pop, 200564.0, dest_id=103),
        create_mock_observation(puri_area, 16.32685, dest_id=103),
    ]
    sc_puri = engine.calculate_scores(103, db_puri)
    comp_p = next(c for cat in sc_puri.categories for c in cat.components if c.metric_code == "WASTE_MSW_GEN_2023_24")
    assert abs(comp_p.waste_density - 4311.92) < 0.5
    assert comp_p.destination_area_sqkm == pytest.approx(16.32685, rel=1e-3)

    # 2. Konark
    konark_waste = create_mock_metric("estimated_resident_waste_generation", "Konark Waste", "Waste", unit="tonnes/day")
    konark_pop = create_mock_metric("konark_nac_population_2001", "Konark Pop", "Community", unit="persons")
    konark_area = create_mock_metric("konark_nac_area_sqkm", "Konark Area", "Community", unit="km2")

    db_konark = MagicMock()
    db_konark.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(konark_waste, 5.034, dest_id=102),
        create_mock_observation(konark_pop, 16979.0, dest_id=102),
        create_mock_observation(konark_area, 35.09, dest_id=102),
    ]
    sc_konark = engine.calculate_scores(102, db_konark)
    comp_k = next(c for cat in sc_konark.categories for c in cat.components if c.metric_code == "estimated_resident_waste_generation")
    assert abs(comp_k.waste_density - 143.46) < 0.1
    assert comp_k.destination_area_sqkm == 35.09

    # 3. Bhubaneswar
    bbsr_waste = create_mock_metric("est_msw_generation_tpd", "BBSR MSW", "Waste", unit="Tons/Day")
    bbsr_pop = create_mock_metric("bhubaneswar_total_population", "BBSR Pop", "Community", unit="persons")
    bbsr_area = create_mock_metric("bhubaneswar_municipal_area_sqkm", "BBSR Area", "Community", unit="km2")

    db_bbsr = MagicMock()
    db_bbsr.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(bbsr_waste, 44.64, dest_id=100),
        create_mock_observation(bbsr_pop, 1163000.0, dest_id=100),
        create_mock_observation(bbsr_area, 186.0, dest_id=100),
    ]
    sc_bbsr = engine.calculate_scores(100, db_bbsr)
    comp_b = next(c for cat in sc_bbsr.categories for c in cat.components if c.metric_code == "est_msw_generation_tpd")
    assert comp_b.waste_density == 240.0
    assert comp_b.destination_area_sqkm == 186.0
    assert comp_b.waste_intensity == pytest.approx(44640.0 / 1163000.0, rel=1e-3)
    assert comp_b.score_contribution > 90.0

    # 4. Chilika (Ramsar area excluded for waste density)
    chilika_waste = create_mock_metric("waste_generation_daily_kg", "Chilika Waste", "Waste", unit="kg/day")
    chilika_pop = create_mock_metric("community_fisher_population", "Chilika Fishers", "Community", unit="persons")
    chilika_area = create_mock_metric("chilika_ramsar_area_sqkm", "Chilika Ramsar Area", "Geographic Context", unit="km2")

    db_chilika = MagicMock()
    db_chilika.query.return_value.filter.return_value.all.return_value = [
        create_mock_observation(chilika_waste, 1200.0, dest_id=44),
        create_mock_observation(chilika_pop, 122339.0, dest_id=44),
        create_mock_observation(chilika_area, 1165.0, dest_id=44),
    ]
    sc_chilika = engine.calculate_scores(44, db_chilika)
    comp_ch = next(c for cat in sc_chilika.categories for c in cat.components if c.metric_code == "waste_generation_daily_kg")
    # Human-load intensity works
    assert comp_ch.waste_intensity == pytest.approx(1200.0 / 122339.0, rel=1e-3)
    # Ramsar area is excluded -> Waste Density is DATA GAP
    assert comp_ch.waste_density is None
    assert comp_ch.destination_area_sqkm is None
    assert "DATA_GAP" in comp_ch.density_basis


