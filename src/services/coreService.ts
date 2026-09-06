import { getStoreSettings } from './settingsService';
import { getInvoices } from './invoiceService';
import { getIssuedChecks, getReceivedChecks, getAccountingDocuments, getLoans, getInstallments } from './accountingService';
import { getTransactions } from './invoiceService';
import { getActiveFinancialYear } from './settingsService';
import { getPersons } from './personService';
import { getProducts } from './productService';
import { convertToGregorian } from '../utils/format';
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { CompanySettings } from '../types';

const cache: Record<string, { data: any, timestamp: number }> = {};

const CACHE_DURATION = 5000;

const CACHEABLE_KEYS = [
  'company_profile',
  'settings',
  'warehouses',
  'financial_years',
  'product_categories',
  'person_groups',
  'ledger_accounts',
  'doc_counters'
];

export const invalidateCache = (key?: string) => {
  if (key) {
    delete cache[key];
  } else {
    Object.keys(cache).forEach(k => delete cache[k]);
  }
};

const FINANCIAL_KEYS = new Set([
  'receipt_transactions',
  'payment_transactions',
  'transactions',
  'sales_invoices',
  'purchase_invoices',
  'warehouse_receipts',
  'warehouse_remittances',
  'proforma_invoices',
  'sale_returns',
  'purchase_returns',
  'wastes',
  'invoices',
  'accounting_documents',
  'issued_checks',
  'received_checks',
  'checkbooks',
  'check_history',
  'refundRequests',
  'stocktakings',
  'person_opening_balances',
  'loans',
  'installments',
  'payslips',
  'sales_invoice_payments',
  'purchase_invoice_payments',
  'debtors_trackings',
  'InventoryTransactions'
]);

export const mapTransactionTypeToTable = (type: string) => {
  if (type === 'receive') return 'receipt_transactions';
  return 'payment_transactions';
};

export const mapInvoiceTypeToTable = (type: string) => {
  switch (type) {
    case 'sale': return 'sales_invoices';
    case 'purchase': return 'purchase_invoices';
    case 'warehouse_receipt': return 'warehouse_receipts';
    case 'warehouse_remittance': return 'warehouse_remittances';
    case 'proforma': return 'proforma_invoices';
    case 'sale_return': return 'sale_returns';
    case 'purchase_return': return 'purchase_returns';
    case 'waste': return 'wastes';
    default: return 'invoices';
  }
};

export const getLocalData = async <T>(key: string, defaultValue: T, queryParams: Record<string, string | number> = {}, retries = 3): Promise<T> => {
  const qs = new URLSearchParams(Object.entries(queryParams).map(([k, v]) => [k, String(v)])).toString();
  const url = qs ? `/api/data/${key}?${qs}` : `/api/data/${key}`;
  
  if (CACHEABLE_KEYS.includes(key) && !qs) {
    const cached = cache[key];
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      return cached.data;
    }
  }

  try {
    const fetchUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const res = await fetch(fetchUrl, {
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''), 
        'x-store-id': localStorage.getItem('activeStoreId') || 'default',

        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (!res.ok) {
      if (res.status === 401) {
        return defaultValue;
      }
      throw new Error('Network response was not ok');
    }
    const data = await res.json();
    const finalData = (data !== null && data !== undefined) ? data : defaultValue;
    if (Array.isArray(defaultValue) && !Array.isArray(finalData)) { return defaultValue; }
    
    if (CACHEABLE_KEYS.includes(key) && !qs) {
      cache[key] = { data: finalData, timestamp: Date.now() };
    }
    return finalData;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return getLocalData(key, defaultValue, queryParams, retries - 1);
    }
    console.error(`Error reading ${key} from API`, error);
    if (CACHEABLE_KEYS.includes(key) && cache[key]) {
       return cache[key].data;
    }
    return defaultValue;
  }
};

let isAppDataChangedSuspended = false;

export const suspendAppDataChanged = () => {
  isAppDataChangedSuspended = true;
};

export const resumeAppDataChanged = (triggerImmediate = true) => {
  isAppDataChangedSuspended = false;
  if (triggerImmediate && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_data_changed', { detail: { key: 'batch' } }));
  }
};

export const saveLocalData = async <T>(key: string, data: T, retries = 3): Promise<void> => {
  try {
    const processedData = await ensureFiscalYearId(key, data);
    const res = await fetch(`/api/data/${key}`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''), 
        'x-store-id': localStorage.getItem('activeStoreId') || 'default',
 'Content-Type': 'application/json' },
      body: JSON.stringify(processedData)
    });
    if (!res.ok) {
      if (res.status === 401) return;
      throw new Error('Network response was not ok');
    }
    invalidateCache(key);
    if (!isAppDataChangedSuspended && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app_data_changed', { detail: { key } }));
    }
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return saveLocalData(key, data, retries - 1);
    }
    console.error(`Error saving ${key} to API`, error);
  }
};

