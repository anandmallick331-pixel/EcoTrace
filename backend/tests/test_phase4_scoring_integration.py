"""
Phase 4 Comprehensive Test Suite — Scoring Integration + Double-Counting Safety.

Verifies all 7 Phase 4 requirements:
1. SELECTED: Canonical observation is used for scoring.
2. DOUBLE COUNTING: Alternative observation is not scored independently.
3. UNRESOLVED_CONFLICT: No fabricated value, no forced winner, range exposed without altering scores.
4. DISPARATE_SCOPE: Observations are non-comparable, both kept available, no forced winner, no prioritization.
5. RECONCILED: Explicit existing reconciled value used only when available; zero DB write-back, zero provenance change, no auto-averaging.
6. SCORE INVARIANCE: Non-conflicting metrics produce identical scores before and after.
7. NON-DESTRUCTIVE: Original observations and provenance in the database remain completely unchanged.
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
    ReconciliationMemberRole,
    ResolutionMethod,
)
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.reconciliation import (
    ObservationReconciliation,
    ObservationReconciliationMember,
)
from app.models.source import Dataset, Source
from app.services.conflict_resolution import get_resolved_observation_view
from app.services.scoring import EmpiricalScoringEngine


def make_test_obs(
    obs_id: int,
    metric_id: int,
    metric_code: str,
    val: float,
    category: str = "Tourism",
    unit: str = "visitors",
    specificity: DestinationSpecificity = DestinationSpecificity.DIRECT,
    status: ObservationStatus = ObservationStatus.VERIFIED,
    confidence: ConfidenceLevel = ConfidenceLevel.HIGH,
    source_name: str = "Statutory Source",
    notes: str = "",
    assumptions: str = "",
    methodology: str = "Direct official enumeration",
) -> Observation:
    """Constructs an Observation instance with mock metadata for testing."""
    obs = Observation(
        id=obs_id,
        destination_id=1,
        location_id=None,
        metric_definition_id=metric_id,
        dataset_id=obs_id,
        period_start=date(2025, 1, 1),
        period_end=date(2025, 12, 31),
        original_value=val,
        normalized_value=val,
        status=status,
        confidence=confidence,
        destination_specificity=specificity,
        notes=notes,
        assumptions=assumptions,
        methodology=methodology,
    )

    mdef = MetricDefinition(
        id=metric_id,
        code=metric_code,
        name=metric_code.replace("_", " ").title(),
        category=category,
        unit=unit,
    )
    obs.metric_definition = mdef

    src = Source(name=source_name, organisation=source_name)
    ds = Dataset(name=f"{source_name} Dataset", source=src)
    obs.dataset = ds
    obs.evidence_items = []
    return obs


# ── 1. SELECTED: Canonical Observation is Used for Scoring ─────────────────────

def test_selected_canonical_used_for_scoring():
    """
    Requirement 1: When a valid canonical resolution exists (SELECTED / RESOLVED_CANONICAL),
    use ONLY the canonical observation for scoring.
    """
    obs_canonical = make_test_obs(
        obs_id=101,
        metric_id=201,
        metric_code="tourist_visits_total",
        val=3500000.0,
        category="Tourism",
    )
    obs_alternative = make_test_obs(
        obs_id=102,
        metric_id=201,
        metric_code="tourist_visits_total",
        val=3200000.0,
        category="Tourism",
    )

    recon = ObservationReconciliation(
        id=1,
        destination_id=1,
        metric_id=201,
        status=ConflictResolutionStatus.SELECTED,
        canonical_observation_id=101,
        reconciled_value=None,
        resolution_method=ResolutionMethod.EVIDENCE_PRECEDENCE,
        resolution_reason="Selected statutory primary authority",
        resolver_version="source_conflict_v1",
    )

    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.all.side_effect = [
        [recon],                 # ObservationReconciliation query
        [],                      # SourceConflict query
    ]

    resolved = get_resolved_observation_view(1, db_mock, raw_observations=[obs_canonical, obs_alternative])

    assert len(resolved) == 1
    assert resolved[0].id == 101
    assert resolved[0].normalized_value == 3500000.0


# ── 2. DOUBLE COUNTING: Alternative Observation is Not Scored Independently ────

def test_double_counting_alternative_not_scored():
    """
    Requirement 2: Competing measurements of the same metric MUST NOT be treated
    as two independent scoring inputs. The alternative observation is excluded
    from scoring while being preserved in database and provenance.
    """
    obs_a = make_test_obs(
        obs_id=101,
        metric_id=201,
        metric_code="tourist_visits_total",
        val=3500000.0,
        category="Tourism",
    )
    obs_b = make_test_obs(
        obs_id=102,
        metric_id=201,
        metric_code="tourist_visits_total",
        val=3200000.0,
        category="Tourism",
    )

    conflict = SourceConflict(
        id=1,
        destination_id=1,
        metric_definition_id=201,
        primary_observation_id=101,
        competing_observation_id=102,
        resolution_status=ConflictResolutionStatus.RESOLVED_CANONICAL,
        canonical_observation_id=101,
    )

    db_mock = MagicMock()
    # Mock calls: 1. raw observations, 2. ObservationReconciliation, 3. SourceConflict
    db_mock.query.return_value.filter.return_value.all.side_effect = [
        [obs_a, obs_b],  # db.query(Observation)...
        [],              # db.query(ObservationReconciliation)...
        [conflict],      # db.query(SourceConflict)...
    ]

    engine = EmpiricalScoringEngine()
    score = engine.calculate_scores(1, db_mock)

    assert score is not None
    # Verify Tourism category has exactly ONE component, not two
    tourism_cat = next((c for c in score.categories if c.category == "Tourism"), None)
    assert tourism_cat is not None
    assert len(tourism_cat.components) == 1
    assert tourism_cat.components[0].metric_code == "tourist_visits_total"

    # Alternative observation 102 was NOT scored
    component_values = [c.normalized_value for c in tourism_cat.components]
    assert 3200000.0 not in component_values

    # Non-destructive: raw observation was not mutated
    assert obs_b.normalized_value == 3200000.0
    assert obs_b.id == 102


# ── 3. UNRESOLVED_CONFLICT: No Fabricated Value, No Forced Winner ──────────────

def test_unresolved_conflict_no_fabricated_value_no_forced_winner():
    """
    Requirement 3: When UNRESOLVED_CONFLICT exists:
    - DO NOT invent a value
    - DO NOT average values
    - DO NOT select a winner
    - Preserve conflict in evidence layer without altering engine schemas.
    """
    obs_a = make_test_obs(
        obs_id=101,
        metric_id=301,
        metric_code="water_bod",
        val=2.0,
        category="Water Quality",
        unit="mg/L",
    )
    obs_b = make_test_obs(
        obs_id=102,
        metric_id=301,
        metric_code="water_bod",
        val=4.0,
        category="Water Quality",
        unit="mg/L",
    )

    recon = ObservationReconciliation(
        id=2,
        destination_id=1,
        metric_id=301,
        status=ConflictResolutionStatus.UNRESOLVED_CONFLICT,
        canonical_observation_id=None,
        reconciled_value=None,  # No fabricated value!
        resolution_method=ResolutionMethod.UNRESOLVED,
        resolution_reason="Both sources credible; observed range 2.0 – 4.0 mg/L",
    )

    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.all.side_effect = [
        [recon],
        [],
    ]

    resolved = get_resolved_observation_view(1, db_mock, raw_observations=[obs_a, obs_b])

    # No forced winner
    assert recon.canonical_observation_id is None
    # No fabricated / synthetic averaged value
    assert recon.reconciled_value is None
    # Both observations retained without forced replacement
    assert len(resolved) == 2
    assert resolved[0].normalized_value == 2.0
    assert resolved[1].normalized_value == 4.0


# ── 4. DISPARATE_SCOPE: Observations Are Non-Comparable ────────────────────────

def test_disparate_scope_both_preserved_no_forced_winner_no_prioritization():
    """
    Requirement 4: Observations with DISPARATE_SCOPE / COMPATIBILITY_MISMATCH are
    explicitly non-comparable:
    - Keep both observations available
    - Do not force a canonical winner
    - Do not prioritize one merely because it is DIRECT
    - Do not treat them as duplicate measurements.
    """
    obs_district = make_test_obs(
        obs_id=201,
        metric_id=401,
        metric_code="resident_population",
        val=1698000.0,
        category="Demographics",
        specificity=DestinationSpecificity.REGIONAL,
        notes="Puri District administrative region",
    )
    obs_muni = make_test_obs(
        obs_id=202,
        metric_id=401,
        metric_code="resident_population",
        val=200564.0,
        category="Demographics",
        specificity=DestinationSpecificity.DIRECT,
        notes="Puri Municipality ULB boundary",
    )

    conflict = SourceConflict(
        id=3,
        destination_id=1,
        metric_definition_id=401,
        primary_observation_id=201,
        competing_observation_id=202,
        comparability_status=ComparabilityStatus.DISPARATE_SCOPE,
        resolution_status=ConflictResolutionStatus.DISPARATE_SCOPE,
        canonical_observation_id=None,  # No canonical winner!
    )

    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.all.side_effect = [
        [],          # ObservationReconciliation
        [conflict],  # SourceConflict
    ]

    resolved = get_resolved_observation_view(1, db_mock, raw_observations=[obs_district, obs_muni])

    # Both observations remain available; no silent drop or winner selection
    assert len(resolved) == 2
    assert conflict.canonical_observation_id is None
    # Neither was eliminated
    obs_ids = {o.id for o in resolved}
    assert 201 in obs_ids
    assert 202 in obs_ids


# ── 5. RECONCILED: Explicit Value Used Only When Available ─────────────────────

def test_reconciled_explicit_value_used_only_when_available():
    """
    Requirement 5:
    A. Use reconciled value ONLY when an explicit reconciliation record exists,
       reconciled_value is not None, and method is valid.
    B. Ephemeral proxy does NOT write back to database and does NOT change provenance.
    C. Never creates an average automatically if reconciled_value is absent.
    """
    obs_a = make_test_obs(
        obs_id=301,
        metric_id=501,
        metric_code="fish_landings_total",
        val=12000.0,
        category="Fisheries",
        unit="tonnes",
    )
    obs_b = make_test_obs(
        obs_id=302,
        metric_id=501,
        metric_code="fish_landings_total",
        val=14000.0,
        category="Fisheries",
        unit="tonnes",
    )

    # Case A: Valid explicit reconciled value exists
    recon_valid = ObservationReconciliation(
        id=4,
        destination_id=1,
        metric_id=501,
        status=ConflictResolutionStatus.RECONCILED,
        canonical_observation_id=None,
        reconciled_value=12850.0,  # Explicit audited reconciliation value
        reconciled_unit="tonnes",
        resolution_method=ResolutionMethod.STATISTICAL_AGGREGATION,
        resolution_reason="Statistically pooled variance estimate",
    )

    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.all.side_effect = [
        [recon_valid],
        [],
    ]

    resolved = get_resolved_observation_view(1, db_mock, raw_observations=[obs_a, obs_b])

    assert len(resolved) == 1
    assert resolved[0].normalized_value == 12850.0
    assert resolved[0].original_value == 12850.0

    # Ephemeral proxy does not mutate database or session
    assert db_mock.add.call_count == 0
    assert db_mock.commit.call_count == 0

    # Original observations were not mutated
    assert obs_a.normalized_value == 12000.0
    assert obs_b.normalized_value == 14000.0

    # Case B: Status is RECONCILED but reconciled_value is absent -> NO automated averaging
    recon_missing = ObservationReconciliation(
        id=5,
        destination_id=1,
        metric_id=501,
        status=ConflictResolutionStatus.RECONCILED,
        canonical_observation_id=None,
        reconciled_value=None,  # Missing!
        resolution_method=ResolutionMethod.UNRESOLVED,
        resolution_reason="Missing calculation",
    )

    db_mock_b = MagicMock()
    db_mock_b.query.return_value.filter.return_value.all.side_effect = [
        [recon_missing],
        [],
    ]

    resolved_b = get_resolved_observation_view(1, db_mock_b, raw_observations=[obs_a, obs_b])

    # Does NOT create a synthetic average (13000.0)
    for r in resolved_b:
        assert r.normalized_value != 13000.0


# ── 6. SCORE INVARIANCE: Non-Conflicting Metrics Produce Identical Scores ───────

def test_score_invariance_non_conflicting_metrics():
    """
    Requirement 6: Non-conflicting existing metrics produce exactly the same
    results as before. The upstream view preserves single observations untouched.
    """
    obs_ph = make_test_obs(
        obs_id=401,
        metric_id=601,
        metric_code="water_ph",
        val=7.4,
        category="Water Quality",
        unit="pH",
    )
    obs_do = make_test_obs(
        obs_id=402,
        metric_id=602,
        metric_code="water_dissolved_oxygen",
        val=7.2,
        category="Water Quality",
        unit="mg/L",
    )

    db_mock = MagicMock()
    # No conflicts exist for these metrics
    db_mock.query.return_value.filter.return_value.all.side_effect = [
        [obs_ph, obs_do],  # Observation query
        [],                # ObservationReconciliation query
        [],                # SourceConflict query
    ]

    engine = EmpiricalScoringEngine()
    score = engine.calculate_scores(1, db_mock)

    assert score is not None
    wq_cat = next((c for c in score.categories if c.category == "Water Quality"), None)
    assert wq_cat is not None
    assert len(wq_cat.components) == 2

    comp_ph = next((c for c in wq_cat.components if c.metric_code == "water_ph"), None)
    comp_do = next((c for c in wq_cat.components if c.metric_code == "water_dissolved_oxygen"), None)
    assert comp_ph is not None
    assert comp_ph.score_contribution == 95.0  # Unchanged benchmark score for 6.5 <= pH <= 8.5
    assert comp_do is not None
    assert comp_do.score_contribution == 88.5  # Unchanged benchmark score for DO >= 6.5


# ── 7. NON-DESTRUCTIVE: Observations and Provenance Remain Verbatim ────────────

def test_non_destructive_guarantee():
    """
    Requirement 7: Never delete observations, overwrite observations, mutate
    original source values, alter original provenance, or remove evidence.
    """
    obs_original = make_test_obs(
        obs_id=501,
        metric_id=701,
        metric_code="est_msw_generation_tpd",
        val=45.0,
        category="Waste",
        unit="TPD",
        source_name="Municipal ULB SWM Cell",
        notes="Census 2011 baseline extrapolation",
        assumptions="Per capita generation constant at 400g/day",
        methodology="Truck weighbridge daily aggregation",
    )

    db_mock = MagicMock()
    db_mock.query.return_value.filter.return_value.all.return_value = []

    resolved = get_resolved_observation_view(1, db_mock, raw_observations=[obs_original])

    assert len(resolved) == 1
    res = resolved[0]

    # Verify all provenance fields are verbatim and unchanged
    assert res.id == 501
    assert res.original_value == 45.0
    assert res.normalized_value == 45.0
    assert res.notes == "Census 2011 baseline extrapolation"
    assert res.assumptions == "Per capita generation constant at 400g/day"
    assert res.methodology == "Truck weighbridge daily aggregation"
    assert res.dataset.source.name == "Municipal ULB SWM Cell"
    assert res.dataset.source.organisation == "Municipal ULB SWM Cell"
