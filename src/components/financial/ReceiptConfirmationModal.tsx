import React from "react";
import {
  X,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Phone,
  Calendar,
  Wallet,
  CreditCard,
  Building2,
  FileText,
  RefreshCw,
  Info,
  Hash,
} from "lucide-react";
import {
  addCommas,
  toPersianDigits,
  numToPersianWords,
  formatDateDisplay,
} from "../../utils/format";

export interface ReceiptConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting?: boolean;
  receiptData: {
    type: "receive" | "pay";
    method: "cash" | "check";
    personId: string | number;
    amount: number;
    date: any;
    displayDate?: string;
    rawDate?: any;
    description?: string;
    note?: string;
    receiptNumber?: string;
    resourceType?: "cashbox" | "bank" | "account" | string;
    resourceId?: string | number;
    checkNumber?: string;
    checkDueDate?: any;
    displayCheckDueDate?: string;
    rawCheckDueDate?: any;
    checkBankName?: string;
    checkbookId?: string | number;
    linkedInvoices?: Record<string, number>;
  } | null;
  persons?: any[];
  accounts?: any[];
  cashboxes?: any[];
  checkbooks?: any[];
  invoices?: any[];
  storeSettings?: any;
  formatCurrency?: (val: number | string) => string;
  getPersonDisplayName?: (personId: string | number, persons?: any[]) => string;
}

