
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


export const getCrmColumns = async () => {
  return await getLocalData('crm_columns', [
    { id: 'initial', title: 'تماس اولیه', color: 'bg-slate-100', borderColor: 'border-slate-200', titleColor: 'text-slate-700' },
    { id: 'promised', title: 'وعده پرداخت', color: 'bg-amber-50', borderColor: 'border-amber-200', titleColor: 'text-amber-700' },
    { id: 'legal', title: 'اقدام قانونی', color: 'bg-rose-50', borderColor: 'border-rose-200', titleColor: 'text-rose-700' },
    { id: 'paid', title: 'تسویه شده', color: 'bg-emerald-50', borderColor: 'border-emerald-200', titleColor: 'text-emerald-700' },
    { id: 'failed', title: 'عدم وصول', color: 'bg-gray-100', borderColor: 'border-gray-300', titleColor: 'text-gray-600' }
  ]);
};

export const saveCrmColumns = async (data: any[]) => {
  await saveLocalData('crm_columns', data);
};

export const getSmsMessages = async (): Promise<any[]> => {
  return await getLocalData<any[]>('sms_messages', []);
};

export interface QueueSystemSmsParams {
  recipientNumber: string;
  recipientName?: string;
  recipientId?: string | number | null;
  recipientType?: string;
  messageBody: string;
  source: 'sale_invoice' | 'purchase_invoice' | 'sale_return' | 'purchase_return' | 'receipt' | 'payment' | 'person_profile' | 'person_list' | 'cheque_alert' | 'panel' | string;
  status?: 'queued' | 'pending' | 'sent' | 'delivered';
  providerId?: string | null;
  priority?: number;
  cost?: number;
  currency?: string;
}

/**
 * Generates a clean, citeable numeric ID for SMS records (e.g. 10001, 10002, ...).
 * It scans existing records, localStorage cache, and sequences to monotonically increment.
 */
export const generateCiteableMessageId = (existingList?: { id?: string | number }[]): string => {
  let maxNum = 10000;

  // 1. Scan provided list
  if (Array.isArray(existingList)) {
    for (const item of existingList) {
      if (item && item.id != null) {
        const idStr = String(item.id).trim();
        if (/^\d{1,8}$/.test(idStr)) {
          const val = parseInt(idStr, 10);
          if (val > maxNum && val < 90000000) {
            maxNum = val;
          }
        }
      }
    }
  }

  // 2. Scan localStorage cached list of sms_messages
  try {
    const rawLocal = localStorage.getItem('sms_messages');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.id != null) {
            const idStr = String(item.id).trim();
            if (/^\d{1,8}$/.test(idStr)) {
              const val = parseInt(idStr, 10);
              if (val > maxNum && val < 90000000) {
                maxNum = val;
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore error
  }

  // 3. Scan last used sequence
  try {
    const storedSeq = localStorage.getItem('last_sms_citeable_id');
    if (storedSeq && /^\d+$/.test(storedSeq)) {
      const val = parseInt(storedSeq, 10);
      if (val > maxNum && val < 90000000) {
        maxNum = val;
      }
    }
  } catch (e) {
    // Ignore error
  }

  const nextId = maxNum + 1;
  try {
    localStorage.setItem('last_sms_citeable_id', String(nextId));
  } catch (e) {
    // Ignore error
  }

  return String(nextId);
};

export const normalizeSmsRecord = (data: any) => {
  const cleanNumber = String(data.recipientNumber || data.recipient || data.phone || data.mobile || '').trim().replace(/\s+/g, '');
  const body = String(data.messageBody || data.message || data.text || '');
  const id = (data.id && /^\d{1,8}$/.test(String(data.id).trim())) ? String(data.id).trim() : generateCiteableMessageId();
  const status = data.status || 'queued';
  const nowIso = new Date().toISOString();

  return {
    id,
    recipientNumber: cleanNumber,
    recipientName: data.recipientName || data.name || 'مشتری/مخاطب',
    recipientId: data.recipientId ? String(data.recipientId) : null,
    recipientType: data.recipientType || 'contact',
    messageBody: body,
    messageLength: body.length,
    partsCount: Math.ceil(body.length / 70) || 1,
    status,
    priority: data.priority ?? 0,
    cost: data.cost ?? 0,
    currency: data.currency || 'IRR',
    source: data.source || 'panel',
    providerId: data.providerId || null,
    providerMessageId: data.providerMessageId || null,
    scheduledAt: data.scheduledAt || null,
    sentAt: status === 'sent' || status === 'delivered' ? (data.sentAt || nowIso) : null,
    deliveredAt: status === 'delivered' ? (data.deliveredAt || nowIso) : null,
    failedAt: status === 'failed' ? (data.failedAt || nowIso) : null,
    createdAt: data.createdAt || nowIso,
    updatedAt: nowIso,
    // Backwards compatibility properties
    recipient: cleanNumber,
    message: body,
    timestamp: Date.now(),
  };
};

export const addSmsMessage = async (message: any): Promise<void> => {
  const record = normalizeSmsRecord(message);
  try {
    await fetch('/api/data/batch', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''),
        'x-store-id': localStorage.getItem('activeStoreId') || 'default',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [{ key: 'sms_messages', type: 'append', data: record }]
      })
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sms_messages_updated', { detail: { record } }));
      window.dispatchEvent(new CustomEvent('app_data_changed', { detail: { key: 'sms_messages' } }));
    }
  } catch (err) {
    console.error('Error adding sms_message via batch API, falling back to local list:', err);
    const messages = await getSmsMessages();
    messages.push(record);
    await saveLocalData('sms_messages', messages);
  }
};

