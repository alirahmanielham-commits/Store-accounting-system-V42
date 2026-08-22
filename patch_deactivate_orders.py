import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """      if (formData.status === 'active') {
        // Find all other active orders for this person and deactivate them
        const otherOrders = orders.filter(o => o.personId === formData.personId && o.id !== editingId && o.status === 'active');"""

new_logic = """      if (formData.status === 'active') {
        // Find all other active orders for this contract and deactivate them
        const otherOrders = orders.filter(o => o.contractId === formData.contractId && o.id !== editingId && o.status === 'active');"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Logic updated successfully.")
else:
    print("Could not find the target string to replace.")
