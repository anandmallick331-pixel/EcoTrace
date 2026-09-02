import shutil
import os

base_src = r"C:\S21_new\backend\REGENLEDGER_DATA (1)\REGENLEDGER_DATA_PURI_UPDATED"

d_src = os.path.join(base_src, "derived", "PURI", "PURI_DERIVED_OBSERVATIONS.xlsx")
d_dst_dir = r"C:\S21_new\backend\derived\PURI"
os.makedirs(d_dst_dir, exist_ok=True)
shutil.copy2(d_src, os.path.join(d_dst_dir, "PURI_DERIVED_OBSERVATIONS.xlsx"))

f_src = os.path.join(base_src, "framework", "PURI_DERIVATION_FORMULA_REGISTER.xlsx")
f_dst_dir = r"C:\S21_new\backend\framework"
os.makedirs(f_dst_dir, exist_ok=True)
shutil.copy2(f_src, os.path.join(f_dst_dir, "PURI_DERIVATION_FORMULA_REGISTER.xlsx"))

print("Mirrored derived observations and formula register successfully.")
