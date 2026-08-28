with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("issueDate: new Date(), executionDate: new Date(),\n    executionDate: new Date(),", "issueDate: new Date(),\n    executionDate: new Date(),")
content = content.replace("issueDate: new Date(), executionDate: new Date(),\n    executionDate: new Date(),", "issueDate: new Date(),\n    executionDate: new Date(),")

# Fix line 68
old_form = """        issueDate: order.issueDate ? new Date(Number(order.issueDate)) : new Date(),
        status: order.status || 'draft'"""
new_form = """        issueDate: order.issueDate ? new Date(Number(order.issueDate)) : new Date(),
        executionDate: order.executionDate ? new Date(Number(order.executionDate)) : new Date(),
        status: order.status || 'draft'"""
content = content.replace(old_form, new_form)

# Add saving executionDate to handleSave
old_save = """      const payload = {
        ...formData,
        issueDate: formData.issueDate.getTime().toString(),"""
new_save = """      const payload = {
        ...formData,
        issueDate: formData.issueDate.getTime().toString(),
        executionDate: formData.executionDate.getTime().toString(),"""
content = content.replace(old_save, new_save)


with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
