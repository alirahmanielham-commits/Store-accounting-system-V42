import { checkFinancialYear, getActiveFinancialYear, getStoreSettings } from './settingsService';
import { formatDateDisplay } from '../utils/format';

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


export const ensureLedgerAccount = async (
  entity: any,
  parentCode: string,
  subsidiaryCode: string,
  subsidiaryTitle: string,
  entityTitle: string,
  nature: string
) => {
  let finalAccountingCode = entity.accountingCode;
  const ledgerAccounts = await getLedgerAccounts();
  
  const parentGeneralAcc = ledgerAccounts.find(a => a.code === parentCode);
  if (!parentGeneralAcc) return finalAccountingCode;

  let subAcc = ledgerAccounts.find(a => a.code === subsidiaryCode);
  if (!subAcc) {
    subAcc = { id: generateId(), code: subsidiaryCode, title: subsidiaryTitle, type: 'subsidiary', nature, parentId: parentGeneralAcc.id };
    await addLedgerAccount(subAcc);
    ledgerAccounts.push(subAcc);
  }

  if (!finalAccountingCode || String(finalAccountingCode).trim() === '') {
    let maxAccSuffix = 0;
    ledgerAccounts.forEach(a => {
      if (a.code && a.code.startsWith(subsidiaryCode) && a.code.length > subsidiaryCode.length) {
        const s = Number(a.code.substring(subsidiaryCode.length));
        if (!isNaN(s) && s > maxAccSuffix) maxAccSuffix = s;
      }
    });
    finalAccountingCode = `${subsidiaryCode}${(maxAccSuffix + 1).toString().padStart(4, '0')}`;
    
    const newEntityLedger = {
      id: generateId(),
      code: finalAccountingCode,
      title: entityTitle,
      type: 'detailed',
      nature,
      parentId: subAcc.id
    };
    await addLedgerAccount(newEntityLedger);
  } else {
    const existingAcc = ledgerAccounts.find(a => a.code === finalAccountingCode);
    if (existingAcc && existingAcc.title !== entityTitle) {
      await updateLedgerAccount(existingAcc.id, { ...existingAcc, title: entityTitle });
    }
  }

  return finalAccountingCode;
};

export const getAccounts = async () => {
  const accounts = await getLocalData<any[]>('accounts', []);
  let modified = false;
  for (let i = 0; i < (accounts || []).length; i++) {
    if (!accounts[i].accountingCode || String(accounts[i].accountingCode).trim() === '') {
      accounts[i].accountingCode = await ensureLedgerAccount(
        accounts[i],
        '11',
        '1102',
        'بانک‌ها',
        accounts[i].bankName + ' - ' + (accounts[i].branchName || ''),
        'debit'
      );
      modified = true;
    }
  }
  if (modified) {
    await saveLocalData('accounts', accounts);
  }
  return accounts.sort((a, b) => b.createdAt - a.createdAt);
};

export const addAccount = async (account: any) => {
  const now = Date.now();
  let finalAccountingCode = await ensureLedgerAccount(account, '11', '1102', 'بانک‌ها', account.bankName + ' - ' + (account.branchName || ''), 'debit');
  const newAccount = { ...account, accountingCode: finalAccountingCode, id: generateId(), createdAt: now, updatedAt: now };
  await appendLocalData('accounts', newAccount);
  return newAccount;
};

export const updateAccount = async (id: string, account: any) => {
  const accounts = await getLocalData<any[]>('accounts', []);
  const oldAccount = accounts.find((p: any) => String(p.id) === String(id));
  if (oldAccount) {
    const mergedAccount = { ...oldAccount, ...account };
    let finalAccountingCode = await ensureLedgerAccount(mergedAccount, '11', '1102', 'بانک‌ها', mergedAccount.bankName + ' - ' + (mergedAccount.branchName || ''), 'debit');
    return await updateLocalData('accounts', id, { ...mergedAccount, accountingCode: finalAccountingCode, updatedAt: Date.now() });
  }
  return null;
};

export const deleteAccount = async (id: string) => {
  await batchLocalData([{ type: 'delete', key: 'accounts', id }]);
};

export const getCashboxes = async () => {
  const cashboxes = await getLocalData<any[]>('cashboxes', []);
  let modified = false;
  for (let i = 0; i < (cashboxes || []).length; i++) {
    if (!cashboxes[i].accountingCode || String(cashboxes[i].accountingCode).trim() === '') {
      cashboxes[i].accountingCode = await ensureLedgerAccount(
        cashboxes[i],
        '11',
        '1101',
        'صندوق‌ها',
        cashboxes[i].name,
        'debit'
      );
      modified = true;
    }
  }
  if (modified) {
    await saveLocalData('cashboxes', cashboxes);
  }
  return cashboxes.sort((a, b) => b.createdAt - a.createdAt);
};

export const addCashbox = async (cashbox: any) => {
  const now = Date.now();
  let finalAccountingCode = await ensureLedgerAccount(cashbox, '11', '1101', 'صندوق‌ها', cashbox.name, 'debit');
  const newCashbox = { ...cashbox, accountingCode: finalAccountingCode, id: generateId(), createdAt: now, updatedAt: now };
  await appendLocalData('cashboxes', newCashbox);
  return newCashbox;
};

export const updateCashbox = async (id: string, cashbox: any) => {
  const cashboxes = await getLocalData<any[]>('cashboxes', []);
  const oldCashbox = cashboxes.find((p: any) => String(p.id) === String(id));
  if (oldCashbox) {
    const mergedCashbox = { ...oldCashbox, ...cashbox };
    let finalAccountingCode = await ensureLedgerAccount(mergedCashbox, '11', '1101', 'صندوق‌ها', mergedCashbox.name, 'debit');
    return await updateLocalData('cashboxes', id, { ...mergedCashbox, accountingCode: finalAccountingCode, updatedAt: Date.now() });
  }
  return null;
};

export const deleteCashbox = async (id: string) => {
  await batchLocalData([{ type: 'delete', key: 'cashboxes', id }]);
};

