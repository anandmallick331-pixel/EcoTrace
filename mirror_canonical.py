import shutil
import os

src = r"C:\S21_new\backend\REGENLEDGER_DATA (1)\REGENLEDGER_DATA_PURI_UPDATED\metadata\PURI_CANONICAL_OBSERVATIONS.xlsx"
dst_dir = r"C:\S21_new\backend\metadata"
os.makedirs(dst_dir, exist_ok=True)
dst = os.path.join(dst_dir, "PURI_CANONICAL_OBSERVATIONS.xlsx")
shutil.copy2(src, dst)
print(f"Copied to {dst}")
