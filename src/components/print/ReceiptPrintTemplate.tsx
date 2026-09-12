import React from 'react';
import { toPersianDigits, formatDateDisplay, numToPersianWords, addCommas } from '../../utils/format';
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
  Building
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

  const { paperSize, designTheme, fields } = printSettings;
  const isReceive = data.type === 'receive';
  const currency = storeSettings?.currency || 'تومان';

  // Format date
  let formattedDate = '';
  try {
    formattedDate = toPersianDigits(formatDateDisplay(data.jalaliDate || data.date, storeSettings?.calendarType));
  } catch (e) {
    formattedDate = toPersianDigits(String(data.jalaliDate || data.date || ''));
  }

  // Format time
  const timeStr = data.time || (data.createdAt ? new Date(data.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '');

  // Numbers & Words
  const amountNumber = Number(data.amount) || 0;
  const formattedAmount = toPersianDigits(addCommas(amountNumber));
  const amountWords = numToPersianWords(amountNumber);

  // Person lookup
  const person = (persons || []).find((p: any) => String(p.id) === String(data.personId));
  const personName = person
    ? (typeof getPersonDisplayName === 'function' ? getPersonDisplayName(person, persons) : (person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim()))
    : (data.personName || 'طرف‌حساب نامشخص');

  // Resource details (Bank or Cashbox)
  let resourceName = '';
  let resourceDetail = '';
  if (data.method === 'cash') {
    if (data.resourceType === 'bank' || data.accountId) {
      const bank = (accounts || []).find((a: any) => String(a.id) === String(data.resourceId || data.accountId));
      resourceName = bank ? (bank.bankName || bank.title) : 'حساب بانکی';
      if (bank?.accountNumber) {
        resourceDetail = `شماره حساب: ${toPersianDigits(bank.accountNumber)}`;
      }
    } else {
      const cb = (cashboxes || []).find((c: any) => String(c.id) === String(data.resourceId || data.cashboxId));
      resourceName = cb ? cb.name : 'صندوق فروشگاه';
    }
  }

  // Method label
  const methodLabel =
    data.method === 'cash'
      ? (data.resourceType === 'cashbox' || data.cashboxId ? 'نقدی (صندوق)' : 'واریز بانکی / کارت‌خوان')
      : data.method === 'check'
      ? 'چک بانکی صیادی'
      : data.method === 'transfer'
      ? 'حواله بانکی / پایا'
      : 'نقدی / بانکی';

  // Linked Invoices
  const linkedInvoicesList = React.useMemo(() => {
    if (!data.linkedInvoices || typeof data.linkedInvoices !== 'object') return [];
    const entries = Object.entries(data.linkedInvoices);
    return entries.map(([invId, allocAmount]) => {
      const inv = (invoices || []).find((i: any) => String(i.id) === String(invId));
      return {
        id: invId,
        invoiceNumber: inv?.invoiceNumber || `#${invId}`,
        date: inv?.jalaliDate || inv?.date || '-',
        total: Number(inv?.totalAmount || inv?.finalAmount || 0),
        allocated: Number(allocAmount) || 0,
      };
    });
  }, [data.linkedInvoices, invoices]);

  // Page style rules based on paperSize
  const getPageStyle = () => {
    if (paperSize === 'a5_landscape') {
      return `@page { size: A5 landscape; margin: 6mm; }`;
    }
    if (paperSize === 'a5_portrait') {
      return `@page { size: A5 portrait; margin: 6mm; }`;
    }
    return `@page { size: A4 portrait; margin: 8mm; }`;
  };

  // Dimensions classes
  const getContainerDimensions = () => {
    if (paperSize === 'a5_landscape') {
      return 'w-full max-w-[210mm] min-h-[148mm]';
    }
    if (paperSize === 'a5_portrait') {
      return 'w-full max-w-[148mm] min-h-[210mm]';
    }
    return 'w-full max-w-[210mm] min-h-[297mm]';
  };

  // Sub-component: Single Receipt Body
  const renderSingleReceipt = (copyTitle?: string) => {
    const isA5 = paperSize === 'a5_landscape' || paperSize === 'a5_portrait' || paperSize === 'a4_2copy';

    // Theme wrappers
    const isClassic = designTheme === 'classic';
    const isMinimal = designTheme === 'minimal';
    const isModern = designTheme === 'modern';

    const accentBg = isReceive ? 'bg-emerald-700' : 'bg-rose-700';
    const accentText = isReceive ? 'text-emerald-800' : 'text-rose-800';
    const accentBorder = isReceive ? 'border-emerald-700' : 'border-rose-700';
    const docTitle = isReceive ? 'رسید رسمی دریافت وجه' : 'رسید رسمی پرداخت وجه';

    return (
      <div
        className={`w-full bg-white text-slate-900 font-sans relative flex flex-col justify-between select-text ${
          isClassic
            ? 'border-4 border-double border-slate-900 p-4 sm:p-5 m-1 print:m-0'
            : isMinimal
            ? 'border border-slate-800 p-4 sm:p-5 m-1 print:m-0'
            : 'border border-slate-300 shadow-sm rounded-2xl p-4 sm:p-6 m-1 print:m-0 print:border-slate-800 print:rounded-none print:shadow-none'
        } ${isA5 ? 'text-xs leading-normal' : 'text-sm leading-relaxed'}`}
        dir="rtl"
      >
        {/* TOP HEADER */}
        <div>
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3 gap-3">
            {/* Store details (Right side in RTL) */}
            <div className="flex items-center gap-3 w-1/3">
              {fields.showStoreLogo && storeSettings?.logo && (
                <img
                  src={storeSettings.logo}
                  alt="Logo"
                  referrerPolicy="no-referrer"
                  className={`${isA5 ? 'h-11 w-11' : 'h-14 w-14'} object-contain shrink-0 rounded-lg border border-slate-200 p-0.5`}
                />
              )}
              <div className="space-y-0.5">
                {fields.showStoreName && (
                  <h1 className={`${isA5 ? 'text-base' : 'text-lg'} font-black text-slate-900 tracking-tight`}>
                    {storeSettings?.storeName || 'نام مجموعه / فروشگاه'}
                  </h1>
                )}
                {fields.showStorePhone && storeSettings?.phone && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>تلفن: {toPersianDigits(storeSettings.phone)}</span>
                  </div>
                )}
                {fields.showStoreAddress && storeSettings?.address && (
                  <div className="flex items-center gap-1 text-[10.5px] text-slate-600 line-clamp-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{storeSettings.address}</span>
                  </div>
                )}
                {fields.showEconomicCode && (storeSettings?.economicCode || storeSettings?.nationalId) && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    شناسه ملی/اقتصادی: {toPersianDigits(storeSettings.economicCode || storeSettings.nationalId)}
                  </div>
                )}
              </div>
            </div>

            {/* Document Title (Center) */}
            <div className="w-1/3 flex flex-col items-center justify-center text-center">
              <div
                className={`px-4 py-1.5 rounded-xl border ${
                  isClassic
                    ? 'border-2 border-slate-900 bg-slate-50 font-black'
                    : isMinimal
                    ? 'border border-slate-800 bg-white font-black'
                    : `${accentBorder} bg-slate-50 shadow-xs font-black`
                }`}
              >
                <h2 className={`${isA5 ? 'text-sm' : 'text-base'} font-black text-slate-900 tracking-wide`}>
                  {docTitle}
                </h2>
              </div>
              {copyTitle ? (
                <span className="text-[10.5px] font-black text-slate-600 mt-1 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {copyTitle}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 mt-1">
                  (سند دریافت و پرداخت معتبر مالی)
                </span>
              )}
            </div>

            {/* Meta details (Left side in RTL) */}
            <div className="w-1/3 flex flex-col items-end">
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-2 sm:p-2.5 text-[11px] font-bold space-y-1 min-w-[140px] text-right">
                {fields.showReceiptNumber && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-bold">شماره رسید:</span>
                    <span className="font-black text-slate-900 font-mono text-xs">
                      {toPersianDigits(data.receiptNumber || `#${data.id}`)}
                    </span>
                  </div>
                )}
                {fields.showDate && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-bold">تاریخ سند:</span>
                    <span className="font-black text-slate-900">{formattedDate}</span>
                  </div>
                )}
                {fields.showTime && timeStr && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-bold">ساعت ثبت:</span>
                    <span className="font-mono text-slate-800">{toPersianDigits(timeStr)}</span>
                  </div>
                )}
                {fields.showTrackingCode && (
                  <div className="flex justify-between items-center gap-2 text-[10px] border-t border-slate-200/70 pt-0.5">
                    <span className="text-slate-400 font-medium">کد رهگیری:</span>
                    <span className="font-mono text-slate-600">{toPersianDigits(data.id)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PERSON & PARTY INFORMATION BOX */}
          <div className="bg-slate-50/80 border border-slate-300 rounded-xl p-2.5 sm:p-3 mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <div className="flex items-center gap-1.5 sm:col-span-1">
                <span className="text-slate-600 font-bold shrink-0">
                  {isReceive ? 'دریافت شده از:' : 'پرداخت شده به:'}
                </span>
                {fields.showPersonName && (
                  <span className="font-black text-slate-950 text-xs sm:text-sm">
                    {personName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:col-span-1">
                {fields.showPersonPhone && person && (person.phone || person.mobile) && (
                  <span className="text-[11px] text-slate-700 font-bold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span className="font-mono">{toPersianDigits(person.phone || person.mobile)}</span>
                  </span>
                )}
                {fields.showPersonCode && person?.personCode && (
                  <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-600">
                    کد: {toPersianDigits(person.personCode)}
                  </span>
                )}
              </div>

              {fields.showPersonBalance && person && (
                <div className="text-left sm:col-span-1 flex items-center justify-end gap-1.5">
                  <span className="text-[11px] text-slate-500 font-bold">مانده‌حساب جاری:</span>
                  <span
                    className={`font-black text-xs ${
                      Number(person.balance || 0) > 0
                        ? 'text-emerald-800'
                        : Number(person.balance || 0) < 0
                        ? 'text-rose-800'
                        : 'text-slate-700'
                    }`}
                  >
                    {Number(person.balance || 0) > 0
                      ? `${toPersianDigits(addCommas(person.balance))} ${currency} (بستانکار)`
                      : Number(person.balance || 0) < 0
                      ? `${toPersianDigits(addCommas(Math.abs(person.balance)))} ${currency} (بدهکار)`
                      : 'تسویه کامل'}
                  </span>
                </div>
              )}
            </div>

            {fields.showPersonAddress && person?.address && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>نشانی: {person.address}</span>
              </div>
            )}
          </div>

          {/* FINANCIAL AMOUNT & TRANSACTION DETAILS */}
          <div className="border border-slate-300 rounded-xl overflow-hidden mb-3">
            {/* Amount Banner */}
            <div className="bg-slate-100/90 border-b border-slate-300 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 text-xs sm:text-sm">مبلغ پرداختی:</span>
                {fields.showAmountNumber && (
                  <span className="font-black text-base sm:text-lg text-slate-950 font-mono tracking-wide px-3 py-0.5 bg-white border border-slate-300 rounded-lg">
                    {formattedAmount} <span className="text-xs font-bold text-slate-600">{currency}</span>
                  </span>
                )}
              </div>

              {fields.showAmountWords && (
                <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold">معادل به حروف:</span>
                  <span className="bg-white/80 border border-slate-200 px-2.5 py-1 rounded-lg">
                    {amountWords} {currency} تمام
                  </span>
                </div>
              )}
            </div>

            {/* Method & Settlement details */}
            <div className="p-3 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {fields.showPaymentMethod && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">نحوه تسویه:</span>
                  <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {methodLabel}
                  </span>
                </div>
              )}

              {fields.showResourceDetails && resourceName && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">
                    {isReceive ? 'واریز شده به:' : 'پرداخت شده از:'}
                  </span>
                  <span className="font-bold text-slate-900">
                    {resourceName} {resourceDetail && <span className="text-slate-500 font-normal">({resourceDetail})</span>}
                  </span>
                </div>
              )}

              {/* Check details */}
              {fields.showCheckDetails && data.method === 'check' && (
                <div className="sm:col-span-2 bg-indigo-50/60 border border-indigo-200 rounded-lg p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-indigo-950">
                  <div>
                    <span className="font-bold text-indigo-700 block text-[10.5px]">شماره چک صیادی:</span>
                    <span className="font-mono font-black text-xs sm:text-sm mt-0.5 block">
                      {toPersianDigits(data.checkNumber || 'ثبت نشده')}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-indigo-700 block text-[10.5px]">تاریخ سررسید:</span>
                    <span className="font-black text-xs mt-0.5 block">
                      {toPersianDigits(data.checkDueDate || 'ثبت نشده')}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-indigo-700 block text-[10.5px]">بانک صادرکننده:</span>
                    <span className="font-bold text-xs mt-0.5 block">
                      {data.checkBankName || 'بانک مبدا'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LINKED INVOICES TABLE (If any) */}
          {fields.showLinkedInvoices && linkedInvoicesList.length > 0 && (
            <div className="border border-slate-300 rounded-xl overflow-hidden mb-3">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between text-[11px] font-black text-slate-800">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>صورتحساب‌ها و فاکتورهای تسویه‌شده با این رسید:</span>
                </span>
                <span>{toPersianDigits(linkedInvoicesList.length)} مورد</span>
              </div>
              <table className="w-full text-right text-[11px]">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-1 px-2.5 font-black">شماره فاکتور</th>
                    <th className="py-1 px-2.5 font-black">تاریخ فاکتور</th>
                    <th className="py-1 px-2.5 font-black">مبلغ کل فاکتور</th>
                    <th className="py-1 px-2.5 font-black text-left">مبلغ پرداختی این رسید</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {linkedInvoicesList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-1 px-2.5 font-mono font-bold text-slate-900">{toPersianDigits(item.invoiceNumber)}</td>
                      <td className="py-1 px-2.5 font-bold text-slate-600">{toPersianDigits(item.date)}</td>
                      <td className="py-1 px-2.5 font-mono text-slate-800">{toPersianDigits(addCommas(item.total))} {currency}</td>
                      <td className="py-1 px-2.5 font-mono font-black text-indigo-900 text-left">
                        {toPersianDigits(addCommas(item.allocated))} {currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* DESCRIPTION & PURPOSE */}
          {fields.showDescription && (
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 mb-3 text-xs flex items-start gap-2">
              <span className="font-black text-slate-700 shrink-0">بابت و شرح سند:</span>
              <span className="text-slate-900 font-bold leading-relaxed flex-1">
                {data.description || 'تسویه حساب و انجام امور مالی مربوطه.'}
              </span>
            </div>
          )}

          {/* NOTE (Optional) */}
          {fields.showNote && data.note && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2 mb-3 text-[11px] text-amber-900 flex items-start gap-2">
              <span className="font-black shrink-0">یادداشت اداری:</span>
              <span className="font-bold flex-1">{data.note}</span>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: SIGNATURES & FOOTER */}
        <div className="mt-3 pt-2">
          {fields.showSignatures && (
            <div
              className={`grid ${
                fields.signatureCount === 3 ? 'grid-cols-3' : 'grid-cols-2'
              } gap-4 text-center border-t border-slate-300 pt-3 pb-2`}
            >
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black text-slate-800 mb-9 print:mb-8">
                  {isReceive ? 'مهر و امضای پرداخت‌کننده' : 'مهر و امضای تاییدکننده'}
                </span>
                <div className="w-36 sm:w-44 border-b border-dashed border-slate-400"></div>
              </div>

              {fields.signatureCount === 3 && (
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-black text-slate-800 mb-9 print:mb-8">
                    مهر و امضای حسابداری / مالی
                  </span>
                  <div className="w-36 sm:w-44 border-b border-dashed border-slate-400"></div>
                </div>
              )}

              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black text-slate-800 mb-9 print:mb-8">
                  {isReceive ? 'مهر و امضای دریافت‌کننده' : 'مهر و امضای تحویل‌گیرنده وجه'}
                </span>
                <div className="w-36 sm:w-44 border-b border-dashed border-slate-400"></div>
              </div>
            </div>
          )}

          {/* Custom Footer Note */}
          {fields.showFooterNote && fields.customFooterText && (
            <div className="text-center text-[10px] font-bold text-slate-500 border-t border-slate-100 pt-1.5 mt-1">
              {fields.customFooterText}
            </div>
          )}

          {/* Software Watermark */}
          {fields.showSoftwareWatermark && (
            <div className="flex items-center justify-between text-[9.5px] text-slate-400 border-t border-slate-100/60 pt-1 mt-1">
              <span>سامانه حسابداری و مدیریت مالی</span>
              <span>زمان چاپ: {toPersianDigits(new Date().toLocaleDateString('fa-IR'))} - {toPersianDigits(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          ${getPageStyle()}
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }
          .receipt-print-container {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
          }
          .cut-line {
            display: flex !important;
          }
          .page-break-after {
            page-break-after: always;
          }
        }
      `}} />

      <div className={`receipt-print-container mx-auto ${getContainerDimensions()}`}>
        {paperSize === 'a4_2copy' ? (
          // Two copies on one A4 page with a perforated cut line in between
          <div className="flex flex-col justify-between h-[280mm] space-y-4 print:space-y-0">
            {/* COPY 1: Customer */}
            <div className="flex-1 flex flex-col justify-between">
              {renderSingleReceipt('نسخه اول: تحویل به طرف‌حساب')}
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
              {renderSingleReceipt('نسخه دوم: بایگانی حسابداری و فروشگاه')}
            </div>
          </div>
        ) : (
          // Single receipt (A5 Landscape, A5 Portrait, or A4 Portrait)
          <div className="w-full h-full flex flex-col">
            {renderSingleReceipt()}
          </div>
        )}
      </div>
    </>
  );
}
