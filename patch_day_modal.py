import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_inline = """                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const checkIn = formData.get('checkIn') as string;
                        const checkOut = formData.get('checkOut') as string;

                        if (checkIn >= checkOut) return showNotification('ساعت خروج باید پس از ساعت ورود باشد', 'error');
                        
                        if (!selectedDayDate) return;
                        const sDateStr = selectedDayDate.toString();

                        const personLeaves = leaves.filter(l => l.personId === calPersonId);
                        const personMissions = missions.filter(m => m.personId === calPersonId);
                        const personAtts = attendances.filter(a => a.personId === calPersonId && isDayInRange(a.date, sDateStr, sDateStr));

                        if (personLeaves.some(l => isDayInRange(sDateStr, l.startDate, l.endDate))) {
                           return showNotification('برای این روز مرخصی ثبت شده است و امکان ثبت تردد وجود ندارد', 'error');
                        }
                        if (personMissions.some(m => isDayInRange(sDateStr, m.startDate, m.endDate))) {
                           return showNotification('برای این روز ماموریت ثبت شده است و امکان ثبت تردد وجود ندارد', 'error');
                        }
                        if (personAtts.some(a => isTimeOverlap(checkIn, checkOut, a.checkIn, a.checkOut))) {
                           return showNotification('ساعت ورود و خروج با تردد دیگری در همین روز هم‌پوشانی دارد', 'error');
                        }
                        
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
                          (e.target as HTMLFormElement).reset();
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
                      </button>"""

new_inline = """                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const mode = formData.get('mode') as string;
                        let checkIn = formData.get('checkIn') as string;
                        let checkOut = formData.get('checkOut') as string;

                        if (mode === 'entry') checkOut = '';
                        if (mode === 'exit') checkIn = '';

                        if (mode === 'both' && checkIn >= checkOut) return showNotification('ساعت خروج باید پس از ساعت ورود باشد', 'error');
                        
                        if (!selectedDayDate) return;
                        const sDateStr = selectedDayDate.toString();

                        const personLeaves = leaves.filter(l => l.personId === calPersonId);
                        const personMissions = missions.filter(m => m.personId === calPersonId);
                        const personAtts = attendances.filter(a => a.personId === calPersonId && isDayInRange(a.date, sDateStr, sDateStr));

                        if (personLeaves.some(l => isDayInRange(sDateStr, l.startDate, l.endDate))) {
                           return showNotification('برای این روز مرخصی ثبت شده است و امکان ثبت تردد وجود ندارد', 'error');
                        }
                        if (personMissions.some(m => isDayInRange(sDateStr, m.startDate, m.endDate))) {
                           return showNotification('برای این روز ماموریت ثبت شده است و امکان ثبت تردد وجود ندارد', 'error');
                        }
                        if (mode === 'both' && personAtts.some(a => isTimeOverlap(checkIn, checkOut, a.checkIn, a.checkOut))) {
                           return showNotification('ساعت ورود و خروج با تردد دیگری در همین روز هم‌پوشانی دارد', 'error');
                        }
                        
                        try {
                          if (mode === 'exit') {
                            const openEntry = personAtts.find(a => a.checkIn && (!a.checkOut || a.checkOut === ''));
                            if (openEntry) {
                              if (checkOut <= openEntry.checkIn) return showNotification('ساعت خروج باید پس از ساعت ورود باشد', 'error');
                              await updateDailyAttendance(openEntry.id, { ...openEntry, checkOut });
                              showNotification('خروج با موفقیت ثبت شد', 'success');
                            } else {
                              await addDailyAttendance({
                                id: generateId(), personId: calPersonId, date: sDateStr, checkIn: '', checkOut, recordType: 'work', createdAt: Date.now()
                              });
                              showNotification('تردد خروج با موفقیت ثبت شد', 'success');
                            }
                          } else {
                            const newRecord = {
                              id: generateId(),
                              personId: calPersonId,
                              date: sDateStr,
                              checkIn,
                              checkOut,
                              recordType: 'work',
                              createdAt: Date.now()
                            };
                            await addDailyAttendance(newRecord);
                            showNotification(mode === 'entry' ? 'ورود با موفقیت ثبت شد' : 'تردد با موفقیت ثبت شد', 'success');
                          }
                          fetchData();
                          (e.target as HTMLFormElement).reset();
                        } catch (err) {
                          showNotification('خطا در ثبت تردد', 'error');
                        }
                      }}
                    >
                      <h4 className="font-bold text-slate-700 mb-3 text-sm">ثبت تردد جدید</h4>
                      <div className="mb-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">نوع ثبت</label>
                        <select name="mode" className="w-full border p-2 rounded-lg font-bold bg-white outline-none focus:border-indigo-500">
                          <option value="both">ورود و خروج</option>
                          <option value="entry">فقط ورود</option>
                          <option value="exit">فقط خروج</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">ورود</label>
                          <input name="checkIn" type="time" defaultValue="08:00" className="w-full border p-2 rounded-lg font-bold text-center" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">خروج</label>
                          <input name="checkOut" type="time" defaultValue="17:00" className="w-full border p-2 rounded-lg font-bold text-center" />
                        </div>
                      </div>
                      <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition">
                        افزودن تردد
                      </button>"""

content = content.replace(old_inline, new_inline)

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

