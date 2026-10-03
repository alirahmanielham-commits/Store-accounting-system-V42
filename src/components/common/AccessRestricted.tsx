import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ArrowRight, Lock, Home, UserCheck, AlertTriangle } from 'lucide-react';
import { User } from '../../types';
import { USER_ROLE_LABELS, getPageTitle } from '../../utils/permissionUtils';

interface AccessRestrictedProps {
  activeTab: string;
  user: User | null;
  onGoHome: () => void;
}

export default function AccessRestricted({
  activeTab,
  user,
  onGoHome,
}: AccessRestrictedProps) {
  const pageTitle = getPageTitle(activeTab);
  const roleName = user?.role ? (USER_ROLE_LABELS[user.role] || user.role) : 'نامشخص';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 font-sans select-none" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-rose-100 p-8 text-center relative overflow-hidden"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Shield Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-50 text-rose-600 mb-6 border border-rose-200/60 shadow-inner relative">
          <ShieldAlert className="w-10 h-10" />
          <span className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-white rounded-full shadow-xs">
            <Lock className="w-3.5 h-3.5" />
          </span>
        </div>

        <h2 className="text-xl font-black text-slate-900 mb-2">
          عدم دسترسی به این بخش
        </h2>
        <p className="text-xs md:text-sm text-slate-500 leading-relaxed mb-6 font-medium">
          حساب کاربری شما اجازه دسترسی و مشاهده صفحه{' '}
          <span className="text-rose-600 font-extrabold px-1.5 py-0.5 bg-rose-50 rounded-md border border-rose-100">
            «{pageTitle}»
          </span>{' '}
          را ندارد. این بخش در سطح دسترسی نقش شما یا تنظیمات اختصاصی حساب شما تعریف نشده است.
        </p>

        {/* User context badge */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 mb-6 text-xs text-slate-600 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              کاربر جاری:
            </span>
            <span className="font-extrabold text-slate-800">{user?.name || user?.username || 'کاربر سیستم'}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              نقش سیستمی:
            </span>
            <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/60 text-[11px]">
              {roleName}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              شناسه فرم درخواستی:
            </span>
            <span className="font-mono text-slate-500 text-[11px] dir-ltr text-left">
              /{activeTab}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onGoHome}
          className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-98 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>بازگشت به داشبورد اصلی</span>
          <ArrowRight className="w-4 h-4 mr-1" />
        </button>

        <p className="text-[11px] text-slate-400 mt-4 font-medium">
          چنانچه نیاز به دسترسی به این بخش دارید، با مدیر سیستم تماس بگیرید.
        </p>
      </motion.div>
    </div>
  );
}
