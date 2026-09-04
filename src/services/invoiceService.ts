import { checkFinancialYear, getStoreSettings } from './settingsService';
import { mapTransactionTypeToTable, mapInvoiceTypeToTable } from './coreService';
import { getLedgerAccounts, addLedgerAccount, addAccountingDocument, getAccountingDocuments, updateAccountingDocument } from './accountingService';
import { syncProductLatestPrices, syncProductsLatestPrices } from './productService';
import { recalculateAllWarehouseStocks } from './inventoryService';

import { 
  getLocalData, 
  saveLocalData, 
  updateLocalData, 
  appendLocalData, 
  batchLocalData, 
  generateId, 
  parseToGregorianDate, 
  generateDocNumber, 
  updateDocCounter, 
  getDatabaseLogs, 
  addDatabaseLog, 
  getSystemLogs, 
  addSystemLog,
  ensureFiscalYearId
} from './coreService';
import { CompanySettings } from '../types';
import { convertToGregorian } from '../utils/format';


export const syncInvoiceAllocations = async (tx: any) => {
    if (!tx || !tx.id || !tx.linkedInvoices) return;
    try {
        const now = new Date().toISOString();
        const salesPayments = await getLocalData<any[]>('sales_invoice_payments', []);
        const purchasePayments = await getLocalData<any[]>('purchase_invoice_payments', []);
        const invoices = await getInvoices();
        
        let salesChanged = false;
        let purchaseChanged = false;

        const newSales = salesPayments.filter(p => String(p.receiptId) !== String(tx.id));
        const newPurchases = purchasePayments.filter(p => String(p.receiptId) !== String(tx.id));

        for (const invId of Object.keys(tx.linkedInvoices)) {
            const amount = Number(tx.linkedInvoices[invId]) || 0;
            if (amount <= 0) continue;
            
            const inv = invoices.find(i => String(i.id) === String(invId));
            if (!inv) continue;

            const record = {
                id: `${tx.id}_${invId}`,
                invoiceId: invId,
                receiptId: tx.id,
                amount: amount,
                date: tx.date || now.split('T')[0],
                timestamp: now
            };

            if (inv.type === 'purchase' || inv.type === 'purchase_return') {
                newPurchases.push(record);
                purchaseChanged = true;
            } else {
                newSales.push(record);
                salesChanged = true;
            }
        }
        
        // Always save to ensure deleted allocations are actually removed
        if (salesChanged || salesPayments.length !== newSales.length) {
            await saveLocalData('sales_invoice_payments', newSales);
        }
        if (purchaseChanged || purchasePayments.length !== newPurchases.length) {
            await saveLocalData('purchase_invoice_payments', newPurchases);
        }

    } catch (e) {
        console.error('Error syncing invoice allocations:', e);
    }
};

export const getSalesInvoicePayments = async () => {
  return await getLocalData<any[]>('sales_invoice_payments', []);
};

export const getPurchaseInvoicePayments = async () => {
  return await getLocalData<any[]>('purchase_invoice_payments', []);
};

export const getTransactions = async () => {
  let allTx: any[] = [];
  const tables = ['receipt_transactions', 'payment_transactions', 'transactions'];
  for (const table of tables) {
    try {
      const data = await getLocalData<any[]>(table, []);
      if (Array.isArray(data)) {
        allTx = allTx.concat(data);
      }
    } catch (e) {
      // ignore table not existing errors
    }
  }
  
  // Deduplicate by ID to prevent duplicate key warnings
  const uniqueTx = new Map();
  allTx.forEach(t => {
    if (t && !t.isDeleted) {
        if (!uniqueTx.has(t.id) || t.updatedAt > uniqueTx.get(t.id).updatedAt) {
            uniqueTx.set(t.id, t);
        }
    }
  });
  
  return Array.from(uniqueTx.values()).sort((a, b) => b.createdAt - a.createdAt);
};

