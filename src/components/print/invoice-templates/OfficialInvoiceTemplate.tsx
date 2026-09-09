import React from "react";
import { formatDateDisplay, toPersianDigits, addCommas, numToPersianWords } from "../../../utils/format";
import { InvoicePrintTemplateProps } from "./InvoicePrintTypes";

export default function OfficialInvoiceTemplate({
  data,
  storeSettings,
  persons,
  printSettings = { showStoreLogo: true, showNotes: true, paperSize: 'a4' }
}: InvoicePrintTemplateProps) {
  const isSale = data.type === "sale" || data.type === "sale_return";
  const isReturn = data.type === "sale_return" || data.type === "purchase_return";
  const isVoided = data.status === "voided" || data.isVoided === true;
  const isDraft = data.status === "draft" || data.isDraft === true;
  
  let rawTitle = isSale
    ? isReturn ? "صورتحساب برگشت از فروش کالا و خدمات" : "صورتحساب فروش کالا و خدمات"
    : isReturn ? "صورتحساب برگشت از خرید کالا و خدمات" : "صورتحساب خرید کالا و خدمات";

  const title = isVoided
    ? `${rawTitle} (ابطال شده)`
    : isDraft
      ? `${rawTitle} (پیش‌نویس)`
      : rawTitle;
      
  const relatedPerson = persons.find(p => p.id?.toString() === data.customerId?.toString());

  const getInvoiceDateOnly = (d: any) => {
    if (!d) return "-";
    const formatted = formatDateDisplay(d, storeSettings?.calendarType);
    if (formatted.includes(" ")) {
      return formatted.split(" ")[0];
    }
    return formatted;
  };

  // Calculations
  const totalQuantity = (data.items || []).reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);

  const rawItemsTotal = (data.items || []).reduce((sum: number, item: any) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

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

  const subtotalAfterRowDiscounts = Math.max(0, rawItemsTotal - totalRowDiscounts);

  const overallDiscountPercent = Number(data.overallDiscountPercent) || 0;
  const overallDiscountAmount = overallDiscountPercent > 0
    ? Math.round(subtotalAfterRowDiscounts * (overallDiscountPercent / 100))
    : (Number(data.discountAmount) || 0);

  const totalDiscount = totalRowDiscounts + overallDiscountAmount;
  const subtotalAfterAllDiscounts = Math.max(0, rawItemsTotal - totalDiscount);

  // Tax calculation
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

  const finalTotal = data.totalAmount !== undefined && Number(data.totalAmount) > 0
    ? Number(data.totalAmount)
    : (subtotalAfterAllDiscounts + totalTax);

  const currencyLabel = storeSettings.currency || "تومان";

  return (
    <div className="p-4 bg-white min-h-[297mm] text-black font-sans text-xs border border-black m-2 print:m-0" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-black pb-2 mb-2">
        <div className="flex-1 text-right text-[11px] space-y-0.5">
           <div>شماره اقتصادی: <span className="font-bold">{toPersianDigits(storeSettings.taxId || "---")}</span></div>
           <div>شناسه ملی: <span className="font-bold">{toPersianDigits(storeSettings.registrationNumber || "---")}</span></div>
           <div>کد پستی: <span className="font-bold">{toPersianDigits(storeSettings.postalCode || "---")}</span></div>
        </div>
        <div className="flex-1 text-center">
           <h1 className="font-black text-base">{storeSettings.storeName || "فروشگاه"}</h1>
           <h2 className="font-bold text-sm mt-0.5">{title}</h2>
        </div>
        <div className="flex-1 text-left text-[11px] space-y-0.5">
           <div>شماره سریال فاکتور: <span className="font-bold font-mono">{toPersianDigits(data.invoiceNumber || "---")}</span></div>
           <div>تاریخ صدور: <span className="font-bold">{getInvoiceDateOnly(data.date || data.createdAt)}</span></div>
           {data.dueDate && <div>تاریخ سررسید: <span className="font-bold">{getInvoiceDateOnly(data.dueDate)}</span></div>}
        </div>
      </div>

      {/* Seller Info */}
      <div className="border border-black mb-2">
        <div className="font-bold bg-gray-200 px-2 py-0.5 text-xs border-b border-black">مشخصات فروشنده</div>
        <div className="grid grid-cols-4 gap-1 p-2 text-[11px]">
           <div className="col-span-2">نام شخص حقیقی/حقوقی: <span className="font-bold">{isSale ? storeSettings.storeName : (relatedPerson?.name || "مشتری")}</span></div>
           <div>شماره اقتصادی: <span className="font-bold">{toPersianDigits(isSale ? storeSettings.taxId : (relatedPerson?.taxId || "---"))}</span></div>
           <div>شناسه/کد ملی: <span className="font-bold">{toPersianDigits(isSale ? storeSettings.registrationNumber : (relatedPerson?.nationalId || "---"))}</span></div>
           <div className="col-span-3">نشانی کامل: <span className="font-bold">{isSale ? storeSettings.address : (relatedPerson?.address || "---")}</span></div>
           <div>کد پستی: <span className="font-bold">{toPersianDigits(isSale ? storeSettings.postalCode || "---" : (relatedPerson?.postalCode || "---"))}</span></div>
           <div className="col-span-4">تلفن / همراه: <span className="font-bold" dir="ltr">{toPersianDigits(isSale ? storeSettings.phone || storeSettings.mobile : (relatedPerson?.mobile || relatedPerson?.phone || "---"))}</span></div>
        </div>
      </div>

      {/* Buyer Info */}
      <div className="border border-black mb-2">
        <div className="font-bold bg-gray-200 px-2 py-0.5 text-xs border-b border-black">مشخصات خریدار</div>
        <div className="grid grid-cols-4 gap-1 p-2 text-[11px]">
           <div className="col-span-2">نام شخص حقیقی/حقوقی: <span className="font-bold">{isSale ? (relatedPerson?.name || "مشتری عمومی") : storeSettings.storeName}</span></div>
           <div>شماره اقتصادی: <span className="font-bold">{toPersianDigits(isSale ? (relatedPerson?.taxId || "---") : storeSettings.taxId)}</span></div>
           <div>شناسه/کد ملی: <span className="font-bold">{toPersianDigits(isSale ? (relatedPerson?.nationalId || "---") : storeSettings.registrationNumber)}</span></div>
           <div className="col-span-3">نشانی کامل: <span className="font-bold">{isSale ? (relatedPerson?.address || "---") : storeSettings.address}</span></div>
           <div>کد پستی: <span className="font-bold">{toPersianDigits(isSale ? (relatedPerson?.postalCode || "---") : (storeSettings.postalCode || "---"))}</span></div>
           <div className="col-span-4">تلفن / همراه: <span className="font-bold" dir="ltr">{toPersianDigits(isSale ? (relatedPerson?.mobile || relatedPerson?.phone || "---") : (storeSettings.phone || storeSettings.mobile || "---"))}</span></div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-center border-collapse border border-black mb-2 text-[10.5px]">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-black p-1 w-8">ردیف</th>
            <th className="border border-black p-1 w-16">کد کالا</th>
            <th className="border border-black p-1">شرح کالا یا خدمات</th>
            <th className="border border-black p-1 w-12">تعداد</th>
            <th className="border border-black p-1 w-12">واحد</th>
            <th className="border border-black p-1 w-20">مبلغ واحد ({currencyLabel})</th>
            <th className="border border-black p-1 w-20">مبلغ ناخالص</th>
            <th className="border border-black p-1 w-12">تخفیف (%)</th>
            <th className="border border-black p-1 w-20">مبلغ تخفیف</th>
            <th className="border border-black p-1 w-20">مالیات و عوارض</th>
            <th className="border border-black p-1 w-24">مبلغ نهایی سطر</th>
          </tr>
        </thead>
        <tbody>
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
               <tr key={idx}>
                 <td className="border border-black p-1">{toPersianDigits(idx + 1)}</td>
                 <td className="border border-black p-1 font-mono">{toPersianDigits(item.productCode || item.productId || "-")}</td>
                 <td className="border border-black p-1 text-right font-bold">{item.productName}</td>
                 <td className="border border-black p-1 font-bold">{toPersianDigits(item.quantity)}</td>
                 <td className="border border-black p-1">{item.selectedUnit || item.unit || "عدد"}</td>
                 <td className="border border-black p-1 accounting-num" dir="ltr">{toPersianDigits(addCommas(unitPrice))}</td>
                 <td className="border border-black p-1 accounting-num" dir="ltr">{toPersianDigits(addCommas(rowGross))}</td>
                 <td className="border border-black p-1">{rowDiscPct > 0 ? `٪${toPersianDigits(rowDiscPct)}` : "-"}</td>
                 <td className="border border-black p-1 text-rose-700 accounting-num" dir="ltr">{rowDiscAmount > 0 ? toPersianDigits(addCommas(rowDiscAmount)) : "-"}</td>
                 <td className="border border-black p-1 text-indigo-700 accounting-num" dir="ltr">{rowTax > 0 ? toPersianDigits(addCommas(rowTax)) : "۰"}</td>
                 <td className="border border-black p-1 font-bold accounting-num" dir="ltr">{toPersianDigits(addCommas(rowFinal))}</td>
               </tr>
             );
          })}
        </tbody>
        <tfoot className="font-bold bg-gray-100">
          <tr>
            <td colSpan={3} className="border border-black p-1 text-right">جمع کل اقلام ردیف‌ها</td>
            <td className="border border-black p-1 font-black">{toPersianDigits(totalQuantity)}</td>
            <td className="border border-black p-1">---</td>
            <td className="border border-black p-1">---</td>
            <td className="border border-black p-1 accounting-num" dir="ltr">{toPersianDigits(addCommas(rawItemsTotal))}</td>
            <td className="border border-black p-1">---</td>
            <td className="border border-black p-1 text-rose-700 accounting-num" dir="ltr">{totalRowDiscounts > 0 ? toPersianDigits(addCommas(totalRowDiscounts)) : "۰"}</td>
            <td className="border border-black p-1 text-indigo-700 accounting-num" dir="ltr">{totalTax > 0 ? toPersianDigits(addCommas(totalTax)) : "۰"}</td>
            <td className="border border-black p-1 font-black accounting-num" dir="ltr">{toPersianDigits(addCommas(finalTotal))}</td>
          </tr>
        </tfoot>
      </table>

      {/* Financial Details Grid */}
      <div className="border border-black mb-3 text-[11px]">
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-black">
          <div className="p-2 space-y-1.5">
            <div>
              <span className="font-bold">مبلغ به حروف: </span>
              <span>{numToPersianWords(Math.round(finalTotal))} {currencyLabel} تمام</span>
            </div>
            <div>
              <span className="font-bold">روش تسویه: </span>
              <span>{data.paymentMethod === "cash" ? "نقدی" : data.paymentMethod === "credit" ? "نسیه" : "ترکیبی / واریز"}</span>
            </div>
            {data.description && (
              <div>
                <span className="font-bold">توضیحات: </span>
                <span>{data.description}</span>
              </div>
            )}
          </div>

          <div className="p-2 space-y-1 text-left bg-gray-50/50">
            <div className="flex justify-between">
              <span className="font-bold">مبلغ ناخالص:</span>
              <span className="accounting-num font-bold" dir="ltr">{toPersianDigits(addCommas(rawItemsTotal))} {currencyLabel}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-700">
                <span className="font-bold">مجموع تخفیف‌ها:</span>
                <span className="accounting-num font-bold" dir="ltr">- {toPersianDigits(addCommas(totalDiscount))} {currencyLabel}</span>
              </div>
            )}
            <div className="flex justify-between text-indigo-900">
              <span className="font-bold">مالیات و عوارض ارزش افزوده:</span>
              <span className="accounting-num font-bold" dir="ltr">{totalTax > 0 ? `+ ${toPersianDigits(addCommas(totalTax))}` : "معاف / ۰"} {currencyLabel}</span>
            </div>
            <div className="flex justify-between font-black text-sm pt-1 border-t border-black text-slate-900">
              <span>مبلغ نهایی قابل پرداخت:</span>
              <span className="accounting-num" dir="ltr">{toPersianDigits(addCommas(finalTotal))} {currencyLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-4 h-24 text-center">
        <div className="border border-black p-2 flex flex-col justify-between">
           <div className="font-bold text-xs">مهر و امضای فروشنده</div>
           <div className="border-b border-dashed border-gray-400 mx-8"></div>
        </div>
        <div className="border border-black p-2 flex flex-col justify-between">
           <div className="font-bold text-xs">مهر و امضای خریدار</div>
           <div className="border-b border-dashed border-gray-400 mx-8"></div>
        </div>
      </div>

      {storeSettings.print_footer_note && (
        <div className="text-center text-[10px] text-gray-500 mt-2">
          {storeSettings.print_footer_note}
        </div>
      )}
    </div>
  );
}
