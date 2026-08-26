import re

with open('src/services/hrService.ts', 'r', encoding='utf-8') as f:
    code = f.read()

test_func = """
export const testGenerateRentCommitments = async () => {
  try {
    const contracts = await getRentContracts();
    const activeContracts = contracts.filter(c => c.status === 'active');
    
    for (const contract of activeContracts) {
      if (!contract.monthlyAmount || !contract.expenseAccountId) continue;
      
      const tag = `rent_test_${contract.id}_${Date.now()}`;
      
      await addAccountingDocument({
        date: new Date().toISOString(),
        description: `سند تستی تعهد اجاره بابت قرارداد ${contract.contractNumber || ''}`,
        status: 'approved',
        sourceType: 'rent_contract_auto',
        sourceId: tag,
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
      });
    }
  } catch (e) {
    console.error('Failed to test rent commitments', e);
    throw e;
  }
};
"""

if "testGenerateRentCommitments" not in code:
    code += "\n" + test_func

with open('src/services/hrService.ts', 'w', encoding='utf-8') as f:
    f.write(code)
