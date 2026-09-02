import sqlite3

conn = sqlite3.connect('c:/S21_new/backend/s21_db.sqlite3')
cur = conn.cursor()

cur.execute("SELECT id, name FROM destinations")
dests = cur.fetchall()

for did, dname in dests:
    print(f"\n================ DESTINATION {did}: {dname} ================")
    cur.execute("""
        SELECT m.code, m.name, m.category, m.unit, o.original_value, o.normalized_value, o.period_start, o.period_end
        FROM observations o
        JOIN metric_definitions m ON o.metric_definition_id = m.id
        WHERE o.destination_id = ?
        ORDER BY m.category, m.code
    """, (did,))
    rows = cur.fetchall()
    print(f"Total observations: {len(rows)}")
    for r in rows:
        if any(w in r[0].lower() or w in r[2].lower() for w in ['waste', 'pop', 'tourist', 'visitor', 'footfall', 'msw', 'solid']):
            print(f"  [{r[2]}] {r[0]} ({r[1]}): orig={r[4]}, norm={r[5]} {r[3]} ({r[6]} to {r[7]})")
