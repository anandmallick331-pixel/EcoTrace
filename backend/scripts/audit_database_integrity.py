"""
Comprehensive Database Integrity and Provenance Audit for Chilika Lagoon (Destination ID = 1)
"""
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal
from app.models.destination import Destination, Location
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Source, Dataset
from app.models.evidence import Evidence

def audit_database():
    db = SessionLocal()

    print("==================================================================")
    print("      CHILIKA LAGOON (DESTINATION ID 1) DATABASE AUDIT REPORT     ")
    print("==================================================================")

    dest = db.query(Destination).filter(Destination.id == 1).first()
    if not dest:
        print("ERROR: Destination ID 1 not found!")
        db.close()
        return

    print(f"Destination: ID={dest.id}, Name='{dest.name}', Region='{dest.region}'")

    # Locations
    locations = db.query(Location).filter(Location.destination_id == 1).all()
    print(f"\n1. Registered Physical Monitoring Stations ({len(locations)} stations):")
    for loc in locations[:5]:
        print(f"   - Station ID {loc.id}: '{loc.label}' @ Lat: {loc.latitude}, Lng: {loc.longitude}")

    # Observations
    all_obs = db.query(Observation).filter(Observation.destination_id == 1).all()
    print(f"\n2. Recorded Telemetry Observations ({len(all_obs)} total records):")
    
    valid_obs = [o for o in all_obs if o.normalized_value is not None]
    uncomputed_obs = [o for o in all_obs if o.normalized_value is None]
    print(f"   - Valid Numeric Telemetry Records: {len(valid_obs)}")
    print(f"   - Qualitative / Uncomputed Records: {len(uncomputed_obs)}")

    # Evidence linkage audit
    obs_ids = [o.id for o in all_obs]
    evidence_records = db.query(Evidence).filter(Evidence.observation_id.in_(obs_ids)).all() if obs_ids else []
    print(f"\n3. Cryptographic Evidence & Citation Linkages:")
    print(f"   - Total Evidence Records Linked to Chilika: {len(evidence_records)}")

    evidence_by_obs = {e.observation_id: e for e in evidence_records}
    obs_with_evidence = [o for o in all_obs if o.id in evidence_by_obs]
    print(f"   - Observations with Direct Citation Evidence: {len(obs_with_evidence)} / {len(all_obs)}")

    # Group by MetricDefinition
    metric_ids = list(set(o.metric_definition_id for o in all_obs))
    metrics = db.query(MetricDefinition).filter(MetricDefinition.id.in_(metric_ids)).all() if metric_ids else []
    print(f"\n4. Distinct Monitored Metric Definitions ({len(metrics)} distinct metrics):")
    
    metrics_summary = []
    for m in metrics:
        m_obs = [o for o in all_obs if o.metric_definition_id == m.id]
        m_valid = [o for o in m_obs if o.normalized_value is not None]
        m_ev = [o for o in m_obs if o.id in evidence_by_obs]
        
        ds_ids = list(set(o.dataset_id for o in m_obs if o.dataset_id))
        datasets = db.query(Dataset).filter(Dataset.id.in_(ds_ids)).all() if ds_ids else []
        dataset_names = ", ".join(d.name for d in datasets)

        mean_val = (sum(o.normalized_value for o in m_valid) / len(m_valid)) if m_valid else None
        
        metrics_summary.append({
            "id": m.id,
            "code": m.code,
            "name": m.name,
            "category": m.category,
            "total_obs": len(m_obs),
            "valid_obs": len(m_valid),
            "evidence_count": len(m_ev),
            "datasets": dataset_names,
            "mean_val": round(mean_val, 2) if mean_val is not None else "Uncomputed"
        })

    for ms in sorted(metrics_summary, key=lambda x: x["category"] or ""):
        print(f"   [{ms['id']}] Category: '{ms['category']}' | Code: '{ms['code']}' | Name: '{ms['name']}'")
        print(f"        -> Obs Count: {ms['total_obs']} | Valid Numeric: {ms['valid_obs']} | Avg Value: {ms['mean_val']} | Datasets: {ms['datasets']}")

    # Check for orphan evidence or invalid FKs
    orphan_evidence = db.query(Evidence).filter(~Evidence.observation_id.in_(obs_ids)).all() if obs_ids else []
    print(f"\n5. Database Integrity Anomalies:")
    print(f"   - Orphan Evidence Records: {len(orphan_evidence)}")

    db.close()

if __name__ == "__main__":
    audit_database()
