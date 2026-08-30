import re

with open('src/utils/sidebarData.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace menu item
content = content.replace('{ id: "payroll_settings", label: "تنظیمات کارگاه و احکام", roles: ["admin", "manager"] },',
'{ id: "workplaces", label: "مدیریت کارگاه‌ها", roles: ["admin", "manager"] },\n      { id: "order_templates", label: "قالب‌های حکم کارگزینی", roles: ["admin", "manager"] },')

with open('src/utils/sidebarData.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

