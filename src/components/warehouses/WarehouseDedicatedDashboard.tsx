import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  ArrowRight,
  Search,
  Download,
  Printer,
  RefreshCw,
  Plus,
  FileText,
  History,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  Calendar,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Truck,
  RotateCcw,
  Check,
  TrendingDown,
  TrendingUp,
  MapPin,
  User,
  Clock,
  Edit2,
  Trash2,
  Ban
} from "lucide-react";
import CustomDatePicker from "../ui/CustomDatePicker";
import WarehouseReportPrintModal from "./WarehouseReportPrintModal";
import { exportToExcel, formatDecimalForExcel } from "../../utils/exportUtils";
import { toPersianDigits, formatDateDisplay, getActiveStoreSettings } from "../../utils/format";
import { parseDocDateToTimestamp } from "../../utils/kardexSort";

interface WarehouseDedicatedDashboardProps {
  warehouse: any;
  warehouses: any[];
  onSelectWarehouse: (whId: string | number) => void;
  onBack: () => void;
  products: any[];
  invoices: any[];
  persons: any[];
  warehouseStocks: any[];
  storeSettings: any;
  productCategories?: any[];
  formatNumber: (val: any) => string;
  formatCurrency: (val: any) => string;
  setViewingInvoice?: (inv: any) => void;
  setActiveTab?: (tab: any) => void;
  handleApproveWarehouseReceipt?: (inv: any) => void;
  handleRecalculateStocks?: () => void;
  recalculating?: boolean;
  showNotification?: (type: string, msg: string) => void;
  handleDeleteInvoice?: (id: string | number) => void;
  handleVoidInvoice?: (id: string | number) => void;
  handleEditInvoiceAction?: (inv: any) => void;
  triggerInvoicePrint?: (inv: any) => void;
  confirmAction?: any;
}

