import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'(<div className="md:col-span-2 grid grid-cols-2 gap-4">.*?)(<div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-3xl">)'

new_replacement = """<div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">نام / عنوان حکم</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="مثال: حکم کارگزینی سال 1403"
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">تعداد فرزندان مشمول</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.childrenCount}
                      onChange={e => setFormData({...formData, childrenCount: e.target.value})}
                      placeholder="برای محاسبه حق اولاد"
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">سابقه کار (سال)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.experienceYears}
                      onChange={e => setFormData({...formData, experienceYears: e.target.value})}
                      placeholder="برای محاسبه پایه سنوات"
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ صدور</label>
                      <DatePicker
                        calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                        locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                        value={formData.issueDate}
                        onChange={(date: any) => setFormData({...formData, issueDate: typeof date === 'string' ? new Date(convertToGregorian(date)) : (date?.toDate?.() || new Date(date))})}
                        calendarPosition="bottom-right"
                        inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ اجرا</label>
                      <DatePicker
                        calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                        locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                        value={formData.executionDate}
                        onChange={(date: any) => setFormData({...formData, executionDate: typeof date === 'string' ? new Date(convertToGregorian(date)) : (date?.toDate?.() || new Date(date))})}
                        calendarPosition="bottom-right"
                        inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {formData.items && formData.items.length > 0 && (
                  <div className="md:col-span-2 mt-4 space-y-4">
                    <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">عناوین حکمی (قابل ویرایش برای این حکم)</h4>
                    {formData.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">عنوان</label>
                          <input type="text" value={item.title || ''} onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].title = e.target.value;
                            setFormData({...formData, items: newItems});
                          }} className="w-full border border-slate-200 bg-white rounded-lg p-2 outline-none font-bold text-sm" />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs font-bold text-slate-500 mb-1">نوع</label>
                          <select value={item.type || 'earning'} onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].type = e.target.value;
                            setFormData({...formData, items: newItems});
                          }} className="w-full border border-slate-200 bg-white rounded-lg p-2 outline-none font-bold text-sm">
                            <option value="earning">مزایا (+)</option>
                            <option value="deduction">کسورات (-)</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">مبلغ / فرمول</label>
                          <input type="text" value={item.amount || ''} dir="ltr" onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].amount = e.target.value;
                            setFormData({...formData, items: newItems});
                          }} className="w-full border border-slate-200 bg-white rounded-lg p-2 outline-none font-mono text-left text-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت حکم</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className={`w-full border border-slate-200 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all ${
                      formData.status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50'
                    }`}
                  >
                    <option value="draft">پیش‌نویس</option>
                    <option value="active">تایید نهایی / فعال (غیرفعال شدن سایر احکام این قرارداد)</option>
                    <option value="inactive">غیرفعال / بایگانی</option>
                  </select>
                  {formData.status === 'active' && (
                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> سایر احکام این شخص غیرفعال خواهند شد.
                    </p>
                  )}
                </div>
              </div>
            </div>
            \\2"""

if re.search(pattern, content, re.DOTALL):
    content = re.sub(pattern, new_replacement, content, flags=re.DOTALL)
    with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Regex match failed")
