import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, RefreshCw, UploadCloud, HardDrive, Download, 
  Trash2, Shield, ShieldCheck, Calendar, Settings, FileText, CheckCircle, CheckCircle2,
  AlertTriangle, XCircle, Search, Save, FolderOpen, Mail, Key,
  Upload, Check, Play, Clock, Server, Eye, ToggleLeft, ToggleRight,
  Info, Lock, AlertCircle, X, LogIn
} from 'lucide-react';

interface DatabaseDashboardProps {
  showNotification: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function DatabaseDashboard({ showNotification }: DatabaseDashboardProps) {
  const [activeTab, setActiveTab] = useState('manual');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  
  
  const [backups, setBackups] = useState<any[]>([]);
  const loadBackups = async () => {
    try {
      const res = await fetch('/api/db/backups');
      const data = await res.json();
      const formatted = data.map((b: any, index: number) => {
        const d = new Date(b.time);
        return {
          id: b.file,
          date: new Intl.DateTimeFormat('fa-IR').format(d),
          time: d.toLocaleTimeString('fa-IR'),
          size: (b.size / 1024 / 1024).toFixed(2) + ' MB',
          type: b.type || (b.isEncrypted ? 'رمزنگاری‌شده (AES-256)' : (b.file.startsWith('uploaded-') ? 'آپلود شده' : 'کامل (Full)')),
          isEncrypted: b.isEncrypted,
          encryption: b.encryption || (b.isEncrypted ? 'AES-256-GCM' : 'None'),
          status: 'success',
          file: b.file
        };
      });
      setBackups(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/db/backup-config');
      const data = await res.json();
      if (data) {
        setScheduleConfig(prev => ({
          ...prev,
          enabled: data.enabled !== undefined ? data.enabled : data.intervalHours > 0,
          frequency: data.frequency || 'daily',
          time: data.time || '02:00',
          retention: data.retention || 5,
          cron: data.cron || '0 2 * * *'
        }));
        setStorageConfig(prev => ({ 
          ...prev, 
          localPath: data.path !== undefined ? data.path : prev.localPath, 
          type: data.storageType || prev.type, 
          cloudProvider: data.cloudProvider || data.remoteProvider || prev.cloudProvider,
          autoCloudSync: data.autoCloudSync !== undefined ? data.autoCloudSync : true,
          cloudAuthUrl: data.cloudAuthUrl || prev.cloudAuthUrl, 
          cloudUser: data.cloudUser || prev.cloudUser, 
          cloudPass: data.cloudPass || prev.cloudPass,
          cloudBucket: data.cloudBucket || prev.cloudBucket,
          gdriveToken: data.gdriveToken || prev.gdriveToken,
          gdriveFolder: data.gdriveFolder || prev.gdriveFolder,
          gdriveUser: data.gdriveUser || prev.gdriveUser,
          onedriveToken: data.onedriveToken || prev.onedriveToken,
          onedriveFolder: data.onedriveFolder || prev.onedriveFolder,
          onedriveUser: data.onedriveUser || prev.onedriveUser
        }));
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadBackups();
    loadConfig();
  }, []);

  const [backupType, setBackupType] = useState('full');

  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: true,
    frequency: 'daily',
    time: '02:00',
    retention: 10,
    cron: '0 2 * * *'
  });

  const [storageConfig, setStorageConfig] = useState({
    type: 'both',
    localPath: '',
    cloudProvider: 'gdrive',
    autoCloudSync: true,
    cloudAuthUrl: 's3.example.com',
    cloudUser: '',
    cloudPass: '',
    cloudBucket: 'taraz-backups',
    gdriveToken: '',
    gdriveFolder: 'Taraz_Backups',
    gdriveUser: '',
    onedriveToken: '',
    onedriveFolder: 'Taraz_Backups',
    onedriveUser: ''
  });

  const [cloudBackups, setCloudBackups] = useState<any[]>([]);
  const [loadingCloudBackups, setLoadingCloudBackups] = useState(false);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [cloudTestResult, setCloudTestResult] = useState<{ success: boolean; message: string; user?: string } | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState<string | null>(null);

  const loadCloudBackups = async () => {
    setLoadingCloudBackups(true);
    try {
      const res = await fetch('/api/db/cloud/backups');
      const data = await res.json();
      setCloudBackups(Array.isArray(data) ? data : []);
    } catch(e) {
      console.error('Failed to load cloud backups', e);
    }
    setLoadingCloudBackups(false);
  };

  const handleTestCloudConnection = async (customProvider?: string) => {
    setIsTestingCloud(true);
    setCloudTestResult(null);
    const target = customProvider || storageConfig.cloudProvider;
    try {
      const res = await fetch('/api/db/cloud/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: target,
          config: storageConfig
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCloudTestResult({ success: false, message: data.error || 'خطا در ارتباط با فضای ابری' });
        showNotification(data.error || 'خطا در برقراری ارتباط با فضای ابری', 'error');
      } else {
        setCloudTestResult({
          success: true,
          message: data.message,
          user: data.user ? `${data.user} (${data.email || ''})` : undefined
        });
        showNotification(data.message, 'success');
      }
    } catch(err: any) {
      setCloudTestResult({ success: false, message: err.message || 'خطای ارتباط با سرور' });
      showNotification('خطا در تست اتصال ابری', 'error');
    }
    setIsTestingCloud(false);
  };

  const handleConnectGoogleDrive = async () => {
    try {
      const { googleSignIn } = await import('../../lib/driveAuth');
      const result = await googleSignIn();
      if (result?.accessToken) {
        const updated = {
          ...storageConfig,
          cloudProvider: 'gdrive',
          gdriveToken: result.accessToken,
          gdriveUser: result.user.displayName || result.user.email || 'حساب گوگل'
        };
        setStorageConfig(updated);
        await saveStorageSettings(updated);
        showNotification(`حساب گوگل با موفقیت متصل شد`, 'success');
        handleTestCloudConnection('gdrive');
      }
    } catch(e: any) {
      showNotification('احراز هویت با Google ناموفق بود: ' + (e.message || ''), 'warning');
    }
  };

  const handleCloudSyncNow = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await fetch('/api/db/cloud/sync-now', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطای سرور');
      showNotification('پشتیبان‌گیری انجام و در فضای ابری همگام‌سازی شد', 'success');
      loadBackups();
      loadCloudBackups();
    } catch(e: any) {
      showNotification('خطا در همگام‌سازی ابری: ' + e.message, 'error');
    }
    setIsSyncingCloud(false);
  };

