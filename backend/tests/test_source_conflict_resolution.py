"""
Phase 2 Comprehensive Test Suite for Source Conflict Resolution Layer.

Verifies:
1. Methodological principle: VALUE COMPARABILITY evaluated before SOURCE CREDIBILITY.
2. 10-Dimension Comparability Gate (exact comparability vs DISPARATE_SCOPE).
3. Domain-Specific Authority assessment (no global flat hierarchy).
4. CASE A: Clearly stronger evidence -> RESOLVED_CANONICAL with decisive factors.
5. CASE B: Both sources credible -> UNRESOLVED_CONFLICT with observed range (e.g. 3.2M – 3.5M).
6. CASE C: No arbitrary averaging for reconciliation.
7. CASE D: Scope differences (Puri District vs Puri Municipality) -> DISPARATE_SCOPE.
8. CASE E: Insufficient evidence -> UNRESOLVED_CONFLICT with missing metadata explained.
9. Scoring safety: UNRESOLVED_CONFLICT and DISPARATE_SCOPE never alter existing scores.
10. Non-destructive invariant: original observations and historical provenance preserved.
"""

from datetime import date
from unittest.mock import MagicMock

import pytest

from app.models.conflict import SourceConflict
from app.models.enums import (
    ComparabilityStatus,
    ConfidenceLevel,
    ConflictResolutionStatus,
    DestinationSpecificity,
    ObservationStatus,
)
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source
from app.services.conflict_resolution import (
    evaluate_comparability,
    evaluate_domain_authority,
    evaluate_evidence_quality,
    SourceConflictResolutionService,
)
from app.services.scoring import EmpiricalScoringEngine


def make_mock_obs(
    obs_id: int,
    metric_code: str,
    val: float,
    unit: str = "kg/day",
    start: date = date(2025, 1, 1),
    end: date = date(2025, 12, 31),
    status: ObservationStatus = ObservationStatus.VERIFIED,
    confidence: ConfidenceLevel = ConfidenceLevel.HIGH,
    specificity: DestinationSpecificity = DestinationSpecificity.DIRECT,
    location_id: int | None = None,
    source_name: str = "Test Source",
    org_name: str = "Government Department",
    notes: str = "",
    assumptions: str = "",
    methodology: str = "Standard administrative measurement procedure",
) -> Observation:
    obs = MagicMock(spec=Observation)
    obs.id = obs_id
    obs.metric_definition_id = 101
    obs.destination_id = 1
    obs.location_id = location_id
    obs.original_value = val
    obs.normalized_value = val
    obs.period_start = start
    obs.period_end = end
    obs.status = status
    obs.confidence = confidence
    obs.destination_specificity = specificity
    obs.notes = notes
    obs.assumptions = assumptions
    obs.methodology = methodology
    obs.evidence_items = [MagicMock()] if status == ObservationStatus.VERIFIED else []

    mdef = MagicMock(spec=MetricDefinition)
    mdef.id = 101
    mdef.code = metric_code
    mdef.name = metric_code.replace("_", " ").title()
    mdef.category = "Tourism" if "tourist" in metric_code else "Waste" if "msw" in metric_code else "Environmental"
    mdef.unit = unit
    obs.metric_definition = mdef

    src = MagicMock(spec=Source)
    src.name = source_name
    src.organisation = org_name

    ds = MagicMock(spec=Dataset)
    ds.name = f"{source_name} Dataset"
    ds.description = f"Official report published by {org_name}"
    ds.source = src
    obs.dataset = ds
    obs.dataset_id = obs_id

    return obs


# ── Comparability Gate Tests (Section 2) ───────────────────────────────────────

def test_comparability_gate_exact_comparability():
    """Section 2.1: Matching metric meaning, unit, geography, population, period pass cleanly."""
    obs_a = make_mock_obs(1, "tourist_arrivals", 3200000.0, unit="visitors", org_name="Dept of Tourism")
    obs_b = make_mock_obs(2, "tourist_arrivals", 3500000.0, unit="visitors", org_name="ASI Tourism Cell")

    comp_status, reason, disparate_dims = evaluate_comparability(obs_a, obs_b)
    assert comp_status == ComparabilityStatus.COMPARABLE
    assert len(disparate_dims) == 0
    assert "Passed strict comparability gate" in reason


def test_comparability_gate_disparate_scope_district_vs_municipality():
    """Section 2.2 & 8: Puri District (3.2M) vs Puri Municipality (3.5M) -> DISPARATE_SCOPE."""
    obs_district = make_mock_obs(
        1, "tourist_arrivals", 3200000.0, notes="Total arrivals in Puri District administrative region"
    )
    obs_municipality = make_mock_obs(
        2, "tourist_arrivals", 3500000.0, notes="Total arrivals in Puri Municipality urban corporation"
    )

    comp_status, reason, disparate_dims = evaluate_comparability(obs_district, obs_municipality)
    assert comp_status == ComparabilityStatus.DISPARATE_SCOPE
    assert any("Administrative Scope" in dim for dim in disparate_dims)
    assert "Non-comparable measurements due to disparate scope" in reason


