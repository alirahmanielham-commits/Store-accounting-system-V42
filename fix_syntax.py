import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = "  if (isModalOpen) {\n<div className=\"min-h-full"
new_str = "  if (isModalOpen) {\n    return (\n<div className=\"min-h-full"
content = content.replace(old_str, new_str)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Syntax fixed")
