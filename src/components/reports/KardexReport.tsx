import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Package,
  Search,
  Download,
  FileText,
  Filter,
  Printer,
  RefreshCw,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Calendar,
  Layers,
  Building2,
  Coins,
  ChevronDown,
  Info
} from "lucide-react";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {
  getProducts,
  getWarehouses,
  getInvoices,
  getStoreSettings,
  getPersons,
  getProductInventoryHistory,
  recalculateAllWarehouseStocks
} from '../../services/dataService';
import { Product, Warehouse } from '../../types';
import CustomDatePicker from "../ui/CustomDatePicker";
import {
  convertQuantityToBaseUnit,
  convertPriceToBaseUnit,
  getUnitRatioDirection,
  formatUnitConversionFormula
} from '../../utils/unitConversion';

const DatePicker = CustomDatePicker;

const formatNum = (num: number | string) => {
  const n = Number(num);
  if (isNaN(n)) return '۰';
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 3 }).format(n);
};

const formatCur = (num: number | string) => {
  const n = Number(num);
  if (isNaN(n)) return '۰';
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(Math.round(n));
};

interface KardexTransaction {
  id: string;
  timestamp: number;
  date: string;
  time?: string;
  warehouseId: string;
  warehouseName: string;
  documentType: string;
  documentNumber: string;
  documentId?: string;
  personName: string;
  description: string;
  type: 'in' | 'out';
  quantity: number; // base unit
  originalQuantity?: number;
  unitPrice: number; // base unit price
  originalUnitPrice?: number;
  totalPrice: number;
  isSecondaryUnit: boolean;
  selectedUnit?: string;
  balanceBefore?: number;
  balanceAfter?: number;
}