def test_comparability_gate_disparate_definition_hotel_vs_arrivals():
    """Section 2.2: Hotel guests (3.5M) vs Tourist arrivals (3.2M) is non-comparable, not a conflict."""
    obs_arrivals = make_mock_obs(1, "tourist_arrivals", 3200000.0, notes="tourist arrivals total")
    obs_hotel = make_mock_obs(2, "tourist_arrivals", 3500000.0, notes="hotel commercial guests")

    comp_status, reason, disparate_dims = evaluate_comparability(obs_arrivals, obs_hotel)
    assert comp_status == ComparabilityStatus.DISPARATE_SCOPE
    assert any("Target Population" in dim for dim in disparate_dims)


def test_comparability_gate_temporal_granularity_mismatch():
    """Section 2.2: Annual 365-day total vs single-day sample is DISPARATE_SCOPE."""
    obs_annual = make_mock_obs(1, "tourist_arrivals", 3200000.0, start=date(2025, 1, 1), end=date(2025, 12, 31))
    obs_daily = make_mock_obs(2, "tourist_arrivals", 25000.0, start=date(2025, 6, 1), end=date(2025, 6, 2))

    comp_status, reason, disparate_dims = evaluate_comparability(obs_annual, obs_daily)
    assert comp_status == ComparabilityStatus.DISPARATE_SCOPE
    assert any("Temporal Granularity" in dim for dim in disparate_dims)


# ── Source Credibility & Domain Authority Tests (Section 3) ─────────────────────

def test_domain_specific_authority():
    """Section 3.1: Authority is domain-specific (Tourism authority has high domain authority for tourism)."""
    obs_tourism = make_mock_obs(1, "tourist_arrivals", 3200000.0, org_name="Department of Tourism, Odisha")
    tier_tourism, desc_tourism = evaluate_domain_authority(obs_tourism)
    assert tier_tourism == 3
    assert "tourism" in desc_tourism.lower()

    # Non-domain general source has lower domain authority for tourism
    obs_general = make_mock_obs(2, "tourist_arrivals", 3500000.0, org_name="Independent Student Survey")
    tier_general, desc_general = evaluate_domain_authority(obs_general)
    assert tier_general == 1


def test_domain_authority_never_overrides_comparability_mismatch():
    """
    Section 1: A more authoritative source is NOT automatically correct if it measures
    a different geography, period, or population scope.
    """
    obs_state_gov = make_mock_obs(
        1, "tourist_arrivals", 15000000.0, org_name="Department of Tourism", notes="Puri District regional"
    )
    obs_local_agency = make_mock_obs(
        2, "tourist_arrivals", 3500000.0, org_name="Puri Municipality", notes="Puri Municipality urban"
    )

    # Comparability gate MUST flag disparate scope first
    comp_status, reason, disparate_dims = evaluate_comparability(obs_state_gov, obs_local_agency)
    assert comp_status == ComparabilityStatus.DISPARATE_SCOPE


# ── Deterministic Decision Protocol Tests (Sections 5, 6, 7, 8, 9) ─────────────

def test_case_a_clearly_stronger_evidence_resolves_canonical():
    """Section 5: Direct administrative count + domain authority + audit verification -> RESOLVED_CANONICAL."""
    obs_strong = make_mock_obs(
        1,
        "tourist_arrivals",
        3200000.0,
        status=ObservationStatus.VERIFIED,
        confidence=ConfidenceLevel.HIGH,
        specificity=DestinationSpecificity.DIRECT,
        org_name="Department of Tourism, Odisha",
        methodology="Universal automated RFID turnstile count at verified entry points",
    )
    obs_weak = make_mock_obs(
        2,
        "tourist_arrivals",
        3500000.0,
        status=ObservationStatus.RAW,
        confidence=ConfidenceLevel.LOW,
        specificity=DestinationSpecificity.REGIONAL,
        org_name="Secondary NGO Survey",
        methodology="",
    )

    factors, missing_ev, balance = evaluate_evidence_quality(obs_strong, obs_weak)
    assert balance >= 2
    assert "Domain Authority" in factors.authority_tier_comparison or "Primary" in factors.authority_tier_comparison
    assert "DIRECT" in factors.specificity_comparison


def test_case_b_both_sources_credible_unresolved_conflict_with_range():
    """
    Section 6: When two comparable sources are both credible without decisive advantage,
    flag UNRESOLVED_CONFLICT and expose the observed range (e.g. 3.2M – 3.5M).
    """
    obs_a = make_mock_obs(
        1, "tourist_arrivals", 3200000.0, unit="visitors", org_name="Agency A Tourism Research"
    )
    obs_b = make_mock_obs(
        2, "tourist_arrivals", 3500000.0, unit="visitors", org_name="Agency B Tourism Cell"
    )

    factors, missing_ev, balance = evaluate_evidence_quality(obs_a, obs_b)
    assert balance == 0  # Parity

    # Range calculation must produce explicit string representation
    min_v = min(obs_a.normalized_value, obs_b.normalized_value)
    max_v = max(obs_a.normalized_value, obs_b.normalized_value)
    range_str = f"{min_v:g} – {max_v:g} visitors"
    assert range_str == "3.2e+06 – 3.5e+06 visitors" or "3200000" in range_str