export default function ReceiptConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  submitting = false,
  receiptData,
  persons = [],
  accounts = [],
  cashboxes = [],
  checkbooks = [],
  invoices = [],
  storeSettings = {},
  formatCurrency,
  getPersonDisplayName,
}: ReceiptConfirmationModalProps) {
  if (!isOpen || !receiptData) return null;

  const isReceive = receiptData.type === "receive";
  const isPay = receiptData.type === "pay";
  const isCash = receiptData.method === "cash";
  const isCheck = receiptData.method === "check";

  const currency = storeSettings?.currency || "تومان";

  // Person lookup
  const person = persons.find(
    (p) => String(p.id) === String(receiptData.personId)
  );
  const personName =
    (getPersonDisplayName && getPersonDisplayName(receiptData.personId, persons)) ||
    person?.name ||
    "نامشخص";

  // Cashbox / Bank lookup
  let resourceName = "";
  if (isCash) {
    if (receiptData.resourceType === "cashbox") {
      const cashbox = cashboxes.find(
        (c) => String(c.id) === String(receiptData.resourceId)
      );
      resourceName = cashbox ? `صندوق ${cashbox.name}` : "صندوق نقدی";
    } else {
      const acc = accounts.find(
        (a) => String(a.id) === String(receiptData.resourceId)
      );
      if (acc) {
        resourceName = `${acc.bankName || "بانک"} - شماره حساب: ${toPersianDigits(
          acc.accountNumber || ""
        )}`;
      } else {
        resourceName = "حساب بانکی / کارتخوان";
      }
    }
  }

  // Checkbook lookup (for pay receipt)
  let checkbookName = "";
  if (isCheck && isPay && receiptData.checkbookId) {
    const cb = checkbooks.find(
      (c) => String(c.id) === String(receiptData.checkbookId)
    );
    if (cb) {
      checkbookName = `${cb.bankName || "بانک"} - حساب: ${toPersianDigits(
        cb.accountNumber || ""
      )}`;
    } else {
      checkbookName = "دسته‌چک انتخاب شده";
    }
  }

  // Format dates
  const formatAnyDate = (dateVal: any) => {
    if (!dateVal) return "";
    try {
      if (typeof dateVal === "string") {
        if (dateVal.includes("/")) return toPersianDigits(dateVal);
        return formatDateDisplay(new Date(dateVal), storeSettings?.calendarType);
      }
      if (dateVal instanceof Date) {
        return formatDateDisplay(dateVal, storeSettings?.calendarType);
      }
      if (dateVal?.toDate && typeof dateVal.toDate === "function") {
        return formatDateDisplay(dateVal.toDate(), storeSettings?.calendarType);
      }
      if (dateVal?.format && typeof dateVal.format === "function") {
        return toPersianDigits(dateVal.format());
      }
      return formatDateDisplay(new Date(dateVal), storeSettings?.calendarType);
    } catch {
      return String(dateVal);
    }
  };

  const receiptDateDisplay =
    receiptData.displayDate ||
    formatAnyDate(receiptData.rawDate || receiptData.date);

  const checkDueDateDisplay =
    receiptData.displayCheckDueDate ||
    formatAnyDate(receiptData.rawCheckDueDate || receiptData.checkDueDate);

  // Linked Invoices
  const linkedEntries = receiptData.linkedInvoices
    ? Object.entries(receiptData.linkedInvoices).filter(
        ([, amount]) => Number(amount) > 0
      )
    : [];

  const totalAllocated = linkedEntries.reduce(
    (sum, [, amount]) => sum + Number(amount),
    0
  );

  const formatAmount = (amt: number | string) => {
    if (formatCurrency) {
      return toPersianDigits(formatCurrency(amt));
    }
    return toPersianDigits(addCommas(amt));
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:hidden"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-confirmation-title"
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isReceive
              ? "bg-emerald-50/80 border-emerald-100"
              : "bg-rose-50/80 border-rose-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs ${
                isReceive
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-600 text-white"
              }`}
            >
              {isReceive ? (
                <ArrowDownLeft className="w-6 h-6" />
              ) : (
                <ArrowUpRight className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="receipt-confirmation-title"
                  className="text-lg font-black text-slate-800"
                >
                  {isReceive
                    ? "تأیید نهایی ثبت رسید دریافت وجه"
                    : "تأیید نهایی ثبت رسید پرداخت وجه"}
                </h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    isReceive
                      ? "bg-emerald-100/70 text-emerald-800 border-emerald-200"
                      : "bg-rose-100/70 text-rose-800 border-rose-200"
                  }`}
                >
                  {isReceive ? "ورود نقد / چک" : "خروج نقد / صدور چک"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                لطفاً قبل از صدور قطعی سند، مشخصات مالی زیر را با دقت بررسی و تأیید نمایید.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-colors disabled:opacity-50"
            title="انصراف و بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[calc(85vh-160px)] overflow-y-auto">
          {/* Warning / Advisory Notice */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isReceive
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                : "bg-amber-50/80 border-amber-200 text-amber-900"
            }`}
          >
            {isReceive ? (
              <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs font-bold leading-relaxed">
              {isReceive ? (
                <>
                  <span className="font-black text-emerald-800">اثر مالی سند: </span>
                  با ثبت نهایی این رسید، مبلغ دریافتی به موجودی حساب/صندوق شما اضافه
                  (یا چک دریافتی ثبت) شده و سند بستانکاری در دفاتر حسابداری طرف‌حساب
                  ثبت خواهد گردید.
                </>
              ) : (
                <>
                  <span className="font-black text-amber-800">هشدار مالی: </span>
                  با تأیید نهایی، مبلغ مشخص شده از موجودی حساب/صندوق شما کسر (یا چک تعهدی
                  صادر) می‌گردد و به عنوان پرداخت در حساب طرف‌حساب منظور خواهد شد.
                </>
              )}
            </div>
          </div>

          {/* Amount & Main Identification Highlight Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">شماره استناد رسید:</span>
                <span className="inline-flex items-center gap-1 font-mono font-black text-sm px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  {toPersianDigits(receiptData.receiptNumber || "---")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-500">تاریخ سند:</span>
                <span className="text-xs font-black text-slate-800">
                  {receiptDateDisplay || "امروز"}
                </span>
              </div>
            </div>

            <div className="pt-4 text-center sm:text-right">
              <div className="text-xs font-bold text-slate-500 mb-1">
                مبلغ قابل {isReceive ? "دریافت" : "پرداخت"}:
              </div>
              <div className="flex flex-wrap items-baseline justify-center sm:justify-start gap-2">
                <span
                  className={`text-2xl sm:text-3xl font-black ${
                    isReceive ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {formatAmount(receiptData.amount)}
                </span>
                <span className="text-sm font-bold text-slate-600">
                  {currency}
                </span>
              </div>
              {receiptData.amount > 0 && (
                <div className="mt-2 inline-block text-xs font-bold px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 shadow-2xs">
                  معادل:{" "}
                  <span className="text-slate-900 font-black">
                    {numToPersianWords(Number(receiptData.amount))} {currency}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Core Info Grid: Counterparty & Financial Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Counterparty Box */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700 border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>مشخصات طرف‌حساب</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">نام شخص / طرف:</span>
                <span className="font-black text-slate-800 text-sm">
                  {personName}
                </span>
              </div>
              {person?.mobile || person?.phone ? (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    شماره تماس:
                  </span>
                  <span className="font-mono font-bold text-slate-700 dir-ltr">
                    {toPersianDigits(person.mobile || person.phone)}
                  </span>
                </div>
              ) : null}
              {person?.code ? (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">کد حساب:</span>
                  <span className="font-mono text-slate-600">
                    {toPersianDigits(person.code)}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Method Box (Cash vs Check) */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700 border-b border-slate-100 pb-2">
                {isCash ? (
                  <Wallet className="w-4 h-4 text-blue-600" />
                ) : (
                  <CreditCard className="w-4 h-4 text-amber-600" />
                )}
                <span>روش تسویه و اطلاعات مالی</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">روش تسویه:</span>
                <span className="font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                  {isCash ? "نقدی / واریز بانکی / پوز" : "چک بانکی"}
                </span>
              </div>

              {isCash && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {receiptData.resourceType === "cashbox"
                      ? "صندوق مقصد/مبدا:"
                      : "حساب بانکی:"}
                  </span>
                  <span className="font-black text-slate-800 truncate max-w-[180px]">
                    {resourceName}
                  </span>
                </div>
              )}

              {isCheck && (
                <>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">شماره چک (صیاد):</span>
                    <span className="font-mono font-black text-slate-800">
                      {toPersianDigits(receiptData.checkNumber || "---")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">سررسید چک:</span>
                    <span className="font-black text-indigo-700">
                      {checkDueDateDisplay || "---"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">
                      {isReceive ? "بانک صادرکننده:" : "دسته‌چک:"}
                    </span>
                    <span className="font-bold text-slate-800 truncate max-w-[180px]">
                      {isReceive
                        ? receiptData.checkBankName || "بانک نامشخص"
                        : checkbookName}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Linked Invoices (if any) */}
          {linkedEntries.length > 0 && (
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  فاکتورهای تخصیص داده شده به این رسید
                </span>
                <span className="text-xs font-bold text-slate-500">
                  تعداد: {toPersianDigits(linkedEntries.length)} فاکتور
                </span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {linkedEntries.map(([invId, allocatedAmt]) => {
                  const inv = invoices.find((i) => String(i.id) === String(invId));
                  return (
                    <div
                      key={invId}
                      className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-slate-100"
                    >
                      <span className="text-slate-600 font-bold">
                        فاکتور شماره {toPersianDigits(inv?.invoiceNumber || invId)}
                      </span>
                      <span className="font-black text-slate-800">
                        {formatAmount(allocatedAmt)} {currency}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-600">جمع مبالغ تخصیص‌یافته:</span>
                <span className="font-black text-indigo-700 text-sm">
                  {formatAmount(totalAllocated)} {currency}
                </span>
              </div>
            </div>
          )}

          {/* Description & Note (if entered) */}
          {(receiptData.description || receiptData.note) && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              {receiptData.description && (
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-500 shrink-0">بابت / شرح سند:</span>
                  <span className="font-bold text-slate-800 leading-relaxed">
                    {receiptData.description}
                  </span>
                </div>
              )}
              {receiptData.note && (
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-500 shrink-0">یادداشت:</span>
                  <span className="text-slate-700 leading-relaxed">
                    {receiptData.note}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2.5 text-sm text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            انصراف و ویرایش اطلاعات
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={`w-full sm:w-auto px-6 py-2.5 text-sm text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 ${
              isReceive
                ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                : "bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
            }`}
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                در حال ثبت قطعی...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {isReceive
                  ? "تأیید نهایی و صدور رسید دریافت"
                  : "تأیید نهایی و صدور رسید پرداخت"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
