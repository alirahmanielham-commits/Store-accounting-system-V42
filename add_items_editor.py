import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_status = """                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت حکم</label>"""

new_status = """                {formData.items && formData.items.length > 0 && (
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
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت حکم</label>"""

if old_status in content:
    content = content.replace(old_status, new_status)
    with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added items editor.")
else:
    print("Could not find status section.")
