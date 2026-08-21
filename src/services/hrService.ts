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


export const getSalaryComponents = () => getLocalData<any[]>('salary_components', []);
export const addSalaryComponent = async (data: any) => appendLocalData('salary_components', data);
export const updateSalaryComponent = async (id: string | number, data: any) => updateLocalData('salary_components', id, data);
export const deleteSalaryComponent = async (id: string | number) => {
  const data = await getLocalData<any[]>('salary_components', []);
  await saveLocalData('salary_components', data.filter(item => String(item.id) !== String(id)));
};

export const getContractTypes = () => getLocalData<any[]>('contract_types', []);
export const addContractType = async (data: any) => appendLocalData('contract_types', data);
export const updateContractType = async (id: string | number, data: any) => updateLocalData('contract_types', id, data);
export const deleteContractType = async (id: string | number) => {
  const data = await getLocalData<any[]>('contract_types', []);
  await saveLocalData('contract_types', data.filter(item => String(item.id) !== String(id)));
};

export const getEmployeeContracts = () => getLocalData<any[]>('employee_contracts', []);
export const addEmployeeContract = async (data: any) => appendLocalData('employee_contracts', data);
export const updateEmployeeContract = async (id: string | number, data: any) => updateLocalData('employee_contracts', id, data);
export const deleteEmployeeContract = async (id: string | number) => {
  const data = await getLocalData<any[]>('employee_contracts', []);
  await saveLocalData('employee_contracts', data.filter(item => String(item.id) !== String(id)));
};

export const getContractComponents = () => getLocalData<any[]>('contract_components', []);
export const addContractComponent = async (data: any) => appendLocalData('contract_components', data);
export const updateContractComponent = async (id: string | number, data: any) => updateLocalData('contract_components', id, data);
export const deleteContractComponent = async (id: string | number) => {
  const data = await getLocalData<any[]>('contract_components', []);
  await saveLocalData('contract_components', data.filter(item => String(item.id) !== String(id)));
};

export const getMonthlyAttendances = () => getLocalData<any[]>('monthly_attendance', []);
export const addMonthlyAttendance = async (data: any) => appendLocalData('monthly_attendance', data);
export const updateMonthlyAttendance = async (id: string | number, data: any) => updateLocalData('monthly_attendance', id, data);

export const getPayslipItems = () => getLocalData<any[]>('payslip_items', []);
export const addPayslipItem = async (data: any) => appendLocalData('payslip_items', data);
export const updatePayslipItem = async (id: string | number, data: any) => updateLocalData('payslip_items', id, data);
export const deletePayslipItemsByPayslipId = async (payslipId: string | number) => {
  const data = await getLocalData<any[]>('payslip_items', []);
  await saveLocalData('payslip_items', data.filter(item => String(item.payslipId) !== String(payslipId)));
};

export const getDailyAttendances = () => getLocalData<any[]>('daily_attendance', []);
export const addDailyAttendance = async (data: any) => appendLocalData('daily_attendance', data);
export const updateDailyAttendance = async (id: string | number, data: any) => updateLocalData('daily_attendance', id, data);
export const deleteDailyAttendance = async (id: string | number) => {
  const data = await getLocalData<any[]>('daily_attendance', []);
  await saveLocalData('daily_attendance', data.filter(item => String(item.id) !== String(id)));
};

export const getWorkplaces = () => getLocalData<any[]>('workplaces', []);
export const addWorkplace = async (data: any) => appendLocalData('workplaces', data);
export const updateWorkplace = async (id: string | number, data: any) => updateLocalData('workplaces', id, data);
export const deleteWorkplace = async (id: string | number) => {
  const all = await getWorkplaces();
  await saveLocalData('workplaces', all.filter((item: any) => item.id !== id));
};

export const getOrderTemplates = () => getLocalData<any[]>('order_templates', []);
export const addOrderTemplate = async (data: any) => appendLocalData('order_templates', data);
export const updateOrderTemplate = async (id: string | number, data: any) => updateLocalData('order_templates', id, data);
export const deleteOrderTemplate = async (id: string | number) => {
  const all = await getOrderTemplates();
  await saveLocalData('order_templates', all.filter((item: any) => item.id !== id));
};

export const getEmployeeProfiles = () => getLocalData<any[]>('employee_profiles', []);
export const addEmployeeProfile = async (data: any) => appendLocalData('employee_profiles', data);
export const updateEmployeeProfile = async (id: string | number, data: any) => updateLocalData('employee_profiles', id, data);
export const deleteEmployeeProfile = async (id: string | number) => {
  const data = await getLocalData<any[]>('employee_profiles', []);
  await saveLocalData('employee_profiles', data.filter(item => String(item.id) !== String(id)));
};
