import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    "const cTrans = (trans || []).filter((t: any) => t.personId === c.personId && t.description?.includes(c.contractNumber || '---'));",
    "const cTrans = (trans || []).filter((t: any) => String(t.personId) === String(c.personId) && t.type === 'payment');"
)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
