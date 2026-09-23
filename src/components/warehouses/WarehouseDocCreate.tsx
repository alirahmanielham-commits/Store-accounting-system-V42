import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  CheckCircle,
  Package,
  ScanLine,
  Box,
  User,
  Wallet,
  DollarSign,
  ArrowLeft,
  Calculator,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Printer,
  CreditCard,
  AlertCircle,
  Save,
  ShoppingCart,
  Search,
  Calendar as CalendarIcon,
  Users,
  Briefcase,
  Phone,
  MapPin,
  UserPlus,
  Download,
  Upload,
  RefreshCw,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  X,
  Maximize2,
  Minimize2,
  Settings,
  LogOut,
  Home,
  LayoutDashboard,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  MoreHorizontal,
  Menu,
  Camera,
  Image,
  Video,
  Mic,
  Play,
  Pause,
  FileText,
  Folder,
  FolderPlus,
  File,
  FilePlus,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  FileSpreadsheet,
  PieChart,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Info,
  HelpCircle,
  Bell,
  Clock,
  Tag,
  Bookmark,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Link,
  Copy,
  Paperclip,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
  AtSign,
  Globe,
  Award,
  Gift,
  Coffee,
  Calendar,
  CornerDownLeft,
  Warehouse as WarehouseIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCheck,
} from "lucide-react";
import {
  convertQuantityToBaseUnit,
  convertPriceToBaseUnit,
  getUnitRatioDirection,
} from "../../utils/unitConversion";
import WarehouseInvoiceSelector from "./WarehouseInvoiceSelector";

