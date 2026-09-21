import React, { useState, useEffect, useMemo } from "react";
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
  Info,
  FileCheck2,
  PlusCircle,
  Sparkles
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
  recalculateAllWarehouseStocks,
  getProductCategories
} from "../../services/dataService";
import { Product, Warehouse } from "../../types";
import CustomDatePicker from "../ui/CustomDatePicker";
import {
  convertQuantityToBaseUnit,
  convertPriceToBaseUnit,
  getUnitRatioDirection,
  formatUnitConversionFormula
} from "../../utils/unitConversion";
import { toPersianDigits, addCommas } from "../../utils/format";
import { calculateAllWarehouseStocks } from "../../utils/stockLogic";
import { compareKardexTransactions, parseDocDateToTimestamp } from "../../utils/kardexSort";
import AdvancedProductSearchSelect from "../kardex/AdvancedProductSearchSelect";
import InitialStockModal from "../kardex/InitialStockModal";

const DatePicker = CustomDatePicker;

// Persian digit and number formatters
const formatNumFa = (num: number | string | null | undefined, maxDecimals = 3) => {
  if (num === null || num === undefined || num === '') return '۰';
  const n = Number(num);
  if (isNaN(n)) return '۰';
  if (Number.isInteger(n)) {
    return toPersianDigits(addCommas(n));
  }
  const str = n.toFixed(maxDecimals);
  const trimmed = parseFloat(str).toString();
  const [intP, decP] = trimmed.split('.');
  return toPersianDigits(`${addCommas(intP)}${decP ? '.' + decP : ''}`);
};

const formatCurFa = (num: number | string | null | undefined) => {
  if (num === null || num === undefined || num === '') return '۰';
  const n = Number(num);
  if (isNaN(n)) return '۰';
  return toPersianDigits(addCommas(Math.round(n)));
};

const formatDigits = (val: string | number | null | undefined) => {
  if (val === null || val === undefined) return '';
  return toPersianDigits(String(val));
};

