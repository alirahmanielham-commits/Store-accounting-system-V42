import re

with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Update top button texts
old_save_btn = """          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all">
            <Save className="w-5 h-5" />
            ذخیره کارکرد
          </button>"""
new_save_btn = """          <button onClick={() => handleSave()} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all">
            <Save className="w-5 h-5" />
            ذخیره کارکرد (گروهی)
          </button>"""
code = code.replace(old_save_btn, new_save_btn)

old_calc_btn = """          <button onClick={handleCalculateFromDaily} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-100 border border-indigo-100 mr-auto">
            <Clock className="w-4 h-4"/> محاسبه از تردد روزانه
          </button>"""
new_calc_btn = """          <button onClick={() => handleCalculateFromDaily()} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-100 border border-indigo-100 mr-auto">
            <Clock className="w-4 h-4"/> محاسبه از تردد روزانه (گروهی)
          </button>"""
code = code.replace(old_calc_btn, new_calc_btn)

# Update thead
old_thead = """              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="p-3 font-bold whitespace-nowrap">نام پرسنل</th>"""
new_thead = """              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="p-3 font-bold w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={attendances.length > 0 && selectedPersonIds.length === attendances.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedPersonIds(attendances.map((a: any) => a.personId));
                        else setSelectedPersonIds([]);
                      }}
                    />
                  </th>
                  <th className="p-3 font-bold whitespace-nowrap">نام پرسنل</th>"""
code = code.replace(old_thead, new_thead)

# Update tbody row
old_tbody_row = """                {attendances.map((a: any) => (
                  <tr key={a.personId} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{getPersonName(a.personId)}</td>"""
new_tbody_row = """                {attendances.map((a: any) => (
                  <tr key={a.personId} className="hover:bg-slate-50">
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={selectedPersonIds.includes(a.personId)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPersonIds([...selectedPersonIds, a.personId]);
                          else setSelectedPersonIds(selectedPersonIds.filter(id => id !== a.personId));
                        }}
                      />
                    </td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{getPersonName(a.personId)}</td>"""
code = code.replace(old_tbody_row, new_tbody_row)

# Update row actions
old_actions = """                    <td className="p-3 text-center">
                      <button onClick={() => setViewDetailsPersonId(a.personId)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded transition-colors" title="مشاهده ریز کارکرد">
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>"""
new_actions = """                    <td className="p-3 text-center flex items-center justify-center gap-1">
                      <button onClick={() => handleCalculateFromDaily([a.personId])} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded transition-colors" title="محاسبه کارکرد شخص">
                        <Clock className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleSave([a.personId])} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded transition-colors" title="ذخیره کارکرد شخص">
                        <Save className="w-5 h-5" />
                      </button>
                      <button onClick={() => setViewDetailsPersonId(a.personId)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors" title="مشاهده ریز کارکرد">
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>"""
code = code.replace(old_actions, new_actions)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
