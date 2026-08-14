import { checkFinancialYear, getActiveFinancialYear } from './settingsService';

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


export const getPayslips = () => getLocalData<any[]>('payslips', []);

export const addPayslip = async (payslip: any) => {
  let activeYear = null;
  if (payslip.date) {
    try {
      activeYear = await checkFinancialYear(payslip.date);
    } catch (e) {
      activeYear = await getActiveFinancialYear();
    }
  } else {
    activeYear = await getActiveFinancialYear();
  }
  const newItem = { ...payslip, fiscalYearId: activeYear ? activeYear.id : undefined };
  return appendLocalData('payslips', newItem);
};

export const updatePayslip = async (id: string | number, updated: any) => {
  let activeYear = null;
  if (updated.date) {
    try {
      activeYear = await checkFinancialYear(updated.date);
    } catch (e) {
      activeYear = await getActiveFinancialYear();
    }
  } else {
    activeYear = await getActiveFinancialYear();
  }
  const updatedData = { ...updated, updatedAt: Date.now() };
  if (activeYear) updatedData.fiscalYearId = activeYear.id;
  return updateLocalData('payslips', id, updatedData);
};

export const deletePayslip = async (id: string | number) => {
  const data = await getLocalData<any[]>('payslips', []);
  await saveLocalData('payslips', data.filter(p => String(p.id) !== String(id)));
};

