import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Barcode from "react-barcode";
import { 
    History, CheckCircle, Package, ScanLine, Box, User, Wallet, DollarSign, ArrowLeft, Calculator,
    Plus, Minus, Edit2, Trash2, Printer, CreditCard, AlertCircle, Save, ShoppingCart, Search,
    Calendar as CalendarIcon, Users, Briefcase, Phone, MapPin, UserPlus, Download, Upload, RefreshCw,
    Lock, Unlock, Eye, EyeOff, X, Maximize2, Minimize2, Settings, LogOut, Home, LayoutDashboard,
    Layers, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, MoreVertical, MoreHorizontal,
    Menu, Camera, Image, Video, Mic, Play, Pause, FileText, Folder, FolderPlus, File, FilePlus,
    ArrowUp, ArrowDown, ArrowRight, FileSpreadsheet, PieChart, BarChart2, TrendingUp, TrendingDown,
    Activity, AlertTriangle, Info, HelpCircle, Bell, Clock, Tag, Bookmark, Star, Heart, ThumbsUp,
    ThumbsDown, Share2, Link, Copy, Paperclip, Mail, MessageCircle, MessageSquare, Send, AtSign,
    Globe, Award, Gift, Coffee
, Calendar, CornerDownLeft, Sparkles, LayoutGrid, Building2, Zap, Truck, UserCheck} from "lucide-react";
import BulkProductPickerModal from "./BulkProductPickerModal";
import { getUnitRatioDirection, getPriceForSelectedUnit, convertQuantityToBaseUnit } from "../../utils/unitConversion";
import { useDirtyForm } from "../../hooks/useDirtyForm";
import { UnsavedChangesPrompt } from "../common/UnsavedChangesPrompt";
import { saleInvoiceFormSchema } from "../../schemas/validation";

