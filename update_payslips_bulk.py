import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add states
if "const [showGenerateModal, setShowGenerateModal] = useState(false);" not in content:
    content = content.replace(
        "const [loading, setLoading] = useState(false);",
        "const [loading, setLoading] = useState(false);\n  const [showGenerateModal, setShowGenerateModal] = useState(false);\n  const [selectedForGen, setSelectedForGen] = useState<string[]>([]);"
    )

# Modify handleGenerate signature
content = content.replace("const handleGenerate = async () => {", "const handleGenerate = async (targetPersonIds: string[]) => {")

# Modify handleGenerate logic to filter attendances
old_loop_start = """      const { updateMonthlyAttendance } = await import('../../services/hrService');
      for (const att of attendances) {"""
new_loop_start = """      const { updateMonthlyAttendance } = await import('../../services/hrService');
      const targetAttendances = attendances.filter(a => targetPersonIds.includes(a.personId));
      for (const att of targetAttendances) {"""
content = content.replace(old_loop_start, new_loop_start)

# After loop ends in handleGenerate:
old_loop_end = """      if (count > 0) {
        showNotification(`فیش حقوقی برای ${toPersianDigits(count)} نفر صادر شد`, 'success');
        fetchPayslips();
      } else {
        showNotification('هیچ فیش جدیدی صادر نشد', 'info');
      }
    } catch (e) {"""
new_loop_end = """      if (count > 0) {
        showNotification(`فیش حقوقی برای ${toPersianDigits(count)} نفر صادر شد`, 'success');
        fetchPayslips();
        setShowGenerateModal(false);
      } else {
        showNotification('هیچ فیش جدیدی صادر نشد', 'info');
      }
    } catch (e) {"""
content = content.replace(old_loop_end, new_loop_end)

# Find the generate button
old_button = """            <button onClick={handleGenerate} disabled={loading} className="flex-1 lg:flex-none justify-center items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all flex">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Calculator className="w-5 h-5" />}
              محاسبه خودکار حقوق
            </button>"""
new_button = """            <button onClick={() => {
              const available = allAttendances.filter(a => {
                 const existing = slips.find(s => s.personId === a.personId);
                 return !existing || existing.status !== 'finalized';
              });
              setSelectedForGen(available.map(a => a.personId));
              setShowGenerateModal(true);
            }} disabled={loading} className="flex-1 lg:flex-none justify-center items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all flex">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Calculator className="w-5 h-5" />}
              صدور فیش (تکی/گروهی)
            </button>"""
content = content.replace(old_button, new_button)

# We need to add the modal at the very end before the last closing div.
modal_code = """
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-500" />
                صدور و محاسبه فیش حقوقی (دوره {year}/{month})
              </h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {(() => {
                 const available = allAttendances.filter(a => {
                   const existing = slips.find(s => s.personId === a.personId);
                   return !existing || existing.status !== 'finalized';
                 });
                 if (available.length === 0) return <div className="text-center p-8 text-slate-500">موردی برای صدور فیش یافت نشد (همه فیش‌ها تایید نهایی شده‌اند یا کارکردی ثبت نشده است).</div>;
                 return (
                   <table className="w-full text-right text-sm border border-slate-100 rounded-lg overflow-hidden">
                     <thead className="bg-slate-50 text-slate-600">
                       <tr>
                         <th className="p-3 w-12 text-center">
                           <input type="checkbox" checked={selectedForGen.length === available.length && available.length > 0} onChange={(e) => {
                             if (e.target.checked) setSelectedForGen(available.map(a => a.personId));
                             else setSelectedForGen([]);
                           }} />
                         </th>
                         <th className="p-3 font-bold">شماره پرسنلی</th>
                         <th className="p-3 font-bold">نام پرسنل</th>
                         <th className="p-3 font-bold text-center">کارکرد (روز)</th>
                         <th className="p-3 font-bold text-center">وضعیت فعلی</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {available.map(a => {
                         const existing = slips.find(s => s.personId === a.personId);
                         return (
                           <tr key={a.personId} className="hover:bg-slate-50">
                             <td className="p-3 text-center">
                               <input type="checkbox" checked={selectedForGen.includes(a.personId)} onChange={(e) => {
                                 if (e.target.checked) setSelectedForGen([...selectedForGen, a.personId]);
                                 else setSelectedForGen(selectedForGen.filter(id => id !== a.personId));
                               }} />
                             </td>
                             <td className="p-3 font-mono text-slate-500">{toPersianDigits(getPersonnelCode(a.personId))}</td>
                             <td className="p-3 font-bold text-slate-800">{getPersonName(a.personId)}</td>
                             <td className="p-3 text-center font-mono">{toPersianDigits(a.workDays.toString())}</td>
                             <td className="p-3 text-center">
                               {existing ? <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs">پیشنویس (آماده محاسبه مجدد)</span> : <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs">صادر نشده</span>}
                             </td>
                           </tr>
                         )
                       })}
                     </tbody>
                   </table>
                 )
              })()}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowGenerateModal(false)} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                انصراف
              </button>
              <button disabled={selectedForGen.length === 0 || loading} onClick={() => handleGenerate(selectedForGen)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
                {loading ? 'در حال صدور...' : `صدور فیش (${toPersianDigits(selectedForGen.length)} نفر)`}
              </button>
            </div>
          </div>
        </div>
      )}
"""
content = content.replace("    </div>\n  );\n}", modal_code + "    </div>\n  );\n}")

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
