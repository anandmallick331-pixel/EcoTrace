"""
Check metric categories, observation values, and true computed averages
"""
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal
from app.models.metric import MetricDefinition
from app.models.observation import Observation

def main():
    db = SessionLocal()

    obs_list = db.query(Observation).all()
    print(f"Total Observations: {len(obs_list)}")

    cat_map = {}
    for obs in obs_list:
        if obs.normalized_value is None:
            continue
        mdef = obs.metric_definition
        cat = mdef.category if mdef and mdef.category else "Unassigned"
        if cat not in cat_map:
            cat_map[cat] = []
        cat_map[cat].append((mdef.code, float(obs.normalized_value)))

    print("\n--- COMPUTED EMPIRICAL CATEGORY AVERAGES FROM REAL DATABASE TELEMETRY ---")
    for cat, vals in cat_map.items():
        avg_val = sum(v[1] for v in vals) / len(vals)
        print(f"Category '{cat}': {len(vals)} observations -> Avg Value: {round(avg_val, 2)}")
        for code, val in vals[:5]:
            print(f"   - {code}: {val}")

    db.close()

if __name__ == "__main__":
    main()
