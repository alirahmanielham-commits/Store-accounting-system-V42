import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock, User as UserIcon, LogIn, AlertCircle, KeyRound, Zap,
  ArrowRight, ClipboardList, ShieldCheck, LineChart, Layers,
  ArrowLeft, Clock, Eye, EyeOff, CheckCircle2, Sparkles, Building2,
  HelpCircle, Check
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

  // Today's Persian date
  const todayPersianStr = React.useMemo(() => {
    try {
      const obj = new DateObject({ calendar: persian, locale: persian_fa });
      return obj.format("dddd DD MMMM YYYY");
    } catch (e) {
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

  const handleQuickDemoFill = () => {
    setUsername('admin');
    setPassword('admin');
    setError?.('');
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 font-sans select-none" dir="rtl">
      {/* Background Decorative subtle pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-200/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl" />
      </div>

      {/* Main Container Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden relative z-10 flex flex-col lg:flex-row"
      >
        {/* Left Side on desktop (Right side in RTL): Feature showcase & Brand info */}
        <div className="w-full lg:w-5/12 bg-slate-900 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-l border-slate-800">
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

          {/* Top Info */}
          <div className="relative z-10">
            {/* Top Return Button */}
            {onBackToWelcome && (
              <button
                type="button"
                onClick={onBackToWelcome}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-700/80 transition-all cursor-pointer mb-8"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>صفحه اصلی سامانه</span>
              </button>
            )}

            {/* Brand Title */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/30">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  سامانه مدیریت مالی <span className="text-indigo-400">تراز</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  نرم‌افزار جامع حسابداری، انبار و خزانه‌داری
                </p>
              </div>
            </div>

            {/* Date Indicator */}
            {todayPersianStr && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/90 border border-slate-700/60 text-xs font-semibold text-slate-300 mb-8">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{todayPersianStr}</span>
              </div>
            )}

            {/* Value Highlights */}
            <div className="space-y-4 hidden sm:block">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-200">خزانه‌داری و مدیریت چک</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    سامانه صیادی، هشدار خودکار سررسید و گزارش تحلیلی گردش چک‌ها
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <LineChart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-200">حسابداری مالی و دفاتر دوبل</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    اسناد روزنامه، تراز آزمایشی، بستن سال مالی و معین اشخاص
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-200">فروش، انبار و بارکدینگ</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    فاکتورهای رسمی، کاردکس ریالی کالا و انبارگردانی سریع
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 pt-6 mt-6 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              ارتباط امن TLS ۲۵۶ بیتی
            </span>
            <span className="font-mono text-slate-500">نسخه ۲.۴.۰</span>
          </div>
        </div>

        {/* Right Side: Clean Form */}
        <div className="w-full lg:w-7/12 p-8 sm:p-12 flex flex-col justify-between">
          <div className="max-w-md w-full mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {requireOTP ? 'تأیید هویت دومرحله‌ای' : 'ورود به سامانه'}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
                {requireOTP
                  ? 'کد اعتبارسنجی ارسال شده به تلفن همراه خود را وارد کنید.'
                  : 'برای ورود به حساب کاربری خود، نام کاربری و کلمه عبور را وارد فرمایید.'}
              </p>
            </div>

            {/* Error & Success Alerts */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {!requireOTP ? (
              /* Standard Username / Password Form */
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
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
                      className="w-full pr-10 pl-4 py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                      dir="ltr"
                      placeholder="admin"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700">
                      کلمه عبور
                    </label>
                    <button
                      type="button"
                      onClick={handleQuickDemoFill}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                      title="تکمیل خودکار حساب پیش‌فرض مدیر (admin)"
                    >
                      تکمیل با حساب مدیر (admin)
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
                      className="w-full pr-10 pl-10 py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
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

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span>مرا به خاطر بسپار</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    ورود با فشردن کلید اینتر ↵
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'در حال بررسی...' : 'ورود به سامانه'}</span>
                </button>
              </form>
            ) : (
              /* OTP Form */
              <form onSubmit={handleOTPSubmit} className="space-y-6">
                <button
                  type="button"
                  onClick={() => setRequireOTP(false)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>بازگشت به وارد کردن رمز عبور</span>
                </button>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    کد تأیید ۶ رقمی (OTP)
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
                      className="w-full pr-10 pl-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-2xl font-black text-center text-slate-900 tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="------"
                      dir="ltr"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otp.length < 4}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>تأیید و ورود به پنل</span>
                </button>
              </form>
            )}

            {/* Quick Actions / Shortcuts Bar */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2.5">
              {onOpenFastProduct && (
                <button
                  type="button"
                  onClick={onOpenFastProduct}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200/80 hover:border-amber-200/80 text-slate-700 hover:text-amber-800 text-xs font-bold transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <span>ثبت سریع کالا (بدون نیاز به ورود)</span>
                  </div>
                  <ArrowLeft className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>
              )}

              {onOpenChecklist && (
                <button
                  type="button"
                  onClick={onOpenChecklist}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200/80 text-slate-700 hover:text-indigo-800 text-xs font-bold transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <ClipboardList className="w-3.5 h-3.5" />
                    </div>
                    <span>چک‌لیست راه‌اندازی و آزمون اولیه سیستم</span>
                  </div>
                  <ArrowLeft className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[11px] text-slate-400 font-semibold pt-6 mt-4">
            پشتیبانی و راهنمایی: در صورت فراموشی رمز عبور با مدیر ارشد سیستم تماس بگیرید.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
export default LoginPage;
