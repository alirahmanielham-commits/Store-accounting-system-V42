
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
import { convertToGregorian, formatDateDisplay } from '../utils/format';
import { logActivity, createDiffSummary } from '../utils/auditLogger';


export const getStoreSettings = async (): Promise<CompanySettings | null> => {
  return await getLocalData<CompanySettings | null>('company_profile', null);
};

export const saveStoreSettings = async (settings: CompanySettings): Promise<void> => {
  const oldSettings = await getStoreSettings();
  await saveLocalData('company_profile', settings);
  try {
    const { diffSummary, changesObj } = createDiffSummary(oldSettings, settings);
    await logActivity({
      action: 'SETTINGS_CHANGE',
      entityType: 'settings',
      entityId: (settings as any).id || 'company_profile',
      details: `تغییر در تنظیمات مالی و پیکربندی سیستم (${(settings as any).storeName || 'تنظیمات'})`,
      diffSummary: diffSummary || 'بروزرسانی مشخصات و تنظیمات مالی فروشگاه',
      oldData: oldSettings,
      newData: settings,
      changes: JSON.stringify(changesObj)
    });
  } catch (_) {}
};

export const getFinancialYears = async () => {
  const years = await getLocalData<any[]>('financial_years', []);
  if (!Array.isArray(years) || years.length === 0) return [];

  // Migration/normalization check: ensure any legacy Jalali date strings are normalized to Gregorian ISO
  let needsSave = false;
  const normalized = years.map(y => {
    if (!y) return y;
    let s = y.startDate;
    let e = y.endDate;
    if (typeof s === 'string' && (s.startsWith('13') || s.startsWith('14')) && !s.includes('T')) {
      s = convertToGregorian(s);
      needsSave = true;
    }
    if (typeof e === 'string' && (e.startsWith('13') || e.startsWith('14')) && !e.includes('T')) {
      e = convertToGregorian(e);
      needsSave = true;
    }
    return { ...y, startDate: s, endDate: e };
  });

  if (needsSave) {
    try {
      await saveLocalData('financial_years', normalized);
    } catch (_) {}
  }

  return normalized;
};

export const saveFinancialYears = async (years: any[]) => {
  const oldYears = await getFinancialYears();
  // Ensure every year's startDate and endDate are stored strictly in Gregorian format
  const normalizedYears = (years || []).map(y => ({
    ...y,
    startDate: y.startDate ? convertToGregorian(y.startDate) : y.startDate,
    endDate: y.endDate ? convertToGregorian(y.endDate) : y.endDate
  }));
  await saveLocalData('financial_years', normalizedYears);
  try {
    await logActivity({
      action: 'SETTINGS_CHANGE',
      entityType: 'financial_years',
      entityId: 'financial_years',
      details: `بروزرسانی و تغییر در سال‌های مالی (${normalizedYears.length} سال مالی)`,
      diffSummary: 'تغییر در پیکربندی سال‌های مالی سیستم',
      oldData: oldYears,
      newData: normalizedYears
    });
  } catch (_) {}
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
  // Strictly enforce Gregorian format in database storage
  const gregorianStartDate = convertToGregorian(year.startDate);
  const gregorianEndDate = convertToGregorian(year.endDate);
  const newYear = {
    ...year,
    id: generateId(),
    startDate: gregorianStartDate,
    endDate: gregorianEndDate,
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
  
  // activeYear.startDate and endDate are stored in Gregorian ISO format
  const startDate = parseToGregorianDate(activeYear.startDate, 'gregorian') || parseToGregorianDate(activeYear.startDate, calendarType);
  const endDate = parseToGregorianDate(activeYear.endDate, 'gregorian') || parseToGregorianDate(activeYear.endDate, calendarType);
  
  if (startDate) {
    startDate.setHours(0,0,0,0);
    if (checkDate < startDate) {
      throw new Error(`تاریخ وارد شده (${formatDateDisplay(dateStr, calendarType)}) قبل از شروع سال مالی فعال (${formatDateDisplay(activeYear.startDate, calendarType)}) است.`);
    }
  }
  
  if (endDate) {
    endDate.setHours(23,59,59,999);
    if (checkDate > endDate) {
      throw new Error(`تاریخ وارد شده (${formatDateDisplay(dateStr, calendarType)}) بعد از پایان سال مالی فعال (${formatDateDisplay(activeYear.endDate, calendarType)}) است.`);
    }
  }
  
  return activeYear;
};

