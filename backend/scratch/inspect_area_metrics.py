import sqlite3

conn = sqlite3.connect('c:/S21_new/backend/s21_db.sqlite3')
cur = conn.cursor()

print("=== AREA METRIC DEFINITIONS & OBSERVATIONS ===")
cur.execute("""
    SELECT d.id, d.name, m.code, m.name, m.category, m.unit, m.description, o.normalized_value, o.period_start, o.period_end, o.notes
    FROM observations o 
    JOIN metric_definitions m ON o.metric_definition_id = m.id 
    JOIN destinations d ON o.destination_id = d.id 
    WHERE m.code LIKE '%area%' 
       OR m.code LIKE '%sqkm%' 
       OR m.code LIKE '%hectare%' 
       OR m.code LIKE '%ha%' 
       OR m.code LIKE '%acre%' 
       OR m.unit LIKE '%sq%' 
       OR m.unit LIKE '%ha%' 
       OR m.unit LIKE '%acre%'
       OR m.description LIKE '%area%'
       OR m.description LIKE '%sq km%'
""")
rows = cur.fetchall()
for r in rows:
    print(f"[{r[1]} - Dest {r[0]}] {r[2]} ({r[3]}) | unit: {r[5]} | val: {r[7]} ({r[8]} to {r[9]}) | notes: {r[10][:100] if r[10] else ''}")
