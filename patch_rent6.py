import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

handle_edit_fn = """  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      personId: { value: c.personId, label: getPersonName(c.personId) },
      contractNumber: c.contractNumber || '',
      startDate: c.startDate ? new Date(c.startDate) : new Date(),
      endDate: c.endDate ? new Date(c.endDate) : new Date(),
      monthlyAmount: c.monthlyAmount || '',
      depositAmount: c.depositAmount || '',
      description: c.description || '',
      status: c.status || 'draft'
    });
    setIsModalOpen(true);
  };

  const handleIssueDoc = async () => {"""

code = code.replace("  const handleIssueDoc = async () => {", handle_edit_fn)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
