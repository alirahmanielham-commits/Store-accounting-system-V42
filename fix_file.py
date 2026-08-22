import re

# I will recreate the truncated part from my context
table_end = """
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg flex-shrink-0">
                              {getPersonName(c.personId).substring(0, 1)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{getPersonName(c.personId)}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{c.location || 'بدون محل کار'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">{c.contractNumber || '---'}</td>
                        <td className="p-4 text-slate-500 text-xs">{new Date(parseInt(c.startDate)).toLocaleDateString('fa-IR')}</td>
                        <td className="p-4 text-slate-500 text-xs">{c.endDate ? new Date(parseInt(c.endDate)).toLocaleDateString('fa-IR') : 'نامحدود'}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border ${
                            c.status==='active'?'bg-emerald-50 text-emerald-700 border-emerald-200':
                            c.status==='expired'?'bg-amber-50 text-amber-700 border-amber-200':
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {c.status === 'active' ? 'فعال' : c.status === 'expired' ? 'منقضی' : 'پیش‌نویس'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => {
                              setEditingContractId(c.id);
                              setContractForm({
                                personId: { value: c.personId, label: getPersonName(c.personId) },
                                contractNumber: c.contractNumber || '',
                                workplaceId: c.workplaceId || '',
                                startDate: new Date(parseInt(c.startDate)),
                                endDate: c.endDate ? new Date(parseInt(c.endDate)) : new Date(),
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
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredContracts.length === 0 && (
                      <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-medium">هیچ قراردادی یافت نشد</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
      {/* Modals */}
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

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# We will cut the code where it got corrupted and append this part
idx = code.find('<td className="p-4">')
if idx != -1:
    code = code[:idx]
    code += table_end
    with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Fixed syntax")
else:
    print("Could not find cut point")
