import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update formData state initialization
old_state = """  const [formData, setFormData] = useState({
    personId: '',
    contractId: '',
    templateId: '',
    name: '',
    items: [] as any[],
    issueDate: new Date(),
    executionDate: new Date(),
    status: 'draft'
  });"""

new_state = """  const [formData, setFormData] = useState({
    personId: '',
    contractId: '',
    templateId: '',
    name: '',
    childrenCount: '',
    experienceYears: '',
    items: [] as any[],
    issueDate: new Date(),
    executionDate: new Date(),
    status: 'draft'
  });"""

content = content.replace(old_state, new_state)

# 2. Add input fields in the modal form
old_form_fields = """                <div>
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

new_form_fields = """                <div className="md:col-span-2 grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ صدور</label>
                    <DatePicker"""

content = content.replace(old_form_fields, new_form_fields)

# Let's also update the "onChange" of personId to prepopulate from personProfile if available
old_person_select = """                    onChange={e => {
                      setFormData({...formData, personId: e.target.value, contractId: ''});
                    }}"""

new_person_select = """                    onChange={e => {
                      const selectedPersonId = e.target.value;
                      const profile = personsData?.find((p: any) => p.id === selectedPersonId);
                      setFormData({
                        ...formData, 
                        personId: selectedPersonId, 
                        contractId: '',
                        childrenCount: profile?.childrenCount || '',
                        experienceYears: profile?.experienceYears || ''
                      });
                    }}"""
content = content.replace(old_person_select, new_person_select)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