export const addTransaction = async (transaction: any) => {
  let activeYear = null; if (transaction.date) activeYear = await checkFinancialYear(transaction.date);
  const now = Date.now();
  
  let finalTx = { ...transaction };
  if (!finalTx.receiptNumber) {
     const docTypeMap: any = { 'receive': 'receive_receipt', 'pay': 'pay_receipt', 'salary': 'salary' };
     if (docTypeMap[finalTx.type]) {
        finalTx.receiptNumber = await generateDocNumber(docTypeMap[finalTx.type]);
     }
  }

  const newTransaction = { ...finalTx, id: generateId(), createdAt: now, updatedAt: now, fiscalYearId: activeYear ? activeYear.id : undefined };
  const operations: any[] = [];

  if (transaction.type === 'receive' || transaction.type === 'pay' || transaction.type === 'salary') {
    const amount = Number(transaction.amount) || 0;
    if (transaction.resourceType === 'bank') {
      const accounts = await getLocalData<any[]>('accounts', []);
      const index = accounts.findIndex(a => a.id === transaction.resourceId);
      if (index !== -1) {
        let newBalance = accounts[index].balance;
        if (transaction.type === 'receive') {
          newBalance += amount;
        } else {
          newBalance -= amount;
        }
        operations.push({ type: 'update', key: 'accounts', id: accounts[index].id, data: { balance: newBalance } });
      }
    } else if (transaction.resourceType === 'cashbox') {
      const cashboxes = await getLocalData<any[]>('cashboxes', []);
      const index = cashboxes.findIndex(c => c.id === transaction.resourceId);
      if (index !== -1) {
        let newBalance = cashboxes[index].balance;
        if (transaction.type === 'receive') {
          newBalance += amount;
        } else {
          newBalance -= amount;
        }
        operations.push({ type: 'update', key: 'cashboxes', id: cashboxes[index].id, data: { balance: newBalance } });
      }
    }
  }

  const table = mapTransactionTypeToTable(newTransaction.type);
  operations.push({ type: 'append', key: table, data: newTransaction });
  await batchLocalData(operations);
  
  if (newTransaction.receiptNumber) {
     const docTypeMap: any = { 'receive': 'receive_receipt', 'pay': 'pay_receipt', 'salary': 'salary' };
     if (docTypeMap[newTransaction.type]) {
         await updateDocCounter(docTypeMap[newTransaction.type], newTransaction.receiptNumber);
     }
  }

  // Auto-generate detailed accounting document with full explanation
  try {
     const docType = transaction.type === 'receive' ? 'receipt' : 'payment';
     const ledgerAccounts = await getLedgerAccounts();
     const defaultLedger = ledgerAccounts.length > 0 ? ledgerAccounts[0].id : '';

     // Find Person Ledger Account
     let personLedgerId = defaultLedger;
     let personName = 'نامشخص';
     if (transaction.personId) {
        const persons = await getLocalData<any[]>('persons', []);
        const person = persons.find(p => String(p.id) === String(transaction.personId));
        if (person) {
           personName = person.name || person.alias || 'نامشخص';
           if (person.accountingCode) {
              const acc = ledgerAccounts.find(a => a.code === person.accountingCode);
              if (acc) personLedgerId = acc.id;
           }
        }
     }
     
     // Override personLedgerId for Loan transactions to proper Loan Accounts
     const getAccountForCode = async (code: string, title: string, parentCode: string, nature: 'debit' | 'credit') => {
        let acc = ledgerAccounts.find(a => a.code === code);
        if (acc) return acc.id;
        const parentAcc = ledgerAccounts.find(a => a.code === parentCode);
        if (parentAcc) {
            const newAcc = { id: generateId(), code, title, type: 'subsidiary', nature, parentId: parentAcc.id };
                        await addLedgerAccount(newAcc);
            ledgerAccounts.push(newAcc);
            return newAcc.id;
        }
        return defaultLedger;
     };

     if (transaction.categoryId === 'loan_given' || transaction.categoryId === 'loan_installment_received') {
        personLedgerId = await getAccountForCode('1601', 'وام‌های پرداختی', '16', 'debit');
     } else if (transaction.categoryId === 'loan_received' || transaction.categoryId === 'loan_installment_paid') {
        personLedgerId = await getAccountForCode('2201', 'وام‌های دریافتی', '22', 'credit');
     }

     // Find Bank/Cashbox Resource Ledger Account
     let resourceLedgerId = defaultLedger;
     let resourceName = 'نامشخص';
     const resType = transaction.resourceType || (transaction.accountId ? 'bank' : transaction.cashboxId ? 'cashbox' : '');
     const isCheckCashing = transaction.isCheckCashing === true;
     const resId = transaction.resourceId || transaction.accountId || transaction.cashboxId;

     if (resType === 'bank' && resId) {
        const accountsList = await getLocalData<any[]>('accounts', []);
        const account = accountsList.find(a => String(a.id) === String(resId));
        if (account) {
           resourceName = account.title || account.bankName || 'نامشخص';
           if (account.accountingCode) {
              const acc = ledgerAccounts.find(a => a.code === account.accountingCode);
              if (acc) resourceLedgerId = acc.id;
           } else {
              const acc = ledgerAccounts.find(a => a.code === '1102');
              if (acc) resourceLedgerId = acc.id;
           }
        }
     } else if (resType === 'cashbox' && resId) {
        const cashboxesList = await getLocalData<any[]>('cashboxes', []);
        const cashbox = cashboxesList.find(c => String(c.id) === String(resId));
        if (cashbox) {
           resourceName = cashbox.name || 'نامشخص';
           if (cashbox.accountingCode) {
              const acc = ledgerAccounts.find(a => a.code === cashbox.accountingCode);
              if (acc) resourceLedgerId = acc.id;
           } else {
              const acc = ledgerAccounts.find(a => a.code === '1101');
              if (acc) resourceLedgerId = acc.id;
           }
        }
     } else {
        const acc = ledgerAccounts.find(a => a.code === '11');
        if (acc) resourceLedgerId = acc.id;
     }

     const formattedAmount = Number(transaction.amount || 0).toLocaleString('fa-IR');
     const sysSettings = await getStoreSettings();
     const currency = transaction.currency || sysSettings?.currency || 'تومان';
     const typeText = transaction.type === 'receive' ? 'دریافت' : transaction.type === 'salary' ? 'حقوق و دستمزد' : 'پرداخت';
     let methodText = 'نقدی';
     if (transaction.method === 'check') methodText = 'چک';
     else if (transaction.method === 'transfer' || transaction.method === 'card') methodText = 'حواله/کارت به کارت';
     let docDescription = '';
     if (transaction.type === 'salary') {
         if (transaction.description && !transaction.description.includes('isPayslip')) {
            docDescription = `${transaction.description} برای کارمند: ${personName}`;
         } else {
            docDescription = `حقوق و دستمزد به مبلغ ${formattedAmount} ${currency} برای کارمند: ${personName}`;
         }
     } else {
         docDescription = `${typeText} ${methodText} به مبلغ ${formattedAmount} ${currency}`;
         if (personName && personName !== 'نامشخص') {
            if (transaction.type === 'receive') {
               docDescription += ` از طرف حساب: ${personName}`;
            } else {
               docDescription += ` به طرف حساب: ${personName}`;
            }
         }
         if (resourceName && resourceName !== 'نامشخص') {
            if (transaction.type === 'receive') {
               docDescription += ` - واریز به حساب/صندوق: ${resourceName}`;
            } else {
               docDescription += ` - برداشت از حساب/صندوق: ${resourceName}`;
            }
         }
     }
          
     if (newTransaction.receiptNumber) {
        docDescription += ` (شماره سند/رسید: ${newTransaction.receiptNumber})`;
     }
     if (transaction.method === 'check' && transaction.checkNumber) {
        docDescription += ` - چک شماره ${transaction.checkNumber}`;
        if (transaction.checkDueDate) docDescription += ` به سررسید ${transaction.checkDueDate}`;
        if (transaction.checkBankName) docDescription += ` عهده بانک ${transaction.checkBankName}`;
     }
     if (transaction.description) {
        let appendedDesc = transaction.description;
        if (transaction.type === 'salary') {
            try {
                const p = JSON.parse(transaction.description);
                if (p.isPayslip) {
                    const pMonthName = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
                    const mName = p.periodMonth ? pMonthName[parseInt(p.periodMonth, 10) - 1] : "";
                    docDescription = `سند حقوق ${mName} ماه ${p.periodYear} - ${personName}`;
                    if (newTransaction.receiptNumber) {
                        docDescription += ` (شماره فیش: ${newTransaction.receiptNumber})`;
                    }
                    appendedDesc = p.userNote || "";
                }
            } catch(e) {}
        }
        if (appendedDesc && appendedDesc !== transaction.description) {
           docDescription += ` [توضیحات: ${appendedDesc}]`;
        } else if (appendedDesc && transaction.type !== 'salary') {
           docDescription += ` [توضیحات: ${appendedDesc}]`;
        }
     }

     const items = [];
     if (transaction.method === 'check') {
         return newTransaction; // Check accounting is fully handled by syncCheckAccountingDocument
     } else {

         if (transaction.categoryId === 'loan_given' || transaction.categoryId === 'loan_received') {
             const interestAmt = Number((transaction as any).interestAmount) || 0;
             const principal = Number(transaction.amount);
             const totalPayable = principal + interestAmt;
             
             if (transaction.categoryId === 'loan_given') {
                 items.push({
                     description: transaction.description ? transaction.description + ` - طرف حساب ${personName}` : `اعطای وام به ${personName}`,
                     debit: totalPayable, credit: 0,
                     ledgerAccountId: personLedgerId, detailedAccountId: transaction.personId
                 });
                 items.push({
                     description: transaction.description ? transaction.description + ` - برداشت از ${resourceName}` : `پرداخت وجه بابت اعطای وام`,
                     debit: 0, credit: principal,
                     ledgerAccountId: resourceLedgerId
                 });
                 if (interestAmt > 0) {
                     const interestAcc = ledgerAccounts.find((a: any) => a.title.includes('درآمد') && a.title.includes('بهره')) || ledgerAccounts.find((a: any) => String(a.code).startsWith('4')) || { id: defaultLedger };
                     items.push({
                         description: `شناسایی درآمد بهره بابت وام شماره ${(newTransaction.id || '').replace('txn-loan-', '')}`,
                         debit: 0, credit: interestAmt,
                         ledgerAccountId: interestAcc.id
                     });
                 }
             } else {
                 items.push({
                     description: transaction.description ? transaction.description + ` - واریز به ${resourceName}` : `دریافت وجه بابت وام دریافتی`,
                     debit: principal, credit: 0,
                     ledgerAccountId: resourceLedgerId
                 });
                 if (interestAmt > 0) {
                     const expenseAcc = ledgerAccounts.find((a: any) => String(a.code) === '53' || String(a.code) === '5') || { id: defaultLedger };
                     items.push({
                         description: `شناسایی هزینه بهره بابت وام دریافتی شماره ${(newTransaction.id || '').replace('txn-loan-', '')}`,
                         debit: interestAmt, credit: 0,
                         ledgerAccountId: expenseAcc.id
                     });
                 }
                 items.push({
                     description: transaction.description ? transaction.description + ` - طرف حساب ${personName}` : `اخذ وام از ${personName}`,
                     debit: 0, credit: totalPayable,
                     ledgerAccountId: personLedgerId, detailedAccountId: transaction.personId
                 });
             }
         } else if (transaction.type === 'receive') {

            items.push({
               description: transaction.description ? transaction.description + ` - مبلغ ${formattedAmount} واریز به ${resourceName}` : `دریافت وجه به مبلغ ${formattedAmount} واریز به ${resourceName} بابت رسید دریافت شماره ${newTransaction.receiptNumber || newTransaction.id}`,
               debit: Number(transaction.amount),
               credit: 0,
               ledgerAccountId: resourceLedgerId});
            items.push({
               description: transaction.description ? transaction.description + ` - طرف حساب ${personName}` : `طرف حساب ${personName} به مبلغ ${formattedAmount} بابت رسید دریافت شماره ${newTransaction.receiptNumber || newTransaction.id}`,
               debit: 0,
               credit: Number(transaction.amount),
               ledgerAccountId: personLedgerId,
               detailedAccountId: transaction.personId});
         } else if (transaction.type === 'salary') {
            const expenseAcc = ledgerAccounts.find((a: any) => a.code === '52') || ledgerAccounts.find((a: any) => a.code === '5') || { id: defaultLedger };
            items.push({
               description: `هزینه حقوق و دستمزد کارمند ${personName} بابت فیش حقوقی شماره ${newTransaction.receiptNumber || newTransaction.id}`,
               debit: Number(transaction.amount),
               credit: 0,
               ledgerAccountId: expenseAcc.id});
            items.push({
               description: `طرف حساب ${personName} بابت حقوق و دستمزد شماره فیش ${newTransaction.receiptNumber || newTransaction.id}`,
               debit: 0,
               credit: Number(transaction.amount),
               ledgerAccountId: personLedgerId,
               detailedAccountId: transaction.personId});
         } else {
            items.push({
               description: transaction.description ? transaction.description + ` - طرف حساب ${personName}` : `طرف حساب ${personName} به مبلغ ${formattedAmount} بابت رسید پرداخت شماره ${newTransaction.receiptNumber || newTransaction.id}`,
               debit: Number(transaction.amount),
               credit: 0,
               ledgerAccountId: personLedgerId,
               detailedAccountId: transaction.personId});
            items.push({
               description: transaction.description ? transaction.description + ` - برداشت از ${resourceName}` : `پرداخت وجه به مبلغ ${formattedAmount} از ${resourceName} بابت رسید شماره ${newTransaction.receiptNumber || newTransaction.id}`,
               debit: 0,
               credit: Number(transaction.amount),
               ledgerAccountId: resourceLedgerId});
         }
     }
     if (!transaction.skipAccounting) {
         await addAccountingDocument({
            date: transaction.date || new Date().toISOString().split('T')[0],
            description: docDescription,
            status: 'approved',
            sourceType: docType,
            sourceId: newTransaction.id,
            items});
     }
  } catch(e) {}

    await syncInvoiceAllocations(newTransaction);
  return newTransaction;
};

