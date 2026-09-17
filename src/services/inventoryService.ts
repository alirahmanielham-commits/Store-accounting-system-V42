import { getInvoices } from './invoiceService';
import { checkFinancialYear } from './settingsService';

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


export const getWarehouses = async () => {
  const warehouses = await getLocalData<any[]>('warehouses', []);
  return (warehouses || []).filter(w => !w.isDeleted).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

export const addWarehouse = async (warehouse: any) => {
  const now = Date.now();
  const newWarehouse = { ...warehouse, id: generateId(), createdAt: now, updatedAt: now };
  await appendLocalData('warehouses', newWarehouse);
  return newWarehouse;
};

export const updateWarehouse = async (id: string, warehouse: any) => {
  return await updateLocalData('warehouses', id, { ...warehouse, updatedAt: Date.now() });
};

export const deleteWarehouse = async (id: string) => {
  const invoices = await getInvoices();
  if (invoices.some(inv => String(inv.warehouseId) === String(id))) {
     throw new Error('این انبار در اسناد یا فاکتورها استفاده شده است و قابل حذف نیست.');
  }
  await batchLocalData([{ type: 'delete', key: 'warehouses', id }]);
};

export const getWarehouseStocks = async () => {
  const data = await getLocalData<any[]>('warehouse_stocks', []);
  if (!data || data.length === 0) {
    // Perform initial recalculation if empty
    return await recalculateAllWarehouseStocks();
  }
  return data;
};

export const saveWarehouseStocks = async (stocks: any[]) => {
  await saveLocalData('warehouse_stocks', stocks);
};

export const recalculateAllWarehouseStocks = async () => {
  try {
    const res = await fetch('/api/db/recalculate-stocks', { method: 'POST' });
    if (res.ok) {
      const result = await res.json();
      return result.data;
    }
  } catch(e) {
    console.error('Error recalculating stocks', e);
  }
  return [];
};

export const getStocktakings = async () => getLocalData<any[]>('stocktakings', []);

export const saveStocktakings = async (data: any[]) => saveLocalData('stocktakings', data);

export const addStocktaking = async (st: any) => {
  let activeYear = null;
  if (st.date) activeYear = await checkFinancialYear(st.date);
  const stocktakings = await getStocktakings();
  
  let newId;
  let isUnique = false;
  while (!isUnique) {
    newId = Math.floor(10000 + Math.random() * 90000).toString();
    if (!stocktakings.find(s => String(s.id) === newId)) {
      isUnique = true;
    }
  }

  const added = { ...st, id: newId, fiscalYearId: activeYear ? activeYear.id : undefined };
  stocktakings.push(added);
  await saveStocktakings(stocktakings);
  return added;
};

export const updateStocktaking = async (id: string | number, updatedSt: any) => {
  let activeYear = null;
  if (updatedSt.date) activeYear = await checkFinancialYear(updatedSt.date);
  const stocktakings = await getStocktakings();
  const idx = stocktakings.findIndex(s => s.id?.toString() === id?.toString());
  if (idx > -1) {
    if (activeYear) updatedSt.fiscalYearId = activeYear.id;
    stocktakings[idx] = updatedSt;
    await saveStocktakings(stocktakings);
    return updatedSt;
  }
  return null;
};

export const deleteStocktaking = async (id: string | number) => {
  const stocktakings = await getStocktakings();
  const newSts = stocktakings.filter(s => s.id?.toString() !== id?.toString());
  await saveStocktakings(newSts);
};

export const getInventoryTransactions = async (productId?: string | number, warehouseId?: string | number) => {
  try {
    let history: any[] = [];
    if (productId) {
      const res = await fetch(`/api/kardex/${productId}${warehouseId && warehouseId !== 'all' ? `?warehouseId=${warehouseId}` : ''}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) history = json.data;
      }
    }
    if (history.length === 0) {
      history = (await getLocalData<any[]>('kardex', [])) || (await getLocalData<any[]>('InventoryTransactions', [])) || [];
    }

    if (history.length === 0) {
      await recalculateAllWarehouseStocks();
      history = (await getLocalData<any[]>('kardex', [])) || (await getLocalData<any[]>('InventoryTransactions', [])) || [];
    }

    let filtered = history;
    if (productId) {
      filtered = filtered.filter(h => h.productId?.toString() === productId?.toString());
    }
    if (warehouseId && warehouseId !== 'all') {
      filtered = filtered.filter(h => h.warehouseId?.toString() === warehouseId?.toString());
    }
    return filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.error('Error in getInventoryTransactions:', err);
    return [];
  }
};

export const getProductKardex = async (productId: string | number, warehouseId?: string | number) => {
  const transactions = await getInventoryTransactions(productId, warehouseId);
  // Sort ascending for ledger calculation
  const chronological = [...transactions].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  
  let runningBalance = 0;
  const ledger = chronological.map((t, idx) => {
    const isInput = t.type === 'in';
    const qty = Number(t.quantity) || 0;
    const balanceBefore = runningBalance;
    if (isInput) {
      runningBalance += qty;
    } else {
      runningBalance -= qty;
    }
    return {
      ...t,
      rowNumber: idx + 1,
      balanceBefore,
      balanceAfter: runningBalance
    };
  });

  const totalIn = ledger.filter(r => r.type === 'in').reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const totalOut = ledger.filter(r => r.type === 'out').reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  return {
    ledger,
    totalIn,
    totalOut,
    currentStock: runningBalance
  };
};

export const getProductInventoryHistory = getInventoryTransactions;

