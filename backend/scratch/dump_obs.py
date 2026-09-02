import sqlite3
import json

conn = sqlite3.connect('c:/S21_new/backend/s21_db.sqlite3')
cur = conn.cursor()

cur.execute("""
    SELECT d.id, d.name, m.code, m.name, m.category, m.unit, o.original_value, o.normalized_value, o.period_start, o.period_end, o.notes
    FROM observations o 
    JOIN metric_definitions m ON o.metric_definition_id = m.id 
    JOIN destinations d ON o.destination_id = d.id
    ORDER BY d.id, m.category, m.code
""")
rows = cur.fetchall()
data = []
for r in rows:
    data.append({
        "dest_id": r[0],
        "dest_name": r[1],
        "metric_code": r[2],
        "metric_name": r[3],
        "category": r[4],
        "unit": r[5],
        "original_value": r[6],
        "normalized_value": r[7],
        "period_start": r[8],
        "period_end": r[9],
        "notes": r[10]
    })

with open("c:/S21_new/backend/scratch/obs_dump.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Dumped {len(data)} observations to scratch/obs_dump.json")
