import React from 'react';
import { ShieldAlert, ArrowRight, Lock, Home, UserCheck } from 'lucide-react';
import { User } from '../../types';

interface AccessDeniedPageProps {
  currentTab?: string;
  user?: User | null;
  onNavigateHome?: () => void;
  setActiveTab?: (tab: string) => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  currentTab,
  user,
  onNavigateHome,
  setActiveTab
}) => {
  const roleNames: Record<string, string> = {
    admin: 'مدیر کل سیستم',
    manager: 'مدیر داخلی',
    accountant: 'حسابدار',
    cashier: 'صندوق‌دار',
    warehouseman: 'انباردار',
    employee: 'کارمند',
    customer: 'مشتری',
    viewer: 'ناظر (فقط مشاهده)',
    guest: 'مهمان'
  };

  const handleReturn = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else if (setActiveTab) {
      setActiveTab('welcome_page');
    } else {
      window.location.href = '/welcome_page';
    }
  };

  return (
    <div className="min-h-[460px] flex items-center justify-center p-6 text-right font-sans" dir="rtl">
      <div className="bg-white rounded-3xl border border-rose-150 p-8 md:p-12 shadow-xl shadow-rose-500/5 max-w-lg w-full text-center relative overflow-hidden">
        {/* Subtle decorative background circle */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-50 rounded-full blur-2xl pointer-events-none" />

        <div className="w-18 h-18 mx-auto mb-6 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm relative">
          <ShieldAlert className="w-9 h-9" />
          <div className="absolute -bottom-1 -left-1 bg-white rounded-full p-1 shadow-xs border border-rose-150">
            <Lock className="w-4 h-4 text-rose-500" />
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-2">
          دسترسی به این بخش محدود شده است
        </h2>

        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          حساب کاربری شما اجازه مشاهده یا ویرایش اطلاعات این صفحه ({currentTab ? `«${currentTab}»` : 'درخواستی'}) را ندارد.
        </p>

        {user && (
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 mb-6 text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500">کاربر جاری:</span>
              <span className="font-black text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                {user.name} ({user.username})
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/50 pt-2">
              <span className="font-bold text-slate-500">نقش سیستمی:</span>
              <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700">
                {roleNames[user.role] || user.role}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 text-right pt-1 leading-normal">
              در صورت نیاز به دسترسی به این بخش، با مدیر سیستم جهت ارتقاء یا اختصاص مجوز تماس حاصل فرمایید.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleReturn}
          className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>بازگشت به صفحه اصلی مجاز</span>
        </button>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
