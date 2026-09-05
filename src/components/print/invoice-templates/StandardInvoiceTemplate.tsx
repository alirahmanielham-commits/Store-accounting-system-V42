import React from "react";
import { formatDateDisplay, toPersianDigits, addCommas } from "../../../utils/format";
import { Building2, Store } from "lucide-react";
import { InvoicePrintTemplateProps } from "./InvoicePrintTypes";

export default function StandardInvoiceTemplate({
  data,
  storeSettings,
  persons,
  transactions = [],
  invoices = [],
  personOpeningBalances = [],
  issuedChecks = [],
  receivedChecks = [],
  printSettings = {
    showStoreLogo: true,
    showSignatures: true,
    showTransactions: true,
    showBalance: true,
    showNotes: true,
    designType: 'classic',
    paperSize: 'a4'
  }
}: InvoicePrintTemplateProps) {
  const isSale = data.type === "sale" || data.type === "sale_return";
  const isReturn = data.type === "sale_return" || data.type === "purchase_return";
  const isVoided = data.status === "voided" || data.isVoided === true;
  const isDraft = data.status === "draft" || data.isDraft === true;
  
  let rawTitle = isSale
    ? isReturn ? "فاکتور برگشت از فروش" : "صورتحساب فروش کالا و خدمات"
    : isReturn ? "فاکتور برگشت از خرید" : "فاکتور خرید";

  const title = isVoided
    ? `${rawTitle} (ابطال شده)`
    : isDraft
      ? `${rawTitle} (پیش‌نویس)`
      : rawTitle;
      
  const relatedPerson = persons.find(
    (p) => p.id === data.customerId
  );

  const allocatedTransactions = (transactions || []).filter((t: any) => {
    return t.linkedInvoices && t.linkedInvoices[data.id] && t.linkedInvoices[data.id] > 0;
  });

  const totalAllocated = allocatedTransactions.reduce((sum: number, t: any) => sum + (t.linkedInvoices[data.id] || 0), 0);
  const remainingInvoiceBalance = (data.totalAmount || 0) - totalAllocated;

  // Calculate person balance up to this invoice date
  let personBalance = 0;
  if (relatedPerson) {
    const personIdStr = relatedPerson.id.toString();
    const invoiceDateStr = data.date || data.createdAt || new Date().toISOString();
        
    // 1. Initial Balance
    if (relatedPerson.initialBalance && relatedPerson.initialBalanceType !== "settled") {
      personBalance += relatedPerson.initialBalanceType === "debtor" 
        ? relatedPerson.initialBalance 
        : -relatedPerson.initialBalance;
    }
        
    const ob = personOpeningBalances.find(b => b.personId?.toString() === personIdStr);
    if (ob && ob.amount && ob.type !== "settled") {
      personBalance = ob.type === "debtor" ? ob.amount : -ob.amount;
    }

    (invoices || []).filter(i => 
       i.customerId?.toString() === personIdStr && 
       !i.isDraft && i.status !== "draft" &&
      i.type !== "warehouse_receipt" && i.type !== "warehouse_remittance" && i.type !== "proforma" &&
      ((i.date || i.createdAt || "") <= invoiceDateStr || i.id === data.id)
    ).forEach(inv => {
      const amount = inv.totalAmount || 0;
      if (inv.type === "sale") personBalance += amount;
      else if (inv.type === "purchase") personBalance -= amount;
      else if (inv.type === "sale_return") personBalance -= amount;
      else if (inv.type === "purchase_return") personBalance += amount;
    });

    (transactions || []).filter(t => 
       t.personId?.toString() === personIdStr && t.method !== "check" &&
      (t.date || t.createdAt || "") <= invoiceDateStr
    ).forEach(t => {
      if (t.type === "receive") personBalance -= t.amount || 0;
      else if (t.type === "pay") personBalance += t.amount || 0;
      else if (t.type === "salary") personBalance -= t.amount || 0;
    });

    (issuedChecks || []).filter(c => 
       c.payeeId?.toString() === personIdStr &&
      c.status !== "cancelled" && c.status !== "bounced" && c.status !== "cashed" &&
      (c.date || c.createdAt || "") <= invoiceDateStr
    ).forEach(c => {
      personBalance += c.amount || 0;
    });

    (receivedChecks || []).filter(c => 
       c.payerId?.toString() === personIdStr &&
      c.status !== "returned" && c.status !== "bounced" && c.status !== "cashed" &&
      (c.date || c.createdAt || "") <= invoiceDateStr
    ).forEach(c => {
      personBalance -= c.amount || 0;
    });
  }

  const balanceType = personBalance > 0 ? "بدهکار" : personBalance < 0 ? "بستانکار" : "بی‌حساب";
  const absBalance = Math.abs(personBalance);

  const sumTotal = data.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0;
  const totalDiscount = sumTotal - (data.totalAmount || 0);

  // Layout Styles
  const isClassic = printSettings.designType === 'classic';
  const paperSize = printSettings.paperSize || 'a4';
  const isA5 = paperSize === 'a5';

  return (
    <div className={`bg-white text-slate-800 font-sans ${isA5 ? 'text-xs' : 'text-sm'}`} dir="rtl">
      <style>{`
        @media print {
          @page {
            size: ${isA5 ? 'A5' : 'A4'} portrait;
            margin: 0.5cm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          /* Fix for repeating thead taking too much space if there's a bug in some browsers */
        }
      `}</style>

      <table className="w-full text-right text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead className="print-table-header">
          {/* Main Invoice Header (Store & Customer) */}
          <tr>
            <th colSpan={6} className="font-normal p-0 border-0">
              <div className={`flex justify-between items-start ${isA5 ? 'mb-4 pb-2' : 'mb-6 pb-4'} ${isClassic ? 'border-b-2 border-slate-800' : 'border-b border-slate-200'}`}>
                <div className="flex-1">
                  {printSettings.showStoreLogo && (
                    <div className={`flex items-center ${isA5 ? 'gap-2 mb-1' : 'gap-3 mb-2'}`}>
                      <div className={`${isA5 ? 'w-8 h-8' : 'w-12 h-12'} flex items-center justify-center bg-slate-100 ${isClassic ? 'rounded-none border border-slate-800' : 'rounded-xl'}`}>
                        <Store className={`${isA5 ? 'w-4 h-4' : 'w-6 h-6'} text-slate-700`} />
                      </div>
                      <div>
                        <h1 className={`${isA5 ? 'text-lg' : 'text-2xl'} font-black`}>{storeSettings.storeName || "نام فروشگاه"}</h1>
                        {(storeSettings.phone || storeSettings.mobile) && (
                          <div className={`${isA5 ? 'text-[10px] mt-0.5' : 'text-sm mt-1'} font-bold text-slate-600`}>
                            تلفن: {toPersianDigits(storeSettings.phone || storeSettings.mobile)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {!printSettings.showStoreLogo && (
                    <h1 className={`${isA5 ? 'text-lg mb-1' : 'text-2xl mb-2'} font-black`}>{storeSettings.storeName || "نام فروشگاه"}</h1>
                  )}
                  <div className={`${isA5 ? 'text-[10px]' : 'text-sm'} font-bold text-slate-600 max-w-sm leading-relaxed ${isA5 ? 'mt-1' : 'mt-2'}`}>
                    آدرس: {storeSettings.address || "آدرس فروشگاه ثبت نشده است"}
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center px-4 flex-1">
                  <h2 className={`${isA5 ? 'text-lg px-4 py-1.5' : 'text-2xl px-6 py-2'} font-black mb-1 border-2 rounded-lg ${
                    isVoided 
                      ? 'border-red-600 text-red-700 bg-red-50 shadow-[4px_4px_0_0_#dc2626]' 
                      : isDraft 
                        ? 'border-dashed border-amber-600 text-amber-800 bg-amber-50 shadow-[4px_4px_0_0_#d97706]' 
                        : 'border-slate-800 shadow-[4px_4px_0_0_#1e293b]'
                  }`}>{title}</h2>
                  {isVoided && (
                    <span className="text-[10px] font-black text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded">
                      فاقد هرگونه اعتبار قانونی و مالی
                    </span>
                  )}
                  {isDraft && !isVoided && (
                    <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                      نسخه پیش‌نویس - غیر رسمی
                    </span>
                  )}
                </div>

                <div className="flex-1 text-left space-y-1">
                  <div className="flex justify-end gap-2 items-center">
                    <span className={`font-bold text-slate-500 ${isA5 ? 'text-[10px]' : 'text-sm'}`}>شماره فاکتور:</span>
                    <span className={`font-black ${isA5 ? 'text-sm' : 'text-lg'}`}>{toPersianDigits(data.invoiceNumber || "-")}</span>
                  </div>
                  <div className="flex justify-end gap-2 items-center">
                    <span className={`font-bold text-slate-500 ${isA5 ? 'text-[10px]' : 'text-sm'}`}>تاریخ فاکتور:</span>
                    <span className={`font-black ${isA5 ? 'text-xs' : 'text-base'}`}>{formatDateDisplay(data.date || data.createdAt)}</span>
                  </div>
                  {data.dueDate && (
                     <div className="flex justify-end gap-2 items-center">
                       <span className={`font-bold text-slate-500 ${isA5 ? 'text-[10px]' : 'text-sm'}`}>تاریخ سررسید:</span>
                       <span className={`font-black ${isA5 ? 'text-xs' : 'text-base'}`}>{formatDateDisplay(data.dueDate)}</span>
                     </div>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className={`grid grid-cols-2 ${isA5 ? 'gap-2 mb-4' : 'gap-4 mb-6'}`}>
                <div className={`${isA5 ? 'p-2' : 'p-4'} rounded-lg ${isClassic ? 'border-2 border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                  <div className={`font-bold text-slate-500 ${isA5 ? 'mb-1 text-[10px]' : 'mb-2 text-sm'}`}>
                    {isSale ? 'خریدار / مشتری' : 'فروشنده / تامین‌کننده'}
                  </div>
                  <div className={`font-black ${isA5 ? 'text-sm' : 'text-lg'} mb-2`}>{relatedPerson?.name || 'نامشخص'}</div>
                  {(relatedPerson?.phone || relatedPerson?.mobile) && (
                    <div className={`${isA5 ? 'text-[10px]' : 'text-sm'} font-bold text-slate-600`}>تلفن: {toPersianDigits(relatedPerson.phone || relatedPerson.mobile)}</div>
                  )}
                  {relatedPerson?.nationalId && (
                     <div className={`${isA5 ? 'text-[10px]' : 'text-sm'} font-bold text-slate-600`}>شناسه/کد ملی: {toPersianDigits(relatedPerson.nationalId)}</div>
                  )}
                </div>
                
                {printSettings.showBalance && relatedPerson && (
                  <div className={`${isA5 ? 'p-2' : 'p-4'} rounded-lg ${isClassic ? 'border-2 border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                    <div className={`font-bold text-slate-500 ${isA5 ? 'mb-1 text-[10px]' : 'mb-2 text-sm'}`}>وضعیت حساب (تا این تاریخ)</div>
                    <div className="flex items-center justify-between">
                      <span className={`font-black ${isA5 ? 'text-sm' : 'text-lg'}`}>{toPersianDigits(addCommas(absBalance))} <span className={`font-normal ${isA5 ? 'text-[10px]' : 'text-sm'}`}>{storeSettings.currency}</span></span>
                      <span className={`px-2 py-1 rounded ${isA5 ? 'text-[10px]' : 'text-xs'} font-bold ${
                        balanceType === 'بدهکار' ? 'bg-rose-100 text-rose-700' :
                        balanceType === 'بستانکار' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {balanceType}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </th>
          </tr>

          {/* Table Columns Header */}
          <tr className={`${isClassic ? 'border-y-2 border-slate-800 bg-slate-50' : 'border-y border-slate-200 bg-slate-50'} ${isA5 ? 'text-[10px]' : 'text-sm'}`}>
            <th className={`${isA5 ? 'py-1 px-2' : 'py-3 px-4'} font-black text-center w-12 ${isClassic ? 'border-x-2 border-slate-800' : 'border-x border-slate-200'}`}>ردیف</th>
            <th className={`${isA5 ? 'py-1 px-2' : 'py-3 px-4'} font-black ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>شرح کالا / خدمات</th>
            <th className={`${isA5 ? 'py-1 px-2' : 'py-3 px-4'} font-black text-center ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>مقدار</th>
            <th className={`${isA5 ? 'py-1 px-2' : 'py-3 px-4'} font-black ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>مبلغ واحد ({storeSettings.currency})</th>
            <th className={`${isA5 ? 'py-1 px-2' : 'py-3 px-4'} font-black text-center ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>تخفیف %</th>
            <th className={`${isA5 ? 'py-1 px-2' : 'py-3 px-4'} font-black text-center ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>مبلغ کل ({storeSettings.currency})</th>
          </tr>
        </thead>
        
        <tbody className={`divide-y ${isClassic ? 'divide-slate-800 border-b-2 border-slate-800' : 'divide-slate-200 border-b border-slate-200'}`}>
          {data.items?.map((item: any, idx: number) => (
            <tr key={idx} className="print-avoid-break">
              <td className={`${isA5 ? 'py-1 px-2 text-[10px]' : 'py-3 px-4'} text-center font-bold ${isClassic ? 'border-x-2 border-slate-800' : 'border-x border-slate-200'}`}>{toPersianDigits(idx + 1)}</td>
              <td className={`${isA5 ? 'py-1 px-2' : 'py-3 px-4'} font-black ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>
                <div>{item.productName}</div>
                {item.productCode && <div className={`${isA5 ? 'text-[8px]' : 'text-xs'} text-slate-500 font-bold mt-0.5`}>کد: {toPersianDigits(item.productCode)}</div>}
              </td>
              <td className={`${isA5 ? 'py-1 px-2 text-[10px]' : 'py-3 px-2'} text-center font-bold ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>{toPersianDigits(item.quantity)} {item.selectedUnit || item.unit || ""}</td>
              <td className={`${isA5 ? 'py-1 px-2 text-[10px]' : 'py-3 px-4'} font-bold ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>{toPersianDigits(addCommas(item.unitPrice || 0))}</td>
              <td className={`${isA5 ? 'py-1 px-2 text-[10px]' : 'py-3 px-2'} text-center font-bold ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>{toPersianDigits(addCommas(item.discountPercent || 0))}</td>
              <td className={`${isA5 ? 'py-1 px-2 text-xs' : 'py-3 px-4 text-base'} text-center font-black ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>{toPersianDigits(addCommas(item.totalPrice || 0))}</td>
            </tr>
          ))}
          {/* Empty rows if items are few to maintain classic look */}
          {isClassic && Array.from({ length: Math.max(0, (isA5 ? 3 : 5) - (data.items?.length || 0)) }).map((_, i) => (
             <tr key={`empty-${i}`} className={`${isA5 ? 'h-6' : 'h-12'} print-avoid-break`}>
                <td className="border-x-2 border-slate-800"></td>
                <td className="border-l-2 border-slate-800"></td>
                <td className="border-l-2 border-slate-800"></td>
                <td className="border-l-2 border-slate-800"></td>
                <td className="border-l-2 border-slate-800"></td>
                <td className="border-l-2 border-slate-800"></td>
             </tr>
          ))}
        </tbody>
        
        <tfoot className="print-table-footer">
          <tr>
            <td colSpan={6} className="p-0 border-0 pt-4">
              {/* Summary Area */}
              <div className={`flex flex-col sm:flex-row ${isA5 ? 'gap-3 mb-4' : 'gap-6 mb-8'} print-avoid-break`}>
                <div className="flex-1 space-y-4">
                   {printSettings.showNotes && data.description && (
                     <div className={`${isA5 ? 'p-2 min-h-[60px]' : 'p-4 min-h-[100px]'} rounded-lg ${isClassic ? 'border-2 border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                        <div className={`font-black ${isA5 ? 'text-xs mb-1' : 'text-sm mb-2'}`}>توضیحات فاکتور:</div>
                        <div className={`${isA5 ? 'text-[10px]' : 'text-sm'} font-bold leading-loose text-slate-700`}>{data.description}</div>
                     </div>
                   )}
                   <div className={`${isA5 ? 'p-2 text-xs' : 'p-4 text-sm'} rounded-lg font-bold ${isClassic ? 'border-2 border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                      نحوه تسویه: <span className="text-slate-900">{data.paymentMethod === "cash" ? "نقدی" : data.paymentMethod === "credit" ? "نسیه" : "ترکیبی"}</span>
                   </div>
                </div>
                
                <div className={`${isA5 ? 'w-56' : 'w-80'} shrink-0 rounded-lg overflow-hidden ${isClassic ? 'border-2 border-slate-800' : 'border border-slate-200'}`}>
                  <div className={`flex justify-between ${isA5 ? 'p-2' : 'p-3'} ${isClassic ? 'border-b-2 border-slate-800' : 'border-b border-slate-200'}`}>
                     <span className={`font-bold text-slate-600 ${isA5 ? 'text-[10px]' : ''}`}>جمع مبلغ کالاها:</span>
                     <span className={`font-black ${isA5 ? 'text-sm' : 'text-base'}`}>{toPersianDigits(addCommas(sumTotal))}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className={`flex justify-between ${isA5 ? 'p-2' : 'p-3'} text-red-600 ${isClassic ? 'border-b-2 border-slate-800' : 'border-b border-slate-200'}`}>
                       <span className={`font-bold ${isA5 ? 'text-[10px]' : ''}`}>تخفیف کل:</span>
                       <span className={`font-black ${isA5 ? 'text-sm' : 'text-base'}`}>{toPersianDigits(addCommas(totalDiscount))}</span>
                    </div>
                  )}
                  <div className={`flex justify-between ${isA5 ? 'p-3 text-sm' : 'p-4 text-lg'} bg-slate-800 text-white font-black ${isClassic ? '' : 'rounded-b-lg'}`}>
                     <span>مبلغ قابل پرداخت:</span>
                     <span>{toPersianDigits(addCommas(data.totalAmount || 0))} <span className={`font-normal ${isA5 ? 'text-[8px]' : 'text-sm'}`}>{storeSettings.currency}</span></span>
                  </div>
                </div>
              </div>

              {/* Allocated Transactions Area */}
              {printSettings.showTransactions && allocatedTransactions.length > 0 && (
                <div className={`${isA5 ? 'mb-4' : 'mb-8'} rounded-lg overflow-hidden ${isClassic ? 'border-2 border-slate-800' : 'border border-slate-200'} print-avoid-break`}>
                  <div className={`${isA5 ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} font-black ${isClassic ? 'bg-slate-200 border-b-2 border-slate-800' : 'bg-slate-100 border-b border-slate-200'}`}>
                    تراکنش‌های مالی مرتبط
                  </div>
                  <table className="w-full text-right text-sm">
                    <thead className={`${isClassic ? 'border-b-2 border-slate-800 bg-slate-50' : 'border-b border-slate-200 bg-slate-50'} ${isA5 ? 'text-[10px]' : 'text-sm'}`}>
                      <tr>
                        <th className={`${isA5 ? 'py-1 px-2' : 'py-2 px-4'} font-black ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>تاریخ</th>
                        <th className={`${isA5 ? 'py-1 px-2' : 'py-2 px-4'} font-black ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>نوع</th>
                        <th className={`${isA5 ? 'py-1 px-2' : 'py-2 px-4'} font-black ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>روش</th>
                        <th className={`${isA5 ? 'py-1 px-2' : 'py-2 px-4'} font-black ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>شماره/پیگیری</th>
                        <th className={`${isA5 ? 'py-1 px-2' : 'py-2 px-4'} font-black`}>مبلغ اختصاص یافته ({storeSettings.currency})</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isClassic ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {allocatedTransactions.map((tx: any, idx: number) => {
                        const txType = tx.type === "receive" ? "دریافت" : "پرداخت";
                        const txMethod = tx.method === "cash" ? "نقدی" : "چک";
                        const txRef = tx.method === "check" ? tx.checkNumber : tx.receiptNumber || "-";
                        const allocatedAmount = tx.linkedInvoices[data.id];
                        return (
                          <tr key={idx}>
                            <td className={`${isA5 ? 'py-1 px-2 text-[10px]' : 'py-2 px-4'} font-bold ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>{formatDateDisplay(tx.jalaliDate || tx.date)}</td>
                            <td className={`${isA5 ? 'py-1 px-2 text-[10px]' : 'py-2 px-4'} font-bold ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>{txType}</td>
                            <td className={`${isA5 ? 'py-1 px-2 text-[10px]' : 'py-2 px-4'} font-bold ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>{txMethod}</td>
                            <td className={`${isA5 ? 'py-1 px-2 text-[10px]' : 'py-2 px-4'} font-bold ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>{toPersianDigits(txRef)}</td>
                            <td className={`${isA5 ? 'py-1 px-2 text-sm' : 'py-2 px-4 text-base'} font-black`}>{toPersianDigits(addCommas(allocatedAmount))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className={`${isClassic ? 'border-t-2 border-slate-800 bg-slate-100' : 'border-t border-slate-200 bg-slate-50'}`}>
                      <tr>
                        <td colSpan={4} className={`${isA5 ? 'py-1.5 px-2 text-[10px]' : 'py-3 px-4 text-sm'} text-left font-black text-emerald-700 ${isClassic ? 'border-l-2 border-slate-800' : 'border-l border-slate-200'}`}>جمع مبالغ تسویه شده</td>
                        <td className={`${isA5 ? 'py-1.5 px-2 text-sm' : 'py-3 px-4 text-lg'} font-black text-emerald-700`}>{toPersianDigits(addCommas(totalAllocated))}</td>
                      </tr>
                      {remainingInvoiceBalance > 0 && (
                         <tr>
                           <td colSpan={4} className={`${isA5 ? 'py-1.5 px-2 text-[10px]' : 'py-3 px-4 text-sm'} text-left font-black text-rose-700 ${isClassic ? 'border-l-2 border-slate-800 border-t-2' : 'border-l border-slate-200 border-t'}`}>مانده فاکتور</td>
                           <td className={`${isA5 ? 'py-1.5 px-2 text-sm' : 'py-3 px-4 text-lg'} font-black text-rose-700 ${isClassic ? 'border-t-2 border-slate-800' : 'border-t border-slate-200'}`}>{toPersianDigits(addCommas(remainingInvoiceBalance))}</td>
                         </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Signatures */}
              {printSettings.showSignatures && (
                <div className={`${isA5 ? 'mt-6 mb-4' : 'mt-12 mb-8'} grid grid-cols-2 gap-12 text-center ${isA5 ? 'text-xs' : 'text-sm'} font-black text-slate-800 print-avoid-break`}>
                  <div className="flex flex-col items-center">
                    <span>مهر و امضای فروشنده</span>
                    <div className={`w-2/3 border-b-2 border-dashed border-slate-400 ${isA5 ? 'mt-8' : 'mt-16'}`}></div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>مهر و امضای خریدار</span>
                    <div className={`w-2/3 border-b-2 border-dashed border-slate-400 ${isA5 ? 'mt-8' : 'mt-16'}`}></div>
                  </div>
                </div>
              )}

              {/* Footer Note */}
              {storeSettings.print_footer_note && (
                <div className={`${isA5 ? 'pt-2 text-[10px]' : 'pt-4 text-sm'} text-center font-bold text-slate-600 ${isClassic ? 'border-t-2 border-slate-800' : 'border-t border-slate-200'}`}>
                   {storeSettings.print_footer_note}
                </div>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