  const handleUploadSpecificToCloud = async (filename: string) => {
    setIsUploadingToCloud(filename);
    try {
      const res = await fetch('/api/db/cloud/upload-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در آپلود');
      showNotification(data.message || 'فایل در فضای ابری ذخیره شد', 'success');
      loadCloudBackups();
    } catch(e: any) {
      showNotification('خطا در ارسال به فضای ابری: ' + e.message, 'error');
    }
    setIsUploadingToCloud(null);
  };

  const handleDeleteCloudBackup = async (filename: string) => {
    if (!confirm(`آیا از حذف این نسخه از فضای ابری مطمئن هستید؟`)) return;
    try {
      const res = await fetch(`/api/db/cloud/backups/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showNotification('نسخه از لیست ابری حذف شد', 'success');
      loadCloudBackups();
    } catch(e: any) {
      showNotification('خطا در حذف نسخه ابری: ' + e.message, 'error');
    }
  };

  const [securityConfig, setSecurityConfig] = useState({
    encrypt: true,
    password: '',
    emailNotify: true,
    emailAddress: 'admin@example.com'
  });

  // Logs state
  
  const [healthData, setHealthData] = useState<any>(null);
  const [tableSizes, setTableSizes] = useState<{tables: any[], totalSize: number}>({ tables: [], totalSize: 0 });
  const [loadingHealth, setLoadingHealth] = useState(false);

  const loadHealthData = async () => {
    setLoadingHealth(true);
    try {
      const [hRes, sRes] = await Promise.all([
        fetch('/api/db/health'),
        fetch('/api/db/table-sizes')
      ]);
      const hData = await hRes.json();
      const sData = await sRes.json();
      setHealthData(hData);
      setTableSizes(sData.tables ? sData : { tables: [], totalSize: 0 });
    } catch(e) { console.error(e); }
    setLoadingHealth(false);
  };

  useEffect(() => {
    if (activeTab === 'health') {
      loadHealthData();
    }
  }, [activeTab]);

  
  const [logs, setLogs] = useState<any[]>([]);
  const loadLogs = async () => {
    try {
      const res = await fetch('/api/db/logs');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch(e) {}
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab]);

  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState('all');

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [restoreState, setRestoreState] = useState<'confirm' | 'progress' | 'success' | 'error'>('confirm');
  const [restoreErrorMessage, setRestoreErrorMessage] = useState<string>('');
  const [restoreProgress, setRestoreProgress] = useState(0);

  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<any>(null);
  const [dryRunData, setDryRunData] = useState<any>(null);
  const [isLoadingDryRun, setIsLoadingDryRun] = useState(false);
  const [isRevertingSafety, setIsRevertingSafety] = useState(false);

  const fetchDryRunPreview = async (filename: string, content?: string) => {
    setIsLoadingDryRun(true);
    setDryRunData(null);
    try {
      let res;
      if (content) {
        res = await fetch('/api/backup/dry-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, content })
        });
      } else {
        res = await fetch(`/api/db/backups/dry-run/${encodeURIComponent(filename)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (res.ok) {
        const data = await res.json();
        setDryRunData(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setDryRunData({ warnings: [err.error || 'خطا در ارزیابی پیش‌نمایش فایل پشتیبان'] });
      }
    } catch (e: any) {
      setDryRunData({ warnings: ['امکان دریافت پیش‌نمایش فایل پشتیبان وجود ندارد: ' + e.message] });
    } finally {
      setIsLoadingDryRun(false);
    }
  };

  const handleRevertSafetySnapshot = async () => {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید سیستم را به نسخه ایمنی اضطراری قبل از آخرین بازیابی بازگردانید؟')) {
      return;
    }
    setIsRevertingSafety(true);
    try {
      const res = await fetch('/api/db/backups/revert-safety', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message || 'سیستم با موفقیت به نسخه ایمنی بازگردانده شد.', 'success');
        loadBackups();
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showNotification(data.error || 'خطا در بازگشت به نسخه ایمنی', 'error');
      }
    } catch (err: any) {
      showNotification('خطا: ' + err.message, 'error');
    } finally {
      setIsRevertingSafety(false);
    }
  };

  const [isPathPickerOpen, setIsPathPickerOpen] = useState(false);
  const [pickerPath, setPickerPath] = useState('');
  const [pickerParent, setPickerParent] = useState<string|null>(null);
  const [pickerFolders, setPickerFolders] = useState<string[]>([]);
  
  const openPathPicker = async (initialPath: string) => {
    setIsPathPickerOpen(true);
    await loadPickerPath(initialPath || '/');
  };

  const loadPickerPath = async (targetPath: string) => {
    try {
      const res = await fetch('/api/db/explore-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath })
      });
      if (!res.ok) throw new Error('Cannot load folders');
      const data = await res.json();
      setPickerPath(data.current);
      setPickerParent(data.parent);
      setPickerFolders(data.folders || []);
    } catch (e) {
      showNotification('خطا در بارگیری لیست پوشه‌ها', 'error');
    }
  };

