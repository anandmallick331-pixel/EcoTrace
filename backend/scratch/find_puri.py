import sqlite3

conn = sqlite3.connect('c:/S21_new/backend/s21_db.sqlite3')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=== ALL DESTINATIONS IN DB ===")
cur.execute("SELECT * FROM destinations")
for r in cur.fetchall():
    print(dict(r))

print("\n=== SEARCH PURI IN OBSERVATIONS ===")
cur.execute("""
    SELECT DISTINCT d.id, d.name, COUNT(o.id) as obs_count
    FROM destinations d
    LEFT JOIN observations o ON d.id = o.destination_id
    GROUP BY d.id, d.name
""")
for r in cur.fetchall():
    print(dict(r))

print("\n=== SEARCH ANY PURI DATASETS OR FILES ===")
import glob
for p in glob.glob("c:/S21_new/**/Puri*.*", recursive=True):
    print(p)
for p in glob.glob("c:/S21_new/**/*puri*.*", recursive=True):
    print(p)