export const getCheckbooks = async () => {
  const data = await getLocalData<any>('checkbooks', []);
  if (data && (data as any).data) return data; // Server-side paginated response
  return (Array.isArray(data) ? data : []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const addCheckbook = async (record: any) => {
  const data = await getLocalData<any[]>('checkbooks', []);
  const now = Date.now();
  const activeYear = await getActiveFinancialYear();
  const newItem = { ...record, id: generateId(), createdAt: now, updatedAt: now, fiscalYearId: activeYear ? activeYear.id : undefined };
  data.push(newItem);
  await saveLocalData('checkbooks', data);
  
  if (newItem.startNumber && newItem.endNumber) {
     const start = parseInt(newItem.startNumber);
     const end = parseInt(newItem.endNumber);
     if (!isNaN(start) && !isNaN(end) && end >= start) {
         const padding = newItem.startNumber.length;
         const issuedChecks = await getLocalData<any[]>('issued_checks', []);
         for (let i = start; i <= end; i++) {
             issuedChecks.push({
                 id: generateId(),
                 checkbookId: newItem.id,
                 checkNumber: String(i).padStart(padding, '0'),
                 amount: 0,
                 issueDate: "",
                 dueDate: "",
                 payeeId: "",
                 status: 'blank',
                 createdAt: now,
                 updatedAt: now,
                 fiscalYearId: activeYear ? activeYear.id : undefined
             });
         }
         await saveLocalData('issued_checks', issuedChecks);
     }
  }

  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('ADD_' + 'Checkbook'.toUpperCase(), 'ثبت رکورد جدید در checkbooks', 'Checkbook', newItem.id);
  }
  return newItem;
};

export const updateCheckbook = async (id: string, record: any) => {
  const data = await getLocalData<any[]>('checkbooks', []);
  const index = data.findIndex((p: any) => String(p.id) === String(id));
  if (index !== -1) {
    const activeYear = await getActiveFinancialYear();
    data[index] = { ...data[index], ...record, updatedAt: Date.now() };
    if (activeYear) {
      data[index].fiscalYearId = activeYear.id;
    }
    await saveLocalData('checkbooks', data);
  
  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('UPDATE_' + 'Checkbook'.toUpperCase(), 'ویرایش رکورد در checkbooks', 'Checkbook', data[index].id);
  }

    return data[index];
  }
  return null;
};

export const deleteCheckbook = async (id: string) => {
  const data = await getLocalData<any[]>('checkbooks', []);
  const index = data.findIndex(c => String(c.id) === String(id));
  if (index !== -1) {
    data[index].deletedAt = new Date().toISOString();
    await saveLocalData('checkbooks', data);
  }
  return;
};

export const getIssuedChecks = async (page?: number, pageSize?: number, sortBy?: string, sortDir?: string) => {
  const query: any = { status: 'all' };
  if (page) query.page = page;
  if (pageSize) query.pageSize = pageSize;
  if (sortBy) query.sortBy = sortBy;
  if (sortDir) query.sortDir = sortDir;
  const data = await getLocalData<any>('issued_checks', [], query);
  if (data && data.data) return data; // Server-side paginated response
  return data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getCheckAuditLogs = async (checkId?: string | number, checkType?: 'issued' | 'received') => {
  const data = await getLocalData<any[]>('check_audit_logs', []);
  let filtered = data;
  if (checkId) filtered = filtered.filter(h => String(h.checkId) === String(checkId));
  if (checkType) filtered = filtered.filter(h => h.checkType === checkType);
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};


export const addCheckHistoryLog = async (record: { checkId: string | number, checkType: 'issued' | 'received', oldStatus?: string, newStatus?: string, description?: string, userId?: string }) => {
  const now = new Date().toISOString();
  const newItem = { ...record, id: Math.random().toString(36).substring(2, 15), createdAt: now };
  await appendLocalData('check_history', newItem);
  return newItem;
};

export const addCheckAuditLog = async (record: { checkId: string | number, checkType: 'issued' | 'received', action: string, oldValues?: any, newValues?: any, userId?: string }) => {
  const now = new Date().toISOString();
  const newItem = { ...record, id: (Math.random() + 1).toString(36).substring(7), createdAt: now };
  await appendLocalData('check_audit_logs', newItem);
  return newItem;
};

export const addIssuedCheck = async (record: any) => {
  if (Number(record.amount) <= 0) {
    throw new Error('مبلغ چک نامعتبر است');
  }
  const existing = await getIssuedChecks();
  if (record.checkNumber && record.checkbookId && existing.some(c => c.checkNumber === record.checkNumber && c.checkbookId === record.checkbookId && c.status !== 'cancelled')) {
    throw new Error('این شماره چک قبلاً در این دسته‌چک ثبت شده است');
  }

  let activeYear = null;
  if (record.issueDate) activeYear = await checkFinancialYear(record.issueDate);
  const now = Date.now();
  const newItem = { ...record, id: generateId(), createdAt: now, updatedAt: now, fiscalYearId: activeYear ? activeYear.id : undefined };
  await appendLocalData('issued_checks', newItem);
  await addCheckAuditLog({ checkId: newItem.id, checkType: 'issued', action: 'create', newValues: newItem, userId: 'system' });
  
  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('ADD_' + 'IssuedCheck'.toUpperCase(), 'ثبت رکورد جدید در issued_checks', 'IssuedCheck', newItem.id);
  }

  try {
    await syncCheckAccountingDocument('issued', newItem);
  } catch (e) {}

  return newItem;
};

export const updateIssuedCheck = async (id: string, record: any) => {
  if (record.amount !== undefined && Number(record.amount) <= 0) {
    throw new Error('مبلغ چک نامعتبر است');
  }
  const oldChecks = await getIssuedChecks();
  if (record.checkNumber && record.checkbookId && oldChecks.some(c => c.id !== id && c.checkNumber === record.checkNumber && c.checkbookId === record.checkbookId && c.status !== 'cancelled')) {
    throw new Error('این شماره چک قبلاً در این دسته‌چک ثبت شده است');
  }

  let activeYear = null;
  if (record.issueDate) activeYear = await checkFinancialYear(record.issueDate);
  const updatedData = { ...record, updatedAt: Date.now() };
  try {
     const oldChecks = await getIssuedChecks();
     const previous = oldChecks.find((c: any) => String(c.id) === String(id));
     const saved = await updateLocalData('issued_checks', id, updatedData);
     await addCheckAuditLog({ checkId: saved.id, checkType: 'issued', action: 'update', oldValues: previous, newValues: saved, userId: 'system' });
     if (previous && previous.status !== saved.status) {
       await addCheckHistoryLog({ checkId: saved.id, checkType: 'issued', oldStatus: previous.status, newStatus: saved.status, userId: 'system' });
     }
     if (typeof addSystemLog !== 'undefined') {
       await addSystemLog('UPDATE_' + 'IssuedCheck'.toUpperCase(), 'ویرایش رکورد در issued_checks', 'IssuedCheck', saved.id);
     }
     if (saved) {
       await syncCheckAccountingDocument('issued', saved, previous);
     }
     return saved;
  } catch (e) {
     throw e;
  }
};

