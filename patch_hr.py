import re

with open('src/services/hrService.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Make sure we have getAccountingDocuments, addAccountingDocument imported
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
    
    // Get current Persian year and month
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const parts = formatter.formatToParts(now);
    const pYear = parseInt(parts.find(p => p.type === 'year')?.value || '1403', 10);
    const pMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10);
    const pDay = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);

    for (const contract of activeContracts) {
      if (!contract.paymentDay || !contract.monthlyAmount) continue;
      
      const cDateObj = contract.startDate ? new Date(contract.startDate) : new Date();
      const cParts = formatter.formatToParts(cDateObj);
      const startYear = parseInt(cParts.find(p => p.type === 'year')?.value || '1403', 10);
      const startMonth = parseInt(cParts.find(p => p.type === 'month')?.value || '1', 10);
      
      const paymentDay = Number(contract.paymentDay);
      
      // We check for months starting from contract start month to current month
      // if current day >= paymentDay.
      
      let checkYear = startYear;
      let checkMonth = startMonth;
      
      while(checkYear < pYear || (checkYear === pYear && checkMonth <= pMonth)) {
        // If we are in the same year and month as start, and payment day hasn't arrived, break or skip
        if (checkYear === pYear && checkMonth === pMonth && pDay < paymentDay) {
           break; 
        }

        const tag = `rent_${contract.id}_${checkYear}_${checkMonth}`;
        
        // Check if doc already exists for this month
        const exists = (docs || []).some((d: any) => d.sourceType === 'rent_contract_auto' && d.sourceId === tag);
        
        if (!exists) {
           // We need to generate a doc. We need an account for rent expense.
           // Usually it's "هزینه اجاره" or something. 
           // For simplicity, we just create the document if it doesn't exist, we will use a default or find one.
           // But wait, the user needs to specify the ledger account.
           // In manual issuance, they chose the ledgerAccountId. We didn't save it on the contract!
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
}
"""
