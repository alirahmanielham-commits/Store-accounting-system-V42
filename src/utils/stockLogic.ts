import { convertQuantityToBaseUnit, getUnitRatioDirection } from './unitConversion';
import { compareKardexTransactions, parseDocDateToTimestamp } from './kardexSort';

export interface WarehouseStockItem {
  id: string; // `${productId}_${warehouseId}`
  productId: string;
  warehouseId: string;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  lastUpdated?: number;
}

export interface ProductStockSummary {
  productId: string;
  defaultWhId: string;
  totalPhysical: number;
  totalReserved: number;
  totalAvailable: number;
  warehouses: Record<string, {
    physical: number;
    reserved: number;
    available: number;
  }>;
}

export interface CalculateStockOptions {
  products: any[];
  warehouses: any[];
  allDocs: any[];
}

/**
 * Core Inventory & Stock Calculation Engine:
 * Formula: Available Stock = Physical Stock - Reserved Stock
 *
 * Rules:
 * 1. Sales invoices do NOT reduce physical stock.
 * 2. Unremitted portions of valid sales invoices are counted as Reserved Stock.
 * 3. Warehouse remittances reduce physical stock and release the corresponding reserved stock.
 * 4. Partial remittances are fully supported (e.g. invoice 100, remittance 40 -> physical 60, reserved 60, available 0).
 * 5. Voided or deleted invoices immediately release their reserved stock.
 * 6. Invoices in draft status do not reserve stock.
 * 7. Editing an invoice automatically updates its reserved stock.
 * 8. All calculations are independent per product and per warehouse.
 */
