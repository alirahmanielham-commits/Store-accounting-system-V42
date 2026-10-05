/**
 * Cost of Goods Sold (COGS) & Inventory Valuation Engine
 * Supports Moving Weighted Average Cost (WAC - میانگین موزون متحرک) and FIFO (اولین صادره از اولین وارده)
 * In accordance with Iranian Accounting Standard No. 8 & International Accounting Standards (IAS 2)
 */

import { convertQuantityToBaseUnit, getUnitRatioDirection } from '../utils/unitConversion';
import { convertToGregorian } from '../utils/format';

export type CostMethod = 'wac' | 'fifo';

export interface ProductCostSummary {
  productId: string;
  productName: string;
  currentStock: number;
  weightedAverageCost: number; // نرخ میانگین موزون به ازای واحد پایه (یا نرخ پایانی FIFO)
  latestPurchasePrice: number;
  totalInventoryValue: number;
  method: CostMethod;
}

export interface FIFOBatch {
  id: string;
  productId: string;
  date: number;
  originalQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  sourceType: string;
  sourceId?: string;
}

export interface LineCOGS {
  productId: string;
  productName: string;
  quantity: number;
  baseQuantity: number;
  unitCost: number; // بهای تمام‌شده یک واحد
  totalCost: number; // کل بهای تمام‌شده ردیف (COGS)
  unitPrice: number;
  netRevenue: number;
  grossProfit: number;
  profitMarginPercent: number;
  method?: CostMethod;
}

export interface InvoiceCOGSSummary {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  costMethod: CostMethod;
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  profitMarginPercent: number;
  items: LineCOGS[];
}

/**
 * Calculates base unit quantity for an invoice item
 */
export function getItemBaseQuantity(item: any, product?: any): number {
  const qty = Number(item.quantity) || 0;
  if (item.baseQuantity !== undefined && item.baseQuantity !== null) {
    return Number(item.baseQuantity) || qty;
  }
  if (product && product.unitRatio && (item.isSecondaryUnit || item.selectedUnit === product.secondaryUnit)) {
    const dir = product.unitRatioDirection || getUnitRatioDirection(product);
    return convertQuantityToBaseUnit(qty, true, Number(product.unitRatio), dir);
  }
  return qty;
}

/**
 * Computes Moving Weighted Average Cost (WAC) for all products across inventory history
 */
export function calculateAllProductsWAC(
  products: any[] = [],
  invoices: any[] = [],
  warehouseReceipts: any[] = []
): Map<string, ProductCostSummary> {
  const summaries = new Map<string, ProductCostSummary>();

  // 1. Initialize with products opening stocks and initial purchase price
  products.forEach(p => {
    const pid = String(p.id);
    const initialPrice = Number(p.purchasePrice || p.buyPrice || 0);
    const initialStock = Number(p.stock || 0);
    summaries.set(pid, {
      productId: pid,
      productName: p.name || `کالای ${pid}`,
      currentStock: Math.max(0, initialStock),
      weightedAverageCost: initialPrice,
      latestPurchasePrice: initialPrice,
      totalInventoryValue: Math.max(0, initialStock) * initialPrice,
      method: 'wac'
    });
  });

  // 2. Collect all inbound transactions (purchases, receipts, initial inventory)
  const inboundEvents: Array<{
    date: number;
    productId: string;
    quantity: number;
    unitPrice: number;
    type: string;
  }> = [];

  // Invoices (purchases)
  invoices
    .filter(inv => (inv.type === 'purchase' || inv.type === 'warehouse_receipt') && !inv.isDeleted && inv.status !== 'voided')
    .forEach(inv => {
      const invDate = new Date(convertToGregorian(inv.date || inv.createdAt || 0)).getTime();
      (inv.items || []).forEach((it: any) => {
        const pid = String(it.productId || '');
        if (!pid) return;
        const prod = products.find(p => String(p.id) === pid);
        const baseQty = getItemBaseQuantity(it, prod);
        const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
        if (baseQty > 0 && unitPrice >= 0) {
          inboundEvents.push({
            date: invDate,
            productId: pid,
            quantity: baseQty,
            unitPrice,
            type: inv.type
          });
        }
      });
    });

  // Separate warehouse receipts
  warehouseReceipts
    .filter(rec => !rec.isDeleted && rec.status !== 'voided')
    .forEach(rec => {
      const recDate = new Date(convertToGregorian(rec.date || rec.createdAt || 0)).getTime();
      (rec.items || []).forEach((it: any) => {
        const pid = String(it.productId || '');
        if (!pid) return;
        const prod = products.find(p => String(p.id) === pid);
        const baseQty = getItemBaseQuantity(it, prod);
        const unitPrice = Number(it.unitPrice ?? it.purchasePrice ?? it.price ?? 0);
        if (baseQty > 0 && unitPrice >= 0) {
          inboundEvents.push({
            date: recDate,
            productId: pid,
            quantity: baseQty,
            unitPrice,
            type: 'warehouse_receipt'
          });
        }
      });
    });

  // Sort chronologically
  inboundEvents.sort((a, b) => a.date - b.date);

  // Apply Moving Weighted Average Cost formula sequentially:
  // New WAC = (Existing Total Cost + Inbound Total Cost) / (Existing Qty + Inbound Qty)
  inboundEvents.forEach(evt => {
    const summary = summaries.get(evt.productId);
    if (!summary) return;

    const existingQty = summary.currentStock;
    const existingVal = summary.totalInventoryValue;
    const newQty = existingQty + evt.quantity;
    const inboundCost = evt.quantity * evt.unitPrice;

    if (newQty > 0) {
      summary.weightedAverageCost = (existingVal + inboundCost) / newQty;
      summary.currentStock = newQty;
      summary.totalInventoryValue = existingVal + inboundCost;
    } else {
      summary.weightedAverageCost = evt.unitPrice;
      summary.currentStock = evt.quantity;
      summary.totalInventoryValue = inboundCost;
    }
    summary.latestPurchasePrice = evt.unitPrice;
  });

  return summaries;
}

