import { getUnitRatioDirection, getPriceForSelectedUnit, convertQuantityToBaseUnit, convertPriceToBaseUnit } from "../../utils/unitConversion";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import CustomDatePicker from '../ui/CustomDatePicker';
import DatePickerModule from 'react-multi-date-picker';
const DatePicker = CustomDatePicker;
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import {  
  History, CheckCircle, RefreshCw, Info, Save, Trash2, Plus, Minus, Copy, LayoutGrid,
  ShoppingCart, Building2, UserCircle, Hash, Percent,
  Calendar, CreditCard, Banknote, FileText, Truck, ShieldCheck, Zap,
  Clock, UserPlus, ChevronDown } from 'lucide-react';
import BulkProductPickerModal from './BulkProductPickerModal';
import { useDirtyForm } from "../../hooks/useDirtyForm";
import { UnsavedChangesPrompt } from "../common/UnsavedChangesPrompt";
import { purchaseInvoiceFormSchema } from "../../schemas/validation";
// @ts-nocheck

      export default function PurchaseInvoiceCreate(props: any) {
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
    
    calculateFinalTotal,
    
    
    
    
    accounts,
    
    
    
    
    
    
    
    
    
    
    
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
    sellerInvoiceNumber,
    setSellerInvoiceNumber,
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
    Wallet,
    invoicePaymentAccountId,
    setInvoicePaymentAccountId,
    invoicePaymentStatus,
    setInvoicePaymentStatus,
    setInvoicePaidAmount,
    DollarSign,
    invoicePaidAmount,
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
    Calculator,
    calculateSubtotal
  } = props;
  const itemsEndRef = useRef<HTMLDivElement>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [prevItemsLength, setPrevItemsLength] = useState((items || []).length);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [purchaseLayoutMode, setPurchaseLayoutMode] = useState<'standard' | 'official'>('standard');
  const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);

  // Dirty Form Detection
  const isDirty = useMemo(() => {
    return (items || []).some((it: any) => it && (it.productId || Number(it.quantity) > 0));
  }, [items]);

  const { showPrompt, guardNavigation, confirmDiscard, cancelDiscard } = useDirtyForm({
    isDirty,
    message: 'فاکتور خرید دارای اقلام ثبت‌شده است. آیا از خروج بدون ذخیره مطمئنید؟'
  });

  const validatePurchase = (isDraft: boolean = false): boolean => {
    const cleanItems = (items || []).filter((it: any) => it && it.productId);
    if (!isDraft) {
      let dateStr = '';
      if ((date as any) instanceof Date || (date && Object.prototype.toString.call(date) === '[object Date]')) {
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

      const res = purchaseInvoiceFormSchema.safeParse({
        invoiceNumber: invoiceNumber || 'AUTO',
        date: dateStr,
        customerId: customerId,
        sellerInvoiceNumber: sellerInvoiceNumber || undefined,
        items: cleanItems,
        warehouseId: invoiceWarehouseId,
        paymentStatus: invoicePaymentStatus || 'unpaid',
        paidAmount: invoicePaidAmount,
        paymentAccountId: invoicePaymentAccountId
      });
      if (!res.success) {
        const issues = (res.error as any).issues || (res.error as any).errors || [];
        const errorMsg = issues.map((err: any) => `• ${err.message}`).join('\n');
        alert(`خطا در اعتبارسنجی فاکتور خرید:\n${errorMsg}`);
        return false;
      }
    } else {
      if (cleanItems.length === 0) {
        alert('حداقل یک قلم کالا برای پیش‌نویس لازم است.');
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if ((items || []).length > prevItemsLength) {
      itemsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    setPrevItemsLength((items || []).length);
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F4") {
        e.preventDefault();
        setIsBulkModalOpen(true);
      } else if (e.key === "F2") {
        e.preventDefault();
        if (validatePurchase(false)) {
          setIsPaymentModalOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, customerId, invoiceNumber, date, invoicePaymentStatus, invoicePaidAmount, invoicePaymentAccountId]);

  return (
    <>
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
              <div className="bg-emerald-50 text-emerald-700 px-5 py-4 rounded-xl flex items-center gap-3 border border-emerald-100 font-bold shadow-sm">
                <CheckCircle className="w-5 h-5" />
                {successMsg}
              </div>
            )}
            {editingInvoiceId && (
              <div className="bg-amber-50 text-amber-900 px-5 py-4 rounded-2xl flex items-center justify-between gap-3 border border-amber-200/60 font-bold shadow-xs">
                <div className="flex items-center gap-2.5">
                  <Info className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    شما در حال ویرایش فاکتور خرید پیش‌نویس/ثبت‌شده شماره{" "}
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
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black shrink-0">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900 leading-tight">
                          {invoiceTitle}
                        </h2>
                        <span className="text-[11px] text-slate-400 font-bold">
                          {purchaseLayoutMode === 'standard' ? 'ورود مستقیم و سریع اقلام به انبار' : 'فاکتور رسمی شرکتی و مودیان مالیاتی'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-stretch sm:self-auto text-xs">
                      <button
                        type="button"
                        onClick={() => setPurchaseLayoutMode('standard')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          purchaseLayoutMode === 'standard'
                            ? 'bg-white text-emerald-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>ورود سریع کالا</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchaseLayoutMode('official')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          purchaseLayoutMode === 'official'
                            ? 'bg-white text-emerald-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>فاکتور رسمی</span>
                      </button>
                    </div>
                  </div>

                  {/* Compact Core Details (4-field row) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
                    {/* 1. Supplier (5 cols) */}
                    <div className="sm:col-span-2 lg:col-span-5">
                      <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تامین‌کننده / فروشنده</span>
                          <span className="text-rose-500 font-extrabold">*</span>
                        </span>
                        {customerId && (
                          <span className="text-[11px] font-bold text-emerald-600">
                            انتخاب شده
                          </span>
                        )}
                      </label>
                      <div className="flex gap-1.5">
                        <div className="flex-1 border border-emerald-100 rounded-xl bg-emerald-50/20 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all">
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
                            placeholder="-- جستجوی تامین‌کننده (نام، تلفن) --"
                            searchPlaceholder="جستجوی شخص یا شرکت..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl px-3 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="تعریف تامین‌کننده جدید"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 2. Seller Invoice # (3 cols) */}
                    <div className="sm:col-span-1 lg:col-span-3">
                      <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>شماره فاکتور فروشنده</span>
                      </label>
                      <input
                        type="text"
                        value={sellerInvoiceNumber}
                        onChange={(e) => setSellerInvoiceNumber(e.target.value)}
                        className="w-full h-[42px] px-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-left font-bold text-slate-800 outline-none bg-emerald-50/20 text-xs"
                        dir="ltr"
                        placeholder="شماره فاکتور اصلی..."
                      />
                    </div>

                    {/* 3. System Invoice Number (2 cols) */}
                    <div className="sm:col-span-1 lg:col-span-2">
                      <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>شماره سیستم</span>
                        <button
                          type="button"
                          onClick={() => setInvoiceMode(invoiceMode === "auto" ? "manual" : "auto")}
                          className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer"
                        >
                          {invoiceMode === "auto" ? "دستی؟" : "خودکار؟"}
                        </button>
                      </label>
                      {invoiceMode === "manual" ? (
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="w-full h-[42px] px-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-left font-bold text-slate-800 outline-none bg-white text-xs"
                          dir="ltr"
                          placeholder="شماره سیستم..."
                        />
                      ) : (
                        <div className="w-full h-[42px] px-3 border border-emerald-100 rounded-xl bg-emerald-50/30 font-mono text-left font-black text-slate-700 flex items-center justify-end text-xs">
                          {invoiceNumber || "خودکار..."}
                        </div>
                      )}
                    </div>

                    {/* 4. Date (2 cols) */}
                    <div className="sm:col-span-1 lg:col-span-2">
                      <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تاریخ صدور</span>
                      </label>
                      <div className="relative">
                        <DatePicker
                          value={date}
                          onChange={setDate}
                          calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                          locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                          calendarPosition="bottom-right"
                          inputClass="w-full h-[42px] pl-8 pr-2.5 bg-emerald-50/20 hover:bg-white border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 font-mono font-bold text-center transition-all cursor-pointer outline-none text-xs"
                          containerClassName="w-full"
                        />
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500">
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
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-100"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExtraInfoOpen ? "rotate-180" : ""}`} />
                      <span>{isExtraInfoOpen ? "بستن جزئیات تکمیلی و توضیحات" : "افزودن عنوان، توضیحات و راهنمای انبار"}</span>
                    </button>

                    {customerId && (
                      <div className="text-[11px] font-bold text-slate-500 hidden sm:block">
                        {renderPersonInfoBox && renderPersonInfoBox(customerId, "inline-flex items-center gap-2 text-slate-600")}
                      </div>
                    )}
                  </div>

                  {/* Collapsible Details Panel */}
                  {(isExtraInfoOpen || purchaseLayoutMode === "official") && (
                    <div className="mt-2 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-3 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-500" /> عنوان فاکتور خرید
                          </label>
                          <input
                            type="text"
                            value={invoiceTitle}
                            onChange={(e) => setInvoiceTitle(e.target.value)}
                            className="w-full h-[38px] px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 outline-none bg-white text-xs"
                            placeholder="عنوانی برای فاکتور خرید..."
                          />
                        </div>

                        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 flex items-center gap-2.5">
                          <Box className="w-5 h-5 text-emerald-600 shrink-0" />
                          <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                            تعیین انبار مقصد و ورود قطعی به کاردکس، در مرحله «صدور رسید انبار» انجام می‌پذیرد.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div
                  className="bg-white rounded-3xl shadow-sm border-2 border-emerald-50 "
                  data-invoice-flow="purchase"
                >
                  {/* Items List Top Fast Entry Bar */}
                  <div className="p-4 bg-gradient-to-r from-emerald-50/70 via-slate-50 to-emerald-50/40 border-b border-emerald-100 flex flex-col gap-3">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 whitespace-nowrap text-sm">
                          <Package className="w-4 h-4 text-emerald-600" />
                          <span>لیست اقلام فاکتور خرید</span>
                        </h3>
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                          {toPersianDigits((items || []).length)} ردیف
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsBulkModalOpen(true)}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="انتخاب کاتالوگی و افزودن دسته‌ای اقلام (F4)"
                        >
                          <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
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
                          className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                        <div className="border border-emerald-200 hover:border-emerald-400 focus-within:border-emerald-500 rounded-xl bg-white shadow-2xs transition-all">
                          <SearchableSelect
                            menuPlacement="bottom"
                            options={products
                              .filter((p) => p.isActive !== false)
                              .map((p) => ({
                                value: p.id,
                                label: p.name,
                                subLabel: p.price ? `${formatCurrency(p.price)} ${invoiceCurrency}` : undefined,
                                badge: p.type === "service" ? "خدمات" : "کالا",
                                searchStr: `${p.code || ""} ${p.barcode || ""}`,
                              }))}
                            value=""
                            onChange={(val) => handleFastAddProduct(String(val))}
                            placeholder="⚡ جستجو و افزودن فوری کالا به فاکتور خرید (نام، کد، بارکد)..."
                            searchPlaceholder="جستجوی سریع کالای خریداری شده..."
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="p-2.5 bg-white border border-emerald-200 text-emerald-600 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer shrink-0"
                        title="اسکن بارکد با دوربین گوشی / وبکم"
                      >
                        <ScanLine className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right min-w-[950px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 text-xs font-bold text-slate-500 border-b border-slate-200">
                      <th className="py-2.5 px-3 w-12 text-center">ردیف</th>
                      <th className="py-2.5 px-3 min-w-[240px] text-right">
                        شرح کالا / خدمات
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
                          colSpan={8}
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
                    {(items || []).map((item, index) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 transition-colors text-sm"
                        data-row-type="purchase-row"
                      >
                        {/* شماره ردیف */}
                        <td className="py-2 px-3 text-center align-middle">
                          <span className="text-slate-400 font-bold text-xs">{index + 1}</span>
                        </td>

                        {/* شرح کالا / خدمات */}
                        <td className="py-2 px-3 align-middle">
                          {item.productId ? (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm leading-tight">
                                {item.productName}
                              </span>
                              {(() => {
                                const p = products.find(
                                  (prod) => prod.id === item.productId,
                                );
                                if (!p?.code && !p?.barcode) return null;
                                return (
                                  <span className="text-[11px] text-slate-400 font-mono font-normal">
                                    {p.code ? `[${p.code}]` : `[${p.barcode}]`}
                                  </span>
                                );
                              })()}
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
                              className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-bold text-slate-800 outline-none transition-all"
                            />
                          )}
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
                                className="w-full h-8 px-1.5 bg-white border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-center font-black text-slate-800 outline-none text-sm transition-all"
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
                              ? products.find(
                                  (p) =>
                                    p.id.toString() === String(item.productId),
                                )
                              : null;
                            const hasSecondary = product?.secondaryUnit;
                            if (hasSecondary) {
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
                                  className="w-full h-8 px-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                                className="w-full h-8 px-1 text-center text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-sans text-left font-bold text-slate-800 text-sm outline-none"
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
                            className="w-full h-8 px-1 bg-white border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-center text-rose-600 font-bold text-sm outline-none"
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
                                className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
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
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Table Footer: Summary count & quick actions */}
              <div ref={itemsEndRef as any} className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <span>مجموع اقلام خرید:</span>
                  <span className="font-mono font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200">
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
                    className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
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
            {/* Supplier Status Card */}
            {customerId && (
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800 line-clamp-1">
                        {(() => {
                          const c = (activePersonsOnly || []).find((p: any) => String(p.id) === String(customerId));
                          return c ? (c.alias || c.name) : "تامین‌کننده انتخاب شده";
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
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {(() => {
                      const c = (activePersonsOnly || []).find((p: any) => String(p.id) === String(customerId));
                      return c && getRoleName ? getRoleName(c.role) : "تامین‌کننده";
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
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  <span>صورت‌حساب فاکتور خرید</span>
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
                    className="w-16 h-8 px-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-center font-bold text-rose-600 outline-none text-xs"
                    dir="ltr"
                  />
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
              </div>

              {/* Calculation Lines */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-500">
                  <span>جمع ناخالص خرید:</span>
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
              <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 rounded-2xl p-4 text-white shadow-md space-y-2">
                <div className="flex justify-between items-center text-emerald-200 text-xs font-bold">
                  <span>مبلغ نهایی خرید:</span>
                  <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded text-emerald-100 font-mono">
                    {invoiceCurrency}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-300 text-left" dir="ltr">
                  {formatCurrency(calculateFinalTotal())}
                </div>
                {calculateFinalTotal() > 0 && (
                  <p className="text-[11px] text-emerald-200 font-bold pt-1.5 border-t border-white/10 leading-relaxed text-right line-clamp-2">
                    {numToPersianWords(calculateFinalTotal())} {invoiceCurrency}
                  </p>
                )}
              </div>

              {/* Settlement & Save Actions */}
              <div className="space-y-2.5 pt-1">
                {/* Primary F2 Settlement Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (validatePurchase(false)) {
                      setIsPaymentModalOpen(true);
                    }
                  }}
                  disabled={submitting || (items || []).length === 0 || !customerId}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:bg-emerald-200 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-emerald-500/25 cursor-pointer relative"
                >
                  {submitting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-200" />
                  )}
                  <span>ثبت و تایید نهایی خرید</span>
                  <span className="font-mono text-[11px] bg-emerald-800/80 px-2 py-0.5 rounded text-emerald-100 mr-auto">
                    F2
                  </span>
                </button>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={submitting || (items || []).length === 0 || !customerId}
                    onClick={() => {
                      if (!validatePurchase(false)) return;
                      if (
                        confirm(
                          "آیا از ثبت اولیه فاکتور خرید (جهت بررسی و تایید بعدی سرپرست/مدیر) اطمینان دارید؟",
                        )
                      ) {
                        saveInvoiceData({ status: "pending_approval", isDraft: false }, false);
                      }
                    }}
                    className="py-2.5 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>ثبت در انتظار تایید</span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting || (items || []).length === 0 || !customerId}
                    onClick={() => {
                      if (!validatePurchase(true)) return;
                      if (confirm("آیا از ذخیره این فاکتور خرید به عنوان پیش‌نویس اطمینان دارید؟")) {
                        saveInvoiceData({ status: "draft", isDraft: true }, true);
                      }
                    }}
                    className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>پیش‌نویس</span>
                  </button>
                </div>
              </div>

              {/* Quick shortcut guide */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600 border border-slate-200">F2</kbd>
                  <span>ثبت خرید</span>
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
          </motion.div>

          {isPaymentModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
              <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
                <button 
                  onClick={() => setIsPaymentModalOpen(false)} 
                  className="absolute top-4 left-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div className="p-6">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-emerald-500" />
                    تعیین وضعیت پرداخت فاکتور خرید
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-500" /> وضعیت پرداخت
                      </label>
                      <select
                        value={invoicePaymentStatus}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setInvoicePaymentStatus(val);
                          if (val === "paid")
                            setInvoicePaidAmount(calculateFinalTotal());
                          else if (val === "unpaid") setInvoicePaidAmount(0);
                        }}
                        className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 text-sm font-bold text-emerald-900 outline-none"
                      >
                        <option value="unpaid">پرداخت نشده (نسیه)</option>
                        <option value="partial">تسویه بخشی (علی‌الحساب)</option>
                        <option value="paid">تسویه کامل نقدی</option>
                      </select>
                    </div>

                    {(invoicePaymentStatus === "paid" || invoicePaymentStatus === "partial") && (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-500" /> مبلغ پرداختی
                          </label>
                          <CurrencyInput
                            value={invoicePaidAmount}
                            onChange={(e: any) => {
                              const valNum = Number(e.target.value) || 0;
                              setInvoicePaidAmount(valNum);
                              if (valNum >= calculateFinalTotal())
                                setInvoicePaymentStatus("paid");
                              else if (valNum > 0)
                                setInvoicePaymentStatus("partial");
                              else setInvoicePaymentStatus("unpaid");
                            }}
                            disabled={invoicePaymentStatus === "unpaid"}
                            className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-left font-bold text-slate-800 outline-none bg-emerald-50/20 disabled:opacity-50"
                            placeholder="0"
                            currencyLabel={invoiceCurrency}
                            showQuickChips={true}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                            صندوق / حساب بانکی پرداختی
                          </label>
                          <select
                            value={invoicePaymentAccountId}
                            onChange={(e) => setInvoicePaymentAccountId(e.target.value)}
                            className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 text-sm font-bold text-emerald-900 outline-none"
                          >
                            <option value="">-- انتخاب کنید --</option>
                            {accounts.map((acc: any) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.title} {acc.bankName ? `(${acc.bankName})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    <div className="mt-8 flex gap-3">
                      <button
                        onClick={() => setIsPaymentModalOpen(false)}
                        className="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                      >
                        انصراف
                      </button>
                      <button
                        onClick={() => {
                          setIsPaymentModalOpen(false);
                          handleInvoicePreviewTrigger();
                        }}
                        disabled={submitting}
                        className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        {submitting ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                        تایید و ثبت نهایی
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

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
              formatNumber={formatNumber}
              formatCurrency={formatCurrency}
              invoiceCurrency={invoiceCurrency}
              themeColor="emerald"
              toPersianDigits={toPersianDigits}
            />
          )}

          <UnsavedChangesPrompt
            isOpen={showPrompt}
            onStay={cancelDiscard}
            onDiscard={confirmDiscard}
            title="فاکتور خرید ذخیره‌نشده"
            description="اقلامی در این فاکتور خرید وارد شده‌اند که هنوز ذخیره نشده‌اند. در صورت خروج اطلاعات از دست خواهد رفت. آیا مایل به خروج هستید؟"
          />
    </>
  );
}
