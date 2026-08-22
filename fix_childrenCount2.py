import re

with open('src/components/payroll/ContractsManager.tsx', 'r') as f:
    text = f.read()

text = text.replace("childrenCount: '', selectedComponents: []", "selectedComponents: []")
text = text.replace('childrenCount: "", selectedComponents: []', "selectedComponents: []")

with open('src/components/payroll/ContractsManager.tsx', 'w') as f:
    f.write(text)
