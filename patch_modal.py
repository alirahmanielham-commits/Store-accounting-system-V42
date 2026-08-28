import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_form_inputs = """                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">نوع تردد</label>
                  <select 
                    value={form.recordType}
                    onChange={e => setForm({...form, recordType: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  >
                    {Object.entries(RECORD_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">ساعت ورود</label>
                    <input 
                      type="time" 
                      value={form.checkIn}
                      onChange={e => setForm({...form, checkIn: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 font-mono text-center"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">ساعت خروج</label>
                    <input 
                      type="time" 
                      value={form.checkOut}
                      onChange={e => setForm({...form, checkOut: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 font-mono text-center"
                      required
                    />
                  </div>
                </div>"""

new_form_inputs = """                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">ثبت اطلاعات</label>
                    <select 
                      value={form.mode}
                      onChange={e => setForm({...form, mode: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold"
                    >
                      <option value="both">ورود و خروج کامل</option>
                      <option value="entry">فقط ثبت ورود</option>
                      <option value="exit">فقط ثبت خروج</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">نوع تردد</label>
                    <select 
                      value={form.recordType}
                      onChange={e => setForm({...form, recordType: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold"
                    >
                      {Object.entries(RECORD_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(form.mode === 'both' || form.mode === 'entry') && (
                    <div className={form.mode === 'entry' ? 'col-span-2' : ''}>
                      <label className="block text-sm font-bold text-slate-700 mb-1">ساعت ورود</label>
                      <input 
                        type="time" 
                        value={form.checkIn}
                        onChange={e => setForm({...form, checkIn: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 font-mono text-center"
                        required={form.mode === 'both' || form.mode === 'entry'}
                      />
                    </div>
                  )}
                  {(form.mode === 'both' || form.mode === 'exit') && (
                    <div className={form.mode === 'exit' ? 'col-span-2' : ''}>
                      <label className="block text-sm font-bold text-slate-700 mb-1">ساعت خروج</label>
                      <input 
                        type="time" 
                        value={form.checkOut}
                        onChange={e => setForm({...form, checkOut: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 font-mono text-center"
                        required={form.mode === 'both' || form.mode === 'exit'}
                      />
                    </div>
                  )}
                </div>"""

content = content.replace(old_form_inputs, new_form_inputs)

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
