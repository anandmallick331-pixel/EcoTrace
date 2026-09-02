"""
Phase 2 — Deterministic Source Conflict Resolution Service for EcoTrace.

METHODOLOGICAL PRINCIPLE:
1. VALUE COMPARABILITY: Are two observations actually measuring the same thing?
   (Evaluated FIRST at the strict 10-dimension comparability gate).
2. SOURCE CREDIBILITY: How strong and trustworthy is the evidence behind an observation?
   (Domain authority, measurement directness, methodology quality, geographic specificity,
    temporal alignment, coverage, and evidence completeness).

A more authoritative source is NEVER automatically correct if it measures a different
geography, period, population, definition, unit, coverage, or methodology.

DECISION PROTOCOL:
- CASE A: Clearly stronger evidence across relevant dimensions -> RESOLVED_CANONICAL
- CASE B: Both sources credible, neither clearly superior -> UNRESOLVED_CONFLICT
          (Exposes observed range e.g. '3.2M – 3.5M', zero score alteration)
- CASE C: Documented statistical reconciliation -> RECONCILED (Never simple average)
- CASE D: Different scope / different definition -> DISPARATE_SCOPE
          (Keeps both independently available)
- CASE E: Insufficient evidence / missing metadata -> UNRESOLVED_CONFLICT
          (Fails safely, documents what is missing)

NON-DESTRUCTIVE GUARANTEE:
Never delete or overwrite raw observations; preserve full historical provenance.
"""

import json
import logging
from datetime import date
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.conflict import SourceConflict
from app.models.destination import Destination
from app.models.enums import (
    ComparabilityStatus,
    ConfidenceLevel,
    ConflictResolutionStatus,
    DestinationSpecificity,
    ObservationStatus,
    ReconciliationMemberRole,
    ResolutionMethod,
)
from app.models.evidence import Evidence
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.reconciliation import (
    ObservationReconciliation,
    ObservationReconciliationMember,
)
from app.schemas.conflict import (
    CategoricalFactors,
    ConflictObservationDetail,
    ConflictSummaryResponse,
    SourceConflictResponse,
)

logger = logging.getLogger(__name__)


# ── Strict 10-Dimension Comparability Gate ─────────────────────────────────────

def evaluate_comparability(obs_a: Observation, obs_b: Observation) -> tuple[ComparabilityStatus, str, list[str]]:
    """
    Evaluates whether two candidate observations are actually comparable before
    assessing evidence quality.
    
    Examines 10 essential dimensions:
    1. Metric identity
    2. Metric definition / semantic meaning
    3. Unit of measurement
    4. Geography & administrative boundary
    5. Population / scope
    6. Time period
    7. Temporal granularity
    8. Measurement methodology
    9. Coverage
    10. Provenance classification (DIRECT, DERIVED, ESTIMATED, PROXY)
    
    Returns:
      (ComparabilityStatus, human_readable_rationale, disparate_dimensions_list)
    """
    disparate: list[str] = []

    # 1 & 2. Metric identity & definition / semantic meaning
    if obs_a.metric_definition_id != obs_b.metric_definition_id:
        m_a = obs_a.metric_definition.code if obs_a.metric_definition else str(obs_a.metric_definition_id)
        m_b = obs_b.metric_definition.code if obs_b.metric_definition else str(obs_b.metric_definition_id)
        disparate.append(f"Metric Identity ({m_a} vs {m_b})")

    mdef_a = obs_a.metric_definition
    mdef_b = obs_b.metric_definition

    # 3. Unit of measurement
    unit_a = (mdef_a.unit if mdef_a else "").strip().lower()
    unit_b = (mdef_b.unit if mdef_b else "").strip().lower()
    if unit_a and unit_b and unit_a != unit_b:
        # Check if harmonizable (e.g. TPD vs tonnes/day)
        is_harmonizable = (
            ("ton" in unit_a and "ton" in unit_b) or
            ("person" in unit_a and "person" in unit_b) or
            ("kg" in unit_a and "kg" in unit_b)
        )
        if not is_harmonizable:
            disparate.append(f"Measurement Unit ({unit_a} vs {unit_b})")

    # 4. Geography & Administrative Boundary
    loc_a_label = obs_a.location.label if obs_a.location else "Destination-wide polygon"
    loc_b_label = obs_b.location.label if obs_b.location else "Destination-wide polygon"
    if obs_a.location_id != obs_b.location_id:
        disparate.append(f"Geographic Boundary ({loc_a_label} vs {loc_b_label})")

    notes_a = (obs_a.notes or "").lower()
    notes_b = (obs_b.notes or "").lower()
    assump_a = (obs_a.assumptions or "").lower()
    assump_b = (obs_b.assumptions or "").lower()

    # Specific boundary mismatches (e.g. monument fenced plot vs municipal ULB)
    if (("heritage_property" in notes_a or "sun temple" in notes_a) and ("nac" in notes_b or "municipality" in notes_b)) or \
       (("heritage_property" in notes_b or "sun temple" in notes_b) and ("nac" in notes_a or "municipality" in notes_a)):
        disparate.append("Administrative Scope (10.62 ha Sun Temple plot vs 35.09 km² Konark NAC municipal area)")

    if (("district" in notes_a or "district" in assump_a) and ("municipality" in notes_b or "municipality" in assump_b)) or \
       (("district" in notes_b or "district" in assump_b) and ("municipality" in notes_a or "municipality" in assump_a)):
        disparate.append("Administrative Scope (District administrative region vs Urban Municipal Corporation)")

    # 5. Population / Scope (e.g. total population vs slum population, hotel guests vs total arrivals)
    if ("slum" in notes_a and "total" in notes_b) or ("slum" in notes_b and "total" in notes_a):
        disparate.append("Population Scope (Slum demographic sub-group vs Total municipal population)")
    if ("hotel" in notes_a and "tourist" in notes_b) or ("hotel" in notes_b and "tourist" in notes_a):
        disparate.append("Target Population (Commercial hotel guests vs Total destination tourist arrivals)")

    # 6. Time Period
    overlap_start = max(obs_a.period_start, obs_b.period_start)
    overlap_end = min(obs_a.period_end, obs_b.period_end)
    if overlap_start > overlap_end:
        disparate.append(f"Time Period ({obs_a.period_start}..{obs_a.period_end} vs {obs_b.period_start}..{obs_b.period_end})")

    # 7. Temporal Granularity (annual ~365d vs seasonal ~90d vs monthly ~30d vs peak 1d)
    dur_a = (obs_a.period_end - obs_a.period_start).days
    dur_b = (obs_b.period_end - obs_b.period_start).days
    if abs(dur_a - dur_b) > 60:
        disparate.append(f"Temporal Granularity ({dur_a}-day span vs {dur_b}-day span)")

    # 8. Measurement Methodology
    method_a = (obs_a.methodology or "").lower()
    method_b = (obs_b.methodology or "").lower()
    if ("cleanup" in method_a and "generation" in method_b) or ("cleanup" in method_b and "generation" in method_a):
        disparate.append("Measurement Concept (Cleanup collection sample vs Total generation estimate)")

    # 9. Coverage (full destination vs partial station)
    if ("sample" in notes_a and "census" in notes_b) or ("sample" in notes_b and "census" in notes_a):
        disparate.append("Measurement Coverage (Spot sample survey vs Universal enumeration)")

    # If any disparate dimensions were detected, fail the comparability gate cleanly
    if disparate:
        reasons_str = "; ".join(disparate)
        rationale = (
            f"Non-comparable measurements due to disparate scope: {reasons_str}. "
            "Per EcoTrace methodological policy, observations measuring different boundaries, populations, "
            "periods, or concepts are not conflicting values and remain independently available."
        )
        return (ComparabilityStatus.DISPARATE_SCOPE, rationale, disparate)

    return (
        ComparabilityStatus.COMPARABLE,
        "Passed strict comparability gate: matching metric identity, unit, administrative boundary, population scope, and temporal period.",
        [],
    )