interface KardexTransaction {
  id: string;
  timestamp: number;
  date: string;
  time?: string;
  createdAt?: string | number;
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
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [selectedDocType, setSelectedDocType] = useState<string>('all'); // all, in, out
  const [tableSearch, setTableSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Initial Stock Document Modal
  const [isInitialStockModalOpen, setIsInitialStockModalOpen] = useState(false);

  const [allRawTransactions, setAllRawTransactions] = useState<KardexTransaction[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [prods, whs, invs, pers, sett, cats] = await Promise.all([
        getProducts(),
        getWarehouses(),
        getInvoices(),
        getPersons(),
        getStoreSettings(),
        getProductCategories().catch(() => [])
      ]);
      const physicalProds = prods.filter(p => p.type !== 'service');
      setProducts(physicalProds);
      setWarehouses(whs || []);
      setInvoices(invs || []);
      setPersons(pers || []);
      setSettings(sett || {});
      setCategories(cats || []);

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
      // Re-fetch products to ensure we have the latest stock & initial stock doc details
      const latestProds = await getProducts();
      const product = latestProds.find(p => p.id?.toString() === prodId.toString());
      if (!product) {
        setAllRawTransactions([]);
        return;
      }
      setProducts(latestProds.filter(p => p.type !== 'service'));

      const defaultWhId = ((product as any).initialStockWarehouseId || product.warehouseId || (warehouses[0]?.id) || 'unknown').toString();
      const defaultWhName = warehouses.find(w => w.id?.toString() === defaultWhId)?.name || 'انبار اصلی';

      // 1. Fetch server kardex transactions
      let serverHistory: any[] = [];
      try {
        serverHistory = await getProductInventoryHistory(prodId);
      } catch (e) {
        console.warn('Could not fetch server kardex history, falling back to invoices', e);
      }

      const transactionMap = new Map<string, KardexTransaction>();

      // A. Initial Stock from product definition (Registered Initial Stock Document)
      const initialStockQty = Number(product.stock) || 0;
      const initialDocNum = (product as any).initialStockDocNumber || (product.code ? `OPN-${product.code}` : 'سند افتتاحیه');
      const initialDocDate = (product as any).initialStockJalaliDate ||
        ((product as any).initialStockDate
          ? new Date((product as any).initialStockDate).toLocaleDateString("fa-IR")
          : ((product as any).createdAt ? new Date((product as any).createdAt).toLocaleDateString("fa-IR") : 'ابتدای دوره'));
      const initialDocDesc = (product as any).initialStockDescription || 'سند موجودی اول دوره و افتتاحیه انبار';
      const initialUnitPrice = Number((product as any).initialStockUnitPrice || product.purchasePrice || (product as any).buyPrice || product.price || 0);

      if (initialStockQty !== 0 || (product as any).initialStockRegistered) {
        const initTs = (product as any).initialStockTimestamp || ((product as any).createdAt ? new Date((product as any).createdAt).getTime() : 1);
        const initKey = `init_${prodId}`;
        transactionMap.set(initKey, {
          id: initKey,
          timestamp: initTs,
          date: initialDocDate,
          time: '۰۰:۰۰',
          warehouseId: defaultWhId,
          warehouseName: defaultWhName,
          documentType: 'initial_stock',
          documentNumber: initialDocNum,
          personName: 'سیستم (سند افتتاحیه انبار)',
          description: initialDocDesc,
          type: initialStockQty >= 0 ? 'in' : 'out',
          quantity: Math.abs(initialStockQty),
          originalQuantity: Math.abs(initialStockQty),
          unitPrice: initialUnitPrice,
          originalUnitPrice: initialUnitPrice,
          totalPrice: Math.abs(initialStockQty) * initialUnitPrice,
          isSecondaryUnit: false,
          selectedUnit: product.unit || 'عدد'
        });
      }

      // B. Process server history items
      if (serverHistory && serverHistory.length > 0) {
        serverHistory.forEach((h: any) => {
          if (h.documentType === 'initial_stock') {
            // Already handled with custom registered details in A above
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

          const matchingInv = invoices.find(i => 
            (h.documentId && String(i.id) === String(h.documentId)) ||
            (docNum !== '---' && String(i.invoiceNumber || i.documentNumber) === String(docNum))
          );
          const hTime = h.time || matchingInv?.time || (h.createdAt ? new Date(h.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : (matchingInv?.createdAt ? new Date(matchingInv.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : ''));
          const hCreatedAt = h.createdAt || matchingInv?.createdAt;
          const computedTs = parseDocDateToTimestamp(h.date || matchingInv?.date || h.timestamp, hTime, hCreatedAt);

          transactionMap.set(key, {
            id: key,
            timestamp: computedTs,
            date: h.date || (computedTs ? new Date(computedTs).toLocaleDateString('fa-IR') : '---'),
            time: hTime,
            createdAt: hCreatedAt,
            warehouseId: whId,
            warehouseName: whName,
            documentType: docType,
            documentNumber: docNum,
            documentId: h.documentId || matchingInv?.id,
            personName: h.personName || persons.find(p => p.id?.toString() === h.personId?.toString())?.name || matchingInv?.customerName || matchingInv?.personName || '---',
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

      // C. Cross-check invoices/warehouse documents
      invoices.forEach((inv: any) => {
        if (inv.status === 'voided' || inv.isDeleted || inv.status === 'draft' || inv.isDraft) return;
        if (!inv.items || !Array.isArray(inv.items)) return;

        const matchingItems = inv.items.filter((i: any) => i.productId?.toString() === prodId.toString());
        if (matchingItems.length === 0) return;

        matchingItems.forEach((item: any, itemIdx: number) => {
          const docType = inv.type;
          const isReceipt = docType === 'warehouse_receipt' || docType === 'sales_return';
          const isRemittance = docType === 'warehouse_remittance' || docType === 'purchase_return' || docType === 'waste';

          if (!isReceipt && !isRemittance) return;

          const docNum = inv.invoiceNumber || inv.documentNumber || inv.number || '---';
          const docKeyCheck = `${docType}_${docNum}`;

          const alreadyInMap = Array.from(transactionMap.values()).some(
            t => t.documentNumber === docNum && (t.documentType === docType || t.documentId === inv.id)
          );

          if (alreadyInMap) return;

          const isSecUnit = Boolean(item.isSecondaryUnit) || (Boolean(product.secondaryUnit) && item.selectedUnit === product.secondaryUnit);
          const ratio = Number(item.unitRatio || product.unitRatio || 1);
          const dir = item.unitRatioDirection || product.unitRatioDirection || getUnitRatioDirection(product);
          const rawQty = Number(item.quantity) || 0;
          const rawPrice = Number(item.unitPrice || item.price || 0);

          let baseQty = isSecUnit && ratio > 0
            ? convertQuantityToBaseUnit(rawQty, true, ratio, dir)
            : (item.baseQuantity !== undefined && item.baseQuantity !== null && !isNaN(Number(item.baseQuantity)) && Number(item.baseQuantity) > 0
                ? Number(item.baseQuantity)
                : rawQty);

          let baseUnitPrice = isSecUnit && ratio > 0
            ? convertPriceToBaseUnit(rawPrice, true, ratio, dir)
            : (item.baseUnitPrice !== undefined && item.baseUnitPrice !== null && !isNaN(Number(item.baseUnitPrice)) && Number(item.baseUnitPrice) > 0
                ? Number(item.baseUnitPrice)
                : rawPrice);

          const whId = (item.warehouseId || inv.warehouseId || defaultWhId).toString();
          const whName = warehouses.find(w => w.id?.toString() === whId)?.name || 'انبار اصلی';
          const person = persons.find(p => p.id?.toString() === (inv.personId || inv.customerId || inv.supplierId)?.toString());
          const personName = person?.name || inv.personName || inv.customerName || inv.supplierName || '---';

          const invTime = inv.time || (inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '');
          const computedTs = parseDocDateToTimestamp(inv.date || inv.invoiceDate, invTime, inv.createdAt);
          let parsedDate = inv.date || inv.invoiceDate;
          if (parsedDate) {
            const d = new Date(parsedDate);
            if (!isNaN(d.getTime())) {
              parsedDate = d.toLocaleDateString('fa-IR');
            }
          } else if (computedTs) {
            parsedDate = new Date(computedTs).toLocaleDateString('fa-IR');
          }

          const uniqueKey = `inv_${inv.id || docNum}_${item.id || itemIdx}`;
          transactionMap.set(uniqueKey, {
            id: uniqueKey,
            timestamp: computedTs,
            date: parsedDate || '---',
            time: invTime,
            createdAt: inv.createdAt,
            warehouseId: whId,
            warehouseName: whName,
            documentType: docType,
            documentNumber: docNum,
            documentId: inv.id,
            personName: personName,
            description: item.description || inv.notes || (isReceipt ? 'رسید انبار' : 'حواله انبار'),
            type: isReceipt ? 'in' : 'out',
            quantity: baseQty,
            originalQuantity: Number(item.quantity) || 0,
            unitPrice: baseUnitPrice,
            originalUnitPrice: Number(item.unitPrice || item.price || 0),
            totalPrice: baseQty * baseUnitPrice,
            isSecondaryUnit: isSecUnit,
            selectedUnit: isSecUnit ? product.secondaryUnit : product.unit
          });
        });
      });

      // Convert map to array and sort chronologically with strict receipt-before-remittance ordering
      const sortedTransactions = Array.from(transactionMap.values()).sort(compareKardexTransactions);

      setAllRawTransactions(sortedTransactions);
    } catch (err) {
      console.error('Error loading product kardex transactions:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id?.toString() === selectedProductId?.toString()) || null;
  }, [products, selectedProductId]);

  // Recalculate Stocks on server
  const handleManualRecalculate = async () => {
    setIsRefreshing(true);
    try {
      await recalculateAllWarehouseStocks();
      if (selectedProductId) {
        await loadProductKardexData(selectedProductId);
      }
    } catch (e) {
      console.error('Recalculate error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

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
    const unitPriceForValuation = Number(selectedProduct.purchasePrice || (selectedProduct as any).buyPrice || selectedProduct.price || 0);
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

  const currentStockSummary = useMemo(() => {
    if (!selectedProduct) return null;
    const { productSummaryMap } = calculateAllWarehouseStocks({
      products: [selectedProduct],
      warehouses,
      allDocs: invoices,
    });
    return productSummaryMap[selectedProduct.id?.toString()] || null;
  }, [selectedProduct, warehouses, invoices]);

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
      formatDigits(r.rowNumber),
      `"${formatDigits(r.date)}"`,
      `"${formatDigits(r.time || '')}"`,
      `"${getDocumentTypeLabel(r.documentType)}"`,
      `"${formatDigits(r.documentNumber)}"`,
      `"${r.warehouseName}"`,
      `"${r.personName || '-'}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.type === 'in' ? formatNumFa(r.quantity) : 0,
      r.type === 'out' ? formatNumFa(r.quantity) : 0,
      formatNumFa(r.balanceAfter),
      formatCurFa(r.unitPrice),
      formatCurFa(r.totalPrice)
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

  const handlePrint = () => {
    window.print();
  };

  const getDocumentTypeLabel = (docType: string) => {
    switch (docType) {
      case 'warehouse_receipt': return 'رسید انبار';
      case 'warehouse_remittance': return 'حواله انبار';
      case 'initial_stock': return 'سند موجودی اول دوره';
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
          <FileCheck2 className="w-3.5 h-3.5 text-amber-700" />
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

  const hasInitialStockRegistered = Boolean(
    selectedProduct &&
    ((selectedProduct as any).initialStockRegistered || Number(selectedProduct.stock || 0) > 0)
  );

  return (
    <div className="space-y-6 print:space-y-4 print:p-0 font-sans" dir="rtl">
      {/* Top Header - Hidden in Print */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <FileText className="w-5 h-5" />
            </div>
            کاردکس کالا (گردش دقیق موجودی و اسناد انبار)
          </h1>
          <p className="text-xs text-slate-500 mt-1 mr-13 font-medium">
            ردیابی خط‌به‌خط اسناد رسید، حواله، ثبت سند افتتاحیه و مانده‌گیری بلادرنگ موجودی
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Register Initial Stock Document Button */}
          <button
            onClick={() => setIsInitialStockModalOpen(true)}
            disabled={!selectedProduct}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all font-black shadow-sm shadow-amber-200 text-xs disabled:opacity-50 cursor-pointer"
            title="ثبت یا ویرایش سند افتتاحیه و موجودی اول دوره کالا در انبار"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>
              {hasInitialStockRegistered ? "ویرایش سند موجودی اول دوره" : "ثبت سند موجودی اول دوره"}
            </span>
          </button>

          <button
            onClick={handleManualRecalculate}
            disabled={!selectedProductId || isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold shadow-2xs text-xs disabled:opacity-50 cursor-pointer"
            title="بازسازی و همگام‌سازی مانده‌های کاردکس از دیتابیس"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            همگام‌سازی کاردکس
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!selectedProduct || ledgerRows.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all font-bold shadow-2xs text-xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            خروجی اکسل (CSV)
          </button>

          <button
            onClick={handlePrint}
            disabled={!selectedProduct || ledgerRows.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all font-black shadow-md shadow-indigo-100 text-xs disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            چاپ کاردکس
          </button>
        </div>
      </div>

      {/* Official Print Header - Visible ONLY in Print */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-4 font-sans">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">{settings?.storeName || settings?.companyName || 'گزارش رسمی کاردکس انبار'}</h2>
            <p className="text-xs text-slate-600 font-bold mt-1">کاردکس گردش مقداری و ریالی کالا</p>
          </div>
          <div className="text-left text-xs space-y-1">
            <div>تاریخ چاپ: {formatDigits(new Date().toLocaleDateString('fa-IR'))}</div>
            <div>انبار: {selectedWarehouseId === 'all' ? 'تمام انبارها' : (warehouses.find(w => w.id?.toString() === selectedWarehouseId)?.name || 'انبار')}</div>
          </div>
        </div>
        {selectedProduct && (
          <div className="grid grid-cols-4 gap-2 mt-3 pt-2 border-t border-slate-200 text-xs font-medium">
            <div><strong>کالا:</strong> {selectedProduct.name}</div>
            <div><strong>کد کالا:</strong> {formatDigits(selectedProduct.code || '-')}</div>
            <div><strong>واحد اصلی:</strong> {selectedProduct.unit || 'عدد'}</div>
            <div><strong>واحد فرعی:</strong> {selectedProduct.secondaryUnit || '-'}</div>
          </div>
        )}
      </div>

      {/* Control Bar: Filters & Advanced Product Selector - Hidden in Print */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Advanced Product Picker */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-black text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                انتخاب و جستجوی پیشرفته کالا (الزامی)
              </span>
              <span className="text-[11px] text-indigo-600 font-bold">
                تعداد کل: {formatDigits(products.length)} کالا
              </span>
            </label>
            <AdvancedProductSearchSelect
              products={products}
              selectedProductId={selectedProductId}
              onSelectProduct={(id) => setSelectedProductId(id)}
              categories={categories}
            />
          </div>

          {/* Warehouse Picker */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              انبار هدف
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white p-2.5 outline-none font-bold"
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
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              نوع تراکنش
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white p-2.5 outline-none font-bold"
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
            >
              <option value="all">همه اسناد (ورود و خروج)</option>
              <option value="in">فقط وارده‌ها (رسید انبار)</option>
              <option value="out">فقط صادره‌ها (حواله انبار)</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="md:col-span-1.5 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              از تاریخ
            </label>
            <DatePicker
              calendar={persian}
              locale={persian_fa}
              value={startDate}
              onChange={(d: any) => setStartDate(d?.toDate() || null)}
              format="YYYY/MM/DD"
              inputClass="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white p-2.5 outline-none text-center font-bold"
              placeholder="ابتدای دوره"
            />
          </div>

          {/* End Date */}
          <div className="md:col-span-1.5 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              تا تاریخ
            </label>
            <DatePicker
              calendar={persian}
              locale={persian_fa}
              value={endDate}
              onChange={(d: any) => setEndDate(d?.toDate() || null)}
              format="YYYY/MM/DD"
              inputClass="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white p-2.5 outline-none text-center font-bold"
              placeholder="امروز (پایان دوره)"
            />
          </div>
        </div>

        {/* Sub-bar with instant in-table search and reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="فیلتر در شماره سند، طرف حساب یا شرح..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pr-9 pl-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
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
                className="text-xs text-rose-600 hover:text-rose-700 font-bold px-3 py-1.5 bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                پاک کردن فیلترها
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert Banner if Initial Stock Document is not registered yet */}
      {selectedProduct && !hasInitialStockRegistered && (
        <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-black">
                برای این کالا هنوز سند موجودی اول دوره (افتتاحیه انبار) ثبت نشده است
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                ثبت سند افتتاحیه باعث می‌شود نقطه شروع کاردکس، بهای تمام‌شده پایه و مانده افتتاحیه کالا به‌صورت دقیق مستند شود.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsInitialStockModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-sm transition-all shrink-0 cursor-pointer"
          >
            ثبت سند موجودی اول دوره
          </button>
        </div>
      )}

      {/* Product Summary Card (Visible in UI and Print) */}
      {selectedProduct && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 shadow-md">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block">نام کالا</span>
              <span className="text-sm font-black text-white">{selectedProduct.name}</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block">کد کالا / بارکد</span>
              <span className="text-xs font-bold text-indigo-200 accounting-num">
                {formatDigits(selectedProduct.code || '-')} {selectedProduct.barcode ? `| ${formatDigits(selectedProduct.barcode)}` : ''}
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
              <span className="text-xs font-bold text-amber-300 accounting-num">
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
              <span className="text-xs font-bold text-rose-300 accounting-num">
                {selectedProduct.minStockLevel !== undefined ? formatNumFa(selectedProduct.minStockLevel) : '-'} {selectedProduct.unit || 'عدد'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block">آخرین فی خرید واحد اصلی</span>
              <span className="text-xs font-bold text-indigo-200 accounting-num">
                {selectedProduct.purchasePrice ? `${formatCurFa(selectedProduct.purchasePrice)} تومان` : '---'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Metrics Summary Cards */}
      {selectedProduct && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Opening Stock */}
          <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">
              موجودی ابتدای دوره
              {startDate && <span className="text-[10px] text-indigo-600 font-bold mr-1">(انتقالی)</span>}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-black accounting-num ${openingBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {formatNumFa(openingBalance)}
              </span>
              <span className="text-[11px] text-slate-400 font-bold">{selectedProduct.unit || 'عدد'}</span>
            </div>
          </div>

          {/* Period Receipts (In) */}
          <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-3xl shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-800 block mb-1 flex items-center gap-1">
              <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
              جمع وارده در دوره
            </span>
            <div className="flex items-baseline gap-1 text-emerald-700">
              <span className="text-xl font-black accounting-num">+{formatNumFa(periodInTotal)}</span>
              <span className="text-[11px] font-bold">{selectedProduct.unit || 'عدد'}</span>
            </div>
          </div>

          {/* Period Remittances (Out) */}
          <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-3xl shadow-2xs">
            <span className="text-[11px] font-bold text-rose-800 block mb-1 flex items-center gap-1">
              <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-600" />
              جمع صادره در دوره
            </span>
            <div className="flex items-baseline gap-1 text-rose-700">
              <span className="text-xl font-black accounting-num">-{formatNumFa(periodOutTotal)}</span>
              <span className="text-[11px] font-bold">{selectedProduct.unit || 'عدد'}</span>
            </div>
          </div>

          {/* Real-time Closing Stock (Physical) */}
          <div className="bg-indigo-50/80 border border-indigo-200 p-4 rounded-3xl shadow-2xs">
            <span className="text-[11px] font-bold text-indigo-900 block mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              موجودی فیزیکی
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black accounting-num ${periodClosingBalance < 0 ? 'text-rose-600' : 'text-indigo-950'}`}>
                {formatNumFa(periodClosingBalance)}
              </span>
              <span className="text-[11px] text-indigo-700 font-bold">{selectedProduct.unit || 'عدد'}</span>
            </div>
            {selectedProduct.secondaryUnit && selectedProduct.unitRatio && (
              <div className="text-[10px] text-indigo-600 font-bold mt-1 accounting-num">
                معادل {formatNumFa(
                  (selectedProduct.unitRatioDirection || getUnitRatioDirection(selectedProduct)) === 'main_to_secondary'
                    ? periodClosingBalance * Number(selectedProduct.unitRatio)
                    : periodClosingBalance / Number(selectedProduct.unitRatio)
                )} {selectedProduct.secondaryUnit}
              </div>
            )}
          </div>

          {/* Reserved Stock */}
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-3xl shadow-2xs">
            <span className="text-[11px] font-bold text-amber-900 block mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              رزرو شده (فاکتورها)
            </span>
            <div className="flex items-baseline gap-1.5 text-amber-800">
              <span className="text-2xl font-black accounting-num">
                {formatNumFa(currentStockSummary ? (selectedWarehouseId !== 'all' ? (currentStockSummary.warehouses[selectedWarehouseId]?.reserved || 0) : currentStockSummary.totalReserved) : 0)}
              </span>
              <span className="text-[11px] font-bold">{selectedProduct.unit || 'عدد'}</span>
            </div>
            <div className="text-[10px] text-amber-700 font-medium mt-1">
              فاکتور بدون حواله خروج
            </div>
          </div>

          {/* Available Stock */}
          <div className="bg-emerald-50/90 border border-emerald-300 p-4 rounded-3xl shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-900 block mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              موجودی آزاد (قابل فروش)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black accounting-num ${(currentStockSummary ? (selectedWarehouseId !== 'all' ? (currentStockSummary.warehouses[selectedWarehouseId]?.available || 0) : currentStockSummary.totalAvailable) : periodClosingBalance) < 0 ? 'text-rose-600' : 'text-emerald-800'}`}>
                {formatNumFa(currentStockSummary ? (selectedWarehouseId !== 'all' ? (currentStockSummary.warehouses[selectedWarehouseId]?.available || 0) : currentStockSummary.totalAvailable) : periodClosingBalance)}
              </span>
              <span className="text-[11px] text-emerald-700 font-bold">{selectedProduct.unit || 'عدد'}</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-1">
              فیزیکی − رزرو شده
            </div>
          </div>
        </div>
      )}

      {/* Main Kardex Ledger Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
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
            <p className="text-xs text-slate-400">می‌توانید فیلتر انبار یا تاریخ را تغییر دهید یا سند موجودی اول دوره را ثبت نمایید.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-black">
                <tr>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap w-12">ردیف</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">تاریخ و زمان</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">نوع سند</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">شماره سند</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">انبار</th>
                  <th className="px-3 py-3.5 whitespace-nowrap">طرف حساب</th>
                  <th className="px-4 py-3.5 min-w-[180px]">شرح سند و تراکنش</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap bg-emerald-50/60 text-emerald-800">
                    وارده (+)
                    <div className="text-[10px] font-normal text-slate-500">({selectedProduct?.unit || 'واحد'})</div>
                  </th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap bg-rose-50/60 text-rose-800">
                    صادره (-)
                    <div className="text-[10px] font-normal text-slate-500">({selectedProduct?.unit || 'واحد'})</div>
                  </th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap bg-indigo-100/80 text-indigo-950 font-black border-x border-indigo-200">
                    موجودی لحظه‌ای (مانده)
                    <div className="text-[10px] font-bold text-indigo-700">({selectedProduct?.unit || 'واحد'})</div>
                  </th>
                  <th className="px-3 py-3.5 text-left whitespace-nowrap">فی واحد اصلی</th>
                  <th className="px-3 py-3.5 text-left whitespace-nowrap">مبلغ کل (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {/* Opening Balance Row if date filter was applied */}
                {startDate && (
                  <tr className="bg-amber-50/40 font-bold border-b border-amber-200">
                    <td className="px-3 py-3 text-center text-amber-800 text-xs">-</td>
                    <td className="px-3 py-3 text-amber-800 text-xs accounting-num">
                      قبل از {formatDigits(startDate.toLocaleDateString('fa-IR'))}
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] bg-amber-100 text-amber-900 font-bold border border-amber-300">
                        مانده منقول از قبل
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-400">-</td>
                    <td className="px-3 py-3 text-slate-700 font-bold">
                      {selectedWarehouseId === 'all' ? 'تمام انبارها' : (warehouses.find(w => w.id?.toString() === selectedWarehouseId)?.name || 'انبار')}
                    </td>
                    <td className="px-3 py-3 text-slate-400">-</td>
                    <td className="px-4 py-3 text-amber-950 font-bold">
                      مانده منقول از دوره قبل (موجودی در شروع بازه گزارش)
                    </td>
                    <td className="px-3 py-3 text-center text-slate-400">-</td>
                    <td className="px-3 py-3 text-center text-slate-400">-</td>
                    <td className="px-4 py-3 text-center font-black text-sm bg-indigo-50/90 text-indigo-950 border-x border-indigo-200 accounting-num">
                      {formatNumFa(openingBalance)}
                    </td>
                    <td className="px-3 py-3 text-left text-slate-400">-</td>
                    <td className="px-3 py-3 text-left text-slate-400">-</td>
                  </tr>
                )}

                {/* Detailed Transactions */}
                {ledgerRows.map((row) => {
                  const isInput = row.type === 'in';
                  const isInitialStock = row.documentType === 'initial_stock';

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isInitialStock
                          ? "bg-amber-50/30 hover:bg-amber-50/60"
                          : "hover:bg-indigo-50/30"
                      }`}
                    >
                      <td className="px-3 py-3 text-center text-slate-500 text-xs font-bold accounting-num">
                        {formatDigits(row.rowNumber)}
                      </td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap text-xs font-bold accounting-num">
                        <div>{formatDigits(row.date)}</div>
                        {row.time && <div className="text-[10px] text-slate-400">{formatDigits(row.time)}</div>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {getDocumentTypeBadge(row.documentType, row.type)}
                      </td>
                      <td className="px-3 py-3 font-bold text-indigo-700 whitespace-nowrap text-xs accounting-num">
                        {formatDigits(row.documentNumber || '-')}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-700 whitespace-nowrap">
                        {row.warehouseName}
                      </td>
                      <td className="px-3 py-3 text-slate-800 font-medium truncate max-w-[140px]" title={row.personName}>
                        {row.personName || '---'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[11px] max-w-[240px] truncate font-medium" title={row.description}>
                        {row.description || '---'}
                      </td>

                      {/* Inbound Quantity */}
                      <td className="px-3 py-3 text-center font-black text-emerald-700 bg-emerald-50/30 accounting-num">
                        {isInput ? (
                          <div>
                            <div className="text-sm font-black">+{formatNumFa(row.quantity)}</div>
                            {row.isSecondaryUnit && row.originalQuantity && (
                              <div className="text-[10px] text-indigo-600 font-normal">
                                معادل {formatNumFa(row.originalQuantity)} {row.selectedUnit || selectedProduct?.secondaryUnit}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </td>

                      {/* Outbound Quantity */}
                      <td className="px-3 py-3 text-center font-black text-rose-700 bg-rose-50/30 accounting-num">
                        {!isInput ? (
                          <div>
                            <div className="text-sm font-black">-{formatNumFa(row.quantity)}</div>
                            {row.isSecondaryUnit && row.originalQuantity && (
                              <div className="text-[10px] text-indigo-600 font-normal">
                                معادل {formatNumFa(row.originalQuantity)} {row.selectedUnit || selectedProduct?.secondaryUnit}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </td>

                      {/* Running Balance */}
                      <td className="px-4 py-3 text-center font-black text-sm bg-indigo-50/90 text-indigo-950 border-x border-indigo-200 accounting-num">
                        <span className={row.balanceAfter !== undefined && row.balanceAfter < 0 ? 'text-rose-600' : 'text-indigo-950'}>
                          {formatNumFa(row.balanceAfter)}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-3 text-left text-slate-700 whitespace-nowrap accounting-num">
                        {row.unitPrice ? (
                          <div>
                            <div className="font-bold">{formatCurFa(row.unitPrice)}</div>
                            {row.isSecondaryUnit && row.originalUnitPrice && (
                              <div className="text-[10px] text-indigo-600">
                                {formatCurFa(row.originalUnitPrice)} ({row.selectedUnit || selectedProduct?.secondaryUnit})
                              </div>
                            )}
                          </div>
                        ) : '---'}
                      </td>

                      {/* Total Price */}
                      <td className="px-3 py-3 text-left font-black text-slate-800 whitespace-nowrap accounting-num">
                        {row.totalPrice ? formatCurFa(row.totalPrice) : '---'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer: Totals */}
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-800">
                <tr>
                  <td colSpan={7} className="px-4 py-3.5 text-left text-xs font-bold text-slate-700">
                    جمع کل گردش دوره:
                  </td>
                  <td className="px-3 py-3.5 text-center font-black text-emerald-800 bg-emerald-100/70 accounting-num text-sm">
                    +{formatNumFa(periodInTotal)}
                  </td>
                  <td className="px-3 py-3.5 text-center font-black text-rose-800 bg-rose-100/70 accounting-num text-sm">
                    -{formatNumFa(periodOutTotal)}
                  </td>
                  <td className="px-4 py-3.5 text-center font-black text-base bg-indigo-200/80 text-indigo-950 border-x border-indigo-300 accounting-num">
                    {formatNumFa(periodClosingBalance)}
                  </td>
                  <td colSpan={2} className="px-4 py-3.5 text-left font-black text-slate-900 accounting-num">
                    ارزش کل مانده: {formatCurFa(totalValuation)} تومان
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Official Signatures Section - Visible ONLY in Print */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-8 mt-6 border-t border-slate-300 text-center text-xs font-sans">
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

      {/* Initial Stock Document Modal */}
      {selectedProduct && (
        <InitialStockModal
          isOpen={isInitialStockModalOpen}
          onClose={() => setIsInitialStockModalOpen(false)}
          product={selectedProduct}
          warehouses={warehouses}
          onSaved={async () => {
            await fetchInitialData();
            if (selectedProductId) {
              await loadProductKardexData(selectedProductId);
            }
          }}
        />
      )}
    </div>
  );
}
