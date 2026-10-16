import React from "react";
import {
  Smartphone,
  ShieldAlert,
  Download,
  Laptop,
  Lock,
  ExternalLink,
  CheckCircle2,
  Server,
  Key,
} from "lucide-react";

interface MobileRestrictedAccessProps {
  currentTab?: string;
  setActiveTab?: (tab: string) => void;
}

export default function MobileRestrictedAccess({}: MobileRestrictedAccessProps) {
  return (
    <div
      className="min-h-[80vh] flex flex-col items-center justify-center p-5 max-w-md mx-auto text-center select-none py-12"
      dir="rtl"
    >
      {/* Central Lock Icon & Banner */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-rose-600/30">
          <Smartphone className="w-10 h-10" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-900 text-amber-400 border-2 border-white flex items-center justify-center shadow-md">
          <Lock className="w-4 h-4" />
        </div>
      </div>

      {/* Security Tag */}
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black mb-3 shadow-3xs">
        <ShieldAlert className="w-4 h-4 text-rose-600" />
        <span>دسترسی مرورگر همراه غیرفعال است</span>
      </div>

      {/* Main Title */}
      <h2 className="text-lg font-black text-slate-900 mb-2 leading-snug">
        ورود از مرورگر موبایل غیرفعال می‌باشد
      </h2>

      {/* Description */}
      <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6 max-w-sm">
        جهت حفظ امنیت حساب‌ها، جلوگیری از بروز خطاهای داده‌ای و انطباق با سیاست‌های امنیتی، دسترسی مستقیم مرورگر وب در موبایل مسدود شده است. ارتباط همراه صرفاً از طریق <strong className="text-slate-900 font-black">اپلیکیشن اختصاصی همراه (Mobile App)</strong> امکان‌پذیر است.
      </p>

      {/* Action Cards */}
      <div className="w-full space-y-3.5 text-right mb-6">
        {/* Card 1: Mobile App */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md border border-indigo-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white">دانلود و نصب اپلیکیشن همراه</h4>
                <p className="text-[10px] text-indigo-200/80 mt-0.5">ارتباط مستقیم آنلاین با دیتابیس سیستم</p>
              </div>
            </div>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              API آنلاین
            </span>
          </div>
          <p className="text-[11px] text-indigo-100/90 font-medium leading-relaxed mb-3">
            با نصب اپلیکیشن همراه، می‌توانید با احراز هویت توکن JWT و شناسه دستگاه، به فرم‌های مجاز دسترسی داشته باشید.
          </p>
          <a
            href="/api/v1/mobile/download"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm text-center"
          >
            <Download className="w-3.5 h-3.5" />
            <span>دانلود فایل اپلیکیشن همراه (Android / iOS PWA)</span>
          </a>
        </div>

        {/* Card 2: Desktop PC Access */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">استفاده از رایانه (دسکتاپ)</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">برای دسترسی به تمام امکانات وب‌سامانه</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            برای ثبت اسناد کامل حسابداری، انبارگردانی، گزارشات کلان و مدیریت سیستم از رایانه استفاده فرمایید.
          </p>
        </div>
      </div>

      {/* Security Footer Note */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
        <Server className="w-3.5 h-3.5 text-slate-400" />
        <span>درگاه API همراه فعال و تحت نظر مدیریت سیستم می‌باشد</span>
      </div>
    </div>
  );
}
