import openpyxl
import os

base_dir = r"C:\S21_new\backend\REGENLEDGER_DATA (1)\REGENLEDGER_DATA_PURI_UPDATED"
gap_path = os.path.join(base_dir, "PURI_DATA_GAPS.xlsx")
wb_g = openpyxl.load_workbook(gap_path, data_only=True)
ws_g = wb_g['DATA_GAPS_REGISTER']
g_rows = list(ws_g.iter_rows(values_only=True))
print("Headers:", g_rows[0])
for r in g_rows[1:]:
    print(r)
wb_g.close()
