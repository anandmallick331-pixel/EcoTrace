import json

with open(r"c:\S21_new\puri_detailed_summary.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"RAW DOMAINS: {len(data['raw_domains'])}")
print(f"Domains: {data['raw_domains']}")
print("\nDOMAIN STATS:")
total_obs = 0
total_gaps = 0
total_dir = 0
total_der = 0
total_est = 0
total_prx = 0
total_inf = 0
total_nrm = 0
total_unk = 0

for d, s in data['domain_stats'].items():
    print(f"\n--- Domain: {d} ---")
    print(f"  Total rows: {s['total_rows']}")
    print(f"  Direct: {s['direct']}, Derived: {s['derived']}, Estimated: {s['estimated']}, Proxy: {s['proxy']}, Inferred: {s['inferred']}, Norm: {s['norm']}, Gaps: {s['data_gap']}, Unknown: {s['unknown']}")
    print(f"  Verified: {s['verified']}, Raw: {s['raw_status']}, Flagged: {s['flagged']}")
    print(f"  Unique Records: {s['unique_records']}, Unique Sources: {s['unique_sources']}, Unique Metrics: {s['unique_metrics']}")
    print(f"  Years: {s['years']}")
    print(f"  Units: {s['units'][:8]}")
    print(f"  Geographies: {s['geos'][:6]}")
    print(f"  Missing fields: {s['missing_fields']}")
    
    total_obs += s['total_rows']
    total_gaps += s['data_gap']
    total_dir += s['direct']
    total_der += s['derived']
    total_est += s['estimated']
    total_prx += s['proxy']
    total_inf += s['inferred']
    total_nrm += s['norm']
    total_unk += s['unknown']

print("\n================ TOTALS ================")
print(f"Total Observations: {total_obs}")
print(f"DIRECT: {total_dir}")
print(f"DERIVED: {total_der}")
print(f"ESTIMATED: {total_est}")
print(f"PROXY: {total_prx}")
print(f"INFERRED: {total_inf}")
print(f"NORM: {total_nrm}")
print(f"DATA_GAP: {total_gaps}")
print(f"UNKNOWN: {total_unk}")
print(f"Duplicate Record IDs: {data['dup_records_count']}")
print(f"Header only sheets in PROCESSED: {len(data['header_only_sheets'])}")
