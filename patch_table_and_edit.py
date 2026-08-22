import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove terminationDate from edit state
code = code.replace("terminationDate: c.terminationDate ? new Date(parseInt(c.terminationDate)) : null,", "workplaceId: c.workplaceId || '',")
# Remove selectedComponents logic
code = code.replace("const allDbComps = await getContractComponents();", "")
code = code.replace("const dbComps = allDbComps.filter(cc => cc.contractId === c.id);", "")
code = code.replace("selectedComponents: dbComps,", "")

# Replace status in edit form since it should just be what's stored
# (Already is: status: c.status || 'active',)

# In table headers, remove 'تاریخ ترک' if it exists
if '<th className="p-4 font-bold text-slate-600">تاریخ ترک</th>' in code:
    code = code.replace('<th className="p-4 font-bold text-slate-600">تاریخ ترک</th>', '')

# In table rows, remove terminationDate column
if '<td className="p-4 text-slate-500 text-xs">{c.terminationDate ? new Date(parseInt(c.terminationDate)).toLocaleDateString(\'fa-IR\') : \'---\'}</td>' in code:
    code = code.replace('<td className="p-4 text-slate-500 text-xs">{c.terminationDate ? new Date(parseInt(c.terminationDate)).toLocaleDateString(\'fa-IR\') : \'---\'}</td>', '')


with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Edit form and table updated")
