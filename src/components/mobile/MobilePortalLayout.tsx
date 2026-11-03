import React, { useState } from 'react';
import {
  Home, ArrowDownLeft, ArrowUpRight, History,
  LogOut, RefreshCw
} from 'lucide-react';
import MobileHub from './MobileHub';
import MobileReceiptForm from './MobileReceiptForm';
import MobileReceiptsHistory from './MobileReceiptsHistory';

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

export type MobileTab = 'hub' | 'receive' | 'pay' | 'history';

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
  showNotification,
  onLogout
}: Props) {
  const [activeScreen, setActiveScreen] = useState<MobileTab>('hub');

  const handleRefresh = async () => {
    try {
      if (fetchTransactions) await fetchTransactions();
      if (fetchAccounts) await fetchAccounts();
      if (fetchCashboxes) await fetchCashboxes();
      if (fetchPersons) await fetchPersons();
      if (showNotification) showNotification('داده‌ها به‌روزرسانی شدند.', 'info');
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans" dir="rtl">
      {/* Dynamic Mobile Views */}
      {activeScreen === 'hub' && (
        <MobileHub
          storeSettings={storeSettings}
          user={user}
          transactions={transactions}
          persons={persons}
          accounts={accounts}
          cashboxes={cashboxes}
          onOpenReceive={() => setActiveScreen('receive')}
          onOpenPay={() => setActiveScreen('pay')}
          onViewHistory={() => setActiveScreen('history')}
          onRefresh={handleRefresh}
        />
      )}

      {activeScreen === 'receive' && (
        <MobileReceiptForm
          initialType="receive"
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
          onBack={() => setActiveScreen('hub')}
          showNotification={showNotification}
        />
      )}

      {activeScreen === 'pay' && (
        <MobileReceiptForm
          initialType="pay"
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
          onBack={() => setActiveScreen('hub')}
          showNotification={showNotification}
        />
      )}

      {activeScreen === 'history' && (
        <MobileReceiptsHistory
          transactions={transactions}
          storeSettings={storeSettings}
          onBack={() => setActiveScreen('hub')}
        />
      )}

      {/* Fixed Bottom Thumb-Zone Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 max-w-lg mx-auto">
        <div className="grid grid-cols-4 items-center h-16 px-2 pb-safe">
          {/* 1. Hub / Home */}
          <button
            type="button"
            onClick={() => setActiveScreen('hub')}
            className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              activeScreen === 'hub'
                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeScreen === 'hub' ? 'bg-indigo-50 dark:bg-indigo-950/50' : ''}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">داشبورد</span>
          </button>

          {/* 2. Receive */}
          <button
            type="button"
            onClick={() => setActiveScreen('receive')}
            className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              activeScreen === 'receive'
                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeScreen === 'receive' ? 'bg-emerald-50 dark:bg-emerald-950/50' : ''}`}>
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">دریافت</span>
          </button>

          {/* 3. Pay */}
          <button
            type="button"
            onClick={() => setActiveScreen('pay')}
            className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              activeScreen === 'pay'
                ? 'text-rose-600 dark:text-rose-400 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeScreen === 'pay' ? 'bg-rose-50 dark:bg-rose-950/50' : ''}`}>
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">پرداخت</span>
          </button>

          {/* 4. History */}
          <button
            type="button"
            onClick={() => setActiveScreen('history')}
            className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              activeScreen === 'history'
                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeScreen === 'history' ? 'bg-indigo-50 dark:bg-indigo-950/50' : ''}`}>
              <History className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">رسیدها</span>
          </button>
        </div>
      </nav>
    </div>
  );
}