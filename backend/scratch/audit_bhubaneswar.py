import sqlite3
import json

conn = sqlite3.connect('c:/S21_new/backend/s21_db.sqlite3')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=== 1. BHUBANESWAR DESTINATION INFO ===")
cur.execute("SELECT * FROM destinations WHERE name LIKE '%Bhubaneswar%' OR id IN (3, 100)")
for r in cur.fetchall():
    print(dict(r))

print("\n=== 2. OBSERVATION FOR est_msw_generation_tpd ===")
cur.execute("""
    SELECT o.*, m.code as m_code, m.name as m_name, m.category as m_category, m.unit as m_unit, m.description as m_desc,
           d.name as d_name, ds.name as ds_name, s.name as s_name, s.organisation as s_org, s.url as s_url
    FROM observations o
    JOIN metric_definitions m ON o.metric_definition_id = m.id
    JOIN destinations d ON o.destination_id = d.id
    LEFT JOIN datasets ds ON o.dataset_id = ds.id
    LEFT JOIN sources s ON ds.source_id = s.id
    WHERE m.code = 'est_msw_generation_tpd'
""")
for r in cur.fetchall():
    print(dict(r))

print("\n=== 3. ALL EVIDENCE LINKED TO est_msw_generation_tpd ===")
cur.execute("""
    SELECT e.*, s.name as s_name, s.organisation as s_org
    FROM evidence e
    JOIN observations o ON e.observation_id = o.id
    JOIN metric_definitions m ON o.metric_definition_id = m.id
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE m.code = 'est_msw_generation_tpd'
""")
ev_rows = cur.fetchall()
if not ev_rows:
    print("No direct evidence rows found for observation_id in evidence table.")
for r in ev_rows:
    print(dict(r))

print("\n=== 4. BHUBANESWAR POPULATION & TOURISM OBSERVATIONS ===")
cur.execute("""
    SELECT o.id, o.destination_id, d.name as d_name, m.code, m.name, m.category, m.unit, o.original_value, o.normalized_value,
           o.period_start, o.period_end, o.status, o.confidence, o.destination_specificity, o.methodology, o.notes
    FROM observations o
    JOIN metric_definitions m ON o.metric_definition_id = m.id
    JOIN destinations d ON o.destination_id = d.id
    WHERE (d.name LIKE '%Bhubaneswar%' OR o.destination_id IN (3, 100))
      AND (m.code LIKE '%pop%' OR m.code LIKE '%tourist%' OR m.code LIKE '%visitor%' OR m.code LIKE '%footfall%' OR m.code LIKE '%slum%')
    ORDER BY m.code, o.period_start
""")
for r in cur.fetchall():
    print(dict(r))