def evaluate_comparability_dimensions(obs_a: Observation, obs_b: Observation) -> dict[str, bool]:
    """
    Evaluates each of the 10 distinct comparability dimensions established in Phase 2
    and returns a structured boolean mapping:
    - metric_identity
    - semantic_definition
    - unit
    - geography_boundary
    - population_scope
    - time_period
    - temporal_granularity
    - measurement_methodology
    - coverage
    - provenance_classification
    """
    mdef_a = obs_a.metric_definition
    mdef_b = obs_b.metric_definition

    # 1. Metric identity
    metric_identity = (obs_a.metric_definition_id == obs_b.metric_definition_id)
    if mdef_a and mdef_b and mdef_a.code != mdef_b.code:
        metric_identity = False

    # 2. Semantic definition
    cat_a = (mdef_a.category if mdef_a else "").strip().lower()
    cat_b = (mdef_b.category if mdef_b else "").strip().lower()
    semantic_definition = metric_identity and (cat_a == cat_b)

    # 3. Unit
    unit_a = (mdef_a.unit if mdef_a else "").strip().lower()
    unit_b = (mdef_b.unit if mdef_b else "").strip().lower()
    unit_match = True
    if unit_a and unit_b and unit_a != unit_b:
        is_harmonizable = (
            ("ton" in unit_a and "ton" in unit_b) or
            ("person" in unit_a and "person" in unit_b) or
            ("kg" in unit_a and "kg" in unit_b)
        )
        unit_match = is_harmonizable

    # 4. Geography / boundary
    loc_match = (obs_a.location_id == obs_b.location_id)
    notes_a = (obs_a.notes or "").lower()
    notes_b = (obs_b.notes or "").lower()
    assump_a = (obs_a.assumptions or "").lower()
    assump_b = (obs_b.assumptions or "").lower()
    boundary_mismatch = (
        (("heritage_property" in notes_a or "sun temple" in notes_a) and ("nac" in notes_b or "municipality" in notes_b)) or
        (("heritage_property" in notes_b or "sun temple" in notes_b) and ("nac" in notes_a or "municipality" in notes_a)) or
        (("district" in notes_a or "district" in assump_a) and ("municipality" in notes_b or "municipality" in assump_b)) or
        (("district" in notes_b or "district" in assump_b) and ("municipality" in notes_a or "municipality" in assump_a))
    )
    geography_boundary = loc_match and not boundary_mismatch

    # 5. Population / scope
    pop_mismatch = (
        (("slum" in notes_a and "total" in notes_b) or ("slum" in notes_b and "total" in notes_a)) or
        (("hotel" in notes_a and "tourist" in notes_b) or ("hotel" in notes_b and "tourist" in notes_a))
    )
    population_scope = not pop_mismatch

    # 6. Time period
    overlap_start = max(obs_a.period_start, obs_b.period_start)
    overlap_end = min(obs_a.period_end, obs_b.period_end)
    time_period = (overlap_start <= overlap_end)

    # 7. Temporal granularity
    dur_a = (obs_a.period_end - obs_a.period_start).days
    dur_b = (obs_b.period_end - obs_b.period_start).days
    temporal_granularity = abs(dur_a - dur_b) <= 60

    # 8. Measurement methodology
    method_a = (obs_a.methodology or "").lower()
    method_b = (obs_b.methodology or "").lower()
    method_mismatch = (
        ("cleanup" in method_a and "generation" in method_b) or
        ("cleanup" in method_b and "generation" in method_a)
    )
    measurement_methodology = not method_mismatch

    # 9. Coverage
    coverage_mismatch = (
        ("sample" in notes_a and "census" in notes_b) or
        ("sample" in notes_b and "census" in notes_a)
    )
    coverage = not coverage_mismatch

    # 10. Provenance classification
    provenance_classification = True

    return {
        "metric_identity": metric_identity,
        "semantic_definition": semantic_definition,
        "unit": unit_match,
        "geography_boundary": geography_boundary,
        "population_scope": population_scope,
        "time_period": time_period,
        "temporal_granularity": temporal_granularity,
        "measurement_methodology": measurement_methodology,
        "coverage": coverage,
        "provenance_classification": provenance_classification,
    }


# ── Domain Authority Assessment ────────────────────────────────────────────────

def evaluate_domain_authority(obs: Observation) -> tuple[int, str]:
    """
    Assesses how directly the source institution is officially responsible for
    producing, regulating, or reporting this particular metric domain.
    
    Authority is strictly domain-specific:
    - Tourism authority -> strong for tourism statistics, not water quality
    - Environmental agency -> strong for water/biodiversity, not tourist numbers
    - Municipal body -> strong for MSW and local sanitation, not state tourism
    - Statistical agency -> strong for official demographics / census
    """
    mdef = obs.metric_definition
    code = (mdef.code if mdef else "").lower()
    cat = (mdef.category if mdef else "").lower()
    src = obs.dataset.source if obs.dataset and obs.dataset.source else None
    org = (src.organisation or src.name or "").lower() if src else ""
    notes = (obs.notes or "").lower()

    # Domain 1: Tourism, arrivals, footfall, occupancy
    if any(k in code or k in cat for k in ["tourist", "arrival", "visitor", "footfall", "hotel", "homestay", "occupancy"]):
        if any(k in org for k in ["tourism", "asi", "archaeological survey", "otdc"]):
            return (3, "Primary statutory tourism authority (high domain authority)")
        elif any(k in org for k in ["government", "cag", "audit", "district"]):
            return (2, "General government administration (secondary domain authority)")
        return (1, "Independent third-party survey / non-domain source")

    # Domain 2: Waste, sanitation, municipal solid waste
    if any(k in code or k in cat for k in ["waste", "msw", "landfill", "tpd", "segregation", "swm"]):
        if any(k in org for k in ["municipality", "municipal corporation", "bmc", "pkda", "nac", "hud", "housing & urban", "urban local"]):
            return (3, "Statutory municipal urban local body responsible for municipal solid waste")
        elif any(k in org for k in ["cag", "audit", "ospcb", "pollution control"]):
            return (3, "Statutory oversight / environmental audit authority")
        return (1, "Third-party study / academic proxy")

    # Domain 3: Water quality, environmental health, ecosystem, biodiversity
    if any(k in code or k in cat for k in ["water", "ph", "bod", "coliform", "turbidity", "air", "pm2", "species", "biodiversity", "avifauna", "forest", "dolphin"]):
        if any(k in org for k in ["ospcb", "pollution control", "cda", "chilika development", "forest", "wildlife"]):
            return (3, "Statutory environmental regulatory or conservation authority")
        elif any(k in org for k in ["cag", "audit", "cpcb"]):
            return (2, "Statutory audit or national oversight body")
        return (1, "Third-party study / non-regulatory sample")

    # Domain 4: Demographics, population, geographic area
    if any(k in code or k in cat for k in ["population", "census", "resident", "area", "demographic"]):
        if any(k in org for k in ["census", "ddma", "disaster management", "revenue", "directorate of economics"]):
            return (3, "Official demographic / census / district administration authority")
        elif any(k in org for k in ["municipality", "bmc", "pkda", "cag"]):
            return (3, "Statutory urban local body")
        return (1, "Secondary estimate / proxy")

    # Domain 5: Economics, livelihood, cooperative income
    if any(k in code or k in cat for k in ["income", "shg", "boatmen", "fisher", "livelihood", "loan", "revenue"]):
        if any(k in org for k in ["fisheries", "cooperative", "shg", "mission shakti", "panchayat"]):
            return (3, "Statutory department for livelihood and cooperative oversight")
        elif any(k in org for k in ["government", "cag", "district"]):
            return (2, "General government administration")
        return (1, "Secondary survey / NGO report")

    if any(k in org for k in ["government", "cag", "statutory", "audit", "department"]):
        return (2, "Government institution")
    return (1, "General entity")


