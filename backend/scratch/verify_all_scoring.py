import sys
sys.path.insert(0, ".")
from app.db.session import SessionLocal
from app.models.destination import Destination
from app.services.scoring import ScoringService

db = SessionLocal()
s = ScoringService(db)

dests = db.query(Destination).all()
print("=== VERIFY ALL DESTINATIONS ===")
for d in dests:
    sc = s.get_scores(d.id)
    if not sc or not sc.categories:
        continue
    print(f"\n[{d.id}] {d.name}")
    print(f"  Overall Score: {sc.score}")
    for cat in sc.categories:
        if cat.category.lower() == "waste" or "waste" in cat.category.lower():
            print(f"  Category: {cat.category} (Score: {cat.score})")
            for c in cat.components:
                print(f"    Component: {c.metric_code}")
                print(f"      Raw Waste: {c.raw_waste}")
                print(f"      Destination Load: {c.destination_load}")
                print(f"      Waste Intensity: {c.waste_intensity} {c.unit}")
                print(f"      Waste Density: {c.waste_density} kg/km2/day (Area: {c.destination_area_sqkm} km2)")
                print(f"      Density Basis: {c.density_basis}")
                print(f"      Score Contribution: {c.score_contribution}")
