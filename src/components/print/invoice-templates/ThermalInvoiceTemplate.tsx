import React from "react";
import { formatDateDisplay, toPersianDigits, addCommas } from "../../../utils/format";
import { InvoicePrintTemplateProps } from "./InvoicePrintTypes";

export default function ThermalInvoiceTemplate({
  data,
  storeSettings,
  persons,
  printSettings = { showStoreLogo: true, showNotes: true }
}: InvoicePrintTemplateProps) {
  const isSale = data.type === "sale" || data.type === "sale_return";
  const isVoided = data.status === "voided" || data.isVoided === true;
  const isDraft = data.status === "draft" || data.isDraft === true;
  let rawTitle = isSale ? "رسید فروش" : "رسید خرید";
  const title = isVoided
    ? `${rawTitle} (ابطال شده)`
    : isDraft
      ? `${rawTitle} (پیش‌نویس)`
      : rawTitle;
  
  const relatedPerson = persons.find(p => p.id === data.customerId);
  const sumTotal = data.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0;
  const totalDiscount = sumTotal - (data.totalAmount || 0);

  return (
    <div className="p-2 bg-white text-black font-sans text-[11px] leading-tight w-full max-w-[80mm] mx-auto print:w-[80mm] print:m-0" dir="rtl">
      <div className="text-center font-bold text-sm mb-1">{storeSettings.storeName || "فروشگاه"}</div>
      {storeSettings.phone && <div className="text-center mb-1">تلفن: {toPersianDigits(storeSettings.phone)}</div>}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
         {storeSettings.address}
      </div>

      <div className="flex justify-between mb-1 font-bold">
         <span>{title}</span>
         <span>شماره: {toPersianDigits(data.invoiceNumber)}</span>
      </div>
      <div className="flex justify-between mb-1">
         <span>تاریخ: {formatDateDisplay(data.date || data.createdAt)}</span>
      </div>
      <div className="flex justify-between border-b border-dashed border-black pb-2 mb-2">
         <span>مشتری: {relatedPerson?.name || "عمومی"}</span>
      </div>

      <table className="w-full text-right mb-2">
         <thead>
           <tr className="border-b border-black">
             <th className="py-1">شرح</th>
             <th className="py-1 text-center">تعداد</th>
             <th className="py-1 text-left">مبلغ</th>
           </tr>
         </thead>
         <tbody>
           {data.items?.map((item: any, idx: number) => (
             <tr key={idx} className="border-b border-dashed border-gray-300">
               <td className="py-1 pr-1">{item.productName}</td>
               <td className="py-1 text-center">{toPersianDigits(item.quantity)} {item.selectedUnit || item.unit || ""}</td>
               <td className="py-1 text-left font-bold">{toPersianDigits(addCommas(item.totalPrice))}</td>
             </tr>
           ))}
         </tbody>
      </table>

      <div className="flex justify-between mb-1">
         <span>جمع فاکتور:</span>
         <span>{toPersianDigits(addCommas(sumTotal))}</span>
      </div>
      {totalDiscount > 0 && (
        <div className="flex justify-between mb-1">
           <span>تخفیف:</span>
           <span>{toPersianDigits(addCommas(totalDiscount))}</span>
        </div>
      )}
      
      <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1 mb-2">
         <span>قابل پرداخت:</span>
         <span>{toPersianDigits(addCommas(data.totalAmount || 0))}</span>
      </div>

      {printSettings.showNotes && data.description && (
        <div className="border-t border-dashed border-black pt-1 mb-2 text-justify">
          توضیحات: {data.description}
        </div>
      )}

      {storeSettings.print_footer_note && (
        <div className="text-center mt-4 border-t border-dashed border-black pt-2">
          {storeSettings.print_footer_note}
        </div>
      )}
      
      <div className="text-center mt-2 text-[10px]">
        نرم‌افزار حسابداری هوشمند
      </div>
    </div>
  );
}
