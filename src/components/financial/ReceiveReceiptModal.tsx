import React, { useState, useEffect } from "react";
import { getReceivedChecks } from "../../services/dataService";
import { addCommas } from "../../utils/format";
import { motion } from "framer-motion";
import { RefreshCw, Save, ArrowDownLeft, ArrowUpRight, CheckCircle, FileText, Calendar, Building2, User, UserPlus, Wallet, DollarSign, CreditCard, Printer, X, CheckSquare, Phone } from "lucide-react";
import Select from "react-select";
import CurrencyInput from "../common/CurrencyInput";
import CustomDatePicker from "../ui/CustomDatePicker";
import DatePickerModule from "react-multi-date-picker";
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
    setReceiptPersonId, setIsPersonModalOpen,
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
    receiptCheckNumber,
    setReceiptCheckNumber,
    receiptCheckDueDate,
    setReceiptCheckDueDate,
    receiptCheckBankName,
    setReceiptCheckBankName,
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
    receiptCheckbookId,
    setReceiptCheckbookId,
    checkbooks,
    issuedChecks
  } = props;

  
  const [nearbyChecks, setNearbyChecks] = useState<any[]>([]);
  useEffect(() => {
    if (receiptMethod === 'check' && receiptCheckDueDate) {
      // Calculate +/- 30 days
      const fetchChecks = async () => {
        try {
          const allChecks = await getReceivedChecks();
          
          const selectedDate = new Date(receiptCheckDueDate);
          // Sometimes receiptCheckDueDate is a DateObject, so handle it
          let targetTime = 0;
          if (receiptCheckDueDate?.toDate) {
            targetTime = receiptCheckDueDate.toDate().getTime();
          } else if (typeof receiptCheckDueDate === 'string' || typeof receiptCheckDueDate === 'number') {
            targetTime = new Date(receiptCheckDueDate).getTime();
          }
          
          if (!targetTime || isNaN(targetTime)) return;
          
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
          const minTime = targetTime - thirtyDaysMs;
          const maxTime = targetTime + thirtyDaysMs;
          
          const nearby = allChecks.filter(c => {
            if (!c.dueDate) return false;
            const checkTime = new Date(c.dueDate).getTime();
            return checkTime >= minTime && checkTime <= maxTime;
          });
          
          setNearbyChecks(nearby);
        } catch(e) {
          console.error(e);
        }
      };
      fetchChecks();
    } else {
      setNearbyChecks([]);
    }
  }, [receiptCheckDueDate, receiptMethod]);
  
