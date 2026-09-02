import sqlite3
import openpyxl
from pathlib import Path

conn = sqlite3.connect('c:/S21_new/backend/s21_db.sqlite3')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=== 1. ALL OBSERVATIONS FOR KONARK (Dest 2 / 102) ===")
cur.execute("""
    SELECT o.id, o.destination_id, m.code, m.name, m.category, m.unit, o.normalized_value, o.period_start, o.period_end, o.notes
    FROM observations o
    JOIN metric_definitions m ON o.metric_definition_id = m.id
    WHERE o.destination_id IN (2, 102) AND (m.code LIKE '%area%' OR m.code LIKE '%waste%' OR m.category IN ('Waste', 'Heritage', 'Community'))
""")
for r in cur.fetchall():
    print(f"[{r['code']}] val={r['normalized_value']} {r['unit']} | notes={r['notes'][:120] if r['notes'] else ''}")

print("\n=== 2. ALL OBSERVATIONS FOR PURI (Dest 4 / 23 / 103) ===")
cur.execute("""
    SELECT d.id, d.name, o.id as obs_id, m.code, m.name, m.category, m.unit, o.normalized_value, o.period_start, o.period_end, o.notes
    FROM observations o
    JOIN metric_definitions m ON o.metric_definition_id = m.id
    JOIN destinations d ON o.destination_id = d.id
    WHERE (d.name LIKE '%Puri%' OR o.destination_id IN (4, 23, 103)) AND (m.code LIKE '%area%' OR m.code LIKE '%waste%' OR m.category IN ('Waste', 'Community'))
""")
for r in cur.fetchall():
    print(f"[{r['name']} - {r['code']}] val={r['normalized_value']} {r['unit']} | notes={r['notes'][:120] if r['notes'] else ''}")

print("\n=== 3. ALL OBSERVATIONS FOR CHILIKA (Dest 1 / 44) ===")
cur.execute("""
    SELECT d.id, d.name, o.id as obs_id, m.code, m.name, m.category, m.unit, o.normalized_value, o.period_start, o.period_end, o.notes
    FROM observations o
    JOIN metric_definitions m ON o.metric_definition_id = m.id
    JOIN destinations d ON o.destination_id = d.id
    WHERE (d.name LIKE '%Chilika%' OR o.destination_id IN (1, 44)) AND (m.code LIKE '%area%' OR m.code LIKE '%waste%' OR m.category IN ('Waste', 'Community', 'Biodiversity'))
""")
for r in cur.fetchall():
    print(f"[{r['name']} - {r['code']}] val={r['normalized_value']} {r['unit']} | notes={r['notes'][:120] if r['notes'] else ''}")
