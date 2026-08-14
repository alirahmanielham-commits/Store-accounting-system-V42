import { getStoreSettings } from './settingsService';
import { ensureLedgerAccount, getIssuedChecks, getReceivedChecks } from './accountingService';
import { getTransactions } from './invoiceService';
import { getInvoices } from './invoiceService';

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
import { enqueueSyncTask, getSyncQueue } from './syncQueueService';



export const getPersonGroups = async () => {
  const groups = await getLocalData<any[]>('person_groups', []);
  const queue = getSyncQueue();
  let resultList = [...groups];

  for (const task of queue) {
    if (task.operation === 'ADD_PERSON_GROUP') resultList.push({ ...task.payload, isLocalUnsynced: true });
    else if (task.operation === 'UPDATE_PERSON_GROUP') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) resultList[idx] = { ...resultList[idx], ...task.payload.group, isLocalUnsynced: true };
    }
    else if (task.operation === 'DELETE_PERSON_GROUP') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) resultList.splice(idx, 1);
    }
  }
  return resultList.sort((a, b) => b.createdAt - a.createdAt);
};

export const addPersonGroupToServer = async (group: any) => {
  const now = Date.now();
  const newGroup = { ...group, id: group.id || generateId(), createdAt: now, updatedAt: now };
  await appendLocalData('person_groups', newGroup);
  return newGroup;
};

export const updatePersonGroupToServer = async (id: string, group: any) => {
  return await updateLocalData('person_groups', id, { ...group, updatedAt: Date.now() });
};

export const deletePersonGroupToServer = async (id: string) => {
  await batchLocalData([{ type: 'delete', key: 'person_groups', id }]);
};

export const getPersonRoles = async () => {
  let roles = await getLocalData<any[]>('person_roles', []);
  if (roles.length === 0) {
    // initialize defaults
    const defaults = [
      { id: 'customer', name: 'مشتری', code: '10', color: 'bg-emerald-50 text-emerald-800 border-emerald-100', createdAt: Date.now() },
      { id: 'supplier', name: 'تامین کننده', code: '20', color: 'bg-orange-50 text-orange-850 border-orange-100', createdAt: Date.now() },
      { id: 'employee', name: 'کارمند', code: '30', color: 'bg-purple-50 text-purple-800 border-purple-100', createdAt: Date.now() }
    ];
    await saveLocalData('person_roles', defaults);
    roles = defaults;
  }
  
  const queue = getSyncQueue();
  let resultList = [...roles];

  for (const task of queue) {
    if (task.operation === 'ADD_PERSON_ROLE') resultList.push({ ...task.payload, isLocalUnsynced: true });
    else if (task.operation === 'UPDATE_PERSON_ROLE') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) resultList[idx] = { ...resultList[idx], ...task.payload.role, isLocalUnsynced: true };
    }
    else if (task.operation === 'DELETE_PERSON_ROLE') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) resultList.splice(idx, 1);
    }
  }

  return resultList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

export const addPersonRoleToServer = async (role: any) => {
  const now = Date.now();
  const newRole = { ...role, id: role.id || generateId(), createdAt: now, updatedAt: now };
  await appendLocalData('person_roles', newRole);
  return newRole;
};

export const updatePersonRoleToServer = async (id: string, role: any) => {
  return await updateLocalData('person_roles', id, { ...role, updatedAt: Date.now() });
};

export const deletePersonRoleToServer = async (id: string) => {
  await batchLocalData([{ type: 'delete', key: 'person_roles', id }]);
};

export const getPersonContacts = async () => {
  return await getLocalData<any[]>('person_contacts', []);
};

export const savePersonContacts = async (contacts: any[]) => {
  await saveLocalData('person_contacts', contacts);
};

export const getPersonBankAccounts = async () => {
  return await getLocalData<any[]>('person_bank_accounts', []);
};

export const savePersonBankAccounts = async (accounts: any[]) => {
  await saveLocalData('person_bank_accounts', accounts);
};

