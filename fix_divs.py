import re

with open('src/components/payroll/WorkplacesManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "    </div>\n  );\n}",
    "        </div>\n      </div>\n    </div>\n  );\n}"
)

with open('src/components/payroll/WorkplacesManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