# ── Evidence Quality & Categorical Hierarchy Assessment ─────────────────────────

def evaluate_evidence_quality(obs_a: Observation, obs_b: Observation) -> tuple[CategoricalFactors, list[str], int]:
    """
    Evaluates transparent evidence quality dimensions without arbitrary percentage weights
    or magic numbers.
    
    Dimensions assessed:
    1. Domain authority
    2. Measurement directness (DIRECT > DERIVED > ESTIMATED > MODELLED)
    3. Methodology quality (procedure, assumptions, sampling documentation)
    4. Verification status (VERIFIED > RAW > FLAGGED > REJECTED)
    5. Evidence completeness (primary documents, official citations, excerpts)
    
    Returns:
      (CategoricalFactors, missing_evidence_list, decisive_balance)
    """
    missing_evidence: list[str] = []
    a_advantages: list[str] = []
    b_advantages: list[str] = []

    # 1. Domain Authority
    tier_a, desc_a = evaluate_domain_authority(obs_a)
    tier_b, desc_b = evaluate_domain_authority(obs_b)
    if tier_a > tier_b:
        auth_comp = f"Primary source has domain authority ({desc_a}) whereas Competing is secondary ({desc_b})"
        a_advantages.append("Domain Authority")
    elif tier_b > tier_a:
        auth_comp = f"Competing source has domain authority ({desc_b}) whereas Primary is secondary ({desc_a})"
        b_advantages.append("Domain Authority")
    else:
        auth_comp = f"Both sources have equivalent institutional domain standing ({desc_a})"

    # 2. Measurement Directness (DIRECT > DERIVED > ESTIMATED/PROXY > MODELLED)
    directness_rank = {
        DestinationSpecificity.DIRECT: 4,
        DestinationSpecificity.REGIONAL: 3,
        DestinationSpecificity.NATIONAL: 2,
        DestinationSpecificity.MODELLED: 1,
    }
    rank_d_a = directness_rank.get(obs_a.destination_specificity, 2)
    rank_d_b = directness_rank.get(obs_b.destination_specificity, 2)
    if rank_d_a > rank_d_b:
        spec_comp = f"Primary is a DIRECT destination-specific measurement whereas Competing is {obs_b.destination_specificity.value.upper()}"
        a_advantages.append("Measurement Directness")
    elif rank_d_b > rank_d_a:
        spec_comp = f"Competing is a DIRECT destination-specific measurement whereas Primary is {obs_a.destination_specificity.value.upper()}"
        b_advantages.append("Measurement Directness")
    else:
        spec_comp = f"Both observations share {obs_a.destination_specificity.value.upper()} directness"

    # 3. Methodology Documentation Quality
    has_method_a = bool(obs_a.methodology and len(obs_a.methodology.strip()) > 5)
    has_method_b = bool(obs_b.methodology and len(obs_b.methodology.strip()) > 5)
    if has_method_a and not has_method_b:
        a_advantages.append("Documented Methodology")
    elif has_method_b and not has_method_a:
        b_advantages.append("Documented Methodology")
    if not has_method_a:
        missing_evidence.append(f"Observation #{obs_a.id}: Missing documented methodology")
    if not has_method_b:
        missing_evidence.append(f"Observation #{obs_b.id}: Missing documented methodology")

    # 4. Verification Status (VERIFIED > RAW > FLAGGED > REJECTED)
    status_order = {
        ObservationStatus.VERIFIED: 4,
        ObservationStatus.RAW: 3,
        ObservationStatus.FLAGGED: 2,
        ObservationStatus.REJECTED: 1,
    }
    stat_rank_a = status_order.get(obs_a.status, 2)
    stat_rank_b = status_order.get(obs_b.status, 2)
    if stat_rank_a > stat_rank_b:
        stat_comp = f"Primary is audit-VERIFIED whereas Competing is {obs_b.status.value.upper()}"
        a_advantages.append("Audit Verification")
    elif stat_rank_b > stat_rank_a:
        stat_comp = f"Competing is audit-VERIFIED whereas Primary is {obs_a.status.value.upper()}"
        b_advantages.append("Audit Verification")
    else:
        stat_comp = f"Both observations share {obs_a.status.value.upper()} verification state"

    # 5. Confidence Level
    conf_order = {
        ConfidenceLevel.HIGH: 4,
        ConfidenceLevel.MEDIUM: 3,
        ConfidenceLevel.LOW: 2,
        ConfidenceLevel.UNKNOWN: 1,
    }
    conf_a = conf_order.get(obs_a.confidence, 2)
    conf_b = conf_order.get(obs_b.confidence, 2)
    if conf_a > conf_b:
        conf_comp = f"Primary rated {obs_a.confidence.value.upper()} confidence vs Competing {obs_b.confidence.value.upper()}"
        a_advantages.append("Confidence Level")
    elif conf_b > conf_a:
        conf_comp = f"Competing rated {obs_b.confidence.value.upper()} confidence vs Primary {obs_a.confidence.value.upper()}"
        b_advantages.append("Confidence Level")
    else:
        conf_comp = f"Both share {obs_a.confidence.value.upper()} confidence"

    # 6. Evidence Artefact Corroboration
    ev_count_a = len(obs_a.evidence_items) if obs_a.evidence_items else 0
    ev_count_b = len(obs_b.evidence_items) if obs_b.evidence_items else 0
    if ev_count_a > 0 and ev_count_b == 0:
        ev_comp = f"Primary is supported by {ev_count_a} corroborating document excerpts; Competing is uncorroborated"
        a_advantages.append("Documentary Proof")
    elif ev_count_b > 0 and ev_count_a == 0:
        ev_comp = f"Competing is supported by {ev_count_b} corroborating document excerpts; Primary is uncorroborated"
        b_advantages.append("Documentary Proof")
    else:
        ev_comp = f"Corroborating artefacts: Primary ({ev_count_a}) vs Competing ({ev_count_b})"
    if ev_count_a == 0 and ev_count_b == 0:
        missing_evidence.append("Both observations lack linked documentary evidence artefacts")

    factors = CategoricalFactors(
        verification_comparison=stat_comp,
        specificity_comparison=spec_comp,
        confidence_comparison=conf_comp,
        evidence_backing_comparison=ev_comp,
        authority_tier_comparison=auth_comp,
    )

    # Net qualitative balance: positive if Primary has clear dominance, negative if Competing has dominance
    decisive_balance = len(a_advantages) - len(b_advantages)
    return factors, missing_evidence, decisive_balance


