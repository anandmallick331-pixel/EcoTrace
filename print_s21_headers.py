import openpyxl
import os

konark_s21 = r"C:\S21_new\backend\REGENLEDGER_DATA (1)\REGENLEDGER_DATA_KONARK_UPDATED\s21_ready"

for f in sorted(os.listdir(konark_s21)):
    if f.endswith(".xlsx"):
        wb = openpyxl.load_workbook(os.path.join(konark_s21, f), data_only=True)
        ws = wb.active
        headers = [c for c in next(ws.iter_rows(values_only=True))]
        print(f"\n=== {f} ({ws.title}) ===")
        print(headers)
        wb.close()
