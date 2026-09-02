import json

with open("c:/S21_new/backend/scratch/obs_dump.json", "r", encoding="utf-8") as f:
    obs = json.load(f)

# Unique metrics by category
metrics = {}
for o in obs:
    key = (o["category"], o["metric_code"], o["metric_name"], o["unit"])
    if key not in metrics:
        metrics[key] = []
    metrics[key].append((o["dest_name"], o["normalized_value"], o["period_start"], o["period_end"]))

print("=== ALL METRICS BY CATEGORY ===")
for (cat, code, name, unit), instances in sorted(metrics.items()):
    sample = instances[0]
    print(f"[{cat}] {code} ({name}) | unit: {unit} | count: {len(instances)} | sample dest: {sample[0]} = {sample[1]}")
