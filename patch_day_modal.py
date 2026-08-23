import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add states
state_regex = r"const \[isMissionModalOpen, setIsMissionModalOpen\] = useState\(false\);"
new_states = """const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<number | null>(null);
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);"""
content = content.replace("const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);", new_states)

# Add Day click handler
# Find the return inside grid.map:
# return (
#     <div key={i} className={`min-h-[100px] ${bgColor} border-b border-l border-slate-200 p-1 flex flex-col`}>

grid_return_old = r"return \(\s*<div key=\{i\} className=\{\`min-h-\[100px\] \$\{bgColor\} border-b border-l border-slate-200 p-1 flex flex-col\`\}>"
grid_return_new = """return (
                         <div 
                           key={i} 
                           onClick={() => {
                             if (dObj) {
                               setSelectedDayDate(dObj.toDate().getTime());
                               setSelectedDayNum(day);
                               setIsDayModalOpen(true);
                             }
                           }}
                           className={`min-h-[100px] ${bgColor} border-b border-l border-slate-200 p-1 flex flex-col cursor-pointer hover:bg-slate-100 transition-colors group relative`}
                         >
                           <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors pointer-events-none"></div>"""
content = re.sub(grid_return_old, grid_return_new, content)

# Also handle the day cell content, let's keep it mostly same.

# Now let's inject the Day Modal at the bottom, near other modals.
modal_insertion_marker = r"\{/\* Leave Modal \*/\}"
day_modal_code = """      {/* Day Details Modal */}
      {isDayModalOpen && selectedDayDate && calPersonId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                مدیریت تردد روز {toPersianDigits(selectedDayNum)}
              </h3>
              <button onClick={() => setIsDayModalOpen(false)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {(() => {
                const t = new Date(new Date(selectedDayDate).setHours(12,0,0,0));
                const pLeaves = leaves.filter(l => l.personId === calPersonId);
                const pMissions = missions.filter(m => m.personId === calPersonId);
                
                const tLeave = pLeaves.find(l => {
                    const start = new Date(Number(l.startDate));
                    const end = new Date(Number(l.endDate));
                    return t >= new Date(start.setHours(0,0,0,0)) && t <= new Date(end.setHours(23,59,59,999));
                });
                
                const tMission = pMissions.find(m => {
                    const start = new Date(Number(m.startDate));
                    const end = new Date(Number(m.endDate));
                    return t >= new Date(start.setHours(0,0,0,0)) && t <= new Date(end.setHours(23,59,59,999));
                });
                
                const tAtt = attendances.filter(a => {
                    if (a.personId !== calPersonId) return false;
                    try {
                        const ad = new DateObject({ date: new Date(Number(a.date)), calendar: persian, locale: persian_fa });
                        const sd = new DateObject({ date: new Date(selectedDayDate), calendar: persian, locale: persian_fa });
                        return ad.year === sd.year && ad.month.number === sd.month.number && ad.day === sd.day;
                    } catch(e) { return false; }
                });

                return (
                  <div className="space-y-4">
                    {tLeave && (
                      <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 font-bold text-sm">
                        این روز مرخصی ثبت شده است.
                      </div>
                    )}
                    {tMission && (
                      <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 font-bold text-sm">
                        این روز ماموریت ثبت شده است.
                      </div>
                    )}
                    
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 p-2 font-bold text-sm border-b border-slate-200">
                        ترددهای ثبت شده
                      </div>
                      {tAtt.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm font-bold">هیچ ترددی یافت نشد.</div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {tAtt.map(a => (
                            <div key={a.id} className="p-3 flex justify-between items-center bg-white hover:bg-slate-50">
                              <div className="font-bold text-slate-700">
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{a.checkIn}</span>
                                <span className="mx-2 text-slate-400">تا</span>
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{a.checkOut}</span>
                              </div>
                              <button 
                                onClick={() => handleDeleteAttendance(a.id)}
                                className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <form 
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const checkIn = formData.get('checkIn') as string;
                        const checkOut = formData.get('checkOut') as string;
                        if (checkIn >= checkOut) return showNotification('ساعت خروج باید پس از ساعت ورود باشد', 'error');
                        
                        try {
                          const newRecord = {
                            id: generateId(),
                            personId: calPersonId,
                            date: selectedDayDate.toString(),
                            checkIn,
                            checkOut,
                            recordType: 'work',
                            createdAt: Date.now()
                          };
                          await addDailyAttendance(newRecord);
                          showNotification('تردد با موفقیت ثبت شد', 'success');
                          fetchData(); // Make sure to fetch again to update the list
                        } catch (err) {
                          showNotification('خطا در ثبت تردد', 'error');
                        }
                      }}
                    >
                      <h4 className="font-bold text-slate-700 mb-3 text-sm">ثبت تردد جدید</h4>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">ورود</label>
                          <input required name="checkIn" type="time" defaultValue="08:00" className="w-full border p-2 rounded-lg font-bold text-center" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">خروج</label>
                          <input required name="checkOut" type="time" defaultValue="17:00" className="w-full border p-2 rounded-lg font-bold text-center" />
                        </div>
                      </div>
                      <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition">
                        افزودن تردد
                      </button>
                    </form>

                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Leave Modal */}
"""
content = content.replace("{/* Leave Modal */}", day_modal_code)

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

