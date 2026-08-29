import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_manual = """
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
"""

new_manual = """
        items: [
          {
            ledgerAccountId: docForm.ledgerAccountId,
            detailedAccountId: '',
            debit: Number(docForm.amount),
            credit: 0,
            description: docForm.description
          },
          {
            ledgerAccountId: (await getLedgerAccounts()).find((a: any) => a.code === '2001' || a.title === 'حسابهای پرداختنی')?.id || docForm.ledgerAccountId,
            detailedAccountId: issueDocModal.personId,
            debit: 0,
            credit: Number(docForm.amount),
            description: docForm.description
          }
        ]
"""
content = content.replace(old_manual, new_manual)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