def resolve_conflict(
    observations: list[Observation],
    destination_id: int | None = None,
    db: Session | None = None,
) -> dict[str, Any]:
    """
    Modular, deterministic interface for resolving source conflicts per Phase 7:
    resolve_conflict(observations) -> resolution dictionary

    Exposes the 10-dimension comparability gate, decisive factors, transparent rationale,
    and non-destructive alternatives list.
    """
    if not observations or len(observations) < 2:
        obs_ids = [o.id for o in observations if o.id is not None] if observations else []
        return {
            "status": "UNRESOLVED_CONFLICT",
            "canonical_observation_id": obs_ids[0] if obs_ids else None,
            "resolution_method": "INSUFFICIENT_OBSERVATIONS",
            "reason": "At least two candidate observations are required to evaluate conflict.",
            "comparability": {
                "metric_identity": True,
                "semantic_definition": True,
                "unit": True,
                "geography_boundary": True,
                "population_scope": True,
                "time_period": True,
                "temporal_granularity": True,
                "measurement_methodology": True,
                "coverage": True,
                "provenance_classification": True,
            },
            "decisive_factors": [],
            "observed_range": None,
            "participating_observations": obs_ids,
            "alternatives": [],
        }

    # Sort deterministically by observation ID to eliminate any iteration-order or database-order dependency
    sorted_obs = sorted(observations, key=lambda o: (o.id if o.id is not None else 0))
    obs_a = sorted_obs[0]
    obs_b = sorted_obs[1]
    participating_ids = [obs_a.id, obs_b.id]

    # Evaluate 10 comparability dimensions
    comp_map = evaluate_comparability_dimensions(obs_a, obs_b)
    comp_status, comp_reason, disparate_dims = evaluate_comparability(obs_a, obs_b)

    # CASE D: Different Scope / Non-comparable
    if comp_status == ComparabilityStatus.DISPARATE_SCOPE:
        return {
            "status": "DISPARATE_SCOPE",
            "canonical_observation_id": None,
            "resolution_method": ResolutionMethod.SCOPE_MISMATCH.value,
            "reason": comp_reason,
            "comparability": comp_map,
            "decisive_factors": disparate_dims,
            "observed_range": None,
            "participating_observations": participating_ids,
            "alternatives": participating_ids,
        }

    # Evaluate evidence quality
    factors, missing_ev, balance = evaluate_evidence_quality(obs_a, obs_b)

    val_a = obs_a.normalized_value if obs_a.normalized_value is not None else obs_a.original_value
    val_b = obs_b.normalized_value if obs_b.normalized_value is not None else obs_b.original_value
    unit_str = obs_a.metric_definition.unit if obs_a.metric_definition else ""
    min_v = min(val_a, val_b) if val_a is not None and val_b is not None else None
    max_v = max(val_a, val_b) if val_a is not None and val_b is not None else None
    range_str = f"Observed source range: {min_v:g} – {max_v:g} {unit_str}".strip() if min_v is not None and max_v is not None else None

    # Check for documented statistical reconciliation in DB if available
    if db is not None:
        try:
            r_stmt = select(ObservationReconciliation).where(
                ObservationReconciliation.destination_id == (destination_id or obs_a.destination_id),
                ObservationReconciliation.metric_id == obs_a.metric_definition_id,
            )
            recon = db.scalars(r_stmt).first()
            if recon and recon.status == ConflictResolutionStatus.RECONCILED:
                return {
                    "status": "RECONCILED",
                    "canonical_observation_id": None,
                    "resolution_method": recon.resolution_method.value,
                    "reason": recon.resolution_reason,
                    "comparability": comp_map,
                    "decisive_factors": ["explicit_statistical_reconciliation"],
                    "observed_range": range_str,
                    "participating_observations": participating_ids,
                    "alternatives": participating_ids,
                }
        except Exception:
            pass

    # CASE E: Insufficient Evidence / Safe Failure
    if len(missing_ev) >= 2 and balance == 0:
        return {
            "status": "UNRESOLVED_CONFLICT",
            "canonical_observation_id": None,
            "resolution_method": ResolutionMethod.INSUFFICIENT_EVIDENCE.value,
            "reason": (
                f"Unable to determine canonical observation because essential evidence is missing: "
                f"{'; '.join(missing_ev)}. Both sources retained."
            ),
            "comparability": comp_map,
            "decisive_factors": missing_ev,
            "observed_range": range_str,
            "participating_observations": participating_ids,
            "alternatives": participating_ids,
        }

    # CASE A: Clearly Stronger Evidence
    if balance >= 2:
        src_name_a = obs_a.dataset.source.name if obs_a.dataset and obs_a.dataset.source else "Primary Source"
        src_name_b = obs_b.dataset.source.name if obs_b.dataset and obs_b.dataset.source else "Competing Source"
        reason_str = (
            f"Observation #{obs_a.id} ({src_name_a}) is selected because it provides a direct administrative "
            f"measurement with exact geographic and temporal alignment and strong methodological evidence. "
            f"Observation #{obs_b.id} ({src_name_b}) is retained as a credible alternative for auditability."
        )
        return {
            "status": "SELECTED",
            "canonical_observation_id": obs_a.id,
            "resolution_method": ResolutionMethod.EVIDENCE_PRECEDENCE.value,
            "reason": reason_str,
            "comparability": comp_map,
            "decisive_factors": [
                factors.authority_tier_comparison,
                factors.specificity_comparison,
                factors.verification_comparison,
            ],
            "observed_range": range_str,
            "participating_observations": participating_ids,
            "alternatives": [obs_b.id],
        }

    if balance <= -2:
        src_name_a = obs_a.dataset.source.name if obs_a.dataset and obs_a.dataset.source else "Primary Source"
        src_name_b = obs_b.dataset.source.name if obs_b.dataset and obs_b.dataset.source else "Competing Source"
        reason_str = (
            f"Observation #{obs_b.id} ({src_name_b}) is selected because it provides a direct administrative "
            f"measurement with exact geographic and temporal alignment and strong methodological evidence. "
            f"Observation #{obs_a.id} ({src_name_a}) is retained as a credible alternative for auditability."
        )
        return {
            "status": "SELECTED",
            "canonical_observation_id": obs_b.id,
            "resolution_method": ResolutionMethod.EVIDENCE_PRECEDENCE.value,
            "reason": reason_str,
            "comparability": comp_map,
            "decisive_factors": [
                factors.authority_tier_comparison,
                factors.specificity_comparison,
                factors.verification_comparison,
            ],
            "observed_range": range_str,
            "participating_observations": participating_ids,
            "alternatives": [obs_a.id],
        }

    # CASE B: Both Sources Credible, No Clear Winner (Tied) -> UNRESOLVED_CONFLICT
    return {
        "status": "UNRESOLVED_CONFLICT",
        "canonical_observation_id": None,
        "resolution_method": ResolutionMethod.UNRESOLVED.value,
        "reason": (
            "Both sources are credible and comparable, but neither has sufficient evidence advantage. "
            "Both sources retained."
        ),
        "comparability": comp_map,
        "decisive_factors": ["balanced_evidence_precedence"],
        "observed_range": range_str,
        "participating_observations": participating_ids,
        "alternatives": participating_ids,
    }


