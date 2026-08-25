import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add paymentDay to the initial form state
code = code.replace(
    "depositAmount: '',\n    description: '',",
    "depositAmount: '',\n    paymentDay: '',\n    description: '',"
)

# Replace the edit handle to load paymentDay
code = code.replace(
    "depositAmount: c.depositAmount || '',\n      description: c.description || '',",
    "depositAmount: c.depositAmount || '',\n      paymentDay: c.paymentDay || '',\n      description: c.description || '',"
)

# Replace payload to save paymentDay
code = code.replace(
    "depositAmount: Number(form.depositAmount),\n        description: form.description,",
    "depositAmount: Number(form.depositAmount),\n        paymentDay: Number(form.paymentDay),\n        description: form.description,"
)

# Inside the 'setEditingId(null)' and 'setForm' logic
code = code.replace(
    "depositAmount: '',\n    description: '',\n              status: 'draft'",
    "depositAmount: '',\n              paymentDay: '',\n              description: '',\n              status: 'draft'"
)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