export const deleteIssuedCheck = async (id: string) => {
  const data = await getLocalData<any[]>('issued_checks', []);
  const index = data.findIndex(c => String(c.id) === String(id));
  if (index !== -1) {
    data[index].deletedAt = new Date().toISOString();
    await saveLocalData('issued_checks', data);
    try {
      const existingDocs = await getAccountingDocuments();
      for (const d of existingDocs) {
        if ((d.sourceType === 'check_issued_init' && String(d.sourceId) === String(id)) ||
            (d.sourceType === 'check_issued_status' && String(d.sourceId).startsWith(String(id)))) {
          await updateLocalData('accounting_documents', d.id, { ...d, isDeleted: true });
        }
      }
    } catch (e) {}
  }
};

export const getReceivedChecks = async (page?: number, pageSize?: number, sortBy?: string, sortDir?: string) => {
  const query: any = { status: 'all' };
  if (page) query.page = page;
  if (pageSize) query.pageSize = pageSize;
  if (sortBy) query.sortBy = sortBy;
  if (sortDir) query.sortDir = sortDir;
  const data = await getLocalData<any>('received_checks', [], query);
  return data.sort((a, b) => b.createdAt - a.createdAt);
};

export const addReceivedCheck = async (record: any) => {
  if (Number(record.amount) <= 0) {
    throw new Error('مبلغ چک نامعتبر است');
  }
  const existing = await getReceivedChecks();
  if (record.checkNumber && record.bankName && existing.some(c => c.checkNumber === record.checkNumber && c.bankName === record.bankName && c.status !== 'returned')) {
    throw new Error('این شماره چک از این بانک قبلاً ثبت شده است');
  }

  const checkDate = record.receiveDate || record.issueDate;
  let activeYear = null;
  if (checkDate) activeYear = await checkFinancialYear(checkDate);
  const now = Date.now();
  const newItem = { ...record, id: generateId(), createdAt: now, updatedAt: now, fiscalYearId: activeYear ? activeYear.id : undefined };
  await appendLocalData('received_checks', newItem);
  await addCheckAuditLog({ checkId: newItem.id, checkType: 'received', action: 'create', newValues: newItem, userId: 'system' });
  
  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('ADD_' + 'ReceivedCheck'.toUpperCase(), 'ثبت رکورد جدید در received_checks', 'ReceivedCheck', newItem.id);
  }

  try {
    await syncCheckAccountingDocument('received', newItem);
  } catch (e) {}

  return newItem;
};

export const updateReceivedCheck = async (id: string, record: any) => {
  if (record.amount !== undefined && Number(record.amount) <= 0) {
    throw new Error('مبلغ چک نامعتبر است');
  }
  const oldChecks = await getReceivedChecks();
  if (record.checkNumber && record.bankName && oldChecks.some(c => c.id !== id && c.checkNumber === record.checkNumber && c.bankName === record.bankName && c.status !== 'returned')) {
    throw new Error('این شماره چک از این بانک قبلاً ثبت شده است');
  }

  const checkDate = record.receiveDate || record.issueDate;
  let activeYear = null;
  if (checkDate) activeYear = await checkFinancialYear(checkDate);
  const updatedData = { ...record, updatedAt: Date.now() };
  try {
     const oldChecks = await getReceivedChecks();
     const previous = oldChecks.find((c: any) => String(c.id) === String(id));
     const saved = await updateLocalData('received_checks', id, updatedData);
     await addCheckAuditLog({ checkId: saved.id, checkType: 'received', action: 'update', oldValues: previous, newValues: saved, userId: 'system' });
     if (previous && previous.status !== saved.status) {
       await addCheckHistoryLog({ checkId: saved.id, checkType: 'received', oldStatus: previous.status, newStatus: saved.status, userId: 'system' });
     }
     if (typeof addSystemLog !== 'undefined') {
       await addSystemLog('UPDATE_' + 'ReceivedCheck'.toUpperCase(), 'ویرایش رکورد در received_checks', 'ReceivedCheck', saved.id);
     }
     if (saved) {
       await syncCheckAccountingDocument('received', saved, previous);
     }
     return saved;
  } catch (e) {
     throw e;
  }
};

export const deleteReceivedCheck = async (id: string) => {
  const data = await getLocalData<any[]>('received_checks', []);
  const index = data.findIndex(c => String(c.id) === String(id));
  if (index !== -1) {
    data[index].deletedAt = new Date().toISOString();
    await saveLocalData('received_checks', data);
    try {
      const existingDocs = await getAccountingDocuments();
      for (const d of existingDocs) {
        if ((d.sourceType === 'check_received_init' && String(d.sourceId) === String(id)) ||
            (d.sourceType === 'check_received_status' && String(d.sourceId).startsWith(String(id)))) {
          await updateLocalData('accounting_documents', d.id, { ...d, isDeleted: true });
        }
      }
    } catch (e) {}
  }
};

export const getRefundRequests = async () => {
  return await getLocalData<any[]>('refundRequests', []);
};

export const addRefundRequest = async (request: any) => {
  const now = Date.now();
  let activeYear = null;
  if (request.date) {
    activeYear = await checkFinancialYear(request.date);
  } else {
    activeYear = await getActiveFinancialYear();
  }
  const newRequest = { ...request, id: generateId(), createdAt: now, updatedAt: now, fiscalYearId: activeYear ? activeYear.id : undefined };
  await appendLocalData('refundRequests', newRequest);
  
  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('ADD_' + 'RefundRequest'.toUpperCase(), 'ثبت رکورد جدید در refundRequests', 'RefundRequest', newRequest.id);
  }

  return newRequest;
};

export const updateRefundRequest = async (id: string, updated: any) => {
  let activeYear = null;
  if (updated.date) {
    activeYear = await checkFinancialYear(updated.date);
  } else {
    activeYear = await getActiveFinancialYear();
  }
  const updatedData = { ...updated, updatedAt: Date.now() };
  if (activeYear) updatedData.fiscalYearId = activeYear.id;
  try {
     const saved = await updateLocalData('refundRequests', id, updatedData);
     if (typeof addSystemLog !== 'undefined') {
       await addSystemLog('UPDATE_' + 'RefundRequest'.toUpperCase(), 'ویرایش رکورد در refundRequests', 'RefundRequest', saved.id);
     }
     return saved;
  } catch(e) {
     return null;
  }
};

