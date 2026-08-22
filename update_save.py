import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove terminationDate reference
code = code.replace("const terminationDateStr = getTimestampStr(contractForm.terminationDate);", "")
code = code.replace(
    "const newEnd = terminationDateStr ? Number(terminationDateStr) : (endDateStr ? Number(endDateStr) : Infinity);",
    "const newEnd = endDateStr ? Number(endDateStr) : Infinity;"
)
code = code.replace(
    "const exEnd = existing.terminationDate ? Number(existing.terminationDate) : (existing.endDate ? Number(existing.endDate) : Infinity);",
    "const exEnd = existing.endDate ? Number(existing.endDate) : Infinity;"
)

# Add workplaceId to payloadBase
code = code.replace(
    "terminationDate: terminationDateStr,",
    "workplaceId: contractForm.workplaceId,"
)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Save function updated")