export default function WarehouseDedicatedDashboard({
  warehouse,
  warehouses,
  onSelectWarehouse,
  onBack,
  products = [],
  invoices = [],
  persons = [],
  warehouseStocks = [],
  storeSettings,
  productCategories = [],
  formatNumber,
  formatCurrency,
  setViewingInvoice,
  setActiveTab,
  handleApproveWarehouseReceipt,
  handleRecalculateStocks,
  recalculating,
  showNotification,
  handleDeleteInvoice,
  handleVoidInvoice,
  handleEditInvoiceAction,
  triggerInvoicePrint,
  confirmAction,
}: WarehouseDedicatedDashboardProps) {
  // Active Tab inside Dedicated Warehouse Dashboard:
  // "stocks" | "documents" | "kardex" | "analytics"
  const [activeTab, setActiveTabLocal] = useState<"stocks" | "documents" | "kardex" | "analytics">("stocks");

  // Stock Tab Filters
  const [stockSearch, setStockSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<"all" | "available" | "critical" | "zero">("all");
  const [stockSortBy, setStockSortBy] = useState<"name" | "stock" | "value">("value");

  // Document Tab Filters
  const [docSearch, setDocSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [docStatusFilter, setDocStatusFilter] = useState("all");

  // Kardex Tab Filters
  const [kardexProductId, setKardexProductId] = useState<string>("all");
  const [kardexStartDate, setKardexStartDate] = useState<any>(null);
  const [kardexEndDate, setKardexEndDate] = useState<any>(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const currency = storeSettings?.currency || "تومان";
  const whIdStr = warehouse?.id ? String(warehouse.id) : "";

  // 1. Calculate enriched stocks for this warehouse
  const enrichedStocks = useMemo(() => {
    if (!warehouse) return [];

    return products
      .filter((p) => p && p.type !== "service")
      .map((p) => {
        const pIdStr = String(p.id);
        const stockKey = `${pIdStr}_${whIdStr}`;
        const matchStock = warehouseStocks.find(
          (s) =>
            String(s.productId) === pIdStr &&
            String(s.warehouseId) === whIdStr
        );

        const physical = matchStock ? Number(matchStock.physicalStock) || 0 : 0;
        const reserved = matchStock ? Number(matchStock.reservedStock) || 0 : 0;
        const available = matchStock ? Number(matchStock.availableStock) || 0 : Math.max(0, physical - reserved);
        
        const price = Number(p.purchasePrice || p.buyPrice || p.price || 0);
        const totalVal = physical * price;
        const minLvl = Number(p.minStock || p.minStockLevel || 0);
        const isBelow = minLvl > 0 && available < minLvl;
        const catObj = productCategories.find(
          (c) => String(c.id) === String(p.categoryId || p.category)
        );

        return {
          productId: p.id,
          code: p.code || "",
          name: p.name || "",
          unit: p.unit || "عدد",
          categoryName: catObj?.name || (typeof p.category === "string" ? p.category : ""),
          categoryId: String(p.categoryId || p.category || ""),
          purchasePrice: price,
          physicalStock: physical,
          reservedStock: reserved,
          availableStock: available,
          totalValue: totalVal,
          minStock: minLvl,
          isBelowMin: isBelow,
        };
      });
  }, [warehouse, products, warehouseStocks, whIdStr, productCategories]);

  // Filtered stocks for Tab 1
  const filteredStocks = useMemo(() => {
    return enrichedStocks.filter((it) => {
      if (stockSearch.trim()) {
        const q = stockSearch.toLowerCase().trim();
        const matchName = it.name.toLowerCase().includes(q);
        const matchCode = String(it.code).toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      if (selectedCategory !== "all" && it.categoryId !== selectedCategory) {
        return false;
      }
      if (stockStatusFilter === "available" && it.availableStock <= 0) {
        return false;
      }
      if (stockStatusFilter === "critical" && !it.isBelowMin) {
        return false;
      }
      if (stockStatusFilter === "zero" && it.physicalStock !== 0) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (stockSortBy === "name") return a.name.localeCompare(b.name, "fa");
      if (stockSortBy === "stock") return b.physicalStock - a.physicalStock;
      return b.totalValue - a.totalValue;
    });
  }, [enrichedStocks, stockSearch, selectedCategory, stockStatusFilter, stockSortBy]);

  // Overall Warehouse Stock Totals
  const totalValuation = useMemo(() => {
    return enrichedStocks.reduce((sum, it) => sum + (it.totalValue || 0), 0);
  }, [enrichedStocks]);

  const totalPhysicalQty = useMemo(() => {
    return enrichedStocks.reduce((sum, it) => sum + (it.physicalStock || 0), 0);
  }, [enrichedStocks]);

  const criticalStockItems = useMemo(() => {
    return enrichedStocks.filter((it) => it.isBelowMin);
  }, [enrichedStocks]);

  const zeroStockItems = useMemo(() => {
    return enrichedStocks.filter((it) => it.physicalStock <= 0);
  }, [enrichedStocks]);

  // 2. Warehouse Documents (Receipts, Remittances, Transfers, etc.)
  const warehouseDocs = useMemo(() => {
    if (!warehouse) return [];

    return invoices.filter((inv) => {
      if (!inv || inv.isDeleted || inv.status === "voided") return false;

      // Check if doc is linked directly to this warehouse
      const matchesMainWh = inv.warehouseId && String(inv.warehouseId) === whIdStr;
      const matchesTransferDest = inv.targetWarehouseId && String(inv.targetWarehouseId) === whIdStr;
      
      // Check if any items in this invoice entered/exited this warehouse
      const matchesItemWh = (inv.items || []).some(
        (it: any) => it && String(it.warehouseId || "") === whIdStr
      );

      return matchesMainWh || matchesTransferDest || matchesItemWh;
    }).sort((a, b) => {
      const tsA = parseDocDateToTimestamp(a.date, a.time, a.createdAt) || 0;
      const tsB = parseDocDateToTimestamp(b.date, b.time, b.createdAt) || 0;
      return tsB - tsA;
    });
  }, [invoices, whIdStr, warehouse]);

  // Filtered Warehouse Documents
  const filteredDocs = useMemo(() => {
    return warehouseDocs.filter((doc) => {
      if (docSearch.trim()) {
        const q = docSearch.toLowerCase().trim();
        const num = String(doc.invoiceNumber || doc.documentNumber || "").toLowerCase();
        const person = String(doc.customerName || doc.personName || "").toLowerCase();
        if (!num.includes(q) && !person.includes(q)) return false;
      }
      if (docTypeFilter !== "all" && doc.type !== docTypeFilter) {
        return false;
      }
      if (docStatusFilter !== "all") {
        if (docStatusFilter === "pending_approval" && doc.status !== "pending_approval") return false;
        if (docStatusFilter === "approved" && doc.status !== "approved" && doc.status !== "final") return false;
        if (docStatusFilter === "draft" && !doc.isDraft && doc.status !== "draft") return false;
      }
      return true;
    });
  }, [warehouseDocs, docSearch, docTypeFilter, docStatusFilter]);

  // 3. Warehouse Kardex Transactions
  const kardexRows = useMemo(() => {
    if (!warehouse) return [];

    const rows: any[] = [];
    let runningBalance = 0;

    // Filter relevant docs chronologically (ascending)
    const validDocsAsc = [...warehouseDocs].reverse();

    validDocsAsc.forEach((doc) => {
      const isReceipt =
        doc.type === "warehouse_receipt" ||
        doc.type === "purchase" ||
        doc.type === "sales_return";
      const isRemittance =
        doc.type === "warehouse_remittance" ||
        doc.type === "sale" ||
        doc.type === "purchase_return";

      (doc.items || []).forEach((item: any, itIdx: number) => {
        const itemWhId = String(item.warehouseId || doc.warehouseId || "");
        if (itemWhId !== whIdStr) return;

        const pId = String(item.productId || "");
        if (kardexProductId !== "all" && pId !== kardexProductId) return;

        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice || item.price || 0);
        const inQty = isReceipt ? qty : 0;
        const outQty = isRemittance ? qty : 0;

        runningBalance = runningBalance + inQty - outQty;

        const pObj = products.find((p) => String(p.id) === pId);

        rows.push({
          id: `${doc.id}_${itIdx}`,
          date: doc.date || "",
          time: doc.time || "",
          docId: doc.id,
          docNumber: doc.invoiceNumber || doc.documentNumber || doc.id,
          docType: doc.type,
          status: doc.status || "approved",
          productName: pObj?.name || item.productName || "کالای نامشخص",
          productCode: pObj?.code || "",
          unit: pObj?.unit || item.selectedUnit || "عدد",
          personName: doc.customerName || doc.personName || "-",
          inQty,
          outQty,
          runningBalance,
          unitPrice: price,
          totalPrice: qty * price,
        });
      });
    });

    return rows.reverse();
  }, [warehouse, warehouseDocs, whIdStr, kardexProductId, products]);

  // Kardex filtered by date
  const filteredKardexRows = useMemo(() => {
    if (!kardexStartDate && !kardexEndDate) return kardexRows;

    return kardexRows.filter((r) => {
      const ts = parseDocDateToTimestamp(r.date, r.time);
      if (kardexStartDate) {
        const sTs = new Date(kardexStartDate).getTime();
        if (ts < sTs) return false;
      }
      if (kardexEndDate) {
        const eTs = new Date(kardexEndDate).getTime() + 86400000;
        if (ts > eTs) return false;
      }
      return true;
    });
  }, [kardexRows, kardexStartDate, kardexEndDate]);

  // Export to Excel for Current Warehouse
  const handleExportWarehouseExcel = () => {
    try {
      const settings = getActiveStoreSettings();
      const excelRows = enrichedStocks.map((it, idx) => ({
        "ردیف": idx + 1,
        "کد کالا": it.code || "-",
        "نام کالا": it.name,
        "دسته‌بندی": it.categoryName || "-",
        "انبار": warehouse.name,
        "موجودی فیزیکی": formatDecimalForExcel(it.physicalStock, settings),
        "رزرو شده": formatDecimalForExcel(it.reservedStock, settings),
        "موجودی آزاد": formatDecimalForExcel(it.availableStock, settings),
        "واحد": it.unit,
        "فی خرید": formatDecimalForExcel(it.purchasePrice, settings),
        "ارزش کل موجودی": formatDecimalForExcel(it.totalValue, settings),
        "نقطه سفارش": formatDecimalForExcel(it.minStock, settings),
        "وضعیت": it.physicalStock <= 0 ? "اتمام موجودی" : it.isBelowMin ? "کسری سفارش" : "طبیعی",
      }));

      exportToExcel({
        filename: `گزارش_انبار_${warehouse.name}_${new Date().toLocaleDateString("fa-IR").replace(/\//g, "-")}`,
        sheetName: "موجودی و ارزش انبار",
        data: excelRows,
        storeSettings: settings,
      });

      if (showNotification) {
        showNotification("success", "فایل اکسل جامع انبار با موفقیت آماده و دریافت شد.");
      }
    } catch (e) {
      console.error(e);
      alert("خطا در ایجاد فایل اکسل");
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Header Card: Warehouse Profile & Switcher */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          {/* Warehouse Brand & Title */}
          <div className="flex items-start sm:items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0"
              title="بازگشت به فهرست انبارها"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Box className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {warehouse.name}
                </h1>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${
                    warehouse.isActive
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300/80"
                      : "bg-rose-100 text-rose-800 border border-rose-300/80"
                  }`}
                >
                  {warehouse.isActive ? "فعال و عملیاتی" : "غیرفعال"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-bold mt-1.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  مسئول: {warehouse.manager || "تعیین نشده"}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  موقعیت: {warehouse.location || "شعبه اصلی"}
                </span>
              </div>
            </div>
          </div>

          {/* Top Actions & Quick Switcher */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Quick Warehouse Switcher Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs font-bold text-slate-700">
              <span className="text-slate-400 text-[11px]">جابجایی انبار:</span>
              <select
                value={warehouse.id}
                onChange={(e) => onSelectWarehouse(e.target.value)}
                className="bg-transparent outline-none font-black text-indigo-700 cursor-pointer pr-1"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.isActive ? "" : "(غیرفعال)"}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>چاپ رسمی</span>
            </button>

            <button
              type="button"
              onClick={handleExportWarehouseExcel}
              className="px-3.5 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>خروجی اکسل</span>
            </button>

            {setActiveTab && (
              <button
                type="button"
                onClick={() => setActiveTab("create_warehouse_doc")}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>سند انبار جدید</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Big KPI Metric Strips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Metric 1: Valuation */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-indigo-100/40 border border-indigo-200/80 flex flex-col justify-between">
            <span className="text-xs text-indigo-800 font-bold">ارزش کل دارایی انبار</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black font-mono text-indigo-950">
                {toPersianDigits(formatCurrency(totalValuation))}
              </span>
              <span className="text-[11px] text-indigo-700 font-medium">{currency}</span>
            </div>
            <span className="text-[10px] text-indigo-600 mt-1 font-semibold">
              مبنای قیمت خرید کالاها
            </span>
          </div>

          {/* Metric 2: Total Items */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <span className="text-xs text-slate-600 font-bold">اقلام موجود در انبار</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900">
                {toPersianDigits(enrichedStocks.filter((s) => s.physicalStock > 0).length)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">ردیف کالا</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 font-semibold">
              مجموع موجودی: {toPersianDigits(formatNumber(totalPhysicalQty))} واحد
            </span>
          </div>

          {/* Metric 3: Critical / Reorder alerts */}
          <div
            onClick={() => {
              setActiveTabLocal("stocks");
              setStockStatusFilter("critical");
            }}
            className={`p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all ${
              criticalStockItems.length > 0
                ? "bg-rose-50/70 hover:bg-rose-100/80 border-rose-200 text-rose-900"
                : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
            }`}
          >
            <span className="text-xs font-bold flex items-center justify-between">
              <span>کسری / زیر نقطه سفارش</span>
              {criticalStockItems.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 font-black">
                  هشدار
                </span>
              )}
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black font-mono">
                {toPersianDigits(criticalStockItems.length)}
              </span>
              <span className="text-[11px] font-medium">قلم کالا</span>
            </div>
            <span className="text-[10px] mt-1 font-bold">
              {criticalStockItems.length > 0 ? "کلیک جهت مشاهده اقلام کسری" : "تراز موجودی انبار مطلوب است"}
            </span>
          </div>

          {/* Metric 4: Documents Registered */}
          <div
            onClick={() => setActiveTabLocal("documents")}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 flex flex-col justify-between cursor-pointer transition-all"
          >
            <span className="text-xs text-slate-600 font-bold">اسناد بایگانی شده انبار</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900">
                {toPersianDigits(warehouseDocs.length)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">سند ثبتی</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 font-semibold">
              رسید، حواله و انتقالی‌های مرتبط
            </span>
          </div>
        </div>

        {/* 4 Main Tabs Nav Bar */}
        <div className="flex border-b border-slate-200 gap-1 sm:gap-3 overflow-x-auto custom-scrollbar pt-2">
          <button
            type="button"
            onClick={() => setActiveTabLocal("stocks")}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black transition-all flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === "stocks"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>موجودی و ارزش کالاها</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {toPersianDigits(enrichedStocks.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabLocal("documents")}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black transition-all flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === "documents"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>اسناد انبار ({toPersianDigits(warehouseDocs.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabLocal("kardex")}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black transition-all flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === "kardex"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>کاردکس و گردش تغییرات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabLocal("analytics")}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black transition-all flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === "analytics"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>تحلیل و گزارشات جامع انبار</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Stocks & Valuation */}
      {activeTab === "stocks" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="جستجوی نام یا کد کالا..."
                  className="w-full pr-9 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">همه دسته‌بندی‌ها</option>
                {productCategories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Stock Status Segment Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStockStatusFilter("all")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    stockStatusFilter === "all" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-600"
                  }`}
                >
                  همه ({toPersianDigits(enrichedStocks.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter("available")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    stockStatusFilter === "available" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-600"
                  }`}
                >
                  موجود
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter("critical")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    stockStatusFilter === "critical" ? "bg-white text-rose-700 shadow-3xs" : "text-slate-600"
                  }`}
                >
                  کسری نقطه سفارش ({toPersianDigits(criticalStockItems.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter("zero")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    stockStatusFilter === "zero" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-600"
                  }`}
                >
                  ناموجود ({toPersianDigits(zeroStockItems.length)})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <span className="text-xs text-slate-400 font-bold">مرتب‌سازی:</span>
              <select
                value={stockSortBy}
                onChange={(e) => setStockSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="value">ارزش کل موجودی</option>
                <option value="stock">بیشترین موجودی فیزیکی</option>
                <option value="name">نام کالا (الفبا)</option>
              </select>
            </div>
          </div>

          {/* Stocks Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-3 px-3 text-center w-12">ردیف</th>
                  <th className="py-3 px-3 w-28">کد کالا</th>
                  <th className="py-3 px-4">نام و دسته‌بندی کالا</th>
                  <th className="py-3 px-3 text-center w-20">واحد</th>
                  <th className="py-3 px-3 text-center w-24">موجودی فیزیکی</th>
                  <th className="py-3 px-3 text-center w-20">رزرو شده</th>
                  <th className="py-3 px-3 text-center w-24">موجودی آزاد</th>
                  <th className="py-3 px-4 text-left w-28">فی خرید ({currency})</th>
                  <th className="py-3 px-4 text-left w-32">ارزش موجودی ({currency})</th>
                  <th className="py-3 px-3 text-center w-28">وضعیت تراز</th>
                  <th className="py-3 px-3 text-center w-20">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStocks.map((it, idx) => (
                  <tr key={it.productId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {toPersianDigits(idx + 1)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">
                      {it.code ? toPersianDigits(it.code) : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {it.name}
                      </div>
                      {it.categoryName && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          گروه: {it.categoryName}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 font-bold">
                      {it.unit}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-slate-900">
                      {toPersianDigits(formatNumber(it.physicalStock))}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500 font-bold">
                      {it.reservedStock > 0 ? toPersianDigits(formatNumber(it.reservedStock)) : "۰"}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-indigo-700">
                      {toPersianDigits(formatNumber(it.availableStock))}
                    </td>
                    <td className="py-3 px-4 text-left font-mono font-bold text-slate-700">
                      {toPersianDigits(formatCurrency(it.purchasePrice))}
                    </td>
                    <td className="py-3 px-4 text-left font-mono font-black text-slate-950">
                      {toPersianDigits(formatCurrency(it.totalValue))}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {it.physicalStock <= 0 ? (
                        <span className="text-[10px] text-rose-700 font-black px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200">
                          اتمام موجودی
                        </span>
                      ) : it.isBelowMin ? (
                        <span className="text-[10px] text-amber-800 font-black px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200">
                          کسری سفارش ({toPersianDigits(formatNumber(it.minStock - it.availableStock))})
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-800 font-bold px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                          مطلوب
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setKardexProductId(String(it.productId));
                          setActiveTabLocal("kardex");
                        }}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        title="مشاهده گردش و کاردکس کالا در این انبار"
                      >
                        کاردکس
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStocks.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-bold text-sm">
                      هیچ کالایی با شرایط فیلتر در این انبار پیدا نشد.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/90 border-t border-slate-200 font-black text-slate-900">
                  <td colSpan={4} className="py-3 px-4 text-right">
                    مجموع اقلام نمایش‌داده‌شده ({toPersianDigits(filteredStocks.length)} ردیف):
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black">
                    {toPersianDigits(
                      formatNumber(filteredStocks.reduce((s, x) => s + (x.physicalStock || 0), 0))
                    )}
                  </td>
                  <td colSpan={3}></td>
                  <td className="py-3 px-4 text-left font-mono font-black text-indigo-900">
                    {toPersianDigits(
                      formatCurrency(filteredStocks.reduce((s, x) => s + (x.totalValue || 0), 0))
                    )}{" "}
                    {currency}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Warehouse Documents */}
      {activeTab === "documents" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Docs Filter Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="جستجوی شماره سند یا طرف‌حساب..."
                  className="w-full pr-9 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              {/* Document Type Filter */}
              <select
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">تمام انواع اسناد</option>
                <option value="warehouse_receipt">رسیدهای ورود به انبار</option>
                <option value="warehouse_remittance">حواله‌های خروج از انبار</option>
                <option value="purchase">فاکتورهای خرید مرتبط</option>
                <option value="sale">فاکتورهای فروش مرتبط</option>
              </select>

              {/* Document Status Filter */}
              <select
                value={docStatusFilter}
                onChange={(e) => setDocStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="approved">تایید نهایی شده</option>
                <option value="pending_approval">در انتظار تایید</option>
                <option value="draft">پیش‌نویس</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-bold">
              تعداد اسناد یافت‌شده:{" "}
              <span className="font-mono font-black text-indigo-700">
                {toPersianDigits(filteredDocs.length)}
              </span>
            </div>
          </div>

          {/* Docs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-3 px-3 text-center w-12">ردیف</th>
                  <th className="py-3 px-3 w-32">نوع سند</th>
                  <th className="py-3 px-3 w-28">شماره سند</th>
                  <th className="py-3 px-3 w-28">تاریخ</th>
                  <th className="py-3 px-4">طرف‌حساب / تحویل‌دهنده / تحویل‌گیرنده</th>
                  <th className="py-3 px-3 text-center w-24">تعداد اقلام</th>
                  <th className="py-3 px-3 text-center w-28">وضعیت سند</th>
                  <th className="py-3 px-3 text-center w-48">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc, idx) => {
                  const isReceipt =
                    doc.type === "warehouse_receipt" ||
                    doc.type === "purchase" ||
                    doc.type === "sales_return";
                  const isPending = doc.status === "pending_approval";
                  const isApproved = doc.status === "approved" || doc.status === "final";
                  const isVoided = doc.status === "voided";
                  const isDraft = doc.status === "draft" || doc.isDraft;
                  const itemsCount = (doc.items || []).length;

                  let typeLabel = "سند انبار";
                  if (doc.type === "warehouse_receipt") typeLabel = "رسید ورود به انبار";
                  else if (doc.type === "warehouse_remittance") typeLabel = "حواله خروج انبار";
                  else if (doc.type === "purchase") typeLabel = "فاکتور خرید";
                  else if (doc.type === "sale") typeLabel = "فاکتور فروش";
                  else if (doc.type === "sales_return") typeLabel = "برگشت از فروش";
                  else if (doc.type === "purchase_return") typeLabel = "برگشت از خرید";

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        {toPersianDigits(idx + 1)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-md text-[11px] ${
                            isReceipt
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-purple-50 text-purple-800 border border-purple-200"
                          }`}
                        >
                          {isReceipt ? (
                            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUpFromLine className="w-3.5 h-3.5 text-purple-600" />
                          )}
                          <span>{typeLabel}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-slate-900">
                        {toPersianDigits(doc.invoiceNumber || doc.documentNumber || doc.id)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-bold">
                        {toPersianDigits(doc.date ? doc.date.split("T")[0] : "-")}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {doc.customerName || doc.personName || "انبار داخلی / سازمانی"}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {toPersianDigits(itemsCount)} قلم
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isVoided ? (
                          <span className="text-[10px] text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-bold">
                            ابطال‌شده
                          </span>
                        ) : isPending ? (
                          <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                            در انتظار تایید
                          </span>
                        ) : isApproved ? (
                          <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                            تایید نهایی شده
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-bold">
                            پیش‌نویس
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* 1. Preview Document */}
                          {setViewingInvoice && (
                            <button
                              type="button"
                              onClick={() => setViewingInvoice(doc)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="مشاهده و پیش‌نمایش سند"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 2. Print Document */}
                          <button
                            type="button"
                            onClick={() => {
                              if (triggerInvoicePrint) {
                                triggerInvoicePrint(doc);
                              } else if (setViewingInvoice) {
                                setViewingInvoice(doc);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="چاپ سند انبار"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Approve Document (Receipt or Remittance) */}
                          {(isPending || isDraft) && handleApproveWarehouseReceipt && !isVoided && (
                            <button
                              type="button"
                              onClick={() => handleApproveWarehouseReceipt(doc)}
                              className="px-2 py-1 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                              title="تایید نهایی و اعمال در موجودی انبار"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تایید</span>
                            </button>
                          )}

                          {/* 4. Edit Document */}
                          {handleEditInvoiceAction && !isVoided && (
                            <button
                              type="button"
                              onClick={() => handleEditInvoiceAction(doc)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="ویرایش سند انبار"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 5. Void Document */}
                          {handleVoidInvoice && !isVoided && (
                            <button
                              type="button"
                              onClick={() => handleVoidInvoice(doc.id)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="ابطال سند انبار"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 6. Delete Document */}
                          {handleDeleteInvoice && (
                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(doc.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="حذف سند انبار"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-bold text-sm">
                      هیچ سندی با این مشخصات برای این انبار ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Warehouse Kardex & Stock Movements */}
      {activeTab === "kardex" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Kardex Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Product Select */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">انتخاب کالا:</span>
                <select
                  value={kardexProductId}
                  onChange={(e) => setKardexProductId(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none cursor-pointer max-w-xs"
                >
                  <option value="all">گردش تمام کالاها (توالی تراکنش‌ها)</option>
                  {products
                    .filter((p) => p && p.type !== "service")
                    .map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name} {p.code ? `(${p.code})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              {/* Date Filters */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">از تاریخ:</span>
                <CustomDatePicker
                  value={kardexStartDate}
                  onChange={(d: any) => setKardexStartDate(d ? d.toDate?.() || d : null)}
                  placeholder="شروع بازه..."
                  inputClass="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold w-28 text-center"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">تا تاریخ:</span>
                <CustomDatePicker
                  value={kardexEndDate}
                  onChange={(d: any) => setKardexEndDate(d ? d.toDate?.() || d : null)}
                  placeholder="پایان بازه..."
                  inputClass="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold w-28 text-center"
                />
              </div>

              {(kardexStartDate || kardexEndDate || kardexProductId !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setKardexStartDate(null);
                    setKardexEndDate(null);
                    setKardexProductId("all");
                  }}
                  className="text-xs text-rose-600 hover:underline font-bold"
                >
                  حذف فیلترها
                </button>
              )}
            </div>

            {/* Recalculate button */}
            {handleRecalculateStocks && (
              <button
                type="button"
                disabled={recalculating}
                onClick={handleRecalculateStocks}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`} />
                <span>محاسبه مجدد کاردکس</span>
              </button>
            )}
          </div>

          {/* Kardex Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-3 px-3 text-center w-12">ردیف</th>
                  <th className="py-3 px-3 w-24">تاریخ</th>
                  <th className="py-3 px-3 w-28">شماره سند</th>
                  <th className="py-3 px-4">کالا</th>
                  <th className="py-3 px-4">طرف‌حساب / شرح سند</th>
                  <th className="py-3 px-3 text-center w-24 text-emerald-700">وارده (+)</th>
                  <th className="py-3 px-3 text-center w-24 text-rose-700">صادره (-)</th>
                  <th className="py-3 px-3 text-center w-28 text-indigo-900">مانده متوالی</th>
                  <th className="py-3 px-4 text-left w-28">فی واحد ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKardexRows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {toPersianDigits(idx + 1)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">
                      {toPersianDigits(row.date ? row.date.split("T")[0] : "-")}
                    </td>
                    <td className="py-3 px-3 font-mono font-black text-slate-800">
                      {toPersianDigits(row.docNumber)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{row.productName}</div>
                      {row.productCode && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          کد: {toPersianDigits(row.productCode)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-bold">
                      {row.personName}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-emerald-700 bg-emerald-50/30">
                      {row.inQty > 0 ? toPersianDigits(formatNumber(row.inQty)) : "-"}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-rose-700 bg-rose-50/30">
                      {row.outQty > 0 ? toPersianDigits(formatNumber(row.outQty)) : "-"}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-indigo-950 bg-indigo-50/50">
                      {toPersianDigits(formatNumber(row.runningBalance))} {row.unit}
                    </td>
                    <td className="py-3 px-4 text-left font-mono font-bold text-slate-700">
                      {toPersianDigits(formatCurrency(row.unitPrice))}
                    </td>
                  </tr>
                ))}
                {filteredKardexRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-bold text-sm">
                      هیچ تراکنش یا گردشی در این بازه برای این انبار ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/90 border-t border-slate-200 font-black text-slate-900">
                  <td colSpan={5} className="py-3 px-4 text-right">
                    مجموع گردش در این بازه:
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-800">
                    +{toPersianDigits(
                      formatNumber(filteredKardexRows.reduce((s, x) => s + (x.inQty || 0), 0))
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-rose-800">
                    -{toPersianDigits(
                      formatNumber(filteredKardexRows.reduce((s, x) => s + (x.outQty || 0), 0))
                    )}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Analytics & Full Warehouse Reports */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Section 1: Critical & Below Reorder Point */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-slate-800 text-sm sm:text-base">
                  اقلام نیازمند سفارش مجدد در {warehouse.name} ({toPersianDigits(criticalStockItems.length)} قلم)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-bold">
                محاسبه بر اساس حداقل موجودی و نقطه سفارش
              </span>
            </div>

            {criticalStockItems.length === 0 ? (
              <div className="py-8 text-center text-emerald-700 bg-emerald-50/50 rounded-2xl border border-emerald-200 font-bold text-xs sm:text-sm">
                موجودی تمامی کالاها در این انبار بالاتر از نقطه سفارش است و کسری وجود ندارد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2.5 px-3">کد کالا</th>
                      <th className="py-2.5 px-4">نام کالا</th>
                      <th className="py-2.5 px-3 text-center">موجودی فعلی</th>
                      <th className="py-2.5 px-3 text-center">حداقل مجاز (نقطه سفارش)</th>
                      <th className="py-2.5 px-3 text-center text-rose-700">میزان کسری</th>
                      <th className="py-2.5 px-4 text-left">برآورد هزینه تامین ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criticalStockItems.map((it) => {
                      const shortage = Math.max(0, it.minStock - it.availableStock);
                      const costEst = shortage * it.purchasePrice;
                      return (
                        <tr key={it.productId} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {it.code ? toPersianDigits(it.code) : "-"}
                          </td>
                          <td className="py-2.5 px-4 font-black text-slate-900">
                            {it.name}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                            {toPersianDigits(formatNumber(it.availableStock))} {it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                            {toPersianDigits(formatNumber(it.minStock))} {it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-rose-700">
                            {toPersianDigits(formatNumber(shortage))} {it.unit}
                          </td>
                          <td className="py-2.5 px-4 text-left font-mono font-black text-slate-900">
                            {toPersianDigits(formatCurrency(costEst))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Valuation by Category Breakdown */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-800 text-sm sm:text-base">
                  سهم دسته‌بندی‌ها از ارزش سرمایه‌ای انبار
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-bold">
                توزیع موجودی ریالی کالاها
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productCategories.map((cat) => {
                const catItems = enrichedStocks.filter((s) => s.categoryId === String(cat.id));
                const catValue = catItems.reduce((sum, s) => sum + s.totalValue, 0);
                const percent = totalValuation > 0 ? (catValue / totalValuation) * 100 : 0;
                if (catItems.length === 0) return null;

                return (
                  <div
                    key={cat.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-sm">
                        {cat.name}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {toPersianDigits(percent.toFixed(1))}% از کل انبار
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                      <span>تعداد اقلام: {toPersianDigits(catItems.length)} ردیف</span>
                      <span className="font-mono font-black text-indigo-950">
                        {toPersianDigits(formatCurrency(catValue))} {currency}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Official Print Modal */}
      {isPrintModalOpen && (
        <WarehouseReportPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          warehouse={warehouse}
          items={enrichedStocks}
          storeSettings={storeSettings}
          formatNumber={formatNumber}
          formatCurrency={formatCurrency}
          totalValuation={totalValuation}
          totalPhysicalQty={totalPhysicalQty}
          criticalCount={criticalStockItems.length}
        />
      )}
    </div>
  );
}
