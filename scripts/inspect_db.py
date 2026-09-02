import sqlite3
import os

db_path = os.path.join('backend', 's21_db.sqlite3')
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("\n=== ALL METRIC DEFINITIONS (id, code, name, category, unit, direction) ===")
c.execute("SELECT id, code, name, category, unit, direction FROM metric_definitions ORDER BY id ASC")
for row in c.fetchall():
    print(row)

print("\n=== OBSERVATIONS STATS BY METRIC DEFINITION ===")
c.execute("""
    SELECT md.id, md.code, md.name, md.category, COUNT(o.id) as count, AVG(o.original_value), MIN(o.original_value), MAX(o.original_value)
    FROM metric_definitions md
    LEFT JOIN observations o ON o.metric_definition_id = md.id
    GROUP BY md.id
    ORDER BY md.id ASC
""")
for row in c.fetchall():
    print(row)

conn.close()
