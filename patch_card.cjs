const fs = require('fs');
let code = fs.readFileSync('src/components/financial/checks/CheckCardPage.tsx', 'utf8');

// Add activeTab, currentCheckId state
code = code.replace(
  'const [loading, setLoading] = useState(true);',
  `const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCheckId, setCurrentCheckId] = useState(checkId);
  const [allChecks, setAllChecks] = useState<any[]>([]);`
);

// update fetching logic
code = code.replace(
  'const data = checkType === "issued" ? await getIssuedChecks() : await getReceivedChecks();',
  `const data = checkType === "issued" ? await getIssuedChecks() : await getReceivedChecks();
      setAllChecks(data);`
);

code = code.replace(
  'const found = data.find((c: any) => String(c.id) === String(checkId));',
  `const found = data.find((c: any) => String(c.id) === String(currentCheckId));`
);

// update dependency array for loadData
code = code.replace(
  '[checkId, checkType]',
  '[currentCheckId, checkType]'
);

// Now the UI replacement:
// Locate <motion.div className="w-full max-w-4xl bg-white ...
// and change to max-w-6xl
code = code.replace(
  'max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"',
  'max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"'
);

// replace header
code = code.replace(
  /<div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 print:hidden">[\s\S]*?<\/div>/m,
  `<div className="p-6 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-50 sticky top-0 z-10 print:hidden gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <CreditCard className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 font-sans tracking-tight">کارت چک {checkType === 'issued' ? 'پرداختی' : 'دریافتی'}</h2>
            <p className="text-slate-500 text-sm mt-1">شناسه سیستم: {currentCheckId} | مبلغ: {check ? Number(check.amount).toLocaleString('fa-IR') : '---'} ریال</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm appearance-none"
              value={currentCheckId}
              onChange={(e) => setCurrentCheckId(e.target.value)}
            >
              {allChecks.map(c => (
                <option key={c.id} value={c.id}>چک {c.checkNumber} - {Number(c.amount).toLocaleString('fa-IR')} ریال</option>
              ))}
            </select>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-200 rounded-xl transition-colors text-slate-500">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <div className="px-6 pt-4 border-b border-slate-200 flex gap-6 overflow-x-auto print:hidden bg-slate-50">
        <button onClick={() => setActiveTab('info')} className={\`pb-3 px-2 font-bold text-sm whitespace-nowrap border-b-2 transition-colors \${activeTab === 'info' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}>اطلاعات اصلی</button>
        <button onClick={() => setActiveTab('history')} className={\`pb-3 px-2 font-bold text-sm whitespace-nowrap border-b-2 transition-colors \${activeTab === 'history' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}>تاریخچه وضعیت‌ها</button>
        <button onClick={() => setActiveTab('actions')} className={\`pb-3 px-2 font-bold text-sm whitespace-nowrap border-b-2 transition-colors \${activeTab === 'actions' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}>عملیات و تغییر وضعیت</button>
      </div>`
);


// Rewrite the body to use tabs. 
// We will just replace everything from `<div className="flex-1 overflow-y-auto p-6 bg-white">` to the end of that div.
const bodyRegex = /<div className="flex-1 overflow-y-auto p-6 bg-white">[\s\S]*?<\/div>\s*<\/div>\s*<\/motion\.div>/;

