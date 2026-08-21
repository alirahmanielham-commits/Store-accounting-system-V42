import re

with open('src/utils/sidebarData.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''(\{ id: "employee_contracts", label: "قراردادها", roles: \["admin", "accountant", "manager"\] \},)'''
repl = r'''{ id: "employee_profiles", label: "تکمیل اطلاعات پرسنلی", roles: ["admin", "accountant", "manager"] },
      \1'''

content = re.sub(pattern, repl, content)

with open('src/utils/sidebarData.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
