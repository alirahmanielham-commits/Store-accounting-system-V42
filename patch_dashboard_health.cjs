const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

// Add states for Health & Stats
const stateInjectionPoint = /const \[logs, setLogs\] = useState\(\[/;
const newStates = `
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
      setHealthData(await hRes.json());
      setTableSizes(await sRes.json());
    } catch(e) { console.error(e); }
    setLoadingHealth(false);
  };

  useEffect(() => {
    if (activeTab === 'health') {
      loadHealthData();
    }
  }, [activeTab]);

  `;

code = code.replace(stateInjectionPoint, newStates + 'const [logs, setLogs] = useState([');

// Add health tab to tabs array
const tabsInjection = /\{ id: 'manual', label: 'بک‌آپ دستی', icon: Play \},/;
code = code.replace(tabsInjection, "{ id: 'health', label: 'سلامت و فضا', icon: Server },\n    { id: 'manual', label: 'بک‌آپ دستی', icon: Play },");

// Update config loading to load storage config correctly
const loadConfigRegex = /setStorageConfig\(prev => \(\{ \.\.\.prev, localPath: data\.path \}\)\);/;
code = code.replace(loadConfigRegex, `setStorageConfig(prev => ({ ...prev, localPath: data.path, type: data.storageType || 'local', cloudProvider: data.remoteProvider || 's3' }));`);

// Update saving storage config to include type
const saveStorageFn = /body: JSON\.stringify\(\{ path: storageConfig\.localPath \}\)/;
code = code.replace(saveStorageFn, `body: JSON.stringify({ path: storageConfig.localPath, storageType: storageConfig.type, remoteProvider: storageConfig.cloudProvider })`);

// Render Health Tab
const renderInjectionPoint = /\{\/\* --- 1\. Manual Backup ---\ \*\/\}/;
const healthRender = `
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
                      <RefreshCw className={\`w-4 h-4 \${loadingHealth ? 'animate-spin' : ''}\`} /> بروزرسانی
                    </button>
                  </div>
                  
                  {/* Health Check Cards */}
                  {healthData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={\`p-5 rounded-2xl border \${healthData.permissionsOk ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}\`}>
                        <div className="flex items-center gap-3 mb-2">
                          {healthData.permissionsOk ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-rose-500" />}
                          <h4 className={\`font-bold \${healthData.permissionsOk ? 'text-emerald-700' : 'text-rose-700'}\`}>دسترسی فایل‌ها</h4>
                        </div>
                        <p className={\`text-xs \${healthData.permissionsOk ? 'text-emerald-600' : 'text-rose-600'}\`}>
                          {healthData.permissionsOk ? 'پوشه بک‌آپ دارای دسترسی خواندن و نوشتن است.' : \`خطا در دسترسی: \${healthData.permissionsError}\`}
                        </p>
                      </div>

                      <div className={\`p-5 rounded-2xl border \${healthData.connectionOk ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}\`}>
                        <div className="flex items-center gap-3 mb-2">
                          {healthData.connectionOk ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-rose-500" />}
                          <h4 className={\`font-bold \${healthData.connectionOk ? 'text-emerald-700' : 'text-rose-700'}\`}>اتصال به پایگاه داده</h4>
                        </div>
                        <p className={\`text-xs \${healthData.connectionOk ? 'text-emerald-600' : 'text-rose-600'}\`}>
                          {healthData.connectionOk ? 'ارتباط با پایگاه داده پایدار و بدون مشکل است.' : \`خطا در ارتباط: \${healthData.connectionError}\`}
                        </p>
                      </div>

                      <div className={\`p-5 rounded-2xl border \${healthData.orphanedRecords === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}\`}>
                        <div className="flex items-center gap-3 mb-2">
                          {healthData.orphanedRecords === 0 ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <AlertTriangle className="w-6 h-6 text-amber-500" />}
                          <h4 className={\`font-bold \${healthData.orphanedRecords === 0 ? 'text-emerald-700' : 'text-amber-700'}\`}>رکوردهای یتیم</h4>
                        </div>
                        <p className={\`text-xs \${healthData.orphanedRecords === 0 ? 'text-emerald-600' : 'text-amber-600'}\`}>
                          {healthData.orphanedRecords === 0 ? 'هیچ رکورد بدون مرجعی در دفتر کل یافت نشد.' : \`هشدار: تعداد \${healthData.orphanedRecords} رکورد یتیم در سیستم یافت شد!\`}
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
                                    <div className="bg-indigo-500 h-full rounded-full" style={{width: \`\${Math.max(percent, 1)}%\`}}></div>
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
`;

code = code.replace(renderInjectionPoint, healthRender);

fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
console.log('DatabaseDashboard UI updated with health check and table sizes.');