export const deleteRefundRequest = async (id: string) => {
  const requests = await getLocalData<any[]>('refundRequests', []);
  const index = requests.findIndex(r => String(r.id) === String(id));
  if (index !== -1) {
    await updateLocalData('refundRequests', id, { ...requests[index], isDeleted: true });
  }
};

export const getLoans = async () => getLocalData<any[]>('loans', []);

export const getLoanHistory = async (loanId?: string | number) => {
  const allHistory = await getLocalData<any[]>('loan_history', []);
  if (loanId !== undefined && loanId !== null && loanId !== '') {
    return allHistory.filter(h => String(h.loanId) === String(loanId));
  }
  return allHistory;
};

export const addLoanHistoryEntry = async (entry: { loanId: string | number; status: string; desc?: string; user?: string; date?: string }) => {
  const newEntry = {
    id: 'lh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    loanId: entry.loanId,
    status: entry.status,
    date: entry.date || new Date().toISOString(),
    desc: entry.desc || '',
    user: entry.user || 'سیستم',
    createdAt: new Date().toISOString()
  };
  await appendLocalData('loan_history', newEntry);
  return newEntry;
};

export const saveLoans = async (loans: any[]) => {
  const activeYear = await getActiveFinancialYear();
  const processedLoans = [];
  for (const loan of loans) {
    let fiscalYearId = loan.fiscalYearId;
    if (!fiscalYearId) {
      if (loan.startDate) {
        try {
          const yr = await checkFinancialYear(loan.startDate);
          if (yr) fiscalYearId = yr.id;
        } catch (e) {
          if (activeYear) fiscalYearId = activeYear.id;
        }
      } else if (activeYear) {
        fiscalYearId = activeYear.id;
      }
    }
    processedLoans.push({ ...loan, fiscalYearId });
  }
  await saveLocalData('loans', processedLoans);
};

export const getLedgerAccounts = async () => {
  let accs = await getLocalData<any[]>('ledger_accounts', []);
  if (accs.length === 0) {
    const assetsId = generateId();
    const liabilitiesId = generateId();
    const equityId = generateId();
    const incomeId = generateId();
    const expensesId = generateId();
    
    accs = [
      { id: assetsId, code: '1', title: 'دارایی‌ها', type: 'group', nature: 'debit', parentId: null },
      { id: liabilitiesId, code: '2', title: 'بدهی‌ها', type: 'group', nature: 'credit', parentId: null },
      { id: equityId, code: '3', title: 'حقوق صاحبان سهام', type: 'group', nature: 'credit', parentId: null },
      { id: incomeId, code: '4', title: 'درآمدها', type: 'group', nature: 'credit', parentId: null },
      { id: expensesId, code: '5', title: 'هزینه‌ها', type: 'group', nature: 'debit', parentId: null },
      
      { id: generateId(), code: '11', title: 'موجودی نقد و بانک', type: 'general', nature: 'debit', parentId: assetsId },
      { id: generateId(), code: '12', title: 'حساب‌ها و اسناد دریافتنی تجاری', type: 'general', nature: 'debit', parentId: assetsId },
      { id: generateId(), code: '13', title: 'موجودی مواد و کالا', type: 'general', nature: 'debit', parentId: assetsId },
      { id: generateId(), code: '14', title: 'پیش پرداخت‌ها', type: 'general', nature: 'debit', parentId: assetsId },
      { id: generateId(), code: '15', title: 'دارایی‌های ثابت', type: 'general', nature: 'debit', parentId: assetsId },
      
      { id: generateId(), code: '21', title: 'حساب‌ها و اسناد پرداختنی تجاری', type: 'general', nature: 'credit', parentId: liabilitiesId },
      { id: generateId(), code: '22', title: 'پیش دریافت‌ها', type: 'general', nature: 'credit', parentId: liabilitiesId },
      
      { id: generateId(), code: '31', title: 'سرمایه', type: 'general', nature: 'credit', parentId: equityId },
      
      { id: generateId(), code: '41', title: 'فروش کالا و خدمات', type: 'general', nature: 'credit', parentId: incomeId },
      
      { id: generateId(), code: '51', title: 'بهای تمام شده کالای فروش رفته', type: 'general', nature: 'debit', parentId: expensesId },
      { id: generateId(), code: '52', title: 'هزینه‌های حقوق و دستمزد', type: 'general', nature: 'debit', parentId: expensesId },
      { id: generateId(), code: '53', title: 'هزینه‌های اداری و تشکیلاتی', type: 'general', nature: 'debit', parentId: expensesId }
    ];
    await saveLocalData('ledger_accounts', accs);
  }
  return accs;
};

export const saveLedgerAccounts = async (data: any[]) => saveLocalData('ledger_accounts', data);

export const addLedgerAccount = async (la: any) => {
  const accs = await getLedgerAccounts();
  const added = { ...la, id: la.id || generateId() };
  accs.push(added);
  await saveLedgerAccounts(accs);
  return added;
};

export const updateLedgerAccount = async (id: string | number, updated: any) => {
  const accs = await getLedgerAccounts();
  const idx = accs.findIndex((x: any) => x.id?.toString() === id?.toString());
  if (idx > -1) {
    accs[idx] = updated;
    await saveLedgerAccounts(accs);
    return updated;
  }
  return null;
};

export const deleteLedgerAccount = async (id: string | number) => {
  const accs = await getLedgerAccounts();
  const newAccs = accs.filter((x: any) => x.id?.toString() !== id?.toString());
  await saveLedgerAccounts(newAccs);
};

export const getAccountingDocuments = async () => {
  const docs = await getLocalData<any[]>('accounting_documents', []);
  return (docs || [])
    .filter(d => !d.isDeleted)
    .sort((a, b) => {
       // Sort by documentNumber descending as primary, then createdAt
       const numB = Number(b.documentNumber || 0);
       const numA = Number(a.documentNumber || 0);
       if (numB !== numA) return numB - numA;
       
       const timeB = b.createdAt || new Date(b.date || 0).getTime() || 0;
       const timeA = a.createdAt || new Date(a.date || 0).getTime() || 0;
       return timeB - timeA;
    });
};

export const saveAccountingDocuments = async (data: any[]) => saveLocalData('accounting_documents', data);

