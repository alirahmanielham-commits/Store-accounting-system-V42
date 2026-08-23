import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to insert a block displaying previous orders.
# Let's find the spot after the "قرارداد مرتبط" block.

old_block = """                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">قرارداد مرتبط</label>
                  <select
                    value={formData.contractId}
                    onChange={e => setFormData({...formData, contractId: e.target.value})}
                    disabled={!formData.personId}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all disabled:opacity-50"
                  >
                    <option value="">-- انتخاب کنید --</option>
                    {personContracts.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        قرارداد {c.contractNumber} {c.status === 'active' ? '(فعال)' : ''}
                      </option>
                    ))}
                  </select>
                </div>"""

new_block = old_block + """
                {formData.contractId && (
                  <div className="md:col-span-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                    <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> احکام ثبت شده برای این قرارداد
                    </h4>
                    {orders.filter(o => o.contractId === formData.contractId && o.id !== editingId).length > 0 ? (
                      <div className="space-y-2">
                        {orders.filter(o => o.contractId === formData.contractId && o.id !== editingId).map(ord => (
                          <div key={ord.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-indigo-50">
                            <div>
                              <div className="font-bold text-sm text-slate-800">{ord.name || 'حکم بدون نام'}</div>
                              <div className="text-xs text-slate-500 mt-1">تاریخ صدور: {ord.issueDate ? new Date(Number(ord.issueDate)).toLocaleDateString('fa-IR') : '---'}</div>
                            </div>
                            <div>
                              {ord.status === 'active' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  تایید نهایی / فعال
                                </span>
                              ) : ord.status === 'inactive' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  غیرفعال / بایگانی
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  پیش‌نویس
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-slate-500 bg-white p-3 rounded-xl border border-indigo-50 text-center">
                        حکمی برای این قرارداد یافت نشد
                      </div>
                    )}
                  </div>
                )}"""

content = content.replace(old_block, new_block)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
