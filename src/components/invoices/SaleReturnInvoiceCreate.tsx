import { getUnitRatioDirection, getPriceForSelectedUnit, convertQuantityToBaseUnit } from "../../utils/unitConversion";
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

export default function SaleReturnInvoiceCreate(props: any) {
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
    RefreshCw,
    FileText,
    Info,
    Tag
  ,
    invoiceType,
    setInvoiceType,
    DatePicker,
    invoiceDescription,
    setInvoiceDescription,
    invoiceNote,
    setInvoiceNote,
    calculateProductCurrentStock,
    formatProductStockDetails,
    activeTab,
    calculateSubtotal,
    handleDuplicateItem,
    handleIncrementQuantity,
    handleAddBlankRow
  } = props;
  const itemsEndRef = useRef<HTMLDivElement>(null);
  const [prevItemsLength, setPrevItemsLength] = useState((items || []).length);
  const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);

  useEffect(() => {
    if ((items || []).length > prevItemsLength) {
      itemsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setPrevItemsLength((items || []).length);
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" || (e.ctrlKey && e.key.toLowerCase() === "s") || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        if (handleInvoicePreviewTrigger && (items || []).length > 0 && customerId) {
          handleInvoicePreviewTrigger();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, customerId, handleInvoicePreviewTrigger]);

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
                    شما در حال ویرایش فاکتور برگشت از فروش پیش‌نویس/ثبت‌شده
                    شماره{" "}
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
                      <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black shrink-0">
                        <CornerDownLeft className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900 leading-tight">
                          {invoiceTitle}
                        </h2>
                        <span className="text-[11px] text-slate-400 font-bold">
                          برگشت اقلام به انبار و بستانکار نمودن طرف حساب
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Compact Core Details (4-field row) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
                    {/* 1. Customer (5 cols) */}
                    <div className="sm:col-span-2 lg:col-span-5">
                      <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-rose-600" />
                          <span>مشتری / طرف حساب</span>
                          <span className="text-rose-500 font-extrabold">*</span>
                        </span>
                        {customerId && (
                          <span className="text-[11px] font-bold text-rose-600">
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
                            placeholder="-- جستجوی مشتری (نام، تلفن) --"
                            searchPlaceholder="جستجوی شخص یا شرکت..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl px-3 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="تعریف شخص جدید"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 2. Return Warehouse (3 cols) */}
                    <div className="sm:col-span-1 lg:col-span-3">
                      <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-rose-600" />
                        <span>انبار ورود مرجوعی</span>
                        {storeSettings.requireWarehouse && <span className="text-rose-500 font-extrabold">*</span>}
                      </label>
                      <select
                        value={invoiceWarehouseId}
                        onChange={(e) => setInvoiceWarehouseId(e.target.value)}
                        className="w-full h-[42px] px-3 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-indigo-50/20 text-xs font-bold text-slate-800 outline-none transition-colors"
                      >
                        <option value="">-- انبار برگشتی --</option>
                        {warehouses
                          .filter((w) => w.isActive !== false)
                          .map((v, index) => (
                            <option key={`${v.id}-${index}`} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* 3. Invoice Number (2 cols) */}
                    <div className="sm:col-span-1 lg:col-span-2">
                      <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>شماره برگشت</span>
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
                          placeholder="شماره برگشت..."
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
                        <Calendar className="w-3.5 h-3.5 text-rose-600" />
                        <span>تاریخ صدور</span>
                      </label>
                      <div className="relative">
                        <DatePicker
                          value={date}
                          onChange={setDate}
                          calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                          locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
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
                      <span>{isExtraInfoOpen ? "بستن جزئیات تکمیلی" : "افزودن عنوان فاکتور، توضیحات و یادداشت"}</span>
                    </button>

                    {customerId && (
                      <div className="text-[11px] font-bold text-slate-500 hidden sm:block">
                        {renderPersonInfoBox && renderPersonInfoBox(customerId, "inline-flex items-center gap-2 text-slate-600")}
                      </div>
                    )}
                  </div>

                  {/* Collapsible Details Panel */}
                  {isExtraInfoOpen && (
                    <div className="mt-2 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-3 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-500" /> عنوان برگشت از فروش
                          </label>
                          <input
                            type="text"
                            value={invoiceTitle}
                            onChange={(e) => setInvoiceTitle(e.target.value)}
                            className="w-full h-[38px] px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 outline-none bg-white text-xs"
                            placeholder="عنوان فاکتور برگشت..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-indigo-500" /> یادداشت / کد ارجاع
                          </label>
                          <input
                            type="text"
                            value={invoiceNote || ""}
                            onChange={(e) => setInvoiceNote(e.target.value)}
                            className="w-full h-[38px] px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 outline-none bg-white text-xs"
                            placeholder="کد پیگیری یا شماره فاکتور مبدا..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-500" /> علت برگشت / توضیحات
                          </label>
                          <input
                            type="text"
                            value={invoiceDescription || ""}
                            onChange={(e) => setInvoiceDescription(e.target.value)}
                            className="w-full h-[38px] px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 outline-none bg-white text-xs"
                            placeholder="علت مرجوعی کالا..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div
                  className="bg-white rounded-3xl shadow-sm border-2 border-indigo-50 "
                  data-invoice-flow="sale-return"
                >
                  {/* Items List Top Fast Entry Bar */}
                  <div className="p-4 bg-gradient-to-r from-rose-50/60 via-slate-50 to-indigo-50/40 border-b border-indigo-100 flex flex-col gap-3">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 whitespace-nowrap text-sm">
                          <Package className="w-4 h-4 text-rose-600" />
                          <span>لیست اقلام برگشت از فروش</span>
                        </h3>
                        <span className="text-xs font-mono font-bold text-rose-700 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                          {toPersianDigits((items || []).length)} ردیف
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
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
                              .filter((p) => p.isActive !== false)
                              .map((p) => ({
                                value: p.id,
                                label: p.name,
                                subLabel: formatProductStockDetails ? formatProductStockDetails(p) : undefined,
                                badge: p.type === "service" ? "خدمات" : "کالا",
                                searchStr: `${p.code || ""} ${p.barcode || ""}`,
                              }))}
                            value=""
                            onChange={(val) => handleFastAddProduct(String(val))}
                            placeholder="⚡ جستجو و افزودن فوری کالا برای برگشت (نام، کد، بارکد)..."
                            searchPlaceholder="جستجوی کالای مرجوعی..."
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
                        data-row-type="sale-return-row"
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
                              className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800 outline-none transition-all"
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
                                className="w-full h-8 px-1.5 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-center font-black text-slate-800 outline-none text-sm transition-all"
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
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Table Footer: Summary count & quick actions */}
              <div ref={itemsEndRef as any} className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <span>مجموع اقلام برگشتی:</span>
                  <span className="font-mono font-black text-rose-700 bg-white px-2 py-0.5 rounded border border-slate-200">
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
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-rose-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xs shrink-0">
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
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
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
                  <CornerDownLeft className="w-4 h-4 text-rose-600" />
                  <span>صورت‌حساب برگشت از فروش</span>
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
                  <span>جمع ناخالص برگشتی:</span>
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

              {/* Big Net Return Total */}
              <div className="bg-gradient-to-br from-rose-950 via-slate-900 to-indigo-950 rounded-2xl p-4 text-white shadow-md space-y-2">
                <div className="flex justify-between items-center text-rose-200 text-xs font-bold">
                  <span>مبلغ بستانکاری (برگشتی):</span>
                  <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded text-rose-100 font-mono">
                    {invoiceCurrency}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-300 text-left" dir="ltr">
                  {formatCurrency(calculateFinalTotal())}
                </div>
                {calculateFinalTotal() > 0 && (
                  <p className="text-[11px] text-rose-200 font-bold pt-1.5 border-t border-white/10 leading-relaxed text-right line-clamp-2">
                    {numToPersianWords(calculateFinalTotal())} {invoiceCurrency}
                  </p>
                )}
              </div>

              {/* Settlement & Save Actions */}
              <div className="space-y-2.5 pt-1">
                {/* Primary F2 Settlement Button */}
                <button
                  type="button"
                  onClick={handleInvoicePreviewTrigger}
                  disabled={submitting || (items || []).length === 0 || !customerId}
                  className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] disabled:bg-rose-200 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-rose-500/25 cursor-pointer relative"
                >
                  {submitting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  <span>ثبت نهایی برگشت از فروش</span>
                  <span className="font-mono text-[11px] bg-rose-800/80 px-2 py-0.5 rounded text-rose-100 mr-auto">
                    F2
                  </span>
                </button>

                {/* Secondary Draft Save Button */}
                <button
                  type="button"
                  disabled={submitting || (items || []).length === 0 || !customerId}
                  onClick={() => {
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
                  <span>ثبت</span>
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
  );
}
