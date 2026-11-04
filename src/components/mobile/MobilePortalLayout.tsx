import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Store } from 'lucide-react';
import MobileReceiptForm from './MobileReceiptForm';
import { playAudioFeedback } from '../../utils/audio';

interface Props {
  storeSettings?: any;
  user?: any;
  persons?: any[];
  accounts?: any[];
  cashboxes?: any[];
  transactions?: any[];
  fetchTransactions?: () => Promise<void>;
  fetchAccounts?: () => Promise<void>;
  fetchCashboxes?: () => Promise<void>;
  fetchPersons?: () => Promise<void>;
  calculatePersonBalance?: (personId: any) => { status: string; amount: number; isDebtor?: boolean; isCreditor?: boolean };
  showNotification?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onLogout?: () => void;
}

export type MobileTab = 'receive' | 'pay';

export default function MobilePortalLayout({
  storeSettings,
  user,
  persons = [],
  accounts = [],
  cashboxes = [],
  transactions = [],
  fetchTransactions,
  fetchAccounts,
  fetchCashboxes,
  fetchPersons,
  calculatePersonBalance,
  showNotification: externalShowNotification,
  onLogout
}: Props) {
  // Mobile mode is strictly restricted to receipt registration (Receive and Pay)
  const [activeTab, setActiveTab] = useState<MobileTab>('receive');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const triggerNotification = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ msg, type });
    if (externalShowNotification) {
      externalShowNotification(msg, type);
    }
    setTimeout(() => {
      setToast(prev => (prev?.msg === msg ? null : prev));
    }, 3500);
  };

  const handleRefresh = async () => {
    try {
      if (fetchTransactions) await fetchTransactions();
      if (fetchAccounts) await fetchAccounts();
      if (fetchCashboxes) await fetchCashboxes();
      if (fetchPersons) await fetchPersons();
      triggerNotification('اطلاعات با موفقیت به‌روزرسانی شد.', 'info');
    } catch (_) {
      triggerNotification('خطا در به‌روزرسانی اطلاعات', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans relative" dir="rtl">
      {/* Floating Mobile Toast Banner */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto transition-all transform animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold text-white ${
            toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/20' :
            toast.type === 'error' ? 'bg-rose-600 shadow-rose-500/20' :
            toast.type === 'warning' ? 'bg-amber-600 shadow-amber-500/20' :
            'bg-slate-800 shadow-slate-900/20'
          }`}>
            <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <span className="flex-1 leading-snug">{toast.msg}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/80 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Single Receipt Form (Dedicated and isolated) */}
      <MobileReceiptForm
        key={activeTab}
        initialType={activeTab}
        persons={persons}
        accounts={accounts}
        cashboxes={cashboxes}
        storeSettings={storeSettings}
        transactions={transactions}
        fetchTransactions={fetchTransactions}
        fetchAccounts={fetchAccounts}
        fetchCashboxes={fetchCashboxes}
        fetchPersons={fetchPersons}
        calculatePersonBalance={calculatePersonBalance}
        showNotification={triggerNotification}
        onTypeChange={(t) => setActiveTab(t)}
        onRefresh={handleRefresh}
      />

      {/* Redesigned Modern Mobile Bottom Menu (Exclusively Receive & Pay) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 max-w-lg mx-auto shadow-2xl px-3 pt-2 pb-safe">
        <div className="grid grid-cols-2 gap-2 h-14">
          {/* 1. ثبت رسید دریافت */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('receive');
              try { playAudioFeedback('info'); } catch (_) {}
            }}
            className={`flex items-center justify-center gap-2.5 rounded-2xl transition-all duration-200 cursor-pointer select-none ${
              activeTab === 'receive'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500/20 font-black text-xs active:scale-98'
                : 'bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-bold text-xs'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              activeTab === 'receive'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
            }`}>
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <span className="tracking-tight">ثبت رسید دریافت</span>
          </button>

          {/* 2. ثبت رسید پرداخت */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('pay');
              try { playAudioFeedback('info'); } catch (_) {}
            }}
            className={`flex items-center justify-center gap-2.5 rounded-2xl transition-all duration-200 cursor-pointer select-none ${
              activeTab === 'pay'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-500/20 font-black text-xs active:scale-98'
                : 'bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-bold text-xs'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              activeTab === 'pay'
                ? 'bg-white/20 text-white'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
            }`}>
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <span className="tracking-tight">ثبت رسید پرداخت</span>
          </button>
        </div>
      </nav>
    </div>
  );
}