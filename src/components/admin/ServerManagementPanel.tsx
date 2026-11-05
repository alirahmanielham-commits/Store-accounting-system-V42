import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, 
  Activity, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  ShieldAlert, 
  Database, 
  Terminal, 
  Clock, 
  Play, 
  PowerOff, 
  FolderDown,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toPersianDigits, formatPrice } from '../../utils/format';

interface ServerInfo {
  platform: string;
  hostname?: string;
  arch: string;
  totalMem: number;
  freeMem: number;
  cpus: number;
  uptime: number;
  nodeVersion: string;
  port: number;
  networkIps?: string[];
}

export default function ServerManagementPanel() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchServerDetails = useCallback(async () => {
    try {
      const startTime = performance.now();
      const healthRes = await fetch('/api/health');
      const endTime = performance.now();
      
      if (healthRes.ok) {
        setHealthStatus('online');
        setLatency(Math.round(endTime - startTime));
      } else {
        setHealthStatus('offline');
        setLatency(null);
      }
    } catch {
      setHealthStatus('offline');
      setLatency(null);
    }

    try {
      const [sysRes, dbRes] = await Promise.all([
        fetch('/api/system/info'),
        fetch('/api/setup/status')
      ]);

      if (sysRes.ok) {
        const sysData = await sysRes.json();
        setServerInfo(sysData);
      }

      if (dbRes.ok) {
        const dbData = await dbRes.json();
        setDbStatus(dbData);
      }
    } catch (err) {
      console.error('Failed to load system details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServerDetails();
    const interval = setInterval(fetchServerDetails, 15000);
    return () => clearInterval(interval);
  }, [fetchServerDetails]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchServerDetails();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleQuickBackup = async () => {
    setBackupLoading(true);
    setBackupMessage(null);
    try {
      const res = await fetch('/api/db/backups/create', { method: 'POST' });
      const data = await res.json();
      if (res.ok && (data.success || data.filename)) {
        setBackupMessage({
          text: `نسخه پشتیبان با نام «${data.filename || 'جدید'}» با موفقیت ذخیره گردید.`,
          type: 'success'
        });
      } else {
        setBackupMessage({
          text: data.error || 'خطا در ایجاد نسخه پشتیبان پایگاه داده.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setBackupMessage({
        text: 'عدم برقراری ارتباط با سرویس پشتیبان‌گیری: ' + (err.message || ''),
        type: 'error'
      });
    } finally {
      setBackupLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return 'کمتر از ۱ دقیقه';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${toPersianDigits(d)} روز`);
    if (h > 0) parts.push(`${toPersianDigits(h)} ساعت`);
    if (m > 0) parts.push(`${toPersianDigits(m)} دقیقه`);
    return parts.join(' و ') || 'کمتر از ۱ دقیقه';
  };

  const port = serverInfo?.port || 3000;
  const usedMem = serverInfo ? serverInfo.totalMem - serverInfo.freeMem : 0;
  const memPercent = serverInfo && serverInfo.totalMem ? Math.round((usedMem / serverInfo.totalMem) * 100) : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Activity className="w-10 h-10 animate-pulse text-emerald-500" />
          <p className="font-bold text-base animate-pulse">در حال فراخوانی وضعیت سرور و مشخصات فنی...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Server className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              پنل مدیریت و راه‌اندازی سرور
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              مدیریت و نظارت یکپارچه بر پورت ۳۰۰۰، وضعیت شبکه، منابع و پایداری سیستم
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <span className={`w-3 h-3 rounded-full ${healthStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {healthStatus === 'online' ? 'سرور فعال و پاسخگو' : 'عدم دسترسی به سرور'}
            </span>
            {latency !== null && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                ({toPersianDigits(latency)}ms)
              </span>
            )}
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>بروزرسانی</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Port Status */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">پورت سرویس‌دهنده</span>
            <Wifi className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white font-mono" dir="ltr">
            Port {port}
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>مسیر اصلی وب: http://localhost:{port}</span>
          </div>
        </div>

        {/* Memory Consumption */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">حافظه موقت (RAM)</span>
            <HardDrive className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 dark:text-white">
              {toPersianDigits(memPercent)}٪
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${memPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            مصرف: {formatBytes(usedMem)} از {formatBytes(serverInfo?.totalMem || 0)}
          </div>
        </div>

        {/* Server Uptime */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">مدت فعالیت پیوسته</span>
            <Clock className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-lg font-black text-slate-800 dark:text-white">
            {serverInfo ? formatUptime(serverInfo.uptime) : '-'}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            سیستم‌عامل: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{serverInfo?.platform || 'Linux'}</span> ({serverInfo?.arch || 'x64'})
          </div>
        </div>

        {/* Node & Hardware */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold">هسته پردازنده و محیط اجرا</span>
            <Cpu className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-white font-mono" dir="ltr">
            {toPersianDigits(serverInfo?.cpus || 1)} Cores
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            Node: {serverInfo?.nodeVersion || process.version}
          </div>
        </div>
      </div>

      {/* Network Access & Local Sharing Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
          <Wifi className="w-5 h-5 text-emerald-500" />
          آدرس‌های دسترسی در شبکه محلی و سیستم (IP Addresses)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          جهت اتصال سایر کامپیوترها یا موبایل‌های متصل به مودم و شبکه وای‌فای، می‌توانید از آدرس‌های زیر استفاده نمایید:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Localhost */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div>
              <span className="text-[11px] text-slate-400 block font-bold">دسترسی مستقیم همین رایانه:</span>
              <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                http://localhost:{port}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(`http://localhost:${port}`)}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition"
              title="کپی آدرس"
            >
              {copiedText === `http://localhost:${port}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Network IPs */}
          {serverInfo?.networkIps && serverInfo.networkIps.length > 0 ? (
            serverInfo.networkIps.map((ip) => {
              const url = `http://${ip}:${port}`;
              return (
                <div key={ip} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-bold">آدرس شبکه داخلی (LAN):</span>
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                      {url}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(url)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition"
                    title="کپی آدرس"
                  >
                    {copiedText === url ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div>
                <span className="text-[11px] text-slate-400 block font-bold">آدرس شبکه پیش‌فرض:</span>
                <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                  http://0.0.0.0:{port}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(`http://0.0.0.0:${port}`)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition"
                title="کپی آدرس"
              >
                {copiedText === `http://0.0.0.0:${port}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Database & Quick Backup Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Status Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-indigo-500" />
              وضعیت پایگاه داده سیستم
            </h2>
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">نوع موتور دیتابیس فعال:</span>
                <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {dbStatus?.engine ? dbStatus.engine.toUpperCase() : 'POSTGRESQL'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">وضعیت اتصال پایگاه داده:</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  برقرار و بهینه‌سازی شده
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">نام پایگاه داده:</span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300" dir="ltr">
                  {dbStatus?.dbName || 'store_db'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
            <a
              href="#/database_dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition"
            >
              <span>مشاهده داشبورد پیشرفته جداول دیتابیس</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Quick Operations & Backup */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
              <FolderDown className="w-5 h-5 text-emerald-500" />
              عملیات فوری و پشتیبان‌گیری پایگاه داده
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              با یک کلیک از کلیه اطلاعات جاری، جداول مالی و فاکتورها نسخه پشتیبان امن با برچسب زمانی ایجاد نمایید:
            </p>

            <button
              onClick={handleQuickBackup}
              disabled={backupLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
            >
              <FolderDown className={`w-5 h-5 ${backupLoading ? 'animate-bounce' : ''}`} />
              <span>{backupLoading ? 'در حال تهیه نسخه پشتیبان...' : 'تهیه نسخه پشتیبان سریع (Quick Backup)'}</span>
            </button>

            {backupMessage && (
              <div className={`mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                backupMessage.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              }`}>
                {backupMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{backupMessage.text}</span>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <a
              href="#/drive_backup"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 transition"
            >
              <span>مشاهده و مدیریت فایل‌های پشتیبان</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Terminal Commands Guide */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
          <Terminal className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          راهنمای دستورات راه‌اندازی و کنترل سرور از ترمینال
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">راه‌اندازی حالت توسعه (Dev Mode):</span>
              <button
                onClick={() => copyToClipboard('npm run dev')}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {copiedText === 'npm run dev' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>کپی</span>
              </button>
            </div>
            <code className="block font-mono text-emerald-400 text-xs bg-slate-950 p-2.5 rounded-lg text-left" dir="ltr">
              npm run dev
            </code>
          </div>

          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">راه‌اندازی حالت نهایی (Production):</span>
              <button
                onClick={() => copyToClipboard('npm start')}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {copiedText === 'npm start' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>کپی</span>
              </button>
            </div>
            <code className="block font-mono text-emerald-400 text-xs bg-slate-950 p-2.5 rounded-lg text-left" dir="ltr">
              npm start
            </code>
          </div>

          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">توقف و آزادسازی پورت ۳۰۰۰ در ویندوز (Kill Port 3000):</span>
              <button
                onClick={() => copyToClipboard('FOR /F "tokens=5" %T IN (\'netstat -a -n -o ^| findstr :3000\') DO taskkill /F /T /PID %T')}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {copiedText?.includes('netstat') ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>کپی دستور</span>
              </button>
            </div>
            <code className="block font-mono text-rose-400 text-xs bg-slate-950 p-2.5 rounded-lg text-left overflow-x-auto" dir="ltr">
              FOR /F &quot;tokens=5&quot; %T IN (&apos;netstat -a -n -o ^| findstr :3000&apos;) DO taskkill /F /T /PID %T
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
