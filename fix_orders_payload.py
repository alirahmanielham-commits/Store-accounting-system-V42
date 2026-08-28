import re
with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_payload = """      const payload = {
        personId: formData.personId,
        contractId: formData.contractId,
        templateId: formData.templateId,
        name: formData.name,
        items: formData.items,
        issueDate: issueDateStr,
        status: formData.status
      };"""

new_payload = """      const payload = {
        personId: formData.personId,
        contractId: formData.contractId,
        templateId: formData.templateId,
        name: formData.name,
        items: formData.items,
        issueDate: issueDateStr,
        executionDate: formData.executionDate.getTime().toString(),
        status: formData.status
      };"""

content = content.replace(old_payload, new_payload)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
