import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock, User as UserIcon, LogIn, AlertCircle, KeyRound, Zap,
  ArrowRight, ClipboardList, ShieldCheck, Eye, EyeOff, CheckCircle2,
  Sparkles, Calendar, ArrowLeft, Check, RefreshCw
} from 'lucide-react';
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onVerifyOTP: (otp: string) => Promise<void>;
  requireOTP: boolean;
  setRequireOTP: (val: boolean) => void;
  error?: string;
  setError?: (val: string) => void;
  successMsg?: string;
  onBackToWelcome?: () => void;
  onOpenChecklist?: () => void;
  onOpenFastProduct?: () => void;
}

export function LoginPage({
  onLogin,
  onVerifyOTP,
  requireOTP,
  setRequireOTP,
  error = '',
  setError,
  successMsg = '',
  onBackToWelcome,
  onOpenChecklist,
  onOpenFastProduct
}: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Persian date for header badge
  const todayPersianStr = useMemo(() => {
    try {
      const obj = new DateObject({ calendar: persian, locale: persian_fa });
      return obj.format("dddd D MMMM YYYY");
    } catch {
      return '';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setIsSubmitting(true);
    try {
      await onLogin(username.trim(), password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setIsSubmitting(true);
    try {
      await onVerifyOTP(otp.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoFill = (autoSubmit = false) => {
    setUsername('admin');
    setPassword('admin');
    setError?.('');
    if (autoSubmit) {
      setIsSubmitting(true);
      onLogin('admin', 'admin').finally(() => setIsSubmitting(false));
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden"
      dir="rtl"
    >
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-[450px] h-[450px] bg-indigo-200/40 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 left-1/4 w-[450px] h-[450px] bg-emerald-200/30 rounded-full blur-[100px]" />
      </div>

      {/* Top Navbar / Navigation */}
      <div className="w-full max-w-md sm:max-w-lg flex items-center justify-between z-10 pt-2 pb-4">
        {onBackToWelcome ? (
          <button
            type="button"
            onClick={onBackToWelcome}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-xs transition-all cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>صفحه معرفی</span>
          </button>
        ) : <div />}

        {todayPersianStr && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-slate-200/60 text-[11px] font-bold text-slate-600 backdrop-blur-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>{todayPersianStr}</span>
          </div>
        )}
      </div>

      {/* Central Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md sm:max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200/90 p-6 sm:p-9 relative z-10 my-auto"
      >
        {/* Brand & Heading */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-4 transform hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            سامانه مالی <span className="text-indigo-600">تراز</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {requireOTP
              ? 'تأیید هویت دومرحله‌ای جهت ورود به سیستم'
              : 'ورود امن به پنل حسابداری، انبار و خزانه‌داری'}
          </p>
        </div>

        {/* Error Alert */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMsg}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        {!requireOTP ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نام کاربری
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError?.('');
                  }}
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-3 focus:ring-indigo-500/15 transition-all font-mono"
                  dir="ltr"
                  placeholder="admin"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  کلمه عبور
                </label>
                <button
                  type="button"
                  onClick={() => handleQuickDemoFill(false)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  درج حساب مدیر (admin)
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError?.('');
                  }}
                  className="w-full pr-10 pl-11 py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-3 focus:ring-indigo-500/15 transition-all font-mono"
                  dir="ltr"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title={showPassword ? 'مخفی‌سازی رمز' : 'نمایش رمز'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember & Hints */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span>مرا به خاطر بسپار</span>
              </label>

              <span className="text-[11px] text-slate-400 font-medium">
                پیش‌فرض: admin / admin
              </span>
            </div>

            {/* Main Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 active:scale-[0.99] transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{isSubmitting ? 'در حال بررسی...' : 'ورود به سامانه'}</span>
              </button>
            </div>

            {/* Quick 1-Click Fast Login Pill */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleQuickDemoFill(true)}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                <span>ورود مستقیم و سریع با حساب پیش‌فرض (مدیر سیستم)</span>
              </button>
            </div>
          </form>
        ) : (
          /* Two-Factor Authentication (OTP) */
          <form onSubmit={handleOTPSubmit} className="space-y-5">
            <button
              type="button"
              onClick={() => setRequireOTP(false)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>بازگشت به وارد کردن کلمه عبور</span>
            </button>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 text-center">
                کد اعتبارسنجی را وارد نمایید
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-2xl font-black text-center text-slate-900 tracking-[0.35em] font-mono focus:outline-none focus:ring-3 focus:ring-indigo-500/15"
                  placeholder="------"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otp.length < 4}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 active:scale-[0.99] transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>تأیید کد و ورود به پنل</span>
            </button>
          </form>
        )}

        {/* Shortcuts for Guest / Fast Operations */}
        {(onOpenFastProduct || onOpenChecklist) && (
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onOpenFastProduct && (
              <button
                type="button"
                onClick={onOpenFastProduct}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200/80 hover:border-amber-200 text-xs font-bold transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>ثبت سریع کالا</span>
              </button>
            )}

            {onOpenChecklist && (
              <button
                type="button"
                onClick={onOpenChecklist}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-800 border border-slate-200/80 hover:border-indigo-200 text-xs font-bold transition-all cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                <span>چک‌لیست سیستم</span>
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Footer Info */}
      <div className="w-full max-w-md sm:max-w-lg text-center z-10 py-3">
        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>ارتباط امن رمزگذاری‌شده • نسخه ۲.۴.۰</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
