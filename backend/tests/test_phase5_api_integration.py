"""
Phase 5 Comprehensive Test Suite — API Integration for Source Conflicts.

Verifies:
1. Observation conflict lookup: GET /api/v1/observations/{observation_id}/conflicts
2. 404 for nonexistent observation
3. Empty result for observation with no conflict
4. Destination filter: GET /api/v1/conflicts?destination={id} & ?destination_id={id}
5. Metric filter: GET /api/v1/conflicts?metric={id} & ?metric_id={id}
6. Status filter: GET /api/v1/conflicts?status={status}
7. Combined filters: destination + metric + status
8. Backward compatibility of existing API responses
"""

import sys
from datetime import date
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.models.conflict import SourceConflict
from app.models.destination import Destination
from app.models.enums import (
    ComparabilityStatus,
    ConfidenceLevel,
    ConflictResolutionStatus,
    DestinationSpecificity,
    MetricDirection,
    ObservationStatus,
)
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def conflict_test_data(db: Session):
    """Seed test destination, metric, source, datasets, observations, and conflicts."""
    # Create or retrieve test destination
    dest = db.query(Destination).filter(Destination.id == 991).first()
    if not dest:
        dest = Destination(
            id=991,
            name="Phase 5 Test Destination",
            country_code="IND",
            region="Odisha",
            description="Test fixture destination for Phase 5 API audit",
        )
        db.add(dest)

    # Create or retrieve test metric
    metric = db.query(MetricDefinition).filter(MetricDefinition.id == 991).first()
    if not metric:
        metric = MetricDefinition(
            id=991,
            code="phase5_test_metric",
            name="Phase 5 Test Metric",
            category="Tourism",
            unit="visitors",
            direction=MetricDirection.HIGHER_IS_BETTER,
        )
        db.add(metric)

    # Create another metric for filtering tests
    metric2 = db.query(MetricDefinition).filter(MetricDefinition.id == 992).first()
    if not metric2:
        metric2 = MetricDefinition(
            id=992,
            code="phase5_other_metric",
            name="Phase 5 Other Metric",
            category="Waste",
            unit="TPD",
            direction=MetricDirection.LOWER_IS_BETTER,
        )
        db.add(metric2)

    # Create test source & datasets
    src = db.query(Source).filter(Source.name == "Phase 5 Source Authority").first()
    if not src:
        src = Source(name="Phase 5 Source Authority", organisation="Phase 5 Dept")
        db.add(src)
        db.flush()

    ds = db.query(Dataset).filter(Dataset.name == "Phase 5 Test Dataset").first()
    if not ds:
        ds = Dataset(name="Phase 5 Test Dataset", source_id=src.id)
        db.add(ds)
        db.flush()

    src_b = db.query(Source).filter(Source.name == "Phase 5 Secondary Source").first()
    if not src_b:
        src_b = Source(name="Phase 5 Secondary Source", organisation="Secondary Research Cell")
        db.add(src_b)
        db.flush()

    ds_b = db.query(Dataset).filter(Dataset.name == "Phase 5 Competing Dataset").first()
    if not ds_b:
        ds_b = Dataset(name="Phase 5 Competing Dataset", source_id=src_b.id)
        db.add(ds_b)
        db.flush()

    # Create observations
    obs_a = db.query(Observation).filter(Observation.id == 9901).first()
    if not obs_a:
        obs_a = Observation(
            id=9901,
            destination_id=991,
            metric_definition_id=991,
            dataset_id=ds.id,
            period_start=date(2025, 1, 1),
            period_end=date(2025, 12, 31),
            original_value=3500000.0,
            normalized_value=3500000.0,
            status=ObservationStatus.VERIFIED,
            confidence=ConfidenceLevel.HIGH,
            destination_specificity=DestinationSpecificity.DIRECT,
            methodology="Official statutory registry count",
        )
        db.add(obs_a)

    obs_b = db.query(Observation).filter(Observation.id == 9902).first()
    if not obs_b:
        obs_b = Observation(
            id=9902,
            destination_id=991,
            metric_definition_id=991,
            dataset_id=ds_b.id,
            period_start=date(2025, 1, 1),
            period_end=date(2025, 12, 31),
            original_value=3200000.0,
            normalized_value=3200000.0,
            status=ObservationStatus.RAW,
            confidence=ConfidenceLevel.MEDIUM,
            destination_specificity=DestinationSpecificity.DIRECT,
            methodology="Secondary survey estimate",
        )
        db.add(obs_b)

    # Observation with NO conflicts
    obs_solo = db.query(Observation).filter(Observation.id == 9903).first()
    if not obs_solo:
        obs_solo = Observation(
            id=9903,
            destination_id=991,
            metric_definition_id=992,
            dataset_id=ds.id,
            period_start=date(2025, 1, 1),
            period_end=date(2025, 12, 31),
            original_value=50.0,
            normalized_value=50.0,
            status=ObservationStatus.VERIFIED,
            confidence=ConfidenceLevel.HIGH,
            destination_specificity=DestinationSpecificity.DIRECT,
            methodology="Weighbridge direct log",
        )
        db.add(obs_solo)

    db.flush()

    # Create test conflicts
    conflict1 = db.query(SourceConflict).filter(SourceConflict.id == 9901).first()
    if not conflict1:
        conflict1 = SourceConflict(
            id=9901,
            destination_id=991,
            metric_definition_id=991,
            primary_observation_id=9901,
            competing_observation_id=9902,
            comparability_status=ComparabilityStatus.COMPARABLE,
            resolution_status=ConflictResolutionStatus.RESOLVED_CANONICAL,
            canonical_observation_id=9901,
            resolution_rationale="Primary source demonstrates domain authority and verification.",
        )
        db.add(conflict1)

    conflict2 = db.query(SourceConflict).filter(SourceConflict.id == 9902).first()
    if not conflict2:
        conflict2 = SourceConflict(
            id=9902,
            destination_id=991,
            metric_definition_id=992,
            primary_observation_id=9901,
            competing_observation_id=9902,
            comparability_status=ComparabilityStatus.COMPARABLE,
            resolution_status=ConflictResolutionStatus.UNRESOLVED_CONFLICT,
            canonical_observation_id=None,
            resolution_rationale="Both sources credible; unresolved variance.",
        )
        db.add(conflict2)

    db.commit()

    return {
        "destination": dest,
        "metric": metric,
        "metric2": metric2,
        "obs_a": obs_a,
        "obs_b": obs_b,
        "obs_solo": obs_solo,
        "conflict1": conflict1,
        "conflict2": conflict2,
    }


