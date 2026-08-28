import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_closing = """                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                  />
                </div>
                {formData.items"""

new_closing = """                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                  />
                </div>
                </div>
                {formData.items"""

content = content.replace(old_closing, new_closing)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
