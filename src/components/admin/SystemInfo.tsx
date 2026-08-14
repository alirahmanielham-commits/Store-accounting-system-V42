import React, { useState, useEffect } from 'react';
import { Server, Database, HardDrive, Cpu, Activity, Hash, Code, Info, Monitor, Clock, Cloud } from 'lucide-react';
import { toPersianDigits } from '../../utils/format';

export default function SystemInfo() {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [sysInfo, setSysInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/setup/status').then(res => res.json()),
      fetch('/api/system/info').then(res => res.json())
    ])
      .then(([dbData, sysData]) => {
        setDbStatus(dbData);
        setSysInfo(sysData);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d} روز`);
    if (h > 0) parts.push(`${h} ساعت`);
    if (m > 0) parts.push(`${m} دقیقه`);
    return parts.join(' و ') || 'کمتر از یک دقیقه';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]" dir="rtl">
         <div className="flex flex-col items-center gap-4 text-slate-500">
           <Activity className="w-8 h-8 animate-pulse text-indigo-500" />
           <p className="font-bold animate-pulse">در حال دریافت اطلاعات سیستم...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-10 font-sans max-w-6xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 mb-2 flex items-center gap-3">
          <Server className="w-8 h-8 text-indigo-500" />
          جزئیات سیستم
        </h1>
        <p className="text-slate-500 text-sm font-bold">
          مشخصات فنی سخت‌افزار سرور و نسخه‌های سرویس‌های در حال اجرا
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold mb-1">نسخه اپلیکیشن</p>
              <h3 className="text-base font-black text-slate-800" dir="ltr">v2.4.1</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold mb-1">پایگاه داده</p>
              <h3 className="text-base font-black text-slate-800">
                {dbStatus?.usingEnvVars ? 'PostgreSQL' : 'SQLite'}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold mb-1">محیط اجرا (Node)</p>
              <h3 className="text-base font-black text-slate-800" dir="ltr">{sysInfo?.nodeVersion || 'نامشخص'}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold mb-1">آپتایم سرور</p>
              <h3 className="text-base font-black text-slate-800">
                {sysInfo?.uptime ? formatUptime(sysInfo.uptime) : 'نامشخص'}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-16 bg-slate-50 rounded-bl-[100px] -z-10"></div>
           <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
             <Monitor className="w-6 h-6 text-indigo-500" />
             مشخصات سخت‌افزاری سرور
           </h2>
           <div className="space-y-4 font-bold text-sm text-slate-600">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                 <span className="flex items-center gap-2"><Cloud className="w-4 h-4 text-slate-400" /> سیستم‌عامل:</span>
                 <span className="text-slate-900 font-black" dir="ltr">{sysInfo?.platform} ({sysInfo?.arch})</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                 <span className="flex items-center gap-2"><Cpu className="w-4 h-4 text-slate-400" /> تعداد هسته پردازشی (CPU):</span>
                 <span className="text-slate-900 font-black">{sysInfo?.cpus ? toPersianDigits(sysInfo.cpus) : '-'} هسته</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                 <span className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-slate-400" /> کل حافظه (RAM):</span>
                 <span className="text-slate-900 font-black" dir="ltr">{sysInfo?.totalMem ? formatBytes(sysInfo.totalMem) : '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                 <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-slate-400" /> حافظه آزاد (RAM):</span>
                 <span className="text-slate-900 font-black" dir="ltr">{sysInfo?.freeMem ? formatBytes(sysInfo.freeMem) : '-'}</span>
              </div>
           </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
           <div className="absolute top-0 left-0 p-16 bg-indigo-50/50 rounded-br-[100px] -z-10"></div>
           <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
             <Info className="w-6 h-6 text-indigo-500" />
             درباره سیستم
           </h2>
           
           <div className="prose prose-slate max-w-none text-sm font-medium leading-relaxed">
             <p>
               این سیستم یک نرم‌افزار جامع مدیریت مالی، حسابداری، و انبارداری است که برای مدیریت بهینه 
               فروشگاه‌ها و شرکت‌های بازرگانی طراحی شده است. معماری این سیستم به گونه‌ای است که 
               می‌تواند هم به صورت لوکال با استفاده از SQLite و هم به صورت توزیع‌شده و با استفاده از پایگاه 
               داده PostgreSQL در محیط‌های ابری اجرا شود.
             </p>
             <ul className="mt-4 space-y-2 list-disc list-inside text-slate-700">
               <li>رابط کاربری مدرن با استفاده از Tailwind CSS</li>
               <li>سیستم بک‌اند مبتنی بر Node.js / Express</li>
               <li>قابلیت‌های حسابداری دوبل و مدیریت چند شعبه</li>
               <li>پشتیبانی از چاپگرهای حرارتی، A4 و A5</li>
               <li>تطبیق لحظه‌ای با پایگاه داده و قابلیت پشتیبان‌گیری سریع</li>
             </ul>
           </div>
        </div>
      </div>
      
    </div>
  );
}
