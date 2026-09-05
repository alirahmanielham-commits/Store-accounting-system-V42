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
, Calendar, CornerDownLeft} from "lucide-react";

export default function SaleInvoiceCreate(props: any) {
  const {

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
    customAlert
  } = props;
  const itemsEndRef = useRef<HTMLDivElement>(null);
  const [prevItemsLength, setPrevItemsLength] = useState((items || []).length);
  useEffect(() => {
    if ((items || []).length > prevItemsLength) {
      itemsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setPrevItemsLength((items || []).length);
  }, [items]);

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
    const whObj = (warehouses || []).find((w: any) => w.id?.toString() === targetWhId);
    const defaultWhName = whObj ? whObj.name : "انبار انتخاب شده";

    const consumedPerProduct: Record<string, number> = {};

    (items || []).forEach((item: any, index: number) => {
      if (!item || !item.productId) return;
      const prod = (products || []).find(
        (p: any) => p.id?.toString() === item.productId?.toString()
      );
      if (!prod || prod.type === "service") return;

      const itemWhId = (item.warehouseId || targetWhId).toString();
      const currentWhObj = (warehouses || []).find((w: any) => w.id?.toString() === itemWhId);
      const warehouseName = currentWhObj ? currentWhObj.name : defaultWhName;

      const itemQty = Number(item.quantity) || 0;
      if (itemQty <= 0) return;

      const ratio = item.isSecondaryUnit && prod.unitRatio ? Number(prod.unitRatio) : 1;
      const neededQtyInBase = itemQty * ratio;

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
      if (editingInvoiceId && Array.isArray(invoices)) {
        const originalInvoice = invoices.find(
          (i: any) => i.id?.toString() === editingInvoiceId?.toString()
        );
        if (originalInvoice && originalInvoice.type === "sale" && Array.isArray(originalInvoice.items)) {
          const origItem = originalInvoice.items.find(
            (oi: any) =>
              oi.productId?.toString() === item.productId?.toString() &&
              (oi.warehouseId?.toString() === itemWhId ||
                (!oi.warehouseId && itemWhId === targetWhId))
          );
          if (origItem) {
            const origRatio =
              origItem.isSecondaryUnit && origItem.unitRatio
                ? Number(origItem.unitRatio)
                : 1;
            originalQtyInBase = (Number(origItem.quantity) || 0) * origRatio;
          }
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
        const availableInDisplayUnit =
          ratio > 1
            ? Number((availableForThisRowInBase / ratio).toFixed(2))
            : availableForThisRowInBase;
        const deficitInDisplayUnit = Number(
          (itemQty - availableInDisplayUnit).toFixed(2)
        );
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
          deficit:
            deficitInDisplayUnit > 0
              ? deficitInDisplayUnit
              : Number(
                  Math.max(
                    0,
                    (neededQtyInBase - availableForThisRowInBase) / ratio
                  ).toFixed(2)
                ),
          unitName,
          rowNumber: index + 1,
        };
      }

      consumedPerProduct[productKey] = previouslyConsumed + neededQtyInBase;
    });

    return errors;
  }, [
    items,
    products,
    invoiceWarehouseId,
    warehouses,
    editingInvoiceId,
    invoices,
    getProductStockInfo,
    calculateProductCurrentStock,
  ]);

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

            {/* Header Info */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-indigo-50">
              <div className="flex justify-between items-center mb-8 gap-4 border-b border-indigo-100 pb-5">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <span className="bg-indigo-100/50 p-2.5 rounded-xl text-indigo-600">
                    <ShoppingCart className="w-6 h-6" />
                  </span>
                  {invoiceTitle}
                </h2>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">
                    نوع فاکتور:
                  </span>
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
                    className="p-2 border border-gray-200 rounded-lg text-sm font-bold bg-white text-indigo-700 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="sale">فاکتور فروش (استاندارد)</option>
                    <option value="proforma">صدور پیش‌فاکتور</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">
                    شماره فاکتور فروش
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={invoiceMode}
                      onChange={(e) =>
                        setInvoiceMode(e.target.value as "auto" | "manual")
                      }
                      className="p-3 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30 text-sm font-bold text-indigo-900 outline-none"
                    >
                      <option value="auto">تولید خودکار</option>
                      <option value="manual">ورود دستی</option>
                    </select>
                    {invoiceMode === "manual" ? (
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="flex-1 p-3 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-left font-bold text-slate-800 outline-none bg-indigo-50/20"
                        dir="ltr"
                        placeholder="شماره دلخواه......"
                      />
                    ) : (
                      <div className="flex-1 p-3 border border-indigo-100 rounded-xl bg-indigo-50/20 font-mono text-left font-bold text-slate-800 opacity-70 flex items-center justify-end">
                        {invoiceNumber || "در حال رزرو..."}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-500" /> عنوان
                    فاکتور
                  </label>
                  <input
                    type="text"
                    value={invoiceTitle}
                    onChange={(e) => setInvoiceTitle(e.target.value)}
                    className="w-full p-3 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 outline-none bg-indigo-50/20"
                    placeholder="عنوانی برای فاکتور وارد کنید..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-500" /> تاریخ صدور فاکتور
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
                      inputClass="w-full pl-11 pr-4 p-3 bg-indigo-50/30 hover:bg-indigo-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-indigo-950 font-sans font-black text-center transition-all cursor-pointer outline-none text-sm"
                      containerClassName="w-full"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-rose-500" /> تاریخ سررسید (اختیاری)
                  </label>
                  <div className="relative">
                    <DatePicker
                      value={invoiceDueDate}
                      onChange={setInvoiceDueDate}
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
                      inputClass="w-full pl-11 pr-10 p-3 bg-rose-50/30 hover:bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white text-rose-950 font-sans font-black text-center transition-all cursor-pointer outline-none text-sm"
                      containerClassName="w-full"
                      placeholder="انتخاب سررسید"
                    />
                    {invoiceDueDate && <button onClick={() => setInvoiceDueDate(null)} className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 p-1"><X className="w-4 h-4" /></button>}
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-rose-500">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-500" /> مشتری (طرف
                    حساب)
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 border border-indigo-100 rounded-xl bg-indigo-50/30 focus-within:ring-2 focus-within:ring-indigo-500 transition-colors">
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
                      placeholder="-- جستجوی مشتری --"
                      searchPlaceholder="جستجوی شخص یا شرکت..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl px-4 flex items-center justify-center transition-colors"
                    title="تعریف مشتری جدید"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>
                {customerId &&
                    renderPersonInfoBox(
                      customerId,
                      "bg-indigo-50/50 border-indigo-100/50 text-slate-600",
                    )}
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-500" /> توضیحات
                  </label>
                  <input
                    type="text"
                    value={invoiceDescription || ""}
                    onChange={(e) => setInvoiceDescription(e.target.value)}
                    className="w-full p-3 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 outline-none bg-indigo-50/20"
                    placeholder="توضیحات و یادداشت..."
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-indigo-500" /> یادداشت / کد پیگیری
                  </label>
                  <input
                    type="text"
                    value={invoiceNote || ""}
                    onChange={(e) => setInvoiceNote(e.target.value)}
                    className="w-full p-3 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 outline-none bg-indigo-50/20"
                    placeholder="مثال: کد پیگیری ۱۲۳۴۵۶"
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-indigo-500" /> انبار فروش (خروج
                    کالا){" "}
                    <span className="text-rose-500 font-extrabold">*</span>
                  </label>
                  <select
                    value={invoiceWarehouseId}
                    onChange={(e) => setInvoiceWarehouseId(e.target.value)}
                    className="w-full p-3 border border-indigo-100/80 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30 text-base font-bold text-indigo-950 outline-none"
                  >
                    <option value="">
                      -- لطفاً انبار فروش را انتخاب کنید --
                    </option>
                    {warehouses
                      .filter((w) => w.isActive !== false)
                      .map((v, index) => (
                        <option key={`${v.id}-${index}`} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div
              className="bg-white rounded-3xl shadow-sm border-2 border-indigo-50 "
              data-invoice-flow="sale"
            >
              <div className="p-5 bg-indigo-50/30 border-b border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                  <Package className="w-5 h-5 text-indigo-600" /> لیست اقلام
                  آماده فروش
                </h3>
              </div>

              {/* Top Stock Shortage Alert Banner */}
              {Object.keys(rowStockErrors).length > 0 && (
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
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-right min-w-[1000px]">
                  <thead>
                    <tr className="bg-white text-xs font-black text-slate-400 border-b border-indigo-50">
                      <th className="p-5 w-12 text-center">ردیف</th>
                      <th className="p-5 min-w-[200px] w-[30%] text-right">
                        شرح کالا / خدمات
                      </th>
                      <th className="p-5 w-32 text-center border-r border-indigo-50/50">
                        تعداد
                      </th>
                      <th className="p-5 w-32 text-center border-r border-indigo-50/50">
                        واحد
                      </th>
                      <th className="p-5 w-48 border-r border-indigo-50/50 text-left text-indigo-800">
                        فی ({invoiceCurrency})
                      </th>
                      <th className="p-5 w-28 text-center border-r border-indigo-50/50">
                        تخفیف %
                      </th>
                      <th className="p-5 w-48 border-r border-indigo-50/50 text-left text-indigo-800">
                        مبلغ کل ({invoiceCurrency})
                      </th>
                      <th className="p-5 w-12 text-center border-r border-indigo-50/50">
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50/50">
                    {(items || []).length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-8 text-center text-indigo-400 font-bold text-sm bg-indigo-50/30"
                        >
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Box className="w-8 h-8 text-indigo-200" />
                            <span>
                              هیچ کالا یا خدماتی به این سند اضافه نشده است.
                              لطفاً جستجو کرده یا محصول جدیدی تعریف کنید.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {(items || []).map((item, index) => {
                      const stockErr = rowStockErrors[item.id];
                      return (
                      <tr
                        key={item.id}
                        id={`sale-invoice-item-row-${item.id}`}
                        className={`transition-all duration-300 ${
                          stockErr
                            ? "bg-rose-50/70 border-y-2 border-rose-500 shadow-sm ring-1 ring-rose-300"
                            : "hover:bg-indigo-50/20 transition-colors"
                        }`}
                        data-row-type="sale-row"
                        data-has-stock-error={stockErr ? "true" : "false"}
                      >
                        <td className={`p-5 text-center font-bold ${stockErr ? "border-y-2 border-r-2 border-rose-500 rounded-r-2xl bg-rose-50/90" : "text-slate-300"}`}>
                          {stockErr ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span
                                className="w-7 h-7 rounded-xl bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-sm ring-2 ring-rose-300 animate-pulse"
                                title="کسری موجودی انبار"
                              >
                                {index + 1}
                              </span>
                              <span className="text-[10px] text-rose-600 font-extrabold flex items-center gap-0.5 whitespace-nowrap">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> خطا
                              </span>
                            </div>
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </td>
                        <td className={`p-5 ${stockErr ? "border-y-2 border-rose-500 bg-rose-50/80" : ""}`}>
                          {item.productId ? (
                            <div className="font-black text-slate-800 flex flex-col gap-1">
                              <span>{item.productName}</span>
                              {(() => {
                                const p = products.find(
                                  (prod) => prod.id === item.productId,
                                );
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 self-start px-2 py-0.5 rounded-md">
                                      کالای سیستمی
                                    </span>
                                    {(p?.code || p?.barcode) && (
                                      <span className="text-[10px] text-indigo-500 font-mono flex gap-2">
                                        {p.code ? (
                                          <span>کد: {p.code}</span>
                                        ) : null}
                                        {p.barcode ? (
                                          <span>بارکد: {p.barcode}</span>
                                        ) : null}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="شرح دلخواه وارد کنید..."
                              value={item.productName}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "productName",
                                  e.target.value,
                                )
                              }
                              className="w-full p-2.5 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800 outline-none"
                            />
                          )}

                          {stockErr && (
                            <div className="mt-2.5 p-3 bg-rose-100/95 border-2 border-rose-400/90 rounded-xl text-rose-900 text-xs font-black flex items-start gap-2 shadow-xs animate-in fade-in">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <div className="text-rose-800 font-black flex items-center gap-1.5">
                                  <span>خطای کسری موجودی در انبار «{stockErr.warehouseName}»</span>
                                </div>
                                <p className="text-[11px] text-rose-700 font-bold leading-relaxed">
                                  موجودی این کالا در انبار <span className="text-rose-950 font-black px-1.5 py-0.5 bg-white rounded border border-rose-300">{formatNumber(stockErr.availableStock)} {stockErr.unitName}</span> است، اما شما <span className="text-rose-950 font-black px-1.5 py-0.5 bg-white rounded border border-rose-300">{formatNumber(stockErr.requestedQty)} {stockErr.unitName}</span> وارد کرده‌اید.
                                </p>
                                <div className="text-[11px] text-rose-900 font-black flex items-center gap-1">
                                  <span>کسری موجودی:</span>
                                  <span className="text-rose-700 bg-white px-1.5 py-0.5 rounded-md border border-rose-300 font-black">
                                    {formatNumber(stockErr.deficit)} {stockErr.unitName}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className={`p-5 ${stockErr ? "border-y-2 border-rose-500 bg-rose-50/80" : ""}`}>
                          <div className="flex flex-col gap-1.5">
                            <CurrencyInput
                              hideWords={true}
                              storeSettings={storeSettings}
                              value={item.quantity}
                              onChange={(e: any) =>
                                handleItemChange(
                                  item.id,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                              className={`w-full p-2.5 rounded-xl font-sans text-center font-black outline-none transition-all ${
                                stockErr
                                  ? "bg-white border-2 border-rose-500 text-rose-900 ring-2 ring-rose-400/70 shadow-xs focus:ring-rose-500"
                                  : "bg-indigo-50/30 border border-indigo-100 focus:ring-2 focus:ring-indigo-500 text-slate-800"
                              }`}
                            />
                            {stockErr && (
                              <div className="flex items-center justify-center gap-1 text-[10px] text-rose-800 font-black bg-white/95 py-0.5 px-1.5 rounded-lg border border-rose-300 shadow-2xs">
                                <span>موجودی:</span>
                                <span>{formatNumber(stockErr.availableStock)}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`p-5 ${stockErr ? "border-y-2 border-rose-500 bg-rose-50/80" : ""}`}>
                          {(() => {
                            const product = item.productId
                              ? products.find(
                                  (p) =>
                                    p.id.toString() === String(item.productId),
                                )
                              : null;
                            const hasSecondary = product?.secondaryUnit;
                            return (
                              <div className="flex flex-col gap-1.5">
                                {hasSecondary ? (
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
                                    className="w-full p-2 text-sm font-bold text-indigo-800 bg-indigo-50 border border-indigo-100/50 rounded-xl outline-none cursor-pointer focus:ring-2 focus:ring-indigo-400"
                                  >
                                    <option value="false">
                                      {product.unit} (اصلی) -{" "}
                                      {formatNumber(
                                        item.isSecondaryUnit
                                          ? item.unitPrice /
                                              (product.unitRatio || 1)
                                          : item.unitPrice,
                                      )}
                                    </option>
                                    <option value="true">
                                      {product.secondaryUnit} (فرعی) -{" "}
                                      {formatNumber(
                                        item.isSecondaryUnit
                                          ? item.unitPrice
                                          : item.unitPrice *
                                              (product.unitRatio || 1),
                                      )}
                                    </option>
                                  </select>
                                ) : product ? (
                                  <div className="w-full p-2 text-center text-indigo-700 font-bold bg-indigo-50/50 border border-indigo-100 rounded-xl text-sm shadow-sm">
                                    {product.unit || "-"}
                                  </div>
                                ) : (
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
                                    placeholder="واحد..."
                                    className="w-full p-2 text-center text-indigo-800 font-bold bg-white border border-indigo-200/50 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className={`p-5 ${stockErr ? "border-y-2 border-rose-500 bg-rose-50/80" : ""}`}>
                          <CurrencyInput
                            currencyLabel={storeSettings?.currency}
                            value={item.unitPrice}
                            onChange={(e: any) =>
                              handleItemChange(
                                item.id,
                                "unitPrice",
                                e.target.value,
                              )
                            }
                            className="w-full p-2.5 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-sans text-left font-black text-indigo-900 text-sm outline-none"
                          />
                        </td>
                        <td className={`p-5 ${stockErr ? "border-y-2 border-rose-500 bg-rose-50/80" : ""}`}>
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
                            className="w-full p-2.5 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-center text-rose-600 font-black outline-none"
                            dir="ltr"
                          />
                        </td>
                        <td
                          className={`p-5 font-black text-left font-sans text-indigo-950 ${stockErr ? "border-y-2 border-rose-500 bg-rose-50/80" : ""}`}
                          dir="ltr"
                        >
                          {formatCurrency(item.totalPrice)}
                        </td>
                        <td className={`p-5 text-center ${stockErr ? "border-y-2 border-l-2 border-rose-500 rounded-l-2xl bg-rose-50/80" : ""}`}>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors outline-none focus:ring-2 focus:ring-rose-500"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                    {(items || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-16 text-center">
                          <div className="flex flex-col items-center justify-center gap-4 text-indigo-600/50">
                            <div className="bg-indigo-50 p-6 rounded-full border-2 border-indigo-100/50">
                              <Package className="w-12 h-12" />
                            </div>
                            <p className="font-extrabold text-lg text-slate-700">
                              لیست کالاها خالی است
                            </p>
                            <p className="text-sm font-bold text-slate-400">
                              یک کالا از نوار جستجو انتخاب کنید یا سطر جدید
                              بسازید.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                    
                  </tbody>
                </table>
              </div>
              <div ref={itemsEndRef as any} className="p-5 bg-indigo-50/30 border-t border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex-1 w-full flex flex-col md:flex-row items-center gap-2 max-w-2xl">
                  <div className="flex gap-2">
                    <FastBarcodeScanner onScan={handleFastBarcodeScan} />
                  </div>
                  <div className="flex-[2] relative z-10 w-full">
                    <div className="border hover:border-indigo-300 rounded-xl bg-white shadow-sm transition-colors relative">
                      <SearchableSelect
                        menuPlacement="top"
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
                        placeholder="جستجو و افزودن سریع کالا به لیست فروش (نام، کد، بارکد)..."
                        searchPlaceholder="جستجوی کالای مورد نظر برای فروش..."
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="p-[11px] bg-white border border-indigo-200 text-indigo-600 rounded-xl shadow-sm hover:bg-indigo-50 transition-colors focus:ring-2 focus:ring-indigo-500"
                    title="اسکن بارکد با دوربین"
                  >
                    <ScanLine className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => setIsProductModalOpen(true)}
                  className="px-5 py-3 bg-white border border-indigo-200 text-indigo-700 shadow-sm rounded-xl font-bold hover:bg-indigo-50 flex items-center gap-2 transition-colors whitespace-nowrap outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <Plus className="w-4 h-4" /> تعریف کالا / خدمات جدید
                </button>
              </div>
            </div>

            {/* Totals & Submit */}
            <div className="bg-white rounded-3xl shadow-sm border-2 border-indigo-50 ">
              <div className="p-8">
                <div className="flex flex-col lg:flex-row justify-between gap-10">
                  {!activeTab.includes("warehouse") && (
                    <div className="flex w-full flex-col lg:flex-row justify-between gap-10">
                      <div className="flex-1 space-y-4">
                        <div>
                          <label className="block text-sm font-black text-slate-700 mb-3 ml-1">
                            تخفیف روی کل فاکتور (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={overallDiscountPercent}
                            onChange={(e) =>
                              setOverallDiscountPercent(Number(e.target.value))
                            }
                            className="w-48 p-3.5 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-left font-bold text-rose-600 outline-none"
                            dir="ltr"
                          />
                          <p className="mt-2 text-xs font-bold text-slate-400 font-sans">
                            این تخفیف روی مبلغ نهایی پس از کسر تخفیف‌های سطری
                            اعمال می‌شود.
                          </p>
                        </div>
                      </div>
                      <div className="w-full lg:w-[420px] space-y-1">
                        <div className="bg-indigo-50/40 p-6 rounded-2xl border border-indigo-100/50 space-y-4">
                          <div className="flex justify-between items-center text-slate-500 font-bold">
                            <span>جمع مبالغ (بدون تخفیف):</span>
                            <span
                              className="font-sans font-black text-slate-700"
                              dir="rtl"
                            >
                              {formatCurrency(invoiceOriginalTotal())}{" "}
                              <span className="text-[10px]">
                                {invoiceCurrency}
                              </span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-rose-500 font-bold">
                            <span>مجموع کل تخفیف‌ها:</span>
                            <span
                              className="font-sans font-black text-rose-600"
                              dir="rtl"
                            >
                              {formatCurrency(invoiceTotalDiscount())}{" "}
                              <span className="text-[10px]">
                                {invoiceCurrency}
                              </span>
                            </span>
                          </div>
                          <div className="h-px bg-indigo-100/30 w-full my-2"></div>
                          <div className="flex justify-between items-center text-slate-400 font-bold text-xs">
                            <span>ارزش پس از تخفیف سطری:</span>
                            <span
                              className="font-sans font-bold text-slate-600"
                              dir="rtl"
                            >
                              {formatCurrency(calculateSubtotal())}{" "}
                              <span className="text-[10px]">
                                {invoiceCurrency}
                              </span>
                            </span>
                          </div>
                          {overallDiscountPercent > 0 && (
                            <div className="flex justify-between items-center text-slate-400 font-bold text-xs">
                              <span>تخفیف کلی فاکتور:</span>
                              <span
                                className="font-sans font-bold text-slate-600"
                                dir="rtl"
                              >
                                % {overallDiscountPercent}
                              </span>
                            </div>
                          )}
                          <div className="h-px bg-indigo-100/60 w-full my-4"></div>
                          <div className="flex justify-between items-center text-xl font-black text-indigo-800">
                            <span>مبلغ نهایی فاکتور:</span>
                            <span
                              className="font-sans text-2xl text-indigo-950"
                              dir="rtl"
                            >
                              {formatCurrency(calculateFinalTotal())}{" "}
                              <span className="text-xs">{invoiceCurrency}</span>
                            </span>
                          </div>
                          {calculateFinalTotal() > 0 && (
                            <div className="mt-4 pt-4 border-t border-dashed border-indigo-200 text-right leading-relaxed text-xs font-bold text-indigo-700">
                              <span className="text-indigo-900 font-black">
                                {numToPersianWords(calculateFinalTotal())}{" "}
                                {invoiceCurrency}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 bg-indigo-50/20 border-t border-indigo-100 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={submitting || (items || []).length === 0 || !customerId}
                  onClick={() => {
                    if (storeSettings?.allowNegativeStock !== true && Object.keys(rowStockErrors).length > 0) {
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
                    if (
                      confirm(
                        "آیا از ذخیره این فاکتور به عنوان پیش‌نویس اطمینان دارید؟",
                      )
                    ) {
                      saveInvoiceData(null, true);
                    }
                  }}
                  className="px-6 py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm outline-none cursor-pointer"
                >
                  <FileText className="w-5 h-5" />
                  ذخیره به عنوان پیش‌نویس
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (storeSettings?.allowNegativeStock !== true && Object.keys(rowStockErrors).length > 0) {
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
                    handleInvoicePreviewTrigger();
                  }}
                  disabled={submitting || (items || []).length === 0 || !customerId}
                  className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-colors shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/20 cursor-pointer"
                >
                  {submitting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-6 h-6" />
                  )}
                  پیش‌نمایش و ثبت فاکتور
                </button>
              </div>
            </div>
          </motion.div>
  );
}