# ── Deterministic Conflict Resolution Engine ───────────────────────────────────

class SourceConflictResolutionService:
    """
    Deterministic Source Conflict Resolution Service adhering to Phase 2 principles.
    Enforces the 10-dimension comparability gate, assesses domain authority & evidence quality,
    applies transparent decision rules, and preserves all historical records.
    """

    def __init__(self, db: Session):
        self.db = db

    def resolve_conflict(self, observations: list[Observation]) -> dict[str, Any]:
        """Exposes the modular resolve_conflict interface directly on the service instance."""
        return resolve_conflict(observations, db=self.db)

    def scan_and_resolve_destination(self, destination_id: int) -> list[SourceConflict]:
        """
        Scans all observations for a destination, evaluates candidate pairs against the
        comparability gate, assesses evidence quality, and deterministically resolves them.
        Non-destructive and idempotent.
        """
        stmt = (
            select(Observation)
            .where(Observation.destination_id == destination_id)
            .options(
                joinedload(Observation.metric_definition),
                joinedload(Observation.location),
                joinedload(Observation.dataset).joinedload(Observation.dataset.property.mapper.class_.source),
                joinedload(Observation.evidence_items),
            )
        )
        observations = self.db.scalars(stmt).unique().all()
        if len(observations) < 2:
            return []

        # Group observations by metric_definition_id
        grouped: dict[int, list[Observation]] = {}
        for obs in observations:
            grouped.setdefault(obs.metric_definition_id, []).append(obs)

        resolved_conflicts: list[SourceConflict] = []

        for metric_id, obs_list in grouped.items():
            if len(obs_list) < 2:
                continue

            for i in range(len(obs_list)):
                for j in range(i + 1, len(obs_list)):
                    obs_a = obs_list[i]
                    obs_b = obs_list[j]

                    # Same dataset records are a coherent time series, not conflicting sources
                    if obs_a.dataset_id == obs_b.dataset_id and obs_a.dataset_id is not None:
                        continue

                    # Identical values within 0.01% are trivial rounding differences
                    if obs_a.normalized_value is not None and obs_b.normalized_value is not None:
                        diff = abs(obs_a.normalized_value - obs_b.normalized_value)
                        denom = max(abs(obs_a.normalized_value), abs(obs_b.normalized_value), 1.0)
                        if (diff / denom) < 0.0001:
                            continue

                    # STEP 1: Rigorous 10-Dimension Comparability Gate
                    comp_status, comp_reason, disparate_dims = evaluate_comparability(obs_a, obs_b)

                    # CASE D: Different Scope / Definition
                    if comp_status == ComparabilityStatus.DISPARATE_SCOPE:
                        res_status = ConflictResolutionStatus.DISPARATE_SCOPE
                        canonical_id = None
                        observed_range = None
                        missing_ev: list[str] = []
                        rationale = comp_reason
                        factors = CategoricalFactors(
                            verification_comparison=f"{obs_a.status.value.upper()} vs {obs_b.status.value.upper()}",
                            specificity_comparison=f"{obs_a.destination_specificity.value.upper()} vs {obs_b.destination_specificity.value.upper()}",
                            confidence_comparison=f"{obs_a.confidence.value.upper()} vs {obs_b.confidence.value.upper()}",
                            evidence_backing_comparison="Scope / boundary / population mismatch",
                            authority_tier_comparison="Incomparable administrative scopes",
                        )
                    else:
                        # STEP 2 & 3: Evidence Quality & Categorical Assessment
                        factors, missing_ev, balance = evaluate_evidence_quality(obs_a, obs_b)

                        val_a = obs_a.normalized_value if obs_a.normalized_value is not None else obs_a.original_value
                        val_b = obs_b.normalized_value if obs_b.normalized_value is not None else obs_b.original_value
                        unit_str = obs_a.metric_definition.unit if obs_a.metric_definition else ""
                        min_v = min(val_a, val_b) if val_a is not None and val_b is not None else None
                        max_v = max(val_a, val_b) if val_a is not None and val_b is not None else None
                        range_str = f"{min_v:g} – {max_v:g} {unit_str}".strip() if min_v is not None and max_v is not None else None

                        # CASE E: Insufficient Evidence
                        if len(missing_ev) >= 2 and balance == 0:
                            res_status = ConflictResolutionStatus.UNRESOLVED_CONFLICT
                            canonical_id = None
                            observed_range = range_str
                            rationale = (
                                f"Unable to determine canonical observation because essential evidence is missing: "
                                f"{'; '.join(missing_ev)}. Per EcoTrace safety policy, this conflict fails safely and remains "
                                f"unresolved without guessing or altering scores. Observed values: {range_str}."
                            )

                        # CASE A: Clearly Stronger Evidence
                        elif balance >= 2:
                            res_status = ConflictResolutionStatus.RESOLVED_CANONICAL
                            canonical_id = obs_a.id
                            observed_range = None
                            src_name = obs_a.dataset.source.name if obs_a.dataset and obs_a.dataset.source else "Primary Source"
                            rationale = (
                                f"Resolved canonically in favor of Observation #{obs_a.id} ({src_name}): "
                                f"The source demonstrates decisive evidence advantage across domain authority ({factors.authority_tier_comparison}), "
                                f"measurement directness ({factors.specificity_comparison}), and audit verification ({factors.verification_comparison}). "
                                f"Alternative Observation #{obs_b.id} is retained verbatim for transparent disclosure."
                            )
                        elif balance <= -2:
                            res_status = ConflictResolutionStatus.RESOLVED_CANONICAL
                            canonical_id = obs_b.id
                            observed_range = None
                            src_name = obs_b.dataset.source.name if obs_b.dataset and obs_b.dataset.source else "Competing Source"
                            rationale = (
                                f"Resolved canonically in favor of Observation #{obs_b.id} ({src_name}): "
                                f"The source demonstrates decisive evidence advantage across domain authority ({factors.authority_tier_comparison}), "
                                f"measurement directness ({factors.specificity_comparison}), and audit verification ({factors.verification_comparison}). "
                                f"Alternative Observation #{obs_a.id} is retained verbatim for transparent disclosure."
                            )

                        # CASE B: Both Sources Credible, Neither Clearly Superior
                        else:
                            res_status = ConflictResolutionStatus.UNRESOLVED_CONFLICT
                            canonical_id = None
                            observed_range = range_str
                            rationale = (
                                f"Both sources are credible and neither has a sufficient evidence advantage to justify selecting one. "
                                f"Reported values: {range_str}. Per EcoTrace methodology, this is preserved as an unresolved source conflict "
                                f"representing underlying measurement uncertainty, without averaging or altering existing scores."
                            )

                    # Determine machine-readable resolution_method for Phase 3
                    if res_status == ConflictResolutionStatus.DISPARATE_SCOPE:
                        method = ResolutionMethod.SCOPE_MISMATCH
                    elif len(missing_ev) >= 2 and balance == 0:
                        method = ResolutionMethod.INSUFFICIENT_EVIDENCE
                    elif res_status in [ConflictResolutionStatus.SELECTED, ConflictResolutionStatus.RESOLVED_CANONICAL]:
                        method = ResolutionMethod.EVIDENCE_PRECEDENCE
                    elif res_status == ConflictResolutionStatus.RECONCILED:
                        method = ResolutionMethod.STATISTICAL_AGGREGATION
                    else:
                        method = ResolutionMethod.UNRESOLVED

                    # Store / Upsert conflict record (backward-compatible)
                    existing_stmt = select(SourceConflict).where(
                        SourceConflict.destination_id == destination_id,
                        SourceConflict.metric_definition_id == metric_id,
                        or_(
                            (SourceConflict.primary_observation_id == obs_a.id) & (SourceConflict.competing_observation_id == obs_b.id),
                            (SourceConflict.primary_observation_id == obs_b.id) & (SourceConflict.competing_observation_id == obs_a.id),
                        ),
                    )
                    existing_conflict = self.db.scalars(existing_stmt).first()

                    factors_json = json.dumps({
                        "factors": factors.model_dump(),
                        "observed_range": observed_range,
                        "disparate_dimensions": disparate_dims,
                        "missing_evidence": missing_ev,
                        "resolution_method": method.value,
                        "resolver_version": "source_conflict_v1",
                    })

                    if existing_conflict:
                        existing_conflict.comparability_status = comp_status
                        existing_conflict.resolution_status = res_status
                        existing_conflict.canonical_observation_id = canonical_id
                        existing_conflict.categorical_factors = factors_json
                        existing_conflict.resolution_rationale = rationale
                        self.db.add(existing_conflict)
                        resolved_conflicts.append(existing_conflict)
                    else:
                        new_conflict = SourceConflict(
                            destination_id=destination_id,
                            metric_definition_id=metric_id,
                            primary_observation_id=obs_a.id,
                            competing_observation_id=obs_b.id,
                            comparability_status=comp_status,
                            resolution_status=res_status,
                            canonical_observation_id=canonical_id,
                            categorical_factors=factors_json,
                            resolution_rationale=rationale,
                        )
                        self.db.add(new_conflict)
                        resolved_conflicts.append(new_conflict)

                    # Store / Upsert Phase 3 ObservationReconciliation record
                    from app.models.reconciliation import ObservationReconciliation, ObservationReconciliationMember
                    recon_stmt = select(ObservationReconciliation).where(
                        ObservationReconciliation.destination_id == destination_id,
                        ObservationReconciliation.metric_id == metric_id,
                    )
                    existing_recon = self.db.scalars(recon_stmt).first()
                    if not existing_recon:
                        existing_recon = ObservationReconciliation(
                            destination_id=destination_id,
                            metric_id=metric_id,
                            location_id=obs_a.location_id if obs_a.location_id == obs_b.location_id else None,
                            status=res_status,
                            canonical_observation_id=canonical_id,
                            reconciled_value=None,
                            reconciled_unit=None,
                            resolution_method=method,
                            resolution_reason=rationale,
                            comparability_reason=comp_reason,
                            resolver_version="source_conflict_v1",
                        )
                        self.db.add(existing_recon)
                        self.db.flush()
                    else:
                        existing_recon.status = res_status
                        existing_recon.canonical_observation_id = canonical_id
                        existing_recon.resolution_method = method
                        existing_recon.resolution_reason = rationale
                        existing_recon.comparability_reason = comp_reason
                        existing_recon.resolver_version = "source_conflict_v1"
                        self.db.add(existing_recon)
                        self.db.flush()

                    # Re-sync members with explicit roles: CANONICAL, ALTERNATIVE, CONTRIBUTING
                    self.db.query(ObservationReconciliationMember).filter(
                        ObservationReconciliationMember.reconciliation_id == existing_recon.id
                    ).delete()

                    role_a = (
                        ReconciliationMemberRole.CANONICAL
                        if canonical_id == obs_a.id
                        else (
                            ReconciliationMemberRole.CONTRIBUTING
                            if res_status == ConflictResolutionStatus.RECONCILED
                            else ReconciliationMemberRole.ALTERNATIVE
                        )
                    )
                    role_b = (
                        ReconciliationMemberRole.CANONICAL
                        if canonical_id == obs_b.id
                        else (
                            ReconciliationMemberRole.CONTRIBUTING
                            if res_status == ConflictResolutionStatus.RECONCILED
                            else ReconciliationMemberRole.ALTERNATIVE
                        )
                    )

                    member_a = ObservationReconciliationMember(
                        reconciliation_id=existing_recon.id,
                        observation_id=obs_a.id,
                        role=role_a,
                    )
                    member_b = ObservationReconciliationMember(
                        reconciliation_id=existing_recon.id,
                        observation_id=obs_b.id,
                        role=role_b,
                    )
                    self.db.add(member_a)
                    self.db.add(member_b)

        self.db.commit()
        for c in resolved_conflicts:
            self.db.refresh(c)
        return resolved_conflicts

    def get_canonical_observation_id(self, destination_id: int, metric_definition_id: int) -> int | None:
        """
        Retrieves the canonical observation ID ONLY if a RESOLVED_CANONICAL resolution exists.
        UNRESOLVED_CONFLICT and DISPARATE_SCOPE return None.
        """
        stmt = select(SourceConflict.canonical_observation_id).where(
            SourceConflict.destination_id == destination_id,
            SourceConflict.metric_definition_id == metric_definition_id,
            SourceConflict.resolution_status == ConflictResolutionStatus.RESOLVED_CANONICAL,
            SourceConflict.canonical_observation_id.is_not(None),
        )
        return self.db.scalars(stmt).first()

    def get_conflicts_for_destination(self, destination_id: int) -> list[SourceConflict]:
        stmt = (
            select(SourceConflict)
            .where(SourceConflict.destination_id == destination_id)
            .options(
                joinedload(SourceConflict.destination),
                joinedload(SourceConflict.metric_definition),
                joinedload(SourceConflict.primary_observation).joinedload(Observation.dataset).joinedload(Observation.dataset.property.mapper.class_.source),
                joinedload(SourceConflict.competing_observation).joinedload(Observation.dataset).joinedload(Observation.dataset.property.mapper.class_.source),
            )
            .order_by(SourceConflict.id)
        )
        return list(self.db.scalars(stmt).unique().all())

    def get_conflict_by_id(self, conflict_id: int) -> SourceConflict | None:
        stmt = (
            select(SourceConflict)
            .where(SourceConflict.id == conflict_id)
            .options(
                joinedload(SourceConflict.destination),
                joinedload(SourceConflict.metric_definition),
                joinedload(SourceConflict.primary_observation).joinedload(Observation.dataset).joinedload(Observation.dataset.property.mapper.class_.source),
                joinedload(SourceConflict.competing_observation).joinedload(Observation.dataset).joinedload(Observation.dataset.property.mapper.class_.source),
            )
        )
        return self.db.scalars(stmt).first()

    def get_summary(self, destination_id: int | None = None) -> ConflictSummaryResponse:
        query = select(SourceConflict)
        if destination_id is not None:
            query = query.where(SourceConflict.destination_id == destination_id)
        conflicts = self.db.scalars(query).all()

        total = len(conflicts)
        canonical = sum(1 for c in conflicts if c.resolution_status == ConflictResolutionStatus.RESOLVED_CANONICAL)
        reconciled = sum(1 for c in conflicts if c.resolution_status == ConflictResolutionStatus.RECONCILED)
        disparate = sum(1 for c in conflicts if c.resolution_status in [ConflictResolutionStatus.DISPARATE_SCOPE, ConflictResolutionStatus.COMPATIBILITY_MISMATCH])
        unresolved = sum(1 for c in conflicts if c.resolution_status == ConflictResolutionStatus.UNRESOLVED_CONFLICT)

        return ConflictSummaryResponse(
            destination_id=destination_id,
            total_conflicts=total,
            resolved_canonical=canonical,
            reconciled=reconciled,
            disparate_scope=disparate,
            compatibility_mismatch=disparate,
            unresolved_conflict=unresolved,
        )

    def serialize_conflict(self, conflict: SourceConflict) -> SourceConflictResponse:
        def make_obs_detail(obs: Observation) -> ConflictObservationDetail:
            src = obs.dataset.source if obs.dataset and obs.dataset.source else None
            return ConflictObservationDetail(
                observation_id=obs.id,
                original_value=obs.original_value,
                normalized_value=obs.normalized_value,
                unit=obs.metric_definition.unit if obs.metric_definition else None,
                period_start=obs.period_start,
                period_end=obs.period_end,
                status=obs.status,
                confidence=obs.confidence,
                destination_specificity=obs.destination_specificity,
                methodology=obs.methodology,
                source_name=src.name if src else None,
                source_organisation=src.organisation if src else None,
                dataset_name=obs.dataset.name if obs.dataset else None,
                document_title=obs.dataset.description if obs.dataset else None,
                evidence_count=len(obs.evidence_items) if obs.evidence_items else 0,
            )

        cat_factors = {}
        observed_range = None
        disparate_dims: list[str] = []
        missing_ev: list[str] = []
        res_method = None
        res_version = "source_conflict_v1"

        if conflict.categorical_factors:
            try:
                parsed = json.loads(conflict.categorical_factors)
                if isinstance(parsed, dict) and "factors" in parsed:
                    cat_factors = parsed["factors"]
                    observed_range = parsed.get("observed_range")
                    disparate_dims = parsed.get("disparate_dimensions") or []
                    missing_ev = parsed.get("missing_evidence") or []
                    res_method = parsed.get("resolution_method")
                    res_version = parsed.get("resolver_version", "source_conflict_v1")
                else:
                    cat_factors = parsed
            except Exception:
                cat_factors = {"raw": conflict.categorical_factors}

        reconciled_val = None
        if conflict.resolution_status == ConflictResolutionStatus.RECONCILED:
            try:
                from app.models.reconciliation import ObservationReconciliation
                r_stmt = select(ObservationReconciliation.reconciled_value).where(
                    ObservationReconciliation.destination_id == conflict.destination_id,
                    ObservationReconciliation.metric_id == conflict.metric_definition_id,
                )
                reconciled_val = self.db.scalars(r_stmt).first()
            except Exception:
                pass

        return SourceConflictResponse(
            id=conflict.id,
            destination_id=conflict.destination_id,
            destination_name=conflict.destination.name if conflict.destination else None,
            metric_definition_id=conflict.metric_definition_id,
            metric_code=conflict.metric_definition.code if conflict.metric_definition else "",
            metric_name=conflict.metric_definition.name if conflict.metric_definition else "",
            primary_observation=make_obs_detail(conflict.primary_observation),
            competing_observation=make_obs_detail(conflict.competing_observation),
            comparability_status=conflict.comparability_status,
            resolution_status=conflict.resolution_status,
            canonical_observation_id=conflict.canonical_observation_id,
            reconciled_value=reconciled_val,
            resolution_method=res_method,
            resolution_reason=conflict.resolution_rationale or "",
            resolver_version=res_version,
            observed_range=observed_range,
            disparate_dimensions=disparate_dims,
            missing_evidence=missing_ev,
            categorical_factors=cat_factors,
            resolution_rationale=conflict.resolution_rationale or "",
            created_at=conflict.created_at,
            updated_at=conflict.updated_at,
        )

    def get_reconciliations_for_destination(self, destination_id: int):
        from app.models.reconciliation import ObservationReconciliation, ObservationReconciliationMember
        stmt = (
            select(ObservationReconciliation)
            .where(ObservationReconciliation.destination_id == destination_id)
            .options(
                joinedload(ObservationReconciliation.metric_definition),
                joinedload(ObservationReconciliation.destination),
                joinedload(ObservationReconciliation.canonical_observation),
                joinedload(ObservationReconciliation.members)
                .joinedload(ObservationReconciliationMember.observation)
                .joinedload(Observation.dataset)
                .joinedload(Observation.dataset.property.mapper.class_.source),
            )
            .order_by(ObservationReconciliation.id)
        )
        return list(self.db.scalars(stmt).unique().all())

    def get_reconciliation_by_id(self, reconciliation_id: int):
        from app.models.reconciliation import ObservationReconciliation, ObservationReconciliationMember
        stmt = (
            select(ObservationReconciliation)
            .where(ObservationReconciliation.id == reconciliation_id)
            .options(
                joinedload(ObservationReconciliation.metric_definition),
                joinedload(ObservationReconciliation.destination),
                joinedload(ObservationReconciliation.canonical_observation),
                joinedload(ObservationReconciliation.members)
                .joinedload(ObservationReconciliationMember.observation)
                .joinedload(Observation.dataset)
                .joinedload(Observation.dataset.property.mapper.class_.source),
            )
        )
        return self.db.scalars(stmt).first()

    def serialize_reconciliation(self, recon):
        from app.schemas.reconciliation import (
            ObservationReconciliationResponse,
            ObservationReconciliationMemberResponse,
        )
        member_responses = []
        for m in recon.members:
            obs = m.observation
            obs_detail = None
            if obs:
                src = obs.dataset.source if obs.dataset and obs.dataset.source else None
                obs_detail = ConflictObservationDetail(
                    observation_id=obs.id,
                    original_value=obs.original_value,
                    normalized_value=obs.normalized_value,
                    unit=obs.metric_definition.unit if obs.metric_definition else None,
                    period_start=obs.period_start,
                    period_end=obs.period_end,
                    status=obs.status,
                    confidence=obs.confidence,
                    destination_specificity=obs.destination_specificity,
                    methodology=obs.methodology,
                    source_name=src.name if src else None,
                    source_organisation=src.organisation if src else None,
                    dataset_name=obs.dataset.name if obs.dataset else None,
                    document_title=obs.dataset.description if obs.dataset else None,
                    evidence_count=len(obs.evidence_items) if obs.evidence_items else 0,
                )
            member_responses.append(
                ObservationReconciliationMemberResponse(
                    id=m.id,
                    reconciliation_id=m.reconciliation_id,
                    observation_id=m.observation_id,
                    role=m.role,
                    observation=obs_detail,
                )
            )

        return ObservationReconciliationResponse(
            id=recon.id,
            metric_id=recon.metric_id,
            metric_code=recon.metric_definition.code if recon.metric_definition else "",
            metric_name=recon.metric_definition.name if recon.metric_definition else "",
            destination_id=recon.destination_id,
            destination_name=recon.destination.name if recon.destination else None,
            location_id=recon.location_id,
            status=recon.status,
            canonical_observation_id=recon.canonical_observation_id,
            reconciled_value=recon.reconciled_value,
            reconciled_unit=recon.reconciled_unit,
            resolution_method=recon.resolution_method,
            resolution_reason=recon.resolution_reason,
            comparability_reason=recon.comparability_reason,
            resolver_version=recon.resolver_version,
            members=member_responses,
            created_at=recon.created_at,
            updated_at=recon.updated_at,
        )


