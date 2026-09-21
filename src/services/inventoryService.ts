import { getInvoices, addInvoice, deleteInvoice } from './invoiceService';
import { checkFinancialYear } from './settingsService';
import { getProducts } from './productService';
import { addAccountingDocument, deleteAccountingDocument, getLedgerAccounts, addLedgerAccount } from './accountingService';
import { Stocktaking, StocktakingItem, Product } from '../types';

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
import { compareKardexTransactions } from '../utils/kardexSort';


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
  // Sort ascending for ledger calculation (strict receipt before remittance priority)
  const chronological = [...transactions].sort(compareKardexTransactions);
  
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

export const applyStocktakingSession = async (
  session: Stocktaking,
  currentUser: string = 'مدیر سیستم',
  options?: { createAccountingDoc?: boolean }
) => {
  if (!session) throw new Error('اطلاعات انبارگردانی یافت نشد');
  if (session.status === 'applied') throw new Error('این انبارگردانی قبلا در سیستم اعمال شده است.');
  if (!session.warehouseId) throw new Error('انبار مشخص نشده است');
  if (!session.items || session.items.length === 0) throw new Error('هیچ کالایی برای انبارگردانی ثبت نشده است');

  const countedItems = (session.items || []).filter(it => it.countedStock !== null);
  if (countedItems.length === 0) {
    throw new Error('حداقل باید موجودی یک کالا شمارش شده باشد');
  }

  const products = await getProducts();
  const currentStocks = await getWarehouseStocks();

  // For each counted item, calculate the exact difference required so that
  // currentPhysicalStock + diff = targetCount (where targetCount is the entered countedStock)
  type AdjustmentItem = {
    item: StocktakingItem;
    product: Product | undefined;
    targetCount: number;
    currentStock: number;
    diff: number; // positive = surplus, negative = deficit
    cost: number;
  };

  const adjustments: AdjustmentItem[] = [];

  for (const it of countedItems) {
    const p = products.find(prod => String(prod.id) === String(it.productId));
    const cost = Number(it.unitPrice || p?.purchasePrice || p?.price || 0);
    const targetCount = Number(it.countedStock);

    // Find current physical stock in target warehouse
    const stockEntry = currentStocks.find(
      s => String(s.productId) === String(it.productId) && String(s.warehouseId) === String(session.warehouseId)
    );
    const currentPhysical = stockEntry !== undefined && stockEntry.physicalStock !== undefined
      ? Number(stockEntry.physicalStock)
      : (stockEntry !== undefined ? Number(stockEntry.availableStock || 0) : Number(it.expectedStock || 0));

    // Desired difference to make final stock match targetCount exactly
    const diff = targetCount - currentPhysical;

    adjustments.push({
      item: it,
      product: p,
      targetCount,
      currentStock: currentPhysical,
      diff,
      cost,
    });
  }

  // Separate surpluses (positive diff) and deficits (negative diff)
  const surplusAdjustments = adjustments.filter(a => a.diff > 0);
  const deficitAdjustments = adjustments.filter(a => a.diff < 0);

  let createdReceipt: any = null;
  let createdRemittance: any = null;
  let receiptNumber: string | undefined = undefined;
  let remittanceNumber: string | undefined = undefined;

  const docDate = session.date || new Date().toLocaleDateString('fa-IR');

  // 1. Create Warehouse Receipt for Surplus (سند ورود با عنوان ثبت انبار گردانی)
  if (surplusAdjustments.length > 0) {
    receiptNumber = await generateDocNumber('warehouse_receipt');
    const receiptItems = surplusAdjustments.map(adj => {
      const it = adj.item;
      const p = adj.product;
      const cost = adj.cost;
      const qty = adj.diff; // Positive quantity to enter into warehouse
      return {
        id: generateId(),
        productId: it.productId,
        productName: it.productName,
        quantity: qty,
        unitPrice: cost,
        totalPrice: qty * cost,
        warehouseId: session.warehouseId,
        selectedUnit: it.unit || p?.unit || 'عدد',
        isSecondaryUnit: false,
        unitRatio: 1,
        unitRatioDirection: 'secondary_to_main',
        baseQuantity: qty,
        baseUnitPrice: cost,
      };
    });

    const totalSurplus = receiptItems.reduce((sum, it) => sum + it.totalPrice, 0);

    const receiptPayload = {
      type: 'warehouse_receipt',
      warehouseId: session.warehouseId,
      operationType: 'stocktaking_surplus',
      sourceInvoiceId: session.id,
      invoiceNumber: receiptNumber,
      date: docDate,
      invoiceTitle: 'ثبت انبار گردانی',
      title: 'ثبت انبار گردانی',
      invoiceDescription: `ثبت انبار گردانی (رسید ورود مازاد) - جلسه شماره ${session.id}`,
      description: `ثبت انبار گردانی (رسید ورود مازاد) - جلسه شماره ${session.id}`,
      items: receiptItems,
      totalAmount: totalSurplus,
      status: 'final',
      isDraft: false,
      createdBy: currentUser,
    };

    createdReceipt = await addInvoice(receiptPayload, true, true);
    if (receiptNumber) {
      await updateDocCounter('warehouse_receipt', receiptNumber);
    }
  }

  // 2. Create Warehouse Remittance for Deficit (سند خروج با عنوان ثبت انبار گردانی)
  if (deficitAdjustments.length > 0) {
    remittanceNumber = await generateDocNumber('warehouse_remittance');
    const remittanceItems = deficitAdjustments.map(adj => {
      const it = adj.item;
      const p = adj.product;
      const cost = adj.cost;
      const qty = Math.abs(adj.diff); // Positive quantity to deduct from warehouse
      return {
        id: generateId(),
        productId: it.productId,
        productName: it.productName,
        quantity: qty,
        unitPrice: cost,
        totalPrice: qty * cost,
        warehouseId: session.warehouseId,
        selectedUnit: it.unit || p?.unit || 'عدد',
        isSecondaryUnit: false,
        unitRatio: 1,
        unitRatioDirection: 'secondary_to_main',
        baseQuantity: qty,
        baseUnitPrice: cost,
      };
    });

    const totalDeficit = remittanceItems.reduce((sum, it) => sum + it.totalPrice, 0);

    const remittancePayload = {
      type: 'warehouse_remittance',
      warehouseId: session.warehouseId,
      operationType: 'stocktaking_deficit',
      sourceInvoiceId: session.id,
      invoiceNumber: remittanceNumber,
      date: docDate,
      invoiceTitle: 'ثبت انبار گردانی',
      title: 'ثبت انبار گردانی',
      invoiceDescription: `ثبت انبار گردانی (حواله خروج کسری) - جلسه شماره ${session.id}`,
      description: `ثبت انبار گردانی (حواله خروج کسری) - جلسه شماره ${session.id}`,
      items: remittanceItems,
      totalAmount: totalDeficit,
      status: 'final',
      isDraft: false,
      createdBy: currentUser,
    };

    createdRemittance = await addInvoice(remittancePayload, true, true);
    if (remittanceNumber) {
      await updateDocCounter('warehouse_remittance', remittanceNumber);
    }
  }

  // Calculate totals
  let totalDeficitVal = 0;
  let totalSurplusVal = 0;
  adjustments.forEach(adj => {
    if (adj.diff < 0) totalDeficitVal += Math.abs(adj.diff) * adj.cost;
    if (adj.diff > 0) totalSurplusVal += adj.diff * adj.cost;
  });

  // 3. Optional Accounting Document
  let accountingDocId: string | number | undefined = undefined;
  let accountingDocNumber: string | number | undefined = undefined;

  if (options?.createAccountingDoc !== false && (totalDeficitVal > 0 || totalSurplusVal > 0)) {
    try {
      const ledgerAccounts = await getLedgerAccounts();
      const invAccount = ledgerAccounts.find((a: any) => a.code === '13' || a.title?.includes('موجودی مواد و کالا')) || ledgerAccounts[0];

      let diffAccount = ledgerAccounts.find((a: any) => a.title?.includes('کسری و اضافی انبار'));
      if (!diffAccount) {
        const expenseGroup = ledgerAccounts.find((a: any) => a.code === '53' || a.code === '51' || a.nature === 'debit');
        diffAccount = await addLedgerAccount({
          id: generateId(),
          code: '5399',
          title: 'کسری و اضافی انبار',
          type: 'subsidiary',
          nature: 'debit',
          parentId: expenseGroup?.id || null,
        });
      }

      const journalItems: any[] = [];
      if (totalDeficitVal > 0 && invAccount && diffAccount) {
        journalItems.push({
          id: generateId(),
          ledgerAccountId: diffAccount.id,
          description: `کسری انبارگردانی جلسه ${session.id}`,
          debit: totalDeficitVal,
          credit: 0,
        });
        journalItems.push({
          id: generateId(),
          ledgerAccountId: invAccount.id,
          description: `بستانکار شدن موجودی کالا بابت کسری انبارگردانی جلسه ${session.id}`,
          debit: 0,
          credit: totalDeficitVal,
        });
      }

      if (totalSurplusVal > 0 && invAccount && diffAccount) {
        journalItems.push({
          id: generateId(),
          ledgerAccountId: invAccount.id,
          description: `بدهکار شدن موجودی کالا بابت اضافه انبارگردانی جلسه ${session.id}`,
          debit: totalSurplusVal,
          credit: 0,
        });
        journalItems.push({
          id: generateId(),
          ledgerAccountId: diffAccount.id,
          description: `اضافه انبارگردانی جلسه ${session.id}`,
          debit: 0,
          credit: totalSurplusVal,
        });
      }

      if (journalItems.length > 0) {
        const docNumber = await generateDocNumber('accounting_document');
        const accountingDoc = await addAccountingDocument({
          documentNumber: docNumber,
          date: docDate,
          description: `سند حسابداری تعدیل انبارگردانی جلسه شماره ${session.id}`,
          status: 'approved',
          sourceType: 'stocktaking',
          sourceId: session.id,
          items: journalItems,
          createdBy: currentUser,
        });
        accountingDocId = accountingDoc?.id;
        accountingDocNumber = docNumber;
        if (docNumber) {
          await updateDocCounter('accounting_document', docNumber);
        }
      }
    } catch (accErr) {
      console.error('Error creating accounting document for stocktaking:', accErr);
    }
  }

  // 4. Force stock recalculation immediately
  await recalculateAllWarehouseStocks();

  // 5. Update session in database
  const updatedSession: Stocktaking = {
    ...session,
    status: 'applied',
    appliedDate: new Date().toLocaleDateString('fa-IR'),
    receiptId: createdReceipt?.id,
    receiptNumber: createdReceipt?.invoiceNumber || receiptNumber,
    remittanceId: createdRemittance?.id,
    remittanceNumber: createdRemittance?.invoiceNumber || remittanceNumber,
    accountingDocId,
    accountingDocNumber,
    totalDeficitValue: totalDeficitVal,
    totalSurplusValue: totalSurplusVal,
  };

  await updateStocktaking(session.id, updatedSession);

  return {
    session: updatedSession,
    receipt: createdReceipt,
    remittance: createdRemittance,
    accountingDocId,
    accountingDocNumber,
  };
};

