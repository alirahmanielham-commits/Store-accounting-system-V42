import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Store } from 'lucide-react';
import MobileReceiptForm from './MobileReceiptForm';

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

      {/* Fixed Bottom Navigation Bar - STRICTLY LIMITED TO THE TWO ALLOWED OPERATIONS */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 max-w-lg mx-auto shadow-lg">
        <div className="grid grid-cols-2 items-center h-16 px-3 pb-safe gap-2">
          {/* 1. ثبت رسید دریافت */}
          <button
            type="button"
            onClick={() => setActiveTab('receive')}
            className={`flex items-center justify-center gap-2 h-12 rounded-2xl transition-all cursor-pointer font-black text-xs ${
              activeTab === 'receive'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <ArrowDownLeft className={`w-4 h-4 ${activeTab === 'receive' ? 'text-white' : 'text-emerald-600'}`} />
            <span>ثبت رسید دریافت</span>
          </button>

          {/* 2. ثبت رسید پرداخت */}
          <button
            type="button"
            onClick={() => setActiveTab('pay')}
            className={`flex items-center justify-center gap-2 h-12 rounded-2xl transition-all cursor-pointer font-black text-xs ${
              activeTab === 'pay'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <ArrowUpRight className={`w-4 h-4 ${activeTab === 'pay' ? 'text-white' : 'text-rose-600'}`} />
            <span>ثبت رسید پرداخت</span>
          </button>
        </div>
      </nav>
    </div>
  );
}