import sqlite3

conn = sqlite3.connect('c:/S21_new/backend/s21_db.sqlite3')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=== PART 1: est_msw_generation_tpd ===")
cur.execute("""
    SELECT o.id, o.destination_id, d.name as destination_name, m.code, m.name, m.category, m.unit,
           o.original_value, o.normalized_value, o.period_start, o.period_end, o.status, o.confidence,
           o.destination_specificity, o.methodology, o.notes, ds.name as dataset_name, s.name as source_name,
           s.organisation, s.url
    FROM observations o
    JOIN metric_definitions m ON o.metric_definition_id = m.id
    JOIN destinations d ON o.destination_id = d.id
    LEFT JOIN datasets ds ON o.dataset_id = ds.id
    LEFT JOIN sources s ON ds.source_id = s.id
    WHERE m.code = 'est_msw_generation_tpd'
""")
for r in cur.fetchall():
    for k in r.keys():
        print(f"  {k}: {r[k]}")

print("\n=== PART 2: BHUBANESWAR LOAD DENOMINATOR METRICS ===")
cur.execute("""
    SELECT o.id, o.destination_id, d.name as destination_name, m.code, m.name, m.category, m.unit,
           o.original_value, o.normalized_value, o.period_start, o.period_end, o.status, o.confidence,
           o.destination_specificity, o.methodology, o.notes, ds.name as dataset_name, s.name as source_name
    FROM observations o
    JOIN metric_definitions m ON o.metric_definition_id = m.id
    JOIN destinations d ON o.destination_id = d.id
    LEFT JOIN datasets ds ON o.dataset_id = ds.id
    LEFT JOIN sources s ON ds.source_id = s.id
    WHERE o.destination_id IN (3, 100)
      AND m.code IN ('slum_population_bmc', 'tourist_visits_total', 'tourist_footfall_total', 'bmc_municipal_area_sqkm')
    ORDER BY m.code, o.period_start
""")
for r in cur.fetchall():
    print(f"\n--- {r['code']} (id={r['id']}) ---")
    for k in r.keys():
        print(f"  {k}: {r[k]}")
