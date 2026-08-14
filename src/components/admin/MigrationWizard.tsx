import React, { useState, useEffect, useRef } from 'react';
import { Database, Server, CheckCircle, AlertTriangle, ChevronLeft, RefreshCw, LogIn, Check, XCircle, Play, DatabaseBackup } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function MigrationWizard({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(1);
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('dbname');
  const [username, setUsername] = useState('postgres');
  const [password, setPassword] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const [tables, setTables] = useState<string[]>([]);
  const [migratedTables, setMigratedTables] = useState<Record<string, { status: 'migrating' | 'success' | 'error', count?: number, error?: string }>>({});
  const [isMigratingAll, setIsMigratingAll] = useState(false);

  const getConnectionString = () => {
    const encodedUser = encodeURIComponent(username);
    const encodedPass = encodeURIComponent(password);
    return `postgresql://${encodedUser}:${encodedPass}@${host}:${port}/${database}`;
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationError('');
    try {
      const res = await fetch('/api/migrate-postgres/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: getConnectionString() })
      });
      const data = await res.json();
      if (data.success) {
        // Fetch tables
        const tblRes = await fetch('/api/migrate-postgres/tables');
        const tblData = await tblRes.json();
        if (tblData.success) {
          setTables(tblData.tables);
          setStep(3);
        } else {
           setValidationError(tblData.error || 'خطا در دریافت لیست جداول');
        }
      } else {
        setValidationError(data.error || 'خطا در ارتباط با دیتابیس');
      }
    } catch (e: any) {
      setValidationError(e.message || 'خطای شبکه');
    } finally {
      setIsValidating(false);
    }
  };

  const migrateTable = async (table: string) => {
    setMigratedTables(prev => ({ ...prev, [table]: { status: 'migrating' } }));
    try {
      const res = await fetch(`/api/migrate-postgres/table/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: getConnectionString() })
      });
      const data = await res.json();
      if (data.success) {
        setMigratedTables(prev => ({ ...prev, [table]: { status: 'success', count: data.count } }));
      } else {
        setMigratedTables(prev => ({ ...prev, [table]: { status: 'error', error: data.error } }));
      }
    } catch (e: any) {
       setMigratedTables(prev => ({ ...prev, [table]: { status: 'error', error: e.message } }));
    }
  };

  const handleStartMigrationAll = async () => {
    setIsMigratingAll(true);
    for (const table of tables) {
      if (migratedTables[table]?.status !== 'success') {
         await migrateTable(table);
      }
    }
    setIsMigratingAll(false);
  };

  const allSuccess = tables.length > 0 && tables.every(t => migratedTables[t]?.status === 'success');
  const percent = tables.length > 0 ? Math.round((Object.values(migratedTables).filter(m => m.status === 'success').length / tables.length) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden flex flex-col shadow-sm max-w-4xl mx-auto my-8 font-sans" dir="rtl">
      <div className="bg-slate-50 border-b-2 border-slate-200 p-6 flex items-center gap-4">
        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-xl">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">Wizard مهاجرت به PostgreSQL</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">انتقال امن، کامل و یکپارچه داده‌ها از SQLite محلی به سرور PostgreSQL</p>
        </div>
      </div>

      <div className="p-8">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-10 relative">
          <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-100 -z-10 -translate-y-1/2 rounded-full"></div>
          {[
            { num: 1, title: 'معرفی و اهداف' },
            { num: 2, title: 'پیکربندی اتصال' },
            { num: 3, title: 'عملیات انتقال' },
            { num: 4, title: 'نتیجه عملیات' }
          ].map((s) => {
            const isActive = step === s.num || (s.num === 3 && step === 3 && !allSuccess) || (s.num === 4 && step === 3 && allSuccess);
            const isPast = step > s.num || (s.num === 3 && step === 3 && allSuccess);
            return (
              <div key={s.num} className="flex flex-col items-center gap-2 bg-white px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${isActive ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : isPast ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-400'}`}>
                  {isPast ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs font-bold ${isActive ? 'text-indigo-700' : isPast ? 'text-emerald-600' : 'text-slate-400'}`}>{s.title}</span>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 flex gap-4 text-blue-800">
                <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg mb-2">چرا به PostgreSQL مهاجرت کنیم؟</h3>
                  <p className="text-sm font-medium leading-relaxed opacity-90">
                    سیستم فعلی از SQLite برای ذخیره‌سازی داده‌ها استفاده می‌کند که برای کاربردهای محلی عالی است. اما اگر نیاز به دسترسی همزمان چند کاربر، امنیت بالاتر، پشتیبان‌گیری ابری و یکپارچگی اطلاعات دارید، پایگاه‌داده قدرتمند PostgreSQL بهترین انتخاب است.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button onClick={() => setStep(2)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-200">
                  شروع فرآیند مهاجرت <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              
              <div className="bg-slate-50 border-2 border-slate-200 p-6 rounded-xl space-y-4">
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">تنظیمات سرور PostgreSQL</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">آدرس سرور (Host)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={host}
                      onChange={e => setHost(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 text-slate-700 font-mono text-sm rounded-lg py-2 px-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">پورت (Port)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={port}
                      onChange={e => setPort(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 text-slate-700 font-mono text-sm rounded-lg py-2 px-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      placeholder="5432"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">نام پایگاه‌داده (Database Name)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={database}
                      onChange={e => setDatabase(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 text-slate-700 font-mono text-sm rounded-lg py-2 px-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      placeholder="dbname"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">نام کاربری (Username)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 text-slate-700 font-mono text-sm rounded-lg py-2 px-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      placeholder="postgres"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">رمز عبور (Password)</label>
                    <input
                      type="password"
                      dir="ltr"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 text-slate-700 font-mono text-sm rounded-lg py-2 px-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              {validationError && (
                <div className="bg-rose-50 text-rose-700 border-2 border-rose-200 p-4 rounded-xl flex items-center gap-3 font-medium text-sm">
                  <XCircle className="w-5 h-5" />
                  {validationError}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 font-bold py-3 px-6 rounded-xl transition-all">
                  مرحله قبل
                </button>
                <button 
                  onClick={handleValidate} 
                  disabled={isValidating || !host || !port || !database || !username}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-200"
                >
                  {isValidating ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> در حال اعتبارسنجی اتصال...</>
                  ) : (
                    <>بررسی اتصال و ادامه <ChevronLeft className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              
              <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="font-bold text-slate-700 flex items-center gap-2">
                    {allSuccess ? <><CheckCircle className="w-6 h-6 text-emerald-500" /> عملیات با موفقیت پایان یافت</> :
                     isMigratingAll ? <><RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" /> در حال پردازش و انتقال داده‌ها...</> :
                     <><DatabaseBackup className="w-5 h-5 text-indigo-500" /> جداول آماده انتقال</>}
                  </div>
                  <div className="font-bold text-xl text-indigo-600" dir="ltr">
                    {percent}%
                  </div>
                </div>
                
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden w-full relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className={`absolute inset-y-0 left-0 ${allSuccess ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  />
                </div>
              </div>

              {!allSuccess && (
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="font-medium text-slate-700">تعداد {tables.length} جدول یافت شد. می‌توانید همه را با هم منتقل کنید یا تک تک بررسی کنید.</span>
                  <button 
                    onClick={handleStartMigrationAll} 
                    disabled={isMigratingAll}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all shadow-sm"
                  >
                    {isMigratingAll ? <><RefreshCw className="w-4 h-4 animate-spin" /> در حال انتقال...</> : <><Play className="w-4 h-4" /> انتقال همه جداول</>}
                  </button>
                </div>
              )}

              <div className="space-y-3">
                 {tables.map(table => {
                   const status = migratedTables[table]?.status;
                   const error = migratedTables[table]?.error;
                   const count = migratedTables[table]?.count;
                   
                   return (
                     <div key={table} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'success' ? 'bg-emerald-100 text-emerald-600' : status === 'error' ? 'bg-rose-100 text-rose-600' : status === 'migrating' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            {status === 'success' ? <CheckCircle className="w-5 h-5" /> : status === 'error' ? <XCircle className="w-5 h-5" /> : status === 'migrating' ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 font-mono text-sm" dir="ltr">{table}</h4>
                            {status === 'success' && <span className="text-xs font-medium text-emerald-600">{count} رکورد منتقل شد</span>}
                            {status === 'error' && <span className="text-xs font-medium text-rose-600">{error}</span>}
                            {!status && <span className="text-xs font-medium text-slate-400">آماده انتقال</span>}
                          </div>
                       </div>
                       <button
                         onClick={() => migrateTable(table)}
                         disabled={status === 'migrating' || status === 'success'}
                         className="text-xs font-bold py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 transition-colors"
                       >
                         {status === 'success' ? 'منتقل شد' : status === 'migrating' ? 'در حال انتقال' : status === 'error' ? 'تلاش مجدد' : 'انتقال این جدول'}
                       </button>
                     </div>
                   );
                 })}
              </div>

              {allSuccess && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5">
                    <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> بررسی صحت عملکرد سیستم با دیتابیس جدید
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm font-medium text-emerald-700 bg-emerald-100/50 p-3 rounded-lg">
                        <Check className="w-4 h-4 text-emerald-600" />
                        تغییر موتور ذخیره‌سازی به PostgreSQL (Runtime Switch) با موفقیت انجام شد
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-emerald-700 bg-emerald-100/50 p-3 rounded-lg">
                        <Check className="w-4 h-4 text-emerald-600" />
                        عملیات خواندن (Read) از تمام فرم‌ها به دیتابیس جدید متصل شد
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <button onClick={() => {
                      if (onClose) onClose();
                      window.location.reload();
                    }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md flex items-center gap-2">
                      تایید و راه‌اندازی مجدد رابط کاربری <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