export const updateTransaction = async (id: string | number, updated: any) => {
  let activeYear = null;
  if (updated.date) activeYear = await checkFinancialYear(updated.date);
  const updatedData = { ...updated, updatedAt: Date.now() };
  if (activeYear) updatedData.fiscalYearId = activeYear.id;
  try {
     const table = mapTransactionTypeToTable(updatedData.type);
     const newTx = await updateLocalData(table, id, updatedData);
     if (typeof addSystemLog !== 'undefined') {
       await addSystemLog('UPDATE_' + 'Transaction'.toUpperCase(), `ویرایش رکورد در ${table}`, 'Transaction', newTx.id);
     }

     // Auto-update corresponding accounting document
     try {
       const accountingDocs = await getAccountingDocuments();
       const existingDoc = accountingDocs.find((d: any) => (d.sourceType === 'receipt' || d.sourceType === 'payment') && String(d.sourceId) === String(id));
       
       if (existingDoc) {
         const ledgerAccounts = await getLedgerAccounts();
         const defaultLedger = ledgerAccounts.length > 0 ? ledgerAccounts[0].id : '';

         // Find Person Ledger Account
         let personLedgerId = defaultLedger;
         let personName = 'نامشخص';
         if (updated.personId) {
            const persons = await getLocalData<any[]>('persons', []);
            const person = persons.find(p => String(p.id) === String(updated.personId));
            if (person) {
               personName = person.name || person.alias || 'نامشخص';
               if (person.accountingCode) {
                  const acc = ledgerAccounts.find(a => a.code === person.accountingCode);
                  if (acc) personLedgerId = acc.id;
               }
            }
         }
         
         const getAccountForCode2 = async (code: string, title: string, parentCode: string, nature: 'debit' | 'credit') => {
            let acc = ledgerAccounts.find(a => a.code === code);
            if (acc) return acc.id;
            const parentAcc = ledgerAccounts.find(a => a.code === parentCode);
            if (parentAcc) {
                const newAcc = { id: generateId(), code, title, type: 'subsidiary', nature, parentId: parentAcc.id };
                                await addLedgerAccount(newAcc);
                ledgerAccounts.push(newAcc);
                return newAcc.id;
            }
            return defaultLedger;
         };

         if (updated.categoryId === 'loan_given' || updated.categoryId === 'loan_installment_received') {
            personLedgerId = await getAccountForCode2('1601', 'وام‌های پرداختی', '16', 'debit');
         } else if (updated.categoryId === 'loan_received' || updated.categoryId === 'loan_installment_paid') {
            personLedgerId = await getAccountForCode2('2201', 'وام‌های دریافتی', '22', 'credit');
         }

         // Find Bank/Cashbox Resource Ledger Account
         let resourceLedgerId = defaultLedger;
         let resourceName = 'نامشخص';
         const resType = updated.resourceType || (updated.accountId ? 'bank' : updated.cashboxId ? 'cashbox' : '');
         const resId = updated.resourceId || updated.accountId || updated.cashboxId;

         if (resType === 'bank' && resId) {
            const accountsList = await getLocalData<any[]>('accounts', []);
            const account = accountsList.find(a => String(a.id) === String(resId));
            if (account) {
               resourceName = account.title || account.bankName || 'نامشخص';
               if (account.accountingCode) {
                  const acc = ledgerAccounts.find(a => a.code === account.accountingCode);
                  if (acc) resourceLedgerId = acc.id;
               } else {
                  const acc = ledgerAccounts.find(a => a.code === '1102');
                  if (acc) resourceLedgerId = acc.id;
               }
            }
         } else if (resType === 'cashbox' && resId) {
            const cashboxesList = await getLocalData<any[]>('cashboxes', []);
            const cashbox = cashboxesList.find(c => String(c.id) === String(resId));
            if (cashbox) {
               resourceName = cashbox.name || 'نامشخص';
               if (cashbox.accountingCode) {
                  const acc = ledgerAccounts.find(a => a.code === cashbox.accountingCode);
                  if (acc) resourceLedgerId = acc.id;
               } else {
                  const acc = ledgerAccounts.find(a => a.code === '1101');
                  if (acc) resourceLedgerId = acc.id;
               }
            }
         } else {
            const acc = ledgerAccounts.find(a => a.code === '11');
            if (acc) resourceLedgerId = acc.id;
         }

         const formattedAmount = Number(updated.amount || 0).toLocaleString('fa-IR');
         const sysSettings = await getStoreSettings();
         const currency = updated.currency || sysSettings?.currency || 'تومان';
         const typeText = updated.type === 'receive' ? 'دریافت' : updated.type === 'salary' ? 'حقوق و دستمزد' : 'پرداخت';
         let methodText = 'نقدی';
         if (updated.method === 'check') methodText = 'چک';
         else if (updated.method === 'transfer' || updated.method === 'card') methodText = 'حواله/کارت به کارت';
         let docDescription = '';
         if (updated.type === 'salary') {
             if (updated.description && !updated.description.includes('isPayslip')) {
                docDescription = `${updated.description} برای کارمند: ${personName}`;
             } else {
                docDescription = `حقوق و دستمزد به مبلغ ${formattedAmount} ${currency} برای کارمند: ${personName}`;
             }
         } else {
             docDescription = `${typeText} ${methodText} به مبلغ ${formattedAmount} ${currency}`;
             if (personName && personName !== 'نامشخص') {
                if (updated.type === 'receive') {
                   docDescription += ` از طرف حساب: ${personName}`;
                } else {
                   docDescription += ` به طرف حساب: ${personName}`;
                }
             }
             if (resourceName && resourceName !== 'نامشخص') {
                if (updated.type === 'receive') {
                   docDescription += ` - واریز به حساب/صندوق: ${resourceName}`;
                } else {
                   docDescription += ` - برداشت از حساب/صندوق: ${resourceName}`;
                }
             }
         }
         if (newTx.receiptNumber) {
            docDescription += ` (شماره سند/رسید: ${newTx.receiptNumber})`;
         }
         if (updated.method === 'check' && updated.checkNumber) {
            docDescription += ` - چک شماره ${updated.checkNumber}`;
            if (updated.checkDueDate) docDescription += ` به سررسید ${updated.checkDueDate}`;
            if (updated.checkBankName) docDescription += ` عهده بانک ${updated.checkBankName}`;
         }
         if (updated.description) {
            docDescription += ` [توضیحات: ${updated.description}]`;
         }
         const items = [];
         if (updated.method === 'check') {
             await syncInvoiceAllocations(newTx);
             return newTx; // Check accounting is fully handled by syncCheckAccountingDocument
         } else {

         if (updated.categoryId === 'loan_given' || updated.categoryId === 'loan_received') {
             const interestAmt = Number((updated as any).interestAmount) || 0;
             const principal = Number(updated.amount);
             const totalPayable = principal + interestAmt;
             
             if (updated.categoryId === 'loan_given') {
                 items.push({
                     description: updated.description ? updated.description + ` - طرف حساب ${personName}` : `اعطای وام به ${personName}`,
                     debit: totalPayable, credit: 0,
                     ledgerAccountId: personLedgerId, detailedAccountId: updated.personId
                 });
                 items.push({
                     description: updated.description ? updated.description + ` - برداشت از ${resourceName}` : `پرداخت وجه بابت اعطای وام`,
                     debit: 0, credit: principal,
                     ledgerAccountId: resourceLedgerId
                 });
                 if (interestAmt > 0) {
                     const interestAcc = ledgerAccounts.find((a: any) => a.title.includes('درآمد') && a.title.includes('بهره')) || ledgerAccounts.find((a: any) => String(a.code).startsWith('4')) || { id: defaultLedger };
                     items.push({
                         description: `شناسایی درآمد بهره بابت وام شماره ${(updated.id || '').replace('txn-loan-', '')}`,
                         debit: 0, credit: interestAmt,
                         ledgerAccountId: interestAcc.id
                     });
                 }
             } else {
                 items.push({
                     description: updated.description ? updated.description + ` - واریز به ${resourceName}` : `دریافت وجه بابت وام دریافتی`,
                     debit: principal, credit: 0,
                     ledgerAccountId: resourceLedgerId
                 });
                 if (interestAmt > 0) {
                     const expenseAcc = ledgerAccounts.find((a: any) => String(a.code) === '53' || String(a.code) === '5') || { id: defaultLedger };
                     items.push({
                         description: `شناسایی هزینه بهره بابت وام دریافتی شماره ${(updated.id || '').replace('txn-loan-', '')}`,
                         debit: interestAmt, credit: 0,
                         ledgerAccountId: expenseAcc.id
                     });
                 }
                 items.push({
                     description: updated.description ? updated.description + ` - طرف حساب ${personName}` : `اخذ وام از ${personName}`,
                     debit: 0, credit: totalPayable,
                     ledgerAccountId: personLedgerId, detailedAccountId: updated.personId
                 });
             }
         } else if (updated.type === 'receive') {

                items.push({
                   description: updated.description ? updated.description + ` - مبلغ ${formattedAmount} واریز به ${resourceName}` : `دریافت وجه به مبلغ ${formattedAmount} واریز به ${resourceName} بابت رسید دریافت شماره ${updated.receiptNumber || updated.id}`,
                   debit: Number(updated.amount),
                   credit: 0,
                   ledgerAccountId: resourceLedgerId});
                items.push({
                   description: updated.description ? updated.description + ` - طرف حساب ${personName}` : `طرف حساب ${personName} به مبلغ ${formattedAmount} بابت رسید دریافت شماره ${updated.receiptNumber || updated.id}`,
                   debit: 0,
                   credit: Number(updated.amount),
                   ledgerAccountId: personLedgerId,
                   detailedAccountId: updated.personId});
             } else if (updated.type === 'salary') {
                const expenseAcc = ledgerAccounts.find((a: any) => a.code === '52') || ledgerAccounts.find((a: any) => a.code === '5') || { id: defaultLedger };
                items.push({
                   description: `هزینه حقوق و دستمزد کارمند ${personName} بابت فیش حقوقی شماره ${updated.receiptNumber || updated.id}`,
                   debit: Number(updated.amount),
                   credit: 0,
                   ledgerAccountId: expenseAcc.id});
                items.push({
                   description: `طرف حساب ${personName} بابت حقوق و دستمزد شماره فیش ${updated.receiptNumber || updated.id}`,
                   debit: 0,
                   credit: Number(updated.amount),
                   ledgerAccountId: personLedgerId,
                   detailedAccountId: updated.personId});
             } else {
                items.push({
                   description: updated.description ? updated.description + ` - طرف حساب ${personName}` : `طرف حساب ${personName} به مبلغ ${formattedAmount} بابت رسید پرداخت شماره ${updated.receiptNumber || updated.id}`,
                   debit: Number(updated.amount),
                   credit: 0,
                   ledgerAccountId: personLedgerId,
                   detailedAccountId: updated.personId});
                items.push({
                   description: updated.description ? updated.description + ` - برداشت از ${resourceName}` : `پرداخت وجه به مبلغ ${formattedAmount} از ${resourceName} بابت رسید شماره ${updated.receiptNumber || updated.id}`,
                   debit: 0,
                   credit: Number(updated.amount),
                   ledgerAccountId: resourceLedgerId});
             }
         }
         await updateAccountingDocument(existingDoc.id, {
            ...existingDoc,
            date: updated.date || existingDoc.date,
            description: docDescription,
            items});
       }
     } catch (e) {
       console.error("Failed to update auto accounting doc for transaction:", e);
     }

     await syncInvoiceAllocations(newTx);
     return newTx;
  } catch (e) {
     throw new Error('Transaction not found');
  }
};

