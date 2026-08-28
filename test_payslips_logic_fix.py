import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's just make sure there are no syntax errors
