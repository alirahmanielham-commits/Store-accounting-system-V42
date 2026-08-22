import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Update state initialization
code = code.replace(
    "terminationDate: null,\n    \n    startDate: new Date",
    "startDate: new Date"
)

code = code.replace(
    "status: 'draft',\n    \n    \n    // Employee details specific to contract\n    selectedComponents: []",
    "status: 'draft'"
)

# Update reset state initialization
code = code.replace(
    "terminationDate: null, \n                  \n                  startDate: new Date(new Date().setHours(0,0,0,0)), \n                  endDate: new Date(new Date().setHours(0,0,0,0)), \n                  location: '',\n    workplaceId: '', \n                  status: 'draft', \n\n                                                                                                                                               \n                  selectedComponents: []",
    "startDate: new Date(new Date().setHours(0,0,0,0)), \n                  endDate: new Date(new Date().setHours(0,0,0,0)), \n                  location: '',\n    workplaceId: '', \n                  status: 'draft'"
)

# Update payload base
code = code.replace(
    "status: contractForm.status,\n        \n        selectedComponents: []",
    "status: contractForm.status"
)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("State and form initializations patched")
