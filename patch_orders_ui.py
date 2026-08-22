import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Modify personContracts
old_pc = """  const personContracts = useMemo(() => {
    if (!formData.personId) return [];
    return contracts.filter(c => c.personId === formData.personId);
  }, [contracts, formData.personId]);"""
new_pc = """  const personContracts = useMemo(() => {
    if (!formData.personId) return [];
    return contracts.filter(c => c.personId === formData.personId && (c.status === 'active' || c.id === formData.contractId));
  }, [contracts, formData.personId, formData.contractId]);"""
content = content.replace(old_pc, new_pc)

# Handle templateId change
old_template_select = """onChange={e => setFormData({...formData, templateId: e.target.value})}"""
new_template_select = """onChange={e => {
                      const tId = e.target.value;
                      const tpl = templates.find(t => String(t.id) === String(tId));
                      if (tpl) {
                        setFormData({
                          ...formData, 
                          templateId: tId, 
                          name: formData.name || tpl.name || '', 
                          items: JSON.parse(JSON.stringify(tpl.items || []))
                        });
                      } else {
                        setFormData({...formData, templateId: tId});
                      }
                    }}"""
content = content.replace(old_template_select, new_template_select)

# Insert name and items UI
old_modal_fields = """                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ صدور</label>
                  <DatePicker"""
new_modal_fields = """                <div>
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
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ صدور</label>
                  <DatePicker"""
content = content.replace(old_modal_fields, new_modal_fields)

# Insert items editor
old_status_field = """                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت</label>"""
new_items_field = """                {formData.items && formData.items.length > 0 && (
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
                  <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت</label>"""
content = content.replace(old_status_field, new_items_field)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("UI patched.")