# ── 1. Observation Conflict Lookup ─────────────────────────────────────────────

def test_observation_conflict_lookup(client: TestClient, conflict_test_data):
    """
    GET /api/v1/observations/{observation_id}/conflicts
    Returns conflicts in which the observation participates (primary, competing, or canonical).
    """
    obs_id = conflict_test_data["obs_a"].id
    res = client.get(f"/api/v1/observations/{obs_id}/conflicts")

    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    conflict = next((c for c in data if c["id"] == 9901), None)
    assert conflict is not None
    assert conflict["destination_id"] == 991
    assert conflict["metric_definition_id"] == 991
    assert conflict["resolution_status"] == "resolved_canonical"
    assert conflict["canonical_observation_id"] == obs_id
    assert conflict["primary_observation"]["observation_id"] == obs_id
    assert conflict["competing_observation"]["observation_id"] == conflict_test_data["obs_b"].id
    assert "resolution_rationale" in conflict
    assert conflict["resolution_rationale"] is not None


# ── 2. 404 for Nonexistent Observation ─────────────────────────────────────────

def test_observation_conflict_lookup_404_nonexistent(client: TestClient):
    """
    GET /api/v1/observations/{observation_id}/conflicts
    Must return 404 only when the observation itself does not exist.
    """
    res = client.get("/api/v1/observations/9999999/conflicts")

    assert res.status_code == 404
    data = res.json()
    assert "not found" in data["detail"].lower()
    assert "9999999" in data["detail"]


# ── 3. Empty Result for Observation with No Conflict ──────────────────────────

def test_observation_conflict_lookup_empty_when_no_conflicts(client: TestClient, conflict_test_data):
    """
    GET /api/v1/observations/{observation_id}/conflicts
    Must return 200 with an empty list if observation exists but has no conflicts.
    """
    solo_id = conflict_test_data["obs_solo"].id
    res = client.get(f"/api/v1/observations/{solo_id}/conflicts")

    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 0


