import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix personnel code in print layout
content = content.replace(
    '''<span className="text-slate-500 text-sm">شماره پرسنلی:</span>
                    <span className="font-bold text-slate-800">{toPersianDigits(printSlip.personId.substring(0, 6))}</span>''',
    '''<span className="text-slate-500 text-sm">شماره پرسنلی:</span>
                    <span className="font-bold text-slate-800">{toPersianDigits(getPersonnelCode(printSlip.personId))}</span>'''
)

# 2. Add attendance info to the print layout
# Find where the grid for name and person code is, and add a new row below it for attendance
attendance_info_html = '''
                </div>
                
                {(() => {
                  const printAtt = allAttendances.find(a => a.id === printSlip.attendanceId);
                  return printAtt ? (
                    <div className="grid grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                      <div className="flex flex-col">
                        <span className="text-slate-500 mb-1">روز کارکرد</span>
                        <span className="font-bold text-slate-800">{toPersianDigits(printAtt.workDays.toString())} روز</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 mb-1">ساعات اضافه کار</span>
                        <span className="font-bold text-slate-800">{toPersianDigits(printAtt.overtimeHours.toString())} ساعت</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 mb-1">ساعات کسر کار</span>
                        <span className="font-bold text-slate-800">{toPersianDigits((printAtt.shortageHours || 0).toString())} ساعت</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 mb-1">مرخصی / غیبت</span>
                        <span className="font-bold text-slate-800">{toPersianDigits((printAtt.paidLeaveDays || 0) + (printAtt.sickLeaveDays || 0) + (printAtt.unpaidLeaveDays || 0) + (printAtt.absentDays || 0))} روز</span>
                      </div>
                    </div>
                  ) : null;
                })()}

                <div className="grid grid-cols-2 gap-6 mb-8">'''

content = content.replace(
    '''                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">''',
    attendance_info_html
)

# 3. Change title of 'دستمزد روزانه' in generated pItems to 'مزد مبنای ماهیانه' or 'حقوق پایه ماهیانه'
# Looking at the calculations for Earnings:
#         if (item.id === 'daily_wage' || item.title === 'دستمزد روزانه') {
#           val = baseAmount * workDays;
#         }
# We can change the saved title for 'daily_wage'.
# Let's see the lines around pItems.push for earning.
# 
#             id: Date.now().toString() + Math.random().toString(),
#             componentId: item.id || Math.random().toString(),
#             title: item.title,
#             type: 'earning',
#             amount: val.toString()

# We can do this in Python using regex for handleGenerate:
def modify_title(match):
    return '''title: item.id === 'daily_wage' || item.title === 'دستمزد روزانه' ? 'مزد مبنای ماهیانه' : item.title,'''

content = re.sub(r"title:\s*item\.title,", modify_title, content, count=1) # The first one is in earnings

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
