import sqlite3
import os
import glob

conn = sqlite3.connect('c:/S21_new/backend/s21_db.sqlite3')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=== 1. ALL POPULATION METRIC DEFINITIONS IN DATABASE ===")
cur.execute("""
    SELECT id, code, name, category, unit, description 
    FROM metric_definitions 
    WHERE code LIKE '%pop%' OR name LIKE '%pop%' OR description LIKE '%pop%' OR description LIKE '%census%'
""")
for r in cur.fetchall():
    print(f"[{r['id']}] {r['code']} | {r['name']} | category: {r['category']} | unit: {r['unit']}")

print("\n=== 2. ALL POPULATION OBSERVATIONS ACROSS ALL DESTINATIONS ===")
cur.execute("""
    SELECT o.id, o.destination_id, d.name as dest_name, m.code, m.name, o.normalized_value, o.period_start, o.period_end, o.notes
    FROM observations o
    JOIN metric_definitions m ON o.metric_definition_id = m.id
    JOIN destinations d ON o.destination_id = d.id
    WHERE m.code LIKE '%pop%' OR m.name LIKE '%pop%' OR m.description LIKE '%pop%'
    ORDER BY d.id, m.code
""")
for r in cur.fetchall():
    print(f"Dest {r['destination_id']} ({r['dest_name']}): obs_id={r['id']}, code={r['code']}, val={r['normalized_value']}, notes={r['notes'][:100] if r['notes'] else ''}")

print("\n=== 3. SEARCH INGESTION SOURCE FILES IN BACKEND FOR POPULATION ===")
for py_file in glob.glob("c:/S21_new/backend/**/*.py", recursive=True):
    with open(py_file, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        if "population" in content.lower() and "ingest" in py_file.lower():
            print(f"Found population in {py_file}")