export const getPersons = async () => {
  const persons = await getLocalData<any[]>('persons', []);
  const contacts = await getLocalData<any[]>('person_contacts', []);
  const bankAccounts = await getLocalData<any[]>('person_bank_accounts', []);
  
  const formattedPersons = (persons || []).map(p => {
     p.contacts = contacts.filter(c => String(c.personId) === String(p.id));
     p.bankAccounts = bankAccounts.filter(b => String(b.personId) === String(p.id));
     return p;
  });
  
  const baseList = formattedPersons.filter(p => !p.isDeleted);
  
  // Apply sync queue
  const queue = getSyncQueue();
  let resultList = [...baseList];

  for (const task of queue) {
    if (task.operation === 'ADD_PERSON') {
       resultList.push({ ...task.payload, isLocalUnsynced: true });
    } else if (task.operation === 'UPDATE_PERSON') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) {
           resultList[idx] = { ...resultList[idx], ...task.payload.person, isLocalUnsynced: true };
       }
    } else if (task.operation === 'DELETE_PERSON') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) {
           resultList.splice(idx, 1);
       }
    }
  }

  return resultList.sort((a, b) => b.createdAt - a.createdAt);
};

export const addPersonToServer = async (person: any) => {
  const persons = await getLocalData<any[]>('persons', []);
  const roles = await getPersonRoles();
  
  const roleId = person.role;
  const roleObj = roles.find(r => r.id === roleId); // Try to find dynamic role
  
  // if not found, maybe fallback to standard code mapping '10', '20', '30'
  let roleCodePrefix = '10';
  if (roleObj && roleObj.code) {
    roleCodePrefix = roleObj.code;
  } else if (roleId === 'supplier') {
    roleCodePrefix = '20';
  } else if (roleId === 'employee') {
    roleCodePrefix = '30';
  }
  
  let maxSuffix = 0;
  for (const p of persons) {
    if (p.role === roleId && p.personCode && p.personCode.startsWith(roleCodePrefix)) {
      const suffix = Number(p.personCode.substring(roleCodePrefix.length));
      if (!isNaN(suffix) && suffix > maxSuffix) {
        maxSuffix = suffix;
      }
    }
  }

  const nextSuffix = (maxSuffix + 1).toString().padStart(4, '0'); // e.g. 0001
  let finalPersonCode = `${roleCodePrefix}${nextSuffix}`;

  // Check if there is specific configuration for Person Code in settings
  const settings = await getStoreSettings();
  if (settings && (settings as any).prefix_person !== undefined) {
    finalPersonCode = await generateDocNumber('person');
  }

  // --- Handle Ledger Accounts for the Person ---
  let parentCode = '12';
  let parentNature = 'debit';
  let subsidiaryCode = '1201';
  let subAccTitle = 'مشتریان';
  if (roleId === 'supplier') {
    parentCode = '21';
    parentNature = 'credit';
    subsidiaryCode = '2101';
    subAccTitle = 'تامین‌کنندگان';
  } else if (roleId === 'employee') {
    parentCode = '21';
    parentNature = 'credit';
    subsidiaryCode = '2102';
    subAccTitle = 'کارکنان';
  }
  
  let finalAccountingCode = await ensureLedgerAccount(
    person,
    parentCode,
    subsidiaryCode,
    subAccTitle,
    person.alias || person.name,
    parentNature
  );

  const now = Date.now();
  const { contacts, bankAccounts, ...personData } = person;
  const newPerson = { ...personData, personCode: finalPersonCode, accountingCode: finalAccountingCode, id: personData.id || generateId(), createdAt: now, updatedAt: now };
  await appendLocalData('persons', newPerson);
  
  if (contacts && contacts.length > 0) {
      const allContacts = await getLocalData<any[]>('person_contacts', []);
      await saveLocalData('person_contacts', [...allContacts, ...contacts.map((c: any) => ({...c, id: c.id || generateId(), personId: newPerson.id}))]);
  }
  if (bankAccounts && bankAccounts.length > 0) {
      const allBanks = await getLocalData<any[]>('person_bank_accounts', []);
      await saveLocalData('person_bank_accounts', [...allBanks, ...bankAccounts.map((b: any) => ({...b, id: b.id || generateId(), personId: newPerson.id}))]);
  }

  if (newPerson.personCode) {
      await updateDocCounter('person', newPerson.personCode);
  }
  
  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('ADD_' + 'Person'.toUpperCase(), 'ثبت رکورد جدید در persons', 'Person', newPerson.id);
  }

  return newPerson;
};