export default function WarehouseDocCreate(props: any) {
  const {
    invoiceNumber,
    persons,
    date,
    setDate,
    persian,
    persian_fa,
    items,
    setItems,
    handleItemChange,
    products,
    handleRemoveItem,
    storeSettings,
    Package,
    invoiceWarehouseId,
    setInvoiceWarehouseId,
    warehouses = [],
    FastBarcodeScanner,
    handleFastBarcodeScan,
    SearchableSelect,
    handleFastAddProduct,
    invoiceTitle,
    invoiceMode,
    setInvoiceMode,
    setInvoiceNumber,
    setInvoiceTitle,
    setIsPersonModalOpen,
    User,
    activePersonsOnly,
    getRoleName,
    customerId,
    setCustomerId,
    renderPersonInfoBox,
    formatCurrency,
    submitting,
    handleInvoicePreviewTrigger,
    Plus,
    Trash2,
    Save,
    RefreshCw,
    FileText,
    Tag,
    setInvoiceType,
    DatePicker,
    invoiceDescription,
    setInvoiceDescription,
    invoiceNote,
    setInvoiceNote,
    formatProductStockDetails,
    warehouseOperationType,
    setWarehouseOperationType,
    warehouseWizardStep = 1,
    setWarehouseWizardStep,
    setSourceInvoiceId,
    customAlert,
    invoices = [],
    hasRemainingWarehouseItems,
    sourceInvoiceId,
    deletePreviousDocs,
    setDeletePreviousDocs,
    setInvoiceCurrency,
    setExchangeRate,
    setExchangeRateInput,
    deleteInvoice,
    setInvoices,
    fetchInvoices,
    generateId,
    handleAddItem,
    handleVoidInvoice,
    getProductStockInfo,
  } = props;

  const isReceipt = [
    "purchase_invoice",
    "sales_return",
    "transfer_in",
  ].includes(warehouseOperationType);

  // Quick stats for pending invoices in Step 1
  const pendingInvoicesSummary = useMemo(() => {
    let pendingPurchases = 0;
    let pendingSales = 0;
    let pendingSaleReturns = 0;
    let pendingPurchaseReturns = 0;

    (invoices || []).forEach((inv: any) => {
      if (inv.status === "voided" || inv.status === "draft" || inv.isDraft || inv.isDeleted) return;

      const physicalItems = (inv.items || []).filter((it: any) => {
        const prod = products.find((p: any) => p.id?.toString() === it.productId?.toString());
        return prod?.type !== "service";
      });
      if (physicalItems.length === 0) return;

      if (inv.type === "purchase") {
        const pastDocs = invoices.filter(
          (d: any) =>
            (d.sourceInvoiceId?.toString() === inv.id?.toString() ||
              (d.sourceInvoiceNumber && d.sourceInvoiceNumber?.toString() === inv.invoiceNumber?.toString())) &&
            d.type === "warehouse_receipt" &&
            d.status !== "voided" &&
            !d.isDeleted &&
            !d.isDraft
        );
        let delivered = 0;
        pastDocs.forEach((d: any) => {
          (d.items || []).forEach((it: any) => {
            delivered += Number(it.quantity) || 0;
          });
        });
        const total = physicalItems.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0);
        if (total > delivered) pendingPurchases++;
      } else if (inv.type === "sale") {
        const pastDocs = invoices.filter(
          (d: any) =>
            (d.sourceInvoiceId?.toString() === inv.id?.toString() ||
              (d.sourceInvoiceNumber && d.sourceInvoiceNumber?.toString() === inv.invoiceNumber?.toString())) &&
            d.type === "warehouse_remittance" &&
            d.status !== "voided" &&
            !d.isDeleted &&
            !d.isDraft
        );
        let delivered = 0;
        pastDocs.forEach((d: any) => {
          (d.items || []).forEach((it: any) => {
            delivered += Number(it.quantity) || 0;
          });
        });
        const total = physicalItems.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0);
        if (total > delivered) pendingSales++;
      } else if (inv.type === "sale_return") {
        pendingSaleReturns++;
      } else if (inv.type === "purchase_return") {
        pendingPurchaseReturns++;
      }
    });

    return { pendingPurchases, pendingSales, pendingSaleReturns, pendingPurchaseReturns };
  }, [invoices, products]);

  // Handler when selecting an invoice in Step 2
  const handleSelectInvoice = (sourceInv: any) => {
    if (!sourceInv) return;
    setSourceInvoiceId(sourceInv.id);

    const custObj = persons.find((p: any) => p.id?.toString() === sourceInv.customerId?.toString());
    const customerLabel = custObj?.alias || custObj?.name || sourceInv.customerName || "";

    if (isReceipt) {
      setInvoiceDescription(
        `رسید ورود به انبار - فاکتور مرجع #${sourceInv.invoiceNumber}${customerLabel ? ` (${customerLabel})` : ""}`
      );
    } else {
      setInvoiceDescription(
        `حواله خروج از انبار - فاکتور مرجع #${sourceInv.invoiceNumber}${customerLabel ? ` (${customerLabel})` : ""}`
      );
    }

    if (sourceInv.customerId) {
      setCustomerId(sourceInv.customerId);
    }
    if (sourceInv.currency) {
      setInvoiceCurrency(sourceInv.currency);
      setExchangeRate(sourceInv.exchangeRate || 1);
      setExchangeRateInput(String(sourceInv.exchangeRate || 1));
    }

    // Calculate processed amounts from existing warehouse docs for this invoice
    const targetDocType = isReceipt ? "warehouse_receipt" : "warehouse_remittance";
    const pastDocs = (invoices || []).filter(
      (i: any) =>
        (i.sourceInvoiceId?.toString() === sourceInv.id?.toString() ||
          (i.sourceInvoiceNumber &&
            i.sourceInvoiceNumber?.toString() === sourceInv.invoiceNumber?.toString())) &&
        i.type === targetDocType &&
        i.status !== "voided" &&
        !i.isDeleted &&
        !i.isDraft
    );

    const processedAmounts: Record<string, number> = {};
    pastDocs.forEach((doc: any) => {
      (doc.items || []).forEach((rt: any) => {
        const key = String(rt.productId || rt.productName || "");
        if (key) {
          processedAmounts[key] = (processedAmounts[key] || 0) + (Number(rt.quantity) || 0);
        }
      });
    });

    const remainingItems = (sourceInv.items || [])
      .filter((it: any) => {
        const prod = products.find(
          (p: any) => p.id?.toString() === it.productId?.toString()
        );
        return prod?.type !== "service";
      })
      .map((it: any) => {
        const prod = products.find((p: any) => p.id?.toString() === it.productId?.toString());
        const key = String(it.productId || it.productName || "");
        const processed = key ? processedAmounts[key] || 0 : 0;
        const originalQty = Number(it.quantity) || 0;
        const remaining = originalQty - processed;
        const remQty = remaining > 0 ? remaining : 0;
        const isSec =
          Boolean(it.isSecondaryUnit) ||
          (Boolean(prod?.secondaryUnit) && it.selectedUnit === prod?.secondaryUnit);
        const ratio = Number(it.unitRatio || prod?.unitRatio || 1);
        const dir =
          it.unitRatioDirection ||
          prod?.unitRatioDirection ||
          (prod ? getUnitRatioDirection(prod) : "secondary_to_main");
        const rawPrice = Number(it.unitPrice || it.price || 0);
        const baseQty = convertQuantityToBaseUnit(remQty, isSec, ratio, dir);
        const baseUnitPrice = convertPriceToBaseUnit(rawPrice, isSec, ratio, dir);

        return {
          ...it,
          id: generateId ? generateId() : Math.random().toString(36).substring(2, 9),
          maxQuantity: remQty,
          quantity: remQty,
          isSecondaryUnit: isSec,
          unitRatio: ratio,
          unitRatioDirection: dir,
          selectedUnit: it.selectedUnit || (isSec ? prod?.secondaryUnit : prod?.unit),
          baseQuantity: baseQty,
          baseUnitPrice: baseUnitPrice,
          warehouseId: invoiceWarehouseId || it.warehouseId || "",
        };
      })
      .filter((it: any) => it.quantity > 0);

    if (remainingItems.length === 0) {
      if (customAlert) {
        customAlert(
          "تمامی اقلام این فاکتور قبلاً در اسناد انبار تحویل شده‌اند و مانده‌ای برای صدور سند انبار وجود ندارد."
        );
      }
    }

    setItems(remainingItems);
    setWarehouseWizardStep(3);
  };

  // Handler for direct entry without invoice
  const handleDirectEntry = () => {
    setSourceInvoiceId("");
    setItems([]);
    if (isReceipt) {
      setInvoiceDescription("رسید مستقیم ورود به انبار (بدون فاکتور مرجع)");
    } else {
      setInvoiceDescription("حواله مستقیم خروج از انبار (بدون فاکتور مرجع)");
    }
    setWarehouseWizardStep(3);
  };

  // Step 3 helper: Fill all items with their max permitted quantity
  const handleFillAllMax = () => {
    setItems((prev: any[]) =>
      prev.map((it) => {
        if (typeof it.maxQuantity !== "undefined" && it.maxQuantity > 0) {
          return { ...it, quantity: it.maxQuantity };
        }
        return it;
      })
    );
  };

  // Step 3 helper: Remove items with zero quantity
  const handleRemoveZeroItems = () => {
    setItems((prev: any[]) => prev.filter((it) => Number(it.quantity) > 0));
  };

  // Find source invoice object for display in Step 3
  const sourceInvoiceObj = useMemo(() => {
    if (!sourceInvoiceId) return null;
    return invoices.find((i: any) => i.id?.toString() === sourceInvoiceId?.toString());
  }, [invoices, sourceInvoiceId]);

  // Selected warehouse name
  const currentWarehouseObj = useMemo(() => {
    return warehouses.find((w: any) => w.id?.toString() === invoiceWarehouseId?.toString());
  }, [warehouses, invoiceWarehouseId]);

  const currentWarehouseName = currentWarehouseObj?.name || currentWarehouseObj?.title || "انبار نامشخص";

  // Render Wizard Step Indicator Header
  const renderWizardProgress = () => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 mb-6">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {/* Step 1 */}
        <div
          onClick={() => setWarehouseWizardStep(1)}
          className={`flex items-center gap-2 cursor-pointer transition-colors ${
            warehouseWizardStep === 1
              ? "text-indigo-600 font-black"
              : warehouseWizardStep > 1
              ? "text-emerald-600 font-bold"
              : "text-slate-400"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              warehouseWizardStep === 1
                ? "bg-indigo-600 text-white shadow-sm ring-4 ring-indigo-50"
                : warehouseWizardStep > 1
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {warehouseWizardStep > 1 ? <Check className="w-4 h-4" /> : "۱"}
          </div>
          <span className="text-xs sm:text-sm">نوع عملیات و انبار</span>
        </div>

        <div className={`flex-1 h-0.5 mx-3 ${warehouseWizardStep > 1 ? "bg-emerald-400" : "bg-slate-200"}`}></div>

        {/* Step 2 */}
        <div
          onClick={() => {
            if (invoiceWarehouseId) setWarehouseWizardStep(2);
          }}
          className={`flex items-center gap-2 transition-colors ${
            invoiceWarehouseId ? "cursor-pointer" : "cursor-not-allowed opacity-60"
          } ${
            warehouseWizardStep === 2
              ? "text-indigo-600 font-black"
              : warehouseWizardStep > 2
              ? "text-emerald-600 font-bold"
              : "text-slate-400"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              warehouseWizardStep === 2
                ? "bg-indigo-600 text-white shadow-sm ring-4 ring-indigo-50"
                : warehouseWizardStep > 2
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {warehouseWizardStep > 2 ? <Check className="w-4 h-4" /> : "۲"}
          </div>
          <span className="text-xs sm:text-sm">انتخاب فاکتور مرجع</span>
        </div>

        <div className={`flex-1 h-0.5 mx-3 ${warehouseWizardStep > 2 ? "bg-emerald-400" : "bg-slate-200"}`}></div>

        {/* Step 3 */}
        <div
          className={`flex items-center gap-2 ${
            warehouseWizardStep === 3
              ? "text-indigo-600 font-black"
              : "text-slate-400 font-medium"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              warehouseWizardStep === 3
                ? "bg-indigo-600 text-white shadow-sm ring-4 ring-indigo-50"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            ۳
          </div>
          <span className="text-xs sm:text-sm">اقلام و صدور نهایی</span>
        </div>
      </div>
    </div>
  );

  // STEP 1: Operation & Warehouse Selection
  if (warehouseWizardStep === 1) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 text-right font-sans"
        dir="rtl"
      >
        {renderWizardProgress()}

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                گام اول
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                صدور رسید و حواله پایانه انبارداری
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ابتدا انبار هدف و نوع عملیات ورود یا خروج کالا را تعیین نمایید
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-xs">
              <WarehouseIcon className="w-6 h-6" />
            </div>
          </div>

          {/* Warehouse Selector */}
          <div>
            <label className="block text-sm font-extrabold text-slate-800 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <WarehouseIcon className="w-4 h-4 text-indigo-500" />
                انبار مبدا / مقصد عملیات:
              </span>
              <span className="text-xs font-normal text-slate-500">
                ({warehouses.filter((w: any) => w.isActive !== false).length} انبار فعال در سیستم)
              </span>
            </label>
            <select
              value={invoiceWarehouseId}
              onChange={(e) => setInvoiceWarehouseId(e.target.value)}
              className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-bold text-slate-800 outline-none cursor-pointer transition-all"
            >
              <option value="">-- لطفاً انبار مورد نظر را انتخاب نمایید --</option>
              {warehouses
                .filter((w: any) => w.isActive !== false)
                .map((v: any, index: number) => (
                  <option key={`${v.id}-${index}`} value={v.id}>
                    {v.name || v.title || `انبار ${v.id}`}
                  </option>
                ))}
            </select>
            {!invoiceWarehouseId && (
              <p className="text-[11px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 inline" /> انتخاب انبار برای بررسی کاردکس و ثبت سند الزامی است.
              </p>
            )}
          </div>

          {/* Operation Cards */}
          <div>
            <label className="block text-sm font-extrabold text-slate-800 mb-3">
              انتخاب نوع سند و عملیات انبارداری:
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Receipt Group (ورود به انبار) */}
              <div
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  isReceipt
                    ? "border-emerald-500 bg-emerald-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
                onClick={() => {
                  setWarehouseOperationType("purchase_invoice");
                  setInvoiceType("warehouse_receipt");
                  setInvoiceTitle("رسید انبار (ورود)");
                  setSourceInvoiceId("");
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        رسید انبار (ورود کالا)
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">افزایش موجودی کالا در انبار</span>
                    </div>
                  </div>
                  {isReceipt && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <label
                    onClick={(e) => {
                      e.stopPropagation();
                      setWarehouseOperationType("purchase_invoice");
                      setInvoiceType("warehouse_receipt");
                      setInvoiceTitle("رسید انبار (ورود از خرید)");
                      setSourceInvoiceId("");
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      warehouseOperationType === "purchase_invoice"
                        ? "bg-emerald-600 text-white font-bold"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span>بر اساس فاکتور خرید کالا</span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                        warehouseOperationType === "purchase_invoice"
                          ? "bg-emerald-700 text-white"
                          : "bg-emerald-50 text-emerald-700 font-bold"
                      }`}
                    >
                      {pendingInvoicesSummary.pendingPurchases} فاکتور منتظر رسید
                    </span>
                  </label>

                  <label
                    onClick={(e) => {
                      e.stopPropagation();
                      setWarehouseOperationType("sales_return");
                      setInvoiceType("warehouse_receipt");
                      setInvoiceTitle("رسید انبار (ورود از برگشت فروش)");
                      setSourceInvoiceId("");
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      warehouseOperationType === "sales_return"
                        ? "bg-emerald-600 text-white font-bold"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span>بر اساس برگشت از فروش</span>
                    <span className="text-[11px] text-slate-400">فاکتورهای مرجوعی</span>
                  </label>

                  <label
                    onClick={(e) => {
                      e.stopPropagation();
                      setWarehouseOperationType("transfer_in");
                      setInvoiceType("warehouse_receipt");
                      setInvoiceTitle("رسید انبار (انتقال بین‌انباری / سایر ورود)");
                      setSourceInvoiceId("");
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      warehouseOperationType === "transfer_in"
                        ? "bg-emerald-600 text-white font-bold"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span>انتقال به این انبار / مستقیم / سایر</span>
                    <span className="text-[11px] text-slate-400">ورود بدون فاکتور</span>
                  </label>
                </div>
              </div>

              {/* Remittance Group (خروج از انبار) */}
              <div
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  !isReceipt
                    ? "border-indigo-500 bg-indigo-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
                onClick={() => {
                  setWarehouseOperationType("sales_invoice");
                  setInvoiceType("warehouse_remittance");
                  setInvoiceTitle("حواله انبار (خروج)");
                  setSourceInvoiceId("");
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        حواله انبار (خروج کالا)
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">کاهش موجودی کالا در انبار</span>
                    </div>
                  </div>
                  {!isReceipt && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <label
                    onClick={(e) => {
                      e.stopPropagation();
                      setWarehouseOperationType("sales_invoice");
                      setInvoiceType("warehouse_remittance");
                      setInvoiceTitle("حواله انبار (خروج فروش)");
                      setSourceInvoiceId("");
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      warehouseOperationType === "sales_invoice"
                        ? "bg-indigo-600 text-white font-bold"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span>بر اساس فاکتور فروش کالا</span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                        warehouseOperationType === "sales_invoice"
                          ? "bg-indigo-700 text-white"
                          : "bg-indigo-50 text-indigo-700 font-bold"
                      }`}
                    >
                      {pendingInvoicesSummary.pendingSales} فاکتور منتظر حواله
                    </span>
                  </label>

                  <label
                    onClick={(e) => {
                      e.stopPropagation();
                      setWarehouseOperationType("purchase_return");
                      setInvoiceType("warehouse_remittance");
                      setInvoiceTitle("حواله انبار (خروج برگشت خرید)");
                      setSourceInvoiceId("");
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      warehouseOperationType === "purchase_return"
                        ? "bg-indigo-600 text-white font-bold"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span>بر اساس برگشت از خرید</span>
                    <span className="text-[11px] text-slate-400">مرجوعی به تامین‌کننده</span>
                  </label>

                  <label
                    onClick={(e) => {
                      e.stopPropagation();
                      setWarehouseOperationType("transfer_out");
                      setInvoiceType("warehouse_remittance");
                      setInvoiceTitle("حواله انبار (انتقال بین‌انباری / مصرف داخلی)");
                      setSourceInvoiceId("");
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      warehouseOperationType === "transfer_out"
                        ? "bg-indigo-600 text-white font-bold"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span>انتقال از این انبار / مصرف داخلی / ضایعات</span>
                    <span className="text-[11px] text-slate-400">خروج بدون فاکتور</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Action */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-bold">
              {invoiceWarehouseId ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 inline" /> انبار انتخاب شد: {currentWarehouseName}
                </span>
              ) : (
                <span className="text-slate-400">لطفاً برای ادامه انبار را انتخاب کنید</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!invoiceWarehouseId) {
                  if (customAlert) customAlert("لطفاً ابتدا انبار مبدا/مقصد را مشخص کنید.");
                  return;
                }
                setWarehouseWizardStep(2);
              }}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-sm transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2"
            >
              <span>مرحله بعد: انتخاب فاکتور مرجع</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // STEP 2: Dedicated, Professional Invoice Selector
  if (warehouseWizardStep === 2) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 text-right font-sans"
        dir="rtl"
      >
        {renderWizardProgress()}

        <WarehouseInvoiceSelector
          invoices={invoices}
          products={products}
          persons={persons}
          warehouses={warehouses}
          invoiceWarehouseId={invoiceWarehouseId}
          isReceipt={isReceipt}
          warehouseOperationType={warehouseOperationType}
          onSelectInvoice={handleSelectInvoice}
          onDirectEntry={handleDirectEntry}
          onBack={() => setWarehouseWizardStep(1)}
          formatCurrency={formatCurrency}
          handleVoidInvoice={handleVoidInvoice}
          getProductStockInfo={getProductStockInfo}
          storeSettings={storeSettings}
        />
      </motion.div>
    );
  }

  // STEP 3: Final Document Issuance & Items Verification
  if (warehouseWizardStep === 3) {
    const totalLineItems = (items || []).length;
    const totalPhysicalUnits = (items || []).reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 text-right font-sans"
        dir="rtl"
      >
        {renderWizardProgress()}

        {/* Source Invoice Linked Banner */}
        {sourceInvoiceObj ? (
          <div className="bg-indigo-50/80 rounded-2xl p-5 border border-indigo-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-mono font-black shadow-sm">
                #{sourceInvoiceObj.invoiceNumber}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-indigo-900">
                    فاکتور مرجع {sourceInvoiceObj.type === "purchase" ? "خرید" : "فروش"}
                  </span>
                  <span className="text-xs font-bold text-slate-500">• تاریخ: {sourceInvoiceObj.date}</span>
                  <span className="text-xs font-bold text-slate-500">
                    • مبلغ کل: {formatCurrency(sourceInvoiceObj.totalAmount || 0)} {sourceInvoiceObj.currency || "تومان"}
                  </span>
                </div>
                <div className="text-xs text-indigo-700 font-bold mt-0.5">
                  طرف حساب:{" "}
                  {persons.find((p: any) => p.id?.toString() === sourceInvoiceObj.customerId?.toString())?.alias ||
                    persons.find((p: any) => p.id?.toString() === sourceInvoiceObj.customerId?.toString())?.name ||
                    sourceInvoiceObj.customerName ||
                    "نامشخص"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center">
              <button
                type="button"
                onClick={() => setWarehouseWizardStep(2)}
                className="px-4 py-2 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                تغییر فاکتور مرجع
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-500" />
              صدور سند مستقیم انبار (بدون اتصال به فاکتور مرجع)
            </span>
            <button
              type="button"
              onClick={() => setWarehouseWizardStep(2)}
              className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
            >
              اتصال به یک فاکتور مرجع...
            </button>
          </div>
        )}

        {/* General Info Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              {isReceipt ? (
                <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
              ) : (
                <ArrowUpRight className="w-6 h-6 text-indigo-600" />
              )}
              {invoiceTitle} - مشخصات عمومی سند
            </h2>
            <button
              type="button"
              onClick={() => setWarehouseWizardStep(2)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 text-xs transition-colors cursor-pointer"
            >
              مرحله قبل
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Document Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isReceipt ? "شماره رسید انبار" : "شماره حواله انبار"}
              </label>
              <div className="flex gap-2">
                <select
                  value={invoiceMode}
                  onChange={(e) => setInvoiceMode(e.target.value as "auto" | "manual")}
                  className="p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-xs font-bold"
                >
                  <option value="auto">سیستمی (خودکار)</option>
                  <option value="manual">شماره دستی</option>
                </select>
                {invoiceMode === "manual" ? (
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="flex-1 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-left font-bold text-sm"
                    dir="ltr"
                    placeholder="شماره سند..."
                  />
                ) : (
                  <div className="flex-1 p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono text-left opacity-80 flex items-center justify-end font-bold text-sm text-slate-700">
                    {invoiceNumber || "در حال رزرو..."}
                  </div>
                )}
              </div>
            </div>

            {/* Document Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                {isReceipt ? "تاریخ رسید انبار" : "تاریخ حواله انبار"}
              </label>
              <div className="relative">
                <DatePicker
                  value={date}
                  onChange={setDate}
                  calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                  locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="w-full pl-11 pr-4 p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-indigo-950 font-sans font-black text-center transition-all cursor-pointer shadow-xs text-sm"
                  containerClassName="w-full"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Customer / Supplier Person */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <User className="w-4 h-4 text-indigo-500" /> طرف حساب / تحویل‌دهنده / تحویل‌گیرنده
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    options={(activePersonsOnly || []).map((p: any) => ({
                      value: p.id,
                      label: p.alias || p.name,
                      subLabel: p.phone || undefined,
                      badge: getRoleName(p.role),
                      imageUrl: p.imageUrl,
                      searchStr: `${p.alias || ""} ${p.name || ""} ${p.title || ""} ${p.firstName || ""} ${p.lastName || ""} ${p.phone || ""} ${p.nationalId || ""}`,
                    }))}
                    value={String(customerId || "")}
                    onChange={(val) => setCustomerId(val)}
                    placeholder="-- انتخاب شخص --"
                    searchPlaceholder="جستجوی شخص..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                  className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-3 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                  title="تعریف شخص جدید"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Target Warehouse */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <WarehouseIcon className="w-4 h-4 text-indigo-500" /> انبار مربوطه
              </label>
              <div className="w-full p-2.5 bg-slate-50 text-slate-800 font-extrabold rounded-xl border border-slate-200 text-center text-sm">
                {currentWarehouseName}
              </div>
            </div>

            {/* Description */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <FileText className="w-4 h-4 text-emerald-500" /> شرح و توضیحات سند
              </label>
              <input
                type="text"
                value={invoiceDescription || ""}
                onChange={(e) => setInvoiceDescription(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold bg-white"
                placeholder="توضیحات مربوط به این سند انبار..."
              />
            </div>

            {/* Note / Tracking Code */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Tag className="w-4 h-4 text-emerald-500" /> یادداشت / شماره بارنامه / کد پیگیری
              </label>
              <input
                type="text"
                value={invoiceNote || ""}
                onChange={(e) => setInvoiceNote(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold bg-white"
                placeholder="مثال: بارنامه شماره ۱۲۳۴۵، راننده رضایی"
              />
            </div>
          </div>
        </div>

        {/* Items List Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2 whitespace-nowrap text-base">
                <Package className="w-5 h-5 text-indigo-600" />
                اقلام سند انبار ({totalLineItems} ردیف - {totalPhysicalUnits} واحد)
              </h3>
            </div>

            {/* Helper Actions Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              {sourceInvoiceObj && (
                <>
                  <button
                    type="button"
                    onClick={handleFillAllMax}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="تنظیم تمام سطرها روی حداکثر مقدار مانده فاکتور"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    تنظیم مقادیر به سقف مانده
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveZeroItems}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="حذف سطرهایی که مقدار صفر دارند"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف سطرهای صفر
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 shadow-xs rounded-lg font-bold hover:bg-slate-100 flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> افزودن سطر خالی
              </button>
            </div>
          </div>

          {/* Quick Scanner & Product Add Bar */}
          <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-2">
            <div className="flex gap-2">
              <FastBarcodeScanner onScan={handleFastBarcodeScan} />
            </div>
            <div className="flex-1">
              <SearchableSelect
                options={products
                  .filter((p: any) => p.isActive !== false && p.type !== "service")
                  .map((p: any) => ({
                    value: p.id,
                    label: p.name,
                    subLabel: formatProductStockDetails(p),
                    badge: "کالا",
                    searchStr: `${p.code || ""} ${p.barcode || ""} ${p.name || ""}`,
                  }))}
                value=""
                onChange={(val) => handleFastAddProduct(String(val))}
                placeholder="🔎 جستجو و افزودن کالای جدید به سند..."
                searchPlaceholder="جستجوی نام یا بارکد کالا..."
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[800px] text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-3.5 text-center w-12">ردیف</th>
                  <th className="p-3.5 text-right w-[45%]">شرح کالا</th>
                  <th className="p-3.5 text-center w-40">تعداد سند</th>
                  <th className="p-3.5 text-center w-36 border-r border-slate-100">واحد سنجش</th>
                  <th className="p-3.5 text-center w-14 border-r border-slate-100">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(items || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-400 font-bold text-sm bg-slate-50/30">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package className="w-8 h-8 text-slate-300" />
                        <span>هیچ کالایی در این سند درج نشده است.</span>
                        <span className="text-xs text-slate-400">
                          از کادر بالا یا دکمه افزودن سطر، کالاهای مورد نظر را انتخاب نمایید.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (items || []).map((item: any, index: number) => {
                    const p = products.find((prod: any) => prod.id?.toString() === item.productId?.toString());
                    const stockInfo = getProductStockInfo ? getProductStockInfo(item.productId) : null;
                    const targetWh = (invoiceWarehouseId || p?.warehouseId || "").toString();
                    const currentStockInWh =
                      targetWh && stockInfo?.warehouses?.[targetWh]
                        ? Number(stockInfo.warehouses[targetWh].physical || 0)
                        : stockInfo
                        ? Number(stockInfo.totalPhysical || 0)
                        : Number(p?.stock || 0);

                    const isSec =
                      Boolean(item.isSecondaryUnit) ||
                      (Boolean(p?.secondaryUnit) && item.selectedUnit === p?.secondaryUnit);
                    const ratio = Number(item.unitRatio || p?.unitRatio || 1);
                    const dir =
                      item.unitRatioDirection ||
                      p?.unitRatioDirection ||
                      (p ? getUnitRatioDirection(p) : "secondary_to_main");
                    const itemRawQty = Number(item.quantity) || 0;
                    const itemBaseQty = convertQuantityToBaseUnit(itemRawQty, isSec, ratio, dir);
                    const isRemittance = !isReceipt;
                    const isShortage = isRemittance && itemBaseQty > currentStockInWh;

                    return (
                      <tr key={item.id || index} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 text-center font-bold text-slate-400 font-mono">
                          {index + 1}
                        </td>

                        <td className="p-3.5">
                          {item.productId ? (
                            <div className="font-extrabold text-slate-800 flex flex-col gap-1">
                              <span className="text-sm">{item.productName}</span>
                              <div className="flex flex-col gap-1 mt-0.5">
                                <span className="text-xs text-slate-400 font-normal flex gap-2 flex-wrap items-center">
                                  {p?.code && (
                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                      کد: {p.code}
                                    </span>
                                  )}
                                  {p?.barcode && (
                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                      بارکد: {p.barcode}
                                    </span>
                                  )}
                                </span>

                                <div className="flex items-center gap-2 flex-wrap text-[11px] font-sans mt-0.5">
                                  <span className="text-slate-500 font-medium">موجودی کاردکس در انبار:</span>
                                  <span
                                    className={`font-bold font-mono px-1.5 py-0.5 rounded ${
                                      currentStockInWh > 0 ? "bg-slate-100 text-indigo-700" : "bg-rose-50 text-rose-600"
                                    }`}
                                    dir="ltr"
                                  >
                                    {currentStockInWh} {p?.unit || item.selectedUnit || "عدد"}
                                  </span>

                                  {isReceipt && itemBaseQty > 0 && (
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px]" dir="ltr">
                                      مانده بعد از ورود: {currentStockInWh + itemBaseQty}
                                    </span>
                                  )}

                                  {isRemittance && itemBaseQty > 0 && !isShortage && (
                                    <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold text-[10px]" dir="ltr">
                                      مانده بعد از خروج: {currentStockInWh - itemBaseQty}
                                    </span>
                                  )}

                                  {isRemittance && isShortage && (
                                    <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-black text-[10px] flex items-center gap-1 animate-pulse">
                                      <AlertTriangle className="w-3 h-3 text-rose-600 inline" />
                                      کسری موجودی: {itemBaseQty - currentStockInWh} {p?.unit || ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="نام کالا دلخواه..."
                              value={item.productName}
                              onChange={(e) => handleItemChange(item.id, "productName", e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                            />
                          )}
                        </td>

                        {/* Quantity Field */}
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1">
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  if (
                                    typeof item.maxQuantity !== "undefined" &&
                                    item.maxQuantity > 0 &&
                                    val > item.maxQuantity
                                  ) {
                                    if (customAlert) {
                                      customAlert(
                                        `حداکثر مقدار مجاز طبق فاکتور مرجع: ${item.maxQuantity} ${item.selectedUnit || ""}`
                                      );
                                    }
                                    handleItemChange(item.id, "quantity", item.maxQuantity);
                                  } else {
                                    handleItemChange(item.id, "quantity", e.target.value);
                                  }
                                }}
                                className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-center font-black text-slate-900 outline-none text-sm"
                                dir="ltr"
                              />
                            </div>

                            {typeof item.maxQuantity !== "undefined" && item.maxQuantity > 0 && (
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-1">
                                <span>سقف مانده فاکتور:</span>
                                <span className="font-mono text-indigo-700 font-bold">
                                  {item.maxQuantity}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Unit Selection */}
                        <td className="p-3.5 text-center">
                          {(() => {
                            const hasSecondary = p?.secondaryUnit;
                            return (
                              <div className="flex flex-col gap-1">
                                {hasSecondary ? (
                                  <select
                                    value={item.isSecondaryUnit ? "true" : "false"}
                                    onChange={(e) =>
                                      handleItemChange(
                                        item.id,
                                        "isSecondaryUnit",
                                        e.target.value === "true"
                                      )
                                    }
                                    className="w-full p-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer focus:ring-2 focus:ring-slate-400"
                                  >
                                    <option value="false">{p.unit} (اصلی)</option>
                                    <option value="true">{p.secondaryUnit} (فرعی)</option>
                                  </select>
                                ) : p ? (
                                  <div className="w-full p-2 text-center text-slate-700 font-bold bg-slate-50 border border-slate-100 rounded-xl text-xs">
                                    {p.unit || "-"}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={item.selectedUnit || ""}
                                    onChange={(e) =>
                                      handleItemChange(item.id, "selectedUnit", e.target.value)
                                    }
                                    placeholder="واحد..."
                                    className="w-full p-2 text-center text-slate-700 font-bold bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Remove Action */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                            title="حذف سطر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Actions & Final Submission */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600 font-bold space-y-1 text-center sm:text-right">
              <div>
                تعداد کل اقلام: <span className="font-mono text-slate-900 font-black text-sm">{totalPhysicalUnits}</span> واحد در{" "}
                <span className="font-mono text-slate-900 font-black text-sm">{totalLineItems}</span> سطر
              </div>
              <div className="text-[11px] text-slate-400">
                با ثبت این سند، مقادیر مستقیماً در کاردکس انبار {currentWarehouseName} اعمال و ذخیره خواهند شد.
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setWarehouseWizardStep(2)}
                className="flex-1 sm:flex-none px-5 py-3 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                مرحله قبل
              </button>

              <button
                type="button"
                onClick={() => {
                  if ((items || []).length === 0) {
                    if (customAlert) customAlert("هیچ کالایی به این سند اضافه نشده است.");
                    return;
                  }

                  const hasZeroQty = (items || []).some((it: any) => (Number(it.quantity) || 0) <= 0);
                  if (hasZeroQty) {
                    if (customAlert) customAlert("لطفاً مقادیر تعداد تمامی سطرهای کالا را بزرگتر از صفر وارد نمایید.");
                    return;
                  }

                  // Shortage check for remittance
                  if (!isReceipt && getProductStockInfo) {
                    const targetWh = invoiceWarehouseId ? invoiceWarehouseId.toString() : "";
                    const shortages: string[] = [];
                    (items || []).forEach((it: any) => {
                      if (it.productId) {
                        const p = products.find((prod: any) => prod.id === it.productId);
                        if (p && p.type !== "service") {
                          const sInfo = getProductStockInfo(it.productId);
                          const cur =
                            targetWh && sInfo?.warehouses?.[targetWh]
                              ? Number(sInfo.warehouses[targetWh].physical || 0)
                              : sInfo
                              ? Number(sInfo.totalPhysical || 0)
                              : Number(p.stock || 0);
                          const q = Number(it.quantity) || 0;
                          if (q > cur) {
                            shortages.push(
                              `• ${it.productName}: موجودی فعلی ${cur}، مقدار حواله ${q} (کسری: ${q - cur})`
                            );
                          }
                        }
                      }
                    });

                    if (shortages.length > 0) {
                      const msg = `توجه: اقلام زیر در کاردکس انبار ${currentWarehouseName} با کسری موجودی مواجه هستند:\n\n${shortages.join(
                        "\n"
                      )}\n\nآیا مایلید با وجود کسری موجودی، سند حواله صادر گردد؟`;
                      // Non-blocking confirmation
                      if (window.confirm && !window.confirm(msg)) {
                        return;
                      }
                    }
                  }

                  handleInvoicePreviewTrigger();
                }}
                disabled={submitting || (items || []).length === 0}
                className={`flex-1 sm:flex-none px-8 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
                  isReceipt
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg"
                }`}
              >
                {submitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <span>
                  {isReceipt ? "صدور و تایید نهایی رسید انبار" : "صدور و تایید نهایی حواله انبار"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
