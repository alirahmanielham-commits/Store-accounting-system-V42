import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"setContractForm\(\{\.\.\.contractForm,\s*(startDate|endDate):\s*(.*?)\s*\}\);",
    r"setContractForm(prev => ({...prev, \1: \2}));",
    content
)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Functional update patched")
