import React from "react";
import { formatDateDisplay, toPersianDigits, addCommas, numToPersianWords } from "../../../utils/format";
import { Store, Building2, User, Phone, MapPin, CheckCircle, Percent } from "lucide-react";
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
    designType: 'modern',
    paperSize: 'a4'
  }
}: InvoicePrintTemplateProps) {
  const isSale = data.type === "sale" || data.type === "sale_return";
  const isReturn = data.type === "sale_return" || data.type === "purchase_return";
  const isVoided = data.status === "voided" || data.isVoided === true;
  const isDraft = data.status === "draft" || data.isDraft === true;
  
  let rawTitle = isSale
    ? isReturn ? "صورتحساب برگشت از فروش" : "صورتحساب فروش کالا و خدمات"
    : isReturn ? "صورتحساب برگشت از خرید" : "صورتحساب خرید کالا و خدمات";

  const title = isVoided
    ? `${rawTitle} (ابطال شده)`
    : isDraft
      ? `${rawTitle} (پیش‌نویس)`
      : rawTitle;
      
  const relatedPerson = persons.find(
    (p) => p.id?.toString() === data.customerId?.toString()
  );

  const getInvoiceDateOnly = (d: any) => {
    if (!d) return "-";
    const formatted = formatDateDisplay(d, storeSettings?.calendarType);
    if (formatted.includes(" ")) {
      return formatted.split(" ")[0];
    }
    return formatted;
  };

  const allocatedTransactions = (transactions || []).filter((t: any) => {
    return t.linkedInvoices && t.linkedInvoices[data.id] && t.linkedInvoices[data.id] > 0;
  });

  const totalAllocated = allocatedTransactions.reduce((sum: number, t: any) => sum + (t.linkedInvoices[data.id] || 0), 0);

  // Calculate person balance up to this invoice date
  let personBalance = 0;
  if (relatedPerson && printSettings.showBalance) {
    const personIdStr = relatedPerson.id.toString();
    const invoiceDateStr = data.date || data.createdAt || new Date().toISOString();
        
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

  // --- Financial & Quantity Calculations ---
  // 1. Total Quantity of all items
  const totalQuantity = (data.items || []).reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);

  // 2. Gross Total before discount
  const rawItemsTotal = (data.items || []).reduce((sum: number, item: any) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  // 3. Row Discounts Total
  const totalRowDiscounts = (data.items || []).reduce((sum: number, item: any) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const gross = qty * price;
    if (item.discount !== undefined && Number(item.discount) > 0) {
      return sum + Number(item.discount);
    }
    const discPct = Number(item.discountPercent) || 0;
    return sum + Math.round(gross * (discPct / 100));
  }, 0);

  // 4. Subtotal After Row Discounts
  const subtotalAfterRowDiscounts = Math.max(0, rawItemsTotal - totalRowDiscounts);

  // 5. Overall Invoice Discount
  const overallDiscountPercent = Number(data.overallDiscountPercent) || 0;
  const overallDiscountAmount = overallDiscountPercent > 0
    ? Math.round(subtotalAfterRowDiscounts * (overallDiscountPercent / 100))
    : (Number(data.discountAmount) || 0);

  const totalDiscount = totalRowDiscounts + overallDiscountAmount;
  const subtotalAfterAllDiscounts = Math.max(0, rawItemsTotal - totalDiscount);

  // 6. Tax / VAT Calculation
  const itemsTaxSum = (data.items || []).reduce((sum: number, item: any) => sum + (Number(item.tax) || 0), 0);
  let totalTax = 0;
  let taxPercent = 0;

  if (data.taxAmount !== undefined && Number(data.taxAmount) > 0) {
    totalTax = Number(data.taxAmount);
    taxPercent = data.taxPercent ? Number(data.taxPercent) : (subtotalAfterAllDiscounts > 0 ? Math.round((totalTax / subtotalAfterAllDiscounts) * 100) : 0);
  } else if (data.tax !== undefined && Number(data.tax) > 0) {
    totalTax = Number(data.tax);
    taxPercent = data.taxPercent ? Number(data.taxPercent) : (subtotalAfterAllDiscounts > 0 ? Math.round((totalTax / subtotalAfterAllDiscounts) * 100) : 0);
  } else if (data.taxPercent !== undefined && Number(data.taxPercent) > 0) {
    taxPercent = Number(data.taxPercent);
    totalTax = Math.round(subtotalAfterAllDiscounts * (taxPercent / 100));
  } else if (itemsTaxSum > 0) {
    totalTax = itemsTaxSum;
    taxPercent = subtotalAfterAllDiscounts > 0 ? Math.round((totalTax / subtotalAfterAllDiscounts) * 100) : 0;
  } else if (storeSettings.default_tax_percent && Number(storeSettings.default_tax_percent) > 0) {
    const diff = (data.totalAmount || 0) - subtotalAfterAllDiscounts;
    if (diff > 0 && Math.abs(diff - Math.round(subtotalAfterAllDiscounts * (Number(storeSettings.default_tax_percent) / 100))) < 50) {
      taxPercent = Number(storeSettings.default_tax_percent);
      totalTax = diff;
    }
  }

  // 7. Final Net Payable
  const finalTotal = data.totalAmount !== undefined && Number(data.totalAmount) > 0
    ? Number(data.totalAmount)
    : (subtotalAfterAllDiscounts + totalTax);

  // 8. Payment Status
  const paidAmount = Number(data.paidAmount) || totalAllocated || 0;
  const remainingInvoiceBalance = Math.max(0, finalTotal - paidAmount);
  const currencyLabel = storeSettings.currency || "تومان";

  // Layout Styles
  const isClassic = printSettings.designType === 'classic';
  const paperSize = printSettings.paperSize || 'a4';
  const isA5 = paperSize === 'a5';

  return (
    <div className={`bg-white text-slate-800 font-sans ${isA5 ? 'text-[10px]' : 'text-xs sm:text-sm'}`} dir="rtl">
      <style>{`
        @media print {
          @page {
            size: ${isA5 ? 'A5' : 'A4'} portrait;
            margin: 6mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
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
        }
      `}</style>

      <table className="w-full text-right" style={{ borderCollapse: 'collapse' }}>
        <thead className="print-table-header">
          {/* Main Invoice Header (Store & Customer) */}
          <tr>
            <th colSpan={9} className="font-normal p-0 border-0">
              <div className={`flex justify-between items-start ${isA5 ? 'mb-3 pb-2' : 'mb-5 pb-4'} ${isClassic ? 'border-b border-slate-400' : 'border-b border-slate-200'}`}>
                
                {/* Store branding */}
                <div className="flex-1">
                  {printSettings.showStoreLogo && (
                    <div className={`flex items-center ${isA5 ? 'gap-2 mb-1.5' : 'gap-3 mb-2'}`}>
                      {storeSettings.logo ? (
                        <img
                          src={storeSettings.logo}
                          alt={storeSettings.storeName || "لوگو"}
                          referrerPolicy="no-referrer"
                          className={`${isA5 ? 'w-8 h-8' : 'w-12 h-12'} object-contain rounded-lg border border-slate-200`}
                        />
                      ) : (
                        <div className={`${isA5 ? 'w-8 h-8' : 'w-11 h-11'} flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200`}>
                          <Store className={`${isA5 ? 'w-4 h-4' : 'w-6 h-6'} text-slate-700`} />
                        </div>
                      )}
                      <div>
                        <h1 className={`${isA5 ? 'text-sm' : 'text-xl'} font-black text-slate-900`}>
                          {storeSettings.storeName || storeSettings.companyName || "نام فروشگاه"}
                        </h1>
                        <p className="text-[9px] text-slate-400 font-medium">سیستم حسابداری و صدور فاکتور</p>
                      </div>
                    </div>
                  )}
                  {!printSettings.showStoreLogo && (
                    <h1 className={`${isA5 ? 'text-sm mb-1' : 'text-xl mb-2'} font-black text-slate-900`}>
                      {storeSettings.storeName || storeSettings.companyName || "نام فروشگاه"}
                    </h1>
                  )}

                  <div className={`grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-500 font-medium ${isA5 ? 'text-[9px]' : 'text-[11px]'}`}>
                    {(storeSettings.phone || storeSettings.mobile) && (
                      <div>
                        <span className="text-slate-400">تلفن: </span>
                        <span className="font-bold text-slate-700" dir="ltr">{toPersianDigits(storeSettings.phone || storeSettings.mobile)}</span>
                      </div>
                    )}
                    {storeSettings.taxId && (
                      <div>
                        <span className="text-slate-400">شماره اقتصادی: </span>
                        <span className="font-bold text-slate-700">{toPersianDigits(storeSettings.taxId)}</span>
                      </div>
                    )}
                    {storeSettings.registrationNumber && (
                      <div>
                        <span className="text-slate-400">شناسه ملی: </span>
                        <span className="font-bold text-slate-700">{toPersianDigits(storeSettings.registrationNumber)}</span>
                      </div>
                    )}
                    {storeSettings.postalCode && (
                      <div>
                        <span className="text-slate-400">کد پستی: </span>
                        <span className="font-bold text-slate-700">{toPersianDigits(storeSettings.postalCode)}</span>
                      </div>
                    )}
                  </div>

                  {storeSettings.address && (
                    <div className={`${isA5 ? 'text-[9px] mt-1' : 'text-[11px] mt-1.5'} font-medium text-slate-600 leading-relaxed`}>
                      <span className="text-slate-400">نشانی: </span>{storeSettings.address}
                    </div>
                  )}
                </div>
                
                {/* Title badge */}
                <div className="flex flex-col items-center justify-center px-4 shrink-0">
                  <h2 className={`${isA5 ? 'text-xs px-3 py-1' : 'text-lg px-5 py-1.5'} font-black rounded-lg ${
                    isVoided 
                      ? 'border border-rose-300 text-rose-700 bg-rose-50' 
                      : isDraft 
                        ? 'border border-amber-300 text-amber-800 bg-amber-50' 
                        : 'border border-slate-300 text-slate-800 bg-slate-50'
                  }`}>
                    {title}
                  </h2>
                  {isVoided && (
                    <span className="text-[9px] font-black text-rose-700 mt-1">فاقد اثر مالی و قانونی</span>
                  )}
                  {isDraft && !isVoided && (
                    <span className="text-[9px] font-bold text-amber-700 mt-1">نسخه پیش‌نویس - غیر رسمی</span>
                  )}
                </div>

                {/* Serial & Date */}
                <div className="flex-1 text-left space-y-1 shrink-0">
                  <div className="flex justify-end gap-2 items-center">
                    <span className={`font-medium text-slate-400 ${isA5 ? 'text-[9px]' : 'text-xs'}`}>شماره فاکتور:</span>
                    <span className={`font-mono font-black text-slate-900 ${isA5 ? 'text-xs' : 'text-base'}`}>{toPersianDigits(data.invoiceNumber || "-")}</span>
                  </div>
                  <div className="flex justify-end gap-2 items-center">
                    <span className={`font-medium text-slate-400 ${isA5 ? 'text-[9px]' : 'text-xs'}`}>تاریخ صدور:</span>
                    <span className={`font-bold text-slate-800 ${isA5 ? 'text-[9px]' : 'text-xs'}`}>{getInvoiceDateOnly(data.date || data.createdAt)}</span>
                  </div>
                  {data.dueDate && (
                     <div className="flex justify-end gap-2 items-center">
                       <span className={`font-medium text-slate-400 ${isA5 ? 'text-[9px]' : 'text-xs'}`}>تاریخ سررسید:</span>
                       <span className={`font-bold text-indigo-700 ${isA5 ? 'text-[9px]' : 'text-xs'}`}>{getInvoiceDateOnly(data.dueDate)}</span>
                     </div>
                  )}
                  {data.sellerInvoiceNumber && (
                    <div className="flex justify-end gap-2 items-center">
                      <span className={`font-medium text-slate-400 ${isA5 ? 'text-[9px]' : 'text-xs'}`}>ارجاع / تامین‌کننده:</span>
                      <span className={`font-bold text-slate-700 ${isA5 ? 'text-[9px]' : 'text-xs'}`}>{toPersianDigits(data.sellerInvoiceNumber)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info Box */}
              <div className={`rounded-xl border border-slate-200 bg-slate-50/40 ${isA5 ? 'p-2.5 mb-3' : 'p-3.5 mb-5'}`}>
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5 mb-2">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>مشخصات {isSale ? 'خریدار / مشتری' : 'فروشنده / تامین‌کننده'}</span>
                  </div>
                  {printSettings.showBalance && relatedPerson && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-slate-400 font-medium">وضعیت حساب:</span>
                      <span className="font-bold text-slate-800 accounting-num" dir="ltr">
                        {toPersianDigits(addCommas(absBalance))} {currencyLabel}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        balanceType === 'بدهکار' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        balanceType === 'بستانکار' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {balanceType}
                      </span>
                    </div>
                  )}
                </div>

                <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${isA5 ? 'text-[9.5px]' : 'text-[11.5px]'}`}>
                  <div>
                    <span className="text-slate-400 block text-[9px]">نام طرف حساب:</span>
                    <span className="font-black text-slate-900">{relatedPerson?.name || 'مشتری عمومی'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">تلفن / همراه:</span>
                    <span className="font-bold text-slate-800" dir="ltr">{toPersianDigits(relatedPerson?.mobile || relatedPerson?.phone || "-")}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">کد / شناسه ملی:</span>
                    <span className="font-bold text-slate-800">{toPersianDigits(relatedPerson?.nationalId || "-")}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">شماره اقتصادی:</span>
                    <span className="font-bold text-slate-800">{toPersianDigits(relatedPerson?.taxId || relatedPerson?.economicCode || "-")}</span>
                  </div>
                  {relatedPerson?.address && (
                    <div className="col-span-2 md:col-span-4 pt-1 border-t border-slate-100 text-slate-600 flex items-center gap-1">
                      <span className="text-slate-400">نشانی:</span>
                      <span>{relatedPerson.address}</span>
                      {relatedPerson.postalCode && <span className="mr-2 text-slate-400">(کد پستی: {toPersianDigits(relatedPerson.postalCode)})</span>}
                    </div>
                  )}
                </div>
              </div>
            </th>
          </tr>

          {/* Table Columns Header */}
          <tr className={`bg-slate-100/80 text-slate-700 font-bold border-y border-slate-200 ${isA5 ? 'text-[9px]' : 'text-[11px]'}`}>
            <th className="py-2 px-2 text-center w-8 border-l border-slate-200">#</th>
            <th className="py-2 px-3 border-l border-slate-200">شرح کالا / خدمات</th>
            <th className="py-2 px-2 text-center border-l border-slate-200 w-16">تعداد / مقدار</th>
            <th className="py-2 px-2 text-left border-l border-slate-200 w-24">مبلغ واحد (فی)</th>
            <th className="py-2 px-2 text-left border-l border-slate-200 w-24">مبلغ ناخالص</th>
            <th className="py-2 px-1 text-center border-l border-slate-200 w-14">تخفیف (%)</th>
            <th className="py-2 px-2 text-left border-l border-slate-200 w-20">مبلغ تخفیف</th>
            <th className="py-2 px-2 text-left border-l border-slate-200 w-18">مالیات</th>
            <th className="py-2 px-3 text-left w-28">مبلغ خالص نهایی</th>
          </tr>
        </thead>
        
        <tbody className={`divide-y divide-slate-100 border-b border-slate-200 ${isA5 ? 'text-[9.5px]' : 'text-[11px]'}`}>
          {(data.items || []).map((item: any, idx: number) => {
            const qty = Number(item.quantity) || 0;
            const unitPrice = Number(item.unitPrice) || 0;
            const rowGross = qty * unitPrice;
            const rowDiscPct = Number(item.discountPercent) || 0;
            const rowDiscAmount = item.discount !== undefined && Number(item.discount) > 0
              ? Number(item.discount)
              : Math.round(rowGross * (rowDiscPct / 100));
            const rowAfterDisc = Math.max(0, rowGross - rowDiscAmount);
            const rowTax = Number(item.tax) || (taxPercent > 0 ? Math.round(rowAfterDisc * (taxPercent / 100)) : 0);
            const rowFinal = item.totalPrice !== undefined && Number(item.totalPrice) > 0
              ? Number(item.totalPrice) + (Number(item.tax) || 0)
              : (rowAfterDisc + rowTax);

            return (
              <tr key={idx} className="print-avoid-break hover:bg-slate-50/40 transition-colors">
                <td className="py-2 px-2 text-center font-bold text-slate-400 border-l border-slate-100">
                  {toPersianDigits(idx + 1)}
                </td>
                <td className="py-2 px-3 border-l border-slate-100">
                  <div className="font-bold text-slate-800">{item.productName}</div>
                  {item.productCode && (
                    <div className="text-[8.5px] text-slate-400 font-mono mt-0.5">
                      کد: {toPersianDigits(item.productCode)}
                    </div>
                  )}
                </td>
                <td className="py-2 px-2 text-center font-bold text-slate-800 border-l border-slate-100 whitespace-nowrap">
                  <span>{toPersianDigits(item.quantity)}</span>{" "}
                  <span className="text-[8.5px] font-normal text-slate-400">
                    {item.selectedUnit || item.unit || "عدد"}
                  </span>
                </td>
                <td className="py-2 px-2 text-left font-medium text-slate-700 border-l border-slate-100 accounting-num" dir="ltr">
                  {toPersianDigits(addCommas(unitPrice))}
                </td>
                <td className="py-2 px-2 text-left font-medium text-slate-700 border-l border-slate-100 accounting-num" dir="ltr">
                  {toPersianDigits(addCommas(rowGross))}
                </td>
                <td className="py-2 px-1 text-center font-bold text-slate-600 border-l border-slate-100">
                  {rowDiscPct > 0 ? (
                    <span className="text-rose-600 font-bold">٪{toPersianDigits(rowDiscPct)}</span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="py-2 px-2 text-left font-medium text-slate-600 border-l border-slate-100 accounting-num" dir="ltr">
                  {rowDiscAmount > 0 ? (
                    <span className="text-rose-600 font-bold">{toPersianDigits(addCommas(rowDiscAmount))}</span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="py-2 px-2 text-left font-medium text-slate-600 border-l border-slate-100 accounting-num" dir="ltr">
                  {rowTax > 0 ? (
                    <span className="text-indigo-600 font-bold">{toPersianDigits(addCommas(rowTax))}</span>
                  ) : (
                    <span className="text-slate-300">۰</span>
                  )}
                </td>
                <td className="py-2 px-3 text-left font-black text-slate-900 accounting-num" dir="ltr">
                  {toPersianDigits(addCommas(rowFinal))}
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* TABLE TOTALS FOOTER ROW (جمع‌های سطری و تعداد) */}
        <tfoot>
          <tr className={`bg-slate-100/70 border-b-2 border-slate-300 font-black text-slate-800 ${isA5 ? 'text-[9px]' : 'text-[10.5px]'}`}>
            <td colSpan={2} className="py-2 px-3 border-l border-slate-200">
              <div className="flex items-center justify-between">
                <span>جمع کل اقلام ردیف‌ها:</span>
                <span className="text-indigo-700 font-extrabold px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded">
                  {toPersianDigits(data.items?.length || 0)} سطر کالا
                </span>
              </div>
            </td>
            <td className="py-2 px-2 text-center text-indigo-900 border-l border-slate-200">
              <span className="font-black">{toPersianDigits(totalQuantity)}</span>
            </td>
            <td className="py-2 px-2 text-center text-slate-400 border-l border-slate-200">---</td>
            <td className="py-2 px-2 text-left accounting-num border-l border-slate-200" dir="ltr">
              {toPersianDigits(addCommas(rawItemsTotal))}
            </td>
            <td className="py-2 px-1 text-center text-slate-400 border-l border-slate-200">---</td>
            <td className="py-2 px-2 text-left text-rose-700 accounting-num border-l border-slate-200" dir="ltr">
              {totalRowDiscounts > 0 ? toPersianDigits(addCommas(totalRowDiscounts)) : "۰"}
            </td>
            <td className="py-2 px-2 text-left text-indigo-700 accounting-num border-l border-slate-200" dir="ltr">
              {totalTax > 0 ? toPersianDigits(addCommas(totalTax)) : "۰"}
            </td>
            <td className="py-2 px-3 text-left text-slate-900 accounting-num" dir="ltr">
              {toPersianDigits(addCommas(finalTotal))}
            </td>
          </tr>

          {/* FINANCIAL SUMMARY, NOTES, AND SIGNATURES */}
          <tr>
            <td colSpan={9} className="p-0 border-0 pt-4">
              
              {/* Summary Area */}
              <div className={`flex flex-col md:flex-row justify-between items-start gap-4 print-avoid-break ${isA5 ? 'mb-3' : 'mb-6'}`}>
                
                {/* Left: Notes, Amount in Words, Payment terms */}
                <div className="flex-1 w-full space-y-3">
                  {/* Amount in Persian Words */}
                  <div className={`p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 ${isA5 ? 'text-[9.5px]' : 'text-[11.5px]'}`}>
                    <span className="text-indigo-600 font-bold ml-1">مبلغ به حروف:</span>
                    <span className="font-black text-indigo-950 leading-relaxed">
                      {numToPersianWords(Math.round(finalTotal))} {currencyLabel} تمام
                    </span>
                  </div>

                  {/* Payment Details */}
                  <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/30 ${isA5 ? 'text-[9px]' : 'text-[10.5px]'}`}>
                    <div>
                      <span className="text-slate-400 font-medium block">نحوه تسویه:</span>
                      <span className="font-bold text-slate-800">
                        {data.paymentMethod === "cash" ? "نقدی" : data.paymentMethod === "credit" ? "نسیه" : "ترکیبی / واریز"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">وضعیت پرداخت:</span>
                      <span className={`font-black ${
                        paidAmount >= finalTotal ? 'text-emerald-700' :
                        paidAmount > 0 ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        {paidAmount >= finalTotal ? "تسویه کامل" : paidAmount > 0 ? "پرداخت جزئی" : "تسویه نشده"}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {printSettings.showNotes && (data.description || data.note) && (
                    <div className={`p-2.5 rounded-xl border border-slate-200/70 bg-white ${isA5 ? 'text-[9px]' : 'text-[10.5px]'}`}>
                      <span className="text-slate-400 font-bold block mb-0.5">توضیحات فاکتور:</span>
                      <div className="text-slate-700 font-medium leading-relaxed whitespace-pre-line">
                        {data.description || data.note}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Step-by-Step Financial Breakdown Box */}
                <div className={`w-full md:w-80 shrink-0 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30 ${isA5 ? 'text-[9.5px]' : 'text-[11.5px]'}`}>
                  <div className="p-3 border-b border-slate-200/60 font-black text-slate-700 bg-slate-100/50">
                    خلاصه محاسبات مالی
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-medium">جمع ناخالص کالاها:</span>
                      <span className="font-bold text-slate-800 accounting-num" dir="ltr">
                        {toPersianDigits(addCommas(rawItemsTotal))} <span className="text-[9px] font-normal text-slate-400">{currencyLabel}</span>
                      </span>
                    </div>

                    {totalRowDiscounts > 0 && (
                      <div className="flex justify-between items-center text-rose-600">
                        <span className="font-medium">تخفیف سطری اقلام:</span>
                        <span className="font-bold accounting-num" dir="ltr">
                          - {toPersianDigits(addCommas(totalRowDiscounts))} <span className="text-[9px] font-normal text-rose-400">{currencyLabel}</span>
                        </span>
                      </div>
                    )}

                    {overallDiscountAmount > 0 && (
                      <div className="flex justify-between items-center text-rose-600">
                        <span className="font-medium">
                          تخفیف کلی فاکتور {overallDiscountPercent > 0 ? `(٪${toPersianDigits(overallDiscountPercent)})` : ""}:
                        </span>
                        <span className="font-bold accounting-num" dir="ltr">
                          - {toPersianDigits(addCommas(overallDiscountAmount))} <span className="text-[9px] font-normal text-rose-400">{currencyLabel}</span>
                        </span>
                      </div>
                    )}

                    {totalDiscount > 0 && (
                      <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-200/50">
                        <span className="font-medium">مبلغ پس از تخفیف:</span>
                        <span className="font-bold text-slate-700 accounting-num" dir="ltr">
                          {toPersianDigits(addCommas(subtotalAfterAllDiscounts))} {currencyLabel}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-slate-200/50">
                      <span className="font-medium">
                        مالیات و عوارض ارزش افزوده {taxPercent > 0 ? `(٪${toPersianDigits(taxPercent)})` : ""}:
                      </span>
                      <span className="font-bold text-indigo-900 accounting-num" dir="ltr">
                        {totalTax > 0 ? (
                          <>+ {toPersianDigits(addCommas(totalTax))} <span className="text-[9px] font-normal text-slate-400">{currencyLabel}</span></>
                        ) : (
                          <span className="text-slate-400 font-normal">معاف / ۰</span>
                        )}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-lg bg-slate-900 text-white font-black flex justify-between items-center ${isA5 ? 'mt-2 text-xs' : 'mt-3 text-sm'}`}>
                      <span className="tracking-tight">مبلغ قابل پرداخت:</span>
                      <span className="accounting-num text-base sm:text-lg text-emerald-400" dir="ltr">
                        {toPersianDigits(addCommas(finalTotal))}{" "}
                        <span className="text-[10px] text-slate-300 font-normal">{currencyLabel}</span>
                      </span>
                    </div>

                    {(paidAmount > 0 || remainingInvoiceBalance > 0) && (
                      <div className="pt-2 border-t border-slate-200 space-y-1 text-[10px]">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>مبلغ پرداخت شده:</span>
                          <span className="font-bold text-emerald-700 accounting-num" dir="ltr">
                            {toPersianDigits(addCommas(paidAmount))} {currencyLabel}
                          </span>
                        </div>
                        {remainingInvoiceBalance > 0 && (
                          <div className="flex justify-between items-center text-rose-700 font-bold">
                            <span>مانده فاکتور:</span>
                            <span className="accounting-num" dir="ltr">
                              {toPersianDigits(addCommas(remainingInvoiceBalance))} {currencyLabel}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Allocated Transactions Area */}
              {printSettings.showTransactions && allocatedTransactions.length > 0 && (
                <div className={`rounded-xl border border-slate-200 overflow-hidden ${isA5 ? 'mb-3' : 'mb-6'} print-avoid-break`}>
                  <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 font-bold text-slate-700 text-[10px]">
                    تراکنش‌های مالی مرتبط با این فاکتور
                  </div>
                  <table className="w-full text-right text-[10px]">
                    <thead className="bg-slate-100/50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-1.5 px-3 border-l border-slate-200">تاریخ</th>
                        <th className="py-1.5 px-3 border-l border-slate-200">نوع</th>
                        <th className="py-1.5 px-3 border-l border-slate-200">روش</th>
                        <th className="py-1.5 px-3 border-l border-slate-200">شماره/پیگیری</th>
                        <th className="py-1.5 px-3 text-left">مبلغ ({currencyLabel})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allocatedTransactions.map((tx: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-1 px-3 border-l border-slate-100">{getInvoiceDateOnly(tx.jalaliDate || tx.date)}</td>
                          <td className="py-1 px-3 border-l border-slate-100">{tx.type === "receive" ? "دریافت" : "پرداخت"}</td>
                          <td className="py-1 px-3 border-l border-slate-100">{tx.method === "cash" ? "نقدی" : tx.method === "check" ? "چک" : "کارت‌خوان/سند"}</td>
                          <td className="py-1 px-3 border-l border-slate-100 font-mono">{toPersianDigits(tx.checkNumber || tx.receiptNumber || "-")}</td>
                          <td className="py-1 px-3 text-left font-bold text-slate-900 accounting-num" dir="ltr">{toPersianDigits(addCommas(tx.linkedInvoices[data.id] || tx.amount || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signatures */}
              {printSettings.showSignatures && (
                <div className={`grid grid-cols-2 gap-8 text-center text-slate-700 font-bold print-avoid-break ${isA5 ? 'mt-4 mb-2 text-[9.5px]' : 'mt-8 mb-4 text-[11px]'}`}>
                  <div className="flex flex-col items-center">
                    <span className="text-slate-500">مهر و امضای فروشنده</span>
                    <div className={`w-3/4 border-b border-dashed border-slate-300 ${isA5 ? 'mt-8' : 'mt-12'}`}></div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-slate-500">مهر و امضای خریدار</span>
                    <div className={`w-3/4 border-b border-dashed border-slate-300 ${isA5 ? 'mt-8' : 'mt-12'}`}></div>
                  </div>
                </div>
              )}

              {/* Footer Note */}
              {storeSettings.print_footer_note && (
                <div className={`text-center font-medium text-slate-400 border-t border-slate-100 pt-2 ${isA5 ? 'mt-2 text-[8px]' : 'mt-4 text-[10px]'}`}>
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