export const addAccountingDocument = async (doc: any) => {
  if (doc.date) {
    doc.date = convertToGregorian(doc.date);
  }
  let activeYear = null;
  if (doc.date) activeYear = await checkFinancialYear(doc.date);
  
  // Generate a document number if not provided
  let docNum = doc.documentNumber;
  if (!docNum || String(docNum).trim() === '') {
     const settings = await getStoreSettings();
     if (settings && (settings as any).prefix_accounting_document !== undefined) {
         docNum = await generateDocNumber('accounting_document');
     } else {
         const docs = await getAccountingDocuments();
         let maxDocNum = 0;
         docs.forEach((d: any) => { if (Number(d.documentNumber) > maxDocNum) maxDocNum = Number(d.documentNumber); });
         docNum = String(maxDocNum + 1).padStart(4, '0');
     }
  }
  const sysSettings2 = await getStoreSettings();
  const sysCurrency2 = sysSettings2?.currency || 'تومان';
  doc.currency = doc.currency || sysCurrency2;
  if (doc.items && Array.isArray(doc.items)) {
     doc.items = doc.items.map((i) => ({ ...i, currency: i.currency || sysCurrency2 }));
  }
  const added = { ...doc, id: generateId(), documentNumber: docNum, createdAt: Date.now(), fiscalYearId: activeYear ? activeYear.id : undefined };
  await appendLocalData('accounting_documents', added);
  if (added.documentNumber) {
      await updateDocCounter('accounting_document', added.documentNumber);
  }
  return added;
};

export const updateAccountingDocument = async (id: string | number, updated: any) => {
  let activeYear = null;
  if (updated.date) activeYear = await checkFinancialYear(updated.date);
  if (updated.documentNumber) {
      await updateDocCounter('accounting_document', updated.documentNumber);
  }
  const sysSettings3 = await getStoreSettings();
  const sysCurrency3 = sysSettings3?.currency || 'تومان';
  updated.currency = updated.currency || sysCurrency3;
  if (updated.items && Array.isArray(updated.items)) {
     updated.items = updated.items.map((i) => ({ ...i, currency: i.currency || sysCurrency3 }));
  }
  const updatedDoc = { ...updated, updatedAt: Date.now() };
  if (activeYear) {
      updatedDoc.fiscalYearId = activeYear.id;
  }
  try {
     const saved = await updateLocalData('accounting_documents', id, updatedDoc);
     return saved;
  } catch (e) {
     return null;
  }
};

export const deleteAccountingDocument = async (id: string | number) => {
  const docs = await getAccountingDocuments();
  const index = docs.findIndex((x: any) => x.id?.toString() === id?.toString());
  if (index !== -1) {
    if (docs[index].isAutoGenerated) {
       throw new Error('اسناد اتوماتیک قابل حذف دستی نیستند.');
    }
    await updateLocalData('accounting_documents', id, { ...docs[index], isDeleted: true });
  }
};

