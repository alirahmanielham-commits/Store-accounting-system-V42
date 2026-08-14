
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


export const getStoreSettings = async (): Promise<CompanySettings | null> => {
  return await getLocalData<CompanySettings | null>('company_profile', null);
};

export const saveStoreSettings = async (settings: CompanySettings): Promise<void> => {
  await saveLocalData('company_profile', settings);
};

export const getFinancialYears = async () => {
  return getLocalData<any[]>('financial_years', []);
};

export const saveFinancialYears = async (years: any[]) => {
  await saveLocalData('financial_years', years);
};

export const getActiveFinancialYear = async () => {
  const years = await getFinancialYears();
  return years.find(y => y.status === 'open') || null;
};

export const addFinancialYear = async (year: any) => {
  const years = await getFinancialYears();
  const hasOpen = years.some(y => y.status === 'open');
  if (hasOpen) {
    throw new Error('تا زمانیکه یک سال مالی باز و فعال وجود دارد، نمی‌توان سال مالی جدیدی تعریف کرد.');
  }
  const now = Date.now();
  const newYear = {
    ...year,
    id: generateId(),
    status: 'open',
    createdAt: now,
    updatedAt: now
  };
  years.push(newYear);
  await saveFinancialYears(years);
  
  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('ADD_FINANCIAL_YEAR', `تعریف سال مالی جدید: ${newYear.name}`, 'FinancialYear', newYear.id);
  }
  return newYear;
};

export const closeFinancialYear = async (id: string | number) => {
  const years = await getFinancialYears();
  const idx = years.findIndex(y => String(y.id) === String(id));
  if (idx !== -1) {
    years[idx].status = 'closed';
    years[idx].updatedAt = Date.now();
    await saveFinancialYears(years);
    
    if (typeof addSystemLog !== 'undefined') {
      await addSystemLog('CLOSE_FINANCIAL_YEAR', `بستن سال مالی: ${years[idx].name}`, 'FinancialYear', id);
    }
    return years[idx];
  }
  return null;
};

export const checkFinancialYear = async (dateStr: string | number) => {
  if (!dateStr) return null;
  const activeYear = await getActiveFinancialYear();
  if (!activeYear) {
    throw new Error("هیچ سال مالی فعال و بازی در سیستم وجود ندارد. ابتدا یک سال مالی باز ایجاد کنید.");
  }
  
  const settings = await getStoreSettings() as any;
  const calendarType = settings?.calendarType || 'jalali';
  
  const checkDate = parseToGregorianDate(dateStr, calendarType);
  if (!checkDate) return activeYear;
  
  checkDate.setHours(0,0,0,0);
  
  const startDate = parseToGregorianDate(activeYear.startDate, calendarType);
  const endDate = parseToGregorianDate(activeYear.endDate, calendarType);
  
  if (startDate) {
    startDate.setHours(0,0,0,0);
    if (checkDate < startDate) {
      throw new Error(`تاریخ وارد شده (${dateStr}) قبل از شروع سال مالی فعال (${activeYear.startDate}) است.`);
    }
  }
  
  if (endDate) {
    endDate.setHours(23,59,59,999);
    if (checkDate > endDate) {
      throw new Error(`تاریخ وارد شده (${dateStr}) بعد از پایان سال مالی فعال (${activeYear.endDate}) است.`);
    }
  }
  
  return activeYear;
};