export const deleteTransaction = async (id: string) => {
  const transactions = await getTransactions();
  const t = transactions.find(tx => String(tx.id) === String(id));
  if (t) {
    const operations: any[] = [];
    const amount = Number(t.amount) || 0;
    if (t.resourceType === 'bank') {
      const accounts = await getLocalData<any[]>('accounts', []);
      const index = accounts.findIndex(a => a.id === t.resourceId);
      if (index !== -1) {
        let newBalance = accounts[index].balance;
        if (t.type === 'receive') {
          newBalance -= amount;
        } else {
          newBalance += amount;
        }
        operations.push({ type: 'update', key: 'accounts', id: accounts[index].id, data: { balance: newBalance } });
      }
    } else if (t.resourceType === 'cashbox') {
      const cashboxes = await getLocalData<any[]>('cashboxes', []);
      const index = cashboxes.findIndex(c => c.id === t.resourceId);
      if (index !== -1) {
        let newBalance = cashboxes[index].balance;
        if (t.type === 'receive') {
          newBalance -= amount;
        } else {
          newBalance += amount;
        }
        operations.push({ type: 'update', key: 'cashboxes', id: cashboxes[index].id, data: { balance: newBalance } });
      }
    }
    const table = mapTransactionTypeToTable(t.type);
    operations.push({ type: 'delete', key: table, id: id });
    if (t.type === 'salary') {
        const allPayslips = await getLocalData<any[]>('payslips', []);
        const toDelete = allPayslips.find(p => String(p.transactionId) === String(id));
        if (toDelete) {
            operations.push({ type: 'delete', key: 'payslips', id: toDelete.id });
        }
    }
    if (operations.length > 0) {
      await batchLocalData(operations);
    }
    
    // Clear allocations
    await syncInvoiceAllocations({ id, linkedInvoices: {} });

    // Delete corresponding accounting document
    try {
      const accDocs = await getLocalData<any[]>('accounting_documents', []);
      const docOperations: any[] = [];
      accDocs.forEach(d => {
         if (String(d.sourceId) === String(id) && (d.sourceType === 'receipt' || d.sourceType === 'payment')) {
            docOperations.push({ type: 'delete', key: 'accounting_documents', id: d.id });
         }
      });
      if (docOperations.length > 0) {
         await batchLocalData(docOperations);
      }
    } catch(e) {}
  }
};

