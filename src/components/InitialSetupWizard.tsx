import React, { useState, useEffect } from 'react';
import { Database, Server, DatabaseBackup, Loader2, CheckCircle2, XCircle, UserPlus, ArrowLeft, KeySquare, HardDrive } from 'lucide-react';

export default function InitialSetupWizard({ onComplete }: { onComplete: () => void }) {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<{
     dbConfigured: boolean;
     usingEnvVars: boolean;
     adminConfigured: boolean;
     isComplete: boolean;
  }>({
     dbConfigured: false,
     usingEnvVars: false,
     adminConfigured: false,
     isComplete: false
  });

  // Step 1: DB
  const [dbType, setDbType] = useState<'postgres' | 'sqlite'>('postgres');
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('5432');
  const [dbUser, setDbUser] = useState('postgres');
  const [dbPass, setDbPass] = useState('');
  const [dbName, setDbName] = useState('store_db');
  
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{success: boolean; message: string} | null>(null);
  
  // Step 2: Admin
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  
  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (!password) return score;
    
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    
    return Math.min(100, score);
  };

  const passwordStrength = calculatePasswordStrength(adminPassword);
  const isPasswordStrong = passwordStrength >= 80;

  const getStrengthColor = (score: number) => {
    if (score < 40) return 'bg-rose-500';
    if (score < 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStrengthLabel = (score: number) => {
    if (score === 0) return '';
    if (score < 40) return 'ضعیف';
    if (score < 80) return 'متوسط';
    return 'قوی';
  };

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkStatus(true);
  }, []);

  const checkStatus = (isInitialLoad = false) => {
    fetch('/api/setup/status')
      .then(r => r.json())
      .then(data => {
        setStatus(data);
        if (data.adminUser?.username) {
          setAdminUsername(data.adminUser.username);
        }
        
        setNeedsSetup(true);
        if (data.isComplete) {
          onComplete();
        } else {
          if (!data.dbConfigured) setStep(1);
          else if (!data.adminConfigured) setStep(2);
        }
      })
      .catch(() => {
        setNeedsSetup(true);
        setStep(1);
      })
      .finally(() => setLoading(false));
  };

  const buildConnectionString = () => {
    if (dbType === 'sqlite') return 'sqlite';
    const auth = dbPass ? `${dbUser}:${encodeURIComponent(dbPass)}` : dbUser;
    return `postgresql://${auth}@${dbHost}:${dbPort}/${dbName}`;
  };

  const getBaseConnectionString = () => {
    if (dbType === 'sqlite') return 'sqlite';
    const auth = dbPass ? `${dbUser}:${encodeURIComponent(dbPass)}` : dbUser;
    return `postgresql://${auth}@${dbHost}:${dbPort}`;
  };

  const handleTestDb = async () => {
    if (dbType === 'sqlite') {
       setDbTestResult({ success: true, message: 'پایگاه داده SQLite به صورت محلی ذخیره می‌شود و در دسترس است.' });
       return;
    }
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: getBaseConnectionString(), dbName })
      });
      const data = await res.json();
      setDbTestResult({ success: data.success, message: data.message || data.error });
    } catch (err: any) {
      setDbTestResult({ success: false, message: err.message });
    } finally {
      setDbTesting(false);
    }
  };

  const handleSaveDb = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          connectionString: getBaseConnectionString(), 
          dbName, 
          engine: dbType 
        })
      });
      const data = await res.json();
      if (data.success) {
        checkStatus();
      } else {
        setError(data.error || 'خطا در اتصال و تنظیم پایگاه داده');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      const data = await res.json();
      if (data.success) {
        checkStatus();
      } else {
        setError(data.error || 'خطا در ثبت مدیر');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dir-rtl">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!needsSetup) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 dir-rtl" style={{ direction: 'rtl' }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar Status */}
        <div className="bg-slate-900 text-white p-8 md:w-1/3 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 border border-white/20">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">راه‌اندازی سیستم</h1>
            <p className="text-slate-400 text-xs leading-relaxed mb-8">
              پیکربندی اولیه نرم‌افزار شامل اتصال به پایگاه داده و تنظیم مدیر ارشد سیستم.
            </p>

            <div className="space-y-6">
              <div className="flex flex-col gap-2 relative">
                <div className={`flex items-center gap-3 ${step >= 1 ? 'text-white' : 'text-slate-500'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step > 1 ? 'bg-emerald-500 text-white' : step === 1 ? 'bg-indigo-500 text-white border-4 border-indigo-500/30' : 'bg-slate-800'}`}>
                    {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                  </div>
                  <span className="text-sm font-bold">پایگاه داده</span>
                </div>
                
                <div className="absolute top-8 bottom-[-16px] right-[15px] w-0.5 bg-slate-800"></div>

                <div className={`flex items-center gap-3 ${step >= 2 ? 'text-white' : 'text-slate-500'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step > 2 ? 'bg-emerald-500 text-white' : step === 2 ? 'bg-indigo-500 text-white border-4 border-indigo-500/30' : 'bg-slate-800'}`}>
                    {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                  </div>
                  <span className="text-sm font-bold">مدیر سیستم</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 font-mono">
            SETUP WIZARD v1.0
          </div>
        </div>

        <div className="p-8 md:w-2/3 w-full">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-in fade-in duration-500">
              <h2 className="text-xl font-black text-slate-800 mb-1">پیکربندی پایگاه داده</h2>
              <p className="text-slate-500 text-xs mb-8">
                نرم‌افزار برای ذخیره‌سازی اطلاعات به یک دیتابیس نیاز دارد.
              </p>

              {status.usingEnvVars && (
                 <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-start gap-3">
                    <DatabaseBackup className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="mb-1">پیکربندی از طریق متغیرهای محیطی (.env) با موفقیت شناسایی شد.</p>
                      <p className="font-normal opacity-80">در صورت تمایل می‌توانید این مرحله را نادیده گرفته و به مرحله بعد بروید.</p>
                    </div>
                 </div>
              )}

              <form onSubmit={handleSaveDb} className="space-y-5">
                <div>
                   <label className="block text-xs font-black text-slate-700 mb-2">نوع موتور پایگاه داده</label>
                   <div className="grid grid-cols-2 gap-3">
                     <button
                       type="button"
                       onClick={() => setDbType('postgres')}
                       className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${dbType === 'postgres' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                     >
                       <Server className="w-4 h-4" />
                       PostgreSQL
                     </button>
                     <button
                       type="button"
                       onClick={() => setDbType('sqlite')}
                       className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${dbType === 'sqlite' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                     >
                       <HardDrive className="w-4 h-4" />
                       SQLite (محلی)
                     </button>
                   </div>
                </div>

                {dbType === 'postgres' && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-300 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                          آدرس سرور (Host)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="localhost"
                          value={dbHost}
                          onChange={e => setDbHost(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-left text-xs"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                          پورت (Port)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="5432"
                          value={dbPort}
                          onChange={e => setDbPort(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-left text-xs"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                          نام کاربری (User)
                        </label>
                        <div className="relative">
                          <UserPlus className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                          <input
                            type="text"
                            required
                            placeholder="postgres"
                            value={dbUser}
                            onChange={e => setDbUser(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-left text-xs"
                            dir="ltr"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                          رمز عبور (Password)
                        </label>
                        <div className="relative">
                          <KeySquare className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                          <input
                            type="password"
                            placeholder="بدون رمز عبور"
                            value={dbPass}
                            onChange={e => setDbPass(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-left text-xs tracking-widest"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                        نام دیتابیس (DB Name)
                      </label>
                      <div className="relative">
                        <Database className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                        <input
                          type="text"
                          required
                          placeholder="store_db"
                          value={dbName}
                          onChange={e => setDbName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-left text-xs font-bold text-indigo-700"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {dbTestResult && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${dbTestResult.success ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                    {dbTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                    <div>{dbTestResult.message}</div>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleTestDb}
                    disabled={dbTesting || (dbType === 'postgres' && (!dbHost || !dbPort || !dbUser))}
                    className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-sm"
                  >
                    {dbTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تست اتصال'}
                  </button>
                  <button
                    type="submit"
                    disabled={saving || (dbType === 'postgres' && (!dbHost || !dbPort || !dbUser))}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-200"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ذخیره و ادامه'}
                  </button>
                  {status.usingEnvVars && (
                     <button
                       type="button"
                       onClick={() => setStep(2)}
                       className="sm:flex-none flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                     >
                       رد کردن <ArrowLeft className="w-4 h-4" />
                     </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-300">
              <h2 className="text-xl font-black text-slate-800 mb-1">حساب کاربری مدیر</h2>
              <p className="text-slate-500 text-xs mb-8">
                حساب مدیریت سیستم دارای دسترسی نامحدود به تمامی بخش‌هاست.
              </p>

              <form onSubmit={handleSaveAdmin} className="space-y-5 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">نام کاربری</label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-3 w-4 h-4 text-slate-300" />
                      <input
                        type="text"
                        required
                        value={adminUsername}
                        onChange={e => setAdminUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-left text-sm"
                        dir="ltr"
                      />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">رمز عبور امن</label>
                      {adminPassword && (
                        <span className={`text-[10px] font-bold ${passwordStrength < 40 ? 'text-rose-600' : passwordStrength < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {getStrengthLabel(passwordStrength)}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <KeySquare className="absolute left-3 top-3 w-4 h-4 text-slate-300" />
                      <input
                        type="password"
                        required
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-left text-sm tracking-widest"
                        dir="ltr"
                      />
                    </div>
                    {adminPassword && (
                      <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ease-out ${getStrengthColor(passwordStrength)}`}
                          style={{ width: `${passwordStrength}%` }}
                        ></div>
                      </div>
                    )}
                 </div>
                 <button
                    type="submit"
                    disabled={saving || !adminUsername || !isPasswordStrong}
                    className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-200"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تکمیل نصب و ورود به سیستم'}
                  </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}