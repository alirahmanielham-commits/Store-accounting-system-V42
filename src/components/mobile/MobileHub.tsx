import React, { useMemo } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Plus, RefreshCw,
  Search, ShieldCheck, ChevronLeft, Clock,
  FileText, Smartphone, ShoppingCart, Barcode,
  Boxes, Users, Wallet, Landmark
} from 'lucide-react';
import { addCommas, formatDateDisplay } from '../../utils/format';

interface Props {
  storeSettings?: any;
  user?: any;
  transactions?: any[];
  persons?: any[];
  accounts?: any[];
  cashboxes?: any[];
  onOpenReceive: () => void;
  onOpenPay: () => void;
  onViewHistory: () => void;
  onRefresh?: () => void;
}

export default function MobileHub({
  storeSettings,
  user,
  transactions = [],
  persons = [],
  accounts = [],
  cashboxes = [],
  onOpenReceive,
  onOpenPay,
  onViewHistory,
  onRefresh
}: Props) {
  const currency = storeSettings?.currency || 'تومان';
  const storeName = storeSettings?.store_name || storeSettings?.storeName || 'سامانه مالی تراز';

  // Calculate today's receipts and payments
  const { todayReceiveTotal, todayPayTotal, todayCount } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let rec = 0;
    let pay = 0;
    let cnt = 0;

    (transactions || []).forEach(t => {
      if (!t || t.isDeleted) return;
      const tDate = String(t.date || '').split('T')[0];
      if (tDate === today) {
        cnt++;
        const amt = Number(t.amount) || 0;
        if (t.type === 'receive') rec += amt;
        else if (t.type === 'pay' || t.type === 'salary') pay += amt;
      }
    });

    return {
      todayReceiveTotal: rec,
      todayPayTotal: pay,
      todayCount: cnt
    };
  }, [transactions]);

  // Last 5 receipts
  const recentTransactions = useMemo(() => {
    return (transactions || [])
      .filter(t => !t.isDeleted && (t.type === 'receive' || t.type === 'pay'))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 5);
  }, [transactions]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-28 text-slate-800 dark:text-slate-100" dir="rtl">
      {/* Mobile Portal Top Brand Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/30 text-sm">
            ت
          </div>
          <div>
            <h1 className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate max-w-[170px]">
              {storeName}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">پورتال اختصاصی همراه</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              title="بروزرسانی داده‌ها"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>متصل</span>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Welcome & User Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-indigo-200/80 font-medium">کاربر فعال</p>
              <h2 className="text-sm font-black text-white mt-0.5">
                {user?.name || user?.username || 'مدیر سیستم'}
              </h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/10 text-indigo-100 border border-white/10">
              دسترسی استاندارد
            </span>
          </div>

          {/* Quick Financial Summary */}
          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/10">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">دریافتی‌های امروز</span>
              <span className="text-sm font-black text-white">
                {addCommas(todayReceiveTotal)} <span className="text-[10px] font-normal text-slate-300">{currency}</span>
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <span className="text-[10px] font-bold text-rose-400 block mb-0.5">پرداختی‌های امروز</span>
              <span className="text-sm font-black text-white">
                {addCommas(todayPayTotal)} <span className="text-[10px] font-normal text-slate-300">{currency}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Section: Allowed Mobile Operations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300">
              عملیات مجاز در نسخه همراه
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">
              فاز ۱: دریافت و پرداخت
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Action 1: Receive (دریافت) */}
            <button
              type="button"
              onClick={onOpenReceive}
              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/30 hover:border-emerald-500 shadow-sm hover:shadow-md hover:shadow-emerald-500/10 text-right flex items-center justify-between transition-all active:scale-98 cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    ثبت رسید دریافت
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    نقد، کارتخوان، واریز بانکی یا چک
                  </p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </button>

            {/* Action 2: Pay (پرداخت) */}
            <button
              type="button"
              onClick={onOpenPay}
              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-rose-500/30 hover:border-rose-500 shadow-sm hover:shadow-md hover:shadow-rose-500/10 text-right flex items-center justify-between transition-all active:scale-98 cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                    ثبت رسید پرداخت
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    تسویه با تامین‌کننده، هزینه‌ها و نقد
                  </p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-rose-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Section: Future Operations Showcase (Cleanly badged) */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">
              عملیات بعدی (در حال آماده‌سازی برای موبایل)
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 text-right opacity-70">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-2">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-black text-slate-700 dark:text-slate-300">فاکتور فروش سریع</h5>
              <p className="text-[10px] text-slate-400 mt-0.5">صدور فاکتور در محل</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 text-right opacity-70">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-2">
                <Barcode className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-black text-slate-700 dark:text-slate-300">اسکن و قیمت کالا</h5>
              <p className="text-[10px] text-slate-400 mt-0.5">اسکن بارکد با دوربین</p>
            </div>
          </div>
        </div>

        {/* Section: Recent Receipts */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300">
              آخرین رسیدهای ثبت‌شده
            </h3>
            <button
              type="button"
              onClick={onViewHistory}
              className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>مشاهده همه</span>
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 shadow-sm border border-slate-200/70 dark:border-slate-800/80 divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                هنوز رسیدی ثبت نشده است.
              </div>
            ) : (
              recentTransactions.map(t => {
                const isRec = t.type === 'receive';
                return (
                  <div key={t.id} className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isRec ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}>
                        {isRec ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[140px]">
                          {t.personName || 'نامشخص'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {t.receiptNumber ? `#${t.receiptNumber}` : (t.displayDate || '')}
                        </p>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className={`text-xs font-black ${
                        isRec ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isRec ? '+' : '-'}{addCommas(t.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{currency}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}