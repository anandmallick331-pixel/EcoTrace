"""
Inspect and ingest authoritative official telemetry into PostgreSQL
"""
import os
import sys
from datetime import date

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Source, Dataset
from app.models.evidence import Evidence
from app.models.enums import ObservationStatus, ConfidenceLevel, DestinationSpecificity, EvidenceType

def main():
    db = SessionLocal()

    # Search for ecosystem_health metrics
    metrics = db.query(MetricDefinition).filter(
        (MetricDefinition.code.like("%ecosystem%")) |
        (MetricDefinition.name.like("%Ecosystem%")) |
        (MetricDefinition.name.like("%Health Grade%"))
    ).all()

    print("Found Ecosystem Health Metrics:")
    for m in metrics:
        print(f"  ID: {m.id} | Code: {m.code} | Name: {m.name} | Category: {m.category}")
        obs_list = db.query(Observation).filter(Observation.metric_definition_id == m.id).all()
        print(f"    Existing Observations ({len(obs_list)}):")
        for obs in obs_list:
            print(f"      Obs ID: {obs.id} | Val: {obs.original_value} | NormVal: {obs.normalized_value} | Status: {obs.status}")

    db.close()

if __name__ == "__main__":
    main()