export const syncCheckAccountingDocument = async (checkType: 'issued' | 'received', check: any, previousCheck?: any) => {
  try {
    const ledgerAccounts = await getLedgerAccounts();
    const defaultLedger = ledgerAccounts.length > 0 ? ledgerAccounts[0].id : '';
    const getAccountForCode = async (code: string, fallbackTitle: string, parentCode: string, nature: 'debit' | 'credit') => {
      const parentAcc = ledgerAccounts.find(a => a.code === parentCode);
      let acc = ledgerAccounts.find(a => a.code === code);
      if (acc) return acc.id;
      if (parentAcc) {
          const newAcc = { id: generateId(), code: code, title: fallbackTitle, type: 'subsidiary', nature, parentId: parentAcc.id };
          await addLedgerAccount(newAcc);
          ledgerAccounts.push(newAcc);
          return newAcc.id;
      }
      return defaultLedger;
    };
    const notesReceivableId = await getAccountForCode('1201', 'اسناد دریافتنی نزد صندوق', '12', 'debit');
    const inProcessNotesReceivableId = await getAccountForCode('1202', 'اسناد در جریان وصول', '12', 'debit');
    const notesPayableId = await getAccountForCode('2101', 'اسناد پرداختنی', '21', 'credit');
    const amount = Number(check.amount) || 0;
    const formattedAmount = amount.toLocaleString('fa-IR');
    const sysSettings = await getStoreSettings();
    const currency = check.currency || sysSettings?.currency || 'تومان';
    
    let personName = 'نامشخص';
    let personLedgerId = defaultLedger;
    const personId = checkType === 'issued' ? check.payeeId : check.payerId;
    if (personId) {
      const persons = await getLocalData<any[]>('persons', []);
      const person = persons.find(p => String(p.id) === String(personId));
      if (person) {
        personName = person.name || person.alias || 'نامشخص';
        if (person.accountingCode) {
          const acc = ledgerAccounts.find(a => a.code === person.accountingCode);
          if (acc) personLedgerId = acc.id;
        } else {
          const fallbackCode = checkType === 'issued' ? '21' : '1103';
          const acc = ledgerAccounts.find(a => a.code === fallbackCode);
          if (acc) personLedgerId = acc.id;
        }
      }
    }

    let bankName = 'نامشخص';
    let bankLedgerId = defaultLedger;
    let bankAccountId = check.bankAccountId || check.accountId;
    if (checkType === 'issued' && check.checkbookId) {
      const checkbooks = await getLocalData<any[]>('checkbooks', []);
      const cb = checkbooks.find(c => String(c.id) === String(check.checkbookId));
      if (cb && cb.accountId) {
        bankAccountId = cb.accountId;
        const accs = await getLocalData<any[]>('accounts', []);
        const acc = accs.find(a => String(a.id) === String(cb.accountId));
        if (acc) {
           bankName = acc.bankName;
        }
      }
    }

    const checkBank = check.bankName || check.checkBankName || bankName || 'نامشخص';
    const checkNo = check.checkNumber || check.number || 'نامشخص';
    
    const rawDueDate = check.dueDate || check.checkDueDate;
    const dueDate = rawDueDate ? formatDateDisplay(rawDueDate, sysSettings?.calendarType) : 'نامشخص';

    const issueDate = checkType === 'issued' ? (check.issueDate || check.issuedDate || check.date || new Date().toISOString()) : (check.receiveDate || check.date || new Date().toISOString()); 

    const initDescription = checkType === 'issued'
      ? `صدور چک شماره ${checkNo} عهده بانک ${checkBank} به مبلغ ${formattedAmount} ${currency} به سررسید ${dueDate} در وجه طرف حساب: ${personName}`
      : `دریافت چک شماره ${checkNo} عهده بانک ${checkBank} به مبلغ ${formattedAmount} ${currency} به سررسید ${dueDate} از طرف حساب: ${personName}`;

    const initItems = [];
    if (checkType === 'issued') {
      initItems.push({ description: `طرف حساب ${personName} بابت صدور چک شماره ${checkNo} عهده بانک ${checkBank} به سررسید ${dueDate}`, debit: amount, credit: 0, ledgerAccountId: personLedgerId, detailedAccountId: personId});
      initItems.push({ description: `اسناد پرداختنی تجاری بابت صدور چک شماره ${checkNo} در وجه ${personName}`, debit: 0, credit: amount, ledgerAccountId: notesPayableId});
    } else {
      initItems.push({ description: `اسناد دریافتنی تجاری بابت دریافت چک شماره ${checkNo} از ${personName}`, debit: amount, credit: 0, ledgerAccountId: notesReceivableId});
      initItems.push({ description: `طرف حساب ${personName} بابت دریافت چک شماره ${checkNo} عهده بانک ${checkBank} به سررسید ${dueDate}`, debit: 0, credit: amount, ledgerAccountId: personLedgerId, detailedAccountId: personId});
    }

    const existingDocs = await getAccountingDocuments();
    const doc = existingDocs.find(d => d.sourceType === `check_${checkType}_init` && String(d.sourceId) === String(check.id));
    
    if (doc) {
      await updateAccountingDocument(doc.id, {
        ...doc,
        date: issueDate,
        description: initDescription,
        items: initItems});
    } else {
      await addAccountingDocument({
        date: issueDate,
        description: initDescription,
        status: 'approved',
        sourceType: `check_${checkType}_init`,
        sourceId: check.id,
        isAutoGenerated: true,
        items: initItems});
    }

    // 2. Status Transition Document
    const status = check.status || 'pending';
    const statusDocType = `check_${checkType}_status`;
    const statusDocSourceId = `${check.id}_${status}`;

    // Clear old status documents
    const statusDocs = existingDocs.filter(d => d.sourceType === statusDocType && String(d.sourceId).startsWith(String(check.id)));
    for (const d of statusDocs) {
      if (status === 'pending' || d.sourceId !== statusDocSourceId) {
        await updateLocalData('accounting_documents', d.id, { ...d, isDeleted: true });
      }
    }

    if (status !== 'pending') {
      const statusItems = [];
      let statusDescription = '';
      if (status === 'deposited') {
        if (checkType === 'received') {
          statusDescription = `واگذاری چک دریافتی شماره ${checkNo} به حساب بانک ${bankName} (در جریان وصول)`;
          statusItems.push({
            description: `اسناد در جریان وصول بابت واگذاری چک شماره ${checkNo}`,
            debit: amount,
            credit: 0,
            ledgerAccountId: inProcessNotesReceivableId});
          statusItems.push({
            description: `اسناد دریافتنی نزد صندوق بابت واگذاری چک شماره ${checkNo}`,
            debit: 0,
            credit: amount,
            ledgerAccountId: notesReceivableId});
        }
      } else if (status === 'cashed') {
        if (checkType === 'issued') {
          statusDescription = `وصول چک صادره شماره ${checkNo} عهده بانک ${checkBank} به مبلغ ${formattedAmount} ${currency} و کسر از حساب بانک`;
          statusItems.push({
            description: `اسناد پرداختنی بابت وصول چک شماره ${checkNo} عهده بانک ${checkBank}`,
            debit: amount,
            credit: 0,
            ledgerAccountId: notesPayableId});
          statusItems.push({
            description: `بانک ${bankName} بابت کسر از حساب جهت وصول چک صادره شماره ${checkNo}`,
            debit: 0,
            credit: amount,
            ledgerAccountId: bankLedgerId});
        } else {
          statusDescription = `وصول چک دریافتی شماره ${checkNo} عهده بانک ${checkBank} به مبلغ ${formattedAmount} ${currency} و واریز به حساب بانک ${bankName}`;
          // Step 2: In process
          statusItems.push({
            description: `اسناد در جریان وصول بابت واگذاری چک شماره ${checkNo}`,
            debit: amount,
            credit: 0,
            ledgerAccountId: inProcessNotesReceivableId});
          statusItems.push({
            description: `اسناد دریافتنی نزد صندوق بابت واگذاری چک شماره ${checkNo}`,
            debit: 0,
            credit: amount,
            ledgerAccountId: notesReceivableId});
          // Step 3: Cashed
          statusItems.push({
            description: `بانک ${bankName} بابت واریز وجه چک وصول شده شماره ${checkNo}`,
            debit: amount,
            credit: 0,
            ledgerAccountId: bankLedgerId});
          statusItems.push({
            description: `اسناد در جریان وصول بابت وصول چک شماره ${checkNo}`,
            debit: 0,
            credit: amount,
            ledgerAccountId: inProcessNotesReceivableId});
        }
      } else if (status === 'cancelled') {
        if (checkType === 'issued') {
          statusDescription = `ابطال چک صادره شماره ${checkNo} عهده بانک ${checkBank} به مبلغ ${formattedAmount} ${currency} و برگشت بدهی طرف حساب: ${personName}`;
          statusItems.push({
            description: `اسناد پرداختنی بابت ابطال چک شماره ${checkNo}`,
            debit: amount,
            credit: 0,
            ledgerAccountId: notesPayableId});
          statusItems.push({
            description: `طرف حساب ${personName} بابت برگشت بدهی پس از ابطال چک شماره ${checkNo}`,
            debit: 0,
            credit: amount,
            ledgerAccountId: personLedgerId,
            detailedAccountId: personId});
        }
      } else if (status === 'assigned') {
        if (checkType === 'received') {
          const persons = await getLocalData<any[]>('persons', []);
          const assignedPersonName = (persons.find((p: any) => String(p.id) === String(check.assignedToId)) || {name: check.assignedToId}).name;
          statusDescription = `خرج چک دریافتی شماره ${checkNo} عهده بانک ${checkBank} به شخص ${assignedPersonName}`;
          statusItems.push({
            description: `بدهکار - شخص (حساب پرداختنی) بابت خرج چک ${checkNo}`,
            debit: amount,
            credit: 0,
            ledgerAccountId: (ledgerAccounts.find((a: any) => String(a.code).startsWith('21') || String(a.code) === '21') || {id: 0}).id,
            detailedAccountId: check.assignedToId});
          statusItems.push({
            description: `بستانکار - اسناد دریافتنی بابت خرج چک ${checkNo}`,
            debit: 0,
            credit: amount,
            ledgerAccountId: notesReceivableId});
        }
      } else if (status === 'bounced_assigned') {
        if (checkType === 'received') {
          const persons = await getLocalData<any[]>('persons', []);
          const assignedPersonName = (persons.find((p: any) => String(p.id) === String(check.assignedToId)) || {name: check.assignedToId}).name;
          statusDescription = `برگشت چک خرج شده شماره ${checkNo} از شخص ${assignedPersonName}`;
          // 1. Reversing the assignment (Person B didn't get their money, we owe them)
          statusItems.push({
            description: `بستانکار - شخص (حساب پرداختنی) بابت برگشت چک خرج شده ${checkNo}`,
            debit: 0,
            credit: amount,
            ledgerAccountId: (ledgerAccounts.find((a: any) => String(a.code).startsWith('21') || String(a.code) === '21') || {id: 0}).id,
            detailedAccountId: check.assignedToId});
          // 2. Reinstating the debt for the original payer (Person A owes us)
          statusItems.push({
            description: `بدهکار - طرف حساب ${personName} بابت برگشت چک خرج شده ${checkNo}`,
            debit: amount,
            credit: 0,
            ledgerAccountId: personLedgerId,
            detailedAccountId: personId});
        }
      } else if (status === 'returned' || status === 'bounced' || status === 'rejected') {
        if (checkType === 'issued') {
          // هیچ سند حسابداری برای برگشت چک پرداختی ثبت نمی‌شود (تعهد همچنان باقیست)
        } else {
          statusDescription = `برگشت چک دریافتی شماره ${checkNo} عهده بانک ${checkBank} و برگشت از شخص`;
          // Step 2: In process
          statusItems.push({
            description: `اسناد در جریان وصول بابت واگذاری چک شماره ${checkNo}`,
            debit: amount,
            credit: 0,
            ledgerAccountId: inProcessNotesReceivableId});
          statusItems.push({
            description: `اسناد دریافتنی نزد صندوق بابت واگذاری چک شماره ${checkNo}`,
            debit: 0,
            credit: amount,
            ledgerAccountId: notesReceivableId});
          // Step 3: Returned
          statusItems.push({
            description: `طرف حساب ${personName} بابت برگشت چک شماره ${checkNo}`,
            debit: amount,
            credit: 0,
            ledgerAccountId: personLedgerId,
            detailedAccountId: personId});
          statusItems.push({
            description: `اسناد در جریان وصول بابت برگشت چک شماره ${checkNo}`,
            debit: 0,
            credit: amount,
            ledgerAccountId: inProcessNotesReceivableId});
        }
      }

      if (statusItems.length > 0) {
        const existingStatusDoc = existingDocs.find(d => d.sourceType === statusDocType && String(d.sourceId) === statusDocSourceId);
        if (existingStatusDoc) {
          await updateAccountingDocument(existingStatusDoc.id, {
            ...existingStatusDoc,
            date: new Date().toISOString(),
            description: statusDescription,
            items: statusItems});
        } else {
          await addAccountingDocument({
            date: new Date().toISOString(),
            description: statusDescription,
            status: 'approved',
            sourceType: statusDocType,
            sourceId: statusDocSourceId,
            isAutoGenerated: true,
            items: statusItems});
        }
      }
    }
  } catch (e) {
    console.error("Error syncing check accounting doc:", e);
  }
};

