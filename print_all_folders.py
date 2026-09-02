import json

with open(r"c:\S21_new\puri_full_inventory.json", "r", encoding="utf-8") as f:
    inv = json.load(f)

folders = {}
for file_info in inv["all_files"]:
    fld = file_info["folder"]
    if fld not in folders:
        folders[fld] = []
    folders[fld].append(file_info)

for fld, flist in sorted(folders.items()):
    print(f"\n=======================================================")
    print(f"FOLDER: {fld if fld else '.'} ({len(flist)} files)")
    print(f"=======================================================")
    for f in flist:
        print(f"\nFile: {f['filename']} ({f['ext']})")
        for s in f['sheets']:
            hdr_sample = s['headers'][:6] if s['headers'] else []
            print(f"  Sheet: {s['sheet_name']} | Rows: {s['row_count']} | Populated: {s['populated_rows']} | Cols: {s['col_count']} | Type: {s['type']}")
            print(f"    Headers ({len(s['headers'])}): {hdr_sample}...")
