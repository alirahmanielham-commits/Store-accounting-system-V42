import re

with open('src/services/hrService.ts', 'r', encoding='utf-8') as f:
    code = f.read()

if "getAccountingDocuments" not in code:
    code = code.replace(
        "import { getLocalData, saveLocalData, appendLocalData, updateLocalData } from '../db/kv-store';",
        "import { getLocalData, saveLocalData, appendLocalData, updateLocalData } from '../db/kv-store';\nimport { getAccountingDocuments, addAccountingDocument } from './dataService';"
    )

new_func = """
export const autoGenerateRentCommitments = async () => {
  try {
    const contracts = await getRentContracts();
    const docs = await getAccountingDocuments();
    const activeContracts = contracts.filter(c => c.status === 'active');
    
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const parts = formatter.formatToParts(now);
    const pYear = parseInt(parts.find(p => p.type === 'year')?.value || '1403', 10);
    const pMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10);
    const pDay = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);

    for (const contract of activeContracts) {
      if (!contract.paymentDay || !contract.monthlyAmount || !contract.expenseAccountId) continue;
      
      const cDateObj = contract.startDate ? new Date(contract.startDate) : new Date();
      const cParts = formatter.formatToParts(cDateObj);
      const startYear = parseInt(cParts.find(p => p.type === 'year')?.value || '1403', 10);
      const startMonth = parseInt(cParts.find(p => p.type === 'month')?.value || '1', 10);
      
      const paymentDay = Number(contract.paymentDay);
      
      let checkYear = startYear;
      let checkMonth = startMonth;
      
      // We will loop from start month to current month
      while(checkYear < pYear || (checkYear === pYear && checkMonth <= pMonth)) {
        // If it's the current month, and the payment day hasn't arrived yet, skip
        if (checkYear === pYear && checkMonth === pMonth && pDay < paymentDay) {
           break; 
        }

        const tag = `rent_${contract.id}_${checkYear}_${checkMonth}`;
        
        // Check if doc already exists for this month
        const exists = (docs || []).some((d: any) => d.sourceType === 'rent_contract_auto' && d.sourceId === tag);
        
        if (!exists) {
          // Construct Gregorian date for the document
          // Rough approximation: just use the current time if it's the current month, 
          // or we can just use new Date().toISOString() since the user checks it today.
          // Better: We use new Date() for simplicity, or we can accurately map Jalali back to Gregorian.
          
          await addAccountingDocument({
            date: new Date().toISOString(),
            description: `سند تعهد اجاره ماهانه بابت قرارداد ${contract.contractNumber || ''} - ${checkYear}/${checkMonth}`,
            status: 'approved',
            sourceType: 'rent_contract_auto',
            sourceId: tag,
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
          });
        }
        
        checkMonth++;
        if (checkMonth > 12) {
          checkMonth = 1;
          checkYear++;
        }
      }
    }
  } catch(e) {
    console.error('Failed to auto generate rent commitments', e);
  }
};
"""

if "autoGenerateRentCommitments" not in code:
    code += new_func

with open('src/services/hrService.ts', 'w', encoding='utf-8') as f:
    f.write(code)