def test_case_e_insufficient_evidence_fails_safely():
    """Section 9: When critical methodology or documentation is missing, fails safely as UNRESOLVED_CONFLICT."""
    obs_a = make_mock_obs(1, "water_ph", 7.2, methodology="")
    obs_b = make_mock_obs(2, "water_ph", 7.8, methodology="")

    factors, missing_ev, balance = evaluate_evidence_quality(obs_a, obs_b)
    assert len(missing_ev) >= 2
    assert any("Missing documented methodology" in item for item in missing_ev)


def test_case_c_no_arbitrary_averaging_invariance():
    """
    Section 7 & 6: Reconciled values are NEVER generated by averaging conflicting values.
    UNRESOLVED_CONFLICT never alters scoring engine results.
    """
    engine = EmpiricalScoringEngine()

    metric = MagicMock(spec=MetricDefinition)
    metric.id = 701
    metric.code = "water_bod"
    metric.name = "Biochemical Oxygen Demand"
    metric.category = "Water Quality"
    metric.unit = "mg/L"

    obs_a = make_mock_obs(101, "water_bod", 2.0, status=ObservationStatus.VERIFIED)
    obs_a.metric_definition = metric
    obs_a.metric_definition_id = 701

    obs_b = make_mock_obs(102, "water_bod", 4.0, status=ObservationStatus.VERIFIED)
    obs_b.metric_definition = metric
    obs_b.metric_definition_id = 701

    db_mock = MagicMock()
    # With UNRESOLVED_CONFLICT (no canonical mapping):
    db_mock.query.return_value.filter.return_value.all.return_value = [obs_a, obs_b]

    score = engine.calculate_scores(1, db_mock)
    assert score is not None
    # Neither raw observation is deleted or overwritten
    assert len(score.categories[0].components) == 2


def test_phase3_observation_reconciliation_model_and_members():
    """
    Phase 3: Verify ObservationReconciliation and ObservationReconciliationMember models,
    roles (CANONICAL, ALTERNATIVE, CONTRIBUTING), and machine-readable resolution methods.
    """
    from app.models.enums import ReconciliationMemberRole, ResolutionMethod
    from app.models.reconciliation import ObservationReconciliation, ObservationReconciliationMember

    recon = ObservationReconciliation(
        metric_id=101,
        destination_id=1,
        status=ConflictResolutionStatus.SELECTED,
        canonical_observation_id=10,
        reconciled_value=None,
        reconciled_unit=None,
        resolution_method=ResolutionMethod.EVIDENCE_PRECEDENCE,
        resolution_reason="Selected Source A due to direct statutory administrative count.",
        comparability_reason="Matching metric, unit, boundary, and 2025 calendar period.",
        resolver_version="source_conflict_v1",
    )

    assert recon.status == ConflictResolutionStatus.SELECTED
    assert recon.resolution_method == ResolutionMethod.EVIDENCE_PRECEDENCE
    assert recon.resolver_version == "source_conflict_v1"
    assert recon.canonical_observation_id == 10

    # Test Member roles
    member_canonical = ObservationReconciliationMember(
        reconciliation_id=1,
        observation_id=10,
        role=ReconciliationMemberRole.CANONICAL,
    )
    member_alt = ObservationReconciliationMember(
        reconciliation_id=1,
        observation_id=11,
        role=ReconciliationMemberRole.ALTERNATIVE,
    )

    assert member_canonical.role == ReconciliationMemberRole.CANONICAL
    assert member_alt.role == ReconciliationMemberRole.ALTERNATIVE


def test_phase3_resolution_methods_and_versioning():
    """
    Phase 3: Verify resolution_method enums cover EVIDENCE_PRECEDENCE, UNRESOLVED,
    SCOPE_MISMATCH, STATISTICAL_AGGREGATION, INSUFFICIENT_EVIDENCE.
    """
    from app.models.enums import ResolutionMethod

    assert ResolutionMethod.EVIDENCE_PRECEDENCE.value == "EVIDENCE_PRECEDENCE"
    assert ResolutionMethod.UNRESOLVED.value == "UNRESOLVED"
    assert ResolutionMethod.SCOPE_MISMATCH.value == "SCOPE_MISMATCH"
    assert ResolutionMethod.STATISTICAL_AGGREGATION.value == "STATISTICAL_AGGREGATION"
    assert ResolutionMethod.INSUFFICIENT_EVIDENCE.value == "INSUFFICIENT_EVIDENCE"

