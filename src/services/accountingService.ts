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

export const rollbackCashedTransaction = async (checkNumber: string, personId: string, type: 'issued' | 'receive' | 'received') => {
  try {
    const txTables = ['receipt_transactions', 'payment_transactions', 'transactions'];
    for (const tbl of txTables) {
      try {
        const list = await getLocalData<any[]>(tbl, []);
        if (Array.isArray(list)) {
          const txType = type === 'issued' ? 'pay' : 'receive';
          const toDelete = list.find(tx => 
            (tx.type === txType || tbl.includes(txType === 'pay' ? 'payment' : 'receipt')) && 
            String(tx.personId) === String(personId) && 
            (String(tx.receiptNumber) === String(checkNumber) || String(tx.checkNumber) === String(checkNumber)) && 
            tx.description && tx.description.includes(String(checkNumber))
          );
          if (toDelete) {
            const remaining = list.filter(tx => tx.id !== toDelete.id);
            await saveLocalData(tbl, remaining);
          }
        }
      } catch (_) {}
    }
  } catch (err) {
    console.error('Error rolling back check transaction', err);
  }
};


export const addCheckHistoryLog = async (record: { 
  checkId: string | number, 
  checkType: 'issued' | 'received', 
  oldStatus?: string, 
  newStatus?: string, 
  description?: string, 
  userId?: string,
  transactionId?: string | number | null,
  receiptNumber?: string | number | null
}) => {
  const now = Date.now();
  const newItem = { ...record, id: Math.random().toString(36).substring(2, 15), createdAt: now };
  try {
    await appendLocalData('check_history', newItem);
  } catch (err) {
    console.warn('Warning: Failed to append check_history log, falling back:', err);
    try {
      const existing = await getLocalData<any[]>('check_history', []);
      const updated = Array.isArray(existing) ? [...existing, newItem] : [newItem];
      await saveLocalData('check_history', updated);
    } catch (_) {}
  }
  return newItem;
};

export const addCheckAuditLog = async (record: { checkId: string | number, checkType: 'issued' | 'received', action: string, oldValues?: any, newValues?: any, userId?: string }) => {
  const now = Date.now();
  const newItem = { ...record, id: (Math.random() + 1).toString(36).substring(7), createdAt: now };
  try {
    await appendLocalData('check_audit_logs', newItem);
  } catch (err) {
    console.warn('Warning: Failed to append check_audit_logs, falling back:', err);
    try {
      const existing = await getLocalData<any[]>('check_audit_logs', []);
      const updated = Array.isArray(existing) ? [...existing, newItem] : [newItem];
      await saveLocalData('check_audit_logs', updated);
    } catch (_) {}
  }
  return newItem;
};

