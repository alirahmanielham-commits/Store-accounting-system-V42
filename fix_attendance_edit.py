import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's add shortageHours to the edit view
edit_view_addition = '''                          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-amber-600">ساعت کسر کار</span>
                            <input type="number" value={editAttendanceForm.shortageHours || 0} onChange={e => setEditAttendanceForm({...editAttendanceForm, shortageHours: e.target.value})} className="w-full text-left font-mono font-bold text-lg bg-white border border-amber-200 rounded-lg px-2 py-1 outline-none focus:border-amber-500 text-amber-700" />
                          </div>'''

content = content.replace(
    '''                          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-rose-600">غیبت / بدون حقوق</span>
                            <input type="number" value={editAttendanceForm.absentDays} onChange={e => setEditAttendanceForm({...editAttendanceForm, absentDays: e.target.value})} className="w-full text-left font-mono font-bold text-lg bg-white border border-rose-200 rounded-lg px-2 py-1 outline-none focus:border-rose-500 text-rose-700" />
                          </div>''',
    '''                          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-rose-600">غیبت / بدون حقوق</span>
                            <input type="number" value={editAttendanceForm.absentDays} onChange={e => setEditAttendanceForm({...editAttendanceForm, absentDays: e.target.value})} className="w-full text-left font-mono font-bold text-lg bg-white border border-rose-200 rounded-lg px-2 py-1 outline-none focus:border-rose-500 text-rose-700" />
                          </div>
''' + edit_view_addition
)

view_addition = '''                          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between">
                            <span className="text-sm font-bold text-amber-600">ساعت کسر کار</span>
                            <span className="text-xl font-black text-amber-700">{toPersianDigits(selectedAttendance?.shortageHours || 0)}</span>
                          </div>'''

content = content.replace(
    '''                          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between">
                            <span className="text-sm font-bold text-rose-600">غیبت / بدون حقوق</span>
                            <span className="text-xl font-black text-rose-700">{toPersianDigits(selectedAttendance?.absentDays || 0)}</span>
                          </div>''',
    '''                          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between">
                            <span className="text-sm font-bold text-rose-600">غیبت / بدون حقوق</span>
                            <span className="text-xl font-black text-rose-700">{toPersianDigits(selectedAttendance?.absentDays || 0)}</span>
                          </div>
''' + view_addition
)

# And fix grid columns from 2 to 3 to fit them nicely or just leave it as grid-cols-2 (it will just wrap)
content = content.replace('<div className="grid grid-cols-2 gap-3">', '<div className="grid grid-cols-2 md:grid-cols-3 gap-3">')

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
