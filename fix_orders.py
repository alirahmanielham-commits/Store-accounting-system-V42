import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add executionDate to state initialization
content = content.replace(
    "issueDate: new Date(),",
    "issueDate: new Date(),\n    executionDate: new Date(),"
)

# Also in resetting the form
content = content.replace(
    "issueDate: new Date()",
    "issueDate: new Date(), executionDate: new Date()"
)

# And in editing
content = content.replace(
    "issueDate: o.issueDate ? new Date(o.issueDate) : new Date(),",
    "issueDate: o.issueDate ? new Date(o.issueDate) : new Date(),\n        executionDate: o.executionDate ? new Date(o.executionDate) : new Date(),"
)

# Now, add the UI field next to issueDate
issue_date_block = """                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ صدور</label>
                  <DatePicker
                    calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                    value={formData.issueDate}
                    onChange={(date: any) => setFormData({...formData, issueDate: typeof date === 'string' ? new Date(convertToGregorian(date)) : (date?.toDate?.() || new Date(date))})}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                  />
                </div>"""

new_date_blocks = """                <div className="md:col-span-1">
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
                <div className="md:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ اجرا</label>
                  <DatePicker
                    calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                    value={formData.executionDate}
                    onChange={(date: any) => setFormData({...formData, executionDate: typeof date === 'string' ? new Date(convertToGregorian(date)) : (date?.toDate?.() || new Date(date))})}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                  />
                </div>"""

content = content.replace(issue_date_block, new_date_blocks)

# Also update the display of execution date in the list of orders
old_display = """<div className="text-xs text-slate-500 mt-1.5 flex items-center gap-4">
                              <div>
                                <span className="font-medium">بازه اجرا:</span> 
                                <span className="mr-1">{o.startDate ? new Date(o.startDate).toLocaleDateString('fa-IR') : '---'} تا {o.endDate ? new Date(o.endDate).toLocaleDateString('fa-IR') : '---'}</span>
                              </div>
                              <div className="text-slate-300">|</div>
                              <div>
                                <span className="font-medium">تاریخ صدور:</span>
                                <span className="mr-1">{o.issueDate ? new Date(o.issueDate).toLocaleDateString('fa-IR') : '---'}</span>
                              </div>
                            </div>"""
new_display = """<div className="text-xs text-slate-500 mt-1.5 flex items-center gap-4 flex-wrap">
                              <div>
                                <span className="font-medium">تاریخ صدور:</span>
                                <span className="mr-1">{o.issueDate ? new Date(o.issueDate).toLocaleDateString('fa-IR') : '---'}</span>
                              </div>
                              <div className="text-slate-300">|</div>
                              <div>
                                <span className="font-medium">تاریخ اجرا:</span>
                                <span className="mr-1">{o.executionDate ? new Date(o.executionDate).toLocaleDateString('fa-IR') : '---'}</span>
                              </div>
                            </div>"""

content = re.sub(r'<div className="text-xs text-slate-500 mt-1\.5 flex items-center gap-4">.*?</div>\s*</div>', new_display + '\n                          </div>', content, flags=re.DOTALL)


with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