export const addIssuedCheck = async (record: any) => {
  if (Number(record.amount) <= 0) {
    throw new Error('مبلغ چک نامعتبر است');
  }
  const existingRaw = await getIssuedChecks();
  const existing = Array.isArray(existingRaw) ? existingRaw : (existingRaw?.data || []);
  if (record.checkNumber && record.checkbookId && existing.some((c: any) => c.checkNumber === record.checkNumber && c.checkbookId === record.checkbookId && c.status !== 'cancelled')) {
    throw new Error('این شماره چک قبلاً در این دسته‌چک ثبت شده است');
  }

  let activeYear = null;
  if (record.issueDate) {
    try {
      activeYear = await checkFinancialYear(record.issueDate);
    } catch (fyErr) {
      console.warn('Financial year check warning for issueDate:', fyErr);
    }
  }
  const now = Date.now();
  const newItem = { ...record, id: generateId(), createdAt: now, updatedAt: now, fiscalYearId: activeYear ? activeYear.id : undefined };
  await appendLocalData('issued_checks', newItem);
  await addCheckAuditLog({ checkId: newItem.id, checkType: 'issued', action: 'create', newValues: newItem, userId: record.userId || 'system' });
  
  try {
    await addCheckHistoryLog({
      checkId: newItem.id,
      checkType: 'issued',
      newStatus: newItem.status || 'issued',
      description: record.description ? `ثبت و صدور چک: ${record.description}` : 'ثبت و صدور اولیه برگه چک در سیستم',
      userId: record.userId || 'system',
      transactionId: record.transactionId || newItem.transactionId || null,
      receiptNumber: record.receiptNumber || newItem.receiptNumber || null
    });
  } catch (hErr) {
    console.warn('Failed to add initial check history log:', hErr);
  }

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
  const oldChecksRaw = await getIssuedChecks();
  const oldChecks = Array.isArray(oldChecksRaw) ? oldChecksRaw : (oldChecksRaw?.data || []);
  const previous = oldChecks.find((c: any) => String(c.id) === String(id));

  if (record.checkNumber && record.checkbookId && oldChecks.some((c: any) => String(c.id) !== String(id) && c.checkNumber === record.checkNumber && c.checkbookId === record.checkbookId && c.status !== 'cancelled')) {
    throw new Error('این شماره چک قبلاً در این دسته‌چک ثبت شده است');
  }

  // Only check financial year if issueDate is being changed to a new date
  let activeYear = null;
  if (record.issueDate && (!previous || previous.issueDate !== record.issueDate)) {
    try {
      activeYear = await checkFinancialYear(record.issueDate);
    } catch (fyErr) {
      console.warn('Financial year check warning for updated issueDate:', fyErr);
    }
  }

  const updatedData = { ...record, updatedAt: Date.now() };
  try {
     const saved = await updateLocalData('issued_checks', id, updatedData);
     await addCheckAuditLog({ checkId: saved.id, checkType: 'issued', action: 'update', oldValues: previous, newValues: saved, userId: record.userId || 'system' });
     
     if (previous && previous.status !== saved.status) {
       await addCheckHistoryLog({
         checkId: saved.id,
         checkType: 'issued',
         oldStatus: previous.status,
         newStatus: saved.status,
         description: record.statusDesc || record.description || `تغییر وضعیت چک از ${previous.status} به ${saved.status}`,
         userId: record.userId || 'system',
         transactionId: record.transactionId !== undefined ? record.transactionId : saved.transactionId,
         receiptNumber: record.receiptNumber !== undefined ? record.receiptNumber : saved.receiptNumber
       });
     } else if (!previous && record.status) {
       await addCheckHistoryLog({
         checkId: saved.id,
         checkType: 'issued',
         oldStatus: record.oldStatus || undefined,
         newStatus: saved.status,
         description: record.statusDesc || record.description || `ثبت وضعیت چک: ${saved.status}`,
         userId: record.userId || 'system',
         transactionId: record.transactionId !== undefined ? record.transactionId : saved.transactionId,
         receiptNumber: record.receiptNumber !== undefined ? record.receiptNumber : saved.receiptNumber
       });
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
  const list = Array.isArray(data) ? data : (data?.data || []);
  
  const norm = (dStr: any) => {
    if (!dStr) return 0;
    if (typeof dStr === 'number') return dStr;
    const str = String(dStr).trim();
    if (!str) return 0;
    if (str.includes('T')) {
      const t = new Date(str).getTime();
      if (!isNaN(t)) return t;
    }
    const eng = str.replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
                   .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
    const parts = eng.split(/[/.-]/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return y * 10000 + m * 100 + d;
      }
    }
    const t = new Date(eng).getTime();
    return isNaN(t) ? 0 : t;
  };

  return list.sort((a: any, b: any) => {
    if (sortBy === 'amount') {
      const diff = Number(a.amount || 0) - Number(b.amount || 0);
      return sortDir === 'desc' ? -diff : diff;
    }
    const timeA = norm(a.dueDate);
    const timeB = norm(b.dueDate);
    if (!timeA && timeB) return 1;
    if (timeA && !timeB) return -1;
    if (timeA !== timeB) {
      return sortDir === 'desc' ? timeB - timeA : timeA - timeB;
    }
    return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
  });
};

export const addReceivedCheck = async (record: any) => {
  if (Number(record.amount) <= 0) {
    throw new Error('مبلغ چک نامعتبر است');
  }
  const existingRaw = await getReceivedChecks();
  const existing = Array.isArray(existingRaw) ? existingRaw : (existingRaw?.data || []);
  if (record.checkNumber && record.bankName && existing.some((c: any) => c.checkNumber === record.checkNumber && c.bankName === record.bankName && c.status !== 'returned')) {
    throw new Error('این شماره چک از این بانک قبلاً ثبت شده است');
  }

  const checkDate = record.receiveDate || record.issueDate;
  let activeYear = null;
  if (checkDate) {
    try {
      activeYear = await checkFinancialYear(checkDate);
    } catch (fyErr) {
      console.warn('Financial year check warning for received check:', fyErr);
    }
  }
  const now = Date.now();
  const newItem = { ...record, id: generateId(), createdAt: now, updatedAt: now, fiscalYearId: activeYear ? activeYear.id : undefined };
  await appendLocalData('received_checks', newItem);
  await addCheckAuditLog({ checkId: newItem.id, checkType: 'received', action: 'create', newValues: newItem, userId: record.userId || 'system' });
  
  try {
    await addCheckHistoryLog({
      checkId: newItem.id,
      checkType: 'received',
      newStatus: newItem.status || 'received',
      description: record.description ? `ثبت و دریافت چک: ${record.description}` : 'ثبت اولیه برگه چک دریافتی در سیستم',
      userId: record.userId || 'system',
      transactionId: record.transactionId || newItem.transactionId || null,
      receiptNumber: record.receiptNumber || newItem.receiptNumber || null
    });
  } catch (hErr) {
    console.warn('Failed to add initial received check history log:', hErr);
  }

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
  const oldChecksRaw = await getReceivedChecks();
  const oldChecks = Array.isArray(oldChecksRaw) ? oldChecksRaw : (oldChecksRaw?.data || []);
  const previous = oldChecks.find((c: any) => String(c.id) === String(id));

  if (record.checkNumber && record.bankName && oldChecks.some((c: any) => String(c.id) !== String(id) && c.checkNumber === record.checkNumber && c.bankName === record.bankName && c.status !== 'returned')) {
    throw new Error('این شماره چک از این بانک قبلاً ثبت شده است');
  }

  const checkDate = record.receiveDate || record.issueDate;
  let activeYear = null;
  if (checkDate && (!previous || (previous.receiveDate !== record.receiveDate && previous.issueDate !== record.issueDate))) {
    try {
      activeYear = await checkFinancialYear(checkDate);
    } catch (fyErr) {
      console.warn('Financial year check warning for updated received check:', fyErr);
    }
  }

  const updatedData = { ...record, updatedAt: Date.now() };
  try {
     const saved = await updateLocalData('received_checks', id, updatedData);
     await addCheckAuditLog({ checkId: saved.id, checkType: 'received', action: 'update', oldValues: previous, newValues: saved, userId: record.userId || 'system' });
     
     if (previous && previous.status !== saved.status) {
       await addCheckHistoryLog({
         checkId: saved.id,
         checkType: 'received',
         oldStatus: previous.status,
         newStatus: saved.status,
         description: record.statusDesc || record.description || `تغییر وضعیت چک از ${previous.status} به ${saved.status}`,
         userId: record.userId || 'system',
         transactionId: record.transactionId !== undefined ? record.transactionId : saved.transactionId,
         receiptNumber: record.receiptNumber !== undefined ? record.receiptNumber : saved.receiptNumber
       });
     } else if (!previous && record.status) {
       await addCheckHistoryLog({
         checkId: saved.id,
         checkType: 'received',
         oldStatus: record.oldStatus || undefined,
         newStatus: saved.status,
         description: record.statusDesc || record.description || `ثبت وضعیت چک: ${saved.status}`,
         userId: record.userId || 'system',
         transactionId: record.transactionId !== undefined ? record.transactionId : saved.transactionId,
         receiptNumber: record.receiptNumber !== undefined ? record.receiptNumber : saved.receiptNumber
       });
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

export const validateLedgerAccountCoding = (account: any, existingAccounts: any[]) => {
  if (!account || !account.code || !String(account.code).trim()) {
    throw new Error('کد حساب حسابداری الزامی است.');
  }
  if (!account.title || !String(account.title).trim()) {
    throw new Error('عنوان حساب حسابداری الزامی است.');
  }

  const code = String(account.code).trim();
  const type = account.type || 'subsidiary';

  // 1. Uniqueness check
  const duplicate = existingAccounts.find(a => 
    String(a.code).trim() === code && String(a.id) !== String(account.id)
  );
  if (duplicate) {
    throw new Error(`کد حساب «${code}» قبلاً برای «${duplicate.title}» تعریف شده است و تکراری می‌باشد.`);
  }

  // 2. Format & Length check according to Iranian standard coding
  if (type === 'group') {
    if (!/^\d{1}$/.test(code)) {
      throw new Error(`کد گروه حساب باید ۱ رقمی باشد (مثلاً ۱ برای دارایی‌ها). کد وارد شده: ${code}`);
    }
  } else if (type === 'general') {
    if (!/^\d{2}$/.test(code)) {
      throw new Error(`کد حساب کل باید ۲ رقمی باشد (مثلاً ۱۱ برای موجودی نقد). کد وارد شده: ${code}`);
    }
    // Check parent group
    if (account.parentId) {
      const parent = existingAccounts.find(a => String(a.id) === String(account.parentId));
      if (parent && String(parent.code) !== code.substring(0, 1)) {
        throw new Error(`کد حساب کل (${code}) باید با کد گروه مادر (${parent.code}) آغاز شود.`);
      }
    }
  } else if (type === 'subsidiary') {
    if (!/^\d{4}$/.test(code)) {
      throw new Error(`کد حساب معین باید ۴ رقمی باشد (مثلاً ۱۱۰۱ برای صندوق). کد وارد شده: ${code}`);
    }
    // Check parent general account
    if (account.parentId) {
      const parent = existingAccounts.find(a => String(a.id) === String(account.parentId));
      if (parent && String(parent.code) !== code.substring(0, 2)) {
        throw new Error(`کد حساب معین (${code}) باید با ۲ رقم اول کد حساب کل مادر (${parent.code}) آغاز گردد.`);
      }
    }
  } else if (type === 'detailed') {
    if (!/^\d{6,8}$/.test(code)) {
      throw new Error(`کد حساب تفصیلی باید ۶ الی ۸ رقمی باشد. کد وارد شده: ${code}`);
    }
    if (account.parentId) {
      const parent = existingAccounts.find(a => String(a.id) === String(account.parentId));
      if (parent && !code.startsWith(String(parent.code))) {
        throw new Error(`کد حساب تفصیلی (${code}) باید با کد حساب معین مادر (${parent.code}) شروع شود.`);
      }
    }
  }
};

export const addLedgerAccount = async (la: any) => {
  const accs = await getLedgerAccounts();
  validateLedgerAccountCoding(la, accs);
  const added = { ...la, id: la.id || generateId() };
  accs.push(added);
  await saveLedgerAccounts(accs);
  return added;
};

export const updateLedgerAccount = async (id: string | number, updated: any) => {
  const accs = await getLedgerAccounts();
  const idx = accs.findIndex((x: any) => x.id?.toString() === id?.toString());
  if (idx > -1) {
    validateLedgerAccountCoding({ ...updated, id }, accs);
    accs[idx] = { ...accs[idx], ...updated, id };
    await saveLedgerAccounts(accs);
    return accs[idx];
  }
  return null;
};

export const deleteLedgerAccount = async (id: string | number) => {
  const accs = await getLedgerAccounts();
  const target = accs.find((x: any) => x.id?.toString() === id?.toString());
  if (!target) return;

  // 1. Check for child accounts
  const hasChildren = accs.some((x: any) => String(x.parentId) === String(id));
  if (hasChildren) {
    throw new Error(`امکان حذف حساب «${target.title}» وجود ندارد زیرا دارای حساب‌های زیرمجموعه است. ابتدا زیرمجموعه‌ها را حذف یا منتقل نمایید.`);
  }

  // 2. Check for transactions/documents using this account
  const docs = await getAccountingDocuments();
  const isUsedInDocs = docs.some(d => 
    (d.items || []).some((it: any) => String(it.ledgerAccountId) === String(id) || String(it.detailedAccountId) === String(id))
  );
  if (isUsedInDocs) {
    throw new Error(`امکان حذف حساب «${target.title}» وجود ندارد زیرا در اسناد حسابداری ثبت‌شده دارای گردش مالی و آرتیکل است.`);
  }

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
  if (!doc.items || !Array.isArray(doc.items) || doc.items.length < 2) {
    throw new Error('سند حسابداری باید حداقل شامل دو آرتیکل (یک بدهکار و یک بستانکار) باشد.');
  }
  const totalDebit = doc.items.reduce((sum: number, it: any) => sum + (Number(it.debit) || 0), 0);
  const totalCredit = doc.items.reduce((sum: number, it: any) => sum + (Number(it.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(`سند حسابداری تراز نیست. جمع بدهکار (${totalDebit.toLocaleString()}) با جمع بستانکار (${totalCredit.toLocaleString()}) مغایرت دارد.`);
  }

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
  const existingDocs = await getAccountingDocuments();
  const existingDoc = existingDocs.find((x: any) => x.id?.toString() === id?.toString());
  if (existingDoc && (existingDoc.status === 'permanent' || existingDoc.isFinalized)) {
    throw new Error('امکان ویرایش سند حسابداری قطعی‌شده یا دائم وجود ندارد.');
  }

  if (updated.items && Array.isArray(updated.items)) {
    if (updated.items.length < 2) {
      throw new Error('سند حسابداری باید حداقل شامل دو آرتیکل باشد.');
    }
    const totalDebit = updated.items.reduce((sum: number, it: any) => sum + (Number(it.debit) || 0), 0);
    const totalCredit = updated.items.reduce((sum: number, it: any) => sum + (Number(it.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`سند حسابداری تراز نیست. جمع بدهکار (${totalDebit.toLocaleString()}) با جمع بستانکار (${totalCredit.toLocaleString()}) مغایرت دارد.`);
    }
  }

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
    if (docs[index].status === 'permanent' || docs[index].isFinalized) {
      throw new Error('امکان حذف سند حسابداری قطعی‌شده یا دائم وجود ندارد.');
    }
    if (docs[index].isAutoGenerated) {
       throw new Error('اسناد اتوماتیک قابل حذف دستی نیستند.');
    }
    await updateLocalData('accounting_documents', id, { ...docs[index], isDeleted: true });
  }
};

/**
 * Creates an immutable Reversal Voucher (سند معکوس / اصلاحی) for a permanent or approved document
 * Inverts all debit and credit articles and maintains historical audit trail.
 */
export const createReversalAccountingDocument = async (
  docId: string | number,
  reason?: string,
  date?: string
) => {
  const docs = await getAccountingDocuments();
  const orig = docs.find((d: any) => String(d.id) === String(docId));
  if (!orig) {
    throw new Error('سند حسابداری مورد نظر جهت صدور سند معکوس یافت نشد.');
  }

  if (orig.isReversed) {
    throw new Error(`برای این سند قبلاً سند معکوس به شماره ${orig.reversalDocNumber || orig.reversalDocId || ''} صادر شده است.`);
  }

  if (!orig.items || !Array.isArray(orig.items) || orig.items.length === 0) {
    throw new Error('سند مبدأ فاقد آرتیکل‌های معتبر جهت صدور سند معکوس است.');
  }

  const reversedDate = date || new Date().toISOString();
  const reversalDesc = `سند معکوس بابت سند شماره ${orig.documentNumber || orig.id}${reason ? ` (${reason})` : ''} - ${orig.description || ''}`;

  const reversedItems = orig.items.map((it: any) => ({
    id: generateId(),
    ledgerAccountId: it.ledgerAccountId,
    detailedAccountId: it.detailedAccountId,
    description: `معکوس: ${it.description || ''}`,
    debit: Number(it.credit) || 0,
    credit: Number(it.debit) || 0,
    currency: it.currency || orig.currency || 'تومان'
  }));

  const newDoc = await addAccountingDocument({
    date: reversedDate,
    description: reversalDesc,
    status: 'permanent',
    isFinalized: true,
    sourceType: 'reversal',
    sourceId: String(orig.id),
    reversedDocId: String(orig.id),
    isAutoGenerated: true,
    items: reversedItems,
    currency: orig.currency || 'تومان'
  });

  // Mark original document as reversed
  await updateLocalData('accounting_documents', orig.id, {
    ...orig,
    isReversed: true,
    reversalDocId: newDoc.id,
    reversalDocNumber: newDoc.documentNumber,
    updatedAt: Date.now()
  });

  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog(
      'CREATE_REVERSAL_VOUCHER',
      `صدور سند معکوس شماره ${newDoc.documentNumber} بابت سند شماره ${orig.documentNumber || orig.id}`,
      'AccountingDocument',
      newDoc.id
    );
  }

  return newDoc;
};

/**
 * Reverses all accounting documents linked to a voided invoice
 */
export const reverseInvoiceAccounting = async (invoiceId: string | number, reason?: string) => {
  const docs = await getAccountingDocuments();
  const targetDocs = docs.filter((d: any) => 
    (String(d.sourceId) === String(invoiceId) || d.sourceId === Number(invoiceId)) &&
    !d.isDeleted &&
    !d.isReversed &&
    (d.sourceType?.includes('invoice') || d.type === 'invoice' || d.type === 'cogs')
  );

  const reversedDocs = [];
  for (const d of targetDocs) {
    try {
      const rev = await createReversalAccountingDocument(d.id, reason || `ابطال فاکتور`);
      reversedDocs.push(rev);
    } catch (e) {
      console.warn(`Could not reverse accounting document ${d.id}:`, e);
    }
  }
  return reversedDocs;
};

/**
 * Standard Fiscal Year Closing Wizard (ویزارد استاندارد بستن سال مالی)
 * 1. Close temporary accounts (حساب‌های موقت سود و زیانی) to Income Summary (خلاصه سود و زیان)
 * 2. Transfer Net Profit/Loss to Retained Earnings (سود/زیان انباشته)
 * 3. Issue Closing Document (سند اختتامیه) for permanent balance sheet accounts
 * 4. Mark fiscal year as closed
 * 5. Optionally create next fiscal year and issue Opening Document (سند افتتاحیه)
 */
export const executeFiscalYearClosing = async (
  yearId: string | number,
  options?: {
    createNextYear?: boolean;
    nextYearName?: string;
    nextYearStartDate?: string;
    nextYearEndDate?: string;
  }
) => {
  const years = await getLocalData<any[]>('financial_years', []);
  const yearIdx = years.findIndex(y => String(y.id) === String(yearId));
  if (yearIdx === -1) {
    throw new Error('سال مالی مورد نظر یافت نشد.');
  }

  const currentYear = years[yearIdx];
  if (currentYear.status === 'closed') {
    throw new Error('این سال مالی قبلاً بسته شده است و امکان بستن مجدد آن وجود ندارد.');
  }

  const ledgerAccounts = await getLedgerAccounts();
  const docs = await getAccountingDocuments();
  const sysSettings = await getStoreSettings();
  const currency = sysSettings?.currency || 'تومان';

  const yearStart = new Date(currentYear.startDate).getTime();
  const yearEnd = new Date(currentYear.endDate).getTime();
  const closingDate = currentYear.endDate || new Date().toISOString();

  // Find all approved/permanent documents in this fiscal year
  const yearDocs = docs.filter(d => {
    if (d.isDeleted) return false;
    const docTime = new Date(d.date).getTime();
    const isInRange = docTime >= yearStart && docTime <= yearEnd;
    const isSameYearId = d.fiscalYearId && String(d.fiscalYearId) === String(yearId);
    return (isInRange || isSameYearId) && (d.status === 'approved' || d.status === 'permanent');
  });

  // Calculate net balances for each ledger account during this year
  const balances = new Map<string, { debit: number; credit: number; net: number }>();
  yearDocs.forEach(d => {
    (d.items || []).forEach((it: any) => {
      const accId = String(it.ledgerAccountId || '');
      if (!accId) return;
      const b = balances.get(accId) || { debit: 0, credit: 0, net: 0 };
      b.debit += Number(it.debit) || 0;
      b.credit += Number(it.credit) || 0;
      b.net = b.debit - b.credit; // positive = net debit, negative = net credit
      balances.set(accId, b);
    });
  });

  // Helper to ensure an account exists by code
  const getOrCreateAccount = async (code: string, title: string, parentCode: string, type: string, nature: string) => {
    let acc = ledgerAccounts.find(a => String(a.code) === code);
    if (!acc) {
      const parent = ledgerAccounts.find(a => String(a.code) === parentCode);
      acc = {
        id: generateId(),
        code,
        title,
        type,
        nature,
        parentId: parent ? parent.id : null
      };
      await addLedgerAccount(acc);
      ledgerAccounts.push(acc);
    }
    return acc;
  };

  // 1. Close Temporary Accounts (Income & Expenses: Codes starting with '4' and '5')
  const summaryAccount = await getOrCreateAccount('3301', 'خلاصه سود و زیان', '31', 'subsidiary', 'credit');
  const tempCloseItems: any[] = [];
  let totalRevenueClosed = 0;
  let totalExpenseClosed = 0;

  balances.forEach((bal, accId) => {
    const acc = ledgerAccounts.find(a => String(a.id) === accId);
    if (!acc) return;
    const code = String(acc.code || '');

    // Income accounts (Group 4): Normal nature is Credit
    if (code.startsWith('4')) {
      const netCredit = bal.credit - bal.debit;
      if (Math.abs(netCredit) > 0.001) {
        tempCloseItems.push({
          id: generateId(),
          ledgerAccountId: acc.id,
          description: `بستن حساب موقت درآمد: ${acc.title}`,
          debit: netCredit > 0 ? netCredit : 0,
          credit: netCredit < 0 ? Math.abs(netCredit) : 0,
          currency
        });
        totalRevenueClosed += netCredit;
      }
    }

    // Expense accounts (Group 5): Normal nature is Debit
    if (code.startsWith('5')) {
      const netDebit = bal.debit - bal.credit;
      if (Math.abs(netDebit) > 0.001) {
        tempCloseItems.push({
          id: generateId(),
          ledgerAccountId: acc.id,
          description: `بستن حساب موقت هزینه: ${acc.title}`,
          debit: netDebit < 0 ? Math.abs(netDebit) : 0,
          credit: netDebit > 0 ? netDebit : 0,
          currency
        });
        totalExpenseClosed += netDebit;
      }
    }
  });

  const netIncome = totalRevenueClosed - totalExpenseClosed;

  let tempCloseDoc = null;
  if (tempCloseItems.length > 0) {
    // Balance to Income Summary
    if (netIncome > 0) {
      // Net Profit: Credit Income Summary
      tempCloseItems.push({
        id: generateId(),
        ledgerAccountId: summaryAccount.id,
        description: `انتقال سود ویژه دوره مالی به خلاصه سود و زیان (${currentYear.name})`,
        debit: 0,
        credit: netIncome,
        currency
      });
    } else if (netIncome < 0) {
      // Net Loss: Debit Income Summary
      tempCloseItems.push({
        id: generateId(),
        ledgerAccountId: summaryAccount.id,
        description: `انتقال زیان ویژه دوره مالی به خلاصه سود و زیان (${currentYear.name})`,
        debit: Math.abs(netIncome),
        credit: 0,
        currency
      });
    }

    tempCloseDoc = await addAccountingDocument({
      date: closingDate,
      description: `سند بستن حساب‌های موقت (سود و زیانی) سال مالی ${currentYear.name}`,
      status: 'permanent',
      isFinalized: true,
      type: 'closing_temporary',
      sourceType: 'fiscal_year_close_temp',
      sourceId: String(yearId),
      fiscalYearId: String(yearId),
      isAutoGenerated: true,
      items: tempCloseItems,
      currency
    });
  }

  // 2. Transfer Net Profit/Loss from Income Summary to Retained Earnings (سود/زیان انباشته)
  let transferDoc = null;
  if (Math.abs(netIncome) > 0.001) {
    const retainedEarningsAccount = await getOrCreateAccount('3201', 'سود (زیان) انباشته', '31', 'subsidiary', 'credit');
    const transferItems = [];

    if (netIncome > 0) {
      transferItems.push({
        id: generateId(),
        ledgerAccountId: summaryAccount.id,
        description: `بستن حساب خلاصه سود و زیان بابت انتقال سود خالص دوره (${currentYear.name})`,
        debit: netIncome,
        credit: 0,
        currency
      });
      transferItems.push({
        id: generateId(),
        ledgerAccountId: retainedEarningsAccount.id,
        description: `انتقال سود خالص سال مالی ${currentYear.name} به حساب سود (زیان) انباشته`,
        debit: 0,
        credit: netIncome,
        currency
      });
    } else {
      transferItems.push({
        id: generateId(),
        ledgerAccountId: retainedEarningsAccount.id,
        description: `انتقال زیان سال مالی ${currentYear.name} به حساب سود (زیان) انباشته`,
        debit: Math.abs(netIncome),
        credit: 0,
        currency
      });
      transferItems.push({
        id: generateId(),
        ledgerAccountId: summaryAccount.id,
        description: `بستن حساب خلاصه سود و زیان بابت انتقال زیان دوره (${currentYear.name})`,
        debit: 0,
        credit: Math.abs(netIncome),
        currency
      });
    }

    transferDoc = await addAccountingDocument({
      date: closingDate,
      description: `سند انتقال سود (زیان) ویژه سال مالی ${currentYear.name} به سود (زیان) انباشته`,
      status: 'permanent',
      isFinalized: true,
      type: 'transfer_profit_loss',
      sourceType: 'fiscal_year_transfer_pl',
      sourceId: String(yearId),
      fiscalYearId: String(yearId),
      isAutoGenerated: true,
      items: transferItems,
      currency
    });
  }

  // 3. Issue Closing Voucher (سند اختتامیه) for Permanent Accounts (1: Assets, 2: Liabilities, 3: Equity)
  // Re-read documents including tempCloseDoc and transferDoc to calculate permanent balances
  const allFinalDocs = await getAccountingDocuments();
  const finalYearDocs = allFinalDocs.filter(d => {
    if (d.isDeleted) return false;
    const docTime = new Date(d.date).getTime();
    return (docTime >= yearStart && docTime <= yearEnd) || (d.fiscalYearId && String(d.fiscalYearId) === String(yearId));
  });

  const permanentBalances = new Map<string, { debit: number; credit: number }>();
  finalYearDocs.forEach(d => {
    (d.items || []).forEach((it: any) => {
      const accId = String(it.ledgerAccountId || '');
      const acc = ledgerAccounts.find(a => String(a.id) === accId);
      if (!acc) return;
      const code = String(acc.code || '');
      // Only permanent balance-sheet accounts (Groups 1, 2, 3)
      if (code.startsWith('1') || code.startsWith('2') || code.startsWith('3')) {
        const b = permanentBalances.get(accId) || { debit: 0, credit: 0 };
        b.debit += Number(it.debit) || 0;
        b.credit += Number(it.credit) || 0;
        permanentBalances.set(accId, b);
      }
    });
  });

  const closingItems: any[] = [];
  const openingItemsForNextYear: any[] = [];

  permanentBalances.forEach((bal, accId) => {
    const acc = ledgerAccounts.find(a => String(a.id) === accId);
    if (!acc) return;
    const net = bal.debit - bal.credit; // positive = net debit, negative = net credit
    if (Math.abs(net) < 0.001) return;

    if (net > 0) {
      // In Closing Voucher: credit debit balances to zero them
      closingItems.push({
        id: generateId(),
        ledgerAccountId: acc.id,
        description: `اختتامیه: صفر کردن مانده بدهکار حساب ${acc.title}`,
        debit: 0,
        credit: net,
        currency
      });
      // In Next Year Opening Voucher: debit to reinstate opening asset balance
      openingItemsForNextYear.push({
        id: generateId(),
        ledgerAccountId: acc.id,
        description: `مانده افتتاحیه انتقال یافته از سال مالی قبل (${acc.title})`,
        debit: net,
        credit: 0,
        currency
      });
    } else {
      // In Closing Voucher: debit credit balances to zero them
      const absCredit = Math.abs(net);
      closingItems.push({
        id: generateId(),
        ledgerAccountId: acc.id,
        description: `اختتامیه: صفر کردن مانده بستانکار حساب ${acc.title}`,
        debit: absCredit,
        credit: 0,
        currency
      });
      // In Next Year Opening Voucher: credit to reinstate opening liability/equity balance
      openingItemsForNextYear.push({
        id: generateId(),
        ledgerAccountId: acc.id,
        description: `مانده افتتاحیه انتقال یافته از سال مالی قبل (${acc.title})`,
        debit: 0,
        credit: absCredit,
        currency
      });
    }
  });

  let closingDoc = null;
  if (closingItems.length > 0) {
    closingDoc = await addAccountingDocument({
      date: closingDate,
      description: `سند اختتامیه سال مالی ${currentYear.name}`,
      status: 'permanent',
      isFinalized: true,
      type: 'closing_permanent',
      sourceType: 'fiscal_year_close_permanent',
      sourceId: String(yearId),
      fiscalYearId: String(yearId),
      isAutoGenerated: true,
      items: closingItems,
      currency
    });
  }

  // 4. Mark current year as closed
  currentYear.status = 'closed';
  currentYear.closedAt = Date.now();
  currentYear.updatedAt = Date.now();
  years[yearIdx] = currentYear;
  await saveLocalData('financial_years', years);

  // 5. Create Next Year and Issue Opening Document if requested
  let nextYear = null;
  let openingDoc = null;
  if (options?.createNextYear && openingItemsForNextYear.length > 0) {
    const nextStart = options.nextYearStartDate || new Date(yearEnd + 86400000).toISOString();
    const nextEnd = options.nextYearEndDate || new Date(yearEnd + 365 * 86400000).toISOString();
    const nextName = options.nextYearName || `سال مالی جدید (${new Date(nextStart).getFullYear()})`;

    nextYear = {
      id: generateId(),
      name: nextName,
      startDate: nextStart,
      endDate: nextEnd,
      status: 'active',
      isDefault: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Mark previous years as not default
    years.forEach(y => { if (y.id !== nextYear.id) y.isDefault = false; });
    years.push(nextYear);
    await saveLocalData('financial_years', years);

    openingDoc = await addAccountingDocument({
      date: nextStart,
      description: `سند افتتاحیه سال مالی ${nextName} (انتقال مانده‌ها از سال مالی ${currentYear.name})`,
      status: 'permanent',
      isFinalized: true,
      type: 'opening',
      sourceType: 'fiscal_year_opening',
      sourceId: String(nextYear.id),
      fiscalYearId: String(nextYear.id),
      isAutoGenerated: true,
      items: openingItemsForNextYear,
      currency
    });
  }

  return {
    success: true,
    closedYear: currentYear,
    netIncome,
    tempCloseDoc,
    transferDoc,
    closingDoc,
    nextYear,
    openingDoc
  };
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
    let bankAccountId = check.bankAccountId || check.accountId || check.depositAccountId;
    if (checkType === 'issued' && check.checkbookId) {
      const checkbooks = await getLocalData<any[]>('checkbooks', []);
      const cb = checkbooks.find(c => String(c.id) === String(check.checkbookId));
      if (cb && cb.accountId) {
        bankAccountId = cb.accountId;
      }
    }

    if (bankAccountId) {
      const accs = await getLocalData<any[]>('accounts', []);
      const acc = accs.find(a => String(a.id) === String(bankAccountId));
      if (acc) {
        bankName = acc.bankName || acc.title || acc.name || 'بانک';
        if (acc.accountingCode) {
          const ledgerAcc = ledgerAccounts.find(l => l.code === acc.accountingCode);
          if (ledgerAcc) bankLedgerId = ledgerAcc.id;
          else {
            bankLedgerId = await getAccountForCode(acc.accountingCode, `حساب بانکی ${bankName}`, '11', 'debit');
          }
        }
      }
    }

    if (!bankLedgerId || bankLedgerId === defaultLedger) {
      const bankSubsidiary = await getAccountForCode('1102', 'موجودی نزد بانک‌ها', '11', 'debit');
      if (bankSubsidiary) bankLedgerId = bankSubsidiary;
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


export const getCheckHistoryLogs = async (checkId?: string | number, checkType?: 'issued' | 'received', checkObj?: any) => {
  const data = await getLocalData<any[]>('check_history', []);
  let filtered = Array.isArray(data) ? [...data] : [];
  
  if (checkId) {
    filtered = filtered.filter(h => String(h.checkId) === String(checkId));
  }
  if (checkType) {
    filtered = filtered.filter(h => !h.checkType || h.checkType === checkType);
  }

  // If checkId is specified, let's also pull in audit logs, transactions, and check object history
  if (checkId) {
    try {
      const auditLogs = await getLocalData<any[]>('check_audit_logs', []);
      if (Array.isArray(auditLogs)) {
        const checkAudits = auditLogs.filter(a => String(a.checkId) === String(checkId) && (!checkType || !a.checkType || a.checkType === checkType));
        for (const a of checkAudits) {
          const actionStatus = a.newValues?.status || (a.action === 'create' ? (checkType === 'issued' ? 'issued' : 'received') : undefined);
          const exists = filtered.some(h => 
            (h.newStatus === actionStatus || h.createdAt === a.createdAt)
          );
          if (!exists && actionStatus) {
            filtered.push({
              id: a.id || `audit_${Math.random().toString(36).substring(2, 9)}`,
              checkId: a.checkId,
              checkType: a.checkType || checkType || 'issued',
              oldStatus: a.oldValues?.status || null,
              newStatus: actionStatus,
              description: a.action === 'create' ? 'ثبت و صدور اولیه چک در سیستم' : (a.action === 'status_change' ? `تغییر وضعیت به ${actionStatus}` : 'ویرایش اطلاعات چک'),
              userId: a.userId || 'system',
              transactionId: a.newValues?.transactionId || a.oldValues?.transactionId || null,
              receiptNumber: a.newValues?.receiptNumber || a.oldValues?.receiptNumber || null,
              createdAt: a.createdAt || new Date().toISOString()
            });
          }
        }
      }
    } catch (_) {}

    // Find the check if not provided
    let targetCheck = checkObj;
    if (!targetCheck) {
      try {
        if (checkType === 'issued' || !checkType) {
          const issuedRaw = await getLocalData<any>('issued_checks', []);
          const issued = Array.isArray(issuedRaw) ? issuedRaw : (issuedRaw?.data || []);
          targetCheck = issued.find((c: any) => String(c.id) === String(checkId));
        }
        if (!targetCheck && (checkType === 'received' || !checkType)) {
          const receivedRaw = await getLocalData<any>('received_checks', []);
          const received = Array.isArray(receivedRaw) ? receivedRaw : (receivedRaw?.data || []);
          targetCheck = received.find((c: any) => String(c.id) === String(checkId));
        }
      } catch (_) {}
    }

    // Load related transactions
    let linkedTransactions: any[] = [];
    try {
      const txTables = ['receipt_transactions', 'payment_transactions', 'transactions'];
      const rawTxs: any[] = [];
      for (const tbl of txTables) {
        try {
          const list = await getLocalData<any[]>(tbl, []);
          if (Array.isArray(list)) rawTxs.push(...list);
        } catch (_) {}
      }

      const checkNumStr = targetCheck?.checkNumber ? String(targetCheck.checkNumber).trim() : null;
      const targetTxId = targetCheck?.transactionId ? String(targetCheck.transactionId) : null;
      const targetReceiptNo = targetCheck?.receiptNumber ? String(targetCheck.receiptNumber).trim() : null;
      const targetPersonId = targetCheck?.payeeId || targetCheck?.payerId;

      linkedTransactions = rawTxs.filter((t: any) => {
        if (!t || t.isDeleted) return false;
        if (String(t.checkId) === String(checkId) || String(t.sourceId) === String(checkId)) return true;
        if (targetTxId && String(t.id) === targetTxId) return true;
        if (targetReceiptNo && String(t.receiptNumber).trim() === targetReceiptNo) return true;
        if (checkNumStr && t.method === 'check') {
          if (String(t.checkNumber).trim() === checkNumStr || String(t.receiptNumber).trim() === checkNumStr) {
            if (!targetPersonId || String(t.personId) === String(targetPersonId)) return true;
          }
        }
        return false;
      });
    } catch (_) {}

    if (targetCheck) {
      // Check if targetCheck has history embedded in it (targetCheck.history)
      if (Array.isArray(targetCheck.history)) {
        for (const h of targetCheck.history) {
          const hStatus = h.newStatus || h.status;
          const hCreated = h.createdAt || h.date;
          if (!filtered.some(f => String(f.id) === String(h.id) || (f.newStatus === hStatus && f.createdAt === hCreated))) {
            filtered.push({
              ...h,
              checkId: targetCheck.id,
              checkType: targetCheck.checkType || checkType || 'issued',
              newStatus: hStatus,
              transactionId: h.transactionId || targetCheck.transactionId || null,
              receiptNumber: h.receiptNumber || targetCheck.receiptNumber || null,
              createdAt: hCreated || new Date().toISOString()
            });
          }
        }
      }

      // If no initial registration log exists in filtered, add one
      const hasInitialLog = filtered.some(h => !h.oldStatus && (h.newStatus === 'issued' || h.newStatus === 'received' || h.newStatus === 'blank'));
      if (!hasInitialLog) {
        const initialStatus = targetCheck.status === 'blank' ? 'blank' : (checkType === 'received' ? 'received' : 'issued');
        const initialDate = targetCheck.createdAt ? (typeof targetCheck.createdAt === 'number' ? new Date(targetCheck.createdAt).toISOString() : targetCheck.createdAt) : (targetCheck.issueDate || targetCheck.receiveDate || new Date().toISOString());
        const initTx = linkedTransactions.find(t => !t.isCheckCashing);
        filtered.push({
          id: `init_${targetCheck.id}`,
          checkId: targetCheck.id,
          checkType: checkType || 'issued',
          oldStatus: null,
          newStatus: initialStatus,
          description: targetCheck.description ? `ثبت اولیه چک: ${targetCheck.description}` : `ثبت برگه چک شماره ${targetCheck.checkNumber || ''}`,
          userId: targetCheck.userId || 'system',
          transactionId: initTx?.id || targetCheck.transactionId || null,
          receiptNumber: initTx?.receiptNumber || targetCheck.receiptNumber || null,
          createdAt: initialDate
        });
      }

      // If check status is changed (e.g. 'cashed', 'bounced', etc.) and no transition record matches current status:
      if (targetCheck.status && targetCheck.status !== 'issued' && targetCheck.status !== 'received' && targetCheck.status !== 'blank') {
        const hasCurrentStatusLog = filtered.some(h => h.newStatus === targetCheck.status);
        if (!hasCurrentStatusLog) {
          const updateDate = targetCheck.updatedAt ? (typeof targetCheck.updatedAt === 'number' ? new Date(targetCheck.updatedAt).toISOString() : targetCheck.updatedAt) : new Date().toISOString();
          const cashingTx = linkedTransactions.find(t => t.isCheckCashing || String(t.id) === String(targetCheck.transactionId));
          filtered.push({
            id: `status_${targetCheck.id}_${targetCheck.status}`,
            checkId: targetCheck.id,
            checkType: checkType || 'issued',
            oldStatus: checkType === 'received' ? 'received' : 'issued',
            newStatus: targetCheck.status,
            description: targetCheck.statusDesc || `تغییر وضعیت چک به ${targetCheck.status}`,
            userId: targetCheck.userId || 'system',
            transactionId: targetCheck.status === 'cashed' ? (cashingTx?.id || targetCheck.transactionId || null) : null,
            receiptNumber: targetCheck.status === 'cashed' ? (cashingTx?.receiptNumber || targetCheck.receiptNumber || null) : null,
            createdAt: updateDate
          });
        }
      }
    }

    // Enrich logs with linked transactions if missing
    for (const h of filtered) {
      if (!h.transactionId || !h.receiptNumber) {
        if (h.newStatus === 'cashed') {
          const cashingTx = linkedTransactions.find(t => t.isCheckCashing || String(t.id) === String(targetCheck?.transactionId) || (t.description && (t.description.includes('پاس') || t.description.includes('وصول') || t.description.includes('نقد'))));
          if (cashingTx) {
            h.transactionId = h.transactionId || cashingTx.id;
            h.receiptNumber = h.receiptNumber || cashingTx.receiptNumber;
          } else if (targetCheck?.transactionId) {
            h.transactionId = h.transactionId || targetCheck.transactionId;
            h.receiptNumber = h.receiptNumber || targetCheck.receiptNumber;
          }
        } else if (h.newStatus === 'issued' || h.newStatus === 'received') {
          const initTx = linkedTransactions.find(t => !t.isCheckCashing);
          if (initTx) {
            h.transactionId = h.transactionId || initTx.id;
            h.receiptNumber = h.receiptNumber || initTx.receiptNumber;
          } else if (targetCheck?.receiptNumber) {
            h.receiptNumber = h.receiptNumber || targetCheck.receiptNumber;
          }
        }
      }
    }
  }

  return filtered.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.date || 0).getTime() || 0;
    const timeB = new Date(b.createdAt || b.date || 0).getTime() || 0;
    return timeB - timeA;
  });
};