export const getPersonOpeningBalances = async () => {
  const balances = await getLocalData<any[]>('person_opening_balances', []);
  return balances.sort((a, b) => b.createdAt - a.createdAt);
};

export const addPersonOpeningBalance = async (balanceDoc: any) => {
  const balances = await getLocalData<any[]>('person_opening_balances', []);
  const now = Date.now();
  let activeYear = null;
  if (balanceDoc.date) activeYear = await checkFinancialYear(balanceDoc.date);
  const newBalance = { ...balanceDoc, id: generateId(), createdAt: now, updatedAt: now, fiscalYearId: activeYear ? activeYear.id : undefined };
  balances.push(newBalance);
  await saveLocalData('person_opening_balances', balances);
  
  // Sync with person collection
  const persons = await getLocalData<any[]>('persons', []);
  const idx = persons.findIndex((p: any) => String(p.id) === String(balanceDoc.personId));
  let personName = '';
  if (idx !== -1) {
    personName = persons[idx].name;
    persons[idx].initialBalance = Number(balanceDoc.amount || 0);
    persons[idx].initialBalanceType = balanceDoc.balanceType || "settled";
    persons[idx].updatedAt = now;
    await saveLocalData('persons', persons);
  }

  // Auto-generate basic accounting document
  try {
     const ledgerAccounts = await getLedgerAccounts();
     const defaultLedger = ledgerAccounts.length > 0 ? ledgerAccounts[0].id : '';
     let personLedgerId = defaultLedger;
     if (balanceDoc.personId) {
        const person = persons.find(p => String(p.id) === String(balanceDoc.personId));
        if (person && person.accountingCode) {
           const acc = ledgerAccounts.find(a => a.code === person.accountingCode);
           if (acc) personLedgerId = acc.id;
        }
     }

     const items = [];
     if (balanceDoc.balanceType === 'debtor') {
        items.push({ description: 'طرف حساب', debit: Number(balanceDoc.amount), credit: 0, ledgerAccountId: personLedgerId, detailedAccountId: balanceDoc.personId});
        items.push({ description: 'تراز افتتاحیه', debit: 0, credit: Number(balanceDoc.amount), ledgerAccountId: defaultLedger});
     } else {
        items.push({ description: 'تراز افتتاحیه', debit: Number(balanceDoc.amount), credit: 0, ledgerAccountId: defaultLedger});
        items.push({ description: 'طرف حساب', debit: 0, credit: Number(balanceDoc.amount), ledgerAccountId: personLedgerId, detailedAccountId: balanceDoc.personId});
     }
     
     await addAccountingDocument({
        date: balanceDoc.date || new Date().toISOString().split('T')[0],
        description: balanceDoc.description || `سند افتتاحیه طرف حساب: ${personName}`,
        status: 'approved',
        sourceType: 'opening_balance',
        sourceId: balanceDoc.personId,
        items});
  } catch(e) {}

  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('ADD_PERSON_OPENING_BALANCE', `ثبت سند افتتاحیه جدید برای شخص ${balanceDoc.personId}`, 'PersonOpeningBalance', newBalance.id);
  }

  return newBalance;
};

