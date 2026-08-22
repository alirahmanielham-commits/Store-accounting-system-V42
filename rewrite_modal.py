import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "{/* Modals */}" in line:
        start_index = i
        break

new_modal_code = """      {/* Modals */}
      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-full overflow-hidden">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><FileSignature className="w-5 h-5"/></div>
                <h3 className="font-bold text-slate-800 text-lg">{editingContractId ? 'ویرایش قرارداد پرسنل' : 'ثبت قرارداد جدید'}</h3>
              </div>
              <button onClick={() => setIsContractModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">انتخاب کارمند</label>
                    <Select
                      isDisabled={!!editingContractId}
                      options={employees.map(p => ({value: p.id, label: p.name}))}
                      value={contractForm.personId}
                      onChange={v => setContractForm({...contractForm, personId: v})}
                      placeholder="جستجو و انتخاب شخص..."
                      className="react-select-container"
                      classNamePrefix="react-select"
                      noOptionsMessage={() => "کارمندی یافت نشد"}
                      styles={{
                        control: (base) => ({...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', padding: '4px', boxShadow: 'none', '&:hover': {borderColor: '#cbd5e1'}}),
                      }}
                    />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">شماره قرارداد</label>
                   <input type="text" value={contractForm.contractNumber} onChange={e => setContractForm({...contractForm, contractNumber: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت قرارداد</label>
                   <select value={contractForm.status} onChange={e => setContractForm({...contractForm, status: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium transition-all">
                     <option value="draft">پیش‌نویس</option>
                     <option value="active">فعال (در حال اجرا)</option>
                     <option value="expired">منقضی شده</option>
                     <option value="terminated">فسخ شده</option>
                   </select>
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ شروع قرارداد</label>
                   <DatePicker
                     calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                     locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                     value={contractForm.startDate}
                     onChange={(date) => {
                        if(date) {
                            const d = new Date(date.valueOf());
                            d.setHours(0,0,0,0);
                            setContractForm({...contractForm, startDate: d});
                        } else {
                            setContractForm({...contractForm, startDate: null});
                        }
                     }}
                     calendarPosition="bottom-right"
                     inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ پایان قرارداد</label>
                   <DatePicker
                     calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                     locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                     value={contractForm.endDate}
                     onChange={(date) => {
                        if(date) {
                            const d = new Date(date.valueOf());
                            d.setHours(0,0,0,0);
                            setContractForm({...contractForm, endDate: d});
                        } else {
                            setContractForm({...contractForm, endDate: null});
                        }
                     }}
                     calendarPosition="bottom-right"
                     inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
                   />
                 </div>

                 <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-slate-700 mb-2">کارگاه</label>
                   <Select
                     options={(workplaces || []).map(w => ({value: w.id, label: w.name}))}
                     value={(workplaces || []).find(w => w.id === contractForm.workplaceId) ? {value: contractForm.workplaceId, label: (workplaces || []).find(w => w.id === contractForm.workplaceId).name} : null}
                     onChange={v => setContractForm({...contractForm, workplaceId: v ? v.value : ''})}
                     placeholder="انتخاب کارگاه..."
                     className="react-select-container"
                     classNamePrefix="react-select"
                     noOptionsMessage={() => "کارگاهی یافت نشد"}
                     styles={{
                       control: (base) => ({...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', padding: '4px', boxShadow: 'none', '&:hover': {borderColor: '#cbd5e1'}}),
                     }}
                   />
                 </div>
                 
                 <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-slate-700 mb-2">محل خدمت (اختیاری)</label>
                   <div className="relative">
                     <MapPin className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input type="text" value={contractForm.location} onChange={e => setContractForm({...contractForm, location: e.target.value})} className="w-full pl-4 pr-12 py-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="مثلا دفتر مرکزی - طبقه دوم" />
                   </div>
                 </div>
               </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button onClick={()=>setIsContractModalOpen(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleSaveContract} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-sm shadow-emerald-200 hover:bg-emerald-700 hover:shadow-md transition-all flex items-center gap-2">
                <Check className="w-5 h-5" /> {editingContractId ? 'ثبت تغییرات' : 'ثبت نهایی'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines[:start_index])
    f.write(new_modal_code)

print("Modal rewritten")
