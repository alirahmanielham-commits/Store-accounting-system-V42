import React from "react";
import {
  Smartphone,
  ShieldAlert,
  Download,
  Laptop,
  Lock,
  Server,
  ShieldCheck,
  Ban,
  CheckCircle2,
} from "lucide-react";

export default function MobileRestrictedAccess() {
  return (
    <div
      className="fixed inset-0 z-[999999] bg-slate-950 text-white flex flex-col items-center justify-between p-6 overflow-y-auto font-sans select-none"
      dir="rtl"
    >
      {/* Top Brand & Security Status Bar */}
      <div className="w-full max-w-sm flex items-center justify-between pt-2 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/30 text-sm">
            ت
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs font-black text-white">سامانه یکپارچه مالی تراز</span>
            <span className="text-[10px] text-slate-400 font-bold">نسخه آنلاین ابری</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          <span>قفل سخت‌افزاری همراه</span>
        </div>
      </div>

      {/* Main Lock Content */}
      <div className="w-full max-w-sm flex flex-col items-center text-center my-auto py-6">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-600 via-rose-700 to-indigo-900 text-white flex items-center justify-center mx-auto shadow-2xl shadow-rose-600/30 relative">
            <Smartphone className="w-12 h-12 text-rose-100" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-2xl bg-slate-900 text-amber-400 border-2 border-slate-800 flex items-center justify-center shadow-lg">
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        <h2 className="text-lg font-black text-white mb-2 leading-snug">
          دسترسی مرورگر موبایل غیرفعال است
        </h2>

        {/* Highlighted Warning Box for Desktop Mode */}
        <div className="w-full p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-right mb-4">
          <div className="flex items-center gap-2 text-rose-300 font-black text-xs mb-1">
            <Ban className="w-4 h-4 text-rose-400 shrink-0" />
            <span>مسدودسازی حتی در حالت Desktop Site</span>
          </div>
          <p className="text-[11px] text-rose-200/80 font-medium leading-relaxed">
            بر اساس پایش سخت‌افزاری پردازنده و حسگرهای لمسی، تغییر مرورگر به حالت «دسکتاپ سایت» (Desktop Mode) نیز شناسایی و مسدود می‌گردد.
          </p>
        </div>

        <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6 max-w-xs">
          برای حفظ امنیت کامل داده‌ها، ثبت اسناد فقط از طریق <strong className="text-white font-black">اپلیکیشن اختصاصی همراه (Mobile App)</strong> یا مرورگر رایانه (دسکتاپ واقعی) امکان‌پذیر است.
        </p>

        {/* Primary Action Card: Mobile App */}
        <div className="w-full p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 text-right shadow-xl mb-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white">اپلیکیشن اختصاصی همراه (Mobile App)</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">اتصال زنده آنلاین به API سرور</p>
              </div>
            </div>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              مجاز
            </span>
          </div>

          <p className="text-[11px] text-slate-300 font-medium leading-relaxed mb-3">
            برای ثبت فاکتور، رسید، استعلام قیمت و دریافت گزارشات در موبایل، اپلیکیشن همراه را نصب فرمایید.
          </p>

          <a
            href="/api/v1/mobile/download"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 text-center cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>دانلود و نصب اپلیکیشن همراه</span>
          </a>
        </div>

        {/* Secondary Info Card: Desktop PC */}
        <div className="w-full p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800 text-right flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
            <Laptop className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-200">دسترسی از رایانه (دسکتاپ واقعی)</h4>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              نسخه وب‌سامانه فقط با رایانه و لپ‌تاپ قابل دسترسی می‌باشد.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="w-full max-w-sm pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>پایش امنیتی سخت‌افزاری فعال است</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 font-mono">
          <Server className="w-3 h-3 text-slate-500" />
          <span>API v1.0 Online</span>
        </div>
      </div>
    </div>
  );
}