export const rollbackStocktakingSession = async (stocktakingId: string | number) => {
  const stocktakings = await getStocktakings();
  const session = stocktakings.find((s: any) => String(s.id) === String(stocktakingId));
  if (!session) throw new Error('جلسه انبارگردانی یافت نشد');
  if (session.status !== 'applied') throw new Error('این جلسه در وضعیت اعمال شده نیست');

  if (session.receiptId) {
    try {
      await deleteInvoice(String(session.receiptId), true, true);
    } catch (e) {
      console.warn('Error deleting stocktaking receipt:', e);
    }
  }

  if (session.remittanceId) {
    try {
      await deleteInvoice(String(session.remittanceId), true, true);
    } catch (e) {
      console.warn('Error deleting stocktaking remittance:', e);
    }
  }

  if (session.accountingDocId) {
    try {
      await deleteAccountingDocument(session.accountingDocId);
    } catch (e) {
      console.warn('Error deleting stocktaking accounting doc:', e);
    }
  }

  await recalculateAllWarehouseStocks();

  const rolledBackSession: Stocktaking = {
    ...session,
    status: 'in_progress',
    appliedDate: undefined,
    receiptId: undefined,
    receiptNumber: undefined,
    remittanceId: undefined,
    remittanceNumber: undefined,
    accountingDocId: undefined,
    accountingDocNumber: undefined,
  };

  await updateStocktaking(session.id, rolledBackSession);
  return rolledBackSession;
};

