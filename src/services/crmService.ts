
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

export const addSmsMessage = async (message: any): Promise<void> => {
  const messages = await getSmsMessages();
  messages.push(message);
  await saveLocalData('sms_messages', messages);
};

export const deleteSmsMessage = async (id: string): Promise<void> => {
  const messages = await getSmsMessages();
  await saveLocalData('sms_messages', messages.filter(m => m.id !== id));
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