export default function KardexReport() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [selectedDocType, setSelectedDocType] = useState<string>('all'); // all, in, out
  const [tableSearch, setTableSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [allRawTransactions, setAllRawTransactions] = useState<KardexTransaction[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [prods, whs, invs, pers, sett] = await Promise.all([
        getProducts(),
        getWarehouses(),
        getInvoices(),
        getPersons(),
        getStoreSettings()
      ]);
      const physicalProds = prods.filter(p => p.type !== 'service');
      setProducts(physicalProds);
      setWarehouses(whs || []);
      setInvoices(invs || []);
      setPersons(pers || []);
      setSettings(sett || {});

      // Auto-select first product if none selected
      if (physicalProds.length > 0 && !selectedProductId) {
        setSelectedProductId(physicalProds[0].id?.toString() || '');
      }
    } catch (err) {
      console.error('Error loading initial Kardex data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // When selected product changes or refresh is requested, compile all receipts & remittances
  useEffect(() => {
    if (selectedProductId) {
      loadProductKardexData(selectedProductId);
    } else {
      setAllRawTransactions([]);
    }
  }, [selectedProductId]);

  const loadProductKardexData = async (prodId: string) => {
    setIsRefreshing(true);
    try {
      const product = products.find(p => p.id?.toString() === prodId.toString());
      if (!product) {
        setAllRawTransactions([]);
        return;
      }

      const defaultWhId = (product.warehouseId || (warehouses[0]?.id) || 'unknown').toString();
      const defaultWhName = warehouses.find(w => w.id?.toString() === defaultWhId)?.name || 'انبار اصلی';

      // 1. Fetch server kardex transactions
      let serverHistory: any[] = [];
      try {
        serverHistory = await getProductInventoryHistory(prodId);
      } catch (e) {
        console.warn('Could not fetch server kardex history, falling back to invoices', e);
      }

      const transactionMap = new Map<string, KardexTransaction>();

      // A. Initial Stock from product definition
      const initialStockQty = Number(product.stock) || 0;
      if (initialStockQty !== 0) {
        const initTs = (product as any).createdAt ? new Date((product as any).createdAt).getTime() : 1;
        const initKey = `init_${prodId}`;
        transactionMap.set(initKey, {
          id: initKey,
          timestamp: initTs,
          date: (product as any).createdAt
            ? new Date((product as any).createdAt).toLocaleDateString("fa-IR")
            : 'ابتدای دوره',
          time: '۰۰:۰۰',
          warehouseId: defaultWhId,
          warehouseName: defaultWhName,
          documentType: 'initial_stock',
          documentNumber: product.code ? `INIT-${product.code}` : 'موجودی اولیه',
          personName: 'سیستم (موجودی اولیه)',
          description: 'موجودی اولیه ثبت‌شده در تعریف کالا',
          type: initialStockQty >= 0 ? 'in' : 'out',
          quantity: Math.abs(initialStockQty),
          originalQuantity: Math.abs(initialStockQty),
          unitPrice: Number(product.purchasePrice || 0),
          originalUnitPrice: Number(product.purchasePrice || 0),
          totalPrice: Math.abs(initialStockQty) * Number(product.purchasePrice || 0),
          isSecondaryUnit: false,
          selectedUnit: product.unit || 'عدد'
        });
      }

      // B. Process server history items
      if (serverHistory && serverHistory.length > 0) {
        serverHistory.forEach((h: any) => {
          if (h.documentType === 'initial_stock' && transactionMap.has(`init_${prodId}`)) {
            return;
          }
          const isInput = h.type === 'in';
          const qty = Number(h.quantity) || 0;
          const whId = (h.warehouseId || defaultWhId).toString();
          const whName = warehouses.find(w => w.id?.toString() === whId)?.name || 'انبار اصلی';
          const docType = h.documentType || (isInput ? 'warehouse_receipt' : 'warehouse_remittance');
          const docNum = h.documentNumber || h.invoiceNumber || '---';
          const key = `hist_${h.id || `${docType}_${docNum}_${h.timestamp}`}`;

          const isSec = Boolean(h.isSecondaryUnit);
          const origQty = h.originalQuantity !== undefined ? Number(h.originalQuantity) : qty;
          const origPrice = h.originalUnitPrice !== undefined ? Number(h.originalUnitPrice) : Number(h.unitPrice || 0);

          transactionMap.set(key, {
            id: key,
            timestamp: Number(h.timestamp) || Date.now(),
            date: h.date || (h.timestamp ? new Date(h.timestamp).toLocaleDateString('fa-IR') : '---'),
            time: h.time || '',
            warehouseId: whId,
            warehouseName: whName,
            documentType: docType,
            documentNumber: docNum,
            documentId: h.documentId,
            personName: h.personName || persons.find(p => p.id?.toString() === h.personId?.toString())?.name || '---',
            description: h.description || (isInput ? 'ورود به انبار' : 'خروج از انبار'),
            type: isInput ? 'in' : 'out',
            quantity: qty,
            originalQuantity: origQty,
            unitPrice: Number(h.unitPrice || 0),
            originalUnitPrice: origPrice,
            totalPrice: Number(h.totalPrice || (qty * Number(h.unitPrice || 0))),
            isSecondaryUnit: isSec,
            selectedUnit: h.selectedUnit || (isSec ? product.secondaryUnit : product.unit)
          });
        });
      }

      // C. Cross-check invoices/warehouse documents to ensure no receipt or remittance was missed
      invoices.forEach((inv: any) => {
        if (inv.status === 'voided' || inv.isDeleted || inv.status === 'draft' || inv.isDraft) return;
        if (!inv.items || !Array.isArray(inv.items)) return;

        const matchingItems = inv.items.filter((i: any) => i.productId?.toString() === prodId.toString());
        if (matchingItems.length === 0) return;

        matchingItems.forEach((item: any, itemIdx: number) => {
          const docType = inv.type;
          const isReceipt = docType === 'warehouse_receipt' || docType === 'sales_return';
          const isRemittance = docType === 'warehouse_remittance' || docType === 'purchase_return' || docType === 'waste';

          // If document is not a warehouse movement, skip
          if (!isReceipt && !isRemittance) return;

          const docNum = inv.invoiceNumber || inv.documentNumber || inv.number || '---';
          const docKeyCheck = `${docType}_${docNum}`;

          // Check if already captured via server history
          let alreadyExists = false;
          for (const val of transactionMap.values()) {
            if (val.documentNumber === docNum && val.documentType === docType) {
              alreadyExists = true;
              break;
            }
          }

          if (alreadyExists) return;

          const dir = product.unitRatioDirection || getUnitRatioDirection(product);
          const isSec = Boolean(item.isSecondaryUnit);
          const ratio = Number(item.unitRatio || product.unitRatio || 1);
          const rawQuantity = Number(item.quantity) || 0;
          const rawUnitPrice = Number(item.unitPrice || item.price || 0);

          const q = item.baseQuantity !== undefined && item.baseQuantity !== null && !isNaN(Number(item.baseQuantity))
            ? Number(item.baseQuantity)
            : convertQuantityToBaseUnit(rawQuantity, isSec, ratio, dir);

          const uPrice = item.baseUnitPrice !== undefined && item.baseUnitPrice !== null && !isNaN(Number(item.baseUnitPrice))
            ? Number(item.baseUnitPrice)
            : convertPriceToBaseUnit(rawUnitPrice, isSec, ratio, dir);

          const whId = (item.warehouseId || inv.warehouseId || defaultWhId).toString();
          const whName = warehouses.find(w => w.id?.toString() === whId)?.name || 'انبار اصلی';

          const docTs = inv.createdAt ? new Date(inv.createdAt).getTime() : (inv.timestamp || Date.now());
          const docDate = inv.jalaliDate || (inv.date ? inv.date : new Date(docTs).toLocaleDateString('fa-IR'));
          const counterpartyName = persons.find(p => p.id?.toString() === (inv.customerId || inv.personId)?.toString())?.name
            || inv.customerName || inv.personName || '---';

          const key = `inv_${inv.id || docNum}_${itemIdx}`;
          transactionMap.set(key, {
            id: key,
            timestamp: docTs,
            date: docDate,
            time: inv.time || '',
            warehouseId: whId,
            warehouseName: whName,
            documentType: docType,
            documentNumber: docNum,
            documentId: inv.id,
            personName: counterpartyName,
            description: inv.description || (isReceipt ? `رسید انبار شماره ${docNum}` : `حواله انبار شماره ${docNum}`),
            type: isReceipt ? 'in' : 'out',
            quantity: q,
            originalQuantity: rawQuantity,
            unitPrice: uPrice,
            originalUnitPrice: rawUnitPrice,
            totalPrice: Number(item.totalPrice) > 0 ? Number(item.totalPrice) : q * uPrice,
            isSecondaryUnit: isSec,
            selectedUnit: item.selectedUnit || (isSec ? product.secondaryUnit : product.unit)
          });
        });
      });

      const list = Array.from(transactionMap.values());
      // Sort strictly ascending by timestamp
      list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setAllRawTransactions(list);
    } catch (err) {
      console.error('Error loading product kardex transactions:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRecalculate = async () => {
    setIsRefreshing(true);
    try {
      await recalculateAllWarehouseStocks();
      const invs = await getInvoices();
      setInvoices(invs);
      if (selectedProductId) {
        await loadProductKardexData(selectedProductId);
      }
    } catch (err) {
      console.error('Recalculate failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id?.toString() === selectedProductId?.toString());
  }, [products, selectedProductId]);

  // Filtered and Chronologically calculated Ledger
  const { ledgerRows, openingBalance, periodInTotal, periodOutTotal, periodClosingBalance, totalValuation } = useMemo(() => {
    if (!selectedProduct || allRawTransactions.length === 0) {
      return {
        ledgerRows: [],
        openingBalance: 0,
        periodInTotal: 0,
        periodOutTotal: 0,
        periodClosingBalance: 0,
        totalValuation: 0
      };
    }

    // 1. Warehouse filter
    let filteredByWarehouse = allRawTransactions;
    if (selectedWarehouseId !== 'all') {
      filteredByWarehouse = allRawTransactions.filter(t => t.warehouseId.toString() === selectedWarehouseId.toString());
    }

    // 2. Date ranges
    const startMs = startDate ? new Date(startDate.setHours(0, 0, 0, 0)).getTime() : null;
    const endMs = endDate ? new Date(endDate.setHours(23, 59, 59, 999)).getTime() : null;

    let opBal = 0;
    const inPeriodTransactions: KardexTransaction[] = [];

    filteredByWarehouse.forEach(t => {
      const ts = t.timestamp || 0;
      if (startMs && ts < startMs) {
        if (t.type === 'in') opBal += t.quantity;
        else opBal -= t.quantity;
      } else if (!endMs || ts <= endMs) {
        inPeriodTransactions.push(t);
      }
    });

    // 3. Document Type and Search Filters
    let displayList = inPeriodTransactions;
    if (selectedDocType === 'in') {
      displayList = displayList.filter(t => t.type === 'in');
    } else if (selectedDocType === 'out') {
      displayList = displayList.filter(t => t.type === 'out');
    }

    if (tableSearch.trim()) {
      const q = tableSearch.trim().toLowerCase();
      displayList = displayList.filter(t =>
        t.documentNumber?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.personName?.toLowerCase().includes(q) ||
        t.warehouseName?.toLowerCase().includes(q)
      );
    }

    // 4. Calculate Real-Time Running Balance Row-by-Row
    let currentBalance = opBal;
    let periodIn = 0;
    let periodOut = 0;

    const rowsWithBalance = displayList.map((t, index) => {
      const isInput = t.type === 'in';
      const balBefore = currentBalance;
      if (isInput) {
        currentBalance += t.quantity;
        periodIn += t.quantity;
      } else {
        currentBalance -= t.quantity;
        periodOut += t.quantity;
      }
      const balAfter = currentBalance;

      return {
        ...t,
        rowNumber: index + 1,
        balanceBefore: balBefore,
        balanceAfter: balAfter
      };
    });

    const finalBal = opBal + periodIn - periodOut;
    const unitPriceForValuation = Number(selectedProduct.purchasePrice || selectedProduct.price || 0);
    const valuation = Math.max(0, finalBal) * unitPriceForValuation;

    return {
      ledgerRows: rowsWithBalance,
      openingBalance: opBal,
      periodInTotal: periodIn,
      periodOutTotal: periodOut,
      periodClosingBalance: finalBal,
      totalValuation: valuation
    };
  }, [allRawTransactions, selectedProduct, selectedWarehouseId, startDate, endDate, selectedDocType, tableSearch]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!selectedProduct || ledgerRows.length === 0) return;

    const headers = [
      'ردیف',
      'تاریخ',
      'زمان',
      'نوع سند',
      'شماره سند',
      'انبار',
      'طرف حساب',
      'شرح',
      `وارده (${selectedProduct.unit || 'واحد'})`,
      `صادره (${selectedProduct.unit || 'واحد'})`,
      `مانده لحظه‌ای (${selectedProduct.unit || 'واحد'})`,
      'فی واحد (تومان)',
      'مبلغ کل (تومان)'
    ];

    const rows = ledgerRows.map(r => [
      r.rowNumber,
      `"${r.date}"`,
      `"${r.time || ''}"`,
      `"${getDocumentTypeLabel(r.documentType)}"`,
      `"${r.documentNumber}"`,
      `"${r.warehouseName}"`,
      `"${r.personName || '-'}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.type === 'in' ? r.quantity : 0,
      r.type === 'out' ? r.quantity : 0,
      r.balanceAfter,
      r.unitPrice,
      r.totalPrice
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kardex_${selectedProduct.code || selectedProduct.name}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Kardex Report
  const handlePrint = () => {
    window.print();
  };

  const getDocumentTypeLabel = (docType: string) => {
    switch (docType) {
      case 'warehouse_receipt': return 'رسید انبار';
      case 'warehouse_remittance': return 'حواله انبار';
      case 'initial_stock': return 'موجودی اول دوره';
      case 'sales_return': return 'برگشت از فروش (رسید)';
      case 'purchase_return': return 'برگشت از خرید (حواله)';
      case 'waste': return 'ضایعات انبار';
      case 'purchase': return 'فاکتور خرید';
      case 'sale': return 'فاکتور فروش';
      default: return docType || 'تراکنش انبار';
    }
  };

  const getDocumentTypeBadge = (docType: string, type: 'in' | 'out') => {
    const isInput = type === 'in';
    const label = getDocumentTypeLabel(docType);

    if (docType === 'initial_stock') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          {label}
        </span>
      );
    }

    if (isInput) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ArrowDownToLine className="w-3 h-3" />
          {label}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <ArrowUpFromLine className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.trim().toLowerCase();
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* Top Header - Hidden in Print */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <FileText className="w-5 h-5" />
            </div>
            کاردکس کالا (گردش دقیق موجودی و اسناد انبار)
          </h1>
          <p className="text-xs text-slate-500 mt-1 mr-13">
            ردیابی دقیق و گام‌به‌گام رسیدها، حواله‌ها و محاسبه بلادرنگ موجودی لحظه‌ای کالا
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRecalculate}
            disabled={!selectedProductId || isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold shadow-sm text-xs disabled:opacity-50 cursor-pointer"
            title="بازسازی و همگام‌سازی مانده‌های کاردکس از دیتابیس"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            همگام‌سازی کاردکس
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!selectedProduct || ledgerRows.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all font-bold shadow-sm text-xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            خروجی اکسل (CSV)
          </button>

          <button
            onClick={handlePrint}
            disabled={!selectedProduct || ledgerRows.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all font-bold shadow-md shadow-indigo-100 text-xs disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            چاپ کاردکس
          </button>
        </div>
      </div>

      {/* Official Print Header - Visible ONLY in Print */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">{settings?.storeName || settings?.companyName || 'گزارش رسمی کاردکس انبار'}</h2>
            <p className="text-xs text-slate-600 font-bold mt-1">کاردکس گردش مقداری و ریالی کالا</p>
          </div>
          <div className="text-left text-xs font-mono space-y-1">
            <div>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</div>
            <div>انبار: {selectedWarehouseId === 'all' ? 'تمام انبارها' : (warehouses.find(w => w.id?.toString() === selectedWarehouseId)?.name || 'انبار')}</div>
          </div>
        </div>
        {selectedProduct && (
          <div className="grid grid-cols-4 gap-2 mt-3 pt-2 border-t border-slate-200 text-xs">
            <div><strong>کالا:</strong> {selectedProduct.name}</div>
            <div><strong>کد کالا:</strong> {selectedProduct.code || '-'}</div>
            <div><strong>واحد اصلی:</strong> {selectedProduct.unit || 'عدد'}</div>
            <div><strong>واحد فرعی:</strong> {selectedProduct.secondaryUnit || '-'}</div>
          </div>
        )}
      </div>

      {/* Control Bar: Filters & Product Selector - Hidden in Print */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Product Picker */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-black text-slate-700 flex items-center justify-between">
              <span>انتخاب کالا (الزامی)</span>
              <span className="text-[10px] text-indigo-600 font-normal">تعداد کالاها: {products.length}</span>
            </label>
            <div className="space-y-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجوی سریع نام یا کد کالا..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white pr-9 pl-3 py-2 outline-none"
                />
              </div>
              <select
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white p-2.5 outline-none font-bold"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">-- لطفاً یک کالا انتخاب کنید --</option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `[کد: ${p.code}]` : ''} ({p.unit || 'عدد'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Warehouse Picker */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-600">انبار هدف</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white p-2.5 outline-none font-medium"
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
            >
              <option value="all">همه انبارها (تجمیعی)</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Document Type Filter */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-600">نوع تراکنش</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white p-2.5 outline-none font-medium"
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
            >
              <option value="all">همه اسناد (ورود و خروج)</option>
              <option value="in">فقط وارده‌ها (رسید انبار)</option>
              <option value="out">فقط صادره‌ها (حواله انبار)</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-600">از تاریخ</label>
            <DatePicker
              calendar={persian}
              locale={persian_fa}
              value={startDate}
              onChange={(d: any) => setStartDate(d?.toDate() || null)}
              format="YYYY/MM/DD"
              inputClass="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white p-2.5 outline-none font-mono text-center"
              placeholder="ابتدای دوره"
            />
          </div>

          {/* End Date */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-600">تا تاریخ</label>
            <DatePicker
              calendar={persian}
              locale={persian_fa}
              value={endDate}
              onChange={(d: any) => setEndDate(d?.toDate() || null)}
              format="YYYY/MM/DD"
              inputClass="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white p-2.5 outline-none font-mono text-center"
              placeholder="امروز (پایان دوره)"
            />
          </div>
        </div>

        {/* Sub-bar with instant in-table search and reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-100 gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="فیلتر در شماره سند، طرف حساب یا شرح..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg pr-9 pl-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {(startDate || endDate || selectedWarehouseId !== 'all' || selectedDocType !== 'all' || tableSearch) && (
              <button
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                  setSelectedWarehouseId('all');
                  setSelectedDocType('all');
                  setTableSearch('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                پاک کردن فیلترها
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Summary Card (Visible in UI and Print) */}
      {selectedProduct && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-md">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block">نام کالا</span>
              <span className="text-sm font-black text-white">{selectedProduct.name}</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block">کد کالا / بارکد</span>
              <span className="text-xs font-mono font-bold text-indigo-200">
                {selectedProduct.code || '-'} {selectedProduct.barcode ? `| ${selectedProduct.barcode}` : ''}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block">واحدهای سنجش</span>
              <span className="text-xs font-bold text-emerald-300">
                {selectedProduct.unit || 'عدد'}
                {selectedProduct.secondaryUnit && (
                  <span className="text-[11px] text-slate-300 font-normal mr-1">
                    (فرعی: {selectedProduct.secondaryUnit})
                  </span>
                )}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block">ضریب تبدیل واحد</span>
              <span className="text-xs font-mono font-bold text-amber-300" dir="ltr">
                {selectedProduct.secondaryUnit && selectedProduct.unitRatio
                  ? formatUnitConversionFormula(
                      selectedProduct.unit || 'عدد',
                      selectedProduct.secondaryUnit,
                      selectedProduct.unitRatio,
                      selectedProduct.unitRatioDirection || getUnitRatioDirection(selectedProduct)
                    )
                  : 'یکپارچه'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block">نقطه سفارش (حداقل)</span>
              <span className="text-xs font-mono font-bold text-rose-300">
                {selectedProduct.minStockLevel !== undefined ? formatNum(selectedProduct.minStockLevel) : '-'} {selectedProduct.unit || 'عدد'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block">آخرین نرخ خرید واحد اصلی</span>
              <span className="text-xs font-mono font-bold text-indigo-200" dir="ltr">
                {selectedProduct.purchasePrice ? `${formatCur(selectedProduct.purchasePrice)} تومان` : '---'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Metrics Summary Cards */}
      {selectedProduct && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Opening Stock */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">
              موجودی ابتدای دوره
              {startDate && <span className="text-[10px] text-indigo-600 font-mono mr-1">(انتقالی)</span>}
            </span>
            <div className="flex items-baseline gap-1" dir="ltr">
              <span className={`text-lg font-mono font-black ${openingBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {formatNum(openingBalance)}
              </span>
              <span className="text-[11px] text-slate-400 font-sans">{selectedProduct.unit || 'عدد'}</span>
            </div>
          </div>

          {/* Period Receipts (In) */}
          <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-emerald-800 block mb-1 flex items-center gap-1">
              <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
              جمع وارده در دوره
            </span>
            <div className="flex items-baseline gap-1 text-emerald-700" dir="ltr">
              <span className="text-lg font-mono font-black">+{formatNum(periodInTotal)}</span>
              <span className="text-[11px] font-sans">{selectedProduct.unit || 'عدد'}</span>
            </div>
          </div>

          {/* Period Remittances (Out) */}
          <div className="bg-rose-50/50 border border-rose-200 p-3.5 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-rose-800 block mb-1 flex items-center gap-1">
              <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-600" />
              جمع صادره در دوره
            </span>
            <div className="flex items-baseline gap-1 text-rose-700" dir="ltr">
              <span className="text-lg font-mono font-black">-{formatNum(periodOutTotal)}</span>
              <span className="text-[11px] font-sans">{selectedProduct.unit || 'عدد'}</span>
            </div>
          </div>

          {/* Real-time Closing Stock (authoritative running balance) */}
          <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-2xl shadow-xs">
            <span className="text-[11px] font-bold text-indigo-900 block mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              موجودی لحظه‌ای (پایان دوره)
            </span>
            <div className="flex items-baseline gap-1" dir="ltr">
              <span className={`text-xl font-mono font-black ${periodClosingBalance < 0 ? 'text-rose-600' : 'text-indigo-950'}`}>
                {formatNum(periodClosingBalance)}
              </span>
              <span className="text-[11px] font-sans text-indigo-600 font-bold">{selectedProduct.unit || 'عدد'}</span>
            </div>
          </div>

          {/* Valuation */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl shadow-xs col-span-2 sm:col-span-4 lg:col-span-1">
            <span className="text-[11px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              ارزش ریالی مانده انبار
            </span>
            <div className="flex items-baseline gap-1 text-slate-900" dir="ltr">
              <span className="text-base font-mono font-black">{formatCur(totalValuation)}</span>
              <span className="text-[10px] text-slate-500 font-sans">تومان</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Kardex Ledger Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-xs font-bold text-slate-500">در حال بارگذاری اطلاعات پایه...</p>
          </div>
        ) : !selectedProductId ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Package className="w-12 h-12 text-slate-200" />
            <p className="font-bold text-sm">لطفاً ابتدا یک کالا را برای مشاهده کاردکس انتخاب کنید</p>
          </div>
        ) : isRefreshing ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-xs font-bold text-slate-500">در حال استخراج و محاسبه خط‌به‌خط گردش موجودی کاردکس...</p>
          </div>
        ) : ledgerRows.length === 0 && openingBalance === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
            <AlertTriangle className="w-12 h-12 text-amber-300" />
            <p className="font-bold text-sm text-slate-600">هیچ تراکنش یا گردش انباری برای این کالا با فیلترهای انتخابی یافت نشد.</p>
            <p className="text-xs text-slate-400">می‌توانید فیلتر انبار یا تاریخ را تغییر دهید یا دکمه همگام‌سازی را بزنید.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-black">
                <tr>
                  <th className="px-3 py-3 text-center whitespace-nowrap w-12">ردیف</th>
                  <th className="px-3 py-3 whitespace-nowrap">تاریخ و زمان</th>
                  <th className="px-3 py-3 whitespace-nowrap">نوع سند</th>
                  <th className="px-3 py-3 whitespace-nowrap">شماره سند</th>
                  <th className="px-3 py-3 whitespace-nowrap">انبار</th>
                  <th className="px-3 py-3 whitespace-nowrap">طرف حساب</th>
                  <th className="px-4 py-3 min-w-[180px]">شرح تراکنش</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap bg-emerald-50/50 text-emerald-800">
                    وارده (+)
                    <div className="text-[10px] font-normal text-slate-400">({selectedProduct?.unit || 'واحد'})</div>
                  </th>
                  <th className="px-3 py-3 text-center whitespace-nowrap bg-rose-50/50 text-rose-800">
                    صادره (-)
                    <div className="text-[10px] font-normal text-slate-400">({selectedProduct?.unit || 'واحد'})</div>
                  </th>
                  <th className="px-4 py-3 text-center whitespace-nowrap bg-indigo-100/70 text-indigo-950 font-black border-x border-indigo-200">
                    موجودی لحظه‌ای (مانده)
                    <div className="text-[10px] font-normal text-indigo-700">({selectedProduct?.unit || 'واحد'})</div>
                  </th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">فی واحد اصلی</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">مبلغ کل (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {/* Opening Balance Row if date filter or previous transactions exist */}
                {startDate && (
                  <tr className="bg-amber-50/40 font-bold border-b border-amber-200">
                    <td className="px-3 py-2.5 text-center text-amber-800 font-mono text-[11px]">-</td>
                    <td className="px-3 py-2.5 text-amber-800 font-mono text-[11px]" dir="ltr">
                      قبل از {startDate.toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-300">
                        مانده انتقالی
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-500">-</td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {selectedWarehouseId === 'all' ? 'تمام انبارها' : (warehouses.find(w => w.id?.toString() === selectedWarehouseId)?.name || 'انبار')}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">-</td>
                    <td className="px-4 py-2.5 text-amber-900 font-bold">
                      مانده منقول از دوره قبل (موجودی ابتدای بازه گزارش)
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-slate-400">-</td>
                    <td className="px-3 py-2.5 text-center font-mono text-slate-400">-</td>
                    <td className="px-4 py-2.5 text-center font-mono font-black text-sm bg-indigo-50/80 text-indigo-950 border-x border-indigo-200" dir="ltr">
                      {formatNum(openingBalance)}
                    </td>
                    <td className="px-3 py-2.5 text-left font-mono text-slate-400">-</td>
                    <td className="px-3 py-2.5 text-left font-mono text-slate-400">-</td>
                  </tr>
                )}

                {/* Detailed Transactions */}
                {ledgerRows.map((row) => {
                  const isInput = row.type === 'in';
                  return (
                    <tr key={row.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-3 py-3 text-center text-slate-400 font-mono text-xs">{row.rowNumber}</td>
                      <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap" dir="ltr">
                        <div>{row.date}</div>
                        {row.time && <div className="text-[10px] text-slate-400">{row.time}</div>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {getDocumentTypeBadge(row.documentType, row.type)}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {row.documentNumber || '-'}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-700 whitespace-nowrap">
                        {row.warehouseName}
                      </td>
                      <td className="px-3 py-3 text-slate-800 font-medium truncate max-w-[130px]" title={row.personName}>
                        {row.personName || '---'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[11px] max-w-[240px] truncate" title={row.description}>
                        {row.description || '---'}
                      </td>

                      {/* Inbound Quantity */}
                      <td className="px-3 py-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20" dir="ltr">
                        {isInput ? (
                          <div>
                            <div className="font-black text-sm">+{formatNum(row.quantity)}</div>
                            {row.isSecondaryUnit && row.originalQuantity && (
                              <div className="text-[10px] text-indigo-600 font-sans font-normal" dir="rtl">
                                معادل {formatNum(row.originalQuantity)} {row.selectedUnit || selectedProduct?.secondaryUnit}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </td>

                      {/* Outbound Quantity */}
                      <td className="px-3 py-3 text-center font-mono font-bold text-rose-700 bg-rose-50/20" dir="ltr">
                        {!isInput ? (
                          <div>
                            <div className="font-black text-sm">-{formatNum(row.quantity)}</div>
                            {row.isSecondaryUnit && row.originalQuantity && (
                              <div className="text-[10px] text-indigo-600 font-sans font-normal" dir="rtl">
                                معادل {formatNum(row.originalQuantity)} {row.selectedUnit || selectedProduct?.secondaryUnit}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </td>

                      {/* Autoritative Real-Time Running Balance */}
                      <td className="px-4 py-3 text-center font-mono font-black text-sm bg-indigo-50/90 text-indigo-950 border-x border-indigo-200" dir="ltr">
                        <span className={row.balanceAfter < 0 ? 'text-rose-600' : 'text-indigo-950'}>
                          {formatNum(row.balanceAfter)}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-3 text-left font-mono text-slate-700 whitespace-nowrap" dir="ltr">
                        {row.unitPrice ? (
                          <div>
                            <div className="font-bold">{formatCur(row.unitPrice)}</div>
                            {row.isSecondaryUnit && row.originalUnitPrice && (
                              <div className="text-[10px] text-indigo-600 font-sans" dir="rtl">
                                {formatCur(row.originalUnitPrice)} ({row.selectedUnit || selectedProduct?.secondaryUnit})
                              </div>
                            )}
                          </div>
                        ) : '---'}
                      </td>

                      {/* Total Price */}
                      <td className="px-3 py-3 text-left font-mono font-black text-slate-800 whitespace-nowrap" dir="ltr">
                        {row.totalPrice ? formatCur(row.totalPrice) : '---'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer: Totals */}
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-800">
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-left text-xs font-bold text-slate-600">
                    جمع کل گردش دوره:
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-black text-emerald-800 bg-emerald-100/60" dir="ltr">
                    +{formatNum(periodInTotal)}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-black text-rose-800 bg-rose-100/60" dir="ltr">
                    -{formatNum(periodOutTotal)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-black text-base bg-indigo-200/70 text-indigo-950 border-x border-indigo-300" dir="ltr">
                    {formatNum(periodClosingBalance)}
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-left font-mono font-black text-slate-900" dir="ltr">
                    ارزش کل: {formatCur(totalValuation)} تومان
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Official Signatures Section - Visible ONLY in Print */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-8 mt-6 border-t border-slate-300 text-center text-xs">
        <div className="space-y-12">
          <span className="font-bold text-slate-700">امضای انباردار / تحویل‌دهنده:</span>
          <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
        </div>
        <div className="space-y-12">
          <span className="font-bold text-slate-700">امضای حسابدار / کارشناس مالی:</span>
          <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
        </div>
        <div className="space-y-12">
          <span className="font-bold text-slate-700">امضای مدیر امور مالی / مدیریت:</span>
          <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