export const getInvoices = async () => {
  const tables = ['invoices', 'sales_invoices', 'purchase_invoices', 'warehouse_receipts', 'warehouse_remittances', 'proforma_invoices', 'sale_returns', 'purchase_returns', 'wastes'];
  let allInvoices: any[] = [];
  for (const t of tables) {
     const data = await getLocalData<any[]>(t, [], { limit: 500 });
     if (data) allInvoices = allInvoices.concat(data);
  }
  
  // Deduplicate by ID
  const uniqueInv = new Map();
  allInvoices.forEach(inv => {
    if (inv && !inv.isDeleted) {
        if (!uniqueInv.has(inv.id) || inv.updatedAt > uniqueInv.get(inv.id).updatedAt) {
            uniqueInv.set(inv.id, inv);
        }
    }
  });
  
  return Array.from(uniqueInv.values()).sort((a, b) => b.createdAt - a.createdAt);
};

export const addInvoice = async (invoice: any, skipRecalc: boolean = false) => {
  let activeYear = null;
  if (invoice.date) activeYear = await checkFinancialYear(invoice.date);
  const now = Date.now();
  
  // Apply auto-generated invoice number if missing
  let finalInvoiceObj = { ...invoice };
  if (!finalInvoiceObj.invoiceNumber || finalInvoiceObj.invoiceNumber.trim() === '') {
     finalInvoiceObj.invoiceNumber = await generateDocNumber(finalInvoiceObj.type);
  }

  const newInvoice = { ...finalInvoiceObj, id: generateId(), createdAt: now, updatedAt: now, fiscalYearId: activeYear ? activeYear.id : undefined };
  await appendLocalData(mapInvoiceTypeToTable(newInvoice.type), newInvoice);
  
  if (newInvoice.invoiceNumber) {
     await updateDocCounter(newInvoice.type, newInvoice.invoiceNumber);
  }
  
  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('ADD_' + 'Invoice'.toUpperCase(), 'ثبت رکورد جدید در invoices', 'Invoice', newInvoice.id);
  }

  // Generate price history for invoice items
  if (newInvoice.type === 'purchase' || newInvoice.type === 'sale') {
     const affectedProducts = new Set<string>();
     if (newInvoice.items && Array.isArray(newInvoice.items)) {
         const historyItems: any[] = [];
         for (const item of newInvoice.items) {
             if (item.productId && Number(item.unitPrice) > 0) {
                 historyItems.push({
                     id: generateId(),
                     productId: item.productId,
                     date: newInvoice.date || new Date().toISOString().split('T')[0],
                     type: newInvoice.type,
                     price: Number(item.unitPrice),
                     invoiceId: newInvoice.id,
                     quantity: Number(item.quantity) || 0,
                     invoiceItemId: item.id || generateId()
                 });
                 affectedProducts.add(String(item.productId));
             }
         }
         if (historyItems.length > 0) {
             await Promise.all(historyItems.map(h => appendLocalData('product_price_history', h)));
         }
         if (affectedProducts.size > 0) {
             await syncProductsLatestPrices(Array.from(affectedProducts));
         }
     }
  }

  // Recalculate warehouse stocks automatically
  if (!skipRecalc) {
    await recalculateAllWarehouseStocks();
  }

  if (newInvoice.isDraft || newInvoice.status === 'draft') {
    return newInvoice;
  }

  try {
     const docType = newInvoice.type;
     let title = 'فاکتور';
     if (docType === 'sale') title = 'فاکتور فروش';
     if (docType === 'purchase') title = 'فاکتور خرید';
     if (docType === 'sale_return') title = 'برگشت از فروش';
     if (docType === 'purchase_return') title = 'برگشت از خرید';
     
     const items = [];
     const ledgerAccounts = await getLedgerAccounts();
     const defaultLedger = ledgerAccounts.length > 0 ? ledgerAccounts[0].id : '';
     const total = Number(newInvoice.totalAmount) || 0;

     // Find Customer/Supplier/Person Ledger Account
     let personLedgerId = defaultLedger;
     if (newInvoice.customerId) {
        const persons = await getLocalData<any[]>('persons', []);
        const person = persons.find(p => String(p.id) === String(newInvoice.customerId));
        if (person && person.accountingCode) {
           const acc = ledgerAccounts.find(a => a.code === person.accountingCode);
           if (acc) personLedgerId = acc.id;
        }
     }

     // Find Sales Revenue ('41') Ledger Account
     let salesLedgerId = defaultLedger;
     const salesAcc = ledgerAccounts.find(a => a.code === '41');
     if (salesAcc) salesLedgerId = salesAcc.id;

     // Find Inventory ('13') Ledger Account
     let inventoryLedgerId = defaultLedger;
     const inventoryAcc = ledgerAccounts.find(a => a.code === '13');
     if (inventoryAcc) inventoryLedgerId = inventoryAcc.id;
     
     if (docType === 'sale' || docType === 'purchase_return') {
        items.push({ description: 'شخص', debit: total, credit: 0, ledgerAccountId: personLedgerId, detailedAccountId: newInvoice.customerId});
        items.push({ description: 'درآمد/فروش', debit: 0, credit: total, ledgerAccountId: salesLedgerId});
     } else if (docType === 'purchase' || docType === 'sale_return') {
        items.push({ description: 'موجودی کالا', debit: total, credit: 0, ledgerAccountId: inventoryLedgerId});
        items.push({ description: 'شخص', debit: 0, credit: total, ledgerAccountId: personLedgerId, detailedAccountId: newInvoice.customerId});
     }
     
     if (items.length > 0) {
       await addAccountingDocument({
          date: newInvoice.date || new Date().toISOString().split('T')[0],
          description: `${title} شماره ${newInvoice.invoiceNumber || newInvoice.id}`,
          status: 'approved',
          sourceType: docType === 'sale' ? 'invoice_sale' : docType === 'purchase' ? 'invoice_purchase' : docType === 'sale_return' ? 'invoice_sale_return' : 'invoice_purchase_return',
          sourceId: newInvoice.id,
          items});
     }
  } catch(e) {}

  return newInvoice;
};

