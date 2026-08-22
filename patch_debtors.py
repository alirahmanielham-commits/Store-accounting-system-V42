import re

with open('src/components/crm/DebtorsTracking.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_stmt = "import { convertToGregorian } from '../../utils/format';\n"
if "convertToGregorian" not in content:
    content = content.replace("import React", "import React\n" + import_stmt)

old_onchange = """onChange={(date: any) => {
                          if (date) {
                              const d = new Date(date.toDate());
                              const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                              setNewNextDate(localDate.toISOString().split('T')[0]);
                          } else {"""
new_onchange = """onChange={(date: any) => {
                          if (date) {
                              const d = typeof date === 'string' ? new Date(convertToGregorian(date)) : new Date(date.toDate());
                              const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                              setNewNextDate(localDate.toISOString().split('T')[0]);
                          } else {"""
content = content.replace(old_onchange, new_onchange)

with open('src/components/crm/DebtorsTracking.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("DebtorsTracking patched.")
