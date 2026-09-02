"""
Unit and Integration Tests for Business Registrations Workflow.

Validates:
1. Submission persistence & server-side tracking ID generation
2. Strict initial status = PENDING_VERIFICATION (never auto-verified)
3. Retrieval by ID and tracking ID with destination filtering
4. Status update transitions (VERIFIED, REJECTED, UNDER_AUDIT) with audit notes
5. Recommendation eligibility: pending and rejected submissions are excluded from verified public listings
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.main import app
from app.models.enums import BusinessRegistrationStatus
from app.repositories.business_registration import BusinessRegistrationRepository
from app.schemas.business_registration import BusinessRegistrationCreate, BusinessRegistrationStatusUpdate


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


def test_business_registration_submission(client: TestClient):
    payload = {
        "business_name": "Mangalajodi Community Ecotourism Birding Guild",
        "business_type": "Community Guide / Tour",
        "destination_id": 44,
        "location": "Mangalajodi Wetland Node, Chilika",
        "contact": "Kishore Behera, +91 94370 11223, info@mangalajoditourism.org",
        "website": "https://mangalajodibirding.org",
        "price_range": "₹1,500 - ₹2,800 / guided skiff tour",
        "local_employees": 45,
        "local_procurement_percent": 95.0,
        "community_ownership": "Community Cooperative (Former Poachers Rehabilitation Guild)",
        "environmental_practices": [
            "Hand-poled wooden skiffs (zero acoustic or diesel disturbance in bird habitats)",
            "Zero single-use plastic onboard policy",
            "Mandatory 30m distance rule for migratory waterfowl",
            "100% former poachers turned protected naturalists"
        ],
        "evidence_details": "Society Registration #COOP-KHORDHA-4410, Forest Dept Wildlife Guide Permit #WL-CHL-2025-08."
    }

    response = client.post("/api/v1/business-registrations", json=payload)
    assert response.status_code == 201, f"Expected 201 Created, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data["business_name"] == payload["business_name"]
    assert data["status"] == "PENDING_VERIFICATION", "Submission must NEVER be automatically marked VERIFIED"
    assert data["tracking_id"].startswith("ECO-REG-2026-"), "Tracking ID must be generated server-side with standard prefix"
    assert data["destination_id"] == 44
    assert len(data["environmental_practices"]) == 4
    assert data["submitted_at"] is not None
    assert data["reviewed_at"] is None
    assert data["reviewed_by"] is None


def test_business_registration_retrieval(client: TestClient):
    payload = {
        "business_name": "Puri Artisans Palm Leaf Engraving Society",
        "business_type": "Artisan / Handicraft Co-op",
        "destination_id": 103,
        "location": "Crafts Lane, Raghurajpur, Puri",
        "contact": "Subhashree Moharana, +91 98610 99881, subha@puriartisan.org",
        "website": "https://puriartisan.org",
        "price_range": "₹500 - ₹3,000 / master scroll",
        "local_employees": 30,
        "local_procurement_percent": 98.0,
        "community_ownership": "100% Local Resident Owned",
        "environmental_practices": [
            "All-natural organic pigments (vegetable & stone extracts)",
            "Sustainable sun-dried palm leaves",
            "Zero synthetic chemical effluent"
        ],
        "evidence_details": "Geographical Indication GI Registration #GI-OD-082, MSME Udyam #UDYAM-OD-19-009941."
    }

    create_res = client.post("/api/v1/business-registrations", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    reg_id = created["id"]
    tracking_id = created["tracking_id"]

    # 1. Get by numeric ID
    res_by_id = client.get(f"/api/v1/business-registrations/{reg_id}")
    assert res_by_id.status_code == 200
    assert res_by_id.json()["tracking_id"] == tracking_id

    # 2. Get by tracking ID
    res_by_track = client.get(f"/api/v1/business-registrations/{tracking_id}")
    assert res_by_track.status_code == 200
    assert res_by_track.json()["id"] == reg_id

    # 3. List with destination filter
    list_res = client.get(f"/api/v1/business-registrations?destination_id=103")
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert any(item["tracking_id"] == tracking_id for item in items)


def test_business_registration_status_transitions(client: TestClient):
    payload = {
        "business_name": "Konark Sun Temple Eco-Rickshaw Consortium",
        "business_type": "Boat Operator / Transport",
        "destination_id": 102,
        "location": "Bus Stand to Sun Temple Gate, Konark",
        "contact": "Trilochan Biswal, +91 97781 44556, rickshaw@konarkeco.org",
        "price_range": "₹150 - ₹400 / zero-emission transfer",
        "local_employees": 60,
        "local_procurement_percent": 90.0,
        "community_ownership": "Community Cooperative",
        "environmental_practices": [
            "100% Electric Solar-charged E-Rickshaws",
            "Strict non-motorized buffer zone compliance around 13th-century monument",
            "Fixed union meter tariffs preventing tourist overcharging"
        ],
        "evidence_details": "Konark NAC Transport Permit #KNR-NAC-2025-091, Cooperative Society Reg #COOP-PURI-1102."
    }

    create_res = client.post("/api/v1/business-registrations", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    reg_id = created["id"]

    # 1. Update to UNDER_AUDIT
    audit_update = {
        "status": "UNDER_AUDIT",
        "reviewed_by": "Audit Officer Das (OTDC Regional Verification Unit)",
        "review_notes": "Trade license and union roster verified; conducting battery charging station inspection."
    }
    audit_res = client.patch(f"/api/v1/business-registrations/{reg_id}/status", json=audit_update)
    assert audit_res.status_code == 200
    audited = audit_res.json()
    assert audited["status"] == "UNDER_AUDIT"
    assert audited["reviewed_by"] == audit_update["reviewed_by"]
    assert audited["reviewed_at"] is not None

    # 2. Update to VERIFIED
    verify_update = {
        "status": "VERIFIED",
        "reviewed_by": "Senior Tourism Auditor Pradhan",
        "review_notes": "Telemetry and licensing checks complete. Approved for S21 verified recommendation engine."
    }
    verify_res = client.patch(f"/api/v1/business-registrations/{reg_id}/status", json=verify_update)
    assert verify_res.status_code == 200
    verified = verify_res.json()
    assert verified["status"] == "VERIFIED"
    assert verified["reviewed_by"] == verify_update["reviewed_by"]


def test_business_registration_rejection(client: TestClient):
    payload = {
        "business_name": "Uncertified Speedboat Rentals (Mock Non-Compliant)",
        "business_type": "Boat Operator / Transport",
        "destination_id": 44,
        "location": "Illegal Creek Dock, Chilika",
        "contact": "Unknown, +91 90000 00000",
        "price_range": "₹5,000 / high speed run",
        "local_employees": 2,
        "local_procurement_percent": 10.0,
        "community_ownership": "Other",
        "environmental_practices": ["None"],
        "evidence_details": "No statutory permit submitted."
    }

    create_res = client.post("/api/v1/business-registrations", json=payload)
    assert create_res.status_code == 201
    reg_id = create_res.json()["id"]

    reject_update = {
        "status": "REJECTED",
        "reviewed_by": "CDA Enforcement Directorate",
        "review_notes": "Failed acoustic limit test in dolphin habitat and lack of statutory registration."
    }
    reject_res = client.patch(f"/api/v1/business-registrations/{reg_id}/status", json=reject_update)
    assert reject_res.status_code == 200
    rejected = reject_res.json()
    assert rejected["status"] == "REJECTED"


def test_recommendation_eligibility_enforcement(client: TestClient):
    """
    Ensures that when querying verified businesses for recommendations,
    pending and rejected submissions are strictly excluded.
    """
    # 1. Fetch only verified businesses
    verified_res = client.get("/api/v1/business-registrations?status=VERIFIED")
    assert verified_res.status_code == 200
    verified_items = verified_res.json()["items"]
    for item in verified_items:
        assert item["status"] == "VERIFIED", "All returned items must have status=VERIFIED"

    # 2. Fetch pending businesses
    pending_res = client.get("/api/v1/business-registrations?status=PENDING_VERIFICATION")
    assert pending_res.status_code == 200
    pending_items = pending_res.json()["items"]
    for item in pending_items:
        assert item["status"] == "PENDING_VERIFICATION"


if __name__ == "__main__":
    pytest.main(["-v", __file__])