export const updateInvoice = async (id: string | number, updated: any, skipRecalc: boolean = false) => {
  let activeYear = null;
  if (updated.date) activeYear = await checkFinancialYear(updated.date);
  
  const updatedData = { ...updated, updatedAt: Date.now() };
  if (activeYear) updatedData.fiscalYearId = activeYear.id;
  const table = updatedData.type ? mapInvoiceTypeToTable(updatedData.type) : 'invoices';
  const newInvoice = await updateLocalData(table, id, updatedData);
  
  if (newInvoice && newInvoice.invoiceNumber) {
      await updateDocCounter(newInvoice.type, newInvoice.invoiceNumber);
  }
  
  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('UPDATE_' + 'Invoice'.toUpperCase(), 'ویرایش رکورد در invoices', 'Invoice', newInvoice.id);
  }

  // Generate/Update price history for invoice items
  if (newInvoice.type === 'purchase' || newInvoice.type === 'sale') {
      try {
          const oldHistories = await getLocalData<any[]>('product_price_history', []);
          const filteredHistories = oldHistories.filter(h => h.invoiceId?.toString() !== newInvoice.id?.toString());
          
          const affectedProducts = new Set<string>();
          if (newInvoice.items && Array.isArray(newInvoice.items)) {
              for (const item of newInvoice.items) {
                  if (item.productId && Number(item.unitPrice) > 0) {
                      filteredHistories.push({
                          id: generateId(),
                          productId: item.productId,
                          date: newInvoice.date || new Date().toISOString().split('T')[0],
                          type: newInvoice.type,
                          price: Number(item.unitPrice),
                          invoiceId: newInvoice.id,
                          quantity: Number(item.quantity) || 0,
                          invoiceItemId: item.id || generateId()
                      });
                      affectedProducts.add(String(item.productId));
                  }
              }
          }
          await saveLocalData('product_price_history', filteredHistories);
          if (affectedProducts.size > 0) {
              await syncProductsLatestPrices(Array.from(affectedProducts));
          }
      } catch (e) {
          console.error(e);
      }
  }

  // Auto-update corresponding accounting document
  try {
     const docType = newInvoice.type;
     const title = docType === 'sale' ? 'فاکتور فروش' : docType === 'purchase' ? 'فاکتور خرید' : docType === 'sale_return' ? 'برگشت از فروش' : docType === 'purchase_return' ? 'برگشت از خرید' : 'فاکتور';
     
     const accountingDocs = await getAccountingDocuments();
     const existingDoc = accountingDocs.find((d: any) => 
       (d.sourceType === 'invoice_sale' || d.sourceType === 'invoice_purchase' || d.sourceType === 'invoice_sale_return' || d.sourceType === 'invoice_purchase_return') && String(d.sourceId) === String(id)
     );
     
     if (existingDoc) {
       const ledgerAccounts = await getLedgerAccounts();
       const defaultLedger = ledgerAccounts.length > 0 ? ledgerAccounts[0].id : '';
       const total = Number(newInvoice.totalAmount) || 0;

       // Find Customer/Supplier/Person Ledger Account
       let personLedgerId = defaultLedger;
       if (newInvoice.customerId) {
          const persons = await getLocalData<any[]>('persons', []);
          const person = persons.find(p => String(p.id) === String(newInvoice.customerId));
          if (person && person.accountingCode) {
             const acc = ledgerAccounts.find(a => a.code === person.accountingCode);
             if (acc) personLedgerId = acc.id;
          }
       }

       // Find Sales Revenue ('41') Ledger Account
       let salesLedgerId = defaultLedger;
       const salesAcc = ledgerAccounts.find(a => a.code === '41');
       if (salesAcc) salesLedgerId = salesAcc.id;

       // Find Inventory ('13') Ledger Account
       let inventoryLedgerId = defaultLedger;
       const inventoryAcc = ledgerAccounts.find(a => a.code === '13');
       if (inventoryAcc) inventoryLedgerId = inventoryAcc.id;

       const items = [];
       if (docType === 'sale' || docType === 'purchase_return') {
          items.push({ description: 'شخص', debit: total, credit: 0, ledgerAccountId: personLedgerId, detailedAccountId: newInvoice.customerId});
          items.push({ description: 'درآمد/فروش', debit: 0, credit: total, ledgerAccountId: salesLedgerId});
       } else if (docType === 'purchase' || docType === 'sale_return') {
          items.push({ description: 'موجودی کالا', debit: total, credit: 0, ledgerAccountId: inventoryLedgerId});
          items.push({ description: 'شخص', debit: 0, credit: total, ledgerAccountId: personLedgerId, detailedAccountId: newInvoice.customerId});
       }

       await updateAccountingDocument(existingDoc.id, {
          ...existingDoc,
          date: newInvoice.date || existingDoc.date || new Date().toISOString().split('T')[0],
          description: `${title} شماره ${newInvoice.invoiceNumber || newInvoice.id}`,
          items
       });
     }
  } catch (e) {
     console.error("Failed to update auto accounting doc for invoice:", e);
  }

  // Update auto-generated warehouse documents
  try {
     const invoices = await getInvoices();
     const relatedWarehouseDocs = invoices.filter((inv: any) => 
        inv.isAutoGenerated && 
        inv.sourceInvoiceId && 
        (String(inv.sourceInvoiceId) === String(id) || String(inv.sourceInvoiceId) === String(newInvoice.invoiceNumber))
     );
     
     for (const wDoc of relatedWarehouseDocs) {
         await updateLocalData(mapInvoiceTypeToTable(wDoc.type), wDoc.id, {
             ...wDoc,
             items: newInvoice.items.map((item: any) => ({
                 ...item,
                 warehouseId: item.warehouseId || newInvoice.warehouseId || wDoc.warehouseId,
             })),
             updatedAt: Date.now()
         });
     }
  } catch(e) {
      console.error("Failed to update auto warehouse docs:", e);
  }

  if (!skipRecalc) {
    await recalculateAllWarehouseStocks();
  }
  return newInvoice;
};

