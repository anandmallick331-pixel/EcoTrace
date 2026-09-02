import json

with open(r"c:\S21_new\puri_full_inventory.json", "r", encoding="utf-8") as f:
    inv = json.load(f)

print("TOTAL FILES:", inv["total_files"])
print("RAW DOMAINS COUNT:", inv["total_raw_domains"])
print("RAW DOMAINS LIST:", inv["raw_domains_list"])
print("TOTAL OBSERVATIONS (PROCESSED_DATA):", inv["total_observations"])
print("UNIQUE RECORDS:", inv["unique_records_count"])
print("UNIQUE SOURCES:", inv["unique_sources_count"])
print("UNIQUE METRICS / INDICATORS:", inv["unique_metrics_count"])
print("UNIQUE DATASETS:", inv["unique_datasets_count"])
print("UNIQUE GAPS:", inv["unique_gaps_count"])
print("DUPLICATE RECORDS COUNT:", inv["duplicate_records_count"])
print("SCAFFOLD / HEADER-ONLY SHEETS:", len(inv["scaffold_sheets"]))

print("\nOBSERVATIONS BY DOMAIN:")
for d, c in sorted(inv["obs_by_domain"].items()):
    print(f"  {d:15}: {c:3} rows | Gaps: {inv['gaps_by_domain'].get(d, 0)}")

print("\nPROVENANCE DISTRIBUTION:")
for p, c in sorted(inv["provenance_distribution"].items(), key=lambda x: -x[1]):
    print(f"  {p:20}: {c:3}")

print("\nSTATUS DISTRIBUTION:")
for s, c in sorted(inv["status_distribution"].items(), key=lambda x: -x[1]):
    print(f"  {s:20}: {c:3}")

print("\nCONFIDENCE DISTRIBUTION:")
for conf, c in sorted(inv["confidence_distribution"].items(), key=lambda x: -x[1]):
    print(f"  {conf:20}: {c:3}")

print("\nSCAFFOLD SHEETS LIST:")
for s in inv["scaffold_sheets"]:
    print(f"  {s}")

if inv["duplicate_records"]:
    print("\nDUPLICATE RECORDS:")
    for k, v in inv["duplicate_records"].items():
        print(f"  {k}: {v}")
