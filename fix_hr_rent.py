import re

with open('src/services/hrService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add ensurePayableAccount
ensure_acc = """
const ensurePayableAccount = async () => {
  const { getLedgerAccounts, addLedgerAccount, generateId } = await import('./dataService');
  const accs = await getLedgerAccounts();
  let payableAcc = accs.find((a: any) => a.code === '2001' || a.title === 'حسابهای پرداختنی' || a.title === 'بدهی به پرسنل' || a.title === 'حقوق پرداختنی');
  if (!payableAcc) {
      payableAcc = { id: generateId(), code: '2001', title: 'حسابهای پرداختنی', nature: 'credit', level: 'subsidiary' };
      await addLedgerAccount(payableAcc);
  }
  return payableAcc;
};
"""

if "ensurePayableAccount" not in content:
    content = content.replace("export const autoGenerateRentCommitments = async () => {", ensure_acc + "\nexport const autoGenerateRentCommitments = async () => {")


# Fix autoGenerateRentCommitments items
old_items = """
            items: [
              {
                accountId: contract.expenseAccountId,
                debtor: Number(contract.monthlyAmount),
                creditor: 0,
                description: `تعهد اجاره ماه ${checkYear}/${checkMonth}`
              },
              {
                personId: contract.personId,
                debtor: 0,
                creditor: Number(contract.monthlyAmount),
                description: `تعهد اجاره ماه ${checkYear}/${checkMonth}`
              }
            ]
"""
new_items = """
            items: [
              {
                ledgerAccountId: contract.expenseAccountId,
                detailedAccountId: '',
                debit: Number(contract.monthlyAmount),
                credit: 0,
                description: `تعهد اجاره ماه ${checkYear}/${checkMonth}`
              },
              {
                ledgerAccountId: payableAcc.id,
                detailedAccountId: contract.personId,
                debit: 0,
                credit: Number(contract.monthlyAmount),
                description: `تعهد اجاره ماه ${checkYear}/${checkMonth}`
              }
            ]
"""
content = content.replace(old_items, new_items)

# It also needs to fetch payableAcc
content = content.replace(
    "const activeContracts = contracts.filter(c => c.status === 'active');",
    "const activeContracts = contracts.filter(c => c.status === 'active');\n    const payableAcc = await ensurePayableAccount();"
)

# Fix testGenerateRentCommitments
old_test_items = """
        items: [
          {
            accountId: contract.expenseAccountId,
            debtor: Number(contract.monthlyAmount),
            creditor: 0,
            description: `تعهد اجاره (تستی)`
          },
          {
            personId: contract.personId,
            debtor: 0,
            creditor: Number(contract.monthlyAmount),
            description: `تعهد اجاره (تستی)`
          }
        ]
"""
new_test_items = """
        items: [
          {
            ledgerAccountId: contract.expenseAccountId,
            detailedAccountId: '',
            debit: Number(contract.monthlyAmount),
            credit: 0,
            description: `تعهد اجاره (تستی)`
          },
          {
            ledgerAccountId: payableAcc2.id,
            detailedAccountId: contract.personId,
            debit: 0,
            credit: Number(contract.monthlyAmount),
            description: `تعهد اجاره (تستی)`
          }
        ]
"""
content = content.replace(old_test_items, new_test_items)
content = content.replace(
    "const activeContracts = contracts.filter(c => c.status === 'active');\n    \n    for (const contract of activeContracts) {",
    "const activeContracts = contracts.filter(c => c.status === 'active');\n    const payableAcc2 = await ensurePayableAccount();\n    for (const contract of activeContracts) {"
)

with open('src/services/hrService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

