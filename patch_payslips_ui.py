import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_ui = """                    {/* Attendance Grid */}
                    <div>
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><Calendar className="w-4 h-4"/></div>
                        <h3 className="font-bold text-slate-800 text-lg">خلاصه کارکرد دوره</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-500">روز کارکرد</span>
                          <span className="text-xl font-black text-slate-800">{toPersianDigits(selectedAttendance?.workDays || 0)}</span>
                        </div>
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 shadow-sm flex items-center justify-between">
                          <span className="text-sm font-bold text-indigo-600">ساعت اضافه کاری</span>
                          <span className="text-xl font-black text-indigo-700">{toPersianDigits(selectedAttendance?.overtimeHours || 0)}</span>
                        </div>
                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
                          <span className="text-sm font-bold text-emerald-600">مرخصی استحقاقی</span>
                          <span className="text-xl font-black text-emerald-700">{toPersianDigits(selectedAttendance?.paidLeaveDays || 0)}</span>
                        </div>
                        <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between">
                          <span className="text-sm font-bold text-rose-600">غیبت / بدون حقوق</span>
                          <span className="text-xl font-black text-rose-700">{toPersianDigits(selectedAttendance?.absentDays || 0)}</span>
                        </div>
                      </div>
                    </div>"""

new_ui = """                    {/* Attendance Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><Calendar className="w-4 h-4"/></div>
                          <h3 className="font-bold text-slate-800 text-lg">خلاصه کارکرد دوره</h3>
                        </div>
                        {selectedSlip?.status === 'draft' && selectedAttendance && (
                          isEditingAttendance ? (
                            <div className="flex gap-2">
                              <button onClick={() => setIsEditingAttendance(false)} className="text-sm text-slate-500 hover:text-slate-700 font-bold px-3 py-1.5 border border-slate-200 rounded-lg">انصراف</button>
                              <button onClick={handleSaveAndRecalculateAttendance} className="text-sm text-white bg-indigo-600 hover:bg-indigo-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><RotateCcw className="w-4 h-4" /> ذخیره و محاسبه</button>
                            </div>
                          ) : (
                            <button onClick={handleEditAttendance} className="text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-bold px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors">ویرایش کارکرد</button>
                          )
                        )}
                      </div>
                      
                      {isEditingAttendance && editAttendanceForm ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-500">روز کارکرد</span>
                            <input type="number" value={editAttendanceForm.workDays} onChange={e => setEditAttendanceForm({...editAttendanceForm, workDays: e.target.value})} className="w-full text-left font-mono font-bold text-lg bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-500" />
                          </div>
                          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-indigo-600">ساعت اضافه کاری</span>
                            <input type="number" value={editAttendanceForm.overtimeHours} onChange={e => setEditAttendanceForm({...editAttendanceForm, overtimeHours: e.target.value})} className="w-full text-left font-mono font-bold text-lg bg-white border border-indigo-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-500 text-indigo-700" />
                          </div>
                          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-emerald-600">مرخصی استحقاقی</span>
                            <input type="number" value={editAttendanceForm.paidLeaveDays} onChange={e => setEditAttendanceForm({...editAttendanceForm, paidLeaveDays: e.target.value})} className="w-full text-left font-mono font-bold text-lg bg-white border border-emerald-200 rounded-lg px-2 py-1 outline-none focus:border-emerald-500 text-emerald-700" />
                          </div>
                          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-rose-600">غیبت / بدون حقوق</span>
                            <input type="number" value={editAttendanceForm.absentDays} onChange={e => setEditAttendanceForm({...editAttendanceForm, absentDays: e.target.value})} className="w-full text-left font-mono font-bold text-lg bg-white border border-rose-200 rounded-lg px-2 py-1 outline-none focus:border-rose-500 text-rose-700" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-500">روز کارکرد</span>
                            <span className="text-xl font-black text-slate-800">{toPersianDigits(selectedAttendance?.workDays || 0)}</span>
                          </div>
                          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 shadow-sm flex items-center justify-between">
                            <span className="text-sm font-bold text-indigo-600">ساعت اضافه کاری</span>
                            <span className="text-xl font-black text-indigo-700">{toPersianDigits(selectedAttendance?.overtimeHours || 0)}</span>
                          </div>
                          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
                            <span className="text-sm font-bold text-emerald-600">مرخصی استحقاقی</span>
                            <span className="text-xl font-black text-emerald-700">{toPersianDigits(selectedAttendance?.paidLeaveDays || 0)}</span>
                          </div>
                          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between">
                            <span className="text-sm font-bold text-rose-600">غیبت / بدون حقوق</span>
                            <span className="text-xl font-black text-rose-700">{toPersianDigits(selectedAttendance?.absentDays || 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>"""

code = code.replace(old_ui, new_ui)

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
