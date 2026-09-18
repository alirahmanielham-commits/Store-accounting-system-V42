import React, { useState } from 'react';
import { Printer, X, FileText, CheckSquare, ClipboardList, Building2 } from 'lucide-react';
import { Stocktaking, StocktakingItem, Product, Warehouse, CompanySettings } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  session: Stocktaking;
  products: Product[];
  warehouse?: Warehouse;
  companySettings?: CompanySettings | null;
}

export default function StocktakingPrintModal({
  isOpen,
  onClose,
  session,
  products,
  warehouse,
  companySettings,
}: Props) {
  const [sheetType, setSheetType] = useState<'blind' | 'audit' | 'protocol'>('protocol');

  if (!isOpen) return null;

  const toPersian = (n: number | string | null | undefined) =>
    n === null || n === undefined
      ? '-'
      : n.toString().replace(/\d/g, x => ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'][parseInt(x)]);

  const companyName = companySettings?.companyName || companySettings?.storeName || 'شرکت بازرگانی';
  const whName = warehouse?.name || 'انبار اصلی';

  const items = session.items || [];
  const countedItems = items.filter(it => it.countedStock !== null);
  const surplusItems = countedItems.filter(it => Number(it.difference) > 0);
  const deficitItems = countedItems.filter(it => Number(it.difference) < 0);

  let totalSurplusVal = 0;
  let totalDeficitVal = 0;

  surplusItems.forEach(it => {
    const p = products.find(prod => String(prod.id) === String(it.productId));
    const cost = Number(it.unitPrice || p?.purchasePrice || p?.price || 0);
    totalSurplusVal += Number(it.difference) * cost;
  });

  deficitItems.forEach(it => {
    const p = products.find(prod => String(prod.id) === String(it.productId));
    const cost = Number(it.unitPrice || p?.purchasePrice || p?.price || 0);
    totalDeficitVal += Math.abs(Number(it.difference)) * cost;
  });

  const netDiscrepancy = totalSurplusVal - totalDeficitVal;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Toolbar (hidden on print) */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">نوع گزارش چاپی:</span>
            <div className="flex bg-slate-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSheetType('blind')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sheetType === 'blind' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                کاربرگ شمارش (سفید)
              </button>
              <button
                type="button"
                onClick={() => setSheetType('audit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sheetType === 'audit' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                کاربرگ ممیزی و تطبیق
              </button>
              <button
                type="button"
                onClick={() => setSheetType('protocol')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sheetType === 'protocol' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                صورت‌جلسه رسمی و ریالی
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" /> چاپ (Print)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="p-8 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible text-slate-800">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .printable-area, .printable-area * { visibility: visible; }
              .printable-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; font-size: 11pt; }
            }
          `}</style>

          <div className="printable-area max-w-3xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black text-slate-900">{companyName}</h1>
                <h2 className="text-sm font-bold text-slate-600 mt-1">
                  {sheetType === 'blind' && 'کاربرگ فیزیکی شمارش انبار (تگ شمارش سفید)'}
                  {sheetType === 'audit' && 'کاربرگ ممیزی و کنترل مغایرت‌های انبارگردانی'}
                  {sheetType === 'protocol' && 'صورت‌جلسه نهایی و تعدیل ریالی انبارگردانی'}
                </h2>
              </div>
              <div className="text-left text-xs space-y-1 font-mono text-slate-600">
                <div>شماره جلسه: <span className="font-bold text-slate-900 font-mono">{toPersian(session.id)}</span></div>
                <div>تاریخ: <span className="font-bold text-slate-900">{toPersian(session.date)}</span></div>
                <div>انبار: <span className="font-bold text-slate-900">{whName}</span></div>
                {session.appliedDate && <div>تاریخ اعمال: <span className="font-bold text-slate-900">{toPersian(session.appliedDate)}</span></div>}
              </div>
            </div>

            {/* Extra Protocol Stats for mode === 'protocol' */}
            {sheetType === 'protocol' && (
              <div className="grid grid-cols-4 gap-3 text-xs border border-slate-200 bg-slate-50/70 p-3 rounded-lg">
                <div>
                  <span className="text-slate-500 block">تعداد کل اقلام:</span>
                  <span className="font-bold text-slate-800">{toPersian(items.length)} قلم</span>
                </div>
                <div>
                  <span className="text-slate-500 block">اقلام شمرده شده:</span>
                  <span className="font-bold text-slate-800">{toPersian(countedItems.length)} قلم</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ارزش کل مازاد انبار:</span>
                  <span className="font-bold text-emerald-700 font-mono">+{toPersian(totalSurplusVal.toLocaleString())} ت</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ارزش کل کسری انبار:</span>
                  <span className="font-bold text-rose-700 font-mono">-{toPersian(totalDeficitVal.toLocaleString())} ت</span>
                </div>
              </div>
            )}

            {/* Main Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold">
                    <th className="p-2.5 w-10 text-center border-l border-slate-300">ردیف</th>
                    <th className="p-2.5 w-24 text-center border-l border-slate-300">کد کالا</th>
                    <th className="p-2.5 border-l border-slate-300">نام و شرح کالا</th>
                    <th className="p-2.5 w-20 text-center border-l border-slate-300">واحد اصلی</th>
                    
                    {sheetType === 'blind' && (
                      <>
                        <th className="p-2.5 w-28 text-center border-l border-slate-300">واحد فرعی / بسته‌بندی</th>
                        <th className="p-2.5 w-28 text-center bg-indigo-50/30 border-l border-slate-300">تعداد شمرده شده</th>
                        <th className="p-2.5 w-36 text-center">محل استقرار / یادداشت</th>
                      </>
                    )}

                    {sheetType === 'audit' && (
                      <>
                        <th className="p-2.5 w-24 text-center border-l border-slate-300">موجودی سیستم</th>
                        <th className="p-2.5 w-24 text-center bg-indigo-50/30 border-l border-slate-300">شمارش شده</th>
                        <th className="p-2.5 w-24 text-center border-l border-slate-300">مغایرت</th>
                        <th className="p-2.5 w-24 text-center">وضعیت</th>
                      </>
                    )}

                    {sheetType === 'protocol' && (
                      <>
                        <th className="p-2.5 w-20 text-center border-l border-slate-300">موجودی دفتری</th>
                        <th className="p-2.5 w-20 text-center border-l border-slate-300">شمارش فیزیکی</th>
                        <th className="p-2.5 w-20 text-center border-l border-slate-300">مغایرت</th>
                        <th className="p-2.5 w-24 text-center border-l border-slate-300">بهای واحد (تومان)</th>
                        <th className="p-2.5 w-28 text-center">ارزش ریالی مغایرت</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((it, idx) => {
                    const p = products.find(prod => String(prod.id) === String(it.productId));
                    const cost = Number(it.unitPrice || p?.purchasePrice || p?.price || 0);
                    const diff = Number(it.difference || 0);
                    const diffVal = diff * cost;

                    return (
                      <tr key={it.productId} className="hover:bg-slate-50/50">
                        <td className="p-2 text-center text-slate-500 font-mono border-l border-slate-200">{toPersian(idx + 1)}</td>
                        <td className="p-2 text-center font-mono text-slate-600 border-l border-slate-200">{p?.code || '-'}</td>
                        <td className="p-2 font-bold text-slate-800 border-l border-slate-200">{it.productName}</td>
                        <td className="p-2 text-center text-slate-600 border-l border-slate-200">{it.unit || p?.unit || 'عدد'}</td>

                        {sheetType === 'blind' && (
                          <>
                            <td className="p-2 text-center text-slate-500 border-l border-slate-200">
                              {p?.secondaryUnit ? `${p.secondaryUnit} (${toPersian(p.unitRatio || 1)})` : '-'}
                            </td>
                            <td className="p-2 text-center border-l border-slate-200 bg-slate-50/30">
                              <div className="h-6 border-b border-dashed border-slate-400"></div>
                            </td>
                            <td className="p-2 text-center">
                              <div className="h-6 border-b border-dashed border-slate-400"></div>
                            </td>
                          </>
                        )}

                        {sheetType === 'audit' && (
                          <>
                            <td className="p-2 text-center font-mono text-slate-700 border-l border-slate-200">{toPersian(it.expectedStock)}</td>
                            <td className="p-2 text-center font-mono font-bold text-indigo-700 border-l border-slate-200 bg-indigo-50/20">
                              {toPersian(it.countedStock)}
                            </td>
                            <td className={`p-2 text-center font-mono font-bold border-l border-slate-200 ${
                              diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-500'
                            }`}>
                              {diff > 0 ? `+${toPersian(diff)}` : toPersian(diff)}
                            </td>
                            <td className="p-2 text-center">
                              {it.countedStock === null ? (
                                <span className="text-slate-400 text-[10px]">شمارش نشده</span>
                              ) : diff === 0 ? (
                                <span className="text-blue-700 font-bold text-[10px]">منطبق</span>
                              ) : diff > 0 ? (
                                <span className="text-emerald-700 font-bold text-[10px]">اضافه</span>
                              ) : (
                                <span className="text-rose-700 font-bold text-[10px]">کسری</span>
                              )}
                            </td>
                          </>
                        )}

                        {sheetType === 'protocol' && (
                          <>
                            <td className="p-2 text-center font-mono text-slate-700 border-l border-slate-200">{toPersian(it.expectedStock)}</td>
                            <td className="p-2 text-center font-mono font-bold text-slate-800 border-l border-slate-200">{toPersian(it.countedStock)}</td>
                            <td className={`p-2 text-center font-mono font-bold border-l border-slate-200 ${
                              diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-500'
                            }`}>
                              {diff > 0 ? `+${toPersian(diff)}` : toPersian(diff)}
                            </td>
                            <td className="p-2 text-center font-mono text-slate-600 border-l border-slate-200">{toPersian(cost.toLocaleString())}</td>
                            <td className={`p-2 text-center font-mono font-bold ${
                              diffVal > 0 ? 'text-emerald-700' : diffVal < 0 ? 'text-rose-700' : 'text-slate-500'
                            }`}>
                              {diffVal !== 0 ? `${diffVal > 0 ? '+' : ''}${toPersian(diffVal.toLocaleString())}` : '۰'}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Discrepancy & Financial Summary in Protocol */}
            {sheetType === 'protocol' && (
              <div className="border border-slate-300 p-4 rounded-lg bg-slate-50 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>جمع ریالی اضافات انبارگردانی:</span>
                  <span className="font-mono font-bold text-emerald-700">+{toPersian(totalSurplusVal.toLocaleString())} تومان</span>
                </div>
                <div className="flex justify-between">
                  <span>جمع ریالی کسری‌های انبارگردانی:</span>
                  <span className="font-mono font-bold text-rose-700">-{toPersian(totalDeficitVal.toLocaleString())} تومان</span>
                </div>
                <div className="pt-2 border-t border-slate-300 flex justify-between font-black text-sm">
                  <span>خالص تعدیل ریالی انبارگردانی:</span>
                  <span className={`font-mono ${netDiscrepancy >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {netDiscrepancy >= 0 ? '+' : ''}{toPersian(netDiscrepancy.toLocaleString())} تومان
                  </span>
                </div>
                {session.receiptNumber && (
                  <div className="text-[11px] text-slate-600 pt-1">
                    • شماره رسید انبار صادره برای مازاد: <strong>{session.receiptNumber}</strong>
                  </div>
                )}
                {session.remittanceNumber && (
                  <div className="text-[11px] text-slate-600">
                    • شماره حواله انبار صادره برای کسری: <strong>{session.remittanceNumber}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Official Signatures */}
            <div className="pt-8 mt-8 border-t border-slate-300">
              <div className="text-center font-bold text-xs text-slate-700 mb-6">
                صحت مقادیر فوق مورد تایید هیئت انبارگردانی و مسئولین ذی‌ربط می‌باشد.
              </div>
              <div className="grid grid-cols-4 gap-4 text-center text-xs">
                <div className="p-3 border border-dashed border-slate-300 rounded-lg min-h-[90px] flex flex-col justify-between">
                  <span className="font-bold text-slate-700">انباردار</span>
                  <span className="text-[10px] text-slate-400">امضا و اثرانگشت</span>
                </div>
                <div className="p-3 border border-dashed border-slate-300 rounded-lg min-h-[90px] flex flex-col justify-between">
                  <span className="font-bold text-slate-700">سرپرست شمارش</span>
                  <span className="text-[10px] text-slate-400">امضا</span>
                </div>
                <div className="p-3 border border-dashed border-slate-300 rounded-lg min-h-[90px] flex flex-col justify-between">
                  <span className="font-bold text-slate-700">مدیر مالی و اداری</span>
                  <span className="text-[10px] text-slate-400">امضا و تایید</span>
                </div>
                <div className="p-3 border border-dashed border-slate-300 rounded-lg min-h-[90px] flex flex-col justify-between">
                  <span className="font-bold text-slate-700">مدیرعامل / بازرس</span>
                  <span className="text-[10px] text-slate-400">امضا و مهر</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
