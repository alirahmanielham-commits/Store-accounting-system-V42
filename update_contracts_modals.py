import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Z-index fix
content = content.replace("z-50", "z-[9999]")

# 2. Add new states
new_states = """  const [viewContractId, setViewContractId] = useState(null);
  const [terminateContractId, setTerminateContractId] = useState(null);
  const [terminateDate, setTerminateDate] = useState(new Date());"""

content = content.replace(
    "const [contractForm, setContractForm] = useState({",
    new_states + "\n  const [contractForm, setContractForm] = useState({"
)

# 3. Add handleTerminate and handleFinalize
handlers = """  const handleFinalizeContract = async (cId) => {
    try {
      const c = contracts.find(x => x.id === cId);
      if(!c) return;
      await updateEmployeeContract(c.id, { ...c, status: 'active' });
      showNotification('قرارداد با موفقیت تایید نهایی شد', 'success');
      setViewContractId(null);
      fetchData();
    } catch(e) {
      showNotification('خطا در تایید نهایی', 'error');
    }
  };

  const handleTerminateContract = async () => {
    if (!terminateDate) return showNotification('تاریخ ترک کار الزامی است', 'error');
    try {
      const c = contracts.find(x => x.id === terminateContractId);
      if(!c) return;
      const getIsoDateStr = (dateVal) => {
        if (!dateVal) return null;
        try {
          if (dateVal instanceof Date) return dateVal.toISOString();
          if (typeof dateVal.toDate === 'function') return dateVal.toDate().toISOString();
          const parsed = new Date(dateVal);
          if (!isNaN(parsed.getTime())) return parsed.toISOString();
          return null;
        } catch(e) { return null; }
      };
      const termIso = getIsoDateStr(terminateDate);
      await updateEmployeeContract(c.id, { ...c, status: 'terminated', terminationDate: termIso });
      showNotification('ترک کار با موفقیت ثبت شد', 'success');
      setTerminateContractId(null);
      fetchData();
    } catch(e) {
      showNotification('خطا در ثبت ترک کار', 'error');
    }
  };
"""

content = content.replace("const handleSaveContract", handlers + "\n  const handleSaveContract")

# 4. Modify Table Actions
actions_td_old = """                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => {
                              setEditingContractId(c.id);
                              setContractForm({
                                personId: { value: c.personId, label: getPersonName(c.personId) },
                                contractNumber: c.contractNumber || '',
                                workplaceId: c.workplaceId || '',
                                startDate: parseSafeDate(c.startDate),
                                endDate: c.endDate ? parseSafeDate(c.endDate) : new Date(),
                                location: c.location || '',
                                status: c.status || 'draft',
                              });
                              setIsContractModalOpen(true);
                            }} className="px-3 py-1.5 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors">
                              ویرایش
                            </button>
                            <button onClick={() => handleDeleteContract(c.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>"""

actions_td_new = """                          <div className="flex items-center justify-center gap-2">
                            {c.status === 'draft' && (
                              <button onClick={() => setViewContractId(c.id)} className="px-3 py-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors">
                                تایید نهایی
                              </button>
                            )}
                            {c.status === 'active' && (
                              <button onClick={() => { setTerminateContractId(c.id); setTerminateDate(new Date()); }} className="px-3 py-1.5 text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors whitespace-nowrap">
                                ثبت ترک کار
                              </button>
                            )}
                            {c.status !== 'draft' && c.status !== 'active' && (
                              <button onClick={() => setViewContractId(c.id)} className="px-3 py-1.5 text-slate-600 bg-slate-50 border border-slate-100 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors">
                                مشاهده
                              </button>
                            )}
                            <button onClick={() => {
                              setEditingContractId(c.id);
                              setContractForm({
                                personId: { value: c.personId, label: getPersonName(c.personId) },
                                contractNumber: c.contractNumber || '',
                                workplaceId: c.workplaceId || '',
                                startDate: parseSafeDate(c.startDate),
                                endDate: c.endDate ? parseSafeDate(c.endDate) : new Date(),
                                location: c.location || '',
                                status: c.status || 'draft',
                              });
                              setIsContractModalOpen(true);
                            }} className="px-3 py-1.5 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors">
                              ویرایش
                            </button>
                            <button onClick={() => handleDeleteContract(c.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>"""