export const updatePersonOpeningBalance = async (id: string, balanceDoc: any) => {
  const balances = await getLocalData<any[]>('person_opening_balances', []);
  const index = balances.findIndex((b: any) => String(b.id) === String(id));
  if (index !== -1) {
    const oldBalance = balances[index];
    const now = Date.now();
    let activeYear = null;
    if (balanceDoc.date) activeYear = await checkFinancialYear(balanceDoc.date);
    const updatedBalance = { ...oldBalance, ...balanceDoc, updatedAt: now };
    if (activeYear) updatedBalance.fiscalYearId = activeYear.id;
    balances[index] = updatedBalance;
    await saveLocalData('person_opening_balances', balances);

    // Sync with person collection
    const persons = await getLocalData<any[]>('persons', []);
    const idx = persons.findIndex((p: any) => String(p.id) === String(updatedBalance.personId));
    let personName = '';
    if (idx !== -1) {
      personName = persons[idx].name;
      persons[idx].initialBalance = Number(updatedBalance.amount || 0);
      persons[idx].initialBalanceType = updatedBalance.balanceType || "settled";
      persons[idx].updatedAt = now;
      await saveLocalData('persons', persons);
    }

    // Update auto-generated accounting document
    try {
       const accountingDocs = await getAccountingDocuments();
       const existingDoc = accountingDocs.find((d: any) => d.sourceType === 'opening_balance' && String(d.sourceId) === String(updatedBalance.personId));
       
       const ledgerAccounts = await getLedgerAccounts();
       const defaultLedger = ledgerAccounts.length > 0 ? ledgerAccounts[0].id : '';
       let personLedgerId = defaultLedger;
       if (updatedBalance.personId) {
          const person = persons.find(p => String(p.id) === String(updatedBalance.personId));
          if (person && person.accountingCode) {
             const acc = ledgerAccounts.find(a => a.code === person.accountingCode);
             if (acc) personLedgerId = acc.id;
          }
       }

       const items = [];
       if (updatedBalance.balanceType === 'debtor') {
          items.push({ description: 'طرف حساب', debit: Number(updatedBalance.amount), credit: 0, ledgerAccountId: personLedgerId, detailedAccountId: updatedBalance.personId});
          items.push({ description: 'تراز افتتاحیه', debit: 0, credit: Number(updatedBalance.amount), ledgerAccountId: defaultLedger});
       } else {
          items.push({ description: 'تراز افتتاحیه', debit: Number(updatedBalance.amount), credit: 0, ledgerAccountId: defaultLedger});
          items.push({ description: 'طرف حساب', debit: 0, credit: Number(updatedBalance.amount), ledgerAccountId: personLedgerId, detailedAccountId: updatedBalance.personId});
       }

       if (existingDoc) {
          await updateAccountingDocument(existingDoc.id, {
             ...existingDoc,
             date: updatedBalance.date || existingDoc.date,
             description: updatedBalance.description || `سند افتتاحیه طرف حساب: ${personName}`,
             items});
       } else {
          await addAccountingDocument({
             date: updatedBalance.date || new Date().toISOString().split('T')[0],
             description: updatedBalance.description || `سند افتتاحیه طرف حساب: ${personName}`,
             status: 'approved',
             sourceType: 'opening_balance',
             sourceId: updatedBalance.personId,
             items});
       }
    } catch(e) {}

    if (typeof addSystemLog !== 'undefined') {
      await addSystemLog('UPDATE_PERSON_OPENING_BALANCE', `ویرایش سند افتتاحیه شخص ${updatedBalance.personId}`, 'PersonOpeningBalance', updatedBalance.id);
    }

    return updatedBalance;
  }
  return null;
};

export const deletePersonOpeningBalance = async (id: string) => {
  const balances = await getLocalData<any[]>('person_opening_balances', []);
  const doc = balances.find((b: any) => String(b.id) === String(id));
  if (doc) {
    const personId = doc.personId;
    await saveLocalData('person_opening_balances', balances.filter((b: any) => String(b.id) !== String(id)));

    // Sync with person collection - reset to settled
    const persons = await getLocalData<any[]>('persons', []);
    const idx = persons.findIndex((p: any) => String(p.id) === String(personId));
    if (idx !== -1) {
      persons[idx].initialBalance = 0;
      persons[idx].initialBalanceType = "settled";
      persons[idx].updatedAt = Date.now();
      await saveLocalData('persons', persons);
    }

    // Delete auto-generated accounting document
    try {
       const accountingDocs = await getAccountingDocuments();
       const existingDoc = accountingDocs.find((d: any) => d.sourceType === 'opening_balance' && String(d.sourceId) === String(personId));
       if (existingDoc) {
          await deleteAccountingDocument(existingDoc.id);
       }
    } catch(e) {}

    if (typeof addSystemLog !== 'undefined') {
      await addSystemLog('DELETE_PERSON_OPENING_BALANCE', `حذف سند افتتاحیه شخص ${personId}`, 'PersonOpeningBalance', id);
    }
  }
};

export const getInstallments = async () => getLocalData<any[]>('installments', []);

export const saveInstallments = async (installments: any[]) => {
  const activeYear = await getActiveFinancialYear();
  const processed = [];
  for (const inst of installments) {
    let fiscalYearId = inst.fiscalYearId;
    if (!fiscalYearId) {
      if (inst.dueDate) {
        try {
          const yr = await checkFinancialYear(inst.dueDate);
          if (yr) fiscalYearId = yr.id;
        } catch (e) {
          if (activeYear) fiscalYearId = activeYear.id;
        }
      } else if (activeYear) {
        fiscalYearId = activeYear.id;
      }
    }
    processed.push({ ...inst, fiscalYearId });
  }
  await saveLocalData('installments', processed);
};


export const getCheckHistoryLogs = async (checkId?: string | number, checkType?: 'issued' | 'received') => {
  const data = await getLocalData<any[]>('check_history', []);
  let filtered = data;
  if (checkId) filtered = filtered.filter(h => String(h.checkId) === String(checkId));
  if (checkType) filtered = filtered.filter(h => h.checkType === checkType);
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
