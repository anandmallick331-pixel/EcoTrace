"""
Run full Chilika ingestion and Official Data Ingestion into s21_db.sqlite3
"""
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.chilika_ingestion import run_chilika_ingestion
from scripts.ingest_official_data import ingest_official_data
from app.db.session import SessionLocal
from app.models.metric import MetricDefinition
from app.models.observation import Observation

def main():
    print("=== STEP 1: Running Chilika Ingestion Service ===")
    report = run_chilika_ingestion(clean_existing=False)
    print(f"Ingestion Report: Records read: {report.records_read}, Inserted: {report.records_inserted}, Metrics loaded: {report.metrics_loaded}")

    print("\n=== STEP 2: Running Official Data Ingestion ===")
    ingest_official_data()

    print("\n=== STEP 3: Checking Ecosystem Health Metrics ===")
    db = SessionLocal()
    metrics = db.query(MetricDefinition).filter(
        (MetricDefinition.code.like("%ecosystem%")) |
        (MetricDefinition.code.like("%health%")) |
        (MetricDefinition.name.like("%Overall Ecosystem%"))
    ).all()

    for m in metrics:
        obs_list = db.query(Observation).filter(Observation.metric_definition_id == m.id).all()
        print(f"Metric ID {m.id}: code='{m.code}', name='{m.name}' -> {len(obs_list)} observations")
        for obs in obs_list:
            print(f"   Obs {obs.id}: val={obs.original_value}, norm={obs.normalized_value}, status={obs.status}")

    db.close()

if __name__ == "__main__":
    main()
