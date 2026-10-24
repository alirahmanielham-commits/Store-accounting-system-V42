import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MessageSquare,
  Send,
  Clock,
  User,
  Phone,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
  Sparkles,
  ExternalLink,
  Receipt
} from "lucide-react";
import { toPersianDigits, addCommas, formatInvoiceDate } from "../../utils/format";
import { queueSystemSms } from "../../services/crmService";

export interface QueueSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: "invoice" | "receipt";
  data: any;
  persons?: any[];
  storeSettings?: any;
  onSuccess?: (record: any) => void;
  onNavigateToSmsManager?: () => void;
}

export default function QueueSmsModal({
  isOpen,
  onClose,
  documentType,
  data,
  persons = [],
  storeSettings = {},
  onSuccess,
  onNavigateToSmsManager
}: QueueSmsModalProps) {
  if (!isOpen || !data) return null;

  const storeName =
    storeSettings?.companyName ||
    storeSettings?.storeName ||
    storeSettings?.title ||
    "مجموعه ما";
  const currency = storeSettings?.currency || "تومان";

  // Identify document properties
  const isInvoice = documentType === "invoice";
  const isReceipt = documentType === "receipt";

  // Person lookup
  const personId = isInvoice
    ? data.customerId || data.personId
    : data.personId;

  const matchedPerson = useMemo(() => {
    if (!personId) return null;
    return (persons || []).find(
      (p: any) => String(p.id) === String(personId)
    );
  }, [persons, personId]);

  const recipientName =
    matchedPerson?.alias ||
    matchedPerson?.name ||
    (matchedPerson?.firstName
      ? `${matchedPerson.firstName} ${matchedPerson.lastName || ""}`.trim()
      : null) ||
    data.customerName ||
    data.personName ||
    data.buyerName ||
    data.sellerName ||
    "مشتری گرامی";

  const initialPhone =
    matchedPerson?.mobile ||
    matchedPerson?.phone ||
    data.customerPhone ||
    data.phone ||
    data.mobile ||
    "";

  // Document details
  const docNumber = isInvoice
    ? data.invoiceNumber || data.id || "---"
    : data.receiptNumber || data.id || "---";

  const amount = isInvoice
    ? Number(data.totalAmount ?? data.payableAmount ?? data.finalAmount ?? 0)
    : Number(data.amount ?? 0);

  const remainingBalance = isInvoice
    ? Math.max((data.totalAmount || 0) - (data.paidAmount || 0), 0)
    : 0;

  const dateStr = useMemo(() => {
    const rawDate = data.date || data.jalaliDate || data.createdAt;
    if (!rawDate) return "ثبت شده";
    return formatInvoiceDate(rawDate, storeSettings?.calendarType, { showTime: false });
  }, [data, storeSettings]);

  // Invoice / Receipt specific taxonomy
  const isSale = isInvoice && (data.type === "sale" || !data.type);
  const isPurchase = isInvoice && data.type === "purchase";
  const isSaleReturn = isInvoice && data.type === "sale_return";
  const isPurchaseReturn = isInvoice && data.type === "purchase_return";
  const isProforma = isInvoice && data.type === "proforma";

  const isReceive = isReceipt && (data.type === "receive" || !data.type);
  const isPay = isReceipt && data.type === "pay";

  const docTypeLabel = useMemo(() => {
    if (isInvoice) {
      if (isProforma) return "پیش‌فاکتور";
      if (isPurchase) return "فاکتور خرید";
      if (isSaleReturn) return "فاکتور برگشت از فروش";
      if (isPurchaseReturn) return "فاکتور برگشت از خرید";
      return "فاکتور فروش";
    }
    if (isReceipt) {
      if (isReceive) return "رسید دریافت وجه";
      if (isPay) return "رسید پرداخت وجه";
      return "رسید مالی";
    }
    return "سند";
  }, [isInvoice, isProforma, isPurchase, isSaleReturn, isPurchaseReturn, isReceipt, isReceive, isPay]);

  // Form states
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("standard");
  const [messageBody, setMessageBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate templates
  const templates = useMemo(() => {
    const formattedAmount = `${toPersianDigits(addCommas(amount))} ${currency}`;
    const formattedBalance = `${toPersianDigits(addCommas(remainingBalance))} ${currency}`;
    const cleanDocNum = toPersianDigits(docNumber);

    if (isInvoice) {
      if (isSale) {
        return [
          {
            key: "standard",
            title: "قالب استاندارد",
            text: `مشتری گرامی ${recipientName}،\nفاکتور فروش شماره ${cleanDocNum} به مبلغ ${formattedAmount} در تاریخ ${toPersianDigits(dateStr)} در سیستم صادر گردید.\nبا تشکر، ${storeName}`,
          },
          {
            key: "summary",
            title: "قالب خلاصه",
            text: `فاکتور فروش #${cleanDocNum}\nمبلغ: ${formattedAmount}\nتاریخ: ${toPersianDigits(dateStr)}\n${storeName}`,
          },
          {
            key: "balance",
            title: "قالب با مانده حساب",
            text: `مشتری گرامی ${recipientName}،\nفاکتور شماره ${cleanDocNum} به مبلغ ${formattedAmount} ثبت شد.\nمانده قابل پرداخت: ${formattedBalance}\nبا تشکر، ${storeName}`,
          },
        ];
      }

      if (isPurchase) {
        return [
          {
            key: "standard",
            title: "قالب استاندارد",
            text: `تأمین‌کننده گرامی ${recipientName}،\nفاکتور خرید شماره ${cleanDocNum} به مبلغ ${formattedAmount} در تاریخ ${toPersianDigits(dateStr)} در سیستم ثبت گردید.\nبا تشکر، ${storeName}`,
          },
          {
            key: "summary",
            title: "قالب خلاصه",
            text: `فاکتور خرید #${cleanDocNum}\nمبلغ: ${formattedAmount}\n${storeName}`,
          },
        ];
      }

      if (isSaleReturn || isPurchaseReturn) {
        return [
          {
            key: "standard",
            title: "قالب استاندارد مرجوعی",
            text: `طرف‌حساب گرامی ${recipientName}،\nفاکتور مرجوعی شماره ${cleanDocNum} به مبلغ ${formattedAmount} در تاریخ ${toPersianDigits(dateStr)} با موفقیت ثبت شد.\n${storeName}`,
          },
        ];
      }

      if (isProforma) {
        return [
          {
            key: "standard",
            title: "قالب پیش‌فاکتور",
            text: `مشتری گرامی ${recipientName}،\nپیش‌فاکتور شماره ${cleanDocNum} به مبلغ ${formattedAmount} به تاریخ ${toPersianDigits(dateStr)} جهت بررسی شما صادر گردید.\n${storeName}`,
          },
        ];
      }
    }

    // Receipts
    if (isReceive) {
      return [
        {
          key: "standard",
          title: "قالب استاندارد دریافت",
          text: `مشتری گرامی ${recipientName}،\nرسید دریافت وجه شماره ${cleanDocNum} به مبلغ ${formattedAmount} در تاریخ ${toPersianDigits(dateStr)} با موفقیت ثبت گردید.\nبا تشکر از پرداخت شما،\n${storeName}`,
        },
        {
          key: "summary",
          title: "قالب خلاصه دریافت",
          text: `رسید دریافت وجه #${cleanDocNum}\nمبلغ: ${formattedAmount}\nتاریخ: ${toPersianDigits(dateStr)}\nبا تشکر، ${storeName}`,
        },
      ];
    }

    // Payments
    return [
      {
        key: "standard",
        title: "قالب استاندارد پرداخت",
        text: `طرف‌حساب گرامی ${recipientName}،\nرسید پرداخت وجه شماره ${cleanDocNum} به مبلغ ${formattedAmount} در تاریخ ${toPersianDigits(dateStr)} در سیستم صادر و ثبت شد.\nبا تشکر، ${storeName}`,
      },
      {
        key: "summary",
        title: "قالب خلاصه پرداخت",
        text: `رسید پرداخت وجه #${cleanDocNum}\nمبلغ: ${formattedAmount}\nتاریخ: ${toPersianDigits(dateStr)}\n${storeName}`,
      },
    ];
  }, [
    isInvoice,
    isReceipt,
    isSale,
    isPurchase,
    isSaleReturn,
    isPurchaseReturn,
    isProforma,
    isReceive,
    recipientName,
    docNumber,
    amount,
    currency,
    dateStr,
    storeName,
    remainingBalance,
  ]);

  // Set initial template
  useEffect(() => {
    setPhoneNumber(initialPhone);
    setSubmittedRecord(null);
    setErrorMessage(null);
    if (templates.length > 0) {
      setSelectedTemplateKey(templates[0].key);
      setMessageBody(templates[0].text);
    }
  }, [data, initialPhone]);

  const handleSelectTemplate = (tmpl: any) => {
    setSelectedTemplateKey(tmpl.key);
    setMessageBody(tmpl.text);
  };

  // Live SMS character & parts calculation
  const charCount = messageBody.length;
  const partsCount = useMemo(() => {
    if (charCount === 0) return 1;
    // Standard Persian Unicode SMS: Part 1 is 70 chars, following parts are 67 chars each
    if (charCount <= 70) return 1;
    return Math.ceil(charCount / 67);
  }, [charCount]);

  // Submit action: Queue SMS in the system
  const handleQueueSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, "");
    if (!cleanPhone) {
      setErrorMessage("لطفاً شماره تلفن همراه گیرنده را وارد نمایید.");
      return;
    }

    if (!messageBody.trim()) {
      setErrorMessage("متن پیامک نمی‌تواند خالی باشد.");
      return;
    }

    setIsSubmitting(true);
    try {
      let sourceTag = "panel";
      if (isInvoice) {
        if (isSale) sourceTag = "sale_invoice";
        else if (isPurchase) sourceTag = "purchase_invoice";
        else if (isSaleReturn) sourceTag = "sale_return";
        else if (isPurchaseReturn) sourceTag = "purchase_return";
        else sourceTag = "invoice";
      } else if (isReceipt) {
        sourceTag = isReceive ? "receipt" : "payment";
      }

      const record = await queueSystemSms({
        recipientNumber: cleanPhone,
        recipientName: recipientName || "مشتری",
        recipientId: personId ? String(personId) : null,
        recipientType: "person",
        messageBody: messageBody.trim(),
        source: sourceTag,
        status: "queued", // Explicitly queued in waiting list
      });

      setSubmittedRecord(record);
      if (onSuccess) {
        onSuccess(record);
      }
    } catch (err: any) {
      console.error("Error queueing SMS:", err);
      setErrorMessage(
        err.message || "خطا در افزودن پیامک به صف ارسال. لطفاً مجدداً تلاش کنید."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
          dir="rtl"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-l from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <span>ارسال پیامک اطلاع‌رسانی {docTypeLabel}</span>
                  <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200/60">
                    صف انتظار
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                  ثبت پیامک در صف انتظار برای ارسال به طرف‌حساب
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            {/* Success View */}
            {submittedRecord ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 px-4 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-50">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900">
                    پیامک با موفقیت در صف ارسال قرار گرفت!
                  </h4>
                  <p className="text-xs text-slate-500 font-bold">
                    شناسه پیامک:{" "}
                    <span className="font-mono font-black text-indigo-600">
                      #{toPersianDigits(submittedRecord.id)}
                    </span>
                  </p>
                </div>

                {/* Queue Card */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-right space-y-2">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                    <span className="text-slate-500 font-bold">گیرنده:</span>
                    <span className="font-black text-slate-800">
                      {submittedRecord.recipientName} (
                      <span className="font-mono text-slate-600">
                        {toPersianDigits(submittedRecord.recipientNumber)}
                      </span>
                      )
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                    <span className="text-slate-500 font-bold">وضعیت پیام:</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      <Clock className="w-3 h-3" />
                      <span>در صف ارسال (Queued)</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed font-sans">
                    {submittedRecord.messageBody}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  {onNavigateToSmsManager && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToSmsManager();
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 transition-all text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>مشاهده در صف پیامک‌ها</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors text-xs"
                  >
                    بستن پنجره
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleQueueSms} className="space-y-4">
                {/* Document Information Summary Pill */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                      {isInvoice ? <FileText className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                    </span>
                    <div>
                      <div className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                        <span>{docTypeLabel}</span>
                        <span className="font-mono text-indigo-700 font-black">
                          #{toPersianDigits(docNumber)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{recipientName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="font-mono font-black text-slate-900 text-xs">
                      {toPersianDigits(addCommas(amount))} {currency}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 justify-end mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{toPersianDigits(dateStr)}</span>
                    </div>
                  </div>
                </div>

                {/* Recipient Phone Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>شماره موبایل گیرنده:</span>
                    </label>
                    {!phoneNumber && (
                      <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        شماره در پرونده شخص یافت نشد
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      dir="ltr"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="مثال: 09123456789"
                      className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 text-left"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Template Selection Chips */}
                {templates.length > 1 && (
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>انتخاب قالب متن آماده:</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {templates.map((tmpl) => (
                        <button
                          key={tmpl.key}
                          type="button"
                          onClick={() => handleSelectTemplate(tmpl)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            selectedTemplateKey === tmpl.key
                              ? "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {tmpl.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Body Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>متن پیامک (قابل ویرایش):</span>
                    </label>
                    <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                      <span>{toPersianDigits(charCount)} کاراکتر</span>
                      <span className="text-slate-300">|</span>
                      <span className="font-bold text-indigo-600">
                        {toPersianDigits(partsCount)} پارت
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={messageBody}
                    onChange={(e) => {
                      setMessageBody(e.target.value);
                      setSelectedTemplateKey("custom");
                    }}
                    placeholder="متن پیامک اطلاع‌رسانی را اینجا وارد کنید..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Information Banner About Queuing */}
                <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-indigo-900">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed font-bold">
                    این پیامک در <span className="font-black underline">«صف انتظار برای ارسال» (Queued)</span> قرار خواهد گرفت و می‌توانید آن را در بخش مدیریت پیامک‌ها بازبینی، ارسال دسته‌جمعی یا تکی نمایید.
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center gap-2 text-rose-800 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors text-xs"
                  >
                    انصراف
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all text-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>در حال قرارگیری در صف...</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>افزودن به صف ارسال پیامک</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
