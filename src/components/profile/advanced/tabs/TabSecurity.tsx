import React from 'react';
import { User } from '../../../../types';
import { Shield, Key, Smartphone, AlertTriangle, LogOut, Monitor } from 'lucide-react';

interface Props {
  data: User;
  onChange: (data: User) => void;
}

export default function TabSecurity({ data, onChange }: Props) {
  
  const toggle2FA = () => {
    onChange({
      ...data,
      requires2FA: !data.requires2FA,
      security: {
        ...(data.security || {}),
        twoFactorEnabled: !data.requires2FA
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Password Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="font-bold text-slate-800">تغییر رمز عبور</h3>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">رمز عبور جدید</label>
            <input
              type="text"
              value={data.password || ''}
              onChange={e => onChange({ ...data, password: e.target.value })}
              className="w-full bg-slate-50 border border-transparent rounded-xl py-3 px-4 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-mono text-slate-700 outline-none transition-all"
              dir="ltr"
              placeholder="جهت تغییر، رمز جدید را وارد کنید..."
            />
          </div>
          {data.password && data.password.length < 6 && (
            <div className="text-xs font-bold text-rose-500 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> رمز عبور باید حداقل ۶ کاراکتر باشد.
            </div>
          )}
        </div>
      </div>

      {/* 2FA */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 flex items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${data.requires2FA || data.security?.twoFactorEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">احراز هویت دو مرحله‌ای (2FA)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md">
                با فعال‌سازی این قابلیت، هنگام ورود به حساب علاوه بر رمز عبور، به کد پیامک شده به شماره موبایل شما نیاز خواهد بود.
              </p>
            </div>
          </div>
          <button
            onClick={toggle2FA}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none transition-colors duration-300 ease-in-out ${data.requires2FA || data.security?.twoFactorEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className="sr-only">استفاده از 2FA</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute h-6 w-6 rounded-full bg-white shadow transform ring-0 transition-transform duration-300 ease-in-out ${data.requires2FA || data.security?.twoFactorEnabled ? '-translate-x-3' : 'translate-x-3'}`}
            />
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="font-bold text-slate-800">نشست‌های فعال</h3>
            </div>
          </div>
        </div>
        <div className="p-0">
          <div className="p-4 flex items-center justify-between border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-700 text-sm flex items-center">Windows 11 - Chrome <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mr-2">هم‌اکنون (Current)</span></div>
                <div className="text-xs text-slate-400 mt-1 font-mono" dir="ltr">IP: 192.168.1.100 • Tehran, IR</div>
              </div>
            </div>
          </div>
          <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 text-slate-500 rounded-xl">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-700 text-sm">iPhone 14 Pro - Safari</div>
                <div className="text-xs text-slate-400 mt-1 font-mono" dir="ltr">IP: 85.110.23.12 • Last active: 2 hours ago</div>
              </div>
            </div>
            <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="خروج از این دستگاه">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