export const voidInvoice = async (id: string | number) => {
  const invoices = await getInvoices();
  const invoiceToVoid = invoices.find((p: any) => String(p.id) === String(id) || p.id === Number(id));
  
  if (invoiceToVoid) {
    const toVoidIds = new Set([id, Number(id), String(id)]);
    
    invoices.forEach(inv => {
       if (inv.isAutoGenerated && inv.sourceInvoiceId && (inv.sourceInvoiceId === invoiceToVoid.id || inv.sourceInvoiceId === invoiceToVoid.invoiceNumber)) {
          toVoidIds.add(inv.id);
          toVoidIds.add(String(inv.id));
       }
    });

    invoices.forEach(inv => {
      if (toVoidIds.has(inv.id) || toVoidIds.has(String(inv.id))) {
        inv.status = 'voided';
      }
    });
    
    for (const inv of invoices) {
       if (inv.status === 'voided') {
          await updateLocalData(mapInvoiceTypeToTable(inv.type), inv.id, inv);
       }
    }
  

    // Remove product price histories for the voided invoices
    const oldHistories = await getLocalData<any[]>('product_price_history', []);
    const affectedProductsForVoid = new Set<string>();
    const filteredHistories = oldHistories.filter(h => {
        if (toVoidIds.has(h.invoiceId) || toVoidIds.has(String(h.invoiceId))) {
            affectedProductsForVoid.add(String(h.productId));
            return false;
        }
        return true;
    });
    
    if (affectedProductsForVoid.size > 0) {
        await saveLocalData('product_price_history', filteredHistories);
        await syncProductsLatestPrices(Array.from(affectedProductsForVoid));
    }

    // void related accounting docs
    const accDocs = await getLocalData<any[]>('accounting_documents', []);
    let accDocsChanged = false;
    accDocs.forEach(d => {
       if (toVoidIds.has(d.sourceId) || toVoidIds.has(String(d.sourceId))) {
          d.status = 'voided';
          d.isDeleted = true; // also delete so it doesn't affect ledger
          accDocsChanged = true;
       }
    });
    if (accDocsChanged) await saveLocalData('accounting_documents', accDocs);

    await recalculateAllWarehouseStocks();
  }
};

