import { Router } from 'express';
import * as XLSX from 'xlsx';
import { getDbData } from '../db/kv-store';
import { calculateAllWarehouseStocks } from '../utils/stockLogic';
import { convertToGregorian } from '../utils/format';
import { convertQuantityToBaseUnit, getUnitRatioDirection } from '../utils/unitConversion';

const router = Router();

// Helper: load all documents relevant to inventory and sales
const INVOICE_TABLE_KEYS = [
  'invoices',
  'sales_invoices',
  'purchase_invoices',
  'warehouse_receipts',
  'warehouse_remittances',
  'sale_returns',
  'purchase_returns',
  'wastes'
];

async function fetchAllSystemDocs(): Promise<any[]> {
  const allDocsRaw: any[] = [];
  for (const tKey of INVOICE_TABLE_KEYS) {
    const d = await getDbData(tKey);
    if (Array.isArray(d)) {
      d.forEach((item: any) => {
        if (item && item.id) allDocsRaw.push({ ...item, _originTable: tKey });
      });
    }
  }
  const docsMap = new Map();
  allDocsRaw.forEach(doc => {
    if (!docsMap.has(String(doc.id))) docsMap.set(String(doc.id), doc);
  });
  return Array.from(docsMap.values());
}

// -------------------------------------------------------------
// 1. Analytical Report (Dashboard Widgets)
// -------------------------------------------------------------
router.get('/api/reports/analytical', async (req, res) => {
  try {
    const products = (await getDbData('products')) || [];
    const warehouses = (await getDbData('warehouses')) || [];
    const warehouseStocks = (await getDbData('warehouse_stocks')) || [];
    const invoices = (await getDbData('invoices')) || [];

    const realProducts = products.filter((p: any) => p.type !== 'service');

    // Inventory by warehouse
    const inventoryByWarehouse = warehouses.map((wh: any) => {
      const whStocks = warehouseStocks.filter((s: any) => String(s.warehouseId) === String(wh.id));
      let totalItems = 0;
      let totalValue = 0;
      whStocks.forEach((stock: any) => {
        const p = realProducts.find((prod: any) => String(prod.id) === String(stock.productId));
        if (p) {
          const qty = Number(stock.physicalStock) || 0;
          totalItems += qty;
          totalValue += qty * (Number(p.price) || 0);
        }
      });
      return { name: wh.name, totalItems, totalValue };
    }).filter((item: any) => item.totalItems > 0);

    // Top Selling Products
    const saleInvoices = invoices.filter((inv: any) =>
      inv.type === 'sale' && inv.status !== 'voided' && !inv.isDeleted && inv.status !== 'draft' && !inv.isDraft
    );
    const productSales: Record<string, { qty: number; rev: number }> = {};
    saleInvoices.forEach((inv: any) => {
      if (Array.isArray(inv.items)) {
        inv.items.forEach((item: any) => {
          const pid = String(item.productId);
          if (!productSales[pid]) productSales[pid] = { qty: 0, rev: 0 };
          productSales[pid].qty += Number(item.quantity) || 0;
          productSales[pid].rev += (Number(item.quantity) || 0) * (Number(item.price) || 0);
        });
      }
    });

    const topProductsBySales = Object.entries(productSales).map(([pid, data]) => {
      const p = realProducts.find((prod: any) => String(prod.id) === pid);
      return { name: p ? p.name : 'نامشخص', sales: data.qty, revenue: data.rev };
    }).sort((a, b) => b.sales - a.sales).slice(0, 5);

    // Monthly Sales
    const monthlyData: Record<string, { sales: number; revenue: number }> = {};
    saleInvoices.forEach((inv: any) => {
      const d = inv.date || new Date().toISOString();
      const month = d.substring(0, 7);
      if (!monthlyData[month]) monthlyData[month] = { sales: 0, revenue: 0 };
      monthlyData[month].sales++;
      monthlyData[month].revenue += Number(inv.totalAmount) || 0;
    });

    const monthlySales = Object.entries(monthlyData).map(([month, data]) => ({
      month, sales: data.sales, revenue: data.revenue
    })).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      data: {
        inventoryByWarehouse,
        topProductsBySales,
        monthlySales,
        totalProducts: realProducts.length,
        totalSalesVolume: saleInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.totalAmount) || 0), 0)
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// -------------------------------------------------------------
// 2. Kardex Report (Server-side Running Balance & Windowing)
// -------------------------------------------------------------
router.get('/api/reports/kardex', async (req, res) => {
  try {
    const { productId, warehouseId = 'all', startDate, endDate, docType = 'all', search, page, pageSize } = req.query;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'شناسه کالا (productId) الزامی است.' });
    }

    const products = (await getDbData('products')) || [];
    const warehouses = (await getDbData('warehouses')) || [];
    const allDocs = await fetchAllSystemDocs();

    const product = products.find((p: any) => String(p.id) === String(productId));
    if (!product) {
      return res.status(404).json({ success: false, error: 'کالای مورد نظر یافت نشد.' });
    }

    const { historyList } = calculateAllWarehouseStocks({
      products: [product],
      warehouses,
      allDocs
    });

    // Filter by product & warehouse
    let prodTransactions = (historyList || []).filter((tx: any) => {
      if (String(tx.productId) !== String(productId)) return false;
      if (warehouseId !== 'all' && String(tx.warehouseId) !== String(warehouseId)) return false;
      return true;
    });

    // Sort chronologically
    prodTransactions.sort((a: any, b: any) => {
      const timeA = a.timestamp || (a.date ? new Date(convertToGregorian(a.date)).getTime() : 0);
      const timeB = b.timestamp || (b.date ? new Date(convertToGregorian(b.date)).getTime() : 0);
      return timeA - timeB;
    });

    const startTimestamp = startDate ? new Date(convertToGregorian(String(startDate))).getTime() : null;
    const endTimestamp = endDate ? new Date(convertToGregorian(String(endDate))).getTime() : null;

    let openingBalance = 0;
    const periodTransactions: any[] = [];

    // Calculate opening balance & period items with Running Balance
    let runningBalance = 0;

    for (const tx of prodTransactions) {
      const txTimestamp = tx.timestamp || (tx.date ? new Date(convertToGregorian(tx.date)).getTime() : 0);
      const qtyIn = tx.type === 'in' ? Number(tx.quantity) || 0 : 0;
      const qtyOut = tx.type === 'out' ? Number(tx.quantity) || 0 : 0;
      const delta = qtyIn - qtyOut;

      if (startTimestamp && txTimestamp < startTimestamp) {
        openingBalance += delta;
        runningBalance = openingBalance;
      } else if (!endTimestamp || txTimestamp <= endTimestamp + 86400000) {
        runningBalance += delta;
        periodTransactions.push({
          ...tx,
          balanceAfter: Number(runningBalance.toFixed(4))
        });
      }
    }

    let filteredItems = periodTransactions;

    // Filter by docType ('in' | 'out')
    if (docType === 'in') {
      filteredItems = filteredItems.filter((t: any) => t.type === 'in');
    } else if (docType === 'out') {
      filteredItems = filteredItems.filter((t: any) => t.type === 'out');
    }

    // Filter by search query
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      filteredItems = filteredItems.filter((t: any) => {
        return (
          String(t.documentNumber || '').toLowerCase().includes(q) ||
          String(t.personName || '').toLowerCase().includes(q) ||
          String(t.description || '').toLowerCase().includes(q)
        );
      });
    }

    // Assign sequential row numbers
    filteredItems.forEach((item, idx) => {
      item.rowNumber = idx + 1;
    });

    const periodInTotal = periodTransactions
      .filter((t: any) => t.type === 'in')
      .reduce((sum: number, t: any) => sum + (Number(t.quantity) || 0), 0);
    const periodOutTotal = periodTransactions
      .filter((t: any) => t.type === 'out')
      .reduce((sum: number, t: any) => sum + (Number(t.quantity) || 0), 0);

    const periodClosingBalance = openingBalance + periodInTotal - periodOutTotal;
    const unitPrice = Number(product.purchasePrice || product.price || 0);
    const totalValuation = Math.max(0, periodClosingBalance) * unitPrice;

    const total = filteredItems.length;
    let paginatedItems = filteredItems;
    let pageNum = 1;
    let limitNum = total;

    if (page || pageSize) {
      pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      limitNum = Math.max(1, parseInt(String(pageSize), 10) || 50);
      const offset = (pageNum - 1) * limitNum;
      paginatedItems = filteredItems.slice(offset, offset + limitNum);
    }

    res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        code: product.code || product.sku,
        unit: product.unit || 'عدد',
        purchasePrice: product.purchasePrice || 0,
        salePrice: product.price || 0
      },
      summary: {
        openingBalance,
        periodInTotal,
        periodOutTotal,
        periodClosingBalance,
        totalValuation,
        unitPrice
      },
      data: paginatedItems,
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasMore: pageNum * limitNum < total
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// -------------------------------------------------------------
// 3. Sales & Profitability Report (COGS & Multi-dimensional)
// -------------------------------------------------------------
router.get('/api/reports/sales', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      warehouseId,
      customerId,
      paymentStatus,
      page,
      pageSize,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const invoices = (await getDbData('invoices')) || [];
    const products = (await getDbData('products')) || [];
    const prodMap = new Map(products.map((p: any) => [String(p.id), p]));

    // Filter valid sales invoices
    let salesInvoices = invoices.filter((inv: any) =>
      inv.type === 'sale' &&
      inv.status !== 'voided' &&
      !inv.isDeleted &&
      inv.status !== 'draft' &&
      !inv.isDraft
    );

    // Date range filter
    if (startDate) {
      const startT = new Date(convertToGregorian(String(startDate))).getTime();
      salesInvoices = salesInvoices.filter((inv: any) => {
        const invT = new Date(convertToGregorian(inv.date || inv.createdAt || 0)).getTime();
        return invT >= startT;
      });
    }

    if (endDate) {
      const endT = new Date(convertToGregorian(String(endDate))).getTime() + 86400000;
      salesInvoices = salesInvoices.filter((inv: any) => {
        const invT = new Date(convertToGregorian(inv.date || inv.createdAt || 0)).getTime();
        return invT <= endT;
      });
    }

    // Warehouse filter
    if (warehouseId && warehouseId !== 'all') {
      salesInvoices = salesInvoices.filter((inv: any) => String(inv.warehouseId) === String(warehouseId));
    }

    // Customer filter
    if (customerId && customerId !== 'all') {
      salesInvoices = salesInvoices.filter((inv: any) => String(inv.customerId || inv.personId) === String(customerId));
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== 'all') {
      salesInvoices = salesInvoices.filter((inv: any) => String(inv.paymentStatus) === String(paymentStatus));
    }

    // Calculate COGS and Gross Profit for each invoice
    const enrichedInvoices = salesInvoices.map((inv: any) => {
      let invoiceCOGS = 0;
      const items = (inv.items || []).map((it: any) => {
        const p = prodMap.get(String(it.productId)) as any;
        const qty = Number(it.quantity) || 0;
        const buyPrice = Number(it.costPrice || (p ? (p.purchasePrice || p.buyPrice || 0) : 0));
        const itemCOGS = qty * buyPrice;
        invoiceCOGS += itemCOGS;
        const lineTotal = Number(it.totalPrice || (qty * (Number(it.price) || 0))) || 0;
        const lineProfit = lineTotal - itemCOGS;
        return {
          ...it,
          cogs: itemCOGS,
          grossProfit: lineProfit,
          profitMargin: lineTotal > 0 ? Number(((lineProfit / lineTotal) * 100).toFixed(2)) : 0
        };
      });

      const totalRevenue = Number(inv.totalAmount || inv.finalAmount || 0);
      const grossProfit = totalRevenue - invoiceCOGS;
      const grossMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;

      return {
        ...inv,
        calculatedCOGS: invoiceCOGS,
        grossProfit,
        grossProfitMargin: grossMargin,
        itemsWithCOGS: items
      };
    });

    // Sorting
    enrichedInvoices.sort((a: any, b: any) => {
      const valA = a[String(sortBy)] ?? 0;
      const valB = b[String(sortBy)] ?? 0;
      const isAsc = sortOrder === 'asc';
      return isAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    // Aggregated Metrics
    const totalSalesVolume = enrichedInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const totalCOGS = enrichedInvoices.reduce((sum, inv) => sum + (Number(inv.calculatedCOGS) || 0), 0);
    const totalGrossProfit = totalSalesVolume - totalCOGS;
    const overallGrossMargin = totalSalesVolume > 0 ? Number(((totalGrossProfit / totalSalesVolume) * 100).toFixed(2)) : 0;
    const totalDiscount = enrichedInvoices.reduce((sum, inv) => sum + (Number(inv.discount) || 0), 0);
    const totalTax = enrichedInvoices.reduce((sum, inv) => sum + (Number(inv.vatAmount || inv.tax) || 0), 0);

    // Pagination
    const total = enrichedInvoices.length;
    let paginated = enrichedInvoices;
    let pageNum = 1;
    let limitNum = total;

    if (page || pageSize) {
      pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      limitNum = Math.max(1, parseInt(String(pageSize), 10) || 50);
      const offset = (pageNum - 1) * limitNum;
      paginated = enrichedInvoices.slice(offset, offset + limitNum);
    }

    res.json({
      success: true,
      summary: {
        totalSalesVolume,
        totalCOGS,
        totalGrossProfit,
        overallGrossMargin,
        totalDiscount,
        totalTax,
        invoiceCount: total,
        averageInvoiceAmount: total > 0 ? Math.round(totalSalesVolume / total) : 0
      },
      data: paginated,
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasMore: pageNum * limitNum < total
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// -------------------------------------------------------------
// 4. Balances Report (Debtors & Creditors Ledger Summary)
// -------------------------------------------------------------
router.get('/api/reports/balances', async (req, res) => {
  try {
    const { filterType = 'all', groupId, search, page, pageSize } = req.query;

    const persons = (await getDbData('persons')) || [];
    const invoices = (await getDbData('invoices')) || [];
    const transactions = (await getDbData('transactions')) || [];
    const accountingDocs = (await getDbData('accounting_documents')) || [];

    const personBalances = persons.map((person: any) => {
      const pid = String(person.id);

      // Invoices sum
      let saleTotal = 0;
      let purchaseTotal = 0;
      invoices.forEach((inv: any) => {
        if (inv.isDeleted || inv.status === 'voided') return;
        if (String(inv.customerId || inv.personId) === pid) {
          if (inv.type === 'sale') saleTotal += Number(inv.totalAmount) || 0;
          if (inv.type === 'purchase') purchaseTotal += Number(inv.totalAmount) || 0;
          if (inv.type === 'sale_return') saleTotal -= Number(inv.totalAmount) || 0;
          if (inv.type === 'purchase_return') purchaseTotal -= Number(inv.totalAmount) || 0;
        }
      });

      // Transactions sum (receipts & payments)
      let receivedCash = 0;
      let paidCash = 0;
      transactions.forEach((tx: any) => {
        if (String(tx.personId) === pid) {
          if (tx.type === 'receive' || tx.type === 'income') receivedCash += Number(tx.amount) || 0;
          if (tx.type === 'pay' || tx.type === 'expense') paidCash += Number(tx.amount) || 0;
        }
      });

      // Net balance: positive means customer owes store (بدهکار), negative means store owes customer (بستانکار)
      const balance = (saleTotal + paidCash) - (purchaseTotal + receivedCash);
      let status: 'debtor' | 'creditor' | 'settled' = 'settled';
      if (balance > 0) status = 'debtor';
      else if (balance < 0) status = 'creditor';

      return {
        id: person.id,
        name: person.name,
        code: person.personCode || person.code || '-',
        phone: person.phone || person.mobile || '-',
        role: person.role || 'customer',
        groupId: person.groupId || null,
        balance,
        absoluteBalance: Math.abs(balance),
        status,
        saleTotal,
        purchaseTotal,
        receivedCash,
        paidCash
      };
    });

    let filtered = personBalances;

    // Filter by type
    if (filterType === 'debtor') {
      filtered = filtered.filter(p => p.status === 'debtor');
    } else if (filterType === 'creditor') {
      filtered = filtered.filter(p => p.status === 'creditor');
    } else if (filterType === 'settled') {
      filtered = filtered.filter(p => p.status === 'settled');
    }

    // Filter by group
    if (groupId && groupId !== 'all') {
      filtered = filtered.filter(p => String(p.groupId) === String(groupId));
    }

    // Search filter
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        String(p.phone).includes(q) ||
        String(p.code).toLowerCase().includes(q)
      );
    }

    // Summary calculation
    const totalDebtorsAmount = personBalances
      .filter(p => p.status === 'debtor')
      .reduce((sum, p) => sum + p.balance, 0);
    const totalCreditorsAmount = personBalances
      .filter(p => p.status === 'creditor')
      .reduce((sum, p) => sum + Math.abs(p.balance), 0);
    const netBalance = totalDebtorsAmount - totalCreditorsAmount;

    // Sort by largest balance first
    filtered.sort((a, b) => b.absoluteBalance - a.absoluteBalance);

    const total = filtered.length;
    let paginated = filtered;
    let pageNum = 1;
    let limitNum = total;

    if (page || pageSize) {
      pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      limitNum = Math.max(1, parseInt(String(pageSize), 10) || 50);
      const offset = (pageNum - 1) * limitNum;
      paginated = filtered.slice(offset, offset + limitNum);
    }

    res.json({
      success: true,
      summary: {
        totalDebtorsAmount,
        totalCreditorsAmount,
        netBalance,
        debtorsCount: personBalances.filter(p => p.status === 'debtor').length,
        creditorsCount: personBalances.filter(p => p.status === 'creditor').length,
        settledCount: personBalances.filter(p => p.status === 'settled').length,
        totalCount: personBalances.length
      },
      data: paginated,
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasMore: pageNum * limitNum < total
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// -------------------------------------------------------------
// 5. Inventory Valuation Report (Physical, Reserved & Available)
// -------------------------------------------------------------
router.get('/api/reports/inventory', async (req, res) => {
  try {
    const { warehouseId = 'all', categoryId = 'all', search, lowStockOnly, page, pageSize } = req.query;

    const products = (await getDbData('products')) || [];
    const warehouses = (await getDbData('warehouses')) || [];
    const allDocs = await fetchAllSystemDocs();

    const { productSummaryMap, stocksList } = calculateAllWarehouseStocks({
      products,
      warehouses,
      allDocs
    });

    const realProducts = products.filter((p: any) => p.type !== 'service');

    let inventoryItems = realProducts.map((prod: any) => {
      const pid = String(prod.id);
      const summary = productSummaryMap[pid] || {
        totalPhysical: 0,
        totalReserved: 0,
        totalAvailable: 0,
        warehouses: {}
      };

      let physical = summary.totalPhysical;
      let reserved = summary.totalReserved;
      let available = summary.totalAvailable;

      if (warehouseId !== 'all') {
        const whData = summary.warehouses[String(warehouseId)] || { physical: 0, reserved: 0, available: 0 };
        physical = whData.physical;
        reserved = whData.reserved;
        available = whData.available;
      }

      const purchasePrice = Number(prod.purchasePrice || prod.buyPrice || 0);
      const salePrice = Number(prod.price || 0);
      const minStock = Number(prod.minStock || 0);
      const isLowStock = physical <= minStock;

      return {
        id: prod.id,
        name: prod.name,
        code: prod.code || prod.sku || '-',
        unit: prod.unit || 'عدد',
        categoryId: prod.categoryId || null,
        physicalStock: physical,
        reservedStock: reserved,
        availableStock: available,
        purchasePrice,
        salePrice,
        costValuation: Math.max(0, physical) * purchasePrice,
        saleValuation: Math.max(0, physical) * salePrice,
        minStock,
        isLowStock
      };
    });

    // Filter by category
    if (categoryId && categoryId !== 'all') {
      inventoryItems = inventoryItems.filter(p => String(p.categoryId) === String(categoryId));
    }

    // Filter by low stock
    if (String(lowStockOnly) === 'true') {
      inventoryItems = inventoryItems.filter(p => p.isLowStock);
    }

    // Filter by search
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      inventoryItems = inventoryItems.filter(p =>
        p.name.toLowerCase().includes(q) ||
        String(p.code).toLowerCase().includes(q)
      );
    }

    // Summary calculation
    const totalPhysicalStock = inventoryItems.reduce((sum, p) => sum + p.physicalStock, 0);
    const totalReservedStock = inventoryItems.reduce((sum, p) => sum + p.reservedStock, 0);
    const totalAvailableStock = inventoryItems.reduce((sum, p) => sum + p.availableStock, 0);
    const totalCostValuation = inventoryItems.reduce((sum, p) => sum + p.costValuation, 0);
    const totalSaleValuation = inventoryItems.reduce((sum, p) => sum + p.saleValuation, 0);
    const lowStockCount = inventoryItems.filter(p => p.isLowStock).length;

    const total = inventoryItems.length;
    let paginated = inventoryItems;
    let pageNum = 1;
    let limitNum = total;

    if (page || pageSize) {
      pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      limitNum = Math.max(1, parseInt(String(pageSize), 10) || 50);
      const offset = (pageNum - 1) * limitNum;
      paginated = inventoryItems.slice(offset, offset + limitNum);
    }

    res.json({
      success: true,
      summary: {
        totalItemsCount: total,
        totalPhysicalStock,
        totalReservedStock,
        totalAvailableStock,
        totalCostValuation,
        totalSaleValuation,
        lowStockCount
      },
      data: paginated,
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasMore: pageNum * limitNum < total
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// -------------------------------------------------------------
// 6. Universal Server-side Excel Export Streaming
// -------------------------------------------------------------
router.get('/api/reports/export/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    let exportRows: any[] = [];
    let sheetName = 'گزارش';

    if (reportType === 'sales') {
      sheetName = 'گزارش_فروش';
      const invoices = (await getDbData('invoices')) || [];
      const products = (await getDbData('products')) || [];
      const prodMap = new Map(products.map((p: any) => [String(p.id), p]));

      const validSales = invoices.filter((inv: any) =>
        inv.type === 'sale' && inv.status !== 'voided' && !inv.isDeleted
      );

      exportRows = validSales.map((inv: any, idx: number) => {
        let cogs = 0;
        (inv.items || []).forEach((it: any) => {
          const p = prodMap.get(String(it.productId)) as any;
          const bp = Number(it.costPrice || (p ? p.purchasePrice : 0)) || 0;
          cogs += (Number(it.quantity) || 0) * bp;
        });
        const rev = Number(inv.totalAmount) || 0;
        const profit = rev - cogs;

        return {
          'ردیف': idx + 1,
          'شماره فاکتور': inv.invoiceNumber || '-',
          'تاریخ': inv.date || '-',
          'خریدار': inv.customerName || inv.personName || 'نامشخص',
          'مبلغ کل (تومان)': rev,
          'بهای تمام‌شده (COGS)': cogs,
          'سود ناخالص': profit,
          'درصد حاشیه سود': rev > 0 ? Number(((profit / rev) * 100).toFixed(1)) : 0,
          'وضعیت تسویه': inv.paymentStatus === 'settled' ? 'تسویه شده' : 'مانده‌دار'
        };
      });
    } else if (reportType === 'balances') {
      sheetName = 'تراز_اشخاص';
      const persons = (await getDbData('persons')) || [];
      const invoices = (await getDbData('invoices')) || [];
      const transactions = (await getDbData('transactions')) || [];

      exportRows = persons.map((p: any, idx: number) => {
        const pid = String(p.id);
        let sales = 0;
        let purchases = 0;
        invoices.forEach((inv: any) => {
          if (inv.isDeleted || inv.status === 'voided') return;
          if (String(inv.customerId || inv.personId) === pid) {
            if (inv.type === 'sale') sales += Number(inv.totalAmount) || 0;
            if (inv.type === 'purchase') purchases += Number(inv.totalAmount) || 0;
          }
        });
        let rec = 0;
        let pay = 0;
        transactions.forEach((tx: any) => {
          if (String(tx.personId) === pid) {
            if (tx.type === 'receive') rec += Number(tx.amount) || 0;
            if (tx.type === 'pay') pay += Number(tx.amount) || 0;
          }
        });

        const bal = (sales + pay) - (purchases + rec);
        const status = bal > 0 ? 'بدهکار' : bal < 0 ? 'بستانکار' : 'بی‌حساب';

        return {
          'ردیف': idx + 1,
          'کد طرف حساب': p.personCode || p.code || '-',
          'نام و نام خانوادگی': p.name,
          'شماره تماس': p.phone || p.mobile || '-',
          'نقش': p.role || 'مشتری',
          'وضعیت حساب': status,
          'مانده حساب (تومان)': Math.abs(bal)
        };
      });
    } else if (reportType === 'inventory') {
      sheetName = 'موجودی_انبار';
      const products = (await getDbData('products')) || [];
      const warehouses = (await getDbData('warehouses')) || [];
      const allDocs = await fetchAllSystemDocs();

      const { productSummaryMap } = calculateAllWarehouseStocks({
        products,
        warehouses,
        allDocs
      });

      exportRows = products.filter((p: any) => p.type !== 'service').map((prod: any, idx: number) => {
        const sm = productSummaryMap[String(prod.id)] || { totalPhysical: 0, totalAvailable: 0 };
        const phys = sm.totalPhysical;
        const buyPrice = Number(prod.purchasePrice || 0);

        return {
          'ردیف': idx + 1,
          'کد کالا': prod.code || prod.sku || '-',
          'نام کالا': prod.name,
          'واحد': prod.unit || 'عدد',
          'موجودی فیزیکی': phys,
          'موجودی قابل فروش': sm.totalAvailable,
          'قیمت خرید (تومان)': buyPrice,
          'ارزش کل موجودی': phys * buyPrice,
          'حداقل موجودی': prod.minStock || 0
        };
      });
    } else {
      return res.status(400).json({ error: 'نوع گزارش نامعتبر است.' });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Report_${reportType}_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
