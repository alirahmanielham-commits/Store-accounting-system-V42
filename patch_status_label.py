import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_label = '<option value="active">تایید نهایی / فعال (غیرفعال شدن سایر احکام)</option>'
new_label = '<option value="active">تایید نهایی / فعال (غیرفعال شدن سایر احکام این قرارداد)</option>'

if old_label in content:
    content = content.replace(old_label, new_label)
    with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Label updated.")
