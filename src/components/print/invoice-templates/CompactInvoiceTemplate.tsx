import React from "react";
import { formatDateDisplay, formatInvoiceDate, toPersianDigits, addCommas } from "../../../utils/format";
import { InvoicePrintTemplateProps } from "./InvoicePrintTypes";

export default function CompactInvoiceTemplate({
  data,
  storeSettings,
  persons,
  printSettings = { showStoreLogo: true, showNotes: true }
}: InvoicePrintTemplateProps) {
  const isSale = data.type === "sale" || data.type === "sale_return";
  const isVoided = data.status === "voided" || data.isVoided === true;
  const isDraft = data.status === "draft" || data.isDraft === true;
  let rawTitle = isSale ? "فاکتور فروش" : "فاکتور خرید";
  const title = isVoided
    ? `${rawTitle} (ابطال شده)`
    : isDraft
      ? `${rawTitle} (پیش‌نویس)`
      : rawTitle;
  const relatedPerson = persons.find(p => p.id?.toString() === data.customerId?.toString());
  const sumTotal = data.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0;
  const totalDiscount = sumTotal - (data.totalAmount || 0);

  const getInvoiceDateOnly = (d: any) => {
    return formatInvoiceDate(d, storeSettings?.calendarType, { showTime: false });
  };

  return (
    <div
      className="compact-invoice-sheet p-4 bg-white text-gray-900 font-sans text-sm border-2 border-dashed border-gray-400 m-4 print:m-0 mx-auto print:mx-auto max-w-full print:w-full rounded-xl print:rounded-none"
      dir="rtl"
      style={{ fontFamily: "'IRANYekanXFaNum', 'Vazirmatn', -apple-system, sans-serif" }}
    >
      <style>{`
        .compact-invoice-sheet, .compact-invoice-sheet * {
          font-family: 'IRANYekanXFaNum', 'Vazirmatn', -apple-system, sans-serif !important;
        }
        @media print {
          @page { size: auto; margin: 6mm; }
          html, body { background: white !important; margin: 0 auto !important; width: 100% !important; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
      <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-2">
         <div>
            <div className="font-bold text-lg">{storeSettings.storeName}</div>
            <div className="text-xs text-gray-600">{toPersianDigits(storeSettings.phone || "")}</div>
         </div>
         <div className="text-xl font-black">{title}</div>
         <div className="text-left text-xs space-y-1">
            <div>شماره: <span className="font-bold">{toPersianDigits(data.invoiceNumber)}</span></div>
            <div>تاریخ: <span className="font-bold">{getInvoiceDateOnly(data.date || data.jalaliDate || data.issueDate || data.invoiceDate || data.createdAt)}</span></div>
         </div>
      </div>
      
      <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-2 text-xs">
         <div>
            مشتری: <span className="font-bold">{relatedPerson?.name || "عمومی"}</span>
         </div>
         <div>
            تلفن: <span className="font-bold">{toPersianDigits(relatedPerson?.mobile || relatedPerson?.phone || "-")}</span>
         </div>
         <div>
            آدرس: <span className="font-bold">{relatedPerson?.address || "-"}</span>
         </div>
      </div>

      <table className="w-full text-center border-collapse text-xs mb-2">
         <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
               <th className="py-1">ردیف</th>
               <th className="py-1">شرح کالا</th>
               <th className="py-1">مقدار</th>
               <th className="py-1">فی ({storeSettings.currency})</th>
               <th className="py-1">مبلغ کل ({storeSettings.currency})</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-gray-100">
            {data.items?.map((item: any, idx: number) => (
               <tr key={idx}>
                  <td className="py-1">{toPersianDigits(idx + 1)}</td>
                  <td className="py-1 text-right pr-2">{item.productName}</td>
                  <td className="py-1">{toPersianDigits(item.quantity)} {item.selectedUnit || item.unit || ""}</td>
                  <td className="py-1">{toPersianDigits(addCommas(item.unitPrice))}</td>
                  <td className="py-1 font-bold">{toPersianDigits(addCommas(item.totalPrice))}</td>
               </tr>
            ))}
         </tbody>
      </table>

      <div className="flex justify-between items-start text-xs pt-2 border-t border-gray-300">
         <div className="flex-1">
            {printSettings.showNotes && data.description && (
               <div>توضیحات: <span className="font-bold">{data.description}</span></div>
            )}
         </div>
         <div className="w-48 space-y-1">
            <div className="flex justify-between">
               <span>جمع:</span>
               <span>{toPersianDigits(addCommas(sumTotal))}</span>
            </div>
            {totalDiscount > 0 && (
               <div className="flex justify-between text-red-600">
                  <span>تخفیف:</span>
                  <span>{toPersianDigits(addCommas(totalDiscount))}</span>
               </div>
            )}
            <div className="flex justify-between font-black text-sm border-t border-gray-300 pt-1">
               <span>مبلغ نهایی:</span>
               <span>{toPersianDigits(addCommas(data.totalAmount || 0))}</span>
            </div>
         </div>
      </div>
    </div>
  );
}
