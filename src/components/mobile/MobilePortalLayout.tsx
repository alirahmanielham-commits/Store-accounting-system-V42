import React, { useState } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, RefreshCw, Menu, X,
  LogOut, ShieldCheck, User, Store, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const storeName = storeSettings?.store_name || storeSettings?.storeName || 'سامانه حسابداری تراز';
  const userName = user?.name || user?.username || 'کاربر سیستم';

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
      try { playAudioFeedback('info'); } catch (_) {}
    } catch (_) {
      triggerNotification('خطا در به‌روزرسانی اطلاعات', 'error');
    }
  };

  const handleSelectTab = (tab: MobileTab) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
    try { playAudioFeedback('info'); } catch (_) {}
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
        onOpenMenu={() => setIsDrawerOpen(true)}
      />

      {/* Hamburger Navigation Drawer (Sliding from Right in RTL) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-start">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Slide-out Drawer Panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative z-10 w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col p-5 border-l border-slate-200 dark:border-slate-800"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/30 text-base shrink-0">
                    ت
                  </div>
                  <div className="truncate">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {storeName}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{userName}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="بستن منو"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Menu Title */}
              <div className="pt-4 pb-2 px-1 flex items-center justify-between">
                <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                  عملیات مجاز همراه
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  فاز دریافت و پرداخت
                </span>
              </div>

              {/* Navigation Items (Exclusive to Receive and Pay) */}
              <div className="space-y-2.5 py-2 flex-1 overflow-y-auto">
                {/* 1. ثبت رسید دریافت */}
                <button
                  type="button"
                  onClick={() => handleSelectTab('receive')}
                  className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-right transition-all cursor-pointer border ${
                    activeTab === 'receive'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-sm'
                      : 'bg-white dark:bg-slate-850 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      activeTab === 'receive'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black">
                        ثبت رسید دریافت وجه
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        کارتخوان، نقد، واریزی و چک
                      </p>
                    </div>
                  </div>

                  {activeTab === 'receive' && (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>

                {/* 2. ثبت رسید پرداخت */}
                <button
                  type="button"
                  onClick={() => handleSelectTab('pay')}
                  className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-right transition-all cursor-pointer border ${
                    activeTab === 'pay'
                      ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-100 shadow-sm'
                      : 'bg-white dark:bg-slate-850 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      activeTab === 'pay'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                    }`}>
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black">
                        ثبت رسید پرداخت وجه
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        تسویه فاکتور، هزینه‌ها و نقد
                      </p>
                    </div>
                  </div>

                  {activeTab === 'pay' && (
                    <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              </div>

              {/* Drawer Footer Utilities */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    handleRefresh();
                    setIsDrawerOpen(false);
                  }}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                  <span>به‌روزرسانی اطلاعات حساب‌ها</span>
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onLogout();
                    }}
                    className="w-full h-11 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>خروج از حساب کاربری</span>
                  </button>
                )}

                <div className="text-center pt-2">
                  <p className="text-[10px] text-slate-400 font-mono">سامانه مالی تراز • نسخه اختصاصی همراه</p>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}