export const updatePersonToServer = async (id: string, person: any) => {
  if (person.personCode) {
      await updateDocCounter('person', person.personCode);
  }
  const persons = await getLocalData<any[]>('persons', []);
  const index = persons.findIndex((p: any) => String(p.id) === String(id));
  if (index !== -1) {
    const oldPerson = persons[index];
    const { contacts, bankAccounts, ...personData } = person;
    const updatedPerson = { ...oldPerson, ...personData, updatedAt: Date.now() };

    if (contacts) {
       const allContacts = await getLocalData<any[]>('person_contacts', []);
       const filteredContacts = allContacts.filter(c => String(c.personId) !== String(id));
       await saveLocalData('person_contacts', [...filteredContacts, ...contacts.map((c: any) => ({...c, id: c.id || generateId(), personId: id}))]);
    }

    if (bankAccounts) {
       const allBanks = await getLocalData<any[]>('person_bank_accounts', []);
       const filteredBanks = allBanks.filter(b => String(b.personId) !== String(id));
       await saveLocalData('person_bank_accounts', [...filteredBanks, ...bankAccounts.map((b: any) => ({...b, id: b.id || generateId(), personId: id}))]);
    }

    // Ensure Ledger Account exists
    let parentCode = '12';
    let parentNature = 'debit';
    const roleId = updatedPerson.role;
    let subsidiaryCode = '1201';
    let subAccTitle = 'مشتریان';
    if (roleId === 'supplier') {
      parentCode = '21';
      parentNature = 'credit';
      subsidiaryCode = '2101';
      subAccTitle = 'تامین‌کنندگان';
    } else if (roleId === 'employee') {
      parentCode = '21';
      parentNature = 'credit';
      subsidiaryCode = '2102';
      subAccTitle = 'کارکنان';
    }
    
    let finalAccountingCode = await ensureLedgerAccount(
      updatedPerson,
      parentCode,
      subsidiaryCode,
      subAccTitle,
      updatedPerson.alias || updatedPerson.name,
      parentNature
    );
    updatedPerson.accountingCode = finalAccountingCode;

    await updateLocalData('persons', id, updatedPerson);
  
  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('UPDATE_' + 'Person'.toUpperCase(), 'ویرایش رکورد در persons', 'Person', id);
  }

    return updatedPerson;
  }
  return null;
};

export const savePerson = async (person: any) => {
  if (person.id) {
    return updatePerson(String(person.id), person);
  }
  return addPerson(person);
};

export const deletePersonToServer = async (id: string) => {
  // Check relations
  const invoices = await getInvoices();
  if (invoices.some(inv => String(inv.customerId) === String(id))) {
    throw new Error('این شخص دارای فاکتور ثبت شده است و قابل حذف نیست.');
  }
  const transactions = await getTransactions();
  if (transactions.some(t => String(t.personId) === String(id))) {
    throw new Error('این شخص دارای سند دریافت/پرداخت است و قابل حذف نیست.');
  }
  const issuedChecks = await getIssuedChecks();
  if (issuedChecks.some(c => String(c.payeeId) === String(id))) {
    throw new Error('این شخص دارای چک پرداختی است و قابل حذف نیست.');
  }
  const receivedChecks = await getReceivedChecks();
  if (receivedChecks.some(c => String(c.payerId) === String(id))) {
    throw new Error('این شخص دارای چک دریافتی است و قابل حذف نیست.');
  }

  const persons = await getLocalData<any[]>('persons', []);
  // Instead of physical delete, maybe just soft delete if needed, but user says "هیچ چیز به صورت فیزیکی حذف نشود".
  // Actually, we can do soft delete by setting isDeleted = true. Or just keep it as is if there are no relations, we can physically delete it, since it has no relations. The user says "هیچ چیز به صورت فیزیکی حذف نشود". So let's soft delete.
  const index = persons.findIndex((p: any) => String(p.id) === String(id));
  if (index !== -1) {
    persons[index].isDeleted = true;
    await updateLocalData('persons', id, persons[index]);
  }
};

export const getPersonFollowUps = async () => {
  const followUps = await getLocalData<any[]>('person_follow_ups', []);
  return followUps.sort((a, b) => b.createdAt - a.createdAt);
};