export default function SaleInvoiceCreate(props: any) {
  const {
    handleBulkAddProducts,
    handleAddBlankRow,
    handleDuplicateItem,
    handleIncrementQuantity,
    productCategories,
    hasDraft,
    restoreDraft,
    clearDraft,
    successMsg,
    editingInvoiceId,
    invoiceNumber,
    toPersianDigits,
    date,
    setDate,
    persian,
    persian_fa,
    items,
    setItems,
    handleItemChange,
    products,
    handleRemoveItem,
    calculateFinalTotal,
    storeSettings,
    CurrencyInput,
    Package,
    invoiceWarehouseId,
    setInvoiceWarehouseId,
    warehouses,
    FastBarcodeScanner,
    handleFastBarcodeScan,
    SearchableSelect,
    handleFastAddProduct,
    setIsScannerOpen,
    ScanLine,
    setIsProductModalOpen,
    Box,
    invoiceTitle,
    invoiceMode,
    setInvoiceMode,
    setInvoiceNumber,
    setInvoiceTitle, setIsPersonModalOpen,
    User,
    activePersonsOnly,
    getRoleName,
    customerId,
    setCustomerId,
    renderPersonInfoBox,
    overallDiscountPercent,
    setOverallDiscountPercent,
    formatCurrency,
    invoiceOriginalTotal,
    invoiceCurrency,
    invoiceTotalDiscount,
    numToPersianWords,
    submitting,
    saveInvoiceData,
    handleInvoicePreviewTrigger,
    formatNumber,
    Plus,
    Trash2,
    CheckCircle,
    History,
    Save,
    ShoppingCart,
    RefreshCw,
    FileText,
    Info,
    Tag
  ,
    invoiceType,
    setInvoiceType,
    DatePicker,
    invoiceDueDate,
    setInvoiceDueDate,
    invoiceDescription,
    setInvoiceDescription,
    invoiceNote,
    setInvoiceNote,
    calculateProductCurrentStock,
    formatProductStockDetails,
    activeTab,
    calculateSubtotal,
    getProductStockInfo,
    invoices,
    customAlert,
    driverPersonId,
    setDriverPersonId,
    driverName,
    setDriverName,
    driverPhone,
    setDriverPhone,
    receiverPersonId,
    setReceiverPersonId,
    receiverName,
    setReceiverName,
    receiverPhone,
    setReceiverPhone,
    vehiclePlateNumber,
    setVehiclePlateNumber,
    shippingAddress,
    setShippingAddress,
  } = props;
  const itemsEndRef = useRef<HTMLDivElement>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [prevItemsLength, setPrevItemsLength] = useState((items || []).length);

  // Layout modes: 'pos' (فروش سریع بارکدی) | 'official' (فاکتور رسمی شرکتی)
  const [invoiceLayoutMode, setInvoiceLayoutMode] = useState<'pos' | 'official'>('pos');
  const [buyerNationalId, setBuyerNationalId] = useState('');
  const [buyerEconomicCode, setBuyerEconomicCode] = useState('');
  const [buyerPostalCode, setBuyerPostalCode] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<'cash' | 'credit' | 'cheque'>('cash');
  const [warehouseChangePrompt, setWarehouseChangePrompt] = useState<{ newWhId: string; whName: string } | null>(null);
  const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);

  // Dirty Form Detection
  const isDirty = useMemo(() => {
    return (items || []).some((it: any) => it && (it.productId || Number(it.quantity) > 0));
  }, [items]);

  const { showPrompt, guardNavigation, confirmDiscard, cancelDiscard } = useDirtyForm({
    isDirty,
    message: 'فاکتور دارای اقلام ثبت‌شده است. آیا از خروج بدون ذخیره مطمئنید؟'
  });

  useEffect(() => {
    if ((items || []).length > prevItemsLength) {
      itemsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    setPrevItemsLength((items || []).length);
  }, [items]);

  const isNegativeStockAllowed = Boolean(
    storeSettings?.allowNegativeStock === true ||
    storeSettings?.allowNegativeStock === "true" ||
    storeSettings?.allowNegativeStock === 1
  );

  const productMap = useMemo(() => {
    const map: Record<string, any> = {};
    (products || []).forEach((p: any) => {
      map[p.id?.toString()] = p;
    });
    return map;
  }, [products]);

  const rowStockErrors = useMemo(() => {
    const errors: Record<
      string,
      {
        isDeficit: boolean;
        productName: string;
        warehouseName: string;
        availableStock: number;
        requestedQty: number;
        deficit: number;
        unitName: string;
        rowNumber: number;
      }
    > = {};

    const targetWhId = (invoiceWarehouseId || "").toString();
    const whMap: Record<string, any> = {};
    (warehouses || []).forEach((w: any) => {
      whMap[w.id?.toString()] = w;
    });
    
    const whObj = whMap[targetWhId];
    const defaultWhName = whObj ? whObj.name : "انبار انتخاب شده";

    const consumedPerProduct: Record<string, number> = {};

    let originalInvoice: any = null;
    if (editingInvoiceId && Array.isArray(invoices)) {
      originalInvoice = invoices.find(
        (i: any) => i.id?.toString() === editingInvoiceId?.toString()
      );
    }

    (items || []).forEach((item: any, index: number) => {
      if (!item || !item.productId) return;
      const prod = productMap[item.productId?.toString()];
      if (!prod || prod.type === "service") return;

      const itemWhId = (item.warehouseId || targetWhId).toString();
      const currentWhObj = whMap[itemWhId];
      const warehouseName = currentWhObj ? currentWhObj.name : defaultWhName;

      const itemQty = Number(item.quantity) || 0;
      if (itemQty <= 0) return;

      const dir = prod.unitRatioDirection || getUnitRatioDirection(prod);
      const neededQtyInBase = convertQuantityToBaseUnit(itemQty, Boolean(item.isSecondaryUnit), Number(prod.unitRatio), dir);

      let availableInBase = 0;
      if (typeof getProductStockInfo === "function") {
        const stockInfo = getProductStockInfo(prod.id);
        if (itemWhId && stockInfo?.warehouses && stockInfo.warehouses[itemWhId]) {
          availableInBase =
            stockInfo.warehouses[itemWhId].available ??
            stockInfo.warehouses[itemWhId].physical ??
            0;
        } else if (!itemWhId) {
          availableInBase = stockInfo?.totalAvailable ?? stockInfo?.totalPhysical ?? 0;
        }
      } else if (typeof calculateProductCurrentStock === "function") {
        availableInBase = calculateProductCurrentStock(prod.id) || 0;
      } else if (prod.stock !== undefined) {
        availableInBase = Number(prod.stock) || 0;
      }

      // If editing existing invoice, add back this invoice's original quantity for this item
      let originalQtyInBase = 0;
      if (originalInvoice && originalInvoice.type === "sale" && Array.isArray(originalInvoice.items)) {
        const origItem = originalInvoice.items.find(
          (oi: any) =>
            oi.productId?.toString() === item.productId?.toString() &&
            (oi.warehouseId?.toString() === itemWhId ||
              (!oi.warehouseId && itemWhId === targetWhId))
        );
        if (origItem) {
          const origDir = origItem.unitRatioDirection || dir;
          originalQtyInBase = convertQuantityToBaseUnit(
            origItem.quantity,
            Boolean(origItem.isSecondaryUnit),
            Number(origItem.unitRatio || prod.unitRatio),
            origDir
          );
        }
      }

      const totalEffectiveAvailableInBase = availableInBase + originalQtyInBase;
      const productKey = `${prod.id}_${itemWhId}`;
      const previouslyConsumed = consumedPerProduct[productKey] || 0;
      const availableForThisRowInBase = Math.max(
        0,
        totalEffectiveAvailableInBase - previouslyConsumed
      );

      if (itemWhId && neededQtyInBase > availableForThisRowInBase) {
        const availableInDisplayUnit = item.isSecondaryUnit
          ? (dir === "main_to_secondary"
              ? Number((availableForThisRowInBase * (prod.unitRatio || 1)).toFixed(2))
              : (prod.unitRatio && prod.unitRatio > 1
                  ? Number((availableForThisRowInBase / prod.unitRatio).toFixed(2))
                  : availableForThisRowInBase))
          : availableForThisRowInBase;
        const deficitInBase = neededQtyInBase - availableForThisRowInBase;
        const deficitInDisplayUnit = item.isSecondaryUnit
          ? (dir === "main_to_secondary"
              ? Number((deficitInBase * (prod.unitRatio || 1)).toFixed(2))
              : (prod.unitRatio && prod.unitRatio > 1
                  ? Number((deficitInBase / prod.unitRatio).toFixed(2))
                  : deficitInBase))
          : Number(deficitInBase.toFixed(2));
        const unitName =
          item.isSecondaryUnit && prod.secondaryUnit
            ? prod.secondaryUnit
            : prod.unit || "عدد";

        errors[item.id] = {
          isDeficit: true,
          productName: prod.name,
          warehouseName,
          availableStock: Math.max(0, availableInDisplayUnit),
          requestedQty: itemQty,
          deficit: Math.max(0, deficitInDisplayUnit),
          unitName,
          rowNumber: index + 1,
        };
      }

      consumedPerProduct[productKey] = previouslyConsumed + neededQtyInBase;
    });

    return errors;
  }, [
    items,
    productMap,
    invoiceWarehouseId,
    warehouses,
    editingInvoiceId,
    invoices,
    getProductStockInfo,
    calculateProductCurrentStock,
  ]);

  const handleWarehouseHeaderChange = (newWhId: string) => {
    if (!newWhId) {
      setInvoiceWarehouseId("");
      return;
    }
    const hasExistingItems = (items || []).some(
      (it: any) => it.productId || it.productName
    );
    if (hasExistingItems) {
      const targetWhObj = warehouses.find(
        (w: any) => String(w.id) === String(newWhId)
      );
      const whName = targetWhObj ? targetWhObj.name : "انبار انتخاب شده";
      setWarehouseChangePrompt({ newWhId, whName });
    } else {
      setInvoiceWarehouseId(newWhId);
    }
  };

  const handleApplyWarehouseToAllRows = () => {
    if (!warehouseChangePrompt) return;
    const { newWhId } = warehouseChangePrompt;
    setInvoiceWarehouseId(newWhId);
    if (setItems) {
      setItems((prev: any[]) =>
        prev.map((it: any) => ({
          ...it,
          warehouseId: newWhId,
        }))
      );
    }
    setWarehouseChangePrompt(null);
  };

  const handleApplyWarehouseToHeaderOnly = () => {
    if (!warehouseChangePrompt) return;
    const { newWhId } = warehouseChangePrompt;
    setInvoiceWarehouseId(newWhId);
    setWarehouseChangePrompt(null);
  };

  const handleCancelWarehouseChange = () => {
    setWarehouseChangePrompt(null);
  };

  const handleTriggerSaveWithValidation = () => {
    const cleanItems = (items || []).filter((it: any) => it && it.productId);
    
    // Safely normalize date to string if it is a Date or DateObject instance
    let dateStr = '';
    if (date instanceof Date || (date && Object.prototype.toString.call(date) === '[object Date]')) {
      dateStr = !isNaN((date as any).getTime()) ? (date as any).toISOString() : new Date().toISOString();
    } else if (date && typeof (date as any).toISOString === 'function') {
      try {
        dateStr = (date as any).toISOString();
      } catch (_) {
        dateStr = new Date().toISOString();
      }
    } else if (date && typeof (date as any).toDate === 'function') {
      try {
        const d = (date as any).toDate();
        dateStr = d && !isNaN(new Date(d).getTime()) ? new Date(d).toISOString() : new Date().toISOString();
      } catch (_) {
        dateStr = new Date().toISOString();
      }
    } else if (date && typeof (date as any).format === 'function') {
      try {
        dateStr = (date as any).format() || new Date().toISOString();
      } catch (_) {
        dateStr = new Date().toISOString();
      }
    } else if (date) {
      dateStr = String(date).trim();
    } else {
      dateStr = new Date().toISOString();
    }

    let dueDateStr: string | undefined = undefined;
    if (invoiceDueDate instanceof Date) {
      dueDateStr = !isNaN(invoiceDueDate.getTime()) ? invoiceDueDate.toISOString() : undefined;
    } else if (invoiceDueDate) {
      dueDateStr = String(invoiceDueDate).trim() || undefined;
    }

    const validationResult = saleInvoiceFormSchema.safeParse({
      invoiceNumber: invoiceNumber || 'AUTO',
      date: dateStr,
      customerId: customerId || (invoiceLayoutMode === 'pos' ? 'retail_cash' : null),
      items: cleanItems,
      invoiceType,
      posFastMode: invoiceLayoutMode === 'pos',
      warehouseId: invoiceWarehouseId,
      description: invoiceDescription,
      nationalId: buyerNationalId,
      economicCode: buyerEconomicCode,
      postalCode: buyerPostalCode,
      invoiceDueDate: dueDateStr
    });

    if (!validationResult.success) {
      const issues = (validationResult.error as any).issues || (validationResult.error as any).errors || [];
      const errorMsg = issues.map((err: any) => `• ${err.message}`).join('\n');
      if (typeof customAlert === 'function') {
        customAlert(`خطا در اعتبارسنجی فرم فاکتور:\n${errorMsg}`);
      } else {
        alert(`خطا در اعتبارسنجی فرم فاکتور:\n${errorMsg}`);
      }
      return;
    }

    if (invoiceLayoutMode === 'official' && !customerId) {
      if (typeof customAlert === 'function') {
        customAlert('در حالت فاکتور رسمی، انتخاب مشتری / طرف حساب ثبت‌شده الزامی است.');
      } else {
        alert('در حالت فاکتور رسمی، انتخاب مشتری / طرف حساب ثبت‌شده الزامی است.');
      }
      return;
    }

    if (!isNegativeStockAllowed && Object.keys(rowStockErrors).length > 0) {
      const firstErrKey = Object.keys(rowStockErrors)[0];
      const firstErr = rowStockErrors[firstErrKey];
      const el = document.getElementById(`sale-invoice-item-row-${firstErrKey}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof customAlert === "function") {
        customAlert(
          `خطای کسری موجودی در ردیف ${firstErr.rowNumber}:\nتعداد وارد شده برای کالای «${firstErr.productName}» از موجودی انبار «${firstErr.warehouseName}» بیشتر است.\nردیف‌های دارای کسری با کادر قرمز رنگ مشخص شده‌اند.`
        );
      }
      return;
    }

    if (!customerId && invoiceLayoutMode === 'pos' && Array.isArray(activePersonsOnly)) {
      const cashPerson = activePersonsOnly.find((p: any) => 
        p.name?.includes('نقدی') || p.name?.includes('متفرقه') || p.name?.includes('حضوری')
      ) || activePersonsOnly[0];
      if (cashPerson && setCustomerId) {
        setCustomerId(cashPerson.id);
      }
    }

    handleInvoicePreviewTrigger();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if inside an active textarea unless it's Ctrl+S or Ctrl+Enter
      const target = e.target as HTMLElement | null;
      const isTextArea = target?.tagName?.toLowerCase() === "textarea";

      if (e.key === "F4") {
        e.preventDefault();
        setIsBulkModalOpen(true);
      } else if (e.key === "F2" || (e.ctrlKey && e.key.toLowerCase() === "s") || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        handleTriggerSaveWithValidation();
      } else if (e.key === "F1" && !isTextArea) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="بارکد"], input[placeholder*="جستجو"], input[placeholder*="کالا"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } else if (e.key === "F3" && !isTextArea) {
        e.preventDefault();
        if (typeof handleAddBlankRow === "function") {
          handleAddBlankRow();
        }
      } else if (e.key === "F8" && !isTextArea) {
        e.preventDefault();
        if (typeof setIsPersonModalOpen === "function") {
          setIsPersonModalOpen(true);
        }
      } else if (e.key === "F9" && !isTextArea) {
        e.preventDefault();
        setInvoiceLayoutMode(prev => prev === "pos" ? "official" : "pos");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, customerId, invoiceNumber, date, rowStockErrors, isNegativeStockAllowed, invoiceLayoutMode, handleTriggerSaveWithValidation, handleAddBlankRow, setIsPersonModalOpen]);

  return (
<motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-right font-sans"
          >
            {hasDraft && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center text-amber-800 shadow-sm col-span-full w-full">
                <span className="font-bold flex items-center gap-2.5 mb-3 md:mb-0">
                  <History className="w-5 h-5 text-amber-500" /> یک فاکتور
                  ناتمام و ثبت نشده بازیابی شد. مایلید از آن استفاده کنید یا
                  فاکتور جدیدی آغاز کنید؟
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={restoreDraft}
                    className="px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-sm font-bold transition-colors"
                  >
                    بازیابی فاکتور ناتمام
                  </button>
                  <button
                    onClick={clearDraft}
                    className="px-4 py-2.5 bg-white border border-amber-200 hover:bg-amber-50 rounded-xl text-sm font-bold transition-colors"
                  >
                    پاک کردن و فاکتور جدید
                  </button>
                </div>
              </div>
            )}
            {successMsg && (
              <div className="bg-indigo-50 text-indigo-700 px-5 py-4 rounded-xl flex items-center gap-3 border border-indigo-100 font-bold shadow-sm">
                <CheckCircle className="w-5 h-5" />
                {successMsg}
              </div>
            )}
            {editingInvoiceId && (
              <div className="bg-amber-50 text-amber-900 px-5 py-4 rounded-2xl flex items-center justify-between gap-3 border border-amber-200/60 font-bold shadow-xs">
                <div className="flex items-center gap-2.5">
                  <Info className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    شما در حال ویرایش فاکتور پیش‌نویس/ثبت‌شده شماره{" "}
                    <strong className="text-amber-950">
                      #{toPersianDigits(invoiceNumber)}
                    </strong>{" "}
                    هستید. تغییرات جدید جایگزین نسخه قبلی خواهد شد.
                  </span>
                </div>
                <button
                  onClick={clearDraft}
                  className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  انصراف از ویرایش
                </button>
              </div>
            )}

            {/* Modern 2-Column Responsive Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Main Column (8 cols): Header, Fast Entry Bar, Items Table, Collapsible Logistics */}
              <div className="lg:col-span-8 space-y-5">
                {/* Compact Invoice Header Card */}
                <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900 leading-tight">
                          {invoiceTitle}
                        </h2>
                        <span className="text-[11px] text-slate-400 font-bold">
                          {invoiceLayoutMode === 'pos' ? 'فروش سریع بارکدی و تسویه آنی' : 'فاکتور رسمی شرکتی و تجاری'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
                      {/* Segmented Mode Control */}
                      <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setInvoiceLayoutMode('pos')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            invoiceLayoutMode === 'pos'
                              ? 'bg-white text-indigo-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <ScanLine className="w-3.5 h-3.5" />
                          <span>فروشگاهی (POS)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoiceLayoutMode('official')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            invoiceLayoutMode === 'official'
                              ? 'bg-white text-indigo-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>فاکتور رسمی</span>
                        </button>
                      </div>

                      {/* Invoice Type */}
                      <select
                        value={invoiceType}
                        onChange={(e) => {
                          setInvoiceType(e.target.value as any);
                          if (e.target.value === "proforma") {
                            setInvoiceTitle("پیش‌فاکتور (بدون کسر موجودی)");
                          } else {
                            setInvoiceTitle("فاکتور فروش کالا");
                          }
                        }}
                        className="h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-indigo-700 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="sale">فروش استاندارد</option>
                        <option value="proforma">پیش‌فاکتور</option>
                      </select>
                    </div>
                  </div>

              {/* Compact Core Details (4-field high speed row) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
                {/* 1. Customer (5 cols) */}
                <div className="sm:col-span-2 lg:col-span-5">
                  <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>مشتری / طرف حساب</span>
                      <span className="text-rose-500 font-extrabold">*</span>
                    </span>
                    {customerId && (
                      <span className="text-[11px] font-bold text-indigo-600">
                        انتخاب شده
                      </span>
                    )}
                  </label>
                  <div className="flex gap-1.5">
                    <div className="flex-1 border border-indigo-100 rounded-xl bg-indigo-50/20 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                      <SearchableSelect
                        options={(activePersonsOnly || []).map((p) => ({
                          value: p.id,
                          label: p.alias || p.name,
                          subLabel: p.phone || undefined,
                          badge: getRoleName(p.role),
                          imageUrl: p.imageUrl,
                          searchStr: `${p.alias || ""} ${p.name || ""} ${p.title || ""} ${p.firstName || ""} ${p.lastName || ""} ${p.phone || ""} ${p.nationalId || ""} ${p.personCode || ""} ${p.companyName || ""} ${p.fatherName || ""}`,
                        }))}
                        value={customerId}
                        onChange={(val) => setCustomerId(val)}
                        placeholder="-- جستجوی مشتری (نام، تلفن، کد) --"
                        searchPlaceholder="جستجوی سریع شخص یا شرکت..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl px-3 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="تعریف مشتری جدید"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Warehouse (3 cols) */}
                <div className="sm:col-span-1 lg:col-span-3">
                  <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-indigo-600" />
                    <span>انبار خروج کالا</span>
                    <span className="text-rose-500 font-extrabold">*</span>
                  </label>
                  <select
                    value={invoiceWarehouseId}
                    onChange={(e) => handleWarehouseHeaderChange(e.target.value)}
                    className="w-full h-[42px] px-3 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20 text-xs font-bold text-slate-800 outline-none transition-colors"
                  >
                    <option value="">-- انتخاب انبار --</option>
                    {warehouses
                      .filter((w) => w.isActive !== false)
                      .map((v, index) => (
                        <option key={`${v.id}-${index}`} value={v.id}>
                          {v.name} {v.isDefault || v.isDefaultSales ? "★" : ""}
                        </option>
                      ))}
                  </select>
                </div>

                {/* 3. Invoice Number (2 cols) */}
                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>شماره فاکتور</span>
                    <button
                      type="button"
                      onClick={() => setInvoiceMode(invoiceMode === "auto" ? "manual" : "auto")}
                      className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      {invoiceMode === "auto" ? "دستی؟" : "خودکار؟"}
                    </button>
                  </label>
                  {invoiceMode === "manual" ? (
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full h-[42px] px-3 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-left font-bold text-slate-800 outline-none bg-white text-xs"
                      dir="ltr"
                      placeholder="شماره فاکتور..."
                    />
                  ) : (
                    <div className="w-full h-[42px] px-3 border border-indigo-100 rounded-xl bg-indigo-50/30 font-mono text-left font-black text-slate-700 flex items-center justify-end text-xs">
                      {invoiceNumber || "خودکار..."}
                    </div>
                  )}
                </div>

                {/* 4. Date (2 cols) */}
                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>تاریخ صدور</span>
                  </label>
                  <div className="relative">
                    <DatePicker
                      value={date}
                      onChange={setDate}
                      calendar={
                        storeSettings?.calendarType === "gregorian"
                          ? undefined
                          : persian
                      }
                      locale={
                        storeSettings?.calendarType === "gregorian"
                          ? undefined
                          : persian_fa
                      }
                      calendarPosition="bottom-right"
                      inputClass="w-full h-[42px] pl-8 pr-2.5 bg-indigo-50/20 hover:bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 font-mono font-bold text-center transition-all cursor-pointer outline-none text-xs"
                      containerClassName="w-full"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra details toggle button */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsExtraInfoOpen(!isExtraInfoOpen)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-indigo-100"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExtraInfoOpen ? "rotate-180" : ""}`} />
                  <span>{isExtraInfoOpen ? "بستن جزئیات تکمیلی، سررسید و حمل" : "افزودن اطلاعات تکمیلی، سررسید، حمل و راننده"}</span>
                  {(invoiceDueDate || invoiceDescription || invoiceNote || driverName || vehiclePlateNumber) && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="اطلاعات تکمیلی وارد شده" />
                  )}
                </button>

                {customerId && (
                  <div className="text-[11px] font-bold text-slate-500 hidden sm:block">
                    {renderPersonInfoBox(customerId, "inline-flex items-center gap-2 text-slate-600")}
                  </div>
                )}
              </div>

              {/* Collapsible Details Panel */}
              {(isExtraInfoOpen || invoiceLayoutMode === "official") && (
                <div className="mt-2 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" /> عنوان فاکتور
                      </label>
                      <input
                        type="text"
                        value={invoiceTitle}
                        onChange={(e) => setInvoiceTitle(e.target.value)}
                        className="w-full h-[38px] px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 outline-none bg-white text-xs"
                        placeholder="عنوان فاکتور..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-rose-500" /> تاریخ سررسید تسویه
                      </label>
                      <div className="relative">
                        <DatePicker
                          value={invoiceDueDate}
                          onChange={setInvoiceDueDate}
                          calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                          locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                          calendarPosition="bottom-right"
                          inputClass="w-full h-[38px] pl-8 pr-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 text-rose-950 font-mono font-bold text-center transition-all cursor-pointer outline-none text-xs"
                          containerClassName="w-full"
                          placeholder="انتخاب سررسید..."
                        />
                        {invoiceDueDate && (
                          <button onClick={() => setInvoiceDueDate(null)} className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 p-1">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-rose-500">
                          <CalendarIcon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" /> یادداشت / کد پیگیری
                      </label>
                      <input
                        type="text"
                        value={invoiceNote || ""}
                        onChange={(e) => setInvoiceNote(e.target.value)}
                        className="w-full h-[38px] px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 outline-none bg-white text-xs"
                        placeholder="کد پیگیری، حواله یا ارجاع..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" /> توضیحات فاکتور
                      </label>
                      <input
                        type="text"
                        value={invoiceDescription || ""}
                        onChange={(e) => setInvoiceDescription(e.target.value)}
                        className="w-full h-[38px] px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 outline-none bg-white text-xs"
                        placeholder="توضیحات و شرایط تحویل..."
                      />
                    </div>
                  </div>

                  {/* Logistics & Driver Subsection */}
                  <div className="pt-3 border-t border-slate-200/60">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-800 mb-3">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      <span>مشخصات راننده، تحویل‌گیرنده و حمل بار</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600 flex items-center gap-1">
                          <User className="w-3 h-3 text-indigo-600" />
                          <span>راننده / متصدی حمل</span>
                        </label>
                        <SearchableSelect
                          options={(activePersonsOnly || []).map((p: any) => ({
                            value: p.id,
                            label: p.alias || p.name,
                            subLabel: p.phone || p.mobile || undefined,
                            badge: getRoleName ? getRoleName(p.role) : undefined,
                            imageUrl: p.imageUrl,
                            searchStr: `${p.alias || ""} ${p.name || ""} ${p.phone || ""} ${p.mobile || ""}`,
                          }))}
                          value={driverPersonId || ""}
                          onChange={(val: any) => {
                            if (setDriverPersonId) setDriverPersonId(val);
                            const foundPerson = (activePersonsOnly || []).find((p: any) => String(p.id) === String(val));
                            if (foundPerson) {
                              if (setDriverName) setDriverName(foundPerson.name || foundPerson.alias || "");
                              if (setDriverPhone) setDriverPhone(foundPerson.phone || foundPerson.mobile || "");
                            }
                          }}
                          placeholder="انتخاب راننده..."
                          searchPlaceholder="جستجوی شخص راننده..."
                        />
                        <div className="flex gap-1.5 pt-0.5">
                          <input
                            type="text"
                            value={driverName || ""}
                            onChange={(e) => setDriverName && setDriverName(e.target.value)}
                            placeholder="نام راننده..."
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                          />
                          <input
                            type="text"
                            dir="ltr"
                            value={driverPhone || ""}
                            onChange={(e) => setDriverPhone && setDriverPhone(e.target.value)}
                            placeholder="تلفن..."
                            className="w-28 h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-600 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            <span>شخص تحویل‌گیرنده</span>
                          </label>
                          {customerId && (
                            <button
                              type="button"
                              onClick={() => {
                                const foundCustomer = (activePersonsOnly || []).find((p: any) => String(p.id) === String(customerId));
                                if (foundCustomer) {
                                  if (setReceiverPersonId) setReceiverPersonId(foundCustomer.id);
                                  if (setReceiverName) setReceiverName(foundCustomer.name || foundCustomer.alias || "");
                                  if (setReceiverPhone) setReceiverPhone(foundCustomer.phone || foundCustomer.mobile || "");
                                }
                              }}
                              className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                            >
                              خود مشتری
                            </button>
                          )}
                        </div>
                        <SearchableSelect
                          options={(activePersonsOnly || []).map((p: any) => ({
                            value: p.id,
                            label: p.alias || p.name,
                            subLabel: p.phone || p.mobile || undefined,
                            badge: getRoleName ? getRoleName(p.role) : undefined,
                            imageUrl: p.imageUrl,
                            searchStr: `${p.alias || ""} ${p.name || ""} ${p.phone || ""} ${p.mobile || ""}`,
                          }))}
                          value={receiverPersonId || ""}
                          onChange={(val: any) => {
                            if (setReceiverPersonId) setReceiverPersonId(val);
                            const foundPerson = (activePersonsOnly || []).find((p: any) => String(p.id) === String(val));
                            if (foundPerson) {
                              if (setReceiverName) setReceiverName(foundPerson.name || foundPerson.alias || "");
                              if (setReceiverPhone) setReceiverPhone(foundPerson.phone || foundPerson.mobile || "");
                            }
                          }}
                          placeholder="انتخاب تحویل‌گیرنده..."
                          searchPlaceholder="جستجوی تحویل‌گیرنده..."
                        />
                        <div className="flex gap-1.5 pt-0.5">
                          <input
                            type="text"
                            value={receiverName || ""}
                            onChange={(e) => setReceiverName && setReceiverName(e.target.value)}
                            placeholder="نام گیرنده..."
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                          />
                          <input
                            type="text"
                            dir="ltr"
                            value={receiverPhone || ""}
                            onChange={(e) => setReceiverPhone && setReceiverPhone(e.target.value)}
                            placeholder="تلفن..."
                            className="w-28 h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-amber-600" />
                          <span>پلاک و مدل خودرو</span>
                        </label>
                        <input
                          type="text"
                          value={vehiclePlateNumber || ""}
                          onChange={(e) => setVehiclePlateNumber && setVehiclePlateNumber(e.target.value)}
                          placeholder="مثال: وانت مزدا - ۶۸ / ۱۲۳ ب ۴۵"
                          className="w-full h-[38px] px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-600" />
                          <span>آدرس و مقصد تحویل بار</span>
                        </label>
                        <input
                          type="text"
                          value={shippingAddress || ""}
                          onChange={(e) => setShippingAddress && setShippingAddress(e.target.value)}
                          placeholder="نشانی محل تخلیه بار..."
                          className="w-full h-[38px] px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Official Commercial Invoice Details */}
                  {invoiceLayoutMode === "official" && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>مشخصات تکمیلی فاکتور رسمی تجاری (سازمان امور مالیاتی)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">شناسه ملی / کد ملی خریدار</label>
                          <input
                            type="text"
                            dir="ltr"
                            value={buyerNationalId}
                            onChange={(e) => setBuyerNationalId(e.target.value)}
                            placeholder="۱۰ یا ۱۱ رقم..."
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">کد اقتصادی خریدار</label>
                          <input
                            type="text"
                            dir="ltr"
                            value={buyerEconomicCode}
                            onChange={(e) => setBuyerEconomicCode(e.target.value)}
                            placeholder="۱۲ رقم کد اقتصادی..."
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">کد پستی ۱۰ رقمی خریدار</label>
                          <input
                            type="text"
                            dir="ltr"
                            value={buyerPostalCode}
                            onChange={(e) => setBuyerPostalCode(e.target.value)}
                            placeholder="کد پستی..."
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">شرایط تسویه رسمی</label>
                          <select
                            value={paymentTerms}
                            onChange={(e: any) => setPaymentTerms(e.target.value)}
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                          >
                            <option value="cash">نقدی (کارتخوان / نقد)</option>
                            <option value="credit">اعتباری / نسیه رسمی</option>
                            <option value="cheque">چک صیادی مدت‌دار</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items List */}
            <div
              className="bg-white rounded-3xl shadow-sm border-2 border-indigo-50 "
              data-invoice-flow="sale"
            >
              {/* Items List Top Fast Entry Bar */}
              <div className="p-4 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/40 border-b border-indigo-100 flex flex-col gap-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 whitespace-nowrap text-sm">
                      <Package className="w-4 h-4 text-indigo-600" />
                      <span>لیست اقلام فاکتور</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                      {toPersianDigits((items || []).length)} ردیف
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsBulkModalOpen(true)}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="انتخاب کاتالوگی و افزودن دسته‌ای اقلام (F4)"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                      <span>کاتالوگ (F4)</span>
                    </button>
                    {handleAddBlankRow && (
                      <button
                        type="button"
                        onClick={handleAddBlankRow}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="افزودن یک سطر خالی دستی"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500" />
                        <span>سطر خالی</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsProductModalOpen(true)}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="تعریف کالای جدید"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>کالای جدید</span>
                    </button>
                  </div>
                </div>

                {/* Instant Entry Controls (Barcode + Search Select) */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <div className="shrink-0 w-full sm:w-auto">
                    <FastBarcodeScanner onScan={handleFastBarcodeScan} />
                  </div>

                  <div className="flex-1 w-full relative z-20">
                    <div className="border border-indigo-200 hover:border-indigo-400 focus-within:border-indigo-500 rounded-xl bg-white shadow-2xs transition-all">
                      <SearchableSelect
                        menuPlacement="bottom"
                        options={products
                          .filter(
                            (p) =>
                              p.isActive !== false &&
                              (storeSettings.allowNegativeStock ||
                                p.type === "service" ||
                                calculateProductCurrentStock(p.id) > 0),
                          )
                          .map((p) => ({
                            value: p.id,
                            label: p.name,
                            subLabel: formatProductStockDetails(p),
                            badge: p.type === "service" ? "خدمات" : "کالا",
                            searchStr: `${p.code || ""} ${p.barcode || ""}`,
                          }))}
                        value=""
                        onChange={(val) => handleFastAddProduct(String(val))}
                        placeholder="⚡ جستجو و افزودن فوری کالا (نام، کد، بارکد)..."
                        searchPlaceholder="جستجوی آنی کالای مورد نظر برای فروش..."
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="p-2.5 bg-white border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer shrink-0"
                    title="اسکن بارکد با دوربین گوشی / وبکم"
                  >
                    <ScanLine className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Top Stock Shortage Alert Banner */}
              {Object.keys(rowStockErrors).length > 0 && (
                isNegativeStockAllowed ? (
                  <div className="m-5 mb-0 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-950 shadow-sm animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-200/80 rounded-xl text-amber-800 shrink-0 mt-0.5">
                        <Info className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-amber-950 flex items-center gap-2">
                          <span>مجوز فروش موجودی منفی انبار فعال است:</span>
                          <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            {toPersianDigits(Object.keys(rowStockErrors).length)} ردیف دارای کسری
                          </span>
                        </h4>
                        <p className="text-xs text-amber-900 font-bold mt-1 leading-relaxed">
                          برای اقلام دارای کسری با <span className="bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-black border border-amber-300">کادر زرد رنگ</span>، صدور فاکتور مجاز است و پس از ثبت، مانده موجودی این کالاها در کاردکس انبار به صورت منفی ذخیره خواهد شد.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const firstKey = Object.keys(rowStockErrors)[0];
                        if (firstKey) {
                          const el = document.getElementById(`sale-invoice-item-row-${firstKey}`);
                          el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                      className="self-end md:self-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>مشاهده ردیف‌های کسری</span>
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="m-5 mb-0 p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-rose-900 shadow-sm animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-rose-200/80 rounded-xl text-rose-700 shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-rose-900 flex items-center gap-2">
                          <span>هشدار کسری موجودی انبار:</span>
                          <span className="bg-rose-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            {toPersianDigits(Object.keys(rowStockErrors).length)} ردیف
                          </span>
                        </h4>
                        <p className="text-xs text-rose-700 font-bold mt-1 leading-relaxed">
                          تعداد وارد شده در ردیف‌های با <span className="bg-rose-200 text-rose-950 px-1.5 py-0.5 rounded font-black border border-rose-300">کادر قرمز رنگ</span> بیشتر از موجودی انبار انتخاب شده است. لطفاً تعداد اقلام را بررسی و اصلاح فرمایید.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const firstKey = Object.keys(rowStockErrors)[0];
                        if (firstKey) {
                          const el = document.getElementById(`sale-invoice-item-row-${firstKey}`);
                          el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                      className="self-end md:self-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>مشاهده ردیف خطا</span>
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                )
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-right min-w-[950px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 text-xs font-bold text-slate-500 border-b border-slate-200">
                      <th className="py-2.5 px-3 w-12 text-center">ردیف</th>
                      <th className="py-2.5 px-3 min-w-[220px] text-right">
                        شرح کالا / خدمات
                      </th>
                      <th className="py-2.5 px-3 w-36 text-center border-r border-slate-200/60">
                        انبار خروج
                      </th>
                      <th className="py-2.5 px-3 w-36 text-center border-r border-slate-200/60">
                        تعداد
                      </th>
                      <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200/60">
                        واحد
                      </th>
                      <th className="py-2.5 px-3 w-40 border-r border-slate-200/60 text-left text-slate-700">
                        فی ({invoiceCurrency})
                      </th>
                      <th className="py-2.5 px-3 w-24 text-center border-r border-slate-200/60">
                        تخفیف %
                      </th>
                      <th className="py-2.5 px-3 w-36 border-r border-slate-200/60 text-left text-slate-700">
                        مبلغ کل ({invoiceCurrency})
                      </th>
                      <th className="py-2.5 px-2 w-20 text-center border-r border-slate-200/60">
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(items || []).length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-12 text-center text-slate-400 font-bold text-sm bg-slate-50/30"
                        >
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Box className="w-8 h-8 text-slate-300" />
                            <span>
                              هیچ کالا یا خدماتی به این سند اضافه نشده است.
                              برای شروع کالا جستجو کنید یا سطر جدید بسازید.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {(items || []).map((item, index) => {
                      const stockErr = rowStockErrors[item.id];
                      const isBlockingDeficit = Boolean(stockErr && !isNegativeStockAllowed);
                      const isAllowedDeficit = Boolean(stockErr && isNegativeStockAllowed);

                      return (
                      <tr
                        key={item.id}
                        id={`sale-invoice-item-row-${item.id}`}
                        className={`transition-colors text-sm ${
                          isBlockingDeficit
                            ? "bg-rose-50/70 hover:bg-rose-50"
                            : isAllowedDeficit
                            ? "bg-amber-50/60 hover:bg-amber-50"
                            : "hover:bg-slate-50/70"
                        }`}
                        data-row-type="sale-row"
                        data-has-stock-error={isBlockingDeficit ? "true" : "false"}
                        data-has-negative-stock={isAllowedDeficit ? "true" : "false"}
                      >
                        {/* شماره ردیف */}
                        <td className="py-2 px-3 text-center align-middle">
                          {isBlockingDeficit ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-600 text-white font-black text-xs shadow-xs"
                              title={`خطای کسری موجودی: ${formatNumber(stockErr?.deficit)} ${stockErr?.unitName || ""}`}
                            >
                              {index + 1}
                            </span>
                          ) : isAllowedDeficit ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-500 text-white font-black text-xs shadow-xs"
                              title={`موجودی منفی مجاز: ${formatNumber(stockErr?.deficit)} ${stockErr?.unitName || ""}`}
                            >
                              {index + 1}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold text-xs">{index + 1}</span>
                          )}
                        </td>

                        {/* شرح کالا / خدمات */}
                        <td className="py-2 px-3 align-middle">
                          {item.productId ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm leading-tight">
                                  {item.productName}
                                </span>
                                {(() => {
                                  const p = productMap[item.productId?.toString()];
                                  if (!p?.code && !p?.barcode) return null;
                                  return (
                                    <span className="text-[11px] text-slate-400 font-mono font-normal">
                                      {p.code ? `[${p.code}]` : `[${p.barcode}]`}
                                    </span>
                                  );
                                })()}
                              </div>
                              {isBlockingDeficit && stockErr && (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 mt-0.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>
                                    کسری انبار «{stockErr.warehouseName}»: {formatNumber(stockErr.deficit)} {stockErr.unitName} (موجودی آزاد: {formatNumber(stockErr.availableStock)})
                                  </span>
                                </div>
                              )}
                              {isAllowedDeficit && stockErr && (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 mt-0.5">
                                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>
                                    کسری منفی در «{stockErr.warehouseName}»: {formatNumber(stockErr.deficit)} {stockErr.unitName} (موجودی فعلی: {formatNumber(stockErr.availableStock)})
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="شرح کالا یا خدمات..."
                              value={item.productName}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "productName",
                                  e.target.value,
                                )
                              }
                              className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800 outline-none transition-all"
                            />
                          )}
                        </td>

                        {/* انبار خروج کالا */}
                        <td className="py-2 px-2 text-center align-middle border-r border-slate-200/60 min-w-[130px]">
                          {(() => {
                            const prod = productMap[item.productId?.toString()];
                            if (prod?.type === "service") {
                              return (
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-md">
                                  خدماتی
                                </span>
                              );
                            }
                            const currentWhId = (item.warehouseId || invoiceWarehouseId || "").toString();
                            return (
                              <select
                                value={currentWhId}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "warehouseId",
                                    e.target.value
                                  )
                                }
                                className="w-full h-8 text-xs font-bold py-1 px-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 outline-none transition-all cursor-pointer"
                                title="انتخاب یا تغییر انبار خروج این قلم کالا"
                              >
                                <option value="">-- انبار فاکتور --</option>
                                {warehouses
                                  .filter((w: any) => w.isActive !== false)
                                  .map((w: any) => (
                                    <option key={w.id} value={w.id}>
                                      {w.name} {w.isDefault || w.isDefaultSales ? "★" : ""}
                                    </option>
                                  ))}
                              </select>
                            );
                          })()}
                        </td>

                        {/* تعداد */}
                        <td className="py-2 px-3 align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (handleIncrementQuantity) {
                                  handleIncrementQuantity(item.id, -1);
                                } else {
                                  const current = Number(item.quantity) || 0;
                                  const next = Math.max(0.01, Number((current - 1).toFixed(4)));
                                  handleItemChange(item.id, "quantity", next);
                                }
                              }}
                              className="w-7 h-8 shrink-0 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                              title="کاهش یک واحد"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-20 min-w-0">
                              <input
                                type="text"
                                dir="ltr"
                                value={item.quantity !== undefined && item.quantity !== null ? item.quantity : ""}
                                onChange={(e) => {
                                  const raw = e.target.value
                                    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
                                    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
                                    .replace(/[^0-9.]/g, "");
                                  handleItemChange(item.id, "quantity", raw);
                                }}
                                className={`w-full h-8 px-1.5 rounded-lg font-mono text-center font-black outline-none transition-all text-sm ${
                                  isBlockingDeficit
                                    ? "bg-rose-50 border border-rose-400 text-rose-900 focus:ring-1 focus:ring-rose-500"
                                    : isAllowedDeficit
                                    ? "bg-amber-50 border border-amber-400 text-amber-950 focus:ring-1 focus:ring-amber-500"
                                    : "bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800"
                                }`}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (handleIncrementQuantity) {
                                  handleIncrementQuantity(item.id, 1);
                                } else {
                                  const current = Number(item.quantity) || 0;
                                  const next = Number((current + 1).toFixed(4));
                                  handleItemChange(item.id, "quantity", next);
                                }
                              }}
                              className="w-7 h-8 shrink-0 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-emerald-600 transition-colors cursor-pointer"
                              title="افزایش یک واحد"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* واحد */}
                        <td className="py-2 px-3 align-middle">
                          {(() => {
                            const product = item.productId
                              ? productMap[item.productId?.toString()]
                              : null;
                            const hasSecondary = product?.secondaryUnit;
                            if (hasSecondary) {
                              const dir = product.unitRatioDirection || getUnitRatioDirection(product);
                              const baseP = item.isSecondaryUnit
                                ? getPriceForSelectedUnit(item.unitPrice, false, product.unitRatio, dir)
                                : item.unitPrice;
                              const secP = getPriceForSelectedUnit(baseP, true, product.unitRatio, dir);
                              return (
                                <select
                                  value={
                                    item.isSecondaryUnit ? "true" : "false"
                                  }
                                  onChange={(e) =>
                                    handleItemChange(
                                      item.id,
                                      "isSecondaryUnit",
                                      e.target.value === "true",
                                    )
                                  }
                                  className="w-full h-8 px-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="false">
                                    {product.unit} (اصلی)
                                  </option>
                                  <option value="true">
                                    {product.secondaryUnit} (فرعی)
                                  </option>
                                </select>
                              );
                            }
                            if (product) {
                              return (
                                <div className="w-full h-8 px-2 flex items-center justify-center text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200/60 rounded-lg">
                                  {product.unit || "-"}
                                </div>
                              );
                            }
                            return (
                              <input
                                type="text"
                                value={item.selectedUnit || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "selectedUnit",
                                    e.target.value,
                                  )
                                }
                                placeholder="واحد"
                                className="w-full h-8 px-1 text-center text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                              />
                            );
                          })()}
                        </td>

                        {/* فی */}
                        <td className="py-2 px-3 align-middle">
                          <CurrencyInput
                            currencyLabel=""
                            showCurrencyBadge={false}
                            storeSettings={storeSettings}
                            value={item.unitPrice}
                            onChange={(e: any) =>
                              handleItemChange(
                                item.id,
                                "unitPrice",
                                e.target.value,
                              )
                            }
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans text-left font-bold text-slate-800 text-sm outline-none"
                          />
                        </td>

                        {/* تخفیف % */}
                        <td className="py-2 px-3 align-middle">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={item.discountPercent}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "discountPercent",
                                e.target.value,
                              )
                            }
                            className="w-full h-8 px-1 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-center text-rose-600 font-bold text-sm outline-none"
                            dir="ltr"
                          />
                        </td>

                        {/* مبلغ کل */}
                        <td
                          className="py-2 px-3 align-middle font-mono font-black text-left text-slate-900 text-sm whitespace-nowrap"
                          dir="ltr"
                        >
                          {formatCurrency(item.totalPrice)}
                        </td>

                        {/* عملیات */}
                        <td className="py-2 px-2 align-middle text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {handleDuplicateItem && (
                              <button
                                type="button"
                                onClick={() => handleDuplicateItem(item.id)}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                title="تکرار سطر"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="حذف سطر"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Table Footer: Summary count & quick actions */}
              <div ref={itemsEndRef as any} className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <span>مجموع اقلام فاکتور:</span>
                  <span className="font-mono font-black text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {toPersianDigits((items || []).reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0))}
                  </span>
                  <span>واحد در {toPersianDigits((items || []).length)} ردیف</span>
                </div>

                <div className="flex items-center gap-2">
                  {handleAddBlankRow && (
                    <button
                      type="button"
                      onClick={handleAddBlankRow}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="افزودن یک سطر خالی"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      <span>افزودن سطر</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(true)}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تعریف کالا</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* END OF MAIN 8-COLUMN SECTION */}

          {/* Sticky Settlement & Financial Totals Sidebar (4 columns) */}
          <div className="lg:col-span-4 sticky top-6 space-y-4">
            {/* Customer Status Card */}
            {customerId && (
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800 line-clamp-1">
                        {(() => {
                          const c = (activePersonsOnly || []).find((p: any) => String(p.id) === String(customerId));
                          return c ? (c.alias || c.name) : "مشتری انتخاب شده";
                        })()}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {(() => {
                          const c = (activePersonsOnly || []).find((p: any) => String(p.id) === String(customerId));
                          return c?.phone || c?.mobile || "";
                        })()}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {(() => {
                      const c = (activePersonsOnly || []).find((p: any) => String(p.id) === String(customerId));
                      return c && getRoleName ? getRoleName(c.role) : "مشتری";
                    })()}
                  </span>
                </div>
                {renderPersonInfoBox && (
                  <div className="pt-1.5 border-t border-slate-100 text-xs">
                    {renderPersonInfoBox(customerId, "text-xs")}
                  </div>
                )}
              </div>
            )}

            {/* Financial Summary Card */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-indigo-600" />
                  <span>صورت‌حساب فاکتور</span>
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {toPersianDigits((items || []).length)} قلم
                </span>
              </div>

              {/* Discount on whole invoice */}
              <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                  تخفیف روی فاکتور (%):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={overallDiscountPercent}
                    onChange={(e) => setOverallDiscountPercent(Number(e.target.value))}
                    className="w-16 h-8 px-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-center font-bold text-rose-600 outline-none text-xs"
                    dir="ltr"
                  />
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
              </div>

              {/* Calculation Lines */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-500">
                  <span>جمع ناخالص اقلام:</span>
                  <span className="font-mono font-bold text-slate-700" dir="rtl">
                    {formatCurrency(invoiceOriginalTotal())}{" "}
                    <span className="text-[10px] text-slate-400">{invoiceCurrency}</span>
                  </span>
                </div>

                <div className="flex justify-between items-center text-rose-600">
                  <span>مجموع کل تخفیف‌ها:</span>
                  <span className="font-mono font-bold text-rose-600" dir="rtl">
                    {invoiceTotalDiscount() > 0 ? "-" : ""}
                    {formatCurrency(invoiceTotalDiscount())}{" "}
                    <span className="text-[10px]">{invoiceCurrency}</span>
                  </span>
                </div>

                <div className="h-px bg-slate-100 my-1"></div>

                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>پس از کسر تخفیف سطری:</span>
                  <span className="font-mono font-bold text-slate-600" dir="rtl">
                    {formatCurrency(calculateSubtotal())}{" "}
                    <span className="text-[10px]">{invoiceCurrency}</span>
                  </span>
                </div>
              </div>

              {/* Big Net Payable Total */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-md space-y-2">
                <div className="flex justify-between items-center text-indigo-200 text-xs font-bold">
                  <span>مبلغ قابل پرداخت نهایی:</span>
                  <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded text-indigo-100 font-mono">
                    {invoiceCurrency}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-300 text-left" dir="ltr">
                  {formatCurrency(calculateFinalTotal())}
                </div>
                {calculateFinalTotal() > 0 && (
                  <p className="text-[11px] text-indigo-200 font-bold pt-1.5 border-t border-white/10 leading-relaxed text-right line-clamp-2">
                    {numToPersianWords(calculateFinalTotal())} {invoiceCurrency}
                  </p>
                )}
              </div>

              {/* Settlement & Save Actions */}
              <div className="space-y-2.5 pt-1">
                {/* Primary F2 Settlement Button */}
                <button
                  type="button"
                  onClick={handleTriggerSaveWithValidation}
                  disabled={submitting || (items || []).length === 0 || (!customerId && invoiceLayoutMode === "official")}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:bg-indigo-200 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-indigo-500/25 cursor-pointer relative"
                >
                  {submitting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                  )}
                  <span>ثبت و تسویه نهایی فاکتور</span>
                  <span className="font-mono text-[11px] bg-indigo-800/80 px-2 py-0.5 rounded text-indigo-100 mr-auto">
                    F2
                  </span>
                </button>

                {/* Secondary Draft Save Button */}
                <button
                  type="button"
                  disabled={submitting || (items || []).length === 0}
                  onClick={() => {
                    if (!isNegativeStockAllowed && Object.keys(rowStockErrors).length > 0) {
                      const firstErrKey = Object.keys(rowStockErrors)[0];
                      const firstErr = rowStockErrors[firstErrKey];
                      const el = document.getElementById(`sale-invoice-item-row-${firstErrKey}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      if (typeof customAlert === "function") {
                        customAlert(
                          `خطای کسری موجودی در ردیف ${firstErr.rowNumber}:\nتعداد وارد شده برای کالای «${firstErr.productName}» از موجودی انبار «${firstErr.warehouseName}» بیشتر است.`
                        );
                      }
                      return;
                    }
                    if (confirm("آیا از ذخیره این فاکتور به عنوان پیش‌نویس اطمینان دارید؟")) {
                      saveInvoiceData(null, true);
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] disabled:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>ذخیره موقت به عنوان پیش‌نویس</span>
                </button>
              </div>

              {/* Quick shortcut guide */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600 border border-slate-200">F2</kbd>
                  <span>تسویه</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600 border border-slate-200">F4</kbd>
                  <span>کاتالوگ</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600 border border-slate-200">Enter</kbd>
                  <span>افزودن</span>
                </span>
              </div>
            </div>
          </div>
          {/* END OF SIDEBAR (4 COLS) */}
        </div>
        {/* END OF 12-COL GRID */}

            {isBulkModalOpen && (
              <BulkProductPickerModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                products={products}
                categories={productCategories}
                onAddBulk={(selected) => {
                  if (handleBulkAddProducts) {
                    handleBulkAddProducts(selected);
                  } else {
                    selected.forEach((item) => {
                      handleFastAddProduct(String(item.productId), undefined, item.quantity);
                    });
                  }
                }}
                getProductStockInfo={getProductStockInfo}
                calculateProductCurrentStock={calculateProductCurrentStock}
                formatNumber={formatNumber}
                formatCurrency={formatCurrency}
                invoiceCurrency={invoiceCurrency}
                themeColor="indigo"
                toPersianDigits={toPersianDigits}
              />
            )}

            {/* Unsaved Changes Prompt */}
            <UnsavedChangesPrompt
              isOpen={showPrompt}
              onStay={cancelDiscard}
              onDiscard={confirmDiscard}
            />

            {/* Warehouse Change Confirmation Prompt */}
            {warehouseChangePrompt && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Box className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">تغییر انبار سطور فاکتور</h4>
                      <p className="text-xs text-slate-500 mt-0.5">انبار هدر به «{warehouseChangePrompt.whName}» تغییر یافت.</p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    شما انبار اصلی فاکتور را تغییر دادید. آیا مایلید انبار تمام سطرهای ثبت‌شده قبلی نیز به <strong>«{warehouseChangePrompt.whName}»</strong> تغییر یابد؟
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleApplyWarehouseToAllRows}
                      className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center shadow-xs"
                    >
                      بله، همه سطرها تغییر کنند
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyWarehouseToHeaderOnly}
                      className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                    >
                      خیر، فقط سطرهای جدید
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelWarehouseChange}
                      className="py-2.5 px-3 text-slate-400 hover:text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
  );
}