export function calculateAllWarehouseStocks({ products, warehouses, allDocs }: CalculateStockOptions) {
  const stocksMap: Record<string, WarehouseStockItem> = {};
  const historyList: any[] = [];
  const generateId = () => Math.random().toString(36).substring(2, 15);

  const productMap = new Map<string, any>();
  products.forEach((p: any) => {
    if (p && p.id) {
      productMap.set(String(p.id), p);
    }
  });

  const defaultWh = warehouses && warehouses.length > 0 ? String(warehouses[0].id) : 'unknown';

  // 1. Initialize stock map for all products and initial stocks
  products.forEach((p: any) => {
    if (!p || p.type === 'service') return;

    const pid = String(p.id);
    const pDefaultWhId = String(p.warehouseId || defaultWh);
    const targetWhId = String(p.initialStockWarehouseId || p.warehouseId || defaultWh);
    const baseStock = Number(p.stock) || 0;

    // Ensure target warehouse entry exists
    const targetKey = `${pid}_${targetWhId}`;
    if (!stocksMap[targetKey]) {
      stocksMap[targetKey] = {
        id: targetKey,
        productId: pid,
        warehouseId: targetWhId,
        physicalStock: 0,
        reservedStock: 0,
        availableStock: 0,
      };
    }

    // Ensure default warehouse entry exists
    const defaultKey = `${pid}_${pDefaultWhId}`;
    if (!stocksMap[defaultKey]) {
      stocksMap[defaultKey] = {
        id: defaultKey,
        productId: pid,
        warehouseId: pDefaultWhId,
        physicalStock: 0,
        reservedStock: 0,
        availableStock: 0,
      };
    }

    if (baseStock > 0) {
      const before = stocksMap[targetKey].physicalStock;
      stocksMap[targetKey].physicalStock += baseStock;
      const after = stocksMap[targetKey].physicalStock;

      const docNum = p.initialStockDocNumber || (p.code ? `OPN-${p.code}` : 'موجودی اولیه');
      const docDate = p.initialStockDate || (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      const docDesc = p.initialStockDescription || 'سند موجودی اول دوره و افتتاحیه انبار';

      historyList.push({
        id: generateId(),
        productId: pid,
        warehouseId: targetWhId,
        date: docDate,
        time: '۰۰:۰۰',
        timestamp: p.initialStockTimestamp || (p.createdAt ? new Date(p.createdAt).getTime() : 1),
        createdAt: p.createdAt || '1970-01-01T00:00:00.000Z',
        type: 'in',
        quantity: baseStock,
        unitPrice: Number(p.purchasePrice || p.price || 0),
        totalPrice: baseStock * Number(p.purchasePrice || p.price || 0),
        documentType: 'initial_stock',
        documentId: pid,
        documentNumber: docNum,
        description: docDesc,
        personId: '',
        personName: 'سیستم (سند افتتاحیه انبار)',
        stockBefore: before,
        stockAfter: after,
      });
    }
  });

  // Helper to extract document type
  const getDocType = (doc: any): string => {
    if (doc.type) return doc.type;
    if (doc._originTable === 'warehouse_receipts') return 'warehouse_receipt';
    if (doc._originTable === 'warehouse_remittances') return 'warehouse_remittance';
    if (doc._originTable === 'sales_invoices') return 'sale';
    if (doc._originTable === 'purchase_invoices') return 'purchase';
    if (doc._originTable === 'sale_returns') return 'sales_return';
    if (doc._originTable === 'purchase_returns') return 'purchase_return';
    if (doc._originTable === 'wastes') return 'waste';
    return 'sale';
  };

  // Filter valid documents (not deleted, not voided, not draft)
  const validDocs = (allDocs || []).filter((d: any) => {
    if (!d || d.isDeleted) return false;
    if (d.status === 'draft' || d.isDraft) return false;
    if (d.status === 'voided') return false;
    return true;
  });

  // Sort chronologically for Kardex with receipt-before-remittance priority
  const sortedDocs = [...validDocs].sort((a: any, b: any) => {
    const docTypeA = getDocType(a);
    const docTypeB = getDocType(b);
    const tsA = parseDocDateToTimestamp(a.date, a.time, a.createdAt) || (a.timestamp || 0);
    const tsB = parseDocDateToTimestamp(b.date, b.time, b.createdAt) || (b.timestamp || 0);
    return compareKardexTransactions(
      { ...a, documentType: docTypeA, timestamp: tsA },
      { ...b, documentType: docTypeB, timestamp: tsB }
    );
  });

  // 2. Track warehouse remittances linked to source invoices
  // Map of: sourceInvoiceKey -> { [productId_warehouseId]: totalRemittedQuantity }
  const remittedBySourceInvoice: Record<string, Record<string, number>> = {};

  sortedDocs.forEach((doc: any) => {
    const docType = getDocType(doc);
    if (docType !== 'warehouse_remittance') return;

    const candidateIds = [
      doc.sourceInvoiceId,
      doc.referenceInvoiceId,
      doc.invoiceId,
      doc.referenceId,
    ].filter(Boolean).map((v: any) => String(v).trim());

    if (candidateIds.length === 0) return;

    candidateIds.forEach(sourceId => {
      if (!remittedBySourceInvoice[sourceId]) {
        remittedBySourceInvoice[sourceId] = {};
      }
    });

    (doc.items || []).forEach((item: any) => {
      const pid = String(item.productId || '');
      const product = productMap.get(pid);
      if (!product || product.type === 'service') return;

      const pDefaultWhId = String(product.warehouseId || defaultWh);
      const whId = String(item.warehouseId || doc.warehouseId || pDefaultWhId);
      const key = `${pid}_${whId}`;

      const dir = item.unitRatioDirection || product.unitRatioDirection || getUnitRatioDirection(product);
      const ratio = Number(item.unitRatio || product.unitRatio || 1);
      const isSec = Boolean(item.isSecondaryUnit);
      const q = convertQuantityToBaseUnit(Number(item.quantity) || 0, isSec, ratio, dir);

      candidateIds.forEach(sourceId => {
        remittedBySourceInvoice[sourceId][key] = (remittedBySourceInvoice[sourceId][key] || 0) + q;
      });
    });
  });

  // 3. Process physical stock movements (Receipts, Remittances, Returns, Wastes)
  sortedDocs.forEach((doc: any) => {
    const docType = getDocType(doc);

    // Sales invoices do NOT modify physical stock (Rule 1)
    if (docType === 'sale' || docType === 'purchase' || docType === 'proforma') {
      return;
    }

    (doc.items || []).forEach((item: any) => {
      const pid = String(item.productId || '');
      const product = productMap.get(pid);
      if (!product || product.type === 'service') return;

      const pDefaultWhId = String(product.warehouseId || defaultWh);
      const whId = String(item.warehouseId || doc.warehouseId || pDefaultWhId);
      const key = `${pid}_${whId}`;

      if (!stocksMap[key]) {
        stocksMap[key] = {
          id: key,
          productId: pid,
          warehouseId: whId,
          physicalStock: 0,
          reservedStock: 0,
          availableStock: 0,
        };
      }

      const dir = item.unitRatioDirection || product.unitRatioDirection || getUnitRatioDirection(product);
      const ratio = Number(item.unitRatio || product.unitRatio || 1);
      const isSec = Boolean(item.isSecondaryUnit);
      const q = convertQuantityToBaseUnit(Number(item.quantity) || 0, isSec, ratio, dir);
      if (q === 0) return;

      const rawPrice = Number(item.unitPrice || item.price || product.purchasePrice || 0);
      const docTime = doc.time || (doc.createdAt ? new Date(doc.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '');
      const docTs = parseDocDateToTimestamp(doc.date, docTime, doc.createdAt);

      if (docType === 'warehouse_receipt' || docType === 'sales_return') {
        // Inward physical movement
        const before = stocksMap[key].physicalStock;
        stocksMap[key].physicalStock += q;
        const after = stocksMap[key].physicalStock;

        historyList.push({
          id: generateId(),
          productId: pid,
          warehouseId: whId,
          timestamp: docTs,
          time: docTime,
          createdAt: doc.createdAt,
          date: doc.date || (doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          type: 'in',
          quantity: q,
          unitPrice: rawPrice,
          totalPrice: q * rawPrice,
          documentType: docType,
          documentId: doc.id,
          documentNumber: doc.invoiceNumber || doc.docNumber || String(doc.id),
          description: doc.description || (docType === 'sales_return' ? 'برگشت از فروش' : 'رسید ورود به انبار'),
          personId: doc.customerId || doc.personId || '',
          personName: doc.customerName || doc.personName || '',
          stockBefore: before,
          stockAfter: after,
        });
      } else if (docType === 'warehouse_remittance' || docType === 'purchase_return' || docType === 'waste') {
        // Outward physical movement (Rule 4)
        const before = stocksMap[key].physicalStock;
        stocksMap[key].physicalStock -= q;
        const after = stocksMap[key].physicalStock;

        historyList.push({
          id: generateId(),
          productId: pid,
          warehouseId: whId,
          timestamp: docTs,
          time: docTime,
          createdAt: doc.createdAt,
          date: doc.date || (doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          type: 'out',
          quantity: q,
          unitPrice: rawPrice,
          totalPrice: q * rawPrice,
          documentType: docType,
          documentId: doc.id,
          documentNumber: doc.invoiceNumber || doc.docNumber || String(doc.id),
          description: doc.description || (docType === 'purchase_return' ? 'برگشت از خرید' : docType === 'waste' ? 'ضایعات کالا' : 'حواله خروج از انبار'),
          personId: doc.customerId || doc.personId || '',
          personName: doc.customerName || doc.personName || '',
          stockBefore: before,
          stockAfter: after,
        });
      }
    });
  });

  // 4. Calculate Reserved Stock from valid Sales Invoices (Rules 1, 2, 4, 5, 7, 8, 9)
  sortedDocs.forEach((inv: any) => {
    const docType = getDocType(inv);
    if (docType !== 'sale') return;

    // Group items in this invoice by `${productId}_${warehouseId}`
    const invQtyMap: Record<string, number> = {};

    (inv.items || []).forEach((item: any) => {
      const pid = String(item.productId || '');
      const product = productMap.get(pid);
      if (!product || product.type === 'service') return;

      const pDefaultWhId = String(product.warehouseId || defaultWh);
      const whId = String(item.warehouseId || inv.warehouseId || pDefaultWhId);
      const key = `${pid}_${whId}`;

      const dir = item.unitRatioDirection || product.unitRatioDirection || getUnitRatioDirection(product);
      const ratio = Number(item.unitRatio || product.unitRatio || 1);
      const isSec = Boolean(item.isSecondaryUnit);
      const q = convertQuantityToBaseUnit(Number(item.quantity) || 0, isSec, ratio, dir);

      invQtyMap[key] = (invQtyMap[key] || 0) + q;
    });

    const invIdStr = String(inv.id).trim();
    const invNumStr = inv.invoiceNumber ? String(inv.invoiceNumber).trim() : null;

    Object.keys(invQtyMap).forEach((key) => {
      const neededSaleQty = invQtyMap[key];

      // Find total fulfilled by remittances linked to this invoice
      const remittedById = remittedBySourceInvoice[invIdStr]?.[key] || 0;
      const remittedByNum = (invNumStr && invNumStr !== invIdStr) ? (remittedBySourceInvoice[invNumStr]?.[key] || 0) : 0;
      const totalRemittedForThisInv = remittedById + remittedByNum;

      // Reserved is unfulfilled portion (Rule 2, 4, 5)
      const unremittedForInv = Math.max(0, neededSaleQty - totalRemittedForThisInv);

      if (!stocksMap[key]) {
        const [prodId, whId] = key.split('_');
        stocksMap[key] = {
          id: key,
          productId: prodId,
          warehouseId: whId,
          physicalStock: 0,
          reservedStock: 0,
          availableStock: 0,
        };
      }

      stocksMap[key].reservedStock += unremittedForInv;
    });
  });

  // 5. Finalize Available Stock: Available = Physical - Reserved
  Object.keys(stocksMap).forEach((key) => {
    stocksMap[key].availableStock = Number(
      (stocksMap[key].physicalStock - stocksMap[key].reservedStock).toFixed(4)
    );
    stocksMap[key].lastUpdated = Date.now();
  });

  // 6. Build product summaries for UI & fast lookups
  const productSummaryMap: Record<string, ProductStockSummary> = {};

  products.forEach((p: any) => {
    if (!p) return;
    const pid = String(p.id);
    const pDefaultWhId = String(p.warehouseId || defaultWh);

    const summary: ProductStockSummary = {
      productId: pid,
      defaultWhId: pDefaultWhId,
      totalPhysical: 0,
      totalReserved: 0,
      totalAvailable: 0,
      warehouses: {},
    };

    // Populate all known warehouses
    warehouses.forEach((w: any) => {
      if (!w || !w.id) return;
      const wid = String(w.id);
      summary.warehouses[wid] = { physical: 0, reserved: 0, available: 0 };
    });

    Object.keys(stocksMap).forEach((key) => {
      if (stocksMap[key].productId === pid) {
        const wid = stocksMap[key].warehouseId;
        if (!summary.warehouses[wid]) {
          summary.warehouses[wid] = { physical: 0, reserved: 0, available: 0 };
        }
        summary.warehouses[wid].physical += stocksMap[key].physicalStock;
        summary.warehouses[wid].reserved += stocksMap[key].reservedStock;
        summary.warehouses[wid].available += stocksMap[key].availableStock;

        summary.totalPhysical += stocksMap[key].physicalStock;
        summary.totalReserved += stocksMap[key].reservedStock;
      }
    });

    summary.totalPhysical = Number(summary.totalPhysical.toFixed(4));
    summary.totalReserved = Number(summary.totalReserved.toFixed(4));
    summary.totalAvailable = Number((summary.totalPhysical - summary.totalReserved).toFixed(4));

    productSummaryMap[pid] = summary;
  });

  const stocksList = Object.values(stocksMap);

  // Guarantee strict chronological order for Kardex (Receipts before Remittances on same day)
  historyList.sort(compareKardexTransactions);

  return {
    stocksMap,
    stocksList,
    productSummaryMap,
    historyList,
  };
}

export interface StockValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    productId: string;
    productName: string;
    warehouseId: string;
    warehouseName: string;
    availableStock: number;
    requestedQty: number;
  }[];
}

/**
 * Validates whether a sales invoice can be fulfilled from current available stock
 * without causing available stock to become negative (Available = Physical - Reserved).
 * Concurrency-safe when run within server-side lock.
 */
export function validateStockAvailability({
  docToValidate,
  products,
  warehouses,
  allDocs,
  allowNegativeStock = false,
}: {
  docToValidate: any;
  products: any[];
  warehouses: any[];
  allDocs: any[];
  allowNegativeStock?: boolean;
}): StockValidationResult {
  if (allowNegativeStock) return { valid: true };
  if (!docToValidate || docToValidate.isDeleted) return { valid: true };
  if (
    docToValidate.allowNegativeStock === true ||
    docToValidate.allowNegativeStock === "true" ||
    docToValidate.allowNegativeStock === 1
  ) {
    return { valid: true };
  }
  if (docToValidate.status === 'draft' || docToValidate.isDraft || docToValidate.status === 'voided') {
    return { valid: true };
  }

  // Only validate sales invoices
  const docType = docToValidate.type || (docToValidate._originTable === 'sales_invoices' ? 'sale' : 'sale');
  if (docType !== 'sale') return { valid: true };

  const defaultWh = warehouses && warehouses.length > 0 ? String(warehouses[0].id) : 'unknown';
  const productMap = new Map<string, any>();
  products.forEach((p: any) => {
    if (p && p.id) productMap.set(String(p.id), p);
  });

  const warehouseMap = new Map<string, any>();
  warehouses.forEach((w: any) => {
    if (w && w.id) warehouseMap.set(String(w.id), w);
  });

  // 1. Exclude this specific invoice from existing documents to find available stock without this invoice
  const currentInvId = docToValidate.id ? String(docToValidate.id).trim() : null;
  const currentInvNum = docToValidate.invoiceNumber ? String(docToValidate.invoiceNumber).trim() : null;

  const otherDocs = (allDocs || []).filter((d: any) => {
    if (!d) return false;
    if (currentInvId && String(d.id).trim() === currentInvId) return false;
    return true;
  });

  // Calculate stocks on baseline documents
  const { stocksMap } = calculateAllWarehouseStocks({
    products,
    warehouses,
    allDocs: otherDocs,
  });

  // 2. Sum requested quantities by product and warehouse in the document being validated
  const requestedMap: Record<string, number> = {};
  (docToValidate.items || []).forEach((item: any) => {
    const pid = String(item.productId || '');
    const product = productMap.get(pid);
    if (!product || product.type === 'service') return;

    const pDefaultWhId = String(product.warehouseId || defaultWh);
    const whId = String(item.warehouseId || docToValidate.warehouseId || pDefaultWhId);
    const key = `${pid}_${whId}`;

    const dir = item.unitRatioDirection || product.unitRatioDirection || getUnitRatioDirection(product);
    const ratio = Number(item.unitRatio || product.unitRatio || 1);
    const isSec = Boolean(item.isSecondaryUnit);
    const q = convertQuantityToBaseUnit(Number(item.quantity) || 0, isSec, ratio, dir);

    requestedMap[key] = (requestedMap[key] || 0) + q;
  });

  // 3. Find any remittances that have already been issued against this invoice
  const alreadyRemittedMap: Record<string, number> = {};
  otherDocs.forEach((doc: any) => {
    const dType = doc.type || (doc._originTable === 'warehouse_remittances' ? 'warehouse_remittance' : '');
    if (dType !== 'warehouse_remittance') return;

    const srcId = doc.sourceInvoiceId ? String(doc.sourceInvoiceId).trim() : null;
    if (!srcId) return;

    const matchesThisInv = (currentInvId && srcId === currentInvId) || (currentInvNum && srcId === currentInvNum);
    if (!matchesThisInv) return;

    (doc.items || []).forEach((item: any) => {
      const pid = String(item.productId || '');
      const product = productMap.get(pid);
      if (!product || product.type === 'service') return;

      const pDefaultWhId = String(product.warehouseId || defaultWh);
      const whId = String(item.warehouseId || doc.warehouseId || pDefaultWhId);
      const key = `${pid}_${whId}`;

      const dir = item.unitRatioDirection || product.unitRatioDirection || getUnitRatioDirection(product);
      const ratio = Number(item.unitRatio || product.unitRatio || 1);
      const isSec = Boolean(item.isSecondaryUnit);
      const q = convertQuantityToBaseUnit(Number(item.quantity) || 0, isSec, ratio, dir);

      alreadyRemittedMap[key] = (alreadyRemittedMap[key] || 0) + q;
    });
  });

  // 4. Validate each item key
  const shortageDetails: any[] = [];
  Object.keys(requestedMap).forEach((key) => {
    const totalRequested = requestedMap[key];
    const alreadyRemitted = alreadyRemittedMap[key] || 0;
    // New reservation amount that must be satisfied by available stock
    const netReservationNeeded = Math.max(0, totalRequested - alreadyRemitted);

    const available = stocksMap[key] ? stocksMap[key].availableStock : 0;

    if (netReservationNeeded > available + 0.0001) {
      const [pid, wid] = key.split('_');
      const prod = productMap.get(pid);
      const wh = warehouseMap.get(wid);
      shortageDetails.push({
        productId: pid,
        productName: prod?.name || 'کالا',
        warehouseId: wid,
        warehouseName: wh?.name || 'انبار پیش‌فرض',
        availableStock: available,
        requestedQty: netReservationNeeded,
      });
    }
  });

  if (shortageDetails.length > 0) {
    const errorMsgs = shortageDetails.map(
      (s) => `موجودی آزاد «${s.productName}» در «${s.warehouseName}» ناکافی است (موجود آزاد: ${s.availableStock}، نیاز به رزرو: ${s.requestedQty})`
    );
    return {
      valid: false,
      error: `کسری موجودی آزاد برای رزرو:\n${errorMsgs.join('\n')}`,
      details: shortageDetails,
    };
  }

  return { valid: true };
}

