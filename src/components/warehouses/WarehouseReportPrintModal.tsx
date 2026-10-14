import React from "react";
import { Printer, X, Download, Building, Box, User, Calendar } from "lucide-react";
import { toPersianDigits, numToPersianWords } from "../../utils/format";

interface WarehouseReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: any;
  items: any[];
  storeSettings: any;
  formatNumber: (num: any) => string;
  formatCurrency: (num: any) => string;
  dateRangeStr?: string;
  totalValuation: number;
  totalPhysicalQty: number;
  criticalCount: number;
}

export default function WarehouseReportPrintModal({
  isOpen,
  onClose,
  warehouse,
  items,
  storeSettings,
  formatNumber,
  formatCurrency,
  dateRangeStr,
  totalValuation,
  totalPhysicalQty,
  criticalCount,
}: WarehouseReportPrintModalProps) {
  if (!isOpen || !warehouse) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = storeSettings?.currency || "تومان";
  const currentDateStr = new Date().toLocaleDateString("fa-IR");

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Container */}
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden font-sans text-right" dir="rtl">
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-slate-800 text-sm sm:text-base">
              پیش‌نمایش و چاپ گزارش رسمی انبار: {warehouse.name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ رسمی (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white print:p-0 print:m-0 print:overflow-visible">
          {/* Print CSS injected */}
          <style dangerouslySetInnerHTML={{
            __html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                .print-report-container, .print-report-container * {
                  visibility: visible;
                }
                .print-report-container {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 10mm !important;
                  background: white !important;
                  color: black !important;
                }
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }
              }
            `
          }} />

          <div className="print-report-container max-w-4xl mx-auto space-y-6">
            {/* Report Header */}
            <div className="border-b-2 border-slate-800 pb-4">
              <div className="flex items-start justify-between">
                {/* Right: Company Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {storeSettings?.logoUrl && (
                      <img
                        src={storeSettings.logoUrl}
                        alt="Logo"
                        className="w-10 h-10 object-contain rounded"
                      />
                    )}
                    <div>
                      <h1 className="text-xl font-black text-slate-900">
                        {storeSettings?.storeName || "مجموعه تجاری"}
                      </h1>
                      <p className="text-xs text-slate-600 font-bold">
                        سامانه مدیریت جامع انبارداری و زنجیره تامین
                      </p>
                    </div>
                  </div>
                </div>

                {/* Center: Title */}
                <div className="text-center pt-1">
                  <h2 className="text-lg font-black text-slate-900 border-2 border-slate-900 px-4 py-1.5 rounded-lg inline-block">
                    گزارش تراز و ارزیابی ریالی انبار
                  </h2>
                  {dateRangeStr && (
                    <p className="text-[11px] text-slate-600 font-bold mt-1">
                      بازه تاریخی: {dateRangeStr}
                    </p>
                  )}
                </div>

                {/* Left: Metadata */}
                <div className="text-left text-xs space-y-1 font-bold text-slate-700">
                  <div>
                    <span>تاریخ گزارش: </span>
                    <span className="font-mono">{toPersianDigits(currentDateStr)}</span>
                  </div>
                  <div>
                    <span>واحد پول: </span>
                    <span>{currency}</span>
                  </div>
                  <div>
                    <span>شناسه انبار: </span>
                    <span className="font-mono">{toPersianDigits(warehouse.id)}</span>
                  </div>
                </div>
              </div>

              {/* Warehouse Details Strip */}
              <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-3 gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-500 font-bold">نام انبار: </span>
                  <span className="font-black text-slate-900">{warehouse.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">مسئول انبار: </span>
                  <span className="font-bold text-slate-800">{warehouse.manager || "تعیین نشده"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">موقعیت / آدرس: </span>
                  <span className="font-bold text-slate-800">{warehouse.location || "مرکزی"}</span>
                </div>
              </div>
            </div>

            {/* KPI Summary Block */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                <div className="text-[11px] text-slate-500 font-bold">تعداد اقلام فهرست</div>
                <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                  {toPersianDigits(items.length)}
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                <div className="text-[11px] text-slate-500 font-bold">مجموع موجودی فیزیکی</div>
                <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                  {toPersianDigits(formatNumber(totalPhysicalQty))}
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                <div className="text-[11px] text-slate-500 font-bold">اقلام زیر نقطه سفارش</div>
                <div className={`text-base font-black font-mono mt-0.5 ${criticalCount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                  {toPersianDigits(criticalCount)}
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-2.5 bg-indigo-50/60 border-indigo-200">
                <div className="text-[11px] text-indigo-700 font-bold">ارزش کل موجودی انبار</div>
                <div className="text-base font-black text-indigo-950 font-mono mt-0.5">
                  {toPersianDigits(formatCurrency(totalValuation))} {currency}
                </div>
              </div>
            </div>

            {/* Table of Items */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-black text-slate-800">
                    <th className="py-2 px-2.5 w-10 text-center">ردیف</th>
                    <th className="py-2 px-2.5 w-24">کد کالا</th>
                    <th className="py-2 px-3">نام و مشخصات کالا</th>
                    <th className="py-2 px-2 text-center w-16">واحد</th>
                    <th className="py-2 px-2.5 text-center w-20">موجودی فیزیکی</th>
                    <th className="py-2 px-2.5 text-center w-20">رزرو شده</th>
                    <th className="py-2 px-2.5 text-center w-20">موجودی آزاد</th>
                    <th className="py-2 px-3 text-left w-24">فی خرید ({currency})</th>
                    <th className="py-2 px-3 text-left w-28">ارزش ریالی ({currency})</th>
                    <th className="py-2 px-2 text-center w-20">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((row, idx) => (
                    <tr key={row.productId || idx} className={idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"}>
                      <td className="py-1.5 px-2.5 text-center text-slate-500 font-mono">
                        {toPersianDigits(idx + 1)}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono text-slate-700">
                        {row.code ? toPersianDigits(row.code) : "-"}
                      </td>
                      <td className="py-1.5 px-3 font-bold text-slate-900">
                        <span>{row.name}</span>
                        {row.categoryName && (
                          <span className="text-[10px] text-slate-500 font-normal mr-1.5">
                            ({row.categoryName})
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center text-slate-600">
                        {row.unit || "عدد"}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-900">
                        {toPersianDigits(formatNumber(row.physicalStock))}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono text-slate-500">
                        {row.reservedStock > 0 ? toPersianDigits(formatNumber(row.reservedStock)) : "۰"}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-black text-indigo-700">
                        {toPersianDigits(formatNumber(row.availableStock))}
                      </td>
                      <td className="py-1.5 px-3 text-left font-mono text-slate-700">
                        {toPersianDigits(formatCurrency(row.purchasePrice))}
                      </td>
                      <td className="py-1.5 px-3 text-left font-mono font-black text-slate-950">
                        {toPersianDigits(formatCurrency(row.totalValue))}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {row.physicalStock <= 0 ? (
                          <span className="text-rose-700 font-bold text-[10px]">اتمام موجودی</span>
                        ) : row.isBelowMin ? (
                          <span className="text-amber-700 font-bold text-[10px]">کسری سفارش</span>
                        ) : (
                          <span className="text-emerald-700 font-bold text-[10px]">عادی</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-bold">
                        هیچ کالایی در این انبار یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      جمع کل مقادیر و ارزش دارایی انبار:
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-mono font-black">
                      {toPersianDigits(formatNumber(totalPhysicalQty))}
                    </td>
                    <td colSpan={3}></td>
                    <td className="py-2.5 px-3 text-left font-mono text-indigo-900 font-black">
                      {toPersianDigits(formatCurrency(totalValuation))} {currency}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Amount in Words */}
            {totalValuation > 0 && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                <span className="font-bold">ارزش کل موجودی به حروف: </span>
                <span className="font-black text-slate-900">{numToPersianWords(Math.round(totalValuation))} {currency}</span>
              </div>
            )}

            {/* Official Signatures Box */}
            <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-12">
                <div className="font-bold text-slate-700">تهیه و تایید انباردار:</div>
                <div className="border-t border-slate-400 pt-2 text-slate-650 font-bold">
                  {warehouse.manager || "امضاء و تاریخ"}
                </div>
              </div>
              <div className="space-y-12">
                <div className="font-bold text-slate-700">تایید مدیر زنجیره تامین و لجستیک:</div>
                <div className="border-t border-slate-400 pt-2 text-slate-650 font-bold">
                  امضاء و مهر
                </div>
              </div>
              <div className="space-y-12">
                <div className="font-bold text-slate-700">تایید مدیریت مالی و حسابداری:</div>
                <div className="border-t border-slate-400 pt-2 text-slate-650 font-bold">
                  امضاء و مهر مالی
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