let newBody = `
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        {loading || !check ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-gray-500">در حال بارگذاری اطلاعات چک...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {activeTab === 'info' && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Status Card */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                    <div className={\`w-16 h-16 rounded-full flex items-center justify-center mb-4 \${stateColors[check.status]}\`}>
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <span className="text-slate-500 text-sm mb-1">وضعیت فعلی</span>
                    <span className={\`text-2xl font-black \${stateColors[check.status]?.replace('bg-', 'text-').replace('-100', '-600')}\`}>{stateLabels[check.status]}</span>
                  </div>

                  {/* Amount Card */}
                  <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center col-span-1 md:col-span-2 lg:col-span-2">
                    <span className="text-indigo-600/80 text-sm mb-2 font-bold">مبلغ چک</span>
                    <span className="text-4xl font-black text-indigo-700 tracking-tight font-sans" dir="ltr">{Number(check.amount).toLocaleString('fa-IR')} <span className="text-xl font-normal">ریال</span></span>
                    <span className="text-indigo-600 mt-2 text-sm">{Num2persian(check.amount)} ریال</span>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><FileText className="w-5 h-5 text-indigo-500"/> مشخصات چک</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <span className="block text-slate-500 text-xs mb-1">شماره چک</span>
                        <span className="font-bold text-slate-800 font-sans tracking-widest">{check.checkNumber || '---'}</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <span className="block text-slate-500 text-xs mb-1">شناسه صیاد</span>
                        <span className="font-bold text-slate-800 font-sans tracking-widest">{check.sayadId || '---'}</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <span className="block text-slate-500 text-xs mb-1">تاریخ صدور/دریافت</span>
                        <span className="font-bold text-slate-800 font-sans">{formatDateDisplay(checkType === 'issued' ? check.issueDate : check.receiveDate, storeSettings?.calendarType)}</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <span className="block text-slate-500 text-xs mb-1">تاریخ سررسید</span>
                        <span className="font-bold text-amber-600 font-sans">{formatDateDisplay(check.dueDate, storeSettings?.calendarType)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><Building2 className="w-5 h-5 text-indigo-500"/> طرف حساب و بانک</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center"><User className="w-5 h-5 text-slate-600"/></div>
                        <div>
                          <span className="block text-slate-500 text-xs mb-0.5">{checkType === 'issued' ? 'در وجه (گیرنده)' : 'پرداخت کننده'}</span>
                          <span className="font-bold text-slate-800">
                            {(() => {
                              const p = persons.find(p => String(p.id) === String(checkType === 'issued' ? check.payeeId : check.payerId));
                              return p ? (p.firstName + ' ' + p.lastName) : 'ناشناس';
                            })()}
                          </span>
                        </div>
                      </div>
                      
                      {checkType === 'issued' ? (
                        <div className="p-4 bg-slate-50 rounded-xl">
                          <span className="block text-slate-500 text-xs mb-1">دسته چک و حساب متصل</span>
                          <span className="font-bold text-slate-800">
                            {check.checkbookId ? (() => {
                               const cb = checkbooks.find(c => String(c.id) === String(check.checkbookId));
                               if (cb) {
                                  const acc = accounts.find(a => String(a.id) === String(cb.accountId));
                                  if (acc) return \`بانک \${acc.bankName} - \${acc.accountNumber}\`;
                                  return 'حساب متصل یافت نشد';
                               }
                               return 'دسته چک یافت نشد';
                            })() : '---'}
                          </span>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl">
                          <span className="block text-slate-500 text-xs mb-1">بانک و شعبه</span>
                          <span className="font-bold text-slate-800">
                            {check.bankName ? \`بانک \${check.bankName} \${check.branchName ? 'شعبه ' + check.branchName : ''}\` : '---'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <span className="block text-slate-500 text-xs mb-1">بابت / شرح</span>
                    <span className="font-bold text-slate-800">{check.reason || '---'}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <span className="block text-slate-500 text-xs mb-1">توضیحات تکمیلی</span>
                    <span className="font-medium text-slate-700 leading-relaxed">{check.description || '---'}</span>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'history' && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="relative border-r-2 border-indigo-100 pr-6 ml-4 space-y-6">
                  {history.map((log, idx) => {
                     const actionLabel = log.action === 'create' ? 'ثبت اولیه چک' :
                                          log.action === 'status_change' ? 'تغییر وضعیت' :
                                          log.action === 'update' ? 'ویرایش چک' : log.action;
                     const nV = log.newValues?.status;
                     const oV = log.oldValues?.status;
                     
                     return (
                       <div key={log.id || idx} className="relative">
                         <span className="absolute -right-[31px] bg-white border-2 border-indigo-400 w-4 h-4 rounded-full mt-1.5 shadow-sm ring-4 ring-white"></span>
                         <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                           <div className="flex justify-between items-start mb-2">
                             <span className="font-bold text-slate-800">{actionLabel}</span>
                             <span className="text-xs text-slate-500 font-sans" dir="ltr">{new Date(log.createdAt).toLocaleString('fa-IR')}</span>
                           </div>
                           {(nV || oV) && (
                             <div className="flex items-center gap-3 text-sm mt-3 bg-white p-3 rounded-lg border border-slate-100">
                               {oV && <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded font-medium">{stateLabels[oV] || oV}</span>}
                               {oV && nV && <ArrowRight className="w-4 h-4 text-slate-400" />}
                               {nV && <span className={\`px-2 py-1 rounded font-medium \${stateColors[nV] || 'bg-slate-100 text-slate-800'}\`}>{stateLabels[nV] || nV}</span>}
                             </div>
                           )}
                           <div className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                             <User className="w-3 h-3" /> توسط: {log.userId || 'سیستم'}
                           </div>
                         </div>
                       </div>
                     )
                  })}
                  {history.length === 0 && (
                    <div className="text-slate-400 italic p-4 text-center">تاریخچه‌ای ثبت نشده است.</div>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'actions' && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="max-w-2xl mx-auto space-y-6">
                  {isClosed ? (
                    <div className="p-8 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 flex flex-col items-center justify-center text-center gap-4">
                      <CheckCircle className="w-12 h-12 text-emerald-500" />
                      <div>
                        <span className="block font-bold text-xl mb-2">پرونده این چک بسته شده است</span>
                        <span className="opacity-80">امکان تغییر وضعیت در این مرحله وجود ندارد.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
                        <RefreshCw className="w-6 h-6 text-indigo-500" /> عملیات تغییر وضعیت
                      </h3>
                      <div className="text-sm text-slate-500 mb-4">لطفاً وضعیت جدید چک را انتخاب کنید:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {allowedNext.map(nextState => {
                          const isFinancial = financialEffectStates.includes(nextState);
                          return (
                            <button 
                              key={nextState}
                              onClick={() => handleStateChange(nextState)}
                              disabled={saving}
                              className={\`
                                text-right px-4 py-4 rounded-xl border font-bold flex items-center justify-between group transition-all
                                \${stateColors[nextState]} hover:shadow-md hover:-translate-y-0.5 active:translate-y-0
                              \`}
                            >
                              <div className="flex flex-col gap-1.5">
                                <span className="text-base">{stateLabels[nextState]}</span>
                                {isFinancial && (
                                   <span className="text-[10px] bg-white/70 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                                     <FileText className="w-3 h-3" /> ثبت سند مالی
                                   </span>
                                )}
                              </div>
                              <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:-translate-x-1" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <button onClick={() => {
                      const doc = transactions?.find(t => t.linkedCheckId === check.id || t.items?.some(i => i.description?.includes(check.checkNumber)));
                      if (doc && onViewAccountingDoc) onViewAccountingDoc(doc);
                      else showNotification('سند حسابداری برای این وضعیت یافت نشد', 'info');
                    }} className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-300 rounded-xl transition-colors font-bold text-lg shadow-sm">
                      <ExternalLink className="w-6 h-6" />
                      مشاهده سند حسابداری متصل
                    </button>
                  </div>
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  </motion.div>
  );
}
`;

code = code.replace(bodyRegex, newBody);

// Make sure to add Search import if missing, already added in top.

fs.writeFileSync('src/components/financial/checks/CheckCardPage.tsx', code);
console.log('Done rewriting check card');
