import React from "react";
import { formatDateDisplay, toPersianDigits, addCommas } from "../../../utils/format";
import { InvoicePrintTemplateProps } from "./InvoicePrintTypes";

export default function OfficialInvoiceTemplate({
  data,
  storeSettings,
  persons,
  printSettings = { showStoreLogo: true, showNotes: true }
}: InvoicePrintTemplateProps) {
  const isSale = data.type === "sale" || data.type === "sale_return";
  const title = isSale ? "صورتحساب فروش کالا و خدمات" : "صورتحساب خرید کالا و خدمات";
      
  const relatedPerson = persons.find(p => p.id === data.customerId);
  const sumTotal = data.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0;
  const totalDiscount = sumTotal - (data.totalAmount || 0);

  return (
    <div className="p-4 bg-white min-h-[297mm] text-black font-sans text-sm border-2 border-black m-4" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
        <div className="flex-1 text-right">
           <div className="mb-1">شماره اقتصادی: {toPersianDigits(storeSettings.taxId || "---")}</div>
           <div className="mb-1">شناسه ملی: {toPersianDigits(storeSettings.registrationNumber || "---")}</div>
        </div>
        <div className="flex-1 text-center font-black text-lg">
           {title}
        </div>
        <div className="flex-1 text-left">
           <div className="mb-1">شماره سریال: {toPersianDigits(data.invoiceNumber)}</div>
           <div className="mb-1">تاریخ: {formatDateDisplay(data.date || data.createdAt)}</div>
        </div>
      </div>

      {/* Seller Info */}
      <div className="border-b-2 border-black pb-2 mb-2">
        <div className="font-bold mb-1 bg-gray-200 px-2">مشخصات فروشنده</div>
        <div className="grid grid-cols-4 gap-2 px-2 text-xs">
           <div className="col-span-2">نام شخص حقیقی/حقوقی: <span className="font-bold">{isSale ? storeSettings.storeName : relatedPerson?.name}</span></div>
           <div>شماره اقتصادی: <span className="font-bold">{toPersianDigits(isSale ? storeSettings.taxId : relatedPerson?.taxId || "---")}</span></div>
           <div>شناسه ملی: <span className="font-bold">{toPersianDigits(isSale ? storeSettings.registrationNumber : relatedPerson?.nationalId || "---")}</span></div>
           <div className="col-span-3">نشانی کامل: <span className="font-bold">{isSale ? storeSettings.address : relatedPerson?.address}</span></div>
           <div>کد پستی: <span className="font-bold">{toPersianDigits(isSale ? storeSettings.postalCode || "---" : relatedPerson?.postalCode || "---")}</span></div>
           <div className="col-span-4">تلفن: <span className="font-bold">{toPersianDigits(isSale ? storeSettings.phone : relatedPerson?.mobile || relatedPerson?.phone)}</span></div>
        </div>
      </div>

      {/* Buyer Info */}
      <div className="border-b-2 border-black pb-2 mb-4">
        <div className="font-bold mb-1 bg-gray-200 px-2">مشخصات خریدار</div>
        <div className="grid grid-cols-4 gap-2 px-2 text-xs">
           <div className="col-span-2">نام شخص حقیقی/حقوقی: <span className="font-bold">{isSale ? relatedPerson?.name : storeSettings.storeName}</span></div>
           <div>شماره اقتصادی: <span className="font-bold">{toPersianDigits(isSale ? relatedPerson?.taxId || "---" : storeSettings.taxId || "---")}</span></div>
           <div>شناسه ملی: <span className="font-bold">{toPersianDigits(isSale ? relatedPerson?.nationalId || "---" : storeSettings.registrationNumber || "---")}</span></div>
           <div className="col-span-3">نشانی کامل: <span className="font-bold">{isSale ? relatedPerson?.address : storeSettings.address}</span></div>
           <div>کد پستی: <span className="font-bold">{toPersianDigits(isSale ? relatedPerson?.postalCode || "---" : storeSettings.postalCode || "---")}</span></div>
           <div className="col-span-4">تلفن: <span className="font-bold">{toPersianDigits(isSale ? relatedPerson?.mobile || relatedPerson?.phone : storeSettings.phone)}</span></div>
        </div>
      </div>

      {/* Items */}
      <table className="w-full text-center border-collapse border border-black mb-4 text-xs">
        <thead className="bg-gray-200">
          <tr>
            <th className="border border-black p-1 w-8">ردیف</th>
            <th className="border border-black p-1">کد کالا</th>
            <th className="border border-black p-1">شرح کالا یا خدمات</th>
            <th className="border border-black p-1 w-12">تعداد</th>
            <th className="border border-black p-1 w-12">واحد</th>
            <th className="border border-black p-1">مبلغ واحد ({storeSettings.currency})</th>
            <th className="border border-black p-1">مبلغ کل ({storeSettings.currency})</th>
            <th className="border border-black p-1">تخفیف</th>
            <th className="border border-black p-1">مبلغ کل پس از تخفیف</th>
            <th className="border border-black p-1">جمع مالیات و عوارض</th>
            <th className="border border-black p-1">جمع مبلغ کل بـا احتساب مالیات و عوارض</th>
          </tr>
        </thead>
        <tbody>
          {data.items?.map((item: any, idx: number) => {
             const rowTotal = item.quantity * item.unitPrice;
             const rowTotalAfterDiscount = rowTotal - (item.discount || 0); // Need actual discount logic per row
             // Official format expects precise tax per row. Here we approximate if not available.
             const rowTax = 0; // if you have per-row tax, calculate it here
             return (
               <tr key={idx}>
                 <td className="border border-black p-1">{toPersianDigits(idx + 1)}</td>
                 <td className="border border-black p-1">{toPersianDigits(item.productId || "")}</td>
                 <td className="border border-black p-1 text-right">{item.productName}</td>
                 <td className="border border-black p-1">{toPersianDigits(item.quantity)}</td>
                 <td className="border border-black p-1">{item.selectedUnit || item.unit || ""}</td>
                 <td className="border border-black p-1">{toPersianDigits(addCommas(item.unitPrice))}</td>
                 <td className="border border-black p-1">{toPersianDigits(addCommas(rowTotal))}</td>
                 <td className="border border-black p-1">{toPersianDigits(addCommas(item.discountPercent || 0))} %</td>
                 <td className="border border-black p-1">{toPersianDigits(addCommas(item.totalPrice))}</td>
                 <td className="border border-black p-1">{toPersianDigits(addCommas(rowTax))}</td>
                 <td className="border border-black p-1">{toPersianDigits(addCommas(item.totalPrice + rowTax))}</td>
               </tr>
             )
          })}
        </tbody>
        <tfoot className="font-bold bg-gray-100">
          <tr>
            <td colSpan={6} className="border border-black p-1 text-left">جمع کل</td>
            <td className="border border-black p-1">{toPersianDigits(addCommas(sumTotal))}</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1">{toPersianDigits(addCommas(sumTotal - totalDiscount))}</td>
            <td className="border border-black p-1">{toPersianDigits(addCommas(0))}</td>
            <td className="border border-black p-1">{toPersianDigits(addCommas(data.totalAmount || 0))}</td>
          </tr>
        </tfoot>
      </table>

      <div className="grid grid-cols-2 gap-4 h-32">
        <div className="border border-black p-2 flex flex-col justify-between">
           <div className="font-bold text-xs">مهر و امضای فروشنده</div>
        </div>
        <div className="border border-black p-2 flex flex-col justify-between">
           <div className="font-bold text-xs">مهر و امضای خریدار</div>
        </div>
      </div>
    </div>
  );
}
