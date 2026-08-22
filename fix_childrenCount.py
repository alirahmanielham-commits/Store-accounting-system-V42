import re

with open('src/components/payroll/ContractsManager.tsx', 'r') as f:
    text = f.read()

# Fix the childrenCount leftover
text = re.sub(r'\s*childrenCount: c\.childrenCount \|\| \'\'', '', text)

with open('src/components/payroll/ContractsManager.tsx', 'w') as f:
    f.write(text)
