"""
Inspect all metric definitions in SQLite DB
"""
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Source, Dataset
from app.models.evidence import Evidence

def main():
    db = SessionLocal()

    print("=== ALL METRIC DEFINITIONS IN DATABASE ===")
    all_metrics = db.query(MetricDefinition).all()
    print(f"Total Metric Definitions: {len(all_metrics)}")
    for m in all_metrics:
        obs_count = db.query(Observation).filter(Observation.metric_definition_id == m.id).count()
        valid_obs = db.query(Observation).filter(Observation.metric_definition_id == m.id, Observation.normalized_value.isnot(None)).count()
        print(f"[{m.id}] code='{m.code}', name='{m.name}', cat='{m.category}' -> total_obs={obs_count}, valid_obs={valid_obs}")

    db.close()

if __name__ == "__main__":
    main()
