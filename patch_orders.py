import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_stmt = "import { convertToGregorian } from '../../utils/format';\n"
if "convertToGregorian" not in content:
    content = content.replace("import Select from 'react-select';", "import Select from 'react-select';\n" + import_stmt)

old_onchange = "onChange={(date: any) => setFormData({...formData, issueDate: date?.toDate?.() || date})}"
new_onchange = "onChange={(date: any) => setFormData({...formData, issueDate: typeof date === 'string' ? new Date(convertToGregorian(date)) : (date?.toDate?.() || new Date(date))})}"
content = content.replace(old_onchange, new_onchange)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("EmployeeOrdersManager patched.")
