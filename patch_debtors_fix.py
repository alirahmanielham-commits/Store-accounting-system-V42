import re

with open('src/components/crm/DebtorsTracking.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import React\nimport { convertToGregorian } from '../../utils/format';\n, {", "import React, {")
content = content.replace("import React, { useState", "import { convertToGregorian } from '../../utils/format';\nimport React, { useState")

with open('src/components/crm/DebtorsTracking.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
