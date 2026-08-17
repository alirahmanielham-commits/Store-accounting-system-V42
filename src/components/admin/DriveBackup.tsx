import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, RefreshCw, UploadCloud, HardDrive, Download, 
  Trash2, Shield, Calendar, Settings, FileText, CheckCircle, 
  AlertTriangle, XCircle, Search, Save, FolderOpen, Mail, Key,
  Upload, Check, Play, Clock, Server, Eye, ToggleLeft, ToggleRight
} from 'lucide-react';

interface LocalBackupProps {
  showNotification: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function DriveBackup({ showNotification }: LocalBackupProps) {
  const [activeTab, setActiveTab] = useState('manual');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  
  // Dummy Initial Data
  const [backups, setBackups] = useState([
    { id: '1', date: '1402/11/15', time: '14:30:00', size: '12.5 MB', type: 'Full', status: 'success' },
    { id: '2', date: '1402/11/14', time: '02:00:00', size: '12.2 MB', type: 'Full', status: 'success' },
    { id: '3', date: '1402/11/13', time: '15:45:00', size: '4.1 MB', type: 'Incremental', status: 'error' },
  ]);

  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: true,
    frequency: 'daily',
    time: '02:00',
    retention: 5,
    cron: '0 2 * * *'
  });

  const [storageConfig, setStorageConfig] = useState({
    type: 'local',
    localPath: 'D:/Backups/MyApp',
    cloudProvider: 'google_drive',
    cloudAuthUrl: ''
  });

  const [securityConfig, setSecurityConfig] = useState({
    encrypt: true,
    password: '',
    emailNotify: true,
    emailAddress: 'admin@example.com'
  });

  // Manual Backup Action
  const handleImmediateBackup = () => {
    setIsBackingUp(true);
    setBackupProgress(0);
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBackingUp(false);
          showNotification('بک‌آپ با موفقیت تهیه شد', 'success');
          setBackups([{ 
            id: Date.now().toString(), 
            date: new Intl.DateTimeFormat('fa-IR').format(new Date()), 
            time: new Date().toLocaleTimeString('fa-IR'), 
            size: '12.8 MB', 
            type: 'Full', 
            status: 'success' 
          }, ...backups]);
          return 100;
        }
        return prev + 15;
      });
    }, 500);
  };

  const tabs = [
    { id: 'manual', label: 'بک‌آپ دستی', icon: Database },
    { id: 'schedule', label: 'زمان‌بندی', icon: Calendar },
    { id: 'storage', label: 'مسیر ذخیره‌سازی', icon: HardDrive },
    { id: 'restore', label: 'بازیابی', icon: RefreshCw },
    { id: 'security', label: 'امنیت و اعلان', icon: Shield }
  ];

  return (
    <div className="bg-slate-50 min-h-full rounded-3xl p-6 md:p-8" dir="rtl">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Database className="w-8 h-8 text-indigo-600" />
          مدیریت پایگاه داده و نسخه‌های پشتیبان
        </h2>
        <p className="text-slate-500 font-medium mt-2 text-sm">
          تنظیمات بک‌آپ‌گیری، بازیابی اطلاعات و مدیریت فضاهای ذخیره‌سازی سیستم
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="xl:w-64 flex-shrink-0 flex xl:flex-col gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${
                activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                : 'bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-100' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* --- 1. Manual Backup --- */}
              {activeTab === 'manual' && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
                    <div className="flex-1 space-y-4">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Play className="w-5 h-5 text-indigo-500" />
                        تهیه بک‌آپ فوری
                      </h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        همین حالا از کل پایگاه داده خود یک نسخه پشتیبان تهیه کنید. بسته به حجم داده‌ها این عملیات ممکن است چند دقیقه زمان ببرد.
                      </p>
                      
                      <div className="flex flex-wrap gap-4 pt-2">
                         <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                            <input type="radio" id="b_full" name="b_type" defaultChecked className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                            <label htmlFor="b_full" className="text-sm font-bold text-slate-700 cursor-pointer">کامل (Full)</label>
                         </div>
                         <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-3 bg-slate-50 opacity-60">
                            <input type="radio" id="b_inc" name="b_type" disabled className="w-4 h-4" />
                            <label htmlFor="b_inc" className="text-sm font-bold text-slate-700 cursor-not-allowed">افزایشی (به‌زودی)</label>
                         </div>
                      </div>

                      <div className="pt-4">
                        <button 
                          onClick={handleImmediateBackup}
                          disabled={isBackingUp}
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-wait"
                        >
                          {isBackingUp ? (
                            <><RefreshCw className="w-5 h-5 animate-spin" /> در حال پردازش...</>
                          ) : (
                            <><Database className="w-5 h-5" /> شروع عملیات بک‌آپ</>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Status Card */}
                    <div className="w-full md:w-72 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Database className="w-24 h-24" />
                       </div>
                       <h4 className="text-slate-400 font-bold text-xs mb-1 relative z-10">آخرین بک‌آپ موفق</h4>
                       <div className="text-2xl font-black mb-4 relative z-10" dir="ltr">{backups[0]?.date || '-'}</div>
                       
                       <div className="space-y-2 relative z-10">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">ساعت:</span>
                            <span className="font-bold">{backups[0]?.time || '-'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">حجم:</span>
                            <span className="font-bold text-emerald-400">{backups[0]?.size || '-'}</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {isBackingUp && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                      <div className="flex justify-between text-sm font-bold text-indigo-700 mb-2">
                        <span>در حال فشرده‌سازی پایگاه داده...</span>
                        <span>{Math.round(backupProgress)}%</span>
                      </div>
                      <div className="h-2 bg-indigo-200 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-indigo-600 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${backupProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- 2. Schedule Backup --- */}
              {activeTab === 'schedule' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        زمان‌بندی خودکار
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        سیستم به طور خودکار در بازه‌های تعیین شده بک‌آپ‌گیری می‌کند.
                      </p>
                    </div>
                    <button 
                      onClick={() => setScheduleConfig({...scheduleConfig, enabled: !scheduleConfig.enabled})}
                      className={`p-1.5 rounded-full transition-colors flex items-center gap-2 px-4 py-2 font-bold text-sm ${
                        scheduleConfig.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {scheduleConfig.enabled ? 'فعال است' : 'غیرفعال'}
                      {scheduleConfig.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>

                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${scheduleConfig.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">دوره تناوب</label>
                        <select 
                          value={scheduleConfig.frequency}
                          onChange={e => setScheduleConfig({...scheduleConfig, frequency: e.target.value})}
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-sm font-bold"
                        >
                          <option value="daily">روزانه</option>
                          <option value="weekly">هفتگی</option>
                          <option value="monthly">ماهانه</option>
                          <option value="custom">سفارشی (Cron)</option>
                        </select>
                      </div>

                      {scheduleConfig.frequency === 'custom' ? (
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
                            <span>عبارت Cron</span>
                            <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded cursor-help" title="مثال: 0 2 * * * برای ساعت 2 بامداد هر روز">راهنما</span>
                          </label>
                          <input 
                            type="text" 
                            dir="ltr"
                            value={scheduleConfig.cron}
                            onChange={e => setScheduleConfig({...scheduleConfig, cron: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-sm font-mono font-bold text-left" 
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">ساعت اجرا</label>
                          <input 
                            type="time" 
                            value={scheduleConfig.time}
                            onChange={e => setScheduleConfig({...scheduleConfig, time: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-sm font-bold" 
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                         <h4 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                           <Trash2 className="w-4 h-4 text-rose-500" />
                           سیاست نگهداری (Retention Policy)
                         </h4>
                         <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">
                           برای جلوگیری از پر شدن دیسک، سیستم می‌تواند نسخه‌های قدیمی را به‌طور خودکار پاک کند.
                         </p>
                         <label className="block text-sm font-bold text-slate-700 mb-2">تعداد نسخه‌های نگهداری شده</label>
                         <input 
                            type="number" 
                            min="1"
                            max="365"
                            value={scheduleConfig.retention}
                            onChange={e => setScheduleConfig({...scheduleConfig, retention: Number(e.target.value)})}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-sm font-bold" 
                          />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
                      <Save className="w-4 h-4" /> ذخیره زمان‌بندی
                    </button>
                  </div>
                </div>
              )}

              {/* --- 3. Storage Settings --- */}
              {activeTab === 'storage' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-indigo-500" />
                      مسیر ذخیره‌سازی
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div 
                        onClick={() => setStorageConfig({...storageConfig, type: 'local'})}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                          storageConfig.type === 'local' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'
                        }`}
                     >
                        <Server className={`w-8 h-8 mb-3 ${storageConfig.type === 'local' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <h4 className="text-base font-black text-slate-800 mb-1">سرور محلی (Local)</h4>
                        <p className="text-xs text-slate-500 font-medium mb-4">ذخیره روی هارد دیسک سرور فعلی</p>
                        
                        {storageConfig.type === 'local' && (
                          <div className="space-y-2 mt-4" onClick={e => e.stopPropagation()}>
                            <label className="block text-xs font-bold text-slate-700">مسیر پوشه</label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                dir="ltr"
                                value={storageConfig.localPath}
                                onChange={e => setStorageConfig({...storageConfig, localPath: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-indigo-500 text-left" 
                              />
                              <button className="px-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                                <FolderOpen className="w-4 h-4 text-slate-600" />
                              </button>
                            </div>
                            <div className="flex justify-between items-center mt-2 text-xs font-bold">
                              <span className="text-slate-500">فضای آزاد:</span>
                              <span className="text-emerald-600">45 GB</span>
                            </div>
                          </div>
                        )}
                     </div>

                     <div 
                        onClick={() => setStorageConfig({...storageConfig, type: 'cloud'})}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                          storageConfig.type === 'cloud' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'
                        }`}
                     >
                        <UploadCloud className={`w-8 h-8 mb-3 ${storageConfig.type === 'cloud' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <h4 className="text-base font-black text-slate-800 mb-1">فضای ابری (Cloud)</h4>
                        <p className="text-xs text-slate-500 font-medium mb-4">ذخیره در Google Drive یا S3</p>
                        
                        {storageConfig.type === 'cloud' && (
                          <div className="space-y-4 mt-4" onClick={e => e.stopPropagation()}>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">سرویس‌دهنده</label>
                              <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500">
                                <option value="gdrive">Google Drive</option>
                                <option value="s3">Amazon S3 Compatible</option>
                                <option value="ftp">FTP Server</option>
                              </select>
                            </div>
                            <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors">
                              احراز هویت و اتصال به حساب
                            </button>
                          </div>
                        )}
                     </div>
                  </div>
                  
                  <div className="pt-4 text-left">
                    <button className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 inline-flex">
                      <Save className="w-4 h-4" /> اعمال تنظیمات مسیر
                    </button>
                  </div>
                </div>
              )}

              {/* --- 4. Restore --- */}
              {activeTab === 'restore' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-indigo-500" />
                        بازیابی اطلاعات
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        بازیابی از نسخه‌های قبلی. توجه: اطلاعات فعلی جایگزین خواهند شد.
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-sm">
                      <Upload className="w-4 h-4" /> آپلود فایل بک‌آپ خارجی
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50 text-slate-600 font-black text-xs border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">تاریخ و زمان</th>
                            <th className="px-4 py-3">حجم</th>
                            <th className="px-4 py-3">نوع بک‌آپ</th>
                            <th className="px-4 py-3">وضعیت</th>
                            <th className="px-4 py-3 text-center">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {backups.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-700" dir="ltr">
                                {b.date} - {b.time}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-600" dir="ltr">{b.size}</td>
                              <td className="px-4 py-3 font-bold text-slate-600">{b.type}</td>
                              <td className="px-4 py-3">
                                {b.status === 'success' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">
                                    <CheckCircle className="w-3 h-3" /> موفق
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-1 rounded-md">
                                    <XCircle className="w-3 h-3" /> خطا
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 flex justify-center gap-2">
                                <button title="دانلود فایل" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                  <Download className="w-4 h-4" />
                                </button>
                                <button title="حذف" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    if(confirm('هشدار! با این کار اطلاعات فعلی پاک شده و این نسخه جایگزین می‌شود. آیا اطمینان دارید؟')) {
                                      showNotification('در حال بازیابی...', 'info');
                                    }
                                  }}
                                  disabled={b.status !== 'success'}
                                  className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  بازیابی
                                </button>
                              </td>
                            </tr>
                          ))}
                          
                          {backups.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-slate-500 font-bold">
                                <Database className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                هیچ نسخه‌ی بک‌آپی یافت نشد!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 5. Security & Notifications --- */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-500" />
                      امنیت و اعلان‌ها
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Encryption */}
                     <div className="space-y-4">
                        <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                           <Key className="w-4 h-4 text-slate-400" />
                           رمزنگاری فایل‌های بک‌آپ
                        </h4>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                           <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={securityConfig.encrypt}
                                onChange={e => setSecurityConfig({...securityConfig, encrypt: e.target.checked})}
                                className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              />
                              <span className="text-sm font-bold text-slate-700">فعال‌سازی رمزنگاری پیشرفته (AES-256)</span>
                           </label>
                           
                           {securityConfig.encrypt && (
                              <div className="pl-8 space-y-2">
                                <label className="block text-xs font-bold text-slate-600">رمز عبور فایل بک‌آپ</label>
                                <input 
                                  type="password" 
                                  placeholder="••••••••"
                                  value={securityConfig.password}
                                  onChange={e => setSecurityConfig({...securityConfig, password: e.target.value})}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" 
                                />
                                <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                                  <AlertTriangle className="w-3 h-3" /> در صورت فراموشی رمز، بک‌آپ غیرقابل بازیابی خواهد بود.
                                </p>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Notifications */}
                     <div className="space-y-4">
                        <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                           <Mail className="w-4 h-4 text-slate-400" />
                           گزارش و اعلان ایمیلی
                        </h4>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                           <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={securityConfig.emailNotify}
                                onChange={e => setSecurityConfig({...securityConfig, emailNotify: e.target.checked})}
                                className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              />
                              <span className="text-sm font-bold text-slate-700">ارسال گزارش پس از هر عملیات</span>
                           </label>
                           
                           {securityConfig.emailNotify && (
                              <div className="pl-8 space-y-2">
                                <label className="block text-xs font-bold text-slate-600">آدرس ایمیل گیرنده</label>
                                <input 
                                  type="email" 
                                  dir="ltr"
                                  placeholder="admin@example.com"
                                  value={securityConfig.emailAddress}
                                  onChange={e => setSecurityConfig({...securityConfig, emailAddress: e.target.value})}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 text-left" 
                                />
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="pt-4 text-left">
                    <button className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 inline-flex">
                      <Save className="w-4 h-4" /> ذخیره تنظیمات امنیتی
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
