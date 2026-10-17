import React from 'react';
import { toPersianDigits, formatDateDisplay, numToPersianWords, addCommas, convertToGregorian } from '../../utils/format';
import { ReceiptPrintSettings, defaultReceiptPrintSettings } from './ReceiptPrintTypes';
import {
  Phone,
  MapPin,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Wallet,
  Scissors,
  CheckCircle2,
  Hash,
  FileText,
  User,
  ShieldCheck,
  Building,
  ArrowRightLeft,
  QrCode
} from 'lucide-react';

interface ReceiptPrintTemplateProps {
  data: any;
  storeSettings?: any;
  persons?: any[];
  accounts?: any[];
  cashboxes?: any[];
  invoices?: any[];
  getPersonDisplayName?: (person: any, persons?: any[]) => string;
  formatCurrency?: (val: any) => string;
  printSettings?: ReceiptPrintSettings;
}

interface SettlementRowItem {
  id: string | number;
  methodLabel: string;
  methodType: 'cash' | 'pos' | 'check' | 'transfer';
  resourceLabel: string;
  trackingOrSayad: string;
  dueDate: string;
  linkedInvoice: string;
  amount: number;
}

export default function ReceiptPrintTemplate({
  data,
  storeSettings = {},
  persons = [],
  accounts = [],
  cashboxes = [],
  invoices = [],
  getPersonDisplayName,
  formatCurrency,
  printSettings = defaultReceiptPrintSettings,
}: ReceiptPrintTemplateProps) {
  if (!data) return null;

  const { paperSize, designTheme, fields, scale = 100 } = printSettings;
  const isReceive = data.type === 'receive' || data.type === 'receipt';
  const currency = storeSettings?.currency || 'تومان';

  // Format date
  let formattedDate = '';
  try {
    const calType = storeSettings?.calendarType === 'gregorian' ? 'gregorian' : 'jalali';
    const rawDate = calType === 'gregorian'
      ? (data.date || (data.jalaliDate ? convertToGregorian(data.jalaliDate) : null))
      : (data.jalaliDate || data.date);
    const res = formatDateDisplay(rawDate, calType);
    formattedDate = calType === 'gregorian' ? res : toPersianDigits(res);
  } catch {
    formattedDate = storeSettings?.calendarType === 'gregorian'
      ? String(data.date || data.jalaliDate || '')
      : toPersianDigits(String(data.jalaliDate || data.date || ''));
  }

  // Ensure formattedDate never renders "Invalid Date"
  if (!formattedDate || formattedDate.toLowerCase().includes('invalid') || formattedDate.trim() === '-') {
    const calType = storeSettings?.calendarType === 'gregorian' ? 'gregorian' : 'jalali';
    formattedDate = calType === 'gregorian'
      ? new Date().toLocaleDateString('en-US')
      : toPersianDigits(new Date().toLocaleDateString('fa-IR'));
  }

  // Safely extract receipt time without ever producing "Invalid Date"
  const extractReceiptTime = (item: any): string => {
    if (!item) return '';

    // 1. Direct explicit time string check
    if (item.time && typeof item.time === 'string') {
      const raw = item.time.trim();
      if (
        raw &&
        !raw.toLowerCase().includes('invalid') &&
        raw !== 'undefined' &&
        raw !== 'null' &&
        raw !== '-'
      ) {
        const m = raw.match(/(\d{1,2}):(\d{1,2})/);
        if (m) {
          return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
        }
        return raw;
      }
    }

    // Helper to parse numeric, string, or Date instances into HH:mm
    const tryParseToTime = (val: any): string => {
      if (!val || val === 'undefined' || val === 'null' || val === '-') return '';

      // Numeric ms or seconds timestamp
      if (typeof val === 'number' && !isNaN(val) && val > 0) {
        const ms = val < 10000000000 ? val * 1000 : val;
        const d = new Date(ms);
        if (!isNaN(d.getTime())) {
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          return `${hh}:${mm}`;
        }
      }

      // String that is numeric timestamp (e.g. "1729170000000")
      if (typeof val === 'string' && /^\d{10,13}$/.test(val.trim())) {
        const num = Number(val.trim());
        if (!isNaN(num) && num > 0) {
          const ms = num < 10000000000 ? num * 1000 : num;
          const d = new Date(ms);
          if (!isNaN(d.getTime())) {
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
          }
        }
      }

      // Date object
      if (val instanceof Date && !isNaN(val.getTime())) {
        const hh = String(val.getHours()).padStart(2, '0');
        const mm = String(val.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }

      // Object with toDate() (e.g. react-date-object or Firestore)
      if (typeof val === 'object' && val !== null) {
        if (typeof val.toDate === 'function') {
          try {
            const d = val.toDate();
            if (d instanceof Date && !isNaN(d.getTime())) {
              const hh = String(d.getHours()).padStart(2, '0');
              const mm = String(d.getMinutes()).padStart(2, '0');
              return `${hh}:${mm}`;
            }
          } catch (_) {}
        }
        if (typeof val.hour !== 'undefined' && typeof val.minute !== 'undefined') {
          return `${String(val.hour).padStart(2, '0')}:${String(val.minute).padStart(2, '0')}`;
        }
      }

      // String candidate
      if (typeof val === 'string') {
        const str = val.trim();
        if (str.toLowerCase().includes('invalid')) return '';

        // Match HH:mm directly from string like "2024-10-13 14:35" or "1403/07/22 14:35" or "T14:35"
        const timeMatch = str.match(/(?:T|\s|^)(\d{1,2}):(\d{1,2})(?::\d{1,2})?/);
        if (timeMatch && (str.includes(':') || str.includes('T'))) {
          return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')}`;
        }

        // Try standard Date.parse
        const parsedMs = Date.parse(str);
        if (!isNaN(parsedMs)) {
          const d = new Date(parsedMs);
          if (!isNaN(d.getTime())) {
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
          }
        }
      }

      return '';
    };

    const candidates = [
      item.time,
      item.createdAt,
      item.created_at,
      item.timestamp,
      item.rawDate,
      item.date,
      item.updatedAt,
    ];

    for (const c of candidates) {
      const parsed = tryParseToTime(c);
      if (parsed && !parsed.toLowerCase().includes('invalid')) {
        return parsed;
      }
    }

    // Fallback to current time when receipt is registered/rendered
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const timeStr = extractReceiptTime(data);
  const safeTimeDisplay = timeStr && !timeStr.toLowerCase().includes('invalid') ? toPersianDigits(timeStr) : '';

  // Numbers & Words
  const amountNumber = Number(data.amount) || 0;
  const formattedAmount = toPersianDigits(addCommas(amountNumber));
  const amountWords = numToPersianWords(amountNumber);

  // Person lookup
  const person = (persons || []).find((p: any) => String(p.id) === String(data.personId));
  const personName = person
    ? (typeof getPersonDisplayName === 'function'
        ? getPersonDisplayName(person, persons)
        : (person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim()))
    : (data.personName || 'طرف‌حساب نامشخص');

  // Linked Invoices lookup
  const linkedInvoicesList = React.useMemo(() => {
    if (!data.linkedInvoices || typeof data.linkedInvoices !== 'object') return [];
    const entries = Object.entries(data.linkedInvoices);
    const calType = storeSettings?.calendarType === 'gregorian' ? 'gregorian' : 'jalali';

    return entries.map(([invId, allocAmount]) => {
      const inv = (invoices || []).find((i: any) => String(i.id) === String(invId));
      let formattedInvoiceDate = '-';
      if (inv) {
        if (calType === 'gregorian') {
          const rawDate = inv.date || (inv.jalaliDate ? convertToGregorian(inv.jalaliDate) : null);
          if (rawDate) {
            try {
              formattedInvoiceDate = formatDateDisplay(rawDate, 'gregorian');
            } catch {
              formattedInvoiceDate = String(rawDate);
            }
          }
        } else {
          if (inv.jalaliDate) {
            formattedInvoiceDate = toPersianDigits(inv.jalaliDate);
          } else if (inv.date) {
            try {
              formattedInvoiceDate = formatDateDisplay(inv.date, 'jalali');
            } catch {
              formattedInvoiceDate = toPersianDigits(String(inv.date));
            }
          }
        }
      }

      return {
        id: invId,
        invoiceNumber: inv?.invoiceNumber || `#${invId}`,
        date: formattedInvoiceDate,
        total: Number(inv?.totalAmount || inv?.finalAmount || 0),
        allocated: Number(allocAmount) || 0,
      };
    });
  }, [data.linkedInvoices, invoices, storeSettings?.calendarType]);

  // Construct comprehensive settlement table rows
  const settlementRows = React.useMemo<SettlementRowItem[]>(() => {
    const rows: SettlementRowItem[] = [];

    // Helper to resolve linked invoice summary text
    const linkedSummary = linkedInvoicesList.length > 0
      ? linkedInvoicesList.map(li => li.invoiceNumber).join('، ')
      : (data.linkedInvoiceNumber || '-');

    // Case 1: Structured check details array
    if (Array.isArray(data.checkDetails) && data.checkDetails.length > 0) {
      data.checkDetails.forEach((chk: any, idx: number) => {
        let chkDueDate = '-';
        if (chk.dueDate) {
          try {
            chkDueDate = toPersianDigits(chk.dueDate);
          } catch {
            chkDueDate = chk.dueDate;
          }
        }
        rows.push({
          id: `chk_${idx}`,
          methodLabel: 'چک بانکی صیادی',
          methodType: 'check',
          resourceLabel: chk.bankName ? `${chk.bankName} (${chk.branch || 'شعبه مرکزی'})` : 'بانک صادرکننده',
          trackingOrSayad: chk.sayadId || chk.checkNumber || '-',
          dueDate: chkDueDate,
          linkedInvoice: linkedSummary,
          amount: Number(chk.amount) || 0,
        });
      });
    }

    // Case 2: POS amount
    if (Number(data.posAmount) > 0) {
      const bank = (accounts || []).find((a: any) => String(a.id) === String(data.accountId || data.resourceId));
      rows.push({
        id: 'pos_row',
        methodLabel: 'کارت‌خوان بانکی (POS)',
        methodType: 'pos',
        resourceLabel: bank ? (bank.bankName || bank.title) : (data.resourceDetails || 'پوز فروشگاه'),
        trackingOrSayad: data.trackingCode || data.referenceNumber || '-',
        dueDate: 'نقدی',
        linkedInvoice: linkedSummary,
        amount: Number(data.posAmount),
      });
    }

    // Case 3: Cash amount
    if (Number(data.cashAmount) > 0) {
      const cb = (cashboxes || []).find((c: any) => String(c.id) === String(data.cashboxId || data.resourceId));
      rows.push({
        id: 'cash_row',
        methodLabel: 'وجه نقد (صندوق)',
        methodType: 'cash',
        resourceLabel: cb ? cb.name : 'صندوق مرکزی',
        trackingOrSayad: '-',
        dueDate: 'نقدی',
        linkedInvoice: linkedSummary,
        amount: Number(data.cashAmount),
      });
    }

    // If no breakdown found, construct single primary row
    if (rows.length === 0) {
      let mLabel = 'نقدی / بانکی';
      let rLabel = '-';
      let track = data.trackingCode || data.referenceNumber || '-';
      let due = '-';

      if (data.method === 'cash') {
        if (data.resourceType === 'bank' || data.accountId) {
          const bank = (accounts || []).find((a: any) => String(a.id) === String(data.resourceId || data.accountId));
          mLabel = 'کارت‌خوان / واریز به حساب';
          rLabel = bank ? `${bank.bankName || bank.title} (${toPersianDigits(bank.accountNumber || '')})` : 'حساب بانکی';
          due = 'نقدی';
        } else {
          const cb = (cashboxes || []).find((c: any) => String(c.id) === String(data.resourceId || data.cashboxId));
          mLabel = 'وجه نقد (صندوق)';
          rLabel = cb ? cb.name : 'صندوق فروشگاه';
          due = 'نقدی';
        }
      } else if (data.method === 'check') {
        mLabel = 'چک بانکی صیادی';
        rLabel = data.checkBankName || 'بانک عهده';
        track = data.sayadId || data.checkNumber || '-';
        due = data.checkDueDate ? toPersianDigits(data.checkDueDate) : '-';
      } else if (data.method === 'transfer') {
        mLabel = 'حواله بانکی / پایا / ساتنا';
        const bank = (accounts || []).find((a: any) => String(a.id) === String(data.resourceId || data.accountId));
        rLabel = bank ? `${bank.bankName || bank.title}` : 'حساب مبدا/مقصد';
        due = 'نقدی';
      }

      rows.push({
        id: 'main_row',
        methodLabel: mLabel,
        methodType: (data.method as any) || 'cash',
        resourceLabel: rLabel,
        trackingOrSayad: track,
        dueDate: due,
        linkedInvoice: linkedSummary,
        amount: amountNumber,
      });
    }

    return rows;
  }, [data, accounts, cashboxes, linkedInvoicesList, amountNumber]);

  // Balance calculations before and after
  const balanceBefore = data.personBalanceBefore !== undefined
    ? Number(data.personBalanceBefore)
    : (person?.balance !== undefined ? Number(person.balance) + (isReceive ? amountNumber : -amountNumber) : null);

  const balanceAfter = data.personBalanceAfter !== undefined
    ? Number(data.personBalanceAfter)
    : (person?.balance !== undefined ? Number(person.balance) : null);

  // CSS page rules based on paperSize
  const getPageStyle = () => {
    if (paperSize === 'pos80') {
      return `@page { size: 80mm auto; margin: 2mm; }`;
    }
    if (paperSize === 'pos58') {
      return `@page { size: 58mm auto; margin: 2mm; }`;
    }
    if (paperSize === 'a5_landscape') {
      return `@page { size: A5 landscape; margin: 6mm; }`;
    }
    if (paperSize === 'a5_portrait') {
      return `@page { size: A5 portrait; margin: 6mm; }`;
    }
    return `@page { size: A4 portrait; margin: 8mm; }`;
  };

  const isThermal = paperSize === 'pos80' || paperSize === 'pos58' || designTheme === 'thermal';

  // Single Standard Receipt Body (A5 Landscape, A5 Portrait, A4 Portrait, A4 2-Copy)
  const renderStandardReceipt = (copyTitle?: string) => {
    const isA5 = paperSize === 'a5_landscape' || paperSize === 'a5_portrait' || paperSize === 'a4_2copy';
    const isOfficial = designTheme === 'official';
    const isMinimal = designTheme === 'minimal';
    const isModern = designTheme === 'modern';

    const docTitle = isReceive ? 'رسید رسمی دریافت وجه' : 'رسید رسمی پرداخت وجه';

    return (
      <div
        className={`w-full bg-white text-slate-900 font-sans relative flex flex-col justify-between select-text ${
          isOfficial
            ? 'border-2 border-slate-900 p-4 sm:p-5'
            : isMinimal
            ? 'border border-slate-700 p-4 sm:p-5'
            : 'border border-slate-300 rounded-2xl p-4 sm:p-6 shadow-xs'
        } ${isA5 ? 'text-xs leading-normal' : 'text-sm leading-relaxed'}`}
        dir="rtl"
        style={{ fontFamily: "'IRANYekanXFaNum', 'Vazirmatn', -apple-system, sans-serif" }}
      >
        {/* TOP HEADER */}
        <div>
          <div className={`flex items-start justify-between pb-3 mb-3 gap-3 ${isOfficial ? 'border-b-2 border-slate-900' : 'border-b border-slate-200'}`}>
            {/* Store details (Right side in RTL) */}
            <div className="flex items-center gap-3 w-1/3">
              {fields.showStoreLogo && (storeSettings?.logo || storeSettings?.logoUrl) && (
                <img
                  src={storeSettings.logo || storeSettings.logoUrl}
                  alt="Logo"
                  referrerPolicy="no-referrer"
                  className={`${isA5 ? 'h-11 w-11' : 'h-14 w-14'} object-contain shrink-0 rounded-lg border border-slate-200 p-0.5`}
                />
              )}
              <div className="flex flex-col text-right">
                {fields.showStoreName && (
                  <h1 className={`${isA5 ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} font-black text-slate-950 tracking-tight`}>
                    {storeSettings?.storeName || 'نام مجموعه / فروشگاه'}
                  </h1>
                )}
                {fields.showStorePhone && storeSettings?.phone && (
                  <span className="text-[10px] text-slate-600 font-bold flex items-center gap-1 mt-0.5">
                    <Phone className="w-2.5 h-2.5 text-slate-400" />
                    <span>تلفن: {toPersianDigits(storeSettings.phone)}</span>
                  </span>
                )}
                {fields.showStoreAddress && storeSettings?.address && (
                  <span className="text-[9.5px] text-slate-500 truncate max-w-[200px] mt-0.5">
                    {storeSettings.address}
                  </span>
                )}
                {fields.showEconomicCode && storeSettings?.economicCode && (
                  <span className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                    کد اقتصادی: {toPersianDigits(storeSettings.economicCode)}
                  </span>
                )}
              </div>
            </div>

            {/* Document Title (Center) */}
            <div className="flex flex-col items-center justify-center w-1/3 text-center">
              <div className={`px-4 py-1.5 rounded-xl font-black ${isA5 ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} ${
                isOfficial
                  ? 'border-2 border-slate-900 bg-slate-100 text-slate-950'
                  : isMinimal
                  ? 'border border-slate-800 text-slate-900'
                  : isReceive
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}>
                {docTitle}
              </div>
              {copyTitle ? (
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full mt-1.5">
                  {copyTitle}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 font-bold mt-1">
                  سند ثبت مالی و خزانه‌داری
                </span>
              )}
            </div>

            {/* Document Metadata (Left side in RTL) */}
            <div className="w-1/3 flex flex-col items-end text-left text-xs space-y-1">
              {fields.showReceiptNumber && (
                <div className="flex items-center gap-1 font-bold">
                  <span className="text-slate-500 text-[11px]">شماره سند:</span>
                  <span className="font-mono font-black text-slate-950 text-sm">
                    {toPersianDigits(data.receiptNumber || data.id || '-')}
                  </span>
                </div>
              )}
              {fields.showDate && (
                <div className="flex items-center gap-1 text-[11px] text-slate-700 font-bold">
                  <span className="text-slate-400">تاریخ:</span>
                  <span className="font-mono">{formattedDate || '-'}</span>
                </div>
              )}
              {fields.showTime && safeTimeDisplay && (
                <div className="flex items-center gap-1 text-[10px] text-slate-600">
                  <span className="text-slate-400">ساعت:</span>
                  <span className="font-mono font-bold">{safeTimeDisplay}</span>
                </div>
              )}
              {fields.showTrackingCode && data.trackingCode && (
                <div className="flex items-center gap-1 text-[10px] text-slate-600">
                  <span className="text-slate-400">پیگیری:</span>
                  <span className="font-mono">{toPersianDigits(data.trackingCode)}</span>
                </div>
              )}
            </div>
          </div>

          {/* PARTY INFORMATION BOX - Contact name on a single line with subsequent info immediately following */}
          <div className={`p-3 mb-3 rounded-xl ${isOfficial ? 'border-2 border-slate-900 bg-slate-50/60' : isMinimal ? 'border border-slate-700 bg-white' : 'border border-slate-200 bg-slate-50/70'}`}>
            <div className="flex flex-wrap items-center justify-between gap-y-2.5 gap-x-4">
              {/* Primary line: Label + Contact Name in ONE single line, followed immediately by code & phone */}
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                <span className="text-slate-600 font-bold text-xs shrink-0 whitespace-nowrap">
                  {isReceive ? 'طرف‌حساب (پرداخت‌کننده):' : 'طرف‌حساب (دریافت‌کننده):'}
                </span>
                {fields.showPersonName && (
                  <span className="font-black text-slate-950 text-xs sm:text-sm whitespace-nowrap">
                    {personName}
                  </span>
                )}
                {/* Subsequent details right after the contact name */}
                {fields.showPersonCode && (person?.personCode || (person as any)?.code) && (
                  <span className="text-[10.5px] bg-white border border-slate-300 px-2 py-0.5 rounded font-mono text-slate-700 shrink-0 whitespace-nowrap flex items-center gap-1 shadow-2xs">
                    <span className="text-slate-400 font-sans text-[10px]">کد شخص:</span>
                    <span className="font-bold">{toPersianDigits(person.personCode || (person as any)?.code)}</span>
                  </span>
                )}
                {fields.showPersonPhone && person && (person.phone || person.mobile) && (
                  <span className="text-[11px] text-slate-700 font-bold flex items-center gap-1 shrink-0 whitespace-nowrap bg-white border border-slate-300 px-2 py-0.5 rounded shadow-2xs">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="font-mono">{toPersianDigits(person.phone || person.mobile)}</span>
                  </span>
                )}
              </div>

              {/* Financial Balance status right after in flow */}
              {fields.showPersonBalance && balanceAfter !== null && (
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap mr-auto">
                  <span className="text-[11px] text-slate-500 font-bold">وضعیت مانده نهایی:</span>
                  <span
                    className={`font-black text-xs px-2.5 py-0.5 rounded ${
                      balanceAfter > 0
                        ? 'text-emerald-800 bg-emerald-50 border border-emerald-300'
                        : balanceAfter < 0
                        ? 'text-rose-800 bg-rose-50 border border-rose-300'
                        : 'text-slate-700 bg-slate-100 border border-slate-300'
                    }`}
                  >
                    {balanceAfter > 0
                      ? `${toPersianDigits(addCommas(balanceAfter))} ${currency} (بستانکار)`
                      : balanceAfter < 0
                      ? `${toPersianDigits(addCommas(Math.abs(balanceAfter)))} ${currency} (بدهکار)`
                      : 'تسویه کامل (صفر)'}
                  </span>
                </div>
              )}
            </div>

            {fields.showPersonAddress && person?.address && (
              <div className="mt-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>نشانی: {person.address}</span>
              </div>
            )}
          </div>

          {/* COMPREHENSIVE SETTLEMENT TABLE */}
          {fields.showDetailedSettlementTable !== false && (
            <div className={`overflow-hidden mb-3 ${isOfficial ? 'border-2 border-slate-900 rounded-lg' : 'border border-slate-300 rounded-xl'}`}>
              <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between text-[11px] font-black text-slate-900">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-700" />
                  <span>جدول جامع ردیف‌های تسویه و پرداخت وجه</span>
                </span>
                <span>{toPersianDigits(settlementRows.length)} ردیف</span>
              </div>

              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-2.5 text-center w-10 border-l border-slate-200">#</th>
                    <th className="py-2 px-3 border-l border-slate-200">روش تسویه</th>
                    <th className="py-2 px-3 border-l border-slate-200">صندوق / بانک / کارت‌خوان</th>
                    <th className="py-2 px-3 border-l border-slate-200">شناسه رهگیری / چک صیادی</th>
                    <th className="py-2 px-3 text-center border-l border-slate-200">سررسید</th>
                    <th className="py-2 px-3 border-l border-slate-200">فاکتور متصل</th>
                    <th className="py-2 px-3 text-left font-black">مبلغ ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {settlementRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-2.5 text-center font-bold font-mono text-slate-500 border-l border-slate-200">
                        {toPersianDigits(idx + 1)}
                      </td>
                      <td className="py-2 px-3 font-black text-slate-900 border-l border-slate-200">
                        {row.methodLabel}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 border-l border-slate-200">
                        {row.resourceLabel}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-700 border-l border-slate-200">
                        {toPersianDigits(row.trackingOrSayad)}
                      </td>
                      <td className="py-2 px-3 text-center font-medium text-slate-700 border-l border-slate-200">
                        {row.dueDate}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px] border-l border-slate-200">
                        {toPersianDigits(row.linkedInvoice)}
                      </td>
                      <td className="py-2 px-3 text-left font-mono font-black text-slate-950 text-sm">
                        {toPersianDigits(addCommas(row.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100/90 font-black border-t-2 border-slate-900 text-slate-950">
                  <tr>
                    <td colSpan={6} className="py-2.5 px-3 text-right">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black">مبلغ کل این سند به حروف:</span>
                        {fields.showAmountWords && (
                          <span className="text-xs font-bold text-indigo-900 bg-white/90 border border-slate-300 px-3 py-1 rounded-md">
                            {amountWords} {currency} تمام
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono text-base font-black">
                      {formattedAmount}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* BALANCE RECONCILIATION SUMMARY */}
          {fields.showBalanceBeforeAndAfter && balanceBefore !== null && balanceAfter !== null && (
            <div className="grid grid-cols-3 gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-3 text-xs">
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-slate-500 font-bold">مانده قبل از سند:</span>
                <span className="font-mono font-black text-slate-800 mt-0.5">
                  {toPersianDigits(addCommas(Math.abs(balanceBefore)))} {currency} {balanceBefore < 0 ? '(بدهکار)' : balanceBefore > 0 ? '(بستانکار)' : ''}
                </span>
              </div>
              <div className="flex flex-col text-center border-x border-slate-200 px-2">
                <span className="text-[10px] text-slate-500 font-bold">مبلغ سند ({isReceive ? 'دریافت' : 'پرداخت'}):</span>
                <span className={`font-mono font-black mt-0.5 ${isReceive ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isReceive ? '+' : '-'} {formattedAmount} {currency}
                </span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-500 font-bold">مانده نهایی طرف‌حساب:</span>
                <span className="font-mono font-black text-slate-950 mt-0.5">
                  {toPersianDigits(addCommas(Math.abs(balanceAfter)))} {currency} {balanceAfter < 0 ? '(بدهکار)' : balanceAfter > 0 ? '(بستانکار)' : '(تسویه)'}
                </span>
              </div>
            </div>
          )}

          {/* DESCRIPTION / NOTES */}
          {fields.showDescription && data.description && (
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl mb-3 text-xs flex items-start gap-2">
              <span className="font-bold text-slate-500 shrink-0">بابت / توضیحات:</span>
              <span className="font-medium text-slate-800 leading-relaxed">{data.description}</span>
            </div>
          )}
        </div>

        {/* SIGNATURES & FOOTER */}
        <div className="mt-4 pt-2">
          {fields.showSignatures && (
            <div className={`grid ${fields.signatureCount === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-4 text-center border-t border-slate-300 pt-3 pb-2`}>
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black text-slate-800 mb-10 print:mb-8">
                  {fields.signature1Title || (isReceive ? 'مهر و امضای پرداخت‌کننده / مشتری' : 'مهر و امضای تاییدکننده')}
                </span>
                <div className="w-36 sm:w-44 border-b border-dashed border-slate-400"></div>
              </div>

              {fields.signatureCount === 3 && (
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-black text-slate-800 mb-10 print:mb-8">
                    {fields.signature3Title || 'مهر و امضای حسابداری / مالی'}
                  </span>
                  <div className="w-36 sm:w-44 border-b border-dashed border-slate-400"></div>
                </div>
              )}

              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black text-slate-800 mb-10 print:mb-8">
                  {fields.signature2Title || (isReceive ? 'مهر و امضای صندوق‌دار / دریافت‌کننده' : 'مهر و امضای تحویل‌گیرنده وجه')}
                </span>
                <div className="w-36 sm:w-44 border-b border-dashed border-slate-400"></div>
              </div>
            </div>
          )}

          {/* Custom Footer Note */}
          {fields.showFooterNote && fields.customFooterText && (
            <div className="text-center text-[10px] font-bold text-slate-600 border-t border-slate-100 pt-1.5 mt-1">
              {fields.customFooterText}
            </div>
          )}

          {/* Software Watermark */}
          {fields.showSoftwareWatermark && (
            <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100 pt-1 mt-1">
              <span>سامانه حسابداری و مدیریت مالی</span>
              <span>زمان چاپ: {toPersianDigits(new Date().toLocaleDateString('fa-IR'))} - {toPersianDigits(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Thermal Receipt Layout (POS 80mm / 58mm)
  const renderThermalReceipt = () => {
    return (
      <div
        className="w-[80mm] max-w-[80mm] mx-auto bg-white p-3 text-slate-950 font-sans text-xs leading-tight border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-1"
        dir="rtl"
        style={{ fontFamily: "'IRANYekanXFaNum', 'Vazirmatn', -apple-system, sans-serif" }}
      >
        {/* Header */}
        <div className="text-center pb-2 border-b-2 border-dashed border-slate-400">
          <h2 className="text-sm font-black text-slate-950">{storeSettings?.storeName || 'رسید صندوق'}</h2>
          <p className="text-[10px] text-slate-600 mt-0.5">{isReceive ? 'رسید دریافت وجه' : 'رسید پرداخت وجه'}</p>
          {storeSettings?.phone && (
            <p className="text-[10px] font-mono text-slate-600 mt-0.5">تلفن: {toPersianDigits(storeSettings.phone)}</p>
          )}
        </div>

        {/* Metadata */}
        <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">شماره رسید:</span>
            <span className="font-mono font-black">{toPersianDigits(data.receiptNumber || data.id || '-')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-bold shrink-0">تاریخ و ساعت:</span>
            <span className="font-mono font-bold text-slate-900 whitespace-nowrap">
              {formattedDate} {safeTimeDisplay ? `- ${safeTimeDisplay}` : ''}
            </span>
          </div>
          <div className="py-0.5">
            <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
              <span className="text-slate-500 font-bold shrink-0">طرف‌حساب:</span>
              <span className="font-black text-slate-900 text-[11px] truncate">{personName}</span>
            </div>
            {(fields.showPersonCode || fields.showPersonPhone) && (person?.phone || person?.mobile || (person as any)?.personCode || (person as any)?.code) && (
              <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-0.5">
                {fields.showPersonCode && (person?.personCode || (person as any)?.code) && (
                  <span className="font-mono">کد: {toPersianDigits(person?.personCode || (person as any)?.code)}</span>
                )}
                {fields.showPersonPhone && (person?.phone || person?.mobile) && (
                  <span className="font-mono">تلفن: {toPersianDigits(person?.phone || person?.mobile)}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Settlement items */}
        <div className="py-2 border-b-2 border-dashed border-slate-400 space-y-1.5">
          <div className="text-[10px] font-black text-slate-500">جزئیات پرداخت:</div>
          {settlementRows.map((row, idx) => (
            <div key={row.id} className="flex flex-col text-[10.5px] bg-slate-50 p-1.5 rounded border border-slate-200">
              <div className="flex justify-between font-bold">
                <span>{toPersianDigits(idx + 1)}. {row.methodLabel}</span>
                <span className="font-mono font-black">{toPersianDigits(addCommas(row.amount))}</span>
              </div>
              {row.resourceLabel && row.resourceLabel !== '-' && (
                <div className="text-[9.5px] text-slate-500 mt-0.5">{row.resourceLabel}</div>
              )}
              {row.trackingOrSayad && row.trackingOrSayad !== '-' && (
                <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">کد: {toPersianDigits(row.trackingOrSayad)}</div>
              )}
            </div>
          ))}

          {/* Total */}
          <div className="flex justify-between items-center pt-2 font-black text-sm">
            <span>مبلغ کل:</span>
            <span className="font-mono text-base">{formattedAmount} {currency}</span>
          </div>
          {fields.showAmountWords && (
            <div className="text-[9.5px] text-slate-600 font-bold text-center mt-1">
              ({amountWords} {currency})
            </div>
          )}
        </div>

        {/* Balance */}
        {fields.showBalanceBeforeAndAfter && balanceAfter !== null && (
          <div className="py-1.5 border-b border-dashed border-slate-300 text-[10px] flex justify-between font-bold">
            <span className="text-slate-500">مانده حساب نهایی:</span>
            <span className="font-mono font-black">
              {toPersianDigits(addCommas(Math.abs(balanceAfter)))} {currency} {balanceAfter < 0 ? '(بدهکار)' : balanceAfter > 0 ? '(بستانکار)' : '(تسویه)'}
            </span>
          </div>
        )}

        {/* Description */}
        {data.description && (
          <div className="py-1.5 border-b border-dashed border-slate-300 text-[10px]">
            <span className="text-slate-500 font-bold">بابت: </span>
            <span className="text-slate-800">{data.description}</span>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 text-[9.5px] text-slate-500 space-y-1">
          <p>{fields.customFooterText || 'از همراهی شما سپاسگزاریم'}</p>
          <p className="font-mono text-[8.5px] text-slate-400">سامانه حسابداری</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          ${getPageStyle()}
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .receipt-print-container {
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: ${
              isThermal
                ? '80mm'
                : paperSize === 'a5_landscape'
                ? '198mm'
                : paperSize === 'a5_portrait'
                ? '136mm'
                : '194mm'
            } !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
          }
          .cut-line {
            display: flex !important;
          }
          .page-break-after {
            page-break-after: always;
          }
        }
      `}} />

      <div
        className={`receipt-print-container mx-auto ${
          isThermal
            ? 'w-[80mm] max-w-[80mm]'
            : paperSize === 'a5_landscape'
            ? 'w-full max-w-[210mm] min-h-[148mm]'
            : paperSize === 'a5_portrait'
            ? 'w-full max-w-[148mm] min-h-[210mm]'
            : 'w-full max-w-[210mm] min-h-[297mm]'
        }`}
        style={{ fontFamily: "'IRANYekanXFaNum', 'Vazirmatn', -apple-system, sans-serif" }}
      >
        {isThermal ? (
          renderThermalReceipt()
        ) : paperSize === 'a4_2copy' ? (
          // Two copies on one A4 page with a perforated cut line in between
          <div className="flex flex-col justify-between h-[280mm] space-y-4 print:space-y-0">
            {/* COPY 1: Customer */}
            <div className="flex-1 flex flex-col justify-between">
              {renderStandardReceipt('نسخه اول: طرف‌حساب / مشتری')}
            </div>

            {/* CUT LINE */}
            <div className="cut-line flex items-center justify-center gap-2 my-2 text-slate-400 text-xs font-bold print:py-2">
              <div className="flex-1 border-t-2 border-dashed border-slate-400"></div>
              <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-300 shadow-xs">
                <Scissors className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-[10px] text-slate-700">محل برش کاغذ (قیچی)</span>
              </div>
              <div className="flex-1 border-t-2 border-dashed border-slate-400"></div>
            </div>

            {/* COPY 2: Store / Accounting Archive */}
            <div className="flex-1 flex flex-col justify-between">
              {renderStandardReceipt('نسخه دوم: بایگانی مالی و خزانه‌داری')}
            </div>
          </div>
        ) : (
          // Single receipt (A5 Landscape, A5 Portrait, or A4 Portrait)
          <div className="w-full h-full flex flex-col">
            {renderStandardReceipt()}
          </div>
        )}
      </div>
    </>
  );
}