  // Manual Backup Action
  const handleImmediateBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(30);
    try {
      const res = await fetch('/api/db/backups/create', { method: 'POST' });
      if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'خطای سرور');
      }
      setBackupProgress(100);
      showNotification('بک‌آپ با موفقیت تهیه شد', 'success');
      loadBackups();
      
      let typeLabel = 'کامل (Full)';
      if (backupType === 'incremental') typeLabel = 'افزایشی';
      if (backupType === 'structure') typeLabel = 'فقط ساختار';
      if (backupType === 'data') typeLabel = 'فقط داده';
      setLogs([{
        id: Date.now().toString(),
        date: new Intl.DateTimeFormat('fa-IR').format(new Date()) + ' ' + new Date().toLocaleTimeString('fa-IR'),
        action: `بک‌آپ دستی (${typeLabel})`,
        status: 'success',
        details: 'عملیات با موفقیت انجام شد.'
      }, ...logs]);
    } catch(err: any) {
      showNotification('خطا در تهیه بک‌آپ: ' + err.message, 'error');
      setLogs([{
        id: Date.now().toString(),
        date: new Intl.DateTimeFormat('fa-IR').format(new Date()) + ' ' + new Date().toLocaleTimeString('fa-IR'),
        action: 'بک‌آپ دستی',
        status: 'error',
        details: 'خطای بک‌آپ: ' + err.message
      }, ...logs]);
    }
    setTimeout(() => {
      setIsBackingUp(false);
      setBackupProgress(0);
    }, 1000);
  };

  
  const executeRestore = async () => {
    setRestoreState('progress');
    setRestoreProgress(0);
    
    // Simulate some nice progress phases before actual request
    const phases = [10, 35, 60, 85];
    for(const phase of phases) {
      await new Promise(r => setTimeout(r, 400));
      setRestoreProgress(phase);
    }
    
    try {
      if (!selectedBackupForRestore || !selectedBackupForRestore.file) {
        throw new Error('فایل بک‌آپ نامعتبر است.');
      }
      
      let filename = selectedBackupForRestore.file;
      
      // If it's a direct upload (no existing file on server yet)
      if (selectedBackupForRestore.isUpload) {
         setRestoreProgress(90);
         const res = await fetch('/api/db/backups/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: selectedBackupForRestore.rawFile.name, content: selectedBackupForRestore.content })
         });
         if (!res.ok) throw new Error('آپلود ناموفق بود.');
         const data = await res.json();
         filename = data.file;
      }
      
      setRestoreProgress(95);
      const res = await fetch(`/api/db/backups/restore/${filename}`, { method: 'POST' });
      if (!res.ok) {
         const errorData = await res.json().catch(() => ({}));
         throw new Error(errorData.error || 'بازیابی ناموفق بود.');
      }
      
      setRestoreProgress(100);
      setRestoreState('success');
      loadBackups(); // reload list
    } catch(e: any) {
      setRestoreErrorMessage(e.message);
      setRestoreState('error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    showNotification('در حال آپلود فایل، لطفاً صبر کنید...', 'info');
    try {
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      const res = await fetch('/api/db/backups/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content })
      });
      if (!res.ok) throw new Error('Upload failed');
      showNotification('فایل بک‌آپ با موفقیت اضافه شد. اکنون می‌توانید آن را بازیابی کنید.', 'success');
      loadBackups();
    } catch (err) {
      showNotification('خطا در آپلود فایل', 'error');
    } finally {
      e.target.value = '';
    }
  };


  
  const saveScheduleSettings = async () => {
    try {
      let intervalHours = 24;
      if (scheduleConfig.frequency === 'weekly') intervalHours = 168;
      if (scheduleConfig.frequency === 'monthly') intervalHours = 720;
      if (scheduleConfig.frequency === 'custom') intervalHours = 4; // Arbitrary for custom right now
      
      await fetch('/api/db/backup-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: scheduleConfig.enabled,
          frequency: scheduleConfig.frequency,
          time: scheduleConfig.time,
          retention: scheduleConfig.retention,
          cron: scheduleConfig.cron,
          intervalHours: intervalHours
        })
      });
      showNotification('تنظیمات زمان‌بندی ذخیره شد', 'success');
    } catch (e) {
      showNotification('خطا در ذخیره تنظیمات', 'error');
    }
  };

  const saveStorageSettings = async (customConfig?: any) => {
    const toSave = customConfig || storageConfig;
    try {
      await fetch('/api/db/backup-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: toSave.localPath, 
          storageType: toSave.type, 
          remoteProvider: toSave.cloudProvider,
          cloudProvider: toSave.cloudProvider,
          autoCloudSync: toSave.autoCloudSync,
          cloudAuthUrl: toSave.cloudAuthUrl, 
          cloudUser: toSave.cloudUser, 
          cloudPass: toSave.cloudPass,
          cloudBucket: toSave.cloudBucket,
          gdriveToken: toSave.gdriveToken,
          gdriveFolder: toSave.gdriveFolder,
          gdriveUser: toSave.gdriveUser,
          onedriveToken: toSave.onedriveToken,
          onedriveFolder: toSave.onedriveFolder,
          onedriveUser: toSave.onedriveUser
        })
      });
      showNotification('تنظیمات مسیر و فضای ذخیره‌سازی با موفقیت ذخیره شد', 'success');
    } catch (e) {
      showNotification('خطا در ذخیره تنظیمات', 'error');
    }
  };
  
  
  const handleDeleteBackup = async (filename: string) => {
    if (!confirm('آیا از حذف این بک‌آپ اطمینان دارید؟')) return;
    try {
      const res = await fetch(`/api/db/backups/${filename}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showNotification('بک‌آپ با موفقیت حذف شد', 'success');
      loadBackups();
    } catch(e) {
      showNotification('خطا در حذف بک‌آپ', 'error');
    }
  };

  const handleDownloadBackup = (filename: string) => {
    const storeId = localStorage.getItem('activeStoreId') || 'default';
    window.open(`/api/db/backups/download/${filename}?storeId=${storeId}`, '_blank');
  };
  
  const tabs = [
    { id: 'health', label: 'سلامت و فضا', icon: Server },
    { id: 'manual', label: 'بک‌آپ دستی', icon: Play },
    { id: 'schedule', label: 'زمان‌بندی', icon: Calendar },
    { id: 'cloud', label: 'پشتیبان ابری (گوگل درایو / وان‌درایو)', icon: UploadCloud },
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
              
              
              {/* --- Health & Stats --- */}
              {activeTab === 'health' && (
                <div className="space-y-6">
                  <div className="pb-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Server className="w-5 h-5 text-indigo-500" />
                        وضعیت سلامت و فضای پایگاه داده
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        بررسی دسترسی‌ها، ارتباط سرور، رکوردهای یتیم (Orphaned) و حجم جداول.
                      </p>
                    </div>
                    <button 
                      onClick={loadHealthData} 
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingHealth ? 'animate-spin' : ''}`} /> بروزرسانی
                    </button>
                  </div>
                  
                  {/* Health Check Cards */}
                  {healthData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`p-5 rounded-2xl border ${healthData.permissionsOk ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          {healthData.permissionsOk ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-rose-500" />}
                          <h4 className={`font-bold ${healthData.permissionsOk ? 'text-emerald-700' : 'text-rose-700'}`}>دسترسی فایل‌ها</h4>
                        </div>
                        <p className={`text-xs ${healthData.permissionsOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {healthData.permissionsOk ? 'پوشه بک‌آپ دارای دسترسی خواندن و نوشتن است.' : `خطا در دسترسی: ${healthData.permissionsError}`}
                        </p>
                      </div>

                      <div className={`p-5 rounded-2xl border ${healthData.connectionOk ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          {healthData.connectionOk ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-rose-500" />}
                          <h4 className={`font-bold ${healthData.connectionOk ? 'text-emerald-700' : 'text-rose-700'}`}>اتصال به پایگاه داده</h4>
                        </div>
                        <p className={`text-xs ${healthData.connectionOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {healthData.connectionOk ? 'ارتباط با پایگاه داده پایدار و بدون مشکل است.' : `خطا در ارتباط: ${healthData.connectionError}`}
                        </p>
                      </div>

                      <div className={`p-5 rounded-2xl border ${healthData.orphanedRecords === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          {healthData.orphanedRecords === 0 ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <AlertTriangle className="w-6 h-6 text-amber-500" />}
                          <h4 className={`font-bold ${healthData.orphanedRecords === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>رکوردهای یتیم</h4>
                        </div>
                        <p className={`text-xs ${healthData.orphanedRecords === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {healthData.orphanedRecords === 0 ? 'هیچ رکورد بدون مرجعی در دفتر کل یافت نشد.' : `هشدار: تعداد ${healthData.orphanedRecords} رکورد یتیم در سیستم یافت شد!`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Storage Critical Alert */}
                  {tableSizes.totalSize > 1024 * 1024 * 1024 && ( // Alert if > 1GB
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-rose-700">هشدار حجم بحرانی</h4>
                        <p className="text-sm text-rose-600 mt-1">حجم کل دیتابیس از سقف ۱ گیگابایت عبور کرده است. لطفاً نسبت به خالی کردن فضا یا افزایش منابع اقدام کنید.</p>
                      </div>
                    </div>
                  )}

                  {/* Table Sizes */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mt-6">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h4 className="font-bold text-slate-700">فضای مصرفی جداول اصلی (SQL)</h4>
                      <div className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                        حجم کل: {(tableSizes.totalSize / 1024 / 1024).toFixed(2)} مگابایت
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50/50 text-slate-500 font-bold text-xs border-b border-slate-100">
                          <tr>
                            <th className="px-5 py-3">نام جدول</th>
                            <th className="px-5 py-3">تعداد رکوردها</th>
                            <th className="px-5 py-3">حجم (مگابایت)</th>
                            <th className="px-5 py-3 w-1/3">نوار مصرف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tableSizes.tables.map(t => {
                            const sizeMb = (t.size / 1024 / 1024).toFixed(2);
                            const percent = tableSizes.totalSize > 0 ? (t.size / tableSizes.totalSize) * 100 : 0;
                            return (
                              <tr key={t.name} className="hover:bg-slate-50/50">
                                <td className="px-5 py-3 font-bold text-slate-700" dir="ltr">{t.name}</td>
                                <td className="px-5 py-3 text-slate-600">{t.recordCount.toLocaleString()}</td>
                                <td className="px-5 py-3 font-medium text-slate-800">{sizeMb} MB</td>
                                <td className="px-5 py-3">
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{width: `${Math.max(percent, 1)}%`}}></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {tableSizes.tables.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-slate-400 font-medium text-sm">
                                در حال استفاده از SQLite (حجم جداول به تفکیک پشتیبانی نمی‌شود).
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

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

              {/* --- 2.5. Cloud Backup (Google Drive, OneDrive, S3) --- */}
              {activeTab === 'cloud' && (
                <div className="space-y-8">
                  {/* Top Cloud Banner */}
                  <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between pb-6 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <UploadCloud className="w-5 h-5 text-indigo-600" />
                        پشتیبان‌گیری خودکار در فضای ابری (Google Drive / OneDrive / S3)
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        ذخیره امن داده‌ها در فضای ابری، بازیابی سریع در مواقع اضطراری و پیشگیری از نابودی داده‌ها.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Auto-Sync Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...storageConfig, autoCloudSync: !storageConfig.autoCloudSync };
                          setStorageConfig(updated);
                          saveStorageSettings(updated);
                        }}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                          storageConfig.autoCloudSync
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {storageConfig.autoCloudSync ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>همگام‌سازی خودکار: فعال</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-slate-400" />
                            <span>همگام‌سازی خودکار: غیرفعال</span>
                          </>
                        )}
                      </button>

                      {/* Sync Now Button */}
                      <button
                        type="button"
                        disabled={isSyncingCloud}
                        onClick={handleCloudSyncNow}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
                      >
                        {isSyncingCloud ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>در حال پشتیبان‌گیری و ارسال...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            <span>پشتیبان‌گیری فوری و ذخیره در ابر</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Provider Selector Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Google Drive Card */}
                    <div
                      onClick={() => {
                        const updated = { ...storageConfig, cloudProvider: 'gdrive' };
                        setStorageConfig(updated);
                        saveStorageSettings(updated);
                      }}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                        storageConfig.cloudProvider === 'gdrive'
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100'
                          : 'border-slate-200 hover:border-indigo-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          GD
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          storageConfig.gdriveToken
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {storageConfig.gdriveToken ? 'متصل شده' : 'نیازمند اتصال'}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900">Google Drive</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        ذخیره مستقیم در حساب شخصی یا سازمانی گوگل درایو
                      </p>
                    </div>

                    {/* Microsoft OneDrive Card */}
                    <div
                      onClick={() => {
                        const updated = { ...storageConfig, cloudProvider: 'onedrive' };
                        setStorageConfig(updated);
                        saveStorageSettings(updated);
                      }}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                        storageConfig.cloudProvider === 'onedrive'
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100'
                          : 'border-slate-200 hover:border-indigo-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                          OD
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          storageConfig.onedriveToken
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {storageConfig.onedriveToken ? 'متصل شده' : 'نیازمند تنظیم'}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900">Microsoft OneDrive</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        ذخیره در وان‌درایو مایکروسافت از طریق Microsoft Graph
                      </p>
                    </div>

                    {/* S3 / ArvanCloud / Liara Card */}
                    <div
                      onClick={() => {
                        const updated = { ...storageConfig, cloudProvider: 's3' };
                        setStorageConfig(updated);
                        saveStorageSettings(updated);
                      }}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                        storageConfig.cloudProvider === 's3'
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100'
                          : 'border-slate-200 hover:border-indigo-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                          S3
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          storageConfig.cloudAuthUrl && storageConfig.cloudUser
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {storageConfig.cloudAuthUrl && storageConfig.cloudUser ? 'پیکربندی شده' : 'نیازمند مشخصات'}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900">ابری S3 / آروان / لیارا</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        فضای ذخیره‌سازی ابری شی‌گرا (Object Storage سازگار با S3)
                      </p>
                    </div>
                  </div>

                  {/* Provider Detailed Configuration Form */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6 space-y-6">
                    {/* Google Drive Configuration */}
                    {storageConfig.cloudProvider === 'gdrive' && (
                      <div className="space-y-5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
                          <div>
                            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                              <span>تنظیمات و احراز هویت Google Drive</span>
                              {storageConfig.gdriveToken && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                                  متصل
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {storageConfig.gdriveUser
                                ? `حساب متصل: ${storageConfig.gdriveUser}`
                                : 'برای ذخیره خودکار نسخه‌ها در گوگل درایو، با حساب گوگل وارد شوید.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleConnectGoogleDrive}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>{storageConfig.gdriveToken ? 'تغییر / اتصال مجدد گوگل' : 'ورود با حساب گوگل (Drive)'}</span>
                            </button>

                            {storageConfig.gdriveToken && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...storageConfig, gdriveToken: '', gdriveUser: '' };
                                  setStorageConfig(updated);
                                  saveStorageSettings(updated);
                                  showNotification('اتصال حساب گوگل درایو قطع شد.', 'info');
                                }}
                                className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              >
                                قطع اتصال
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              نام پوشه در Google Drive
                            </label>
                            <input
                              type="text"
                              value={storageConfig.gdriveFolder || 'Taraz_Backups'}
                              onChange={(e) => setStorageConfig({ ...storageConfig, gdriveFolder: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500 font-mono"
                              placeholder="Taraz_Backups"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                              فایل‌های بک‌آپ به صورت خودکار داخل این پوشه در درایو قرار می‌گیرند.
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              توکن دسترسی دستی (اختیاری برای سرورهای اختصاصی)
                            </label>
                            <input
                              type="password"
                              value={storageConfig.gdriveToken || ''}
                              onChange={(e) => setStorageConfig({ ...storageConfig, gdriveToken: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500 font-mono"
                              placeholder="Bearer ya29.a0..."
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* OneDrive Configuration */}
                    {storageConfig.cloudProvider === 'onedrive' && (
                      <div className="space-y-5">
                        <div className="pb-4 border-b border-slate-200/80">
                          <h4 className="text-sm font-black text-slate-900">تنظیمات Microsoft OneDrive</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            اتصال به سرویس وان‌درایو مایکروسافت از طریق توکن Microsoft Graph
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              توکن دسترسی Microsoft Graph API
                            </label>
                            <input
                              type="password"
                              value={storageConfig.onedriveToken || ''}
                              onChange={(e) => setStorageConfig({ ...storageConfig, onedriveToken: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500 font-mono"
                              placeholder="eyJ0eXAiOiJKV1Qi..."
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              مسیر پوشه در OneDrive
                            </label>
                            <input
                              type="text"
                              value={storageConfig.onedriveFolder || 'Taraz_Backups'}
                              onChange={(e) => setStorageConfig({ ...storageConfig, onedriveFolder: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500 font-mono"
                              placeholder="Taraz_Backups"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* S3 Configuration */}
                    {storageConfig.cloudProvider === 's3' && (
                      <div className="space-y-5">
                        <div className="pb-4 border-b border-slate-200/80">
                          <h4 className="text-sm font-black text-slate-900">تنظیمات فضای ابری S3 / آروان‌کلاد / لیارا</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            پشتیبان‌گیری در انواع سرویس‌های Object Storage منطبق بر استاندارد Amazon S3
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              آدرس Endpoint (سرور S3)
                            </label>
                            <input
                              type="text"
                              value={storageConfig.cloudAuthUrl || ''}
                              onChange={(e) => setStorageConfig({ ...storageConfig, cloudAuthUrl: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500 font-mono"
                              placeholder="s3.ir-thr-at1.arvanstorage.ir"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              نام باکت (Bucket Name)
                            </label>
                            <input
                              type="text"
                              value={storageConfig.cloudBucket || 'taraz-backups'}
                              onChange={(e) => setStorageConfig({ ...storageConfig, cloudBucket: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500 font-mono"
                              placeholder="taraz-backups"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              کلید دسترسی (Access Key)
                            </label>
                            <input
                              type="text"
                              value={storageConfig.cloudUser || ''}
                              onChange={(e) => setStorageConfig({ ...storageConfig, cloudUser: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500 font-mono"
                              placeholder="AKIA..."
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              کلید محرمانه (Secret Key)
                            </label>
                            <input
                              type="password"
                              value={storageConfig.cloudPass || ''}
                              onChange={(e) => setStorageConfig({ ...storageConfig, cloudPass: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500 font-mono"
                              placeholder="••••••••••••••••••••"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Test & Save Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isTestingCloud}
                          onClick={() => handleTestCloudConnection()}
                          className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isTestingCloud ? 'animate-spin' : ''}`} />
                          <span>تست ارتباط و اعتبارسنجی اتصال</span>
                        </button>

                        {cloudTestResult && (
                          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg ${
                            cloudTestResult.success
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {cloudTestResult.success ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5" />
                            )}
                            <span>{cloudTestResult.message}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => saveStorageSettings()}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>ذخیره تنظیمات ابری</span>
                      </button>
                    </div>
                  </div>

                  {/* Cloud Backups Table */}
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-indigo-600" />
                          <span>فهرست نسخه‌های ذخیره‌شده در فضای ابری</span>
                          <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                            {cloudBackups.length} نسخه
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          مشاهده، دانلود یا بازیابی اطلاعات از فضای ابری
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={loadCloudBackups}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingCloudBackups ? 'animate-spin' : ''}`} />
                          <span>بروزرسانی لیست</span>
                        </button>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                          <thead className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200">
                            <tr>
                              <th className="py-3.5 px-4">سرویس‌دهنده</th>
                              <th className="py-3.5 px-4">نام فایل</th>
                              <th className="py-3.5 px-4">تاریخ و زمان</th>
                              <th className="py-3.5 px-4">حجم</th>
                              <th className="py-3.5 px-4 text-left">عملیات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {cloudBackups.map((cb: any, idx: number) => {
                              const d = new Date(cb.time);
                              const dateStr = !isNaN(d.getTime())
                                ? new Intl.DateTimeFormat('fa-IR').format(d) + ' ' + d.toLocaleTimeString('fa-IR')
                                : '-';
                              const sizeMb = cb.size ? (cb.size / 1024 / 1024).toFixed(2) + ' MB' : '-';
                              
                              let providerBadge = (
                                <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-md">
                                  Google Drive
                                </span>
                              );
                              if (cb.provider === 'onedrive') {
                                providerBadge = (
                                  <span className="bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-md">
                                    OneDrive
                                  </span>
                                );
                              } else if (cb.provider === 's3') {
                                providerBadge = (
                                  <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-md">
                                    S3 Cloud
                                  </span>
                                );
                              }

                              return (
                                <tr key={cb.file || idx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-3.5 px-4">{providerBadge}</td>
                                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800" dir="ltr">
                                    {cb.file}
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-slate-600">{dateStr}</td>
                                  <td className="py-3.5 px-4 font-semibold text-slate-600">{sizeMb}</td>
                                  <td className="py-3.5 px-4 text-left">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {cb.url && (
                                        <a
                                          href={cb.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs"
                                          title="مشاهده یا دانلود از ابر"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          <span>دریافت</span>
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCloudBackup(cb.file)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="حذف از فهرست ابری"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {cloudBackups.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400">
                                  <UploadCloud className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                                  <p className="font-bold text-sm text-slate-600">هنوز نسخه‌ای در فضای ابری ذخیره نشده است</p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    با فشردن دکمه «پشتیبان‌گیری فوری و ذخیره در ابر» یا فعال‌سازی همگام‌سازی خودکار، نسخه‌ها در فضای ابری بارگذاری می‌شوند.
                                  </p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Manual Push of Existing Local Backup */}
                    {backups.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="text-xs">
                          <span className="font-bold text-slate-800">ارسال دستی یک نسخه محلی به فضای ابری: </span>
                          <span className="text-slate-500">می‌توانید آخرین نسخه پشتیبان ایجاد شده روی سرور را همین حالا به ابر بفرستید.</span>
                        </div>
                        <button
                          type="button"
                          disabled={!!isUploadingToCloud}
                          onClick={() => handleUploadSpecificToCloud(backups[0].file)}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {isUploadingToCloud ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>ارسال فایل «{backups[0].file}» به ابر</span>
                        </button>
                      </div>
                    )}
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

                  {/* Mode Selector: Both, Local, Cloud */}
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black text-indigo-900">شیوه نگهداری فایل‌های پشتیبان:</h4>
                      <p className="text-[11px] text-indigo-700/80 mt-0.5">
                        پیشنهاد سیستم: ذخیره همزمان محلی و ابری جهت حداکثر اطمینان از حفظ داده‌ها
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStorageConfig({ ...storageConfig, type: 'both' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          storageConfig.type === 'both'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        همزمان (محلی + ابری)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStorageConfig({ ...storageConfig, type: 'local' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          storageConfig.type === 'local'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        فقط محلی
                      </button>
                      <button
                        type="button"
                        onClick={() => setStorageConfig({ ...storageConfig, type: 'cloud' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          storageConfig.type === 'cloud'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        فقط ابری
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Local Storage Card */}
                     <div 
                        onClick={() => setStorageConfig({...storageConfig, type: storageConfig.type === 'cloud' ? 'both' : storageConfig.type})}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                          storageConfig.type === 'local' || storageConfig.type === 'both' ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                     >
                        <div className="flex items-start justify-between mb-4">
                          <Server className={`w-8 h-8 ${storageConfig.type === 'local' || storageConfig.type === 'both' ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${storageConfig.type === 'local' || storageConfig.type === 'both' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                            {(storageConfig.type === 'local' || storageConfig.type === 'both') && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <h4 className="text-base font-black text-slate-800 mb-1">سرور محلی (Local)</h4>
                        <p className="text-xs text-slate-500 font-medium mb-6">ذخیره روی هارد دیسک سرور فعلی</p>
                        
                        <div className="space-y-4" onClick={e => e.stopPropagation()}>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">مسیر پوشه محلی</label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                dir="ltr"
                                value={storageConfig.localPath}
                                onChange={e => setStorageConfig({...storageConfig, localPath: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-left bg-white" 
                                placeholder="/backups"
                              />
                              <button type="button" onClick={() => openPathPicker(storageConfig.localPath)} className="px-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm text-slate-600">
                                <FolderOpen className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                     </div>

                     {/* Cloud Storage Card */}
                     <div 
                        onClick={() => setStorageConfig({...storageConfig, type: storageConfig.type === 'local' ? 'both' : storageConfig.type})}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                          storageConfig.type === 'cloud' || storageConfig.type === 'both' ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                     >
                        <div className="flex items-start justify-between mb-4">
                          <UploadCloud className={`w-8 h-8 ${storageConfig.type === 'cloud' || storageConfig.type === 'both' ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${storageConfig.type === 'cloud' || storageConfig.type === 'both' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                            {(storageConfig.type === 'cloud' || storageConfig.type === 'both') && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <h4 className="text-base font-black text-slate-800 mb-1">فضای ابری (Cloud)</h4>
                        <p className="text-xs text-slate-500 font-medium mb-4">اتصال به Google Drive، OneDrive یا S3</p>
                        
                        <div className="space-y-4" onClick={e => e.stopPropagation()}>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">ارائه‌دهنده فعال ابری</label>
                            <select 
                              value={storageConfig.cloudProvider}
                              onChange={e => setStorageConfig({...storageConfig, cloudProvider: e.target.value})}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 bg-white"
                            >
                              <option value="gdrive">گوگل درایو (Google Drive)</option>
                              <option value="onedrive">مایکروسافت وان‌درایو (OneDrive)</option>
                              <option value="s3">ابری سازگار با S3 (آروان / لیارا / AWS)</option>
                            </select>
                          </div>

                          <button 
                            type="button"
                            onClick={() => setActiveTab('cloud')}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>تنظیمات و مدیریت پیشرفته ابری</span>
                          </button>
                        </div>
                     </div>
                  </div>
                  
                  <div className="pt-8 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => saveStorageSettings()}
                      className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-slate-200 cursor-pointer"
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
                    
  <div className="flex flex-wrap gap-2 items-center">
    <button 
      onClick={handleRevertSafetySnapshot} 
      disabled={isRevertingSafety}
      title="در صورت بروز خطا یا نیاز به بازگشت، سیستم به آخرین نسخه ایمنی اضطراری قبل از بازیابی بازمی‌گردد"
      className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
    >
      <ShieldCheck className="w-4 h-4 text-amber-600" /> 
      {isRevertingSafety ? 'در حال بازگشت...' : 'بازگشت به نسخه ایمنی اضطراری'}
    </button>
    <input type="file" ref={fileInputRef} className="hidden" accept=".json,.sql" onChange={handleFileUpload} />
    <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm">
      <Upload className="w-4 h-4" /> آپلود فایل بک‌آپ خارجی
    </button>
  </div>

                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50/80 text-slate-600 font-black text-xs border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-4">تاریخ و زمان</th>
                            <th className="px-5 py-4">حجم</th>
                            <th className="px-5 py-4">نوع بک‌آپ</th>
                            <th className="px-5 py-4">امنیت</th>
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
                                {b.isEncrypted ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> AES-256-GCM
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                    عادی
                                  </span>
                                )}
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
                                <button onClick={() => window.open(`/api/db/backups/download/${b.file}`, '_blank')} title="دانلود فایل" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100">
                                  <Download className="w-4 h-4" />
                                </button>
                                <button title="حذف" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100" onClick={() => handleDeleteBackup(b.file)}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedBackupForRestore(b);
                                    setIsRestoreModalOpen(true);
                                    fetchDryRunPreview(b.file);
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
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
            >
              {restoreState === 'confirm' && (
                <>
                  <div className="bg-rose-50 p-5 text-center border-b border-rose-100 flex-shrink-0">
                    <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-sm">
                      <AlertCircle className="w-7 h-7 text-rose-600" />
                    </div>
                    <h3 className="text-xl font-black text-rose-700 mb-1">پیش‌نمایش و تأیید بازیابی اطلاعات (Restore)</h3>
                    <p className="text-xs text-rose-600/90 font-bold">بررسی تفاوت‌ها و سازگاری ساختار قبل از جایگزینی داده‌ها</p>
                  </div>
                  
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-black text-slate-800" dir="ltr">{selectedBackupForRestore?.date} - {selectedBackupForRestore?.time}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">حجم: {selectedBackupForRestore?.size} | نام فایل: {selectedBackupForRestore?.file}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedBackupForRestore?.isEncrypted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" /> رمزنگاری‌شده AES-256-GCM
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                            فرمت عادی
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dry-run Analysis section */}
                    {isLoadingDryRun && (
                      <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-xl text-center space-y-2">
                        <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
                        <p className="text-sm font-bold text-indigo-900">در حال آنالیز ساختار و سنجش تفاوت داده‌های فایل پشتیبان...</p>
                      </div>
                    )}

                    {!isLoadingDryRun && dryRunData && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold bg-slate-100/70 p-3 rounded-xl border border-slate-200">
                          <span className="text-slate-600">تعداد رکوردهای موجود در فایل پشتیبان: <strong className="text-slate-900 font-black">{dryRunData.totalBackupRecords?.toLocaleString('fa-IR')}</strong></span>
                          <span className="text-slate-600">تعداد رکوردهای کنونی پایگاه داده: <strong className="text-slate-900 font-black">{dryRunData.totalCurrentRecords?.toLocaleString('fa-IR')}</strong></span>
                        </div>

                        {/* Warnings if any */}
                        {dryRunData.warnings && dryRunData.warnings.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 space-y-1">
                            <div className="font-black flex items-center gap-1 text-amber-900 mb-1">
                              <AlertTriangle className="w-4 h-4 text-amber-600" /> هشدارهای سازگاری و کاهش داده:
                            </div>
                            {dryRunData.warnings.map((w: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-1">
                                <span className="text-amber-500">•</span>
                                <span>{w}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Comparison Table */}
                        {dryRunData.comparison && dryRunData.comparison.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-100/80 px-3 py-2 text-xs font-black text-slate-700 border-b border-slate-200 flex justify-between">
                              <span>جدول و نوع داده</span>
                              <span>تعداد در بک‌آپ / فعلی / تفاوت</span>
                            </div>
                            <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 text-xs">
                              {dryRunData.comparison.map((c: any) => (
                                <div key={c.table} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50">
                                  <div className="font-bold text-slate-700">
                                    {c.label} <span className="text-[10px] text-slate-400 font-mono">({c.table})</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-slate-500 font-mono">{c.backupCount}</span>
                                    <span className="text-slate-300">/</span>
                                    <span className="text-slate-500 font-mono">{c.currentCount}</span>
                                    <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[11px] ${
                                      c.diff > 0 ? 'bg-emerald-100 text-emerald-800' : 
                                      c.diff < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {c.diff > 0 ? `+${c.diff}` : c.diff}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          <span>
                            <strong>تضمین تاب‌آوری:</strong> یک نسخه ایمنی اضطراری (Safety Snapshot) به صورت کاملاً خودکار قبل از بازنویسی دیتابیس ایجاد می‌شود تا در صورت نیاز به سرعت بازگردانی شود.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex gap-3 flex-shrink-0">
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
                        تأیید و اجرای بازیابی
                      </button>
                    </div>
                  </div>
                </>
              )}

              {restoreState === 'progress' && (
                <div className="p-10 text-center space-y-6">
                  <div className="relative w-24 h-24 mx-auto">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-[4px] border-slate-100 border-t-indigo-600"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-indigo-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">در حال بازیابی اطلاعات...</h3>
                    <p className="text-sm font-medium text-slate-500 mt-2">لطفاً تا پایان عملیات این پنجره را نبندید.</p>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${restoreProgress}%` }}
                    />
                  </div>
                  <p className="text-xs font-bold text-indigo-600">{restoreProgress}% تکمیل شده</p>
                </div>
              )}

              {restoreState === 'success' && (
                <div className="p-10 text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                    className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto border-8 border-emerald-50"
                  >
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-black text-emerald-700">بازیابی با موفقیت انجام شد!</h3>
                    <p className="text-sm font-medium text-slate-500 mt-2">سیستم اکنون با داده‌های جدید در دسترس است.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsRestoreModalOpen(false);
                      setRestoreState('confirm');
                      setSelectedBackupForRestore(null);
                      // Force a hard reload if necessary, or let react re-render based on new state.
                      window.location.reload();
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-200"
                  >
                    تازه‌سازی سیستم (بازنشانی)
                  </button>
                </div>
              )}

              {restoreState === 'error' && (
                <div className="p-10 text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                    className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mx-auto border-8 border-rose-50"
                  >
                    <XCircle className="w-10 h-10 text-rose-600" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-black text-rose-700">خطا در عملیات بازیابی</h3>
                    <p className="text-sm font-medium text-slate-500 mt-2">متأسفانه بازیابی اطلاعات با مشکل مواجه شد. لاگ‌ها را بررسی کنید.</p>
                    {restoreErrorMessage && (
                      <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium text-right direction-ltr overflow-auto max-h-32 whitespace-pre-wrap">
                        {restoreErrorMessage}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setIsRestoreModalOpen(false);
                      setRestoreState('confirm');
                      setRestoreErrorMessage('');
                    }}
                    className="w-full py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                  >
                    بستن پنجره
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPathPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPathPickerOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
              style={{ maxHeight: '80vh' }}
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-indigo-600" />
                  انتخاب مسیر ذخیره‌سازی
                </h3>
                <button onClick={() => setIsPathPickerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 border-b border-slate-100">
                <div className="text-xs font-mono text-slate-600 bg-slate-100 p-2 rounded-lg break-all" dir="ltr">
                  {pickerPath}
                </div>
              </div>

              <div className="p-2 overflow-y-auto flex-1 bg-white" dir="ltr">
                {pickerParent && (
                  <button 
                    onClick={() => loadPickerPath(pickerParent)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-sm font-medium border border-transparent hover:border-slate-200"
                  >
                    <FolderOpen className="w-5 h-5 text-slate-400" />
                    ..
                  </button>
                )}
                
                {pickerFolders.map(folder => (
                  <button 
                    key={folder}
                    onClick={() => loadPickerPath(pickerPath + (pickerPath.endsWith('/') || pickerPath.endsWith('\\') ? '' : '/') + folder)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-sm font-medium border border-transparent hover:border-slate-200"
                  >
                    <FolderOpen className="w-5 h-5 text-indigo-400" />
                    {folder}
                  </button>
                ))}
                
                {pickerFolders.length === 0 && !pickerParent && (
                  <div className="p-4 text-center text-slate-400 text-sm">پوشه‌ای یافت نشد</div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                <button 
                  onClick={() => setIsPathPickerOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-sm transition-colors shadow-sm"
                >
                  انصراف
                </button>
                <button 
                  onClick={() => {
                     setStorageConfig({...storageConfig, localPath: pickerPath});
                     setIsPathPickerOpen(false);
                  }}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-200"
                >
                  انتخاب این پوشه
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
