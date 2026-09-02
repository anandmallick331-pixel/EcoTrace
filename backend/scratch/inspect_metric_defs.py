import sqlite3

conn = sqlite3.connect('c:/S21_new/backend/s21_db.sqlite3')
cur = conn.cursor()

cur.execute("""
    SELECT code, name, category, unit, direction, description
    FROM metric_definitions
    ORDER BY category, code
""")
for r in cur.fetchall():
    if any(k in r[0].lower() or k in r[1].lower() or k in r[2].lower() for k in ['waste', 'pop', 'tourist', 'visitor', 'footfall', 'msw', 'solid', 'resident', 'capacity', 'load']):
        print(f"[{r[2]}] {r[0]}: {r[1]} | unit={r[3]} | dir={r[4]} | desc={r[5]}")
