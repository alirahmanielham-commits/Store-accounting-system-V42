import React, { useState, useEffect } from 'react';
import { Save, Settings, Percent, AlertCircle, Shield, FileText } from 'lucide-react';
import { getStoreSettings, saveStoreSettings, addSystemLog } from '../../services/dataService';
import { CompanySettings } from '../../types';

interface LoansSettingsProps {
  showNotification: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  userRole?: string;
}

export default function LoansSettings({ showNotification, userRole }: LoansSettingsProps) {
  const [settings, setSettings] = useState<any>({
    defaultInterestRate: 18,
    lateFeePenaltyRate: 2,
    calculationMethod: 'simple',
    requireApproval: true,
    allowedRoles: ['admin', 'manager', 'accountant']
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storeSettings = await getStoreSettings();
        if (storeSettings && (storeSettings as any).loanSettings) {
          setSettings((storeSettings as any).loanSettings);
        }
      } catch (err) {
        console.error("Error loading settings", err);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (userRole !== 'admin' && userRole !== 'manager') {
       showNotification('شما دسترسی لازم برای تغییر تنظیمات را ندارید.', 'error');
       return;
    }

    setIsLoading(true);
    try {
      const storeSettings = await getStoreSettings() || { companyName: '', email: '', phone: '', address: '', printPaperSize: 'A4', printHasHeader: true, printHasFooter: true, taxId: '', registrationNumber: '', website: '' } as CompanySettings;
      
      const newSettings = { ...storeSettings, loanSettings: settings };
      await saveStoreSettings(newSettings as any);
      
      if (typeof addSystemLog !== 'undefined') {
         await addSystemLog('UPDATE_LOAN_SETTINGS', 'بروزرسانی تنظیمات ماژول وام و تسهیلات', 'Settings', 'loan_settings');
      }
      showNotification('تنظیمات با موفقیت ذخیره شد.', 'success');
    } catch (err: any) {
      showNotification(err.message || 'خطا در ذخیره تنظیمات', 'error');
    }
    setIsLoading(false);
  };

  const handleRoleToggle = (role: string) => {
    const roles = [...settings.allowedRoles];
    if (roles.includes(role)) {
       setSettings({ ...settings, allowedRoles: roles.filter(r => r !== role) });
    } else {
       setSettings({ ...settings, allowedRoles: [...roles, role] });
    }
  };

  if (userRole !== 'admin' && userRole !== 'manager') {
     return (
       <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex items-center gap-4 text-rose-700">
          <Shield className="w-8 h-8" />
          <div>
            <h3 className="font-black text-lg">عدم دسترسی</h3>
            <p className="text-sm mt-1">شما مجوز لازم برای مشاهده یا ویرایش تنظیمات این ماژول را ندارید.</p>
          </div>
       </div>
     );
  }

  return (
    <div className="space-y-6">
       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gray-100 text-gray-700 rounded-2xl flex items-center justify-center shrink-0">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">تنظیمات ماژول وام</h2>
            <p className="text-sm text-gray-500 mt-1">پیکربندی پیش‌فرض‌ها، جریمه‌ها و دسترسی‌های کاربران</p>
          </div>
        </div>
        <button 
           onClick={handleSave}
           disabled={isLoading}
           className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-sm"
        >
           <Save className="w-5 h-5" />
           {isLoading ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Financial Parameters */}
         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-4">
              <Percent className="w-5 h-5 text-indigo-500" />
              پارامترهای مالی پیش‌فرض
            </h3>
            
            <div className="space-y-4">
               <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">نرخ سود پیش‌فرض (درصد سالانه)</label>
                  <input 
                     type="number" 
                     value={settings.defaultInterestRate} 
                     onChange={(e) => setSettings({...settings, defaultInterestRate: Number(e.target.value)})}
                     className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
                     dir="ltr"
                  />
                  <p className="text-xs text-gray-500 mt-1">هنگام ثبت وام جدید، این عدد به صورت پیش‌فرض در فرم قرار می‌گیرد.</p>
               </div>

               <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">نرخ جریمه دیرکرد (درصد ماهانه)</label>
                  <input 
                     type="number" 
                     value={settings.lateFeePenaltyRate} 
                     onChange={(e) => setSettings({...settings, lateFeePenaltyRate: Number(e.target.value)})}
                     className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
                     dir="ltr"
                  />
                  <p className="text-xs text-gray-500 mt-1">جریمه برای اقساطی که از تاریخ سررسید آنها گذشته است محاسبه می‌شود.</p>
               </div>

               <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">روش محاسبه اقساط</label>
                  <select 
                     value={settings.calculationMethod}
                     onChange={(e) => setSettings({...settings, calculationMethod: e.target.value})}
                     className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 outline-none transition-all"
                  >
                     <option value="simple">سود ساده (مانده ثابت)</option>
                     <option value="compound">سود مرکب (کاهشی)</option>
                     <option value="balloon">پرداخت بالونی (سود ماهانه، اصل در پایان)</option>
                  </select>
               </div>
            </div>
         </div>

         {/* Workflow & Access */}
         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-4">
              <Shield className="w-5 h-5 text-rose-500" />
              گردش کار و کنترل دسترسی
            </h3>
            
            <div className="space-y-6">
               <label className="flex items-start gap-3 cursor-pointer p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                  <input 
                     type="checkbox" 
                     checked={settings.requireApproval}
                     onChange={(e) => setSettings({...settings, requireApproval: e.target.checked})}
                     className="w-5 h-5 text-indigo-600 rounded mt-0.5"
                  />
                  <div>
                     <p className="font-bold text-gray-800">نیاز به تأیید مدیریت (Approval Workflow)</p>
                     <p className="text-xs text-gray-500 mt-1">اگر فعال باشد، وام‌های جدید در وضعیت «پیش‌نویس» ثبت شده و نیاز به تأیید مدیر دارند تا فعال شوند و سند حسابداری آن‌ها صادر گردد.</p>
                  </div>
               </label>

               <div>
                  <label className="text-sm font-bold text-gray-700 mb-3 block">نقش‌های مجاز برای ویرایش و ابطال وام</label>
                  <div className="space-y-2">
                     {[
                        { id: 'admin', label: 'مدیر سیستم (Admin)' },
                        { id: 'manager', label: 'مدیر مالی (Manager)' },
                        { id: 'accountant', label: 'حسابدار (Accountant)' },
                        { id: 'cashier', label: 'صندوق‌دار (Cashier)' },
                     ].map(role => (
                        <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                           <input 
                              type="checkbox"
                              checked={settings.allowedRoles.includes(role.id)}
                              onChange={() => handleRoleToggle(role.id)}
                              className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                           />
                           <span className="text-sm text-gray-700">{role.label}</span>
                        </label>
                     ))}
                  </div>
               </div>
               
               <div className="p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">این تنظیمات در کل سیستم اعمال می‌شود. حسابداران فقط می‌توانند گزارشات را مشاهده کرده و اقساط را دریافت کنند، مگر آنکه دسترسی ویرایش به آنها داده شود.</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
