import React from "react";
import { formatDateDisplay, toPersianDigits, addCommas } from "../../../utils/format";
import { InvoicePrintTemplateProps } from "./InvoicePrintTypes";

export default function MinimalInvoiceTemplate({
  data,
  storeSettings,
  persons,
  printSettings = { showStoreLogo: true, showNotes: true }
}: InvoicePrintTemplateProps) {
  const isSale = data.type === "sale" || data.type === "sale_return";
  const isReturn = data.type === "sale_return" || data.type === "purchase_return";
  const isVoided = data.status === "voided" || data.isVoided === true;
  const isDraft = data.status === "draft" || data.isDraft === true;
  
  let rawTitle = isSale
    ? isReturn ? "فاکتور برگشت از فروش" : "فاکتور فروش"
    : isReturn ? "فاکتور برگشت از خرید" : "فاکتور خرید";

  const title = isVoided
    ? `${rawTitle} (ابطال شده)`
    : isDraft
      ? `${rawTitle} (پیش‌نویس)`
      : rawTitle;
      
  const relatedPerson = persons.find(p => p.id === data.customerId);
  const sumTotal = data.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0;
  const totalDiscount = sumTotal - (data.totalAmount || 0);

  return (
    <div className="p-8 bg-white min-h-[297mm] text-gray-800 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-gray-200 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-light text-gray-900 mb-2 tracking-tight">{storeSettings.storeName || "نام فروشگاه"}</h1>
          <div className="text-sm text-gray-500 max-w-sm leading-relaxed">
             {storeSettings.address}
          </div>
          <div className="text-sm text-gray-500 mt-1">
             تلفن: {toPersianDigits(storeSettings.phone || storeSettings.mobile || "-")}
          </div>
        </div>
        
        <div className="text-left">
          <div className="text-2xl font-light text-gray-400 mb-4">{title}</div>
          <div className="text-sm text-gray-600 mb-1">
            شماره: <span className="font-medium text-gray-900">{toPersianDigits(data.invoiceNumber)}</span>
          </div>
          <div className="text-sm text-gray-600">
            تاریخ: <span className="font-medium text-gray-900">{formatDateDisplay(data.date || data.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-10">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">صورتحساب برای</h3>
        <div className="text-lg font-medium text-gray-900">{relatedPerson?.name || "مشتری عمومی"}</div>
        <div className="text-sm text-gray-600 mt-1">{toPersianDigits(relatedPerson?.mobile || relatedPerson?.phone || "-")}</div>
        <div className="text-sm text-gray-500 mt-1 max-w-xs">{relatedPerson?.address || ""}</div>
      </div>

      {/* Items */}
      <div className="mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 text-right font-medium text-gray-500">شرح کالا</th>
              <th className="py-3 text-center font-medium text-gray-500 w-24">مقدار</th>
              <th className="py-3 text-center font-medium text-gray-500 w-32">فی ({storeSettings.currency})</th>
              <th className="py-3 text-left font-medium text-gray-500 w-32">مبلغ ({storeSettings.currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.items?.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="py-4 text-gray-900">{item.productName}</td>
                <td className="py-4 text-center text-gray-600">{toPersianDigits(item.quantity)} {item.selectedUnit || item.unit || ""}</td>
                <td className="py-4 text-center text-gray-600">{toPersianDigits(addCommas(item.unitPrice))}</td>
                <td className="py-4 text-left font-medium text-gray-900">{toPersianDigits(addCommas(item.totalPrice))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex justify-between items-start border-t border-gray-200 pt-6">
        <div className="max-w-sm">
           {printSettings.showNotes && data.description && (
             <div>
                <div className="text-xs font-semibold text-gray-400 mb-2">توضیحات</div>
                <div className="text-sm text-gray-600 leading-relaxed">{data.description}</div>
             </div>
           )}
        </div>
        
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
             <span>جمع جزء:</span>
             <span>{toPersianDigits(addCommas(sumTotal))}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-sm text-red-500">
               <span>تخفیف:</span>
               <span>{toPersianDigits(addCommas(totalDiscount))}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-medium text-gray-900 pt-3 border-t border-gray-100">
             <span>مبلغ کل:</span>
             <span>{toPersianDigits(addCommas(data.totalAmount || 0))} <span className="text-sm text-gray-500">{storeSettings.currency}</span></span>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      {storeSettings.print_footer_note && (
        <div className="mt-20 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
           {storeSettings.print_footer_note}
        </div>
      )}
    </div>
  );
}
