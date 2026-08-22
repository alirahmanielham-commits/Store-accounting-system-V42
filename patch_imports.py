import re
import os

files_to_patch = [
    'src/components/payroll/DailyAttendanceManager.tsx',
    'src/components/payroll/EmployeeOrdersManager.tsx'
]

import_stmt = "import { convertToGregorian } from '../../utils/format';\n"

for filepath in files_to_patch:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "convertToGregorian" not in content[:500]: # check imports section
        content = import_stmt + content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched imports in {filepath}")