/**
 * Computes FIFO (First-In, First-Out) inventory valuation and active batches
 */
export function calculateAllProductsFIFO(
  products: any[] = [],
  invoices: any[] = [],
  warehouseReceipts: any[] = []
): { summaries: Map<string, ProductCostSummary>; batches: Map<string, FIFOBatch[]> } {
  const summaries = new Map<string, ProductCostSummary>();
  const productBatches = new Map<string, FIFOBatch[]>();

  // 1. Initialize FIFO batches with opening stock
  products.forEach(p => {
    const pid = String(p.id);
    const initialPrice = Number(p.purchasePrice || p.buyPrice || 0);
    const initialStock = Math.max(0, Number(p.stock || 0));
    const batches: FIFOBatch[] = [];

    if (initialStock > 0) {
      batches.push({
        id: `init_${pid}`,
        productId: pid,
        date: 0,
        originalQuantity: initialStock,
        remainingQuantity: initialStock,
        unitCost: initialPrice,
        sourceType: 'initial_stock'
      });
    }

    productBatches.set(pid, batches);
    summaries.set(pid, {
      productId: pid,
      productName: p.name || `کالای ${pid}`,
      currentStock: initialStock,
      weightedAverageCost: initialPrice,
      latestPurchasePrice: initialPrice,
      totalInventoryValue: initialStock * initialPrice,
      method: 'fifo'
    });
  });

  // 2. Collect all events (both inbound and outbound) sorted chronologically
  type InventoryEvent = {
    date: number;
    productId: string;
    quantity: number;
    unitPrice: number;
    isInbound: boolean;
    sourceType: string;
    sourceId: string;
  };

  const allEvents: InventoryEvent[] = [];

  invoices
    .filter(inv => !inv.isDeleted && inv.status !== 'voided')
    .forEach(inv => {
      const invDate = new Date(convertToGregorian(inv.date || inv.createdAt || 0)).getTime();
      const isInbound = inv.type === 'purchase' || inv.type === 'warehouse_receipt';
      const isOutbound = inv.type === 'sale' || inv.type === 'warehouse_remittance';

      if (!isInbound && !isOutbound) return;

      (inv.items || []).forEach((it: any) => {
        const pid = String(it.productId || '');
        if (!pid) return;
        const prod = products.find(p => String(p.id) === pid);
        const baseQty = getItemBaseQuantity(it, prod);
        const unitPrice = Number(it.unitPrice ?? it.purchasePrice ?? it.price ?? 0);
        if (baseQty > 0) {
          allEvents.push({
            date: invDate,
            productId: pid,
            quantity: baseQty,
            unitPrice,
            isInbound,
            sourceType: inv.type,
            sourceId: String(inv.id)
          });
        }
      });
    });

  // Include standalone warehouse receipts
  warehouseReceipts
    .filter(rec => !rec.isDeleted && rec.status !== 'voided')
    .forEach(rec => {
      const recDate = new Date(convertToGregorian(rec.date || rec.createdAt || 0)).getTime();
      (rec.items || []).forEach((it: any) => {
        const pid = String(it.productId || '');
        if (!pid) return;
        const prod = products.find(p => String(p.id) === pid);
        const baseQty = getItemBaseQuantity(it, prod);
        const unitPrice = Number(it.unitPrice ?? it.purchasePrice ?? it.price ?? 0);
        if (baseQty > 0) {
          allEvents.push({
            date: recDate,
            productId: pid,
            quantity: baseQty,
            unitPrice,
            isInbound: true,
            sourceType: 'warehouse_receipt',
            sourceId: String(rec.id)
          });
        }
      });
    });

  // Sort events chronologically (inbounds before outbounds on same timestamp)
  allEvents.sort((a, b) => {
    if (a.date !== b.date) return a.date - b.date;
    return a.isInbound === b.isInbound ? 0 : a.isInbound ? -1 : 1;
  });

  // Process FIFO queues
  allEvents.forEach(evt => {
    let batches = productBatches.get(evt.productId);
    if (!batches) {
      batches = [];
      productBatches.set(evt.productId, batches);
    }
    const summary = summaries.get(evt.productId);

    if (evt.isInbound) {
      // Enqueue new lot
      batches.push({
        id: `${evt.sourceType}_${evt.sourceId}_${evt.date}`,
        productId: evt.productId,
        date: evt.date,
        originalQuantity: evt.quantity,
        remainingQuantity: evt.quantity,
        unitCost: evt.unitPrice,
        sourceType: evt.sourceType,
        sourceId: evt.sourceId
      });
      if (summary) {
        summary.latestPurchasePrice = evt.unitPrice;
      }
    } else {
      // Consume from oldest lots (FIFO)
      let needed = evt.quantity;
      for (const batch of batches) {
        if (needed <= 0) break;
        if (batch.remainingQuantity <= 0) continue;

        const consumed = Math.min(batch.remainingQuantity, needed);
        batch.remainingQuantity -= consumed;
        needed -= consumed;
      }
    }
  });

  // Recalculate remaining inventory valuation and effective unit price from remaining FIFO lots
  products.forEach(p => {
    const pid = String(p.id);
    const batches = productBatches.get(pid) || [];
    const activeBatches = batches.filter(b => b.remainingQuantity > 0);
    const totalRemainingQty = activeBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
    const totalRemainingVal = activeBatches.reduce((sum, b) => sum + (b.remainingQuantity * b.unitCost), 0);
    const effectiveUnitCost = totalRemainingQty > 0 ? (totalRemainingVal / totalRemainingQty) : Number(p.purchasePrice || p.buyPrice || 0);

    const summary = summaries.get(pid);
    if (summary) {
      summary.currentStock = totalRemainingQty;
      summary.weightedAverageCost = effectiveUnitCost;
      summary.totalInventoryValue = totalRemainingVal;
    }
  });

  return { summaries, batches: productBatches };
}

