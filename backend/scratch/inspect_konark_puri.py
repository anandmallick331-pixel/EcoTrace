import sqlite3

conn = sqlite3.connect('c:/S21_new/backend/s21_db.sqlite3')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=== KONARK OBSERVATIONS ===")
cur.execute("""
    SELECT o.id, d.name as d_name, m.code, m.name, m.category, m.unit, o.normalized_value, o.period_start, o.period_end, o.notes
    FROM observations o
    JOIN metric_definitions m ON o.metric_definition_id = m.id
    JOIN destinations d ON o.destination_id = d.id
    WHERE d.name LIKE '%Konark%'
    ORDER BY m.code
""")
for r in cur.fetchall():
    print(f"[{r['code']}] val={r['normalized_value']} {r['unit']} | notes={r['notes'][:120] if r['notes'] else ''}")

print("\n=== PURI OBSERVATIONS ===")
cur.execute("""
    SELECT o.id, d.name as d_name, m.code, m.name, m.category, m.unit, o.normalized_value, o.period_start, o.period_end, o.notes
    FROM observations o
    JOIN metric_definitions m ON o.metric_definition_id = m.id
    JOIN destinations d ON o.destination_id = d.id
    WHERE d.name LIKE '%Puri%'
    ORDER BY m.code
""")
for r in cur.fetchall():
    print(f"[{r['code']}] val={r['normalized_value']} {r['unit']} | notes={r['notes'][:120] if r['notes'] else ''}")
