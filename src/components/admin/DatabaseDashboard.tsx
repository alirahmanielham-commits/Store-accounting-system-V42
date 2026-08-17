import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, RefreshCw, UploadCloud, HardDrive, Download, 
  Trash2, Shield, Calendar, Settings, FileText, CheckCircle, 
  AlertTriangle, XCircle, Search, Save, FolderOpen, Mail, Key,
  Upload, Check, Play, Clock, Server, Eye, ToggleLeft, ToggleRight,
  Info, Lock, AlertCircle
} from 'lucide-react';

interface DatabaseDashboardProps {
  showNotification: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function DatabaseDashboard({ showNotification }: DatabaseDashboardProps) {
  const [activeTab, setActiveTab] = useState('manual');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  
  // Dummy Initial Data
  const [backups, setBackups] = useState([
    { id: '1', date: '1402/11/15', time: '14:30:00', size: '12.5 MB', type: 'کامل (Full)', status: 'success' },
    { id: '2', date: '1402/11/14', time: '02:00:00', size: '12.2 MB', type: 'فقط داده', status: 'success' },
    { id: '3', date: '1402/11/13', time: '15:45:00', size: '4.1 MB', type: 'افزایشی', status: 'error' },
  ]);

  const [backupType, setBackupType] = useState('full');

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
    cloudProvider: 's3',
    cloudAuthUrl: 's3.example.com',
    cloudUser: '',
    cloudPass: ''
  });

  const [securityConfig, setSecurityConfig] = useState({
    encrypt: true,
    password: '',
    emailNotify: true,
    emailAddress: 'admin@example.com'
  });

  // Logs state
  const [logs, setLogs] = useState([
    { id: '1', date: '1402/11/15 14:30', action: 'بک‌آپ دستی (کامل)', status: 'success', details: 'بک‌آپ با موفقیت در مسیر Local ذخیره شد.' },
    { id: '2', date: '1402/11/14 02:00', action: 'بک‌آپ خودکار (فقط داده)', status: 'success', details: 'بک‌آپ زمان‌بندی شده ایجاد شد.' },
    { id: '3', date: '1402/11/13 15:45', action: 'بک‌آپ دستی (افزایشی)', status: 'error', details: 'خطا در ارتباط با فضای ابری S3.' },
    { id: '4', date: '1402/11/12 10:00', action: 'بازیابی اطلاعات', status: 'warning', details: 'عملیات بازیابی با هشدارهای جزئی پایان یافت.' }
  ]);
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState('all');

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<any>(null);

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
          
          let typeLabel = 'کامل (Full)';
          if (backupType === 'incremental') typeLabel = 'افزایشی';
          if (backupType === 'structure') typeLabel = 'فقط ساختار';
          if (backupType === 'data') typeLabel = 'فقط داده';

          const newBackup = { 
            id: Date.now().toString(), 
            date: new Intl.DateTimeFormat('fa-IR').format(new Date()), 
            time: new Date().toLocaleTimeString('fa-IR'), 
            size: (Math.random() * 10 + 5).toFixed(1) + ' MB', 
            type: typeLabel, 
            status: 'success' 
          };

          setBackups([newBackup, ...backups]);
          
          setLogs([{
            id: Date.now().toString(),
            date: `${newBackup.date} ${newBackup.time}`,
            action: `بک‌آپ دستی (${typeLabel})`,
            status: 'success',
            details: 'عملیات با موفقیت توسط کاربر انجام شد.'
          }, ...logs]);

          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const executeRestore = () => {
    setIsRestoreModalOpen(false);
    showNotification('بازیابی اطلاعات با موفقیت انجام شد.', 'success');
    setLogs([{
      id: Date.now().toString(),
      date: new Intl.DateTimeFormat('fa-IR').format(new Date()) + ' ' + new Date().toLocaleTimeString('fa-IR'),
      action: 'بازیابی اطلاعات',
      status: 'success',
      details: `نسخه ${selectedBackupForRestore?.date} بازیابی شد.`
    }, ...logs]);
    setSelectedBackupForRestore(null);
  };

  const tabs = [
    { id: 'manual', label: 'بک‌آپ دستی', icon: Play },
    { id: 'schedule', label: 'زمان‌بندی', icon: Calendar },
    { id: 'storage', label: 'مسیر ذخیره‌سازی', icon: HardDrive },
    { id: 'restore', label: 'بازیابی', icon: RefreshCw },
    { id: 'security', label: 'امنیت و اعلان', icon: Shield },
    { id: 'logs', label: 'تاریخچه عملیات', icon: FileText }
  ];

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = log.action.includes(logSearch) || log.details.includes(logSearch) || log.date.includes(logSearch);
      const matchFilter = logFilter === 'all' || log.status === logFilter;
      return matchSearch && matchFilter;
    });
  }, [logs, logSearch, logFilter]);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] p-4 md:p-8" dir="rtl">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Database className="w-8 h-8 text-indigo-600" />
          مدیریت پایگاه داده
        </h2>
        <p className="text-slate-500 font-medium mt-2 text-sm">
          پشتیبان‌گیری، بازیابی و مدیریت یکپارچه داده‌های سیستم
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
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 overflow-hidden min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* --- 1. Manual Backup --- */}
              {activeTab === 'manual' && (
                <div className="space-y-8">
                  <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                    <div className="flex-1 space-y-6 w-full">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                          <Play className="w-5 h-5 text-indigo-500" />
                          تهیه بک‌آپ فوری
                        </h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed mt-2">
                          همین حالا از پایگاه داده سیستم یک نسخه پشتیبان تهیه کنید.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {[
                           { id: 'full', label: 'کامل (Full)', desc: 'داده‌ها و ساختار' },
                           { id: 'incremental', label: 'افزایشی (Incremental)', desc: 'تغییرات از بک‌آپ قبلی' },
                           { id: 'structure', label: 'فقط ساختار (Schema)', desc: 'جداول بدون داده' },
                           { id: 'data', label: 'فقط داده (Data)', desc: 'اطلاعات بدون ساختار' }
                         ].map(type => (
                            <div 
                              key={type.id}
                              onClick={() => setBackupType(type.id)}
                              className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                                backupType === type.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  backupType === type.id ? 'border-indigo-600' : 'border-slate-300'
                                }`}>
                                  {backupType === type.id && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                                </div>
                                <span className="text-sm font-bold text-slate-800">{type.label}</span>
                              </div>
                              <p className="text-xs text-slate-500 pr-6">{type.desc}</p>
                            </div>
                         ))}
                      </div>

                      <div className="pt-2">
                        <button 
                          onClick={handleImmediateBackup}
                          disabled={isBackingUp}
                          className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/50 disabled:opacity-70 disabled:cursor-wait w-full sm:w-auto"
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
                    <div className="w-full lg:w-80 bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex-shrink-0">
                       <div className="absolute -top-4 -right-4 p-4 opacity-10">
                          <CheckCircle className="w-32 h-32 text-emerald-400" />
                       </div>
                       <div className="relative z-10">
                         <div className="flex items-center gap-2 mb-6">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                           <h4 className="text-emerald-400 font-bold text-sm">وضعیت سیستم: پایدار</h4>
                         </div>
                         
                         <p className="text-slate-400 font-bold text-xs mb-1">آخرین بک‌آپ موفق</p>
                         <div className="text-2xl font-black mb-6" dir="ltr">{backups[0]?.date || '-'}</div>
                         
                         <div className="space-y-3 bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">ساعت:</span>
                              <span className="font-bold">{backups[0]?.time || '-'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">نوع:</span>
                              <span className="font-bold text-indigo-300">{backups[0]?.type || '-'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">حجم:</span>
                              <span className="font-bold text-emerald-400">{backups[0]?.size || '-'}</span>
                            </div>
                         </div>
                       </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {isBackingUp && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5"
                    >
                      <div className="flex justify-between text-sm font-bold text-indigo-700 mb-3">
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" /> در حال فشرده‌سازی و ذخیره پایگاه داده...
                        </span>
                        <span>{Math.round(backupProgress)}%</span>
                      </div>
                      <div className="h-2.5 bg-indigo-200/50 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-indigo-600 rounded-full relative"
                          initial={{ width: 0 }}
                          animate={{ width: `${backupProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)' }} />
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* --- 2. Schedule Backup --- */}
              {activeTab === 'schedule' && (
                <div className="space-y-8 max-w-4xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        زمان‌بندی خودکار
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        پشتیبان‌گیری منظم و بدون نیاز به دخالت کاربر.
                      </p>
                    </div>
                    <button 
                      onClick={() => setScheduleConfig({...scheduleConfig, enabled: !scheduleConfig.enabled})}
                      className={`p-1.5 rounded-full transition-all flex items-center gap-2 px-4 py-2 font-bold text-sm shadow-sm ${
                        scheduleConfig.enabled ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {scheduleConfig.enabled ? 'زمان‌بندی فعال است' : 'زمان‌بندی غیرفعال'}
                      {scheduleConfig.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>

                  <div className={`transition-all duration-300 ${scheduleConfig.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale-[50%]'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">دوره تناوب (Frequency)</label>
                          <select 
                            value={scheduleConfig.frequency}
                            onChange={e => setScheduleConfig({...scheduleConfig, frequency: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold bg-slate-50 hover:bg-white transition-colors cursor-pointer"
                          >
                            <option value="daily">روزانه</option>
                            <option value="weekly">هفتگی</option>
                            <option value="monthly">ماهانه</option>
                            <option value="custom">سفارشی (Cron Expression)</option>
                          </select>
                        </div>

                        {scheduleConfig.frequency === 'custom' ? (
                          <div className="relative group">
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
                              <span>عبارت Cron</span>
                              <div className="relative">
                                <Info className="w-4 h-4 text-indigo-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-center pointer-events-none z-10">
                                  مثال: 0 2 * * * <br/>(برای ساعت ۲ بامداد هر روز)
                                </div>
                              </div>
                            </label>
                            <input 
                              type="text" 
                              dir="ltr"
                              value={scheduleConfig.cron}
                              onChange={e => setScheduleConfig({...scheduleConfig, cron: e.target.value})}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm font-mono font-bold text-left bg-slate-50 focus:bg-white transition-colors" 
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ساعت اجرا</label>
                            <input 
                              type="time" 
                              value={scheduleConfig.time}
                              onChange={e => setScheduleConfig({...scheduleConfig, time: e.target.value})}
                              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold bg-slate-50 focus:bg-white transition-colors cursor-pointer" 
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                             <Server className="w-24 h-24 text-indigo-900" />
                           </div>
                           <h4 className="text-sm font-black text-indigo-900 mb-2 flex items-center gap-2">
                             <Trash2 className="w-4 h-4 text-indigo-600" />
                             سیاست نگهداری (Retention Policy)
                           </h4>
                           <p className="text-xs text-indigo-700/70 font-medium mb-6 leading-relaxed">
                             تعیین کنید چه تعداد از نسخه‌های قدیمی نگه داشته شوند. نسخه‌های مازاد به‌طور خودکار پاک می‌شوند تا فضای دیسک پر نشود.
                           </p>
                           <div>
                             <label className="block text-xs font-bold text-indigo-900 mb-2">تعداد نسخه‌های نگهداری شده</label>
                             <div className="flex items-center gap-3">
                               <input 
                                  type="range" 
                                  min="1"
                                  max="30"
                                  value={scheduleConfig.retention}
                                  onChange={e => setScheduleConfig({...scheduleConfig, retention: Number(e.target.value)})}
                                  className="flex-1 accent-indigo-600" 
                                />
                               <div className="w-12 h-10 bg-white rounded-lg border border-indigo-200 flex items-center justify-center font-black text-indigo-700 text-sm">
                                 {scheduleConfig.retention}
                               </div>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 mt-8 flex justify-end">
                      <button 
                        onClick={() => showNotification('تنظیمات زمان‌بندی ذخیره شد.', 'success')}
                        className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                      >
                        <Save className="w-4 h-4" /> ذخیره زمان‌بندی
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 3. Storage Settings --- */}
              {activeTab === 'storage' && (
                <div className="space-y-8 max-w-4xl">
                  <div className="pb-6 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-indigo-500" />
                      مسیر ذخیره‌سازی
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                      محل قرارگیری فایل‌های پشتیبان را پیکربندی کنید.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Local Storage Card */}
                     <div 
                        onClick={() => setStorageConfig({...storageConfig, type: 'local'})}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                          storageConfig.type === 'local' ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                     >
                        <div className="flex items-start justify-between mb-4">
                          <Server className={`w-8 h-8 ${storageConfig.type === 'local' ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${storageConfig.type === 'local' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                            {storageConfig.type === 'local' && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <h4 className="text-base font-black text-slate-800 mb-1">سرور محلی (Local)</h4>
                        <p className="text-xs text-slate-500 font-medium mb-6">ذخیره روی هارد دیسک سرور فعلی</p>
                        
                        <div className={`space-y-4 transition-all ${storageConfig.type === 'local' ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`} onClick={e => e.stopPropagation()}>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">مسیر پوشه</label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                dir="ltr"
                                value={storageConfig.localPath}
                                onChange={e => setStorageConfig({...storageConfig, localPath: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-left bg-white" 
                              />
                              <button className="px-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm text-slate-600">
                                <FolderOpen className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center text-xs font-bold mb-2">
                              <span className="text-slate-500 flex items-center gap-1"><HardDrive className="w-3 h-3" /> فضای آزاد دیسک</span>
                              <span className="text-emerald-600">45.2 GB</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 w-[40%]" />
                            </div>
                          </div>
                        </div>
                     </div>

                     {/* Cloud Storage Card */}
                     <div 
                        onClick={() => setStorageConfig({...storageConfig, type: 'cloud'})}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                          storageConfig.type === 'cloud' ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                     >
                        <div className="flex items-start justify-between mb-4">
                          <UploadCloud className={`w-8 h-8 ${storageConfig.type === 'cloud' ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${storageConfig.type === 'cloud' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                            {storageConfig.type === 'cloud' && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <h4 className="text-base font-black text-slate-800 mb-1">فضای ابری (Cloud)</h4>
                        <p className="text-xs text-slate-500 font-medium mb-6">اتصال به فضاهای ذخیره‌سازی خارجی</p>
                        
                        <div className={`space-y-4 transition-all ${storageConfig.type === 'cloud' ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`} onClick={e => e.stopPropagation()}>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">ارائه‌دهنده سرویس</label>
                            <select 
                              value={storageConfig.cloudProvider}
                              onChange={e => setStorageConfig({...storageConfig, cloudProvider: e.target.value})}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white"
                            >
                              <option value="s3">Amazon S3 Compatible</option>
                              <option value="ftp">FTP / SFTP Server</option>
                              <option value="gdrive">Google Drive</option>
                            </select>
                          </div>
                          
                          {storageConfig.cloudProvider !== 'gdrive' && (
                            <div className="space-y-3">
                              <input 
                                type="text" placeholder="Server URL / Endpoint" dir="ltr"
                                value={storageConfig.cloudAuthUrl}
                                onChange={e => setStorageConfig({...storageConfig, cloudAuthUrl: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-indigo-500 bg-white text-left" 
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  type="text" placeholder="Username / Key" dir="ltr"
                                  value={storageConfig.cloudUser}
                                  onChange={e => setStorageConfig({...storageConfig, cloudUser: e.target.value})}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 bg-white text-left" 
                                />
                                <input 
                                  type="password" placeholder="Password / Secret" dir="ltr"
                                  value={storageConfig.cloudPass}
                                  onChange={e => setStorageConfig({...storageConfig, cloudPass: e.target.value})}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 bg-white text-left" 
                                />
                              </div>
                            </div>
                          )}

                          <button className="w-full py-2.5 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-md hover:bg-slate-900 transition-colors">
                            {storageConfig.cloudProvider === 'gdrive' ? 'احراز هویت Google' : 'تست اتصال'}
                          </button>
                        </div>
                     </div>
                  </div>
                  
                  <div className="pt-8 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => showNotification('تنظیمات ذخیره‌سازی با موفقیت اعمال شد.', 'success')}
                      className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-slate-200"
                    >
                      <Save className="w-4 h-4" /> اعمال تنظیمات مسیر
                    </button>
                  </div>
                </div>
              )}

              {/* --- 4. Restore --- */}
              {activeTab === 'restore' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-6 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-indigo-500" />
                        بازیابی اطلاعات (Restore)
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        بازگردانی دیتابیس از نسخه‌های پشتیبان موجود.
                      </p>
                    </div>
                    <button className="px-5 py-2.5 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm">
                      <Upload className="w-4 h-4" /> آپلود فایل بک‌آپ خارجی
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50/80 text-slate-600 font-black text-xs border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-4">تاریخ و زمان</th>
                            <th className="px-5 py-4">حجم</th>
                            <th className="px-5 py-4">نوع بک‌آپ</th>
                            <th className="px-5 py-4">وضعیت</th>
                            <th className="px-5 py-4 text-center">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {backups.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-5 py-4 font-bold text-slate-700" dir="ltr">
                                {b.date} <span className="text-slate-400 font-medium ml-2">{b.time}</span>
                              </td>
                              <td className="px-5 py-4 font-mono font-bold text-slate-600" dir="ltr">{b.size}</td>
                              <td className="px-5 py-4 font-bold text-slate-700">
                                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs border border-slate-200">
                                  {b.type}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                {b.status === 'success' ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-black bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> موفق
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-black bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> خطا
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4 flex justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button title="دانلود فایل" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100">
                                  <Download className="w-4 h-4" />
                                </button>
                                <button title="حذف" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedBackupForRestore(b);
                                    setIsRestoreModalOpen(true);
                                  }}
                                  disabled={b.status !== 'success'}
                                  className="px-4 py-2 bg-slate-800 text-white hover:bg-rose-600 rounded-lg font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                                >
                                  بازیابی <RefreshCw className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          
                          {backups.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-16 text-center text-slate-500 font-bold bg-slate-50/50">
                                <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-base text-slate-700 mb-1">هیچ نسخه‌ی بک‌آپی یافت نشد!</p>
                                <p className="text-xs text-slate-400 font-medium">برای شروع، از بخش بک‌آپ دستی استفاده کنید.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 5. Security --- */}
              {activeTab === 'security' && (
                <div className="space-y-8 max-w-4xl">
                  <div className="pb-6 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-500" />
                      امنیت و اعلان‌ها
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                      ایمن‌سازی فایل‌های پشتیبان و تنظیمات ارسال گزارشات.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Encryption */}
                     <div className="space-y-4">
                        <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                           <Lock className="w-4 h-4 text-slate-400" />
                           رمزنگاری پیشرفته (Encryption)
                        </h4>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5">
                           <label className="flex items-start gap-3 cursor-pointer">
                              <div className="mt-0.5">
                                <input 
                                  type="checkbox" 
                                  checked={securityConfig.encrypt}
                                  onChange={e => setSecurityConfig({...securityConfig, encrypt: e.target.checked})}
                                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <span className="block text-sm font-bold text-slate-800 mb-1">رمزنگاری فایل‌های بک‌آپ (AES-256)</span>
                                <span className="block text-xs font-medium text-slate-500">فایل‌ها قبل از ذخیره‌سازی رمزگذاری می‌شوند تا در صورت نشت اطلاعات، قابل خواندن نباشند.</span>
                              </div>
                           </label>
                           
                           <div className={`space-y-3 transition-all ${securityConfig.encrypt ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">رمز عبور اختصاصی</label>
                                <div className="relative">
                                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                  <input 
                                    type="password" 
                                    placeholder="••••••••"
                                    dir="ltr"
                                    value={securityConfig.password}
                                    onChange={e => setSecurityConfig({...securityConfig, password: e.target.value})}
                                    className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white" 
                                  />
                                </div>
                              </div>
                              <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 p-3 rounded-lg text-rose-700">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] font-bold leading-relaxed">
                                  هشدار: در صورت فراموشی این رمز عبور، امکان بازیابی و استفاده از فایل‌های بک‌آپ تحت هیچ شرایطی وجود نخواهد داشت.
                                </p>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Notifications */}
                     <div className="space-y-4">
                        <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                           <Mail className="w-4 h-4 text-slate-400" />
                           گزارشات ایمیلی
                        </h4>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5">
                           <label className="flex items-start gap-3 cursor-pointer">
                              <div className="mt-0.5">
                                <input 
                                  type="checkbox" 
                                  checked={securityConfig.emailNotify}
                                  onChange={e => setSecurityConfig({...securityConfig, emailNotify: e.target.checked})}
                                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <span className="block text-sm font-bold text-slate-800 mb-1">ارسال گزارش پس از هر عملیات</span>
                                <span className="block text-xs font-medium text-slate-500">خلاصه وضعیت موفقیت یا شکست بک‌آپ‌گیری را به ایمیل شما ارسال می‌کند.</span>
                              </div>
                           </label>
                           
                           <div className={`space-y-3 transition-all ${securityConfig.emailNotify ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">آدرس ایمیل گیرنده</label>
                                <input 
                                  type="email" 
                                  dir="ltr"
                                  placeholder="admin@example.com"
                                  value={securityConfig.emailAddress}
                                  onChange={e => setSecurityConfig({...securityConfig, emailAddress: e.target.value})}
                                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white text-left" 
                                />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => showNotification('تنظیمات امنیتی و اعلان‌ها بروزرسانی شد.', 'success')}
                      className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-slate-200"
                    >
                      <Save className="w-4 h-4" /> ذخیره تنظیمات امنیتی
                    </button>
                  </div>
                </div>
              )}

              {/* --- 6. Logs --- */}
              {activeTab === 'logs' && (
                <div className="space-y-6">
                  <div className="pb-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        تاریخچه عملیات (Logs)
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        گزارش کامل رویدادها، موفقیت‌ها و خطاهای مرتبط با دیتابیس.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="جستجو در لاگ‌ها..." 
                          value={logSearch}
                          onChange={e => setLogSearch(e.target.value)}
                          className="pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 w-full sm:w-64"
                        />
                      </div>
                      <select 
                        value={logFilter}
                        onChange={e => setLogFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                      >
                        <option value="all">همه وضعیت‌ها</option>
                        <option value="success">موفق</option>
                        <option value="warning">هشدار</option>
                        <option value="error">خطا</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50/80 text-slate-600 font-black text-xs border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-4 w-40">تاریخ و زمان</th>
                            <th className="px-5 py-4 w-48">عملیات</th>
                            <th className="px-5 py-4 w-32">وضعیت</th>
                            <th className="px-5 py-4">جزئیات (Details)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-4 font-bold text-slate-700" dir="ltr">{log.date}</td>
                              <td className="px-5 py-4 font-bold text-slate-800">{log.action}</td>
                              <td className="px-5 py-4">
                                {log.status === 'success' && <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md border border-emerald-100"><CheckCircle className="w-3 h-3" /> موفق</span>}
                                {log.status === 'warning' && <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-600 px-2 py-1 rounded-md border border-amber-100"><AlertTriangle className="w-3 h-3" /> هشدار</span>}
                                {log.status === 'error' && <span className="inline-flex items-center gap-1 text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-md border border-rose-100"><XCircle className="w-3 h-3" /> خطا</span>}
                              </td>
                              <td className="px-5 py-4 text-xs font-medium text-slate-600 leading-relaxed">{log.details}</td>
                            </tr>
                          ))}
                          
                          {filteredLogs.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-slate-500 font-bold bg-slate-50/50">
                               هیچ لاگی با این مشخصات یافت نشد.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Restore Warning Modal */}
      <AnimatePresence>
        {isRestoreModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="bg-rose-50 p-6 text-center border-b border-rose-100">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <AlertCircle className="w-8 h-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-black text-rose-700 mb-2">هشدار بسیار مهم</h3>
                <p className="text-sm text-rose-600/80 font-bold">آیا از بازیابی این نسخه اطمینان دارید؟</p>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-sm font-medium text-slate-600 leading-relaxed text-center">
                  عملیات بازیابی (Restore) غیرقابل بازگشت است. 
                  <br />تمامی اطلاعات فعلی سیستم با اطلاعات موجود در فایل بک‌آپ زیر جایگزین خواهد شد:
                </p>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <div className="text-lg font-black text-slate-800" dir="ltr">{selectedBackupForRestore?.date} - {selectedBackupForRestore?.time}</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">حجم: {selectedBackupForRestore?.size} | نوع: {selectedBackupForRestore?.type}</div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsRestoreModalOpen(false)}
                    className="flex-1 py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                  >
                    انصراف
                  </button>
                  <button 
                    onClick={executeRestore}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                  >
                    بله، بازیابی کن
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