# ── 4. Destination Filter ──────────────────────────────────────────────────────

def test_conflicts_destination_filter(client: TestClient, conflict_test_data):
    """
    GET /api/v1/conflicts?destination_id={id} and ?destination={id}
    Filters correctly by target destination.
    """
    dest_id = conflict_test_data["destination"].id

    # Test via destination_id
    res1 = client.get(f"/api/v1/conflicts?destination_id={dest_id}")
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1) >= 2
    assert all(c["destination_id"] == dest_id for c in data1)

    # Test via destination alias
    res2 = client.get(f"/api/v1/conflicts?destination={dest_id}")
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2) >= 2
    assert all(c["destination_id"] == dest_id for c in data2)


# ── 5. Metric Filter ───────────────────────────────────────────────────────────

def test_conflicts_metric_filter(client: TestClient, conflict_test_data):
    """
    GET /api/v1/conflicts?metric_id={id} and ?metric={id}
    Filters correctly by metric definition.
    """
    m_id = conflict_test_data["metric"].id

    # Test via metric_id
    res1 = client.get(f"/api/v1/conflicts?metric_id={m_id}")
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1) >= 1
    assert all(c["metric_definition_id"] == m_id for c in data1)

    # Test via metric alias
    res2 = client.get(f"/api/v1/conflicts?metric={m_id}")
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2) >= 1
    assert all(c["metric_definition_id"] == m_id for c in data2)


# ── 6. Status Filter ───────────────────────────────────────────────────────────

def test_conflicts_status_filter(client: TestClient, conflict_test_data):
    """
    GET /api/v1/conflicts?status={status}
    Filters correctly by resolution status.
    """
    res = client.get("/api/v1/conflicts?status=resolved_canonical")

    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert all(c["resolution_status"] == "resolved_canonical" for c in data)


# ── 7. Combined Filters ────────────────────────────────────────────────────────

def test_conflicts_combined_filters(client: TestClient, conflict_test_data):
    """
    GET /api/v1/conflicts?destination={id}&metric={id}&status={status}
    Applies conjunction of all supplied filters.
    """
    dest_id = conflict_test_data["destination"].id
    m_id = conflict_test_data["metric"].id

    res = client.get(f"/api/v1/conflicts?destination={dest_id}&metric={m_id}&status=resolved_canonical")

    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    for c in data:
        assert c["destination_id"] == dest_id
        assert c["metric_definition_id"] == m_id
        assert c["resolution_status"] == "resolved_canonical"


# ── 8. Backward Compatibility of Existing API Responses ────────────────────────

def test_backward_compatibility_existing_api_responses(client: TestClient, conflict_test_data):
    """
    Verifies that existing endpoints continue to return their established schemas:
    - GET /api/v1/conflicts (collection)
    - GET /api/v1/conflicts/{id} (item)
    - GET /api/v1/conflicts/summary (summary)
    - GET /api/v1/conflicts/reconciliations (Phase 3 recons)
    """
    # 1. Collection endpoint schema integrity
    res_list = client.get("/api/v1/conflicts")
    assert res_list.status_code == 200
    items = res_list.json()
    assert isinstance(items, list)
    if items:
        item = items[0]
        for field in [
            "id",
            "destination_id",
            "metric_definition_id",
            "metric_code",
            "metric_name",
            "primary_observation",
            "competing_observation",
            "comparability_status",
            "resolution_status",
            "resolution_rationale",
            "created_at",
            "updated_at",
        ]:
            assert field in item, f"Missing required field {field} in conflict response"

    # 2. Individual item endpoint
    res_item = client.get("/api/v1/conflicts/9901")
    assert res_item.status_code == 200
    single = res_item.json()
    assert single["id"] == 9901
    assert single["metric_code"] == "phase5_test_metric"

    # 3. Summary endpoint
    res_summary = client.get("/api/v1/conflicts/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert "total_conflicts" in summary
    assert "resolved_canonical" in summary
    assert "unresolved_conflict" in summary

    # 4. Reconciliations endpoint
    res_recon = client.get("/api/v1/conflicts/reconciliations")
    assert res_recon.status_code == 200
    assert isinstance(res_recon.json(), list)
