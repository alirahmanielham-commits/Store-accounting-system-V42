import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# For attendance
att_header = r'<h3 className="font-bold text-slate-700">تردد‌های ثبت شده در این روز</h3>'
att_new = '''<div className="flex items-center gap-4">
              <h3 className="font-bold text-slate-700">تردد‌های ثبت شده در این روز</h3>
              <button 
                onClick={() => setIsAttendanceModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                ثبت تردد
              </button>
            </div>'''
content = content.replace(att_header, att_new)

# For leave
lv_header = r'<h3 className="font-bold text-slate-700">لیست مرخصی‌ها و غیبت‌ها</h3>'
lv_new = '''<div className="flex items-center gap-4">
              <h3 className="font-bold text-slate-700">لیست مرخصی‌ها و غیبت‌ها</h3>
              <button 
                onClick={() => setIsLeaveModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                ثبت مرخصی/غیبت
              </button>
            </div>'''
content = content.replace(lv_header, lv_new)

# For mission
ms_header = r'<h3 className="font-bold text-slate-700">لیست ماموریت‌ها</h3>'
ms_new = '''<div className="flex items-center gap-4">
              <h3 className="font-bold text-slate-700">لیست ماموریت‌ها</h3>
              <button 
                onClick={() => setIsMissionModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                ثبت ماموریت
              </button>
            </div>'''
content = content.replace(ms_header, ms_new)

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

