import openpyxl
from pathlib import Path

path = Path("c:/S21_new/backend/s21_ready_puri/03_METRIC_DEFINITIONS.xlsx")
if path.exists():
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    header = rows[0]
    print(f"Header: {header}")
    for r in rows[1:]:
        print(r)
