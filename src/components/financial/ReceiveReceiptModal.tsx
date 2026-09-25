import React, { useState, useEffect } from "react";
import { addCommas } from "../../utils/format";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Save,
  ArrowDownLeft,
  CheckCircle,
  FileText,
  Calendar,
  Building2,
  User,
  UserPlus,
  Wallet,
  DollarSign,
  CreditCard,
  Printer,
  X,
  CheckSquare,
  Phone,
  Hash,
  Sparkles,
  ChevronDown,
  Layers,
  Check
} from "lucide-react";
import Select from "react-select";
import CurrencyInput from "../common/CurrencyInput";
import CustomDatePicker from "../ui/CustomDatePicker";
const DatePicker = CustomDatePicker;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export default function ReceiveReceiptModal(props: any) {
  const { isOpen, onClose, ...rest } = props;

  const {
    receiptHasDraft,
    restoreReceiptDraft,
    discardReceiptDraft,
    handleSubmitReceipt,
    receiptPersonId,
    setReceiptPersonId,
    setIsPersonModalOpen,
    persons,
    getPersonDisplayName,
    receiptMethod,
    setReceiptMethod,
    accounts,
    cashboxes,
    receiptAmount,
    setReceiptAmount,
    receiptDate,
    setReceiptDate,
    receiptNumber,
    receiptNote,
    setReceiptNote,
    formatNumber,
    submittingReceipt,
    lastCreatedReceipt,
    toPersianDigits,
    storeSettings,
    setPrintingTransaction,
    setLastCreatedReceipt,
    receiptSuccessMsg,
    setReceiptLinkedInvoices,
    activePersonsOnly,
    mapPersonToOption,
    customPersonFilter,
    renderPersonInfoBox,
    numToPersianWords,
    receiptResourceType,
    setReceiptResourceType,
    receiptResourceId,
    setReceiptResourceId,
    invoices,
    getDefaultExchangeRate,
    receiptLinkedInvoices,
    formatDateDisplay,
    formatCurrency,
    customAlert,
  } = props;

  // Active channel within cash/bank methods
  const [paymentChannel, setPaymentChannel] = useState<"transfer" | "cashbox" | "pos" | "card">("transfer");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [isInvoicesExpanded, setIsInvoicesExpanded] = useState<boolean>(true);

  // Guarantee method is always cash/bank
  useEffect(() => {
    if (typeof setReceiptMethod === "function" && receiptMethod !== "cash") {
      setReceiptMethod("cash");
    }
  }, [receiptMethod, setReceiptMethod]);

  // Sync payment channel with resource type
  const handleSelectChannel = (channel: "transfer" | "cashbox" | "pos" | "card") => {
    setPaymentChannel(channel);
    if (channel === "cashbox") {
      if (typeof setReceiptResourceType === "function") setReceiptResourceType("cashbox");
      if (typeof setReceiptResourceId === "function" && cashboxes && cashboxes.length > 0) {
        if (!cashboxes.some((c: any) => String(c.id) === String(receiptResourceId))) {
          setReceiptResourceId(cashboxes[0].id);
        }
      }
    } else {
      if (typeof setReceiptResourceType === "function") setReceiptResourceType("bank");
      if (typeof setReceiptResourceId === "function" && accounts && accounts.length > 0) {
        if (!accounts.some((a: any) => String(a.id) === String(receiptResourceId))) {
          setReceiptResourceId(accounts[0].id);
        }
      }
    }
  };

  const themeRing = "focus:ring-emerald-500";
  const themeText = "text-emerald-600";
  const themeBg = "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300";
  const themeLightBg = "bg-emerald-50/40";
  const themeBorder = "border-emerald-200";
  const themeIcon = "text-emerald-500";
  const themeBadge = "bg-emerald-100 text-emerald-800";

  const effectivePersonId = receiptPersonId || (props as any).personId || "";
  const effectiveSetPersonId = setReceiptPersonId || (props as any).setPersonId || (() => {});

  const resolvePersonName = (p: any): string => {
    if (!p) return "نامشخص";
    if (typeof getPersonDisplayName === "function") {
      const d = getPersonDisplayName(p, persons);
      if (d && d !== "نامشخص") return d;
    }
    const fullName = `${p.firstName || ""} ${p.lastName || ""}`.trim();
    return (
      p.alias?.trim() ||
      p.name?.trim() ||
      fullName ||
      p.companyName?.trim() ||
      p.title?.trim() ||
      "نامشخص"
    );
  };

  const selectedPerson = (persons || []).find(
    (p: any) => p && String(p.id) === String(effectivePersonId)
  );

  const selectedPersonLabel = selectedPerson
    ? (selectedPerson.personCode ? `[${selectedPerson.personCode}] ` : "") + resolvePersonName(selectedPerson)
    : "";

  const effectiveActivePersons = (activePersonsOnly && activePersonsOnly.length > 0)
    ? activePersonsOnly
    : (persons || []).filter((p: any) => p.isActive !== false);

  const defaultMapPersonToOption = (p: any) => {
    const dName = resolvePersonName(p);
    const roleText = p.role === "customer" ? "مشتری" : p.role === "supplier" ? "تأمین‌کننده" : "طرف‌حساب";
    return {
      value: String(p.id),
      label: (p.personCode ? `[${p.personCode}] ` : "") + dName + " (" + roleText + ")",
      imageUrl: p.imageUrl,
      searchStr: `${dName} ${p.phone || ""} ${p.nationalId || ""}`,
    };
  };

  const effectiveMapPerson = mapPersonToOption || defaultMapPersonToOption;

  const personInvoices = (invoices || []).filter(
    (inv: any) =>
      !inv.isDraft &&
      inv.status !== "draft" &&
      inv.status !== "voided" &&
      inv.type !== "proforma" &&
      inv.customerId?.toString() === effectivePersonId.toString() &&
      inv.paymentStatus !== "paid" &&
      (inv.type === "sale" || inv.type === "purchase_return")
  );

  const totalUnpaidInvoices = personInvoices.reduce((sum: number, inv: any) => {
    const total =
      (inv.totalAmount || 0) *
      (typeof getDefaultExchangeRate === "function"
        ? getDefaultExchangeRate(inv.currency, storeSettings?.currency)
        : 1);
    const paid = inv.paidAmount || 0;
    return sum + Math.max(total - paid, 0);
  }, 0);

  // Quick Amount Adders
  const handleAddAmount = (addVal: number) => {
    const current = Number(String(receiptAmount || 0).replace(/,/g, "")) || 0;
    const nextVal = current + addVal;
    if (typeof setReceiptAmount === "function") {
      setReceiptAmount(String(nextVal));
    }
  };

  // Keyboard shortcut: Ctrl+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        const form = document.getElementById("receive-receipt-form") as HTMLFormElement;
        if (form && !submittingReceipt) {
          form.requestSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submittingReceipt]);

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePersonId) {
      if (typeof customAlert === "function") customAlert("لطفاً طرف حساب را انتخاب کنید");
      return;
    }
    const numAmount = Number(String(receiptAmount).replace(/,/g, ""));
    if (!numAmount || numAmount <= 0) {
      if (typeof customAlert === "function") customAlert("مبلغ رسید باید بیشتر از صفر باشد");
      return;
    }

    // Prepend tracking number if provided and not yet in note
    if (trackingNumber.trim()) {
      const trackPrefix = `کد پیگیری: ${trackingNumber.trim()}`;
      if (!receiptNote.includes(trackingNumber.trim())) {
        if (typeof setReceiptNote === "function") {
          setReceiptNote((prev: string) => prev ? `${trackPrefix} - ${prev}` : trackPrefix);
        }
      }
    }

    handleSubmitReceipt("receive", e);
  };

  return (
    <div className="w-full font-sans pb-32 md:pb-6" dir="rtl">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 w-full flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                  ثبت رسید دریافت وجه
                </h2>
                <span className="text-[11px] font-bold bg-emerald-100/90 text-emerald-800 px-2 py-0.5 rounded-md">
                  دریافت نقدی و بانکی
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                ثبت دریافت از مشتری یا طرف‌حساب، صدور خودکار سند و تسویه فاکتورها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[10px] font-bold text-slate-400">شماره رسید رسمی</span>
              <span className="text-xs font-mono font-black text-emerald-900">
                {receiptNumber ? toPersianDigits(receiptNumber) : "در حال رزرو..."}
              </span>
            </div>
            {typeof onClose === "function" && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title="بستن فرم"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8 space-y-6">

          {/* Draft Notification */}
          {receiptHasDraft && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center text-amber-900 shadow-xs gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs sm:text-sm">
                  پیش‌نویس ذخیره‌شده از عملیات قبلی بازیابی شد. مایلید ادامه دهید؟
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={restoreReceiptDraft}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                >
                  بازیابی اطلاعات
                </button>
                <button
                  type="button"
                  onClick={discardReceiptDraft}
                  className="px-4 py-2 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100/50 rounded-xl text-xs font-bold transition-colors"
                >
                  انصراف و پاک کردن
                </button>
              </div>
            </motion.div>
          )}

          {/* Last Created Success Banner */}
          {lastCreatedReceipt && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 text-emerald-950 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-200 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-950">
                    رسید دریافت رسمی شماره {lastCreatedReceipt.receiptNumber || `#${lastCreatedReceipt.id}`} با موفقیت ثبت شد
                  </p>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    مبلغ: <strong className="font-mono text-emerald-950">{toPersianDigits(formatNumber(lastCreatedReceipt.amount))}</strong> {storeSettings?.currency || "تومان"} — سند دوبل حسابداری صادر گردید.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPrintingTransaction(lastCreatedReceipt)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  چاپ و صدور فیش رسید
                </button>
                <button
                  type="button"
                  onClick={() => setLastCreatedReceipt(null)}
                  className="p-2 text-emerald-600 hover:bg-emerald-100/60 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {receiptSuccessMsg && (
            <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-2 border border-emerald-200 font-bold text-xs shadow-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {receiptSuccessMsg}
            </div>
          )}

          {/* Payment Channel Quick Selector */}
          <div className="bg-slate-50/80 p-2 sm:p-2.5 rounded-2xl border border-slate-200">
            <span className="block text-[11px] font-bold text-slate-500 mb-2 px-1">
              روش و کانال دریافت وجه:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectChannel("transfer")}
                className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  paymentChannel === "transfer"
                    ? "bg-white text-emerald-700 shadow-sm border border-emerald-300 font-black ring-2 ring-emerald-500/20"
                    : "bg-white/60 text-slate-600 hover:bg-white border border-slate-200/70"
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-600" />
                واریز به حساب / حواله پایا
              </button>

              <button
                type="button"
                onClick={() => handleSelectChannel("cashbox")}
                className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  paymentChannel === "cashbox"
                    ? "bg-white text-emerald-700 shadow-sm border border-emerald-300 font-black ring-2 ring-emerald-500/20"
                    : "bg-white/60 text-slate-600 hover:bg-white border border-slate-200/70"
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-600" />
                دریافت نقدی (صندوق)
              </button>

              <button
                type="button"
                onClick={() => handleSelectChannel("pos")}
                className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  paymentChannel === "pos"
                    ? "bg-white text-emerald-700 shadow-sm border border-emerald-300 font-black ring-2 ring-emerald-500/20"
                    : "bg-white/60 text-slate-600 hover:bg-white border border-slate-200/70"
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                دستگاه کارتخوان (POS)
              </button>

              <button
                type="button"
                onClick={() => handleSelectChannel("card")}
                className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  paymentChannel === "card"
                    ? "bg-white text-emerald-700 shadow-sm border border-emerald-300 font-black ring-2 ring-emerald-500/20"
                    : "bg-white/60 text-slate-600 hover:bg-white border border-slate-200/70"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                کارت به کارت
              </button>
            </div>
          </div>

          <form id="receive-receipt-form" onSubmit={onFormSubmit} className="space-y-6">
            
            {/* Top Grid: Person, Amount, Date, Resource */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">

              {/* Person Select (5 cols) */}
              <div className="lg:col-span-6 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" /> طرف حساب و پرداخت‌کننده وجه *
                  </span>
                  {selectedPerson && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      کد طرف‌حساب: {toPersianDigits(selectedPerson.personCode || selectedPerson.id)}
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      isRtl
                      value={
                        effectivePersonId && selectedPerson
                          ? {
                              value: String(effectivePersonId),
                              label: selectedPersonLabel,
                            }
                          : null
                      }
                      onChange={(option: any) => {
                        effectiveSetPersonId(option ? option.value : "");
                        if (typeof setReceiptLinkedInvoices === "function") {
                          setReceiptLinkedInvoices({});
                        }
                      }}
                      options={effectiveActivePersons.map(effectiveMapPerson) as any}
                      filterOption={customPersonFilter}
                      formatOptionLabel={(option: any) => (
                        <div className="flex items-center gap-2.5">
                          {option.imageUrl ? (
                            <img
                              src={option.imageUrl}
                              alt={option.label}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">
                            {option.label}
                          </span>
                        </div>
                      )}
                      placeholder="انتخاب یا جستجوی نام شخص / شرکت..."
                      noOptionsMessage={() => "شخصی یافت نشد"}
                      isClearable
                      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                      menuPosition="fixed"
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 99999 }),
                        control: (base) => ({
                          ...base,
                          borderRadius: "0.875rem",
                          borderColor: "#CBD5E1",
                          minHeight: "46px",
                          boxShadow: "none",
                          "&:hover": { borderColor: "#10B981" },
                        }),
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                    className="w-12 h-[46px] shrink-0 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-2xl flex items-center justify-center transition-colors shadow-2xs"
                    title="تعریف شخص جدید"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>

                {/* Person Mini Card & Debt Status */}
                {selectedPerson && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{resolvePersonName(selectedPerson)}</span>
                      {selectedPerson.phone && (
                        <span className="text-slate-500 font-mono text-[11px]" dir="ltr">
                          {selectedPerson.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {totalUnpaidInvoices > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptAmount(String(totalUnpaidInvoices));
                            let remaining = totalUnpaidInvoices;
                            const newAlloc: Record<string, number> = {};
                            for (const inv of personInvoices) {
                              const invTotal =
                                (inv.totalAmount || 0) *
                                (typeof getDefaultExchangeRate === "function"
                                  ? getDefaultExchangeRate(inv.currency, storeSettings?.currency)
                                  : 1);
                              const invPaid = inv.paidAmount || 0;
                              const invRemainder = Math.max(invTotal - invPaid, 0);
                              if (invRemainder > 0 && remaining > 0) {
                                const alloc = Math.min(invRemainder, remaining);
                                newAlloc[inv.id] = alloc;
                                remaining -= alloc;
                              }
                            }
                            setReceiptLinkedInvoices(newAlloc);
                          }}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title="تنظیم مبلغ رسید به اندازه کل فاکتورهای باز"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          تسویه کل فاکتورها: {toPersianDigits(addCommas(totalUnpaidInvoices))} {storeSettings?.currency || "تومان"}
                        </button>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                          فاکتور معوقه‌ای ندارد ✓
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Date Input (3 cols) */}
              <div className="lg:col-span-3 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" /> تاریخ ثبت رسید *
                </label>
                <div className="relative">
                  <DatePicker
                    value={receiptDate}
                    onChange={setReceiptDate}
                    calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                    locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                    calendarPosition="bottom-right"
                    inputClass={`w-full px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ${themeRing} outline-none font-sans font-black text-slate-900 text-center transition-all cursor-pointer text-sm min-h-[46px] shadow-2xs`}
                    containerClassName="w-full"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
              </div>

              {/* Number Badge Desktop (3 cols) */}
              <div className="lg:col-span-3 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" /> شماره سند رسید
                </label>
                <div className="w-full min-h-[46px] px-3.5 py-3 border border-slate-200 bg-slate-50/70 rounded-2xl font-mono text-center font-bold text-slate-800 text-sm flex items-center justify-center">
                  {receiptNumber ? toPersianDigits(receiptNumber) : "در حال صدور خودکار..."}
                </div>
              </div>

              {/* Amount Input (Full Row or prominent 6 cols) */}
              <div className="lg:col-span-6 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> مبلغ دریافتی ({storeSettings?.currency || "تومان"}) *
                  </label>
                  {receiptAmount && Number(String(receiptAmount).replace(/,/g, "")) > 0 && (
                    <span className="text-[11px] font-mono text-emerald-700 font-bold">
                      {toPersianDigits(addCommas(receiptAmount))} {storeSettings?.currency || "تومان"}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <CurrencyInput
                    value={receiptAmount}
                    onChange={(e: any) => setReceiptAmount(e.target.value)}
                    className="w-full pl-16 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-black text-slate-900 text-right text-lg md:text-xl transition-all shadow-2xs min-h-[48px]"
                    placeholder="۰"
                    inputMode="numeric"
                    required
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold text-xs select-none">
                    {storeSettings?.currency || "تومان"}
                  </div>
                </div>

                {/* Quick Amount Adders */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-bold ml-1">مبالغ سریع:</span>
                  {[
                    { label: "+۱ میلیون", val: 1000000 },
                    { label: "+۵ میلیون", val: 5000000 },
                    { label: "+۱۰ میلیون", val: 10000000 },
                    { label: "+۵۰ میلیون", val: 50000000 },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleAddAmount(chip.val)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg text-[11px] font-bold transition-colors"
                    >
                      {chip.label}
                    </button>
                  ))}
                  {receiptAmount && Number(String(receiptAmount).replace(/,/g, "")) > 0 && (
                    <button
                      type="button"
                      onClick={() => setReceiptAmount("")}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition-colors"
                      title="صفر کردن مبلغ"
                    >
                      پاک کردن
                    </button>
                  )}
                </div>

                {/* Amount in Words */}
                {receiptAmount &&
                  !isNaN(Number(String(receiptAmount).replace(/,/g, ""))) &&
                  Number(String(receiptAmount).replace(/,/g, "")) > 0 && (
                    <div className="p-3 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 border border-emerald-100 rounded-2xl text-xs leading-relaxed text-slate-700 flex items-center gap-2">
                      <span className="bg-emerald-200/70 text-emerald-900 text-[10px] px-2 py-0.5 rounded-md font-black shrink-0">
                        به حروف:
                      </span>
                      <strong className="font-bold text-slate-900">
                        {numToPersianWords(Number(String(receiptAmount).replace(/,/g, "")))} {storeSettings?.currency || "تومان"} تمام.
                      </strong>
                    </div>
                  )}
              </div>

              {/* Resource: Bank or Cashbox (3 cols) */}
              <div className="lg:col-span-3 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  {receiptResourceType === "bank" ? (
                    <Building2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  )}
                  {receiptResourceType === "bank" ? "حساب بانکی مقصد *" : "صندوق فروشگاهی مقصد *"}
                </label>

                {receiptResourceType === "bank" ? (
                  <select
                    value={receiptResourceId}
                    onChange={(e) => setReceiptResourceId(e.target.value)}
                    className="w-full min-h-[48px] p-2.5 border border-slate-200 bg-white rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-xs sm:text-sm text-slate-800 outline-none transition-shadow shadow-2xs"
                    required
                  >
                    <option value="">-- انتخاب حساب بانکی --</option>
                    {(accounts || []).map((acc: any, idx: number) => (
                      <option key={acc.id ? `rcpt-acc-${acc.id}` : `acc-idx-${idx}`} value={acc.id}>
                        {acc.bankName} - {acc.accountNumber} ({acc.accountHolder || "اصلی"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={receiptResourceId}
                    onChange={(e) => setReceiptResourceId(e.target.value)}
                    className="w-full min-h-[48px] p-2.5 border border-slate-200 bg-white rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-xs sm:text-sm text-slate-800 outline-none transition-shadow shadow-2xs"
                    required
                  >
                    <option value="">-- انتخاب صندوق --</option>
                    {(cashboxes || []).map((cb: any) => (
                      <option key={cb.id} value={cb.id}>
                        صندوق: {cb.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tracking / Reference Number (3 cols) */}
              <div className="lg:col-span-3 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-emerald-600" /> شماره پیگیری / ارجاع واریز
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="مثال: ۱۲۴۸۵۹۶۳"
                  className="w-full min-h-[48px] p-3 border border-slate-200 bg-white rounded-2xl focus:ring-2 focus:ring-emerald-500 font-mono text-center font-bold text-xs sm:text-sm text-slate-800 outline-none shadow-2xs"
                />
              </div>

              {/* Note / Description (Full 12 cols) */}
              <div className="lg:col-span-12 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" /> شرح و بابت دریافت وجه
                </label>
                <input
                  type="text"
                  value={receiptNote}
                  onChange={(e) => setReceiptNote(e.target.value)}
                  className="w-full p-3 border border-slate-200 bg-white rounded-2xl focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-bold text-slate-800 outline-none transition-shadow shadow-2xs"
                  placeholder="شرح دریافت وجه را وارد کنید یا از برچسب‌های زیر انتخاب نمایید..."
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "تسویه فاکتور فروش",
                    "پیش‌دریافت سفارش",
                    "تسویه مانده بدهی",
                    "دریافت وجه دستی نقدی",
                    "واریز وجه به حساب",
                  ].map((qNote) => (
                    <button
                      key={qNote}
                      type="button"
                      onClick={() =>
                        setReceiptNote((prev: string) => (prev ? `${prev} - ${qNote}` : qNote))
                      }
                      className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg text-[11px] font-bold transition-colors"
                    >
                      {qNote}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Invoices Allocation Section */}
            {personInvoices.length > 0 && (
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsInvoicesExpanded(!isInvoicesExpanded)}
                  className="w-full p-4 flex items-center justify-between bg-slate-100/60 hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span className="font-black text-xs sm:text-sm text-slate-800">
                      تخصیص مبلغ به فاکتورهای باز ({toPersianDigits(personInvoices.length)} فاکتور)
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      مانده کل: {toPersianDigits(addCommas(totalUnpaidInvoices))} {storeSettings?.currency || "تومان"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${
                      isInvoicesExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isInvoicesExpanded && (
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-500 font-medium">
                      می‌توانید با دکمه تسویه هر فاکتور یا وارد کردن مبلغ، دریافت جاری را بین فاکتورها توزیع نمایید:
                    </p>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-xs text-right bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                            <th className="p-3">شماره فاکتور</th>
                            <th className="p-3">تاریخ فاکتور</th>
                            <th className="p-3">مبلغ کل فاکتور</th>
                            <th className="p-3">مانده تسویه‌نشده</th>
                            <th className="p-3">مبلغ تخصیصی در این رسید</th>
                          </tr>
                        </thead>
                        <tbody>
                          {personInvoices.map((inv: any) => {
                            const total =
                              (inv.totalAmount || 0) *
                              (typeof getDefaultExchangeRate === "function"
                                ? getDefaultExchangeRate(inv.currency, storeSettings?.currency)
                                : 1);
                            const paid = inv.paidAmount || 0;
                            const remainder = Math.max(total - paid, 0);
                            const currentAllocated = receiptLinkedInvoices[inv.id] || 0;
                            return (
                              <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                                <td className="p-3 font-mono font-bold text-slate-700">
                                  {toPersianDigits(inv.invoiceNumber) || `#${toPersianDigits(inv.id)}`}
                                </td>
                                <td className="p-3 font-mono text-slate-600">
                                  {formatDateDisplay(inv.date || inv.jalaliDate)}
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-800">
                                  {formatCurrency ? formatCurrency(total) : addCommas(total)}
                                </td>
                                <td className="p-3 font-mono font-black text-rose-600">
                                  {formatCurrency ? formatCurrency(remainder) : addCommas(remainder)}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2 justify-end">
                                    <button
                                      type="button"
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        currentAllocated === remainder
                                          ? "bg-emerald-600 text-white shadow-2xs"
                                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                      }`}
                                      onClick={() => {
                                        setReceiptLinkedInvoices((prev: any) => ({
                                          ...prev,
                                          [inv.id]: remainder,
                                        }));
                                      }}
                                    >
                                      تسویه کامل
                                    </button>
                                    <input
                                      type="number"
                                      className="p-1.5 px-2 border border-slate-200 rounded-lg text-xs font-mono font-bold w-32 outline-none focus:border-emerald-500 bg-white"
                                      placeholder="۰"
                                      value={currentAllocated || ""}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (val > remainder) {
                                          customAlert("مبلغ تخصیصی نمی‌تواند بیشتر از مانده فاکتور باشد");
                                          return;
                                        }
                                        setReceiptLinkedInvoices((prev: any) => ({
                                          ...prev,
                                          [inv.id]: val,
                                        }));
                                      }}
                                      min={0}
                                      max={remainder}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden space-y-2">
                      {personInvoices.map((inv: any) => {
                        const total =
                          (inv.totalAmount || 0) *
                          (typeof getDefaultExchangeRate === "function"
                            ? getDefaultExchangeRate(inv.currency, storeSettings?.currency)
                            : 1);
                        const paid = inv.paidAmount || 0;
                        const remainder = Math.max(total - paid, 0);
                        const currentAllocated = receiptLinkedInvoices[inv.id] || 0;
                        return (
                          <div key={inv.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black text-slate-800">
                                فاکتور {toPersianDigits(inv.invoiceNumber) || `#${toPersianDigits(inv.id)}`}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {formatDateDisplay(inv.date || inv.jalaliDate)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-y border-slate-100">
                              <div>
                                <span className="text-slate-400 block text-[10px] font-bold">مبلغ کل:</span>
                                <span className="font-mono font-bold text-slate-700">
                                  {formatCurrency ? formatCurrency(total) : addCommas(total)}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-slate-400 block text-[10px] font-bold">مانده:</span>
                                <span className="font-mono font-black text-rose-600">
                                  {formatCurrency ? formatCurrency(remainder) : addCommas(remainder)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptLinkedInvoices((prev: any) => ({ ...prev, [inv.id]: remainder }));
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap"
                              >
                                تسویه فاکتور
                              </button>
                              <input
                                type="number"
                                className="flex-1 py-1 px-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-500 bg-white"
                                placeholder="مبلغ..."
                                value={currentAllocated || ""}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val > remainder) {
                                    customAlert("مبلغ تخصیصی نمی‌تواند بیشتر از مانده فاکتور باشد");
                                    return;
                                  }
                                  setReceiptLinkedInvoices((prev: any) => ({
                                    ...prev,
                                    [inv.id]: val,
                                  }));
                                }}
                                min={0}
                                max={remainder}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-2 text-xs font-bold text-slate-600 flex justify-between sm:justify-end gap-2 items-center pt-2 border-t border-slate-200">
                      <span>جمع تخصیص یافته:</span>
                      <span className="font-mono text-sm font-black text-emerald-700">
                        {toPersianDigits(
                          addCommas(
                            Number(
                              Object.values(receiptLinkedInvoices || {}).reduce(
                                (a: number, b: any) => a + Number(b || 0),
                                0
                              )
                            )
                          )
                        )}{" "}
                        {storeSettings?.currency || "تومان"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop & Tablet Submit Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500 font-medium hidden sm:block">
                کلید میانبر ذخیره سریع: <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded font-mono text-xs">Ctrl + Enter</kbd>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {typeof onClose === "function" && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold text-xs sm:text-sm transition-colors cursor-pointer w-full sm:w-auto"
                  >
                    انصراف
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingReceipt || !effectivePersonId || !receiptAmount}
                  className={`px-8 py-3.5 ${themeBg} text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer min-h-[48px] w-full sm:w-auto`}
                >
                  {submittingReceipt ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      در حال ثبت و صدور سند...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      ثبت و صدور رسید دریافت وجه
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Floating Sticky Submit Bar */}
            <div className="md:hidden fixed bottom-16 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-slate-500">مبلغ رسید:</span>
                <span className="font-mono font-black text-sm text-slate-900 truncate">
                  {receiptAmount && Number(String(receiptAmount).replace(/,/g, "")) > 0 ? (
                    `${toPersianDigits(addCommas(receiptAmount))} ${storeSettings?.currency || "تومان"}`
                  ) : (
                    "۰ تومان"
                  )}
                </span>
              </div>
              <button
                type="submit"
                disabled={submittingReceipt || !receiptAmount || !effectivePersonId}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 min-h-[44px] shrink-0"
              >
                {submittingReceipt ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                ثبت رسید دریافت
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}
