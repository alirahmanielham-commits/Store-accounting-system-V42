import React, { useState, useEffect } from "react";
import { getReceivedChecks } from "../../services/dataService";
import { motion } from "framer-motion";
import { RefreshCw, Save, ArrowDownLeft, ArrowUpRight, CheckCircle, FileText, Calendar, Building2, User, UserPlus, Wallet, DollarSign, CreditCard, Printer, X, CheckSquare } from "lucide-react";
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

        return (
          <div className="w-full font-sans" dir="rtl">
<div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full flex flex-col overflow-hidden relative">
              {/* Header */}
              <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">ثبت رسید دریافت وجه</h2>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">ثبت دریافتی‌های نقدی و چکی</p>
                  </div>
                </div>
                
              </div>
              
              <div className="p-4 md:p-6 space-y-6">

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
              <div className="bg-emerald-50 text-emerald-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-200 shadow-xs font-bold animate-fadeIn">
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
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all border-none shadow-sm cursor-pointer whitespace-nowrap"
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

            <div className={`bg-white rounded-2xl p-4 md:p-6 shadow-sm border ${themeBorder} ${themeLightBg}`}>
              

              <div className="flex flex-col sm:flex-row gap-2 max-w-[400px] mb-6 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setReceiptMethod("cash")}
                  className={`flex-1 flex gap-2 justify-center items-center py-2.5 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${receiptMethod === "cash" ? (isReceive ? "bg-white text-emerald-700 shadow-[0_2px_4px_rgba(16,185,129,0.1)] border-emerald-200" : "bg-white text-rose-700 shadow-[0_2px_4px_rgba(244,63,94,0.1)] border-rose-200") : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 block border border-transparent"}`}
                >
                  <DollarSign className="w-4 h-4" />
                  نقدی / فیش بانکی / حواله
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptMethod("check")}
                  className={`flex-1 flex gap-2 justify-center items-center py-2.5 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${receiptMethod === "check" ? (isReceive ? "bg-white text-emerald-700 shadow-[0_2px_4px_rgba(16,185,129,0.1)] border-emerald-200" : "bg-white text-rose-700 shadow-[0_2px_4px_rgba(244,63,94,0.1)] border-rose-200") : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 block border border-transparent"}`}
                >
                  <CreditCard className="w-4 h-4" />
                  {isReceive ? "ثبت چک دریافتی" : "صدور چک"}
                </button>
              </div>

              <form
                onSubmit={(e) =>
                  handleSubmitReceipt(isReceive ? "receive" : "pay", e)
                }
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <FileText className="w-4 h-4" /> شماره رسید
                    </label>
                    <div className={`w-full p-2.5 border rounded-xl font-mono text-left opacity-70 flex items-center justify-end ${isReceive ? 'bg-emerald-50/20 border-emerald-100 font-bold text-emerald-800' : 'bg-rose-50/20 border-rose-100 font-bold text-rose-800'}`}>
                        {receiptNumber || "در حال رزرو..."}
                    </div>
                  </div>
                  <div className="lg:col-span-3 md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <User className="w-4 h-4" /> طرف حساب (شخص/شرکت)
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select
                          isRtl
                      value={
                        receiptPersonId
                          ? {
                              value: receiptPersonId,
                              label: persons.find(
                                (p) =>
                                  p.id.toString() ===
                                  receiptPersonId.toString(),
                              )?.personCode
                                ? "[" +
                                  persons.find(
                                    (p) =>
                                      p.id.toString() ===
                                      receiptPersonId.toString(),
                                  )?.personCode +
                                  "] " +
                                  (persons.find(
                                    (p) =>
                                      p.id.toString() ===
                                      receiptPersonId.toString(),
                                  )?.alias ||
                                    persons.find(
                                      (p) =>
                                        p.id.toString() ===
                                        receiptPersonId.toString(),
                                    )?.name)
                                : persons.find(
                                    (p) =>
                                      p.id.toString() ===
                                      receiptPersonId.toString(),
                                  )?.alias ||
                                  persons.find(
                                    (p) =>
                                      p.id.toString() ===
                                      receiptPersonId.toString(),
                                  )?.name,
                            }
                          : null
                      }
                      onChange={(option: any) => {
                        setReceiptPersonId(option ? option.value : "");
                        setReceiptLinkedInvoices({});
                      }}
                      options={(activePersonsOnly || []).map(mapPersonToOption) as any}
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
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderRadius: "0.75rem",
                          borderColor: "#E5E7EB",
                          padding: "2px",
                          boxShadow: "none",
                          "&:hover": {
                            borderColor: isReceive ? "#34D399" : "#FB7185",
                          },
                        }),
                      }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                        className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-4 flex items-center justify-center transition-colors shadow-sm"
                        title="تعریف شخص جدید"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    </div>
                    <input
                      type="hidden"
                      required
                      value={receiptPersonId}
                      onChange={() => {}}
                    />
                    {receiptPersonId &&
                      renderPersonInfoBox(
                        receiptPersonId,
                        `${isReceive ? "bg-emerald-50/50 border-emerald-100/50" : "bg-rose-50/50 border-rose-100/50"} text-slate-600`,
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Calendar
                        className={`w-4 h-4 ${themeIcon} animate-pulse`}
                      />{" "}
                      تاریخ سند (جلالی)
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
                        inputClass={`w-full pl-11 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ${themeRing} outline-none font-sans font-black text-slate-900 text-center transition-all cursor-pointer shadow-sm text-base`}
                        containerClassName="w-full"
                      />
                      <div
                        className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${themeIcon}`}
                      >
                        <Calendar className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <DollarSign className={`w-4 h-4 ${themeIcon}`} /> مبلغ سند
                      ({storeSettings.currency || "تومان"})
                    </label>
                    <div className="relative">
                      <CurrencyInput
                        value={receiptAmount}
                        onChange={(e: any) => setReceiptAmount(e.target.value)}
                        className={`w-full pl-16 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ${themeRing} outline-none font-sans font-mono font-black text-slate-900 text-right text-lg md:text-xl transition-all shadow-sm`}
                        placeholder="۰"
                        required
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold text-xs select-none">
                        {storeSettings?.currency || "تومان"}
                      </div>
                    </div>
                    {receiptAmount &&
                      !isNaN(Number(receiptAmount)) &&
                      Number(receiptAmount) > 0 && (
                        <div
                          className={`mt-2.5 p-4 bg-gradient-to-br ${gradientBox} border rounded-2xl text-xs leading-relaxed text-right space-y-2 shadow-sm`}
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
                              {formatNumber(Number(receiptAmount))}
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
                              {numToPersianWords(Number(receiptAmount))}
                            </strong>
                            <span className="text-slate-600 font-semibold">
                              {" "}
                              {storeSettings?.currency || "تومان"} تمام.
                            </span>
                          </div>
                        </div>
                      )}
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
                            setReceiptResourceType(
                              e.target.value as "bank" | "cashbox",
                            );
                            setReceiptResourceId("");
                          }}
                          className={`w-full p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} font-bold text-sm text-slate-800 outline-none transition-shadow`}
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
                            className={`w-full p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} font-bold text-sm text-slate-800 outline-none transition-shadow`}
                            required
                          >
                            <option value="">-- انتخاب بانک --</option>
                            {(accounts || []).map((acc, idx) => (
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
                            className={`w-full p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} font-bold text-sm text-slate-800 outline-none transition-shadow`}
                            required
                          >
                            <option value="">-- انتخاب صندوق --</option>
                            {(cashboxes || []).map((cb) => (
                              <option key={cb.id} value={cb.id}>
                                {cb.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </>
                  ) : isReceive ? (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          شماره چک *
                        </label>
                        <input
                          type="text"
                          required
                          value={receiptCheckNumber}
                          onChange={(e) =>
                            setReceiptCheckNumber(e.target.value)
                          }
                          className={`w-full p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} text-center font-bold text-sm text-slate-800 outline-none transition-shadow`}
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
                            inputClass={`w-full px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ${themeRing} outline-none font-sans font-black text-slate-900 text-center transition-all cursor-pointer shadow-sm text-sm`}
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
                          className={`w-full p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} font-bold text-sm text-slate-800 outline-none transition-shadow`}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          انتخاب دسته چک (بانک شما) *
                        </label>
                        <select
                          value={receiptCheckbookId}
                          onChange={(e) => {
                            setReceiptCheckbookId(e.target.value);
                            const availableCheck = issuedChecks.find((ic: any) => String(ic.checkbookId) === String(e.target.value) && ic.status === 'blank');
                            if (availableCheck) {
                              setReceiptCheckNumber(availableCheck.checkNumber);
                            } else {
                              setReceiptCheckNumber("");
                            }
                          }}
                          className={`w-full p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} font-bold text-sm text-slate-800 outline-none transition-shadow`}
                          required
                        >
                          <option value="">-- انتخاب دسته چک --</option>
                          {(checkbooks || []).map((cb) => {
                            const bankAccount = accounts.find(
                              (a) => a.id === cb.accountId,
                            );
                            return (
                              <option key={cb.id} value={cb.id}>
                                {bankAccount?.bankName} ({cb.startNumber} تا{" "}
                                {cb.endNumber})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          شماره چک *
                        </label>
                        {receiptCheckbookId ? (
                          <select
                            value={receiptCheckNumber}
                            onChange={(e) =>
                              setReceiptCheckNumber(e.target.value)
                            }
                            className={`w-full p-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 ${themeRing} font-bold text-sm text-slate-800 outline-none transition-shadow`}
                            required
                          >
                            <option value="">
                              -- انتخاب از برگ‌های سفید --
                            </option>
                            {(() => {
                              const cb = checkbooks.find(
                                (c) =>
                                  String(c.id) === String(receiptCheckbookId),
                              );
                              if (!cb) return null;
                              const available = (issuedChecks || []).filter((ic: any) => String(ic.checkbookId) === String(receiptCheckbookId) && ic.status === 'blank');
                              return available.map((c: any) => (
                                <option key={c.id} value={c.checkNumber}>
                                  {c.checkNumber}
                                </option>
                              ));
                            })()}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="ابتدا دسته چک را انتخاب کنید"
                            disabled
                            className={`w-full p-2.5 border border-slate-200 bg-slate-100 rounded-xl text-center font-bold text-sm text-slate-500 outline-none cursor-not-allowed`}
                          />
                        )}
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
                            inputClass={`w-full px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 ${themeRing} outline-none font-sans font-black text-slate-900 text-center transition-all cursor-pointer shadow-sm text-sm`}
                            containerClassName="w-full"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2 lg:col-span-4">
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
                  </div>
                  
                  

                  {receiptPersonId &&
                    (() => {
                      const personInvoices = (invoices || []).filter(
                        (inv) =>
                          !inv.isDraft &&
                          inv.status !== "draft" && inv.status !== "voided" &&
                          inv.type !== "proforma" &&
                          inv.customerId?.toString() ===
                            receiptPersonId.toString() &&
                          inv.paymentStatus !== "paid" &&
                          ((isReceive &&
                            (inv.type === "sale" ||
                              inv.type === "purchase_return")) ||
                            (!isReceive &&
                              (inv.type === "purchase" ||
                                inv.type === "sale_return"))),
                      );
                      if (personInvoices.length === 0) return null;
                      return (
                        <div className="md:col-span-2 lg:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm mt-2">
                          <h3 className="font-extrabold text-sm text-slate-700 mb-3 flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-indigo-500" />{" "}
                            تخصیص به فاکتورهای باز (اختیاری)
                          </h3>
                          <p className="text-xs text-slate-500 font-bold mb-3">
                            در صورتیکه این تراکنش بابت یک یا چند فاکتور خاص
                            میباشد، میتوانید آن را مستقیم اینجا تسویه فرمایید
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right bg-white rounded-xl border border-slate-200 overflow-hidden">
                              <thead>
                                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                  <th className="p-3">شماره فاکتور</th>
                                  <th className="p-3">تاریخ</th>
                                  <th className="p-3">مبلغ کل فاکتور</th>
                                  <th className="p-3">مانده وتسویه نشده</th>
                                  <th className="p-3">
                                    مبلغ تخصیصی در این رسید
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {personInvoices.map((inv) => {
                                  const total =
                                    (inv.totalAmount || 0) *
                                    getDefaultExchangeRate(
                                      inv.currency,
                                      storeSettings.currency,
                                    );
                                  const paid = inv.paidAmount || 0;
                                  const remainder = Math.max(total - paid, 0);
                                  const currentAllocated =
                                    receiptLinkedInvoices[inv.id] || 0;
                                  return (
                                    <tr
                                      key={inv.id}
                                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                                    >
                                      <td className="p-3 font-mono text-xs font-bold text-slate-600">
                                        {toPersianDigits(inv.invoiceNumber) ||
                                          `#${toPersianDigits(inv.id)}`}
                                      </td>
                                      <td className="p-3 font-mono text-xs">
                                        {formatDateDisplay(
                                          inv.date || inv.jalaliDate,
                                        )}
                                      </td>
                                      <td className="p-3 font-mono text-xs font-bold text-slate-700">
                                        {formatCurrency(total)}
                                      </td>
                                      <td className="p-3 font-mono text-xs font-bold text-rose-600">
                                        {formatCurrency(remainder)}
                                      </td>
                                      <td className="p-3">
                                        <div className="flex items-center gap-2 justify-end">
                                          <button
                                            type="button"
                                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors border border-indigo-100"
                                            title="تخصیص حداکثری (تکمیل وجه)"
                                            onClick={() => {
                                              setReceiptLinkedInvoices(
                                                (prev) => ({
                                                  ...prev,
                                                  [inv.id]: remainder,
                                                }),
                                              );
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
                                              const val = Number(
                                                e.target.value,
                                              );
                                              if (val > remainder) {
                                                customAlert(
                                                  "مبلغ تخصیصی نمیتواند بیشتر از مانده فاکتور باشد",
                                                );
                                                return;
                                              }
                                              setReceiptLinkedInvoices(
                                                (prev) => ({
                                                  ...prev,
                                                  [inv.id]: val,
                                                }),
                                              );
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
                          <div className="mt-3 text-xs font-bold text-slate-600 flex justify-end gap-2 items-center">
                            جمع مبالغ تخصیص یافته:
                            <span className="font-mono text-sm text-indigo-700">
                              {formatCurrency(
                                Object.values(receiptLinkedInvoices).reduce(
                                  (a: any, b: any) => Number(a) + Number(b),
                                  0,
                                ),
                              )}{" "}
                              {storeSettings.currency}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                </div>

                <div className="flex flex-col md:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={submittingReceipt}
                    className={`px-8 py-3 ${themeBg} text-white rounded-xl font-bold flex items-center justify-center w-full md:w-auto gap-2 transition-colors border-none cursor-pointer shadow-sm`}
                  >
                    {submittingReceipt ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    ثبت و صدور رسید تراکنش
                  </button>
                </div>
              </form>
            </div>
          </div>
            </div>
          </div>
        );

}
