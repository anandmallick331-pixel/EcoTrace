import openpyxl
import os

base_dir = r"C:\S21_new\backend\REGENLEDGER_DATA (1)\REGENLEDGER_DATA_PURI_UPDATED"

wb_mst = openpyxl.load_workbook(os.path.join(base_dir, "framework", "PURI_METRIC_STATUS_TABLE.xlsx"), data_only=True)
ws_mst = wb_mst["METRIC_STATUS_TABLE"]
for i, r in enumerate(ws_mst.iter_rows(values_only=True)):
    print(f"{i:2}: {r[0]:25} | {r[1]:20} | {r[2]:15} | {r[3]:15} | {r[4]:15}")
wb_mst.close()