if actions_td_old in content:
    content = content.replace(actions_td_old, actions_td_new)
else:
    print("Could not find table actions td")

# 5. Add Modals (View Summary & Terminate)
modals = """
      {viewContractId && (() => {
        const c = contracts.find(x => x.id === viewContractId);
        if(!c) return null;
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><FileText className="w-5 h-5"/></div>
                  <h3 className="font-bold text-slate-800 text-lg">خلاصه قرارداد</h3>
                </div>
                <button onClick={() => setViewContractId(null)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 bg-slate-50/50 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-slate-500 text-sm">نام پرسنل:</span>
                  <span className="font-bold text-slate-800">{getPersonName(c.personId)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-slate-500 text-sm">شماره قرارداد:</span>
                  <span className="font-bold text-slate-800">{c.contractNumber || '---'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-slate-500 text-sm">تاریخ شروع:</span>
                  <span className="font-bold text-slate-800">{parseSafeDate(c.startDate)?.toLocaleDateString('fa-IR')}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-slate-500 text-sm">تاریخ پایان:</span>
                  <span className="font-bold text-slate-800">{c.endDate ? parseSafeDate(c.endDate)?.toLocaleDateString('fa-IR') : 'نامحدود'}</span>
                </div>
                {c.terminationDate && (
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                    <span className="text-slate-500 text-sm">تاریخ ترک کار:</span>
                    <span className="font-bold text-rose-600">{parseSafeDate(c.terminationDate)?.toLocaleDateString('fa-IR')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-slate-500 text-sm">وضعیت:</span>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border ${
                            c.status==='active'?'bg-emerald-50 text-emerald-700 border-emerald-200':
                            c.status==='expired'?'bg-amber-50 text-amber-700 border-amber-200':
                            c.status==='terminated'?'bg-rose-50 text-rose-700 border-rose-200':
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {c.status === 'active' ? 'فعال' : c.status === 'expired' ? 'منقضی' : c.status === 'terminated' ? 'فسخ شده' : 'پیش‌نویس'}
                  </span>
                </div>
              </div>
              <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">
                <button onClick={()=>setViewContractId(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">بستن</button>
                {c.status === 'draft' && (
                  <button onClick={() => handleFinalizeContract(c.id)} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-sm shadow-emerald-200 hover:bg-emerald-700 hover:shadow-md transition-all flex items-center gap-2">
                    <Check className="w-5 h-5" /> تایید نهایی
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {terminateContractId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><AlertCircle className="w-5 h-5"/></div>
                <h3 className="font-bold text-slate-800 text-lg">ثبت ترک کار</h3>
              </div>
              <button onClick={() => setTerminateContractId(null)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 bg-slate-50/50 space-y-4">
              <p className="text-sm text-slate-600 mb-4">لطفاً تاریخ دقیق ترک کار پرسنل را انتخاب کنید.</p>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ ترک کار</label>
                <DatePicker
                    calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                    value={terminateDate}
                    onChange={(date) => {
                      if(date) {
                          const d = (date && typeof date.toDate === 'function') ? date.toDate() : new Date(date);
                          d.setHours(0,0,0,0);
                          setTerminateDate(d);
                      } else {
                          setTerminateDate(null);
                      }
                    }}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button onClick={()=>setTerminateContractId(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleTerminateContract} className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-bold shadow-sm hover:bg-amber-600 transition-all">
                ثبت ترک کار
              </button>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace("{/* Modals */}", "{/* Modals */}\n" + modals)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("ContractsManager modals patched")
