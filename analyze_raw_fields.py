import json
from collections import Counter

with open(r"c:\S21_new\puri_raw_obs_inspect.json", "r", encoding="utf-8") as f:
    records = json.load(f)

print(f"Loaded {len(records)} records.")
print("Sample record keys:", records[0].keys())

value_types = Counter()
statuses = Counter()
geos = Counter()
domains = Counter()

for r in records:
    vt = str(r.get("value_type") or "").strip().upper()
    st = str(r.get("verification_status") or r.get("status") or "").strip().upper()
    geo = str(r.get("geographic_scope") or "").strip()
    dom = r.get("_domain")
    
    value_types[vt] += 1
    statuses[st] += 1
    geos[geo] += 1
    domains[dom] += 1

print("\nValue Types in raw records:")
for k, v in value_types.items():
    print(f"  {k}: {v}")

print("\nStatuses in raw records:")
for k, v in statuses.items():
    print(f"  {k}: {v}")

print("\nDomains in raw records:")
for k, v in domains.items():
    print(f"  {k}: {v}")