export const queueSystemSms = async (params: QueueSystemSmsParams): Promise<any> => {
  const record = normalizeSmsRecord(params);
  await addSmsMessage(record);
  return record;
};

export const deleteSmsMessage = async (id: string): Promise<void> => {
  try {
    await fetch('/api/data/batch', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''),
        'x-store-id': localStorage.getItem('activeStoreId') || 'default',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [{ key: 'sms_messages', type: 'delete', id }]
      })
    });
    const local = await getLocalData('sms_messages', []);
    if (Array.isArray(local)) {
      await saveLocalData('sms_messages', local.filter((m: any) => String(m.id) !== String(id)));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sms_messages_updated', { detail: { id, deleted: true } }));
      window.dispatchEvent(new CustomEvent('app_data_changed', { detail: { key: 'sms_messages' } }));
    }
  } catch (err) {
    console.error('Error deleting sms_message via batch, falling back:', err);
    const messages = await getSmsMessages();
    await saveLocalData('sms_messages', messages.filter(m => String(m.id) !== String(id)));
  }
};

export const deleteMultipleSmsMessages = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids.map(String));
  try {
    await fetch('/api/data/batch', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''),
        'x-store-id': localStorage.getItem('activeStoreId') || 'default',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: ids.map(id => ({ key: 'sms_messages', type: 'delete', id }))
      })
    });
    const local = await getLocalData('sms_messages', []);
    if (Array.isArray(local)) {
      await saveLocalData('sms_messages', local.filter((m: any) => !idSet.has(String(m.id))));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sms_messages_updated', { detail: { ids, deleted: true } }));
      window.dispatchEvent(new CustomEvent('app_data_changed', { detail: { key: 'sms_messages' } }));
    }
  } catch (err) {
    console.error('Error deleting multiple sms_messages via batch, falling back:', err);
    const messages = await getSmsMessages();
    await saveLocalData('sms_messages', messages.filter(m => !idSet.has(String(m.id))));
  }
};

export const getPersonalNotes = async (): Promise<any[]> => {
  return getLocalData('personal_notes', []);
};

export const savePersonalNotes = async (notes: any[]): Promise<void> => {
  return saveLocalData('personal_notes', notes);
};

export const appendPersonalNote = async (note: any): Promise<any> => {
  return fetch('/api/data/personal_notes/append', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''), 
        'x-store-id': localStorage.getItem('activeStoreId') || 'default',
 'Content-Type': 'application/json' },
    body: JSON.stringify(note)
  }).then(res => res.json());
};

export const updatePersonalNote = async (id: string, updates: any): Promise<any> => {
  return fetch(`/api/data/personal_notes/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || ''), 
        'x-store-id': localStorage.getItem('activeStoreId') || 'default',
 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  }).then(res => res.json());
};

export const deletePersonalNote = async (id: string): Promise<any> => {
  const notes = await getPersonalNotes();
  const filtered = notes.filter((n: any) => String(n.id) !== String(id));
  return savePersonalNotes(filtered);
};

