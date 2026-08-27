import re

with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add getPayslips to imports
content = content.replace(
    "getMissions } from '../../services/hrService';",
    "getMissions, getPayslips } from '../../services/hrService';"
)

# 2. Add monthPayslips state
if "const [monthPayslips" not in content:
    content = content.replace(
        "const [allDailyLogs, setAllDailyLogs] = useState<any[]>([]);",
        "const [allDailyLogs, setAllDailyLogs] = useState<any[]>([]);\n  const [monthPayslips, setMonthPayslips] = useState<any[]>([]);"
    )

# 3. Update fetchAttendance
fetch_attendance_pattern = r"(const dLogs = await getDailyAttendances\(\);\s*setAllDailyLogs\(dLogs\);)"
if "getPayslips();" not in content:
    content = re.sub(
        fetch_attendance_pattern,
        r"\1\n      const pSlips = await getPayslips();\n      setMonthPayslips(pSlips);",
        content
    )

# 4. Modify JSX block
# We need to replace the rendering of `a` row in the map
jsx_pattern = r"(<tr key=\{i\} className=\"hover:bg-slate-50 transition-colors\">.*?)(<td className=\"p-3 text-center\">\s*<select disabled value=\{a.status\}.*?</td>.*?)(</tr>)"

# Actually, let's just write a function to replace the tr content. We can replace the fields inside the map.
# Since it might be tricky to regex, let's just use string replacement for the specific block.

old_block = """                    <td className="p-3 text-center">
                      <select disabled value={a.status} className={`text-xs p-1 rounded font-bold ${a.status==='approved'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
                        <option value="draft">پیشنویس</option>
                        <option value="approved">تایید نهایی</option>
                      </select>
                    </td>
                    <td className="p-3"><input type="number" min="0" value={a.workDays} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>
                    <td className="p-3"><input type="number" min="0" value={a.overtimeHours} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>
                    <td className="p-3"><input type="number" min="0" value={a.absentDays} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>
                    <td className="p-3"><input type="number" min="0" value={a.paidLeaveDays} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>
                    <td className="p-3"><input type="number" min="0" value={a.sickLeaveDays} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>
                    <td className="p-3"><input type="number" min="0" value={a.missionDays} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>"""

new_block = """                    {(() => {
                      const hasPayslip = !a.isNew && monthPayslips.some(p => p.attendanceId === a.id);
                      const isApproved = a.status === 'approved';
                      const disableInputs = isApproved || hasPayslip;
                      
                      return (
                        <>
                          <td className="p-3 text-center">
                            <select 
                              disabled={hasPayslip} 
                              value={a.status} 
                              onChange={(e) => handleChange(a.personId, 'status', e.target.value)}
                              className={`text-xs p-1 rounded font-bold cursor-pointer ${a.status==='approved'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'} ${hasPayslip ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <option value="draft">پیشنویس</option>
                              <option value="approved">تایید نهایی</option>
                            </select>
                          </td>
                          <td className="p-3"><input type="number" min="0" value={a.workDays} onChange={(e) => handleChange(a.personId, 'workDays', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                          <td className="p-3"><input type="number" min="0" value={a.overtimeHours} onChange={(e) => handleChange(a.personId, 'overtimeHours', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                          <td className="p-3"><input type="number" min="0" value={a.absentDays} onChange={(e) => handleChange(a.personId, 'absentDays', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                          <td className="p-3"><input type="number" min="0" value={a.paidLeaveDays} onChange={(e) => handleChange(a.personId, 'paidLeaveDays', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                          <td className="p-3"><input type="number" min="0" value={a.sickLeaveDays} onChange={(e) => handleChange(a.personId, 'sickLeaveDays', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                          <td className="p-3"><input type="number" min="0" value={a.missionDays} onChange={(e) => handleChange(a.personId, 'missionDays', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                        </>
                      )
                    })()}"""

content = content.replace(old_block, new_block)

# 5. We also need to disable the buttons if it's approved or has payslip.
button_block = """                    <td className="p-3 text-center flex items-center justify-center gap-1">
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

new_button_block = """                    <td className="p-3 text-center flex items-center justify-center gap-1">
                      {(() => {
                        const hasPayslip = !a.isNew && monthPayslips.some(p => p.attendanceId === a.id);
                        const isApproved = a.status === 'approved';
                        const disableInputs = isApproved || hasPayslip;
                        return (
                          <>
                            <button onClick={() => !disableInputs && handleCalculateFromDaily([a.personId])} disabled={disableInputs} className={`p-1.5 rounded transition-colors ${disableInputs ? 'text-slate-300 cursor-not-allowed' : 'text-indigo-500 hover:bg-indigo-50'}`} title={disableInputs ? "غیرقابل محاسبه" : "محاسبه کارکرد شخص"}>
                              <Clock className="w-5 h-5" />
                            </button>
                            <button onClick={() => !hasPayslip && handleSave([a.personId])} disabled={hasPayslip} className={`p-1.5 rounded transition-colors ${hasPayslip ? 'text-slate-300 cursor-not-allowed' : 'text-emerald-500 hover:bg-emerald-50'}`} title={hasPayslip ? "فیش صادر شده است" : "ذخیره کارکرد شخص"}>
                              <Save className="w-5 h-5" />
                            </button>
                            <button onClick={() => setViewDetailsPersonId(a.personId)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors" title="مشاهده ریز کارکرد">
                              <Eye className="w-5 h-5" />
                            </button>
                          </>
                        )
                      })()}
                    </td>"""

content = content.replace(button_block, new_button_block)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
