"""
Check if metric definitions and observations exist for the 2 metrics shown in the user's images.
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

    print("=== METRIC 1 AUDIT: Local Spending Retention Rate ===")
    m1_list = db.query(MetricDefinition).filter(
        (MetricDefinition.name.like("%retention%")) |
        (MetricDefinition.code.like("%retention%")) |
        (MetricDefinition.name.like("%Local Spending%")) |
        (MetricDefinition.code.like("%local_spending%"))
    ).all()

    print(f"MetricDefinitions found matching 'Local Spending / Retention': {len(m1_list)}")
    for m in m1_list:
        obs = db.query(Observation).filter(Observation.metric_definition_id == m.id, Observation.destination_id == 1).all()
        print(f"   Metric ID {m.id} | Code: '{m.code}' | Name: '{m.name}'")
        print(f"   -> Total Observations in DB for Chilika: {len(obs)}")
        for o in obs:
            print(f"        Obs ID {o.id}: norm_val={o.normalized_value}, orig_val={o.original_value}, status={o.status}")

    print("\n=== METRIC 2 AUDIT: Aquifer Drawdown & Water Stress ===")
    m2_list = db.query(MetricDefinition).filter(
        (MetricDefinition.name.like("%aquifer%")) |
        (MetricDefinition.code.like("%aquifer%")) |
        (MetricDefinition.name.like("%water_stress%")) |
        (MetricDefinition.code.like("%water_stress%")) |
        (MetricDefinition.name.like("%drawdown%")) |
        (MetricDefinition.code.like("%drawdown%"))
    ).all()

    print(f"MetricDefinitions found matching 'Aquifer Drawdown / Water Stress': {len(m2_list)}")
    for m in m2_list:
        obs = db.query(Observation).filter(Observation.metric_definition_id == m.id, Observation.destination_id == 1).all()
        print(f"   Metric ID {m.id} | Code: '{m.code}' | Name: '{m.name}'")
        print(f"   -> Total Observations in DB for Chilika: {len(obs)}")
        for o in obs:
            print(f"        Obs ID {o.id}: norm_val={o.normalized_value}, orig_val={o.original_value}, status={o.status}")

    print("\n=== LIST ALL WATER & ECONOMY METRICS IN DATABASE ===")
    all_metrics = db.query(MetricDefinition).all()
    print(f"Total Metric Definitions in DB: {len(all_metrics)}")
    for m in all_metrics:
        if any(kw in (m.name + m.code).lower() for kw in ['water', 'aquifer', 'drawdown', 'stress', 'spending', 'retention', 'local']):
            print(f"   Metric ID {m.id}: code='{m.code}', name='{m.name}', category='{m.category}'")

    db.close()

if __name__ == "__main__":
    main()