/**
 * Universal inventory valuation calculator supporting both WAC and FIFO
 */
export function calculateProductValuation(
  method: CostMethod = 'wac',
  products: any[] = [],
  invoices: any[] = [],
  warehouseReceipts: any[] = []
): Map<string, ProductCostSummary> {
  if (method === 'fifo') {
    return calculateAllProductsFIFO(products, invoices, warehouseReceipts).summaries;
  }
  return calculateAllProductsWAC(products, invoices, warehouseReceipts);
}

/**
 * Calculates COGS for a specific sales invoice using either WAC or FIFO
 */
export function calculateInvoiceCOGS(
  invoice: any,
  products: any[] = [],
  costMap?: Map<string, ProductCostSummary>,
  method: CostMethod = 'wac'
): InvoiceCOGSSummary {
  const lineDetails: LineCOGS[] = [];
  let totalRevenue = 0;
  let totalCOGS = 0;

  const items = invoice.items || [];
  items.forEach((item: any) => {
    const pid = String(item.productId || '');
    const prod = products.find(p => String(p.id) === pid);
    const baseQty = getItemBaseQuantity(item, prod);
    const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
    const discPercent = Number(item.discountPercent || 0);
    const rawLineTotal = (Number(item.quantity) || 1) * unitPrice;
    const lineDiscount = rawLineTotal * (discPercent / 100);
    const netRevenue = item.totalPrice !== undefined ? Number(item.totalPrice) : (rawLineTotal - lineDiscount);

    // Get unit cost from costMap (WAC or FIFO), or item.costPrice, or prod.purchasePrice
    let unitCost = 0;
    if (costMap && costMap.has(pid)) {
      unitCost = costMap.get(pid)!.weightedAverageCost;
    } else if (item.costPrice !== undefined && item.costPrice !== null) {
      unitCost = Number(item.costPrice);
    } else if (prod) {
      unitCost = Number(prod.purchasePrice || prod.buyPrice || 0);
    }

    const lineCost = baseQty * unitCost;
    const grossProfit = netRevenue - lineCost;
    const profitMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    totalRevenue += netRevenue;
    totalCOGS += lineCost;

    lineDetails.push({
      productId: pid,
      productName: item.productName || prod?.name || `کالای ${pid}`,
      quantity: Number(item.quantity) || 1,
      baseQuantity: baseQty,
      unitCost,
      totalCost: lineCost,
      unitPrice,
      netRevenue,
      grossProfit,
      profitMarginPercent,
      method
    });
  });

  const totalGrossProfit = totalRevenue - totalCOGS;
  const overallMarginPercent = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  return {
    invoiceId: String(invoice.id || ''),
    invoiceNumber: String(invoice.invoiceNumber || ''),
    date: String(invoice.date || invoice.createdAt || ''),
    costMethod: method,
    totalRevenue,
    totalCOGS,
    grossProfit: totalGrossProfit,
    profitMarginPercent: overallMarginPercent,
    items: lineDetails
  };
}