export const deleteInvoice = async (id: string, forceDelete: boolean = false, skipRecalc: boolean = false) => {
  const invoices = await getInvoices();
  const invoiceToDelete = invoices.find((p: any) => String(p.id) === String(id) || p.id === Number(id) || p.id === String(id));
  
  if (invoiceToDelete) {
    if (invoiceToDelete.status !== 'draft' && !invoiceToDelete.isDraft && !forceDelete) {
      throw new Error('این فاکتور تایید شده است و قابلیت حذف ندارد. می‌توانید آن را ابطال یا مرجوع کنید.');
    }
    const toDeleteIds = new Set([id, Number(id), String(id)]);
    
    invoices.forEach(inv => {
       if (inv.isAutoGenerated && inv.sourceInvoiceId && (inv.sourceInvoiceId === invoiceToDelete.id || inv.sourceInvoiceId === invoiceToDelete.invoiceNumber)) {
          toDeleteIds.add(inv.id);
          toDeleteIds.add(String(inv.id));
       }
    });

    const operations: any[] = [];
    
    // Soft delete
    invoices.forEach(inv => {
      if (toDeleteIds.has(inv.id) || toDeleteIds.has(String(inv.id))) {
        operations.push({ type: 'delete', key: mapInvoiceTypeToTable(inv.type), id: inv.id });
      }
    });
    
    // Remove product price histories for the deleted invoices
    const oldHistories = await getLocalData<any[]>('product_price_history', []);
    const affectedProductsForDelete = new Set<string>();
    const filteredHistories = oldHistories.filter(h => {
        if (toDeleteIds.has(h.invoiceId) || toDeleteIds.has(String(h.invoiceId))) {
            affectedProductsForDelete.add(String(h.productId));
            return false;
        }
        return true;
    });
    
    if (affectedProductsForDelete.size > 0) {
        await saveLocalData('product_price_history', filteredHistories);
        await syncProductsLatestPrices(Array.from(affectedProductsForDelete));
    }

    // delete related accounting docs
    const accDocs = await getLocalData<any[]>('accounting_documents', []);
    accDocs.forEach(d => {
       if (toDeleteIds.has(d.sourceId) || toDeleteIds.has(String(d.sourceId))) {
          operations.push({ type: 'delete', key: 'accounting_documents', id: d.id });
       }
    });

    if (operations.length > 0) {
      await batchLocalData(operations);
    }
    
    // Clear allocations for the deleted invoice(s)
    try {
        const sales = await getLocalData<any[]>('sales_invoice_payments', []);
        const newSales = sales.filter(h => !toDeleteIds.has(h.invoiceId) && !toDeleteIds.has(String(h.invoiceId)) && !toDeleteIds.has(Number(h.invoiceId)));
        await saveLocalData('sales_invoice_payments', newSales);

        const purchases = await getLocalData<any[]>('purchase_invoice_payments', []);
        const newPurchases = purchases.filter(h => !toDeleteIds.has(h.invoiceId) && !toDeleteIds.has(String(h.invoiceId)) && !toDeleteIds.has(Number(h.invoiceId)));
        await saveLocalData('purchase_invoice_payments', newPurchases);
        
        // Also remove linkedInvoices from transactions
        const transactions = await getTransactions();
        let txChanged = false;
        for (const tx of transactions) {
             if (tx.linkedInvoices) {
                  let hasDel = false;
                  for (const invId of Object.keys(tx.linkedInvoices)) {
                       if (toDeleteIds.has(invId) || toDeleteIds.has(String(invId)) || toDeleteIds.has(Number(invId))) {
                            delete tx.linkedInvoices[invId];
                            hasDel = true;
                       }
                  }
                  if (hasDel) {
                       await updateLocalData(mapTransactionTypeToTable(tx.type), tx.id, tx);
                  }
             }
        }
    } catch(e) {}

    if (typeof addSystemLog !== 'undefined') {
       // addSystemLog is no-op, backend handles log for batch
    }

    // Recalculate warehouse stocks automatically
    if (!skipRecalc) {
      await recalculateAllWarehouseStocks();
    }
  }
};

