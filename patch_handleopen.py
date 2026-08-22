import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_handleopen = """  const handleOpenModal = (order?: any) => {
    if (order) {
      setEditingId(order.id);
      setFormData({
        personId: order.personId || '',
        contractId: order.contractId || '',
        templateId: order.templateId || '',
        issueDate: order.issueDate ? new Date(Number(order.issueDate)) : new Date(),
        status: order.status || 'draft'
      });
    } else {
      setEditingId(null);
      setFormData({
        personId: '',
        contractId: '',
        templateId: '',
        issueDate: new Date(),
        status: 'draft'
      });
    }
    setIsModalOpen(true);
  };"""

new_handleopen = """  const handleOpenModal = (order?: any) => {
    if (order) {
      setEditingId(order.id);
      setFormData({
        personId: order.personId || '',
        contractId: order.contractId || '',
        templateId: order.templateId || '',
        name: order.name || '',
        items: order.items || [],
        issueDate: order.issueDate ? new Date(Number(order.issueDate)) : new Date(),
        status: order.status || 'draft'
      });
    } else {
      setEditingId(null);
      setFormData({
        personId: '',
        contractId: '',
        templateId: '',
        name: '',
        items: [],
        issueDate: new Date(),
        status: 'draft'
      });
    }
    setIsModalOpen(true);
  };"""

content = content.replace(old_handleopen, new_handleopen)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("handleOpenModal patched.")
