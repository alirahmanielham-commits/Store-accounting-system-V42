import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_open_modal = """  const handleOpenModal = (order?: any) => {
    if (order) {
      setEditingId(order.id);
      setFormData({
        personId: order.personId || '',
        contractId: order.contractId || '',
        templateId: order.templateId || '',
        name: order.name || '',
        items: order.items || [],
        issueDate: order.issueDate ? new Date(Number(order.issueDate)) : new Date(),
        executionDate: order.executionDate ? new Date(Number(order.executionDate)) : new Date(),
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
    executionDate: new Date(),
        status: 'draft'
      });"""

new_open_modal = """  const handleOpenModal = (order?: any) => {
    if (order) {
      setEditingId(order.id);
      setFormData({
        personId: order.personId || '',
        contractId: order.contractId || '',
        templateId: order.templateId || '',
        name: order.name || '',
        childrenCount: order.childrenCount !== undefined ? order.childrenCount : '',
        experienceYears: order.experienceYears !== undefined ? order.experienceYears : '',
        items: order.items || [],
        issueDate: order.issueDate ? new Date(Number(order.issueDate)) : new Date(),
        executionDate: order.executionDate ? new Date(Number(order.executionDate)) : new Date(),
        status: order.status || 'draft'
      });
    } else {
      setEditingId(null);
      setFormData({
        personId: '',
        contractId: '',
        templateId: '',
        name: '',
        childrenCount: '',
        experienceYears: '',
        items: [],
        issueDate: new Date(),
    executionDate: new Date(),
        status: 'draft'
      });"""

content = content.replace(old_open_modal, new_open_modal)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
