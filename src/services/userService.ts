
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


export const getUsers = async () => {
  const users = await getLocalData<any[]>('users', []);
  return users.sort((a, b) => b.createdAt - a.createdAt);
};

export const addUser = async (user: any) => {
  const now = Date.now();
  const newUser = { ...user, id: generateId(), createdAt: now, updatedAt: now };
  await appendLocalData('users', newUser);
  return newUser;
};

export const updateUser = async (id: string, user: any) => {
  return await updateLocalData('users', id, { ...user, updatedAt: Date.now() });
};

export const deleteUser = async (id: string) => {
  await batchLocalData([{ type: 'delete', key: 'users', id }]);
};

