with open('src/components/payroll/EmployeeProfilesManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add to state
content = content.replace("insuranceNumber: '',", "personnelCode: '',\n    insuranceNumber: '',")

# Add to handleEdit
content = content.replace("insuranceNumber: existingPerson.insuranceNumber || '',", "personnelCode: existingPerson.personnelCode || '',\n        insuranceNumber: existingPerson.insuranceNumber || '',")

# Add to JSX
jsx_input = """                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">شماره پرسنلی</label>
                  <input
                    type="text"
                    value={formData.personnelCode}
                    onChange={e => setFormData({...formData, personnelCode: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  />
                </div>
"""
content = content.replace('                <div>\n                  <label className="block text-sm font-bold text-slate-700 mb-2">شماره بیمه</label>', jsx_input + '                <div>\n                  <label className="block text-sm font-bold text-slate-700 mb-2">شماره بیمه</label>')

with open('src/components/payroll/EmployeeProfilesManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

