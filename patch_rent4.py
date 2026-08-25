import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

issue_doc_fn = """  const handleIssueDoc = async () => {
    if (!docForm.ledgerAccountId) {
      return showNotification('انتخاب حساب هزینه الزامی است', 'error');
    }
    if (!docForm.amount || Number(docForm.amount) <= 0) {
      return showNotification('مبلغ نامعتبر است', 'error');
    }

    try {
      const doc = {
        date: docForm.date instanceof Date ? docForm.date.toISOString() : new Date(docForm.date).toISOString(),
        description: docForm.description,
        status: 'approved',
        sourceType: 'rent_contract',
        sourceId: issueDocModal.id,
        items: [
          {
            accountId: docForm.ledgerAccountId,
            debtor: Number(docForm.amount),
            creditor: 0,
            description: docForm.description
          },
          {
            personId: issueDocModal.personId,
            debtor: 0,
            creditor: Number(docForm.amount),
            description: docForm.description
          }
        ]
      };
      await addAccountingDocument(doc);
      showNotification('سند تعهد با موفقیت صادر شد', 'success');
      setIssueDocModal(null);
    } catch (e) {
      console.error(e);
      showNotification('خطا در صدور سند', 'error');
    }
  };

  const handleSave = async () => {"""

code = code.replace("  const handleSave = async () => {", issue_doc_fn)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
