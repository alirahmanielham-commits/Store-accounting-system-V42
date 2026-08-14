import React from 'react';
import { User, UserPreferences } from '../../../../types';
import { Moon, Sun, Monitor, Bell, Layout } from 'lucide-react';

interface Props {
  data: User;
  onChange: (data: User) => void;
}

export default function TabPreferences({ data, onChange }: Props) {
  const prefs = data.preferences || {
    theme: 'system',
    language: 'fa',
    timezone: 'Asia/Tehran',
    notifications: { email: true, sms: false, inApp: true },
    accessibility: { highContrast: false, fontSize: 'medium' }
  } as UserPreferences;

  const updatePrefs = (field: keyof UserPreferences, value: any) => {
    onChange({
      ...data,
      preferences: { ...prefs, [field]: value }
    });
  };

  const updateNotifications = (field: keyof typeof prefs.notifications, value: boolean) => {
    onChange({
      ...data,
      preferences: {
        ...prefs,
        notifications: { ...prefs.notifications, [field]: value }
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Theme & Display */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <Layout className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="font-bold text-slate-800">ظاهر برنامه (پوسته)</h3>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'light', label: 'حالت روشن', icon: Sun },
            { id: 'dark', label: 'حالت تاریک', icon: Moon },
            { id: 'system', label: 'خودکار (سیستم)', icon: Monitor },
          ].map(theme => (
            <button
              key={theme.id}
              onClick={() => updatePrefs('theme', theme.id)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 \${
                prefs.theme === theme.id 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 text-slate-600'
              }`}
            >
              <theme.icon className={`w-6 h-6 \${prefs.theme === theme.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="font-bold text-sm">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <Bell className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="font-bold text-slate-800">اعلان‌ها و نوتیفیکیشن‌ها</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
            <div>
              <div className="font-bold text-slate-700 text-sm">اعلان‌های درون برنامه‌ای</div>
              <div className="text-xs text-slate-500 mt-1">نمایش پیام‌ها در نوار بالای داشبورد</div>
            </div>
            <input 
              type="checkbox" 
              checked={prefs.notifications?.inApp}
              onChange={e => updateNotifications('inApp', e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
            />
          </label>
          
          <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
            <div>
              <div className="font-bold text-slate-700 text-sm">ایمیل اطلاع‌رسانی</div>
              <div className="text-xs text-slate-500 mt-1">دریافت گزارش‌های روزانه و پیام‌های مهم در ایمیل</div>
            </div>
            <input 
              type="checkbox" 
              checked={prefs.notifications?.email}
              onChange={e => updateNotifications('email', e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
            <div>
              <div className="font-bold text-slate-700 text-sm">پیامک (SMS)</div>
              <div className="text-xs text-slate-500 mt-1">دریافت کد تایید ورود و هشدار‌های امنیتی از طریق پیامک</div>
            </div>
            <input 
              type="checkbox" 
              checked={prefs.notifications?.sms}
              onChange={e => updateNotifications('sms', e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