export const addPersonFollowUp = async (followUp: any) => {
  const followUps = await getPersonFollowUps();
  const newFollowUp = { ...followUp, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
  followUps.push(newFollowUp);
  await saveLocalData('person_follow_ups', followUps);
  return newFollowUp;
};

export const updatePersonFollowUp = async (id: string | number, followUp: any) => {
  const followUps = await getPersonFollowUps();
  const index = followUps.findIndex((p: any) => String(p.id) === String(id));
  if (index !== -1) {
    followUps[index] = { ...followUps[index], ...followUp, updatedAt: Date.now() };
    await saveLocalData('person_follow_ups', followUps);
  }
};

export const deletePersonFollowUp = async (id: string | number) => {
  const followUps = await getPersonFollowUps();
  await saveLocalData('person_follow_ups', followUps.filter((p: any) => String(p.id) !== String(id)));
};

export const getDebtorsTrackings = async () => {
  return await getLocalData<any[]>('debtors_trackings', []);
};

export const saveDebtorsTrackings = async (data: any[]) => {
  await saveLocalData('debtors_trackings', data);
};


export const getPersonCategories = async () => {
  const categories = await getLocalData<any[]>('person_categories', []);
  const queue = getSyncQueue();
  let resultList = [...categories];

  for (const task of queue) {
    if (task.operation === 'ADD_PERSON_CATEGORY') resultList.push({ ...task.payload, isLocalUnsynced: true });
    else if (task.operation === 'UPDATE_PERSON_CATEGORY') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) resultList[idx] = { ...resultList[idx], ...task.payload.category, isLocalUnsynced: true };
    }
    else if (task.operation === 'DELETE_PERSON_CATEGORY') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) resultList.splice(idx, 1);
    }
  }

  return resultList.sort((a, b) => b.createdAt - a.createdAt);
};

export const addPersonCategoryToServer = async (category: any) => {
  const now = Date.now();
  const newCategory = { ...category, id: category.id || generateId(), createdAt: now, updatedAt: now };
  await appendLocalData('person_categories', newCategory);
  return newCategory;
};

export const updatePersonCategoryToServer = async (id: string, category: any) => {
  const categories = await getPersonCategories();
  const index = categories.findIndex((c: any) => String(c.id) === String(id));
  if (index !== -1) {
    const updatedCategory = { ...categories[index], ...category, updatedAt: Date.now() };
    await updateLocalData('person_categories', id, updatedCategory);
    return updatedCategory;
  }
  return null;
};

export const deletePersonCategoryToServer = async (id: string) => {
  const categories = await getPersonCategories();
  const filtered = categories.filter((c: any) => String(c.id) !== String(id));
  await saveLocalData('person_categories', filtered);
};

export const addPerson = async (person: any) => {
  const now = Date.now();
  const localId = generateId();
  const newPerson = { ...person, id: localId, createdAt: now, updatedAt: now };
  enqueueSyncTask('ADD_PERSON', newPerson);
  return newPerson;
};

export const updatePerson = async (id: string, person: any) => {
  enqueueSyncTask('UPDATE_PERSON', { id, person });
  return { ...person, id };
};

export const deletePerson = async (id: string) => {
  enqueueSyncTask('DELETE_PERSON', { id });
};

export const addPersonGroup = async (group: any) => {
  const localId = generateId();
  const now = Date.now();
  const newGroup = { ...group, id: localId, createdAt: now, updatedAt: now };
  enqueueSyncTask('ADD_PERSON_GROUP', newGroup);
  return newGroup;
};
export const updatePersonGroup = async (id: string, group: any) => {
  enqueueSyncTask('UPDATE_PERSON_GROUP', { id, group });
  return { ...group, id };
};
export const deletePersonGroup = async (id: string) => {
  enqueueSyncTask('DELETE_PERSON_GROUP', { id });
};

export const addPersonRole = async (role: any) => {
  const localId = generateId();
  const now = Date.now();
  const newRole = { ...role, id: localId, createdAt: now, updatedAt: now };
  enqueueSyncTask('ADD_PERSON_ROLE', newRole);
  return newRole;
};
export const updatePersonRole = async (id: string, role: any) => {
  enqueueSyncTask('UPDATE_PERSON_ROLE', { id, role });
  return { ...role, id };
};
export const deletePersonRole = async (id: string) => {
  enqueueSyncTask('DELETE_PERSON_ROLE', { id });
};

export const addPersonCategory = async (category: any) => {
  const localId = generateId();
  const now = Date.now();
  const newCategory = { ...category, id: localId, createdAt: now, updatedAt: now };
  enqueueSyncTask('ADD_PERSON_CATEGORY', newCategory);
  return newCategory;
};
export const updatePersonCategory = async (id: string, category: any) => {
  enqueueSyncTask('UPDATE_PERSON_CATEGORY', { id, category });
  return { ...category, id };
};
export const deletePersonCategory = async (id: string) => {
  enqueueSyncTask('DELETE_PERSON_CATEGORY', { id });
};
