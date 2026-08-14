import React from "react";
import { formatDateDisplay, toPersianDigits } from "../../utils/format";
import { User, Box, Building2, MapPin, Phone } from "lucide-react";

interface WarehousePrintTemplateProps {
  data: any;
  storeSettings: any;
  warehouses: any[];
  persons: any[];
  products?: any[];
}

export default function WarehousePrintTemplate({
  data,
  storeSettings,
  warehouses,
  persons,
  products = [],
}: WarehousePrintTemplateProps) {
  const isReceipt = data.type === "warehouse_receipt";
  const title = isReceipt
    ? "رسید ورود کالا به انبار"
    : "حواله خروج کالا از انبار";
  const relatedPerson = persons.find(
    (p) => p.id === data.customerId,
  );

  const warehouse = warehouses.find(
    (w) =>
      w.id?.toString() === data.warehouseId?.toString() ||
      w.id?.toString() === data.items?.[0]?.warehouseId?.toString(),
  );

  return (
    <div className="w-full text-sm text-slate-800 font-sans p-4 print:p-0">
      {/* Header Grid */}
      <div className="grid grid-cols-3 gap-4 border-2 border-slate-800 p-4 rounded-xl mb-4 relative print:border-slate-500">
        <div className="flex flex-col gap-2 justify-center">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-slate-500 w-16">تاریخ:</span>
            <span>
              {formatDateDisplay(data.jalaliDate || data.date)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-slate-500 w-16">شماره سند:</span>
            <span className="font-bold">
              {toPersianDigits(data.invoiceNumber || data.id)}
            </span>
          </div>
          {data.sellerInvoiceNumber && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-500 w-16">عطف:</span>
              <span className="font-bold">
                {toPersianDigits(data.sellerInvoiceNumber)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center text-center">
          {storeSettings.logoUrl && (
            <img
              src={storeSettings.logoUrl}
              alt="Logo"
              className="w-12 h-12 object-contain mb-2 grayscale"
            />
          )}
          <h1 className="text-lg font-black tracking-tight mb-1">
            {storeSettings.storeName || "عنوان مجموعه"}
          </h1>
          <h2 className="text-base font-bold bg-slate-200 print:bg-slate-200 px-4 py-1 rounded-full whitespace-nowrap">
            {title}
          </h2>
          {data.status === "voided" && (
             <div className="mt-2 text-sm font-black text-rose-600 border-2 border-rose-600 px-3 py-0.5 rounded-md transform -rotate-12 absolute z-10 opacity-70 print:border-rose-500 print:text-rose-500 text-center" style={{ top: "30%" }}>
                سند ابطال شده
             </div>
          )}
        </div>

        <div className="flex flex-col gap-2 justify-center text-left items-end text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span>{storeSettings.phone || "---"}</span>
            <Phone className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex gap-1.5 text-right w-full justify-end max-w-[200px]">
            <span className="truncate" title={storeSettings.address}>
              {storeSettings.address || "---"}
            </span>
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Person Info */}
      <div className="mb-4">
        <div className="border border-slate-300 rounded-lg p-3 text-xs leading-relaxed print:border-slate-400">
          <div className="flex items-center gap-1 text-slate-500 font-bold mb-2">
            <User className="w-4 h-4" />
            <span>
              {isReceipt ? "تحویل دهنده / تامین کننده" : "تحویل گیرنده / مشتری"}
            </span>
          </div>
          <div className="font-bold text-sm mb-1">
            {relatedPerson?.alias || relatedPerson?.name || data.customerName || "نامشخص"}
          </div>
          {relatedPerson && (
            <div className="grid grid-cols-2 gap-2 mt-2 text-slate-600">
              {relatedPerson.phone && (
                <div>
                  تلفن:{" "}
                  <span dir="ltr">{toPersianDigits(relatedPerson.phone)}</span>
                </div>
              )}
              {relatedPerson.nationalId && (
                <div>
                  کد ملی/اقتصادی: {toPersianDigits(relatedPerson.nationalId)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="border-2 border-slate-800 rounded-lg overflow-hidden print:border-slate-500 mb-6">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-100 print:bg-slate-200 text-slate-900 font-black border-b-2 border-slate-800 print:border-slate-500">
            <tr>
              <th className="py-2.5 px-2 w-10 text-center border-l border-slate-300">
                ردیف
              </th>
              <th className="py-2.5 px-2 w-24 border-l border-slate-300">
                کد کالا
              </th>
              <th className="py-2.5 px-2 w-auto border-l border-slate-300">
                شرح کالا
              </th>
              <th className="py-2.5 px-2 w-24 text-center border-l border-slate-300">
                مقدار / تعداد
              </th>
              <th className="py-2.5 px-2 w-24 text-center">واحد اندازه گیری</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-bold text-slate-800">
            {data.items
              ?.filter(
                (it: any) => it.productName || it.productId || it.quantity > 0,
              )
              .map((item: any, idx: number) => {
                const product = products.find((p) => p.id?.toString() === item.productId?.toString());
                const productCode = product?.code || "-";
                return (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 print:hover:bg-transparent"
                  >
                    <td className="py-2 px-2 text-center border-l border-slate-300 text-slate-500">
                      {toPersianDigits(idx + 1)}
                    </td>
                    <td className="py-2 px-2 border-l border-slate-300 font-bold text-slate-600">
                      {toPersianDigits(productCode || "-")}
                    </td>
                    <td className="py-2 px-2 border-l border-slate-300">
                      {item.productName || "کالا"}
                    </td>
                    <td
                      className="py-2 px-2 text-center border-l border-slate-300 font-bold text-sm"
                      dir="rtl"
                    >
                      {toPersianDigits(item.quantity || 1)}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-600">
                      {item.selectedUnit || item.unit || "-"}
                    </td>
                  </tr>
                );
              })}
            {/* Empty rows to maintain table height if few items */}
            {Array.from({
              length: Math.max(0, 5 - (data.items?.length || 0)),
            }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-9">
                <td className="border-l border-slate-300"></td>
                <td className="border-l border-slate-300"></td>
                <td className="border-l border-slate-300"></td>
                <td className="border-l border-slate-300"></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Warehouse Info */}
      <div className="mb-6">
        <div className="border border-slate-300 rounded-lg p-3 text-xs leading-relaxed print:border-slate-400">
          <div className="flex items-center gap-1 text-slate-500 font-bold mb-2">
            <Building2 className="w-4 h-4" />
            <span>اطلاعات انبار و سند</span>
          </div>
          <div className="grid grid-cols-2 gap-2 font-bold text-slate-700">
            <div>
              انبار مرتبط:{" "}
              <span className="text-slate-900">
                {warehouse?.name || "نامشخص"}
              </span>
            </div>
            <div>
              کاربر ثبت‌کننده:{" "}
              <span className="text-slate-900">
                {data.createdBy || "سیستم"}
              </span>
            </div>
          </div>
          {data.description && (
            <div className="mt-2 text-slate-600">
              توضیحات: {data.description}
            </div>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-8 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-700">
        <div className="flex flex-col items-center">
          <div className="w-3/4 border-b border-dashed border-slate-400 mb-2 pb-12"></div>
          <span>مهر و امضای تحویل دهنده</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-3/4 border-b border-dashed border-slate-400 mb-2 pb-12"></div>
          <span>تایید کننده (انباردار)</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-3/4 border-b border-dashed border-slate-400 mb-2 pb-12"></div>
          <span>مهر و امضای تحویل گیرنده</span>
        </div>
      </div>

      {storeSettings.print_footer_note && (
        <div className="mt-8 text-[10px] text-center text-slate-500 border-t border-slate-200 pt-3 print:border-slate-300">
          {storeSettings.print_footer_note}
        </div>
      )}
    </div>
  );
}
