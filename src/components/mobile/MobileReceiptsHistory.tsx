import React, { useState, useMemo } from 'react';
import {
  ArrowRight, Search, ArrowDownLeft, ArrowUpRight,
  Calendar, Landmark, Wallet, X, FileText, CheckCircle2
} from 'lucide-react';
import { addCommas } from '../../utils/format';

interface Props {
  transactions?: any[];
  storeSettings?: any;
  onBack: () => void;
}

export default function MobileReceiptsHistory({
  transactions = [],
  storeSettings,
  onBack
}: Props) {
  const currency = storeSettings?.currency || 'تومان';
  const [filterType, setFilterType] = useState<'all' | 'receive' | 'pay'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const filtered = useMemo(() => {
    return (transactions || [])
      .filter(t => !t.isDeleted && (t.type === 'receive' || t.type === 'pay'))
      .filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        const pName = String(t.personName || '').toLowerCase();
        const num = String(t.receiptNumber || '').toLowerCase();
        const desc = String(t.description || '').toLowerCase();
        return pName.includes(q) || num.includes(q) || desc.includes(q);
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [transactions, filterType, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-24 text-slate-800 dark:text-slate-100" dir="rtl">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            aria-label="بازگشت"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white">
              تاریخچه رسیدهای مالی
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">لیست رسیدهای دریافت و پرداخت</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-3 max-w-lg mx-auto w-full">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            placeholder="جستجو با نام طرف‌حساب، شماره رسید یا توضیحات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pr-10 pl-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs font-medium focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Segmented Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-xs font-black">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center ${
              filterType === 'all'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            همه رسیدها
          </button>
          <button
            type="button"
            onClick={() => setFilterType('receive')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center ${
              filterType === 'receive'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            فقط دریافتی‌ها
          </button>
          <button
            type="button"
            onClick={() => setFilterType('pay')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center ${
              filterType === 'pay'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            فقط پرداختی‌ها
          </button>
        </div>

        {/* List of Receipts */}
        <div className="space-y-2 pt-1">
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/70 dark:border-slate-800">
              <p className="text-xs text-slate-400">موردی با این فیلتر یا عبارت یافت نشد.</p>
            </div>
          ) : (
            filtered.map(t => {
              const isRec = t.type === 'receive';
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedReceipt(t)}
                  className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800 shadow-xs hover:shadow-sm text-right flex items-center justify-between transition-all cursor-pointer active:scale-99"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isRec ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}>
                      {isRec ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[170px]">
                        {t.personName || 'نامشخص'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {t.receiptNumber ? `رسید #${t.receiptNumber}` : 'بدون شماره'}
                        {t.displayDate ? ` • ${t.displayDate}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <p className={`text-xs font-black ${
                      isRec ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {isRec ? '+' : '-'}{addCommas(t.amount)}
                    </p>
                    <span className="text-[10px] text-slate-400 block">{currency}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </main>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedReceipt(null)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                جزئیات {selectedReceipt.type === 'receive' ? 'رسید دریافت' : 'رسید پرداخت'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">شماره رسید:</span>
                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{selectedReceipt.receiptNumber || 'ثبت شده'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">طرف‌حساب:</span>
                <span className="font-black text-slate-800 dark:text-white">{selectedReceipt.personName || 'نامشخص'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">مبلغ:</span>
                <span className={`font-black text-sm ${selectedReceipt.type === 'receive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {addCommas(selectedReceipt.amount)} {currency}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">تاریخ:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{selectedReceipt.displayDate || selectedReceipt.date}</span>
              </div>
              {selectedReceipt.trackingNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">شماره پیگیری:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedReceipt.trackingNumber}</span>
                </div>
              )}
              {selectedReceipt.description && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block mb-1">بابت و توضیحات:</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl font-medium">
                    {selectedReceipt.description}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}