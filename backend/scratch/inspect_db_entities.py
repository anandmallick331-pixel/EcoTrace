import sqlite3

conn = sqlite3.connect('c:/S21_new/backend/s21_db.sqlite3')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=== DESTINATIONS ===")
cur.execute("SELECT id, name, country_code, region FROM destinations")
for r in cur.fetchall():
    print(dict(r))

print("\n=== SOURCES ===")
cur.execute("SELECT id, name, organisation FROM sources")
for r in cur.fetchall():
    print(dict(r))

print("\n=== DATASETS ===")
cur.execute("SELECT id, name, source_id FROM datasets")
for r in cur.fetchall():
    print(dict(r))