const isReceive = true;

        const themeRing = isReceive
          ? "focus:ring-emerald-500"
          : "focus:ring-rose-500";
        const themeText = isReceive ? "text-emerald-600" : "text-rose-600";
        const themeBg = isReceive
          ? "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300"
          : "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300";
        const themeLightBg = isReceive ? "bg-emerald-50/50" : "bg-rose-50/50";
        const themeBorder = isReceive
          ? "border-emerald-200"
          : "border-rose-200";
        const themeIcon = isReceive ? "text-emerald-500" : "text-rose-500";
        const gradientBox = isReceive
          ? "from-emerald-50/40 to-teal-50/40 border-emerald-200/70"
          : "from-rose-50/40 to-orange-50/40 border-rose-200/70";
        const themeBadge = isReceive
          ? "bg-emerald-100 text-emerald-800"
          : "bg-rose-100 text-rose-800";

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
            (inv.type === "sale" || inv.type === "purchase_return"),
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

        return (
          <div className="w-full font-sans pb-32 md:pb-6" dir="rtl">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full flex flex-col overflow-hidden relative">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-emerald-50/60">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-800">ثبت رسید دریافت وجه</h2>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-500 mt-0.5">ثبت دریافتی‌های نقدی، حواله بانکی و چک</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] sm:text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-800 shadow-2xs whitespace-nowrap">
                    شماره: {toPersianDigits(receiptNumber || "رزرو...")}
                  </span>
                  {typeof onClose === "function" && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="بستن"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">

            {receiptHasDraft && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center text-amber-800 shadow-sm col-span-full w-full">
                <span className="font-bold flex items-center gap-2.5 mb-3 md:mb-0">
                  <CheckSquare className="w-5 h-5 text-amber-500" /> یک پیش‌نویس ثبت‌نشده از فرم دریافت/پرداخت بازیابی شد. مایلید از آن استفاده کنید یا رسید جدیدی آغاز کنید؟
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={restoreReceiptDraft}
                    className="px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-sm font-bold transition-colors"
                  >
                    بازیابی پیش‌نویس
                  </button>
                  <button
                    onClick={discardReceiptDraft}
                    className="px-4 py-2.5 bg-white border border-amber-200 hover:bg-amber-50 rounded-xl text-sm font-bold transition-colors"
                  >
                    پاک کردن و فرم جدید
                  </button>
                </div>
              </div>
            )}

            {lastCreatedReceipt && (
              <div className="bg-emerald-50 text-emerald-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-200 shadow-xs font-bold animate-fadeIn">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600 block shrink-0" />
                  <div>
                    <p className="text-sm font-extrabold text-emerald-950">
                      {lastCreatedReceipt.type === "receive"
                        ? "سند رسید دریافت رسمی صادر شد"
                        : "سند رسید پرداخت رسمی صادر شد"}
                    </p>
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      شماره رسید:{" "}
                      <span className="font-mono text-slate-800">
                        {lastCreatedReceipt.receiptNumber ||
                          `#${lastCreatedReceipt.id}`}
                      </span>{" "}
                      | مبلغ:{" "}
                      <span className="font-sans font-extrabold text-slate-800">
                        {toPersianDigits(
                          formatNumber(lastCreatedReceipt.amount),
                        )}
                      </span>{" "}
                      {storeSettings.currency || "تومان"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPrintingTransaction(lastCreatedReceipt)}
                    className="px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all border-none shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    <Printer className="w-4 h-4" />
                    چاپ و پیش‌نمایش رسید
                  </button>
                  <button
                    type="button"
                    onClick={() => setLastCreatedReceipt(null)}
                    className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {receiptSuccessMsg && (
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 border border-green-100 font-bold shadow-sm">
                <CheckCircle className="w-5 h-5" />
                {receiptSuccessMsg}
              </div>
            )}

            <div className={`bg-white rounded-2xl p-3 sm:p-5 md:p-6 shadow-xs border ${themeBorder} ${themeLightBg}`}>

              <div className="flex flex-row gap-1.5 w-full sm:max-w-[420px] mb-5 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setReceiptMethod("cash")}
                  className={`flex-1 flex gap-1.5 sm:gap-2 justify-center items-center py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm min-h-[44px] transition-all ${
                    receiptMethod === "cash"
                      ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  نقدی / حواله بانکی
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptMethod("check")}
                  className={`flex-1 flex gap-1.5 sm:gap-2 justify-center items-center py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm min-h-[44px] transition-all ${
                    receiptMethod === "check"
                      ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  ثبت چک دریافتی
                </button>
              </div>

              <form
                onSubmit={(e) =>
                  handleSubmitReceipt("receive", e)
                }
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {/* Receipt Number - visible in desktop grid, badge shown in header on mobile */}
                  <div className="hidden md:block lg:col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <FileText className="w-4 h-4" /> شماره رسید
                    </label>
                    <div className="w-full p-2.5 border rounded-xl font-mono text-left opacity-70 flex items-center justify-end bg-emerald-50/20 border-emerald-100 font-bold text-emerald-800">
                      {receiptNumber || "در حال رزرو..."}
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-4 h-4" /> طرف حساب (شخص/شرکت) *
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
                            <div className="flex items-center gap-3">
                              {option.imageUrl ? (
                                <img
                                  src={option.imageUrl}
                                  alt={option.label}
                                  className="w-8 h-8 rounded-full object-cover shadow-sm border border-slate-200"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                                  <User className="w-4 h-4 text-slate-400" />
                                </div>
                              )}
                              <span className="font-bold text-slate-700">
                                {option.label}
                              </span>
                            </div>
                          )}
                          placeholder="انتخاب یا جستجوی نام شخص..."
                          noOptionsMessage={() => "شخصی یافت نشد"}
                          isClearable
                          menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                          menuPosition="fixed"
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 99999 }),
                            control: (base) => ({
                              ...base,
                              borderRadius: "0.75rem",
                              borderColor: "#E2E8F0",
                              minHeight: "44px",
                              padding: "2px",
                              boxShadow: "none",
                              "&:hover": {
                                borderColor: "#34D399",
                              },
                            }),
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                        className="w-11 h-11 shrink-0 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl flex items-center justify-center transition-colors shadow-xs active:bg-slate-100"
                        title="تعریف شخص جدید"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    </div>
                    <input
                      type="hidden"
                      required
                      value={effectivePersonId}
                      onChange={() => {}}
                    />
                    {effectivePersonId && (
                      typeof renderPersonInfoBox === "function" ? (
                        renderPersonInfoBox(
                          effectivePersonId,
                          `${isReceive ? "bg-emerald-50/50 border-emerald-100/50" : "bg-rose-50/50 border-rose-100/50"} text-slate-600`
                        )
                      ) : selectedPerson ? (
                        <div className="mt-2 text-xs font-bold w-full bg-emerald-50/50 border-emerald-100/50 text-slate-600 border rounded-xl p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between pb-2 border-b border-black/5">
                            <div className="flex items-center gap-1.5 font-black text-slate-800 text-sm">
                              <User className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{resolvePersonName(selectedPerson)}</span>
                              {selectedPerson.personCode && (
                                <span className="text-[11px] font-mono font-bold text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-black/5">
                                  کد: {toPersianDigits ? toPersianDigits(selectedPerson.personCode) : selectedPerson.personCode}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                              {selectedPerson.role === "customer" ? "مشتری" : selectedPerson.role === "supplier" ? "تأمین‌کننده" : "طرف‌حساب"}
                            </span>
                          </div>
                          {selectedPerson.phone && (
                            <div className="flex items-center gap-1.5 opacity-90 font-medium">
                              <Phone className="w-3.5 h-3.5" />
                              <span dir="ltr">{selectedPerson.phone}</span>
                            </div>
                          )}
                        </div>
                      ) : null
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <DollarSign className={`w-4 h-4 ${themeIcon}`} /> مبلغ سند
                      ({storeSettings?.currency || "تومان"}) *
                    </label>
                    <div className="relative">
                      <CurrencyInput
                        value={receiptAmount}
                        onChange={(e: any) => setReceiptAmount(e.target.value)}
                        className={`w-full pl-16 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ${themeRing} outline-none font-sans font-mono font-black text-slate-900 text-right text-lg md:text-xl transition-all shadow-sm min-h-[44px]`}
                        placeholder="۰"
                        inputMode="numeric"
                        required
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold text-xs select-none">
                        {storeSettings?.currency || "تومان"}
                      </div>
                    </div>

                    {/* Quick Amount Helper Chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        { label: "+۱ م", val: 1000000 },
                        { label: "+۵ م", val: 5000000 },
                        { label: "+۱۰ م", val: 10000000 },
                        { label: "+۵۰ م", val: 50000000 },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            const cur = Number(String(receiptAmount || "0").replace(/,/g, "")) || 0;
                            setReceiptAmount(String(cur + item.val));
                          }}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                        >
                          {item.label}
                        </button>
                      ))}
                      {receiptAmount && Number(String(receiptAmount).replace(/,/g, "")) > 0 && (
                        <button
                          type="button"
                          onClick={() => setReceiptAmount("")}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                        >
                          پاک کردن
                        </button>
                      )}
                    </div>

                    {/* Quick Full Unpaid Invoices Payoff Button */}
                    {effectivePersonId && totalUnpaidInvoices > 0 && (
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
                        className="w-full mt-2 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-black flex items-center justify-between transition-colors shadow-2xs"
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                          تسویه کامل تمام فاکتورهای باز
                        </span>
                        <span className="font-mono font-bold">
                          {toPersianDigits(addCommas(totalUnpaidInvoices))} {storeSettings?.currency || "تومان"}
                        </span>
                      </button>
                    )}

                    {receiptAmount &&
                      !isNaN(Number(String(receiptAmount).replace(/,/g, ""))) &&
                      Number(String(receiptAmount).replace(/,/g, "")) > 0 && (
                        <div
                          className={`mt-2.5 p-3 sm:p-4 bg-gradient-to-br ${gradientBox} border rounded-2xl text-xs leading-relaxed text-right space-y-2 shadow-sm`}
                        >
                          <div className="text-slate-500 font-bold flex items-center gap-2 justify-start">
                            <span
                              className={`${themeBadge} text-[10px] px-2 py-0.5 rounded-md font-extrabold font-sans font-mono`}
                            >
                              جمع عددی:
                            </span>
                            <strong
                              className="text-slate-900 font-mono font-black text-base md:text-lg tracking-wide inline-block"
                              dir="ltr"
                            >
                              {formatNumber(Number(String(receiptAmount).replace(/,/g, "")))}
                            </strong>
                            <span className="text-slate-400 font-semibold">
                              {storeSettings?.currency || "تومان"}
                            </span>
                          </div>
                          <div className="h-px bg-slate-200/70 w-full" />
                          <div className="text-slate-500 font-bold flex items-baseline gap-2 justify-start flex-wrap">
                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-md font-extrabold font-sans font-mono">
                              به حروف:
                            </span>
                            <strong className="text-slate-900 font-sans font-black text-xs md:text-sm inline-block leading-relaxed">
                              {numToPersianWords(Number(String(receiptAmount).replace(/,/g, "")))}
                            </strong>
                            <span className="text-slate-600 font-semibold">
                              {" "}
                              {storeSettings?.currency || "تومان"} تمام.
                            </span>
                          </div>
                        </div>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Calendar
                        className={`w-4 h-4 ${themeIcon} animate-pulse`}
                      />{" "}
                      تاریخ سند (جلالی) *
                    </label>
                    <div className="relative">
                      <DatePicker
                        value={receiptDate}
                        onChange={setReceiptDate}
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
                        inputClass={`w-full pl-11 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ${themeRing} outline-none font-sans font-black text-slate-900 text-center transition-all cursor-pointer shadow-sm text-base min-h-[44px]`}
                        containerClassName="w-full"
                      />
                      <div
                        className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${themeIcon}`}
                      >
                        <Calendar className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {receiptMethod === "cash" ? (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          نوع منبع مالی
                        </label>
                        <select
                          value={receiptResourceType}
                          onChange={(e) => {
                            const newType = e.target.value as "bank" | "cashbox";
                            setReceiptResourceType(newType);
                            if (newType === "bank") {
                              setReceiptResourceId((accounts && accounts[0]?.id) || "");
                            } else {
                              setReceiptResourceId((cashboxes && cashboxes[0]?.id) || "");
                            }
                          }}
                          className={`w-full min-h-[44px] p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} font-bold text-sm text-slate-800 outline-none transition-shadow`}
                        >
                          <option value="bank">حساب بانکی</option>
                          <option value="cashbox">صندوق فروشگاهی</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          {receiptResourceType === "bank"
                            ? "بانک مقصد"
                            : "صندوق مقصد"}
                        </label>
                        {receiptResourceType === "bank" ? (
                          <select
                            value={receiptResourceId}
                            onChange={(e) =>
                              setReceiptResourceId(e.target.value)
                            }
                            className={`w-full min-h-[44px] p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} font-bold text-sm text-slate-800 outline-none transition-shadow`}
                            required
                          >
                            <option value="">-- انتخاب بانک --</option>
                            {(accounts || []).map((acc: any, idx: number) => (
                              <option key={acc.id ? `rpf-acc-${acc.id}-${idx}` : `rpf-acc-idx-${idx}`} value={acc.id}>
                                {acc.bankName} - {acc.accountNumber}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={receiptResourceId}
                            onChange={(e) =>
                              setReceiptResourceId(e.target.value)
                            }
                            className={`w-full min-h-[44px] p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} font-bold text-sm text-slate-800 outline-none transition-shadow`}
                            required
                          >
                            <option value="">-- انتخاب صندوق --</option>
                            {(cashboxes || []).map((cb: any) => (
                              <option key={cb.id} value={cb.id}>
                                {cb.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          شماره چک *
                        </label>
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          value={receiptCheckNumber}
                          onChange={(e) =>
                            setReceiptCheckNumber(e.target.value)
                          }
                          placeholder="شماره چک صیادی / عادی"
                          className={`w-full min-h-[44px] p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} text-center font-mono font-bold text-sm text-slate-800 outline-none transition-shadow`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <Calendar className={`w-4 h-4 ${themeIcon}`} /> تاریخ
                          سررسید *
                        </label>
                        <div className="relative">
                          <DatePicker
                            value={receiptCheckDueDate}
                            onChange={setReceiptCheckDueDate}
                            calendar={persian}
                            locale={persian_fa}
                            calendarPosition="bottom-right"
                            inputClass={`w-full min-h-[44px] px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ${themeRing} outline-none font-sans font-black text-slate-900 text-center transition-all cursor-pointer shadow-sm text-base`}
                            containerClassName="w-full"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          نام بانک صادرکننده چک *
                        </label>
                        <input
                          type="text"
                          required
                          value={receiptCheckBankName}
                          onChange={(e) =>
                            setReceiptCheckBankName(e.target.value)
                          }
                          placeholder="مثال: ملت، ملی ..."
                          className={`w-full min-h-[44px] p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} font-bold text-sm text-slate-800 outline-none transition-shadow`}
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {["ملت", "ملی", "صادرات", "تجارت", "سپه", "کشاورزی", "پاسارگاد", "سامان"].map((bName) => (
                            <button
                              key={bName}
                              type="button"
                              onClick={() => setReceiptCheckBankName(bName)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                receiptCheckBankName === bName
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {bName}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="col-span-full">
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      توضیحات و بابت
                    </label>
                    <textarea
                      value={receiptNote}
                      onChange={(e) => setReceiptNote(e.target.value)}
                      className={`w-full p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} text-sm font-bold text-slate-800 outline-none transition-shadow`}
                      rows={2}
                      placeholder="شرح تراکنش و بابت تراکنش..."
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["تسویه حساب", "بیعانه سفارش", "دریافت مطالبات", "پیش‌پرداخت", "قسط"].map((qNote) => (
                        <button
                          key={qNote}
                          type="button"
                          onClick={() => setReceiptNote((prev: string) => prev ? `${prev} - ${qNote}` : qNote)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors shadow-2xs"
                        >
                          {qNote}
                        </button>
                      ))}
                    </div>
                  </div>

                  {personInvoices.length > 0 && (
                    <div className="col-span-full bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs mt-2">
                      <h3 className="font-black text-sm text-slate-800 mb-1.5 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                        تخصیص به فاکتورهای باز (اختیاری)
                      </h3>
                      <p className="text-xs text-slate-500 font-bold mb-3">
                        میتوانید مبلغ رسید را به صورت مستقیم بین فاکتورهای باز تسویه فرمایید
                      </p>

                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-right bg-white rounded-xl border border-slate-200 overflow-hidden">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                              <th className="p-3">شماره فاکتور</th>
                              <th className="p-3">تاریخ</th>
                              <th className="p-3">مبلغ کل فاکتور</th>
                              <th className="p-3">مانده وتسویه نشده</th>
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
                                <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                  <td className="p-3 font-mono text-xs font-bold text-slate-600">
                                    {toPersianDigits(inv.invoiceNumber) || `#${toPersianDigits(inv.id)}`}
                                  </td>
                                  <td className="p-3 font-mono text-xs">
                                    {formatDateDisplay(inv.date || inv.jalaliDate)}
                                  </td>
                                  <td className="p-3 font-mono text-xs font-bold text-slate-700">
                                    {formatCurrency ? formatCurrency(total) : addCommas(total)}
                                  </td>
                                  <td className="p-3 font-mono text-xs font-bold text-rose-600">
                                    {formatCurrency ? formatCurrency(remainder) : addCommas(remainder)}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2 justify-end">
                                      <button
                                        type="button"
                                        className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors border border-indigo-100"
                                        title="تخصیص حداکثری"
                                        onClick={() => {
                                          setReceiptLinkedInvoices((prev: any) => ({
                                            ...prev,
                                            [inv.id]: remainder,
                                          }));
                                        }}
                                      >
                                        <CheckSquare className="w-3.5 h-3.5" />
                                      </button>
                                      <input
                                        type="number"
                                        className="p-1.5 px-2 border border-slate-200 rounded-md text-xs font-mono w-28 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 bg-white transition-all shadow-sm"
                                        placeholder="0"
                                        value={currentAllocated || ""}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          if (val > remainder) {
                                            customAlert("مبلغ تخصیصی نمیتواند بیشتر از مانده فاکتور باشد");
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
                      <div className="md:hidden space-y-2.5">
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
                                <span className="font-mono text-xs font-extrabold text-slate-800">
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
                                    {formatCurrency ? formatCurrency(total) : addCommas(total)} {storeSettings?.currency || "تومان"}
                                  </span>
                                </div>
                                <div className="text-left">
                                  <span className="text-slate-400 block text-[10px] font-bold">مانده تسویه‌نشده:</span>
                                  <span className="font-mono font-black text-rose-600">
                                    {formatCurrency ? formatCurrency(remainder) : addCommas(remainder)} {storeSettings?.currency || "تومان"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReceiptLinkedInvoices((prev: any) => ({ ...prev, [inv.id]: remainder }));
                                  }}
                                  className={`px-3 py-2 rounded-xl text-xs font-black transition-colors whitespace-nowrap min-h-[38px] ${
                                    currentAllocated === remainder
                                      ? "bg-indigo-600 text-white shadow-xs"
                                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                                  }`}
                                >
                                  تسویه کامل
                                </button>
                                <div className="flex-1 relative">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white min-h-[38px]"
                                    placeholder="مبلغ تخصیصی..."
                                    value={currentAllocated || ""}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      if (val > remainder) {
                                        customAlert("مبلغ تخصیصی نمیتواند بیشتر از مانده فاکتور باشد");
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
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 text-xs font-bold text-slate-600 flex justify-between sm:justify-end gap-2 items-center pt-2 border-t border-slate-200">
                        <span>جمع مبالغ تخصیص یافته:</span>
                        <span className="font-mono text-sm font-black text-indigo-700">
                          {formatCurrency
                            ? formatCurrency(
                                Object.values(receiptLinkedInvoices).reduce(
                                  (a: any, b: any) => Number(a) + Number(b),
                                  0,
                                ),
                              )
                            : addCommas(
                                Number(
                                  Object.values(receiptLinkedInvoices).reduce(
                                    (a: any, b: any) => Number(a) + Number(b),
                                    0,
                                  ),
                                ),
                              )}{" "}
                          {storeSettings?.currency || "تومان"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop & Standard Submit Button */}
                <div className="flex flex-col md:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={submittingReceipt}
                    className={`px-8 py-3 ${themeBg} text-white rounded-xl font-bold flex items-center justify-center w-full md:w-auto gap-2 transition-colors border-none cursor-pointer shadow-sm min-h-[48px]`}
                  >
                    {submittingReceipt ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    ثبت و صدور رسید تراکنش
                  </button>
                </div>

                {/* Mobile Floating Bottom Bar - Placed right above mobile menu (bottom-16) */}
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
                    className={`px-5 py-2.5 ${themeBg} text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 min-h-[44px] shrink-0`}
                  >
                    {submittingReceipt ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    ثبت و صدور رسید
                  </button>
                </div>
              </form>
            </div>
          </div>
            </div>
          </div>
        );

}
