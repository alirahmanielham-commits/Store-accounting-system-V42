import re

with open('src/components/reports/InventoryReport.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_stmt = "import { convertToGregorian } from '../../utils/format';\n"
if "convertToGregorian" not in content:
    content = content.replace("import React", "import React\n" + import_stmt)

content = content.replace("onChange={(date: any) => setStartDate(date?.toDate?.() || null)}", "onChange={(date: any) => setStartDate(typeof date === 'string' ? new Date(convertToGregorian(date)) : (date?.toDate?.() || null))}")
content = content.replace("onChange={(date: any) => setEndDate(date?.toDate?.() || null)}", "onChange={(date: any) => setEndDate(typeof date === 'string' ? new Date(convertToGregorian(date)) : (date?.toDate?.() || null))}")

with open('src/components/reports/InventoryReport.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("InventoryReport patched.")