export const updateLocalData = async <T>(key: string, id: string | number, data: T): Promise<T> => {
  const processedData = await ensureFiscalYearId(key, data);
  const res = await fetch(`/api/data/${key}/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''), 
        'x-store-id': localStorage.getItem('activeStoreId') || 'default',
 'Content-Type': 'application/json' },
    body: JSON.stringify(processedData)
  });
  if (!res.ok) {
    if (res.status === 401) return data as T;
    let errText = 'Network response was not ok';
    try {
       const err = await res.json();
       if (err && err.error) errText = err.error;
    } catch(e) {}
    throw new Error(errText);
  }
  invalidateCache(key);
  if (!isAppDataChangedSuspended && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_data_changed', { detail: { key } }));
  }
  const result = await res.json();
  return result.data;
};

export const appendLocalData = async <T>(key: string, data: T): Promise<T> => {
  const processedData = await ensureFiscalYearId(key, data);
  const res = await fetch(`/api/data/${key}/append`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''), 
        'x-store-id': localStorage.getItem('activeStoreId') || 'default',
 'Content-Type': 'application/json' },
    body: JSON.stringify(processedData)
  });
  if (!res.ok) {
    if (res.status === 401) return data as T;
    throw new Error('Network response was not ok');
  }
  invalidateCache(key);
  if (!isAppDataChangedSuspended && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_data_changed', { detail: { key } }));
  }
  const result = await res.json();
  return result.data;
};

export const batchLocalData = async (operations: any[]): Promise<any> => {
  const processedOps = [];
  for (const op of operations) {
    if (op.type !== 'delete') {
      const processedData = await ensureFiscalYearId(op.key, op.data);
      processedOps.push({ ...op, data: processedData });
    } else {
      processedOps.push(op);
    }
  }
  const res = await fetch(`/api/data/batch`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''), 
        'x-store-id': localStorage.getItem('activeStoreId') || 'default',
 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations: processedOps })
  });
  if (!res.ok) {
    if (res.status === 401) return { success: false };
    throw new Error('Network response was not ok');
  }
  operations.forEach(op => {
    invalidateCache(op.key);
    if (!isAppDataChangedSuspended && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app_data_changed', { detail: { key: op.key } }));
    }
});
  return await res.json();
};

export const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const parseToGregorianDate = (dateStr: string | number | Date, calendarType: string): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  let checkDate = new Date(dateStr);
  if (!isNaN(checkDate.getTime())) {
    if (typeof dateStr === 'number' || calendarType === 'gregorian' || checkDate.getFullYear() > 1900) {
      return checkDate;
    }
  }

  try {
    const cleanStr = String(dateStr).replace(/\//g, '-');
    const jalaliDate = new DateObject({
      date: cleanStr,
      format: "YYYY-MM-DD",
      calendar: persian,
      locale: persian_fa
    });
    const d = jalaliDate.toDate();
    if (d && !isNaN(d.getTime())) {
      return d;
    }
  } catch (e) {
    // fallback
  }

  return isNaN(checkDate.getTime()) ? null : checkDate;
};

export const generateDocNumber = async (docTypeKey: string): Promise<string> => {
  try {
    const settings = await getStoreSettings();
    if (!settings) return Date.now().toString().slice(-6);

    const prefixKey = `prefix_${docTypeKey}`;
    const startKey = `start_${docTypeKey}`;
    const lenKey = `len_${docTypeKey}`;

    const prefix = settings[prefixKey as keyof CompanySettings] !== undefined ? String(settings[prefixKey as keyof CompanySettings]) : '';
    const startObj = settings[startKey as keyof CompanySettings];
    const start = startObj && !isNaN(Number(startObj)) ? Number(startObj) : 1000;
    const lenObj = settings[lenKey as keyof CompanySettings];
    const len = lenObj && !isNaN(Number(lenObj)) ? Number(lenObj) : 6;

    const counters = await getLocalData<Record<string, number>>('doc_counters', {});
    
    let nextValue = start;
    if (counters[docTypeKey] !== undefined) {
        nextValue = counters[docTypeKey] + 1;
        if (nextValue < start) {
            nextValue = start;
        }
    } else {
        let items: any[] = [];
        if (docTypeKey === 'sale' || docTypeKey === 'purchase' || docTypeKey.includes('return') || docTypeKey === 'proforma') {
          items = await getInvoices();
          items = items.filter(i => docTypeKey.includes('return') ? i.type === docTypeKey : (docTypeKey === 'sale' ? i.type === 'sale' : i.type === docTypeKey));
        } else if (docTypeKey === 'warehouse_receipt' || docTypeKey === 'warehouse_remittance') {
          items = await getInvoices();
          items = items.filter(i => i.type === docTypeKey);
        } else if (docTypeKey === 'receive_receipt' || docTypeKey === 'pay_receipt' || docTypeKey === 'salary') {
          items = await getTransactions();
          const typeMap: any = { 'receive_receipt': 'receive', 'pay_receipt': 'pay', 'salary': 'salary' };
          items = items.filter(i => i.type === typeMap[docTypeKey]);
        } else if (docTypeKey === 'check_issued') items = await getIssuedChecks();
        else if (docTypeKey === 'check_received') items = await getReceivedChecks();
        else if (docTypeKey === 'person') items = await getPersons();
        else if (docTypeKey === 'product') items = await getProducts();
        else if (docTypeKey === 'accounting_document') items = await getAccountingDocuments();
        else if (docTypeKey === 'loan') items = await getLoans();
        else if (docTypeKey === 'installment') items = await getInstallments();

        let maxExisting = 0;
        let idField = (docTypeKey === 'person' || docTypeKey === 'product') ? 'code' : 
                      (docTypeKey === 'accounting_document' ? 'documentNumber' : 
                      (docTypeKey.includes('receipt') || docTypeKey === 'salary' ? 'receiptNumber' : 'invoiceNumber'));
        
        if (docTypeKey === 'check_issued' || docTypeKey === 'check_received') idField = 'checkNumber';

        items.forEach(item => {
           let valStr = String(item[idField] || '');
           if (prefix && valStr.startsWith(prefix)) {
              valStr = valStr.substring(prefix.length);
           }
           let val = parseInt(valStr.replace(/\D/g, ''), 10);
           if (!isNaN(val) && val > maxExisting) {
               maxExisting = val;
           }
        });
        
        if (maxExisting >= start) {
            nextValue = maxExisting + 1;
        } else {
            nextValue = start;
        }
    }

    counters[docTypeKey] = nextValue;
    await saveLocalData('doc_counters', counters);

    const numStr = String(nextValue).padStart(len, '0');
    return `${prefix}${numStr}`;
    
  } catch (err) {
    return Date.now().toString().slice(-6);
  }
};

export const updateDocCounter = async (docTypeKey: string, generatedNumber: string | number) => {
    try {
        const settings = await getStoreSettings();
        const prefixKey = `prefix_${docTypeKey}`;
        const prefix = settings && settings[prefixKey as keyof CompanySettings] !== undefined ? String(settings[prefixKey as keyof CompanySettings]) : '';
        
        let valStr = String(generatedNumber || '');
        if (prefix && valStr.startsWith(prefix)) {
            valStr = valStr.substring(prefix.length);
        }
        const val = parseInt(valStr.replace(/\D/g, ''), 10);
        
        if (!isNaN(val)) {
            const counters = await getLocalData<Record<string, number>>('doc_counters', {});
            if (counters[docTypeKey] === undefined || val > counters[docTypeKey]) {
                counters[docTypeKey] = val;
                await saveLocalData('doc_counters', counters);
            }
        }
    } catch (e) {
        console.error('Error updating doc counter', e);
    }
};

export const getDatabaseLogs = async () => {
  const logs = await getLocalData<any[]>('database_logs', []);
  return logs.sort((a, b) => b.timestamp - a.timestamp);
};

export const addDatabaseLog = async (action: string, entityType: string, entityId: string, oldData: any, newData: any) => {
  const logs = await getLocalData<any[]>('database_logs', []);
  
  let userId = 'system';
  if (typeof window !== 'undefined') {
     try {
       const sessionStr = window.localStorage.getItem('auth_user');
       if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session.name) userId = session.name;
          else if (session.username) userId = session.username;
       }
     } catch(e) {}
  }

  const newLog = {
     id: generateId(),
     timestamp: Date.now(),
     action,
     entityType,
     entityId,
     userId,
     oldData: oldData ? JSON.stringify(oldData) : null,
     newData: newData ? JSON.stringify(newData) : null
  };

  logs.unshift(newLog); // Add to beginning
  if (logs.length > 2000) {
     logs.length = 2000;
  }
  
  // Directly save without recursive logging
  try {
    await fetch('/api/data/database_logs', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''), 
        'x-store-id': localStorage.getItem('activeStoreId') || 'default',
 'Content-Type': 'application/json' },
      body: JSON.stringify(logs)
    });
  } catch(e) {}
};

export const getSystemLogs = async () => {
  const logs = await getLocalData<any[]>('system_logs', [], { limit: 50 });
  return logs.sort((a, b) => b.timestamp - a.timestamp);
};

export const addSystemLog = async (action, details, entityType, entityId) => {
  // Backend automatically handles system_logs on POST /api/data/:key
  // We make this a no-op to prevent huge performance overhead and duplicate logs
  return { id: generateId(), action, userId: 'system', details, entityType, entityId, timestamp: Date.now() };
};

export const ensureFiscalYearId = async (key: string, data: any): Promise<any> => {
  if (!data) return data;
  if (!FINANCIAL_KEYS.has(key)) return data;
  try {
    const activeYear = await getActiveFinancialYear();
    if (!activeYear || !activeYear.id) return data;
    
    const yearId = activeYear.id;
    
    if (Array.isArray(data)) {
      return data.map(item => {
        if (item && typeof item === 'object') {
          return { fiscalYearId: item.fiscalYearId || yearId, ...item };
        }
        return item;
      });
    } else if (typeof data === 'object') {
      return { fiscalYearId: data.fiscalYearId || yearId, ...data };
    }
  } catch (e) {
    // ignore
  }
  return data;
};

