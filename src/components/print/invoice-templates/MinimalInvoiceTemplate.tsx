import React from "react";
import Barcode from "react-barcode";
import { formatDateDisplay, formatInvoiceDate, toPersianDigits, addCommas, numToPersianWords } from "../../../utils/format";
import { Store, Building2, User, Phone, MapPin, Hash, Calendar, CheckCircle, Percent } from "lucide-react";
import { InvoicePrintTemplateProps } from "./InvoicePrintTypes";

export default function MinimalInvoiceTemplate({
  data,
  storeSettings,
  persons = [],
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
    showQrCode: true,
    paperSize: 'a4',
    paginationMode: 'auto',
    itemsPerPage: 12,
    fontSize: 'normal'
  }
}: InvoicePrintTemplateProps) {
  if (!data) return null;

  const paperSize = printSettings?.paperSize || 'a4';
  const isA5 = paperSize === 'a5';
  const isBold = isA5 || printSettings?.boldBorders;

  // Customizable columns
  const defaultCols = {
    rowIndex: true,
    productCode: false,
    productName: true,
    quantity: true,
    unit: true,
    unitPrice: true,
    grossAmount: true,
    discountPercent: true,
    discountAmount: true,
    tax: true,
    totalPrice: true,
  };
  const cols = { ...defaultCols, ...printSettings?.columns };

  const leadingColSpan = (cols.rowIndex ? 1 : 0) + (cols.productCode ? 1 : 0) + 1;

  // Border & styling tokens
  const boxBorderClass = isBold
    ? "border-2 border-slate-700 print:border-slate-800"
    : "border border-slate-300 print:border-slate-400";
  const innerDividerClass = isBold
    ? "border-slate-400 print:border-slate-600"
    : "border-slate-200 print:border-slate-300";
  const cellBorderClass = isBold
    ? "border-l border-slate-400 print:border-slate-600"
    : "border-l border-slate-200 print:border-slate-300";
  const tableHeadClass = isBold
    ? "bg-slate-100 text-slate-900 font-black border-b-2 border-slate-700 print:border-slate-800"
    : "bg-slate-50 text-slate-700 font-bold border-b border-slate-300";
  const tableFootClass = isBold
    ? "bg-slate-100 text-slate-900 font-black border-t-2 border-slate-700 print:border-slate-800"
    : "bg-slate-100/70 text-slate-800 font-bold border-t-2 border-slate-300";

  const isSale = data.type === "sale" || data.type === "sale_return" || !data.type;
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

  const relatedPerson = (persons || []).find(p => p && p.id?.toString() === data.customerId?.toString());

  const getInvoiceDateOnly = (d: any) => {
    return formatInvoiceDate(d, storeSettings?.calendarType, { showTime: false });
  };

  const allocatedTransactions = (transactions || []).filter((t: any) => {
    return t.linkedInvoices && t.linkedInvoices[data.id] && t.linkedInvoices[data.id] > 0;
  });
  const totalAllocated = allocatedTransactions.reduce((sum: number, t: any) => sum + (t.linkedInvoices[data.id] || 0), 0);

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

  // Financial Calculations
  const allItems = (data.items && Array.isArray(data.items) && data.items.length > 0)
    ? data.items
    : (data.totalAmount || data.totalPrice || data.finalAmount)
      ? [
          {
            id: '1',
            productName: data.description || data.title || 'اقلام سند',
            quantity: 1,
            unit: 'عدد',
            unitPrice: Number(data.totalAmount || data.totalPrice || data.finalAmount || 0),
            totalPrice: Number(data.totalAmount || data.totalPrice || data.finalAmount || 0),
          }
        ]
      : [];
  const totalQuantity = allItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);

  const rawItemsTotal = allItems.reduce((sum: number, item: any) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  const totalRowDiscounts = allItems.reduce((sum: number, item: any) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const gross = qty * price;
    if (item.discount !== undefined && Number(item.discount) > 0) {
      return sum + Number(item.discount);
    }
    const discPct = Number(item.discountPercent) || 0;
    return sum + Math.round(gross * (discPct / 100));
  }, 0);

  const subtotalAfterRowDiscounts = Math.max(0, rawItemsTotal - totalRowDiscounts);

  const overallDiscountPercent = Number(data.overallDiscountPercent) || 0;
  const overallDiscountAmount = overallDiscountPercent > 0
    ? Math.round(subtotalAfterRowDiscounts * (overallDiscountPercent / 100))
    : (Number(data.discountAmount) || 0);

  const totalDiscount = totalRowDiscounts + overallDiscountAmount;
  const subtotalAfterAllDiscounts = Math.max(0, rawItemsTotal - totalDiscount);

  const itemsTaxSum = allItems.reduce((sum: number, item: any) => sum + (Number(item.tax) || 0), 0);
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

  const finalTotal = data.totalAmount !== undefined && Number(data.totalAmount) > 0
    ? Number(data.totalAmount)
    : (data.totalPrice !== undefined && Number(data.totalPrice) > 0
        ? Number(data.totalPrice)
        : (data.finalAmount !== undefined && Number(data.finalAmount) > 0
            ? Number(data.finalAmount)
            : (subtotalAfterAllDiscounts + totalTax)));

  const paidAmount = Number(data.paidAmount) || totalAllocated || 0;
  const remainingDue = Math.max(0, finalTotal - paidAmount);
  const currencyLabel = storeSettings.currency || "تومان";

  // Font Size
  const fontSizeClass = printSettings.fontSize === 'compact'
    ? (isA5 ? 'text-[8.5px]' : 'text-[11px]')
    : printSettings.fontSize === 'large'
      ? (isA5 ? 'text-[10.5px]' : 'text-[13px]')
      : (isA5 ? 'text-[9.5px]' : 'text-xs');

  // Pagination Partitioning
  const isChunked = printSettings.paginationMode === 'chunked';
  const configuredItemsPerPage = Number(printSettings.itemsPerPage) || (isA5 ? 8 : 12);
  const firstPageLimit = Math.max(3, configuredItemsPerPage - (isA5 ? 3 : 4));
  const subsequentLimit = configuredItemsPerPage;

  interface PageChunk {
    items: any[];
    startIndex: number;
    pageNumber: number;
  }

  let pageChunks: PageChunk[] = [];
  if (isChunked && allItems.length > firstPageLimit) {
    pageChunks.push({
      items: allItems.slice(0, firstPageLimit),
      startIndex: 0,
      pageNumber: 1
    });
    let currentIdx = firstPageLimit;
    let pageNum = 2;
    while (currentIdx < allItems.length) {
      const nextLimit = currentIdx + subsequentLimit;
      pageChunks.push({
        items: allItems.slice(currentIdx, nextLimit),
        startIndex: currentIdx,
        pageNumber: pageNum
      });
      currentIdx = nextLimit;
      pageNum++;
    }
  } else {
    pageChunks = [{
      items: allItems,
      startIndex: 0,
      pageNumber: 1
    }];
  }

  const totalPages = pageChunks.length;

  return (
    <div
      className={`minimal-invoice-sheet bg-white text-slate-800 font-sans mx-auto ${fontSizeClass} ${
        isA5 ? 'p-3' : 'p-6'
      } print:w-full print:max-w-none print:p-0 print:m-0`}
      dir="rtl"
      style={{ fontFamily: "'IRANYekanXFaNum', 'Vazirmatn', -apple-system, sans-serif" }}
    >
      <style>{`
        .minimal-invoice-sheet, .minimal-invoice-sheet * {
          font-family: 'IRANYekanXFaNum', 'Vazirmatn', -apple-system, sans-serif !important;
        }
        @media print {
          @page {
            size: ${isA5 ? 'A5' : 'A4'} portrait;
            margin: ${isA5 ? '5mm' : '7mm'};
          }
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .minimal-invoice-sheet {
            width: 100% !important;
            max-width: ${isA5 ? '138mm' : '196mm'} !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-row-group !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .invoice-page-sheet {
            page-break-after: always !important;
            break-after: page !important;
          }
          .invoice-page-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* RENDER PAGES */}
      {pageChunks.map((chunk, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === totalPages - 1;

        return (
          <div
            key={pageIdx}
            className={`invoice-page-sheet relative bg-white ${
              !isLastPage ? 'break-after-page page-break-after mb-8 print:mb-0' : ''
            }`}
          >
            {/* Header: Full on Page 1 */}
            {isFirstPage && (
              <div className={`print-avoid-break ${isA5 ? 'mb-2 pb-1.5' : 'mb-3.5 pb-2.5'}`}>
                <div className={`flex justify-between items-start border-b border-slate-200 pb-3 mb-3`}>
                  <div className="flex-1">
                    {printSettings.showStoreLogo && (
                      <div className="flex items-center gap-2.5 mb-1.5">
                        {storeSettings.logo ? (
                          <img
                            src={storeSettings.logo}
                            alt={storeSettings.storeName || "لوگو"}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 object-contain rounded-lg border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200">
                            <Store className="w-5 h-5 text-slate-700" />
                          </div>
                        )}
                        <div>
                          <h1 className="text-lg font-black text-slate-900">{storeSettings.storeName || "نام فروشگاه"}</h1>
                          <p className="text-[9px] text-slate-400 font-medium">سیستم حسابداری و صدور فاکتور</p>
                        </div>
                      </div>
                    )}
                    {!printSettings.showStoreLogo && (
                      <h1 className="text-lg font-black text-slate-900 mb-1">{storeSettings.storeName || "نام فروشگاه"}</h1>
                    )}

                    <div className="text-[10px] text-slate-500 space-y-0.5 font-medium">
                      {(storeSettings.phone || storeSettings.mobile) && (
                        <div>تلفن: <span className="font-bold text-slate-700" dir="ltr">{toPersianDigits(storeSettings.phone || storeSettings.mobile)}</span></div>
                      )}
                      {storeSettings.address && (
                        <div>نشانی: <span>{storeSettings.address}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center px-4 shrink-0">
                    <h2 className="text-base font-black px-4 py-1 rounded-lg border border-slate-300 text-slate-900 bg-slate-50">
                      {title}
                    </h2>
                    {totalPages > 1 && (
                      <div className="mt-1 text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        صفحه {toPersianDigits(1)} از {toPersianDigits(totalPages)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-left space-y-1 text-xs shrink-0">
                    <div>شماره فاکتور: <span className="font-mono font-black text-slate-900 text-sm">{toPersianDigits(data.invoiceNumber || "-")}</span></div>
                    <div>تاریخ: <span className="font-bold text-slate-800">{getInvoiceDateOnly(data.date || data.createdAt)}</span></div>
                    {printSettings.showQrCode !== false && (data.invoiceNumber || data.id) && (
                      <div className="flex flex-col items-end pt-1">
                        <Barcode
                          value={String(data.invoiceNumber || data.id)}
                          height={20}
                          width={1.1}
                          displayValue={false}
                          margin={0}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Box */}
                <div className={`rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 mb-2`}>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">طرف حساب:</span>
                      <span className="font-black text-slate-900">{relatedPerson?.name || "مشتری عمومی"}</span>
                    </div>
                    {relatedPerson?.mobile && (
                      <div>تلفن: <span className="font-bold" dir="ltr">{toPersianDigits(relatedPerson.mobile)}</span></div>
                    )}
                    {relatedPerson?.nationalId && (
                      <div>شناسه ملی: <span className="font-bold">{toPersianDigits(relatedPerson.nationalId)}</span></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Running Header on Pages 2+ */}
            {!isFirstPage && (
              <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3 text-xs font-bold text-slate-700 print-avoid-break">
                <div>{storeSettings.storeName} - {title} (فاکتور: {toPersianDigits(data.invoiceNumber || "-")})</div>
                <div>خریدار: {relatedPerson?.name || "عمومی"}</div>
                <div>صفحه {toPersianDigits(chunk.pageNumber)} از {toPersianDigits(totalPages)}</div>
              </div>
            )}

            {/* Table */}
            <table className="w-full text-right" style={{ borderCollapse: 'collapse' }}>
              <thead className="print-table-header">
                <tr className={`${tableHeadClass} text-[10.5px]`}>
                  {cols.rowIndex && <th className="py-2 px-1.5 text-center w-8 border-b border-slate-300">#</th>}
                  {cols.productCode && <th className="py-2 px-2 text-center w-16 border-b border-slate-300">کد</th>}
                  <th className="py-2 px-3 border-b border-slate-300">شرح کالا یا خدمات</th>
                  {cols.quantity && <th className="py-2 px-2 text-center w-14 border-b border-slate-300">تعداد</th>}
                  {cols.unit && <th className="py-2 px-1.5 text-center w-12 border-b border-slate-300">واحد</th>}
                  {cols.unitPrice && <th className="py-2 px-2 text-left w-24 border-b border-slate-300">فی ({currencyLabel})</th>}
                  {cols.grossAmount && <th className="py-2 px-2 text-left w-24 border-b border-slate-300">مبلغ ناخالص</th>}
                  {cols.discountPercent && <th className="py-2 px-1 text-center w-12 border-b border-slate-300">تخفیف (%)</th>}
                  {cols.discountAmount && <th className="py-2 px-2 text-left w-20 border-b border-slate-300">مبلغ تخفیف</th>}
                  {cols.tax && <th className="py-2 px-2 text-left w-20 border-b border-slate-300">مالیات</th>}
                  {cols.totalPrice && <th className="py-2 px-3 text-left w-28 border-b border-slate-300 font-black">مبلغ نهایی</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chunk.items.map((item: any, rowIdx: number) => {
                  const globalIdx = chunk.startIndex + rowIdx;
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
                    <tr key={globalIdx} className={globalIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                      {cols.rowIndex && <td className="py-1.5 px-1.5 text-center text-slate-400 font-mono">{toPersianDigits(globalIdx + 1)}</td>}
                      {cols.productCode && <td className="py-1.5 px-2 text-center text-slate-500 font-mono">{toPersianDigits(item.productCode || "-")}</td>}
                      <td className="py-1.5 px-3 font-bold text-slate-900">{item.productName}</td>
                      {cols.quantity && <td className="py-1.5 px-2 text-center font-bold">{toPersianDigits(item.quantity)}</td>}
                      {cols.unit && <td className="py-1.5 px-1.5 text-center text-slate-600">{item.selectedUnit || item.unit || "عدد"}</td>}
                      {cols.unitPrice && <td className="py-1.5 px-2 text-left accounting-num" dir="ltr">{toPersianDigits(addCommas(unitPrice))}</td>}
                      {cols.grossAmount && <td className="py-1.5 px-2 text-left accounting-num" dir="ltr">{toPersianDigits(addCommas(rowGross))}</td>}
                      {cols.discountPercent && <td className="py-1.5 px-1 text-center">{rowDiscPct > 0 ? `٪${toPersianDigits(rowDiscPct)}` : "-"}</td>}
                      {cols.discountAmount && <td className="py-1.5 px-2 text-left text-rose-700 accounting-num" dir="ltr">{rowDiscAmount > 0 ? toPersianDigits(addCommas(rowDiscAmount)) : "-"}</td>}
                      {cols.tax && <td className="py-1.5 px-2 text-left text-indigo-700 accounting-num" dir="ltr">{rowTax > 0 ? toPersianDigits(addCommas(rowTax)) : "۰"}</td>}
                      {cols.totalPrice && <td className="py-1.5 px-3 text-left font-black text-slate-950 accounting-num" dir="ltr">{toPersianDigits(addCommas(rowFinal))}</td>}
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals row on last page */}
              {isLastPage && (
                <tfoot>
                  <tr className={`${tableFootClass} text-[10.5px]`}>
                    <td colSpan={leadingColSpan} className="py-2 px-3 font-bold">جمع کل اقلام ({toPersianDigits(allItems.length)} قلم)</td>
                    {cols.quantity && <td className="py-2 px-2 text-center font-black">{toPersianDigits(totalQuantity)}</td>}
                    {cols.unit && <td className="py-2 px-1.5 text-center text-slate-400">---</td>}
                    {cols.unitPrice && <td className="py-2 px-2 text-center text-slate-400">---</td>}
                    {cols.grossAmount && <td className="py-2 px-2 text-left accounting-num font-black" dir="ltr">{toPersianDigits(addCommas(rawItemsTotal))}</td>}
                    {cols.discountPercent && <td className="py-2 px-1 text-center text-slate-400">---</td>}
                    {cols.discountAmount && <td className="py-2 px-2 text-left text-rose-700 accounting-num font-black" dir="ltr">{totalRowDiscounts > 0 ? toPersianDigits(addCommas(totalRowDiscounts)) : "۰"}</td>}
                    {cols.tax && <td className="py-2 px-2 text-left text-indigo-700 accounting-num font-black" dir="ltr">{totalTax > 0 ? toPersianDigits(addCommas(totalTax)) : "۰"}</td>}
                    {cols.totalPrice && <td className="py-2 px-3 text-left font-black text-slate-950 accounting-num" dir="ltr">{toPersianDigits(addCommas(finalTotal))}</td>}
                  </tr>
                </tfoot>
              )}
            </table>

            {/* Continuation indicator */}
            {!isLastPage && (
              <div className="flex justify-between items-center py-2 px-3 mt-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 print-avoid-break">
                <span>ادامه اقلام در صفحه بعدی ({toPersianDigits(chunk.pageNumber + 1)}) ...</span>
                <span>صفحه {toPersianDigits(chunk.pageNumber)} از {toPersianDigits(totalPages)}</span>
              </div>
            )}

            {/* Summary on Last Page */}
            {isLastPage && (
              <div className="pt-3 print-avoid-break">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-3">
                  <div className="flex-1 w-full space-y-2">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <span className="font-bold text-slate-700 ml-1">مبلغ به حروف:</span>
                      <span className="font-black text-slate-900">{numToPersianWords(Math.round(finalTotal))} {currencyLabel} تمام</span>
                    </div>
                    {printSettings.showNotes && (data.description || data.note) && (
                      <div className="p-2.5 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-600 block mb-0.5">توضیحات:</span>
                        <span>{data.description || data.note}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full md:w-80 shrink-0 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs bg-slate-50/50">
                    <div className="flex justify-between">
                      <span className="text-slate-500">جمع ناخالص:</span>
                      <span className="font-bold accounting-num" dir="ltr">{toPersianDigits(addCommas(rawItemsTotal))} {currencyLabel}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>تخفیف:</span>
                        <span className="font-bold accounting-num" dir="ltr">- {toPersianDigits(addCommas(totalDiscount))} {currencyLabel}</span>
                      </div>
                    )}
                    {totalTax > 0 && (
                      <div className="flex justify-between text-indigo-700">
                        <span>مالیات و ارزش افزوده:</span>
                        <span className="font-bold accounting-num" dir="ltr">+ {toPersianDigits(addCommas(totalTax))} {currencyLabel}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-sm pt-1.5 border-t border-slate-300 text-slate-900">
                      <span>مبلغ قابل پرداخت:</span>
                      <span className="accounting-num text-base text-indigo-900" dir="ltr">{toPersianDigits(addCommas(finalTotal))} {currencyLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                {printSettings.showSignatures && (
                  <div className="grid grid-cols-2 gap-8 text-center text-xs font-bold pt-4 mb-2 print-avoid-break">
                    <div>
                      <span className="text-slate-600">امضای فروشنده</span>
                      <div className="w-1/2 mx-auto border-b border-dashed border-slate-300 mt-8"></div>
                    </div>
                    <div>
                      <span className="text-slate-600">امضای خریدار</span>
                      <div className="w-1/2 mx-auto border-b border-dashed border-slate-300 mt-8"></div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                  <div>{storeSettings.print_footer_note || "با تشکر از خرید شما"}</div>
                  <div>صفحه {toPersianDigits(totalPages)} از {toPersianDigits(totalPages)}</div>
                </div>
              </div>
            )}

            {/* Preview Sheet Divider */}
            {!isLastPage && (
              <div className="print:hidden my-6 flex items-center justify-center gap-3">
                <div className="h-px bg-slate-300 flex-1 border-t border-dashed border-slate-300"></div>
                <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold border border-slate-200">
                  پایان برگه {toPersianDigits(chunk.pageNumber)} - شروع برگه {toPersianDigits(chunk.pageNumber + 1)}
                </span>
                <div className="h-px bg-slate-300 flex-1 border-t border-dashed border-slate-300"></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
