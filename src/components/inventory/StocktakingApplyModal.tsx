import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, FileText, ArrowRight, ArrowDownRight, ArrowUpRight, Handshake, RefreshCw, X, ExternalLink, Printer } from 'lucide-react';
import { Stocktaking, StocktakingItem, Product, Warehouse } from '../../types';
import { applyStocktakingSession } from '../../services/dataService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  session: Stocktaking;
  products: Product[];
  warehouse?: Warehouse;
  currentUser?: string;
  onSuccess: (appliedSession: Stocktaking) => void;
  onOpenPrint?: () => void;
  onNavigateToDocs?: () => void;
}

export default function StocktakingApplyModal({
  isOpen,
  onClose,
  session,
  products,
  warehouse,
  currentUser = 'سیستم',
  onSuccess,
  onOpenPrint,
  onNavigateToDocs,
}: Props) {
  const [createAccountingDoc, setCreateAccountingDoc] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    session: Stocktaking;
    receipt: any;
    remittance: any;
    accountingDocNumber?: string | number;
  } | null>(null);

  if (!isOpen) return null;

  const toPersian = (n: number | string) => n?.toString().replace(/\d/g, x => ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'][parseInt(x)]) || '۰';

  const countedItems = (session.items || []).filter(it => it.countedStock !== null);
  const surplusItems = countedItems.filter(it => Number(it.difference) > 0);
  const deficitItems = countedItems.filter(it => Number(it.difference) < 0);
  const matchedItems = countedItems.filter(it => Number(it.difference) === 0);

  // Financial calculations
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

  const handleApply = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await applyStocktakingSession(session, currentUser, { createAccountingDoc });
      setResult(res);
      onSuccess(res.session);
    } catch (err: any) {
      setError(err?.message || 'خطا در اعمال انبارگردانی');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">
                {result ? 'اسناد تعدیل انبارگردانی صادر شد' : 'تایید نهایی و اعمال انبارگردانی در سیستم'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                انبار: <span className="font-bold text-slate-700">{warehouse?.name || 'انبار اصلی'}</span> | تاریخ: <span className="font-mono">{session.date}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-sm font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            /* Success View */
            <div className="space-y-6">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-emerald-800">عملیات انبارگردانی با موفقیت در سیستم اعمال گردید!</h3>
                <p className="text-xs text-emerald-700 max-w-lg mx-auto">
                  موجودی کلیه کالاهای انبار و کاردکس کالاها با مقادیر شمارش شده همگام گردید و اسناد رسمی انبار ثبت شدند.
                </p>
              </div>

              {/* Generated Documents Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.receipt && (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <ArrowDownRight className="w-4 h-4 text-emerald-600" /> رسید انبار (مازاد انبارگردانی)
                      </span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                        {result.receipt.invoiceNumber || result.receipt.id}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex justify-between pt-2 border-t border-emerald-100">
                      <span>تعداد اقلام مازاد:</span>
                      <span className="font-bold text-slate-800">{toPersian(surplusItems.length)} قلم کالا</span>
                    </div>
                    <div className="text-xs text-slate-600 flex justify-between">
                      <span>مبلغ کل رسید:</span>
                      <span className="font-bold text-emerald-700 font-mono">{toPersian(totalSurplusVal.toLocaleString())} تومان</span>
                    </div>
                  </div>
                )}

                {result.remittance && (
                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                        <ArrowUpRight className="w-4 h-4 text-rose-600" /> حواله انبار (کسری انبارگردانی)
                      </span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md">
                        {result.remittance.invoiceNumber || result.remittance.id}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex justify-between pt-2 border-t border-rose-100">
                      <span>تعداد اقلام کسری:</span>
                      <span className="font-bold text-slate-800">{toPersian(deficitItems.length)} قلم کالا</span>
                    </div>
                    <div className="text-xs text-slate-600 flex justify-between">
                      <span>مبلغ کل حواله:</span>
                      <span className="font-bold text-rose-700 font-mono">{toPersian(totalDeficitVal.toLocaleString())} تومان</span>
                    </div>
                  </div>
                )}
              </div>

              {result.accountingDocNumber && (
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-bold text-indigo-950">سند حسابداری دوطرفه کسری و اضافی انبار ثبت شد:</span>
                  </div>
                  <span className="font-mono text-sm font-black px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                    سند شماره {toPersian(result.accountingDocNumber)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Confirmation & Review View */
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-xs text-slate-500 block mb-1">اقلام شمارش شده</span>
                  <span className="text-lg font-black text-slate-800 font-mono">{toPersian(countedItems.length)}</span>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <span className="text-xs text-emerald-700 block mb-1">اقلام مازاد (اضافه)</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">+{toPersian(surplusItems.length)}</span>
                </div>
                <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl">
                  <span className="text-xs text-rose-700 block mb-1">اقلام کسری</span>
                  <span className="text-lg font-black text-rose-700 font-mono">-{toPersian(deficitItems.length)}</span>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <span className="text-xs text-blue-700 block mb-1">اقلام منطبق</span>
                  <span className="text-lg font-black text-blue-700 font-mono">{toPersian(matchedItems.length)}</span>
                </div>
              </div>

              {/* Action notice */}
              <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-950 text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>اسناد تعدیل انبار با عنوان «ثبت انبار گردانی» صادر خواهند شد:</span>
                </div>
                <ul className="list-disc list-inside pr-1 space-y-1.5 text-amber-900">
                  <li>
                    <strong>انطباق قطعی مانده نهایی:</strong> تعداد ثبت شده در انبارگردانی، دقیقاً به عنوان مانده نهایی موجودی کالا در انبار ثبت خواهد شد. اسناد ورود (رسید) و خروج (حواله) متناسب صادر می‌شوند تا مانده نهایی سیستم با تعداد وارد شده یکی باشد.
                  </li>
                  {surplusItems.length > 0 && (
                    <li>
                      <strong>رسید ورود انبار با عنوان «ثبت انبار گردانی»:</strong> برای {toPersian(surplusItems.length)} قلم کالای دارای اضافه موجودی به ارزش کل {toPersian(totalSurplusVal.toLocaleString())} تومان.
                    </li>
                  )}
                  {deficitItems.length > 0 && (
                    <li>
                      <strong>حواله خروج انبار با عنوان «ثبت انبار گردانی»:</strong> برای {toPersian(deficitItems.length)} قلم کالای دارای کسری به ارزش کل {toPersian(totalDeficitVal.toLocaleString())} تومان.
                    </li>
                  )}
                </ul>
              </div>

              {/* Items Discrepancy Multi-Round Breakdown Table */}
              {(surplusItems.length > 0 || deficitItems.length > 0) && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
                    <span>بررسی نوبت‌های شمارش و تعداد نهایی کالاهای دارای اختلاف</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {toPersian(surplusItems.length + deficitItems.length)} کالا دارای مغایرت
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-2">نام کالا</th>
                          <th className="p-2 text-center">موجودی سیستم</th>
                          <th className="p-2 text-center">شمارش ۱</th>
                          <th className="p-2 text-center">شمارش ۲</th>
                          <th className="p-2 text-center">شمارش ۳</th>
                          <th className="p-2 text-center bg-emerald-50 text-emerald-950 font-extrabold">تعداد نهایی کالا</th>
                          <th className="p-2 text-center">اختلاف نهایی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...surplusItems, ...deficitItems].map((it) => {
                          const diff = Number(it.difference || 0);
                          return (
                            <tr key={it.productId} className="hover:bg-slate-50/80">
                              <td className="p-2 font-bold text-slate-800">{it.productName}</td>
                              <td className="p-2 text-center font-mono text-slate-600">{toPersian(it.expectedStock)}</td>
                              <td className="p-2 text-center font-mono text-sky-800">
                                {it.countRound1 !== null && it.countRound1 !== undefined ? toPersian(it.countRound1) : '-'}
                              </td>
                              <td className="p-2 text-center font-mono text-amber-800">
                                {it.countRound2 !== null && it.countRound2 !== undefined ? toPersian(it.countRound2) : '-'}
                              </td>
                              <td className="p-2 text-center font-mono text-violet-800">
                                {it.countRound3 !== null && it.countRound3 !== undefined ? toPersian(it.countRound3) : '-'}
                              </td>
                              <td className="p-2 text-center font-mono font-extrabold text-emerald-950 bg-emerald-50/50">
                                {toPersian(it.countedStock ?? 0)} {it.unit || 'عدد'}
                              </td>
                              <td className="p-2 text-center font-mono font-bold">
                                {diff > 0 ? (
                                  <span className="text-emerald-700">+{toPersian(diff)} (مازاد)</span>
                                ) : (
                                  <span className="text-rose-700">{toPersian(diff)} (کسری)</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Valuation details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>مجموع ارزش ریالی اضافه انبار:</span>
                  <span className="font-bold text-emerald-600 font-mono">+{toPersian(totalSurplusVal.toLocaleString())} تومان</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>مجموع ارزش ریالی کسری انبار:</span>
                  <span className="font-bold text-rose-600 font-mono">-{toPersian(totalDeficitVal.toLocaleString())} تومان</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-800">
                  <span>خالص تعدیل ریالی (سود / زیان انبارگردانی):</span>
                  <span className={`font-mono text-base ${netDiscrepancy >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {netDiscrepancy >= 0 ? '+' : ''}{toPersian(netDiscrepancy.toLocaleString())} تومان
                  </span>
                </div>
              </div>

              {/* Accounting doc toggle */}
              <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={createAccountingDoc}
                  onChange={(e) => setCreateAccountingDoc(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">صدور خودکار سند حسابداری تعدیل انبارگردانی</span>
                  <span className="text-slate-500">ثبت در سرفصل موجودی کالا و حساب معین «کسری و اضافی انبار»</span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          {result ? (
            <>
              <button
                onClick={() => {
                  if (onOpenPrint) onOpenPrint();
                  onClose();
                }}
                className="px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" /> چاپ صورت‌جلسه رسمی
              </button>

              <div className="flex items-center gap-2">
                {onNavigateToDocs && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToDocs();
                    }}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>مشاهده اسناد انبار</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
                >
                  بستن و اتمام
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isSubmitting || countedItems.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال صدور اسناد و تعدیل موجودی...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تایید نهایی و صدور اسناد تعدیل</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
