import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  Package,
  Calendar,
  User,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Warehouse,
  ExternalLink,
  Plus,
  RefreshCw,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  ShieldCheck,
  Building2,
  Phone,
  Hash,
  Eye,
  Trash2
} from "lucide-react";

export interface WarehouseInvoiceSelectorProps {
  invoices: any[];
  products: any[];
  persons: any[];
  warehouses: any[];
  invoiceWarehouseId: string | number;
  isReceipt: boolean;
  warehouseOperationType: string;
  onSelectInvoice: (invoice: any) => void;
  onDirectEntry: () => void;
  onBack: () => void;
  formatCurrency: (val: number) => string;
  handleVoidInvoice?: (docId: string | number) => void;
  getProductStockInfo?: (productId: string | number) => any;
}

export default function WarehouseInvoiceSelector({
  invoices = [],
  products = [],
  persons = [],
  warehouses = [],
  invoiceWarehouseId,
  isReceipt,
  warehouseOperationType,
  onSelectInvoice,
  onDirectEntry,
  onBack,
  formatCurrency,
  handleVoidInvoice,
  getProductStockInfo,
}: WarehouseInvoiceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "unprocessed" | "partial" | "all">("pending");
  const [warehouseFilter, setWarehouseFilter] = useState<"all" | "current">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest_remaining" | "highest_amount">("newest");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | number | null>(null);

  // Determine expected invoice type based on operation
  const expectedType = useMemo(() => {
    if (isReceipt) {
      if (warehouseOperationType === "purchase_invoice") return "purchase";
      if (warehouseOperationType === "sales_return") return "sale_return";
      return "";
    } else {
      if (warehouseOperationType === "sales_invoice") return "sale";
      if (warehouseOperationType === "purchase_return") return "purchase_return";
      return "";
    }
  }, [isReceipt, warehouseOperationType]);

  const operationTitle = useMemo(() => {
    if (isReceipt) {
      if (warehouseOperationType === "purchase_invoice") return "فاکتورهای خرید کالا (جهت صدور رسید ورود)";
      if (warehouseOperationType === "sales_return") return "فاکتورهای برگشت از فروش (جهت صدور رسید ورود)";
      return "فاکتورهای مرجع رسید انبار";
    } else {
      if (warehouseOperationType === "sales_invoice") return "فاکتورهای فروش کالا (جهت صدور حواله خروج)";
      if (warehouseOperationType === "purchase_return") return "فاکتورهای برگشت از خرید (جهت صدور حواله خروج)";
      return "فاکتورهای مرجع حواله انبار";
    }
  }, [isReceipt, warehouseOperationType]);

  const targetDocType = isReceipt ? "warehouse_receipt" : "warehouse_remittance";

  // Pre-calculate enriched invoices with delivery/remittance details
  const enrichedInvoices = useMemo(() => {
    if (!expectedType) return [];

    const candidates = invoices.filter(
      (inv) =>
        inv.type === expectedType &&
        inv.status !== "voided" &&
        inv.status !== "draft" &&
        !inv.isDraft &&
        !inv.isDeleted
    );

    return candidates.map((inv) => {
      // Find past warehouse docs linked to this invoice
      const pastDocs = invoices.filter(
        (doc) =>
          (doc.sourceInvoiceId?.toString() === inv.id?.toString() ||
            (doc.sourceInvoiceNumber &&
              doc.sourceInvoiceNumber?.toString() === inv.invoiceNumber?.toString())) &&
          doc.type === targetDocType &&
          doc.status !== "voided" &&
          !doc.isDeleted &&
          !doc.isDraft
      );

      // Processed quantity per product
      const processedByProduct: Record<string, number> = {};
      pastDocs.forEach((doc) => {
        (doc.items || []).forEach((item: any) => {
          const key = String(item.productId || item.productName || "");
          if (key) {
            processedByProduct[key] = (processedByProduct[key] || 0) + (Number(item.quantity) || 0);
          }
        });
      });

      // Analyze items
      const itemDetails = (inv.items || []).map((item: any, idx: number) => {
        const prod = products.find((p) => p.id?.toString() === item.productId?.toString());
        const isService = prod?.type === "service";
        const key = String(item.productId || item.productName || "");
        const invoicedQty = Number(item.quantity) || 0;
        const deliveredQty = isService ? invoicedQty : (processedByProduct[key] || 0);
        const remainingQty = isService ? 0 : Math.max(0, invoicedQty - deliveredQty);

        // Physical stock in the selected warehouse
        let stockInWh = 0;
        if (prod && !isService) {
          if (getProductStockInfo) {
            const sInfo = getProductStockInfo(prod.id);
            const whKey = invoiceWarehouseId?.toString();
            if (whKey && sInfo?.warehouses?.[whKey]) {
              stockInWh = Number(sInfo.warehouses[whKey].physical || 0);
            } else if (sInfo) {
              stockInWh = Number(sInfo.totalPhysical || 0);
            } else {
              stockInWh = Number(prod.stock || 0);
            }
          } else {
            stockInWh = Number(prod.stock || 0);
          }
        }

        return {
          index: idx + 1,
          id: item.id || idx,
          productId: item.productId,
          productName: item.productName || prod?.name || "کالای نامشخص",
          productCode: prod?.code || "",
          productBarcode: prod?.barcode || "",
          isService,
          unit: item.selectedUnit || prod?.unit || "عدد",
          invoicedQty,
          deliveredQty,
          remainingQty,
          stockInWh,
          isShortage: !isReceipt && !isService && remainingQty > stockInWh,
          isCompleted: isService || remainingQty === 0,
        };
      });

      const physicalItems = itemDetails.filter((it: any) => !it.isService);
      const totalOrderedQty = physicalItems.reduce((acc: number, it: any) => acc + it.invoicedQty, 0);
      const totalDeliveredQty = physicalItems.reduce((acc: number, it: any) => acc + it.deliveredQty, 0);
      const totalRemainingQty = physicalItems.reduce((acc: number, it: any) => acc + it.remainingQty, 0);
      const percentDelivered =
        totalOrderedQty > 0
          ? Math.min(100, Math.round((totalDeliveredQty / totalOrderedQty) * 100))
          : 100;

      let deliveryStatus: "unprocessed" | "partially_processed" | "fully_processed" | "no_physical" = "unprocessed";
      if (physicalItems.length === 0) {
        deliveryStatus = "no_physical";
      } else if (pastDocs.length === 0 || totalDeliveredQty === 0) {
        deliveryStatus = "unprocessed";
      } else if (totalRemainingQty > 0) {
        deliveryStatus = "partially_processed";
      } else {
        deliveryStatus = "fully_processed";
      }

      // Person details
      const person = persons.find((p) => p.id?.toString() === inv.customerId?.toString());
      const customerName = person?.alias || person?.name || inv.customerName || "طرف حساب نامشخص";
      const customerPhone = person?.phone || person?.mobile || "";
      const customerRole = person?.role || "";

      // Warehouse
      const invWarehouse = warehouses.find((w) => w.id?.toString() === inv.warehouseId?.toString());
      const invWarehouseName = invWarehouse?.name || invWarehouse?.title || "";

      return {
        ...inv,
        customerName,
        customerPhone,
        customerRole,
        invWarehouseName,
        pastDocs,
        itemDetails,
        physicalItems,
        totalOrderedQty,
        totalDeliveredQty,
        totalRemainingQty,
        percentDelivered,
        deliveryStatus,
        hasPendingItems: totalRemainingQty > 0,
      };
    });
  }, [invoices, expectedType, targetDocType, products, getProductStockInfo, invoiceWarehouseId, isReceipt, persons, warehouses]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = enrichedInvoices.length;
    const unprocessed = enrichedInvoices.filter((i) => i.deliveryStatus === "unprocessed").length;
    const partial = enrichedInvoices.filter((i) => i.deliveryStatus === "partially_processed").length;
    const pendingTotal = unprocessed + partial;
    const completed = enrichedInvoices.filter((i) => i.deliveryStatus === "fully_processed").length;
    const totalRemainingUnits = enrichedInvoices.reduce((acc, i) => acc + i.totalRemainingQty, 0);

    return { total, unprocessed, partial, pendingTotal, completed, totalRemainingUnits };
  }, [enrichedInvoices]);

  // Filtering and sorting
  const filteredInvoices = useMemo(() => {
    return enrichedInvoices
      .filter((inv) => {
        // Status filter
        if (statusFilter === "pending") {
          if (!inv.hasPendingItems) return false;
        } else if (statusFilter === "unprocessed") {
          if (inv.deliveryStatus !== "unprocessed") return false;
        } else if (statusFilter === "partial") {
          if (inv.deliveryStatus !== "partially_processed") return false;
        }

        // Warehouse filter
        if (warehouseFilter === "current" && invoiceWarehouseId) {
          if (inv.warehouseId && inv.warehouseId.toString() !== invoiceWarehouseId.toString()) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const numMatch = inv.invoiceNumber?.toString().toLowerCase().includes(q);
          const custMatch = inv.customerName?.toLowerCase().includes(q);
          const phoneMatch = inv.customerPhone?.toLowerCase().includes(q);
          const titleMatch = inv.title?.toLowerCase().includes(q);
          const descMatch = inv.description?.toLowerCase().includes(q);
          const noteMatch = inv.note?.toLowerCase().includes(q);
          const itemMatch = (inv.itemDetails || []).some(
            (it: any) =>
              it.productName?.toLowerCase().includes(q) ||
              it.productCode?.toLowerCase().includes(q) ||
              it.productBarcode?.toLowerCase().includes(q)
          );

          if (!numMatch && !custMatch && !phoneMatch && !titleMatch && !descMatch && !noteMatch && !itemMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return String(b.date || "").localeCompare(String(a.date || ""));
        }
        if (sortBy === "oldest") {
          return String(a.date || "").localeCompare(String(b.date || ""));
        }
        if (sortBy === "highest_remaining") {
          return b.totalRemainingQty - a.totalRemainingQty;
        }
        if (sortBy === "highest_amount") {
          return (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0);
        }
        return 0;
      });
  }, [enrichedInvoices, statusFilter, warehouseFilter, searchQuery, sortBy, invoiceWarehouseId]);

  const selectedWarehouseObj = warehouses.find((w) => w.id?.toString() === invoiceWarehouseId?.toString());
  const selectedWarehouseName = selectedWarehouseObj?.name || selectedWarehouseObj?.title || "انبار انتخابی";

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Header & Breadcrumb */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                isReceipt
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-indigo-50 text-indigo-600 border border-indigo-100"
              }`}
            >
              {isReceipt ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  مرحله ۲ از ۳: انتخاب فاکتور مرجع
                </span>
                <span className="text-xs font-bold text-slate-400">
                  انبار: <span className="text-slate-800 font-black">{selectedWarehouseName}</span>
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                {operationTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              بازگشت به انتخاب انبار
            </button>
            <button
              type="button"
              onClick={onDirectEntry}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer hover:shadow-md"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              صدور مستقیم (بدون فاکتور مرجع)
            </button>
          </div>
        </div>

        {/* Live Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div
            onClick={() => setStatusFilter("pending")}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === "pending"
                ? "bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm"
                : "bg-slate-50 border-slate-200/70 hover:bg-slate-100/60"
            }`}
          >
            <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
              <span>نیازمند صدور (کل مانده)</span>
              <AlertCircle className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-indigo-700 mt-1 font-mono">
              {stats.pendingTotal}
              <span className="text-xs font-normal text-slate-500 mr-1.5 font-sans">فاکتور</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              مجموع {stats.totalRemainingUnits} قلم در انتظار
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("unprocessed")}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === "unprocessed"
                ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-sm"
                : "bg-slate-50 border-slate-200/70 hover:bg-slate-100/60"
            }`}
          >
            <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
              <span>کاملاً بدون {isReceipt ? "رسید" : "حواله"}</span>
              <Clock className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1 font-mono">
              {stats.unprocessed}
              <span className="text-xs font-normal text-slate-500 mr-1.5 font-sans">فاکتور</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">۰٪ عملیات انجام شده</div>
          </div>

          <div
            onClick={() => setStatusFilter("partial")}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === "partial"
                ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-sm"
                : "bg-slate-50 border-slate-200/70 hover:bg-slate-100/60"
            }`}
          >
            <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
              <span>تحویل جزئی (دارای کسری)</span>
              <Package className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
              {stats.partial}
              <span className="text-xs font-normal text-slate-500 mr-1.5 font-sans">فاکتور</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">بخشی صادر شده با مانده</div>
          </div>

          <div
            onClick={() => setStatusFilter("all")}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-200/80 border-slate-400 ring-2 ring-slate-400/20 shadow-sm"
                : "bg-slate-50 border-slate-200/70 hover:bg-slate-100/60"
            }`}
          >
            <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
              <span>همه فاکتورها</span>
              <FileText className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-black text-slate-700 mt-1 font-mono">
              {stats.total}
              <span className="text-xs font-normal text-slate-500 mr-1.5 font-sans">فاکتور</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats.completed} فاکتور تسویه کامل انبار
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔎 جستجوی هوشمند در شماره فاکتور، نام طرف حساب، شماره تماس، کد یا نام کالاها..."
              className="w-full pr-11 pl-10 py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="w-full md:w-56">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-3 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="newest">مرتب‌سازی: جدیدترین تاریخ</option>
              <option value="oldest">مرتب‌سازی: قدیمی‌ترین تاریخ</option>
              <option value="highest_remaining">مرتب‌سازی: بیشترین مانده اقلام</option>
              <option value="highest_amount">مرتب‌سازی: بیشترین مبلغ فاکتور</option>
            </select>
          </div>

          {/* Warehouse Filter */}
          <div className="w-full md:w-52">
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value as any)}
              className="w-full py-3 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="all">فیلتر انبار فاکتور: همه انبارها</option>
              <option value="current">فقط انبار {selectedWarehouseName}</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs font-bold">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 ml-1">نمایش:</span>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              دارای مانده اقلام ({stats.pendingTotal})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("unprocessed")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "unprocessed"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              کاملاً بدون {isReceipt ? "رسید" : "حواله"} ({stats.unprocessed})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("partial")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "partial"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              تحویل جزئی ({stats.partial})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "all"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              همه فاکتورها ({stats.total})
            </button>
          </div>

          <div className="text-slate-500 font-medium text-xs">
            یافت شده: <span className="font-bold text-slate-800 font-mono">{filteredInvoices.length}</span> فاکتور
          </div>
        </div>
      </div>

      {/* Invoices List Display */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200/70">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-800">
              هیچ فاکتوری با مشخصات جستجو شده یافت نشد
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              {statusFilter === "pending"
                ? "تمام فاکتورهای مربوطه تسویه انبار شده‌اند یا فاکتوری در این وضعیت موجود نیست."
                : "می‌توانید عبارت جستجو را تغییر دهید یا فیلترها را پاک کنید."}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setWarehouseFilter("all");
              }}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors"
            >
              پاکسازی فیلترها و مشاهده همه
            </button>
            <button
              type="button"
              onClick={onDirectEntry}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
            >
              صدور مستقیم سند انبار (بدون فاکتور)
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((inv) => {
            const isExpanded = expandedInvoiceId === inv.id;

            // Delivery badge details
            let badgeBg = "bg-rose-50 text-rose-700 border-rose-200";
            let badgeText = isReceipt ? "بدون رسید انبار (ورود نیافته)" : "بدون حواله انبار (تحویل نشده)";
            if (inv.deliveryStatus === "partially_processed") {
              badgeBg = "bg-amber-50 text-amber-700 border-amber-200";
              badgeText = `تحویل جزئی (${inv.percentDelivered}٪)`;
            } else if (inv.deliveryStatus === "fully_processed") {
              badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
              badgeText = "تحویل کامل انبار (۱۰۰٪)";
            } else if (inv.deliveryStatus === "no_physical") {
              badgeBg = "bg-slate-100 text-slate-600 border-slate-200";
              badgeText = "فاقد کالای فیزیکی";
            }

            return (
              <div
                key={inv.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${
                  inv.deliveryStatus === "fully_processed"
                    ? "border-slate-200/70 opacity-80 hover:opacity-100"
                    : inv.deliveryStatus === "partially_processed"
                    ? "border-amber-200 hover:border-amber-300"
                    : "border-slate-200 hover:border-indigo-300"
                }`}
              >
                {/* Main Card Header / Overview */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left Column: Number, Date, Customer */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-lg text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                          #{inv.invoiceNumber}
                        </span>
                        {inv.invoiceMode === "manual" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            شماره دستی
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${badgeBg}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {badgeText}
                      </span>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{inv.date || "بدون تاریخ"}</span>
                      </div>

                      {inv.invWarehouseName && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                          <span>انبار ثبت شده: {inv.invWarehouseName}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 flex-wrap text-sm text-slate-700">
                      <div className="flex items-center gap-1.5 font-bold">
                        <User className="w-4 h-4 text-indigo-500" />
                        <span className="text-slate-900">{inv.customerName}</span>
                        {inv.customerPhone && (
                          <span className="text-xs text-slate-400 font-mono" dir="ltr">
                            ({inv.customerPhone})
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1 font-bold">
                        <span>مبلغ فاکتور:</span>
                        <span className="font-mono text-slate-800 font-black text-sm">
                          {formatCurrency(inv.totalAmount || 0)}
                        </span>
                        <span>{inv.currency || "تومان"}</span>
                      </div>

                      {inv.title && (
                        <div className="text-xs text-slate-400">
                          عنوان: <span className="text-slate-600">{inv.title}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Progress and Remaining Breakdown */}
                  <div className="lg:w-72 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">پیشرفت انبارداری:</span>
                      <span className="font-mono text-slate-900 font-black">{inv.percentDelivered}٪</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          inv.percentDelivered === 100
                            ? "bg-emerald-500"
                            : inv.percentDelivered > 0
                            ? "bg-amber-500"
                            : "bg-slate-300"
                        }`}
                        style={{ width: `${inv.percentDelivered}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>تحویل شده: {inv.totalDeliveredQty} قلم</span>
                      <span className="font-bold text-indigo-700">
                        مانده: {inv.totalRemainingQty} قلم
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <button
                      type="button"
                      onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                      className={`px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isExpanded
                          ? "bg-slate-100 border-slate-300 text-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      title="مشاهده ریز اقلام و کسری‌ها"
                    >
                      <Eye className="w-4 h-4 text-slate-500" />
                      <span>ریز اقلام</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectInvoice(inv)}
                      disabled={inv.deliveryStatus === "fully_processed"}
                      className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
                        inv.deliveryStatus === "fully_processed"
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : isReceipt
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md"
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {inv.deliveryStatus === "fully_processed"
                          ? "تسویه کامل شده"
                          : isReceipt
                          ? "صدور رسید ورود"
                          : "صدور حواله خروج"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Expanded Details Panel: Items breakdown & past docs */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-100 bg-slate-50/70 p-5 rounded-b-2xl space-y-4 overflow-hidden"
                    >
                      {/* Past Warehouse Documents linked to this invoice */}
                      {inv.pastDocs && inv.pastDocs.length > 0 && (
                        <div className="bg-amber-50/80 rounded-xl p-4 border border-amber-200/80 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                            <span className="flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-amber-600" />
                              اسناد انبار ثبت شده قبلی برای این فاکتور ({inv.pastDocs.length} سند):
                            </span>
                            <span className="text-[11px] text-amber-700">
                              مجموع اقلام خارج/وارد شده در اسناد زیر منظور شده است
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {inv.pastDocs.map((doc: any) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-200 text-xs shadow-xs"
                              >
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-800">
                                    {isReceipt ? "رسید انبار" : "حواله انبار"} #{doc.invoiceNumber}
                                  </span>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                    <span>تاریخ: {doc.date}</span>
                                    <span>•</span>
                                    <span>{(doc.items || []).length} ردیف کالا</span>
                                  </div>
                                </div>
                                {handleVoidInvoice && (
                                  <button
                                    type="button"
                                    onClick={() => handleVoidInvoice(doc.id)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg font-bold text-[11px] transition-colors"
                                  >
                                    ابطال این سند
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Items Detailed Table */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-indigo-500" />
                            ریز اقلام فاکتور و مانده قابل صدور ({inv.itemDetails.length} قلم):
                          </h4>
                          <span className="text-[11px] text-slate-500 font-bold">
                            انبار مقصد جهت موجودی لحظه‌ای:{" "}
                            <span className="text-indigo-600">{selectedWarehouseName}</span>
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                              <tr>
                                <th className="p-3 text-center w-12">#</th>
                                <th className="p-3">شرح کالا / خدمات</th>
                                <th className="p-3 text-center">تعداد فاکتور</th>
                                <th className="p-3 text-center">تحویل شده</th>
                                <th className="p-3 text-center font-black text-indigo-900">
                                  مانده جهت صدور
                                </th>
                                <th className="p-3 text-center">واحد</th>
                                <th className="p-3 text-center">موجودی فعلی در انبار</th>
                                <th className="p-3 text-center">وضعیت تحویل</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {inv.itemDetails.map((it: any) => (
                                <tr
                                  key={it.id}
                                  className={`hover:bg-slate-50/50 transition-colors ${
                                    it.remainingQty === 0 ? "opacity-60 bg-slate-50/30" : ""
                                  }`}
                                >
                                  <td className="p-3 text-center font-mono text-slate-400 font-bold">
                                    {it.index}
                                  </td>
                                  <td className="p-3">
                                    <div className="font-extrabold text-slate-900">{it.productName}</div>
                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex gap-2">
                                      {it.productCode && <span>کد: {it.productCode}</span>}
                                      {it.productBarcode && <span>بارکد: {it.productBarcode}</span>}
                                    </div>
                                  </td>
                                  <td className="p-3 text-center font-bold font-mono text-slate-700">
                                    {it.invoicedQty}
                                  </td>
                                  <td className="p-3 text-center font-mono text-slate-500">
                                    {it.deliveredQty}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`font-black font-mono px-2 py-0.5 rounded ${
                                        it.remainingQty > 0
                                          ? "bg-indigo-50 text-indigo-700 text-sm"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      {it.remainingQty}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center text-slate-600 font-bold">{it.unit}</td>
                                  <td className="p-3 text-center">
                                    {it.isService ? (
                                      <span className="text-slate-400">خدمات</span>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1.5">
                                        <span
                                          className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                            it.stockInWh > 0
                                              ? "bg-slate-100 text-slate-800"
                                              : "bg-rose-50 text-rose-600"
                                          }`}
                                        >
                                          {it.stockInWh}
                                        </span>
                                        {!isReceipt && it.isShortage && (
                                          <span
                                            className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5"
                                            title="کسری موجودی فیزیکی در انبار"
                                          >
                                            <AlertTriangle className="w-3 h-3 inline" /> کسری
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {it.remainingQty === 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                        <CheckCircle className="w-3.5 h-3.5" /> کامل شد
                                      </span>
                                    ) : it.deliveredQty > 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                        <Clock className="w-3.5 h-3.5" /> مانده دارد
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                        <AlertCircle className="w-3.5 h-3.5" /> دست‌نخورده
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Footer button inside accordion */}
                      {inv.deliveryStatus !== "fully_processed" && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => onSelectInvoice(inv)}
                            className={`px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
                              isReceipt
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                            انتخاب این فاکتور و بارگذاری اقلام باقی‌مانده ({inv.totalRemainingQty} عدد)
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Direct Issuance Banner at the Bottom */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 text-center md:text-right">
          <h3 className="font-extrabold text-base flex items-center gap-2 justify-center md:justify-start">
            <Plus className="w-5 h-5 text-amber-400" />
            فاکتور مورد نظرتان را پیدا نمی‌کنید یا نیاز به صدور مستقیم دارید؟
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            برای ثبت حواله یا رسیدهای آزاد (مانند انتقال بین انبارها، مصرف داخلی، موجودی اولیه، تعدیل یا ضایعات)، می‌توانید بدون انتخاب فاکتور مرجع ادامه دهید.
          </p>
        </div>
        <button
          type="button"
          onClick={onDirectEntry}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer whitespace-nowrap"
        >
          صدور مستقیم سند انبار
        </button>
      </div>
    </div>
  );
}