/**
 * Generates standard Double-Entry Accounting Voucher for Cost of Goods Sold (COGS)
 * Debit: بهای تمام شده کالای فروش رفته (کد کل ۵۱)
 * Credit: موجودی مواد و کالا (کد کل ۱۳)
 */
export function buildCOGSAccountingVoucher(params: {
  documentNumber: string;
  date: string;
  fiscalYearId?: string;
  totalCOGS: number;
  cogsAccountId: string; // شناسه حساب بهای تمام شده (معین یا کل ۵۱)
  inventoryAccountId: string; // شناسه حساب موجودی کالا (معین یا کل ۱۳)
  invoiceNumber?: string;
  currency?: string;
  sourceId?: string;
  method?: CostMethod;
}) {
  const { 
    documentNumber, 
    date, 
    fiscalYearId, 
    totalCOGS, 
    cogsAccountId, 
    inventoryAccountId, 
    invoiceNumber, 
    currency = 'تومان', 
    sourceId,
    method = 'wac'
  } = params;

  if (totalCOGS <= 0) return null;

  const methodName = method === 'fifo' ? 'FIFO (اولین وارده اولین صادره)' : 'میانگین موزون متحرک (WAC)';
  const desc = invoiceNumber 
    ? `بهای تمام شده کالای فروش رفته بابت فاکتور فروش شماره ${invoiceNumber} (روش ${methodName})` 
    : `بهای تمام شده کالای فروش رفته دوره مالی (روش ${methodName})`;

  return {
    documentNumber,
    date,
    fiscalYearId,
    description: desc,
    status: 'permanent',
    isAutoGenerated: true,
    type: 'cogs',
    sourceType: 'invoice_cogs',
    sourceId,
    currency,
    items: [
      {
        id: Math.random().toString(36).substring(2, 15),
        ledgerAccountId: cogsAccountId,
        description: `بدهکار: بهای تمام شده کالای فروش رفته${invoiceNumber ? ` (فاکتور ${invoiceNumber})` : ''}`,
        debit: Math.round(totalCOGS),
        credit: 0,
        currency
      },
      {
        id: Math.random().toString(36).substring(2, 15),
        ledgerAccountId: inventoryAccountId,
        description: `بستانکار: کاهش موجودی کالا بابت فروش${invoiceNumber ? ` (فاکتور ${invoiceNumber})` : ''}`,
        debit: 0,
        credit: Math.round(totalCOGS),
        currency
      }
    ]
  };
}
