import openpyxl
import os

base_dir = r"C:\S21_new\backend\REGENLEDGER_DATA (1)\REGENLEDGER_DATA_PURI_UPDATED"

wb_cgm = openpyxl.load_workbook(os.path.join(base_dir, "framework", "PURI_COMPUTATIONAL_GAP_MATRIX.xlsx"), data_only=True)
ws_cgm = wb_cgm["COMPUTATIONAL_GAP_MATRIX"]
for r in list(ws_cgm.iter_rows(values_only=True)):
    print(f"{str(r[0]):15} | {str(r[1]):15} | {str(r[2]):28} | {str(r[3]):35} | {str(r[4]):10} | {str(r[5]):15} | {str(r[6]):15}")
wb_cgm.close()
