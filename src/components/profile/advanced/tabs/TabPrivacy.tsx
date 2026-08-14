import React from 'react';
import { User, UserPrivacyLevel } from '../../../../types';
import { Eye, Shield, Users, Lock, Download, Trash2, AlertTriangle } from 'lucide-react';

interface Props {
  data: User;
  onChange: (data: User) => void;
}

export default function TabPrivacy({ data, onChange }: Props) {
  const privacySettings = data.profile?.privacySettings || {
    email: 'private',
    phone: 'private',
    location: 'public',
    socialLinks: 'public',
    skills: 'public',
    experience: 'public'
  };

  const updatePrivacy = (field: string, level: UserPrivacyLevel) => {
    onChange({
      ...data,
      profile: {
        ...data.profile,
        privacySettings: {
          ...privacySettings,
          [field]: level
        }
      }
    });
  };

  const privacyOptions = [
    { value: 'public', label: 'عمومی (همه)', icon: Eye },
    { value: 'contacts_only', label: 'فقط مخاطبین', icon: Users },
    { value: 'private', label: 'فقط خودم', icon: Lock },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="font-bold text-slate-800">حریم خصوصی و نمایش اطلاعات</h3>
            <p className="text-xs text-slate-500 mt-1">تعیین کنید چه کسانی می‌توانند اطلاعات پروفایل شما را ببینند.</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[
            { id: 'email', label: 'آدرس ایمیل', desc: 'نمایش آدرس ایمیل به سایر کاربران' },
            { id: 'phone', label: 'شماره تماس', desc: 'نمایش شماره موبایل ثبت شده' },
            { id: 'location', label: 'موقعیت مکانی', desc: 'نمایش شهر و کشور محل سکونت' },
            { id: 'socialLinks', label: 'لینک‌های شبکه‌های اجتماعی', desc: 'نمایش لینک‌های لینکدین و...' },
            { id: 'skills', label: 'مهارت‌ها', desc: 'نمایش لیست مهارت‌ها و تخصص‌ها' },
            { id: 'experience', label: 'سوابق شغلی و تحصیلی', desc: 'نمایش رزومه و تجربیات' },
          ].map(item => (
            <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
              <div>
                <div className="font-bold text-slate-700 text-sm">{item.label}</div>
                <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
              </div>
              <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                {privacyOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updatePrivacy(item.id, opt.value as UserPrivacyLevel)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      (privacySettings as any)[item.id] === opt.value
                        ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <opt.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <Download className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="font-bold text-slate-800">دریافت اطلاعات (Data Export)</h3>
            <p className="text-xs text-slate-500 mt-1">مطابق با قوانین حریم خصوصی (GDPR)، شما می‌توانید نسخه‌ای از تمام اطلاعات خود را دانلود کنید.</p>
          </div>
        </div>
        <div className="p-6">
          <button className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> درخواست فایل خروجی اطلاعات (JSON)
          </button>
        </div>
      </div>

      <div className="bg-rose-50 rounded-3xl border border-rose-100 overflow-hidden">
        <div className="p-5 border-b border-rose-100 bg-rose-100/50 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          <div>
            <h3 className="font-bold text-rose-800">حذف حساب کاربری</h3>
            <p className="text-xs text-rose-600 mt-1">این عملیات غیرقابل بازگشت است و تمام اطلاعات شما برای همیشه پاک خواهد شد.</p>
          </div>
        </div>
        <div className="p-6 flex items-center justify-between">
          <p className="text-sm font-medium text-rose-700 max-w-md">در صورت حذف حساب کاربری، تمامی اطلاعات هویتی، پیام‌ها و تنظیمات شما از سرورها پاک شده و قابل بازیابی نخواهند بود.</p>
          <button className="px-6 py-3 bg-white text-rose-600 font-bold rounded-xl border border-rose-200 hover:bg-rose-600 hover:text-white transition-colors flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> درخواست حذف حساب
          </button>
        </div>
      </div>
    </div>
  );
}