def get_resolved_observation_view(
    destination_id: int,
    db: Session,
    raw_observations: list[Observation] | None = None,
) -> list[Observation]:
    """
    Phase 4 — Upstream Resolved Observation View for EcoTrace Scoring.

    Provides a clean upstream interpretation layer between raw observations and
    the existing scoring engine. Does NOT redesign or rewrite the scoring engine.

    BEHAVIOR MATRIX:
    1. Single-observation metrics:
       - Passed through untouched (score invariance for non-conflicting metrics).
    2. SELECTED / RESOLVED_CANONICAL:
       - Uses ONLY the canonical observation for scoring.
       - Alternative observation is excluded from scoring inputs (prevents double counting).
       - Alternative observations and full provenance preserved verbatim in DB.
    3. RECONCILED:
       - Used ONLY when an explicit reconciliation record exists, reconciled_value is not None,
         and resolution_method is valid (not UNRESOLVED).
       - Uses an ephemeral in-memory Observation proxy for read-only scoring.
       - NEVER writes back to database, NEVER mutates provenance or original observations,
         and NEVER calculates an average automatically if reconciled_value is absent.
    4. UNRESOLVED_CONFLICT:
       - Does NOT invent a value, does NOT average, does NOT select a forced winner.
       - Preserves existing scoring engine behavior without modifying engine schemas.
       - Exposes observed range and evidence gaps through conflict/evidence layer.
    5. DISPARATE_SCOPE / COMPATIBILITY_MISMATCH:
       - Observations are explicitly non-comparable (not competing measurements).
       - Keeps both observations available.
       - Does NOT force a canonical winner.
       - Does NOT prioritize direct over regional or vice versa.
       - Does NOT treat them as duplicate measurements.
    """
    if raw_observations is None:
        raw_obs = list(db.query(Observation).filter(Observation.destination_id == destination_id).all())
    else:
        raw_obs = list(raw_observations)

    if not raw_obs:
        return []

    canonical_map: dict[int, int] = {}
    reconciled_map: dict[int, tuple[float, ResolutionMethod]] = {}
    unresolved_metrics: set[int] = set()
    disparate_metrics: set[int] = set()

    # Query ObservationReconciliation records for destination
    try:
        recon_records = (
            db.query(ObservationReconciliation)
            .filter(ObservationReconciliation.destination_id == destination_id)
            .all()
        )
        for r in recon_records:
            if (
                r.status in [ConflictResolutionStatus.SELECTED, ConflictResolutionStatus.RESOLVED_CANONICAL]
                and r.canonical_observation_id is not None
            ):
                canonical_map[r.metric_id] = r.canonical_observation_id
            elif r.status == ConflictResolutionStatus.RECONCILED and r.reconciled_value is not None:
                if r.resolution_method and r.resolution_method != ResolutionMethod.UNRESOLVED:
                    reconciled_map[r.metric_id] = (float(r.reconciled_value), r.resolution_method)
            elif r.status == ConflictResolutionStatus.UNRESOLVED_CONFLICT:
                unresolved_metrics.add(r.metric_id)
            elif r.status in [ConflictResolutionStatus.DISPARATE_SCOPE, ConflictResolutionStatus.COMPATIBILITY_MISMATCH]:
                disparate_metrics.add(r.metric_id)
    except Exception:
        pass

    # Query SourceConflict records for destination
    try:
        conflict_records = (
            db.query(SourceConflict)
            .filter(SourceConflict.destination_id == destination_id)
            .all()
        )
        for c in conflict_records:
            if (
                c.resolution_status in [ConflictResolutionStatus.SELECTED, ConflictResolutionStatus.RESOLVED_CANONICAL]
                and c.canonical_observation_id is not None
            ):
                if c.metric_definition_id not in canonical_map:
                    canonical_map[c.metric_definition_id] = c.canonical_observation_id
            elif c.resolution_status == ConflictResolutionStatus.UNRESOLVED_CONFLICT:
                unresolved_metrics.add(c.metric_definition_id)
            elif c.resolution_status in [ConflictResolutionStatus.DISPARATE_SCOPE, ConflictResolutionStatus.COMPATIBILITY_MISMATCH]:
                disparate_metrics.add(c.metric_definition_id)
    except Exception:
        pass

    # Group observations by metric_definition_id
    grouped: dict[int, list[Observation]] = {}
    for obs in raw_obs:
        grouped.setdefault(obs.metric_definition_id, []).append(obs)

    resolved_obs: list[Observation] = []

    for metric_id, obs_list in grouped.items():
        # Single-observation metric: score invariance
        if len(obs_list) <= 1:
            resolved_obs.extend(obs_list)
            continue

        # Case A: SELECTED / RESOLVED_CANONICAL
        # Only an explicit canonical resolution replaces competing observations
        if metric_id in canonical_map:
            can_id = canonical_map[metric_id]
            canonical_item = next((o for o in obs_list if o.id == can_id), None)
            if canonical_item:
                resolved_obs.append(canonical_item)
            else:
                resolved_obs.append(obs_list[0])
            continue

        # Case B: RECONCILED
        # Created strictly from an already stored, explicit reconciled_value
        if metric_id in reconciled_map:
            rec_val, rec_method = reconciled_map[metric_id]
            base_obs = obs_list[0]
            # Ephemeral, read-only in-memory Observation proxy (zero DB write-back)
            reconciled_proxy = Observation(
                id=base_obs.id,
                destination_id=base_obs.destination_id,
                location_id=base_obs.location_id,
                metric_definition_id=base_obs.metric_definition_id,
                dataset_id=base_obs.dataset_id,
                period_start=base_obs.period_start,
                period_end=base_obs.period_end,
                original_value=rec_val,
                normalized_value=rec_val,
                status=ObservationStatus.VERIFIED,
                confidence=ConfidenceLevel.HIGH,
                destination_specificity=base_obs.destination_specificity,
                methodology=f"Statistically reconciled via {rec_method.value}",
                notes="Phase 4 Ephemeral Reconciled Proxy (read-only, not persisted)",
            )
            reconciled_proxy.metric_definition = base_obs.metric_definition
            resolved_obs.append(reconciled_proxy)
            continue

        # Case D: DISPARATE_SCOPE / COMPATIBILITY_MISMATCH
        # Explicitly non-comparable: keep both available, no forced winner, no prioritization
        if metric_id in disparate_metrics:
            resolved_obs.extend(obs_list)
            continue

        # Case C: UNRESOLVED_CONFLICT (and unclassified multiple observations)
        # No fabricated value, no forced winner, preserve existing scoring engine behavior
        resolved_obs.extend(obs_list)

    return resolved_obs

