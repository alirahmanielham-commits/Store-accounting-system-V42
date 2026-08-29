import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add loading state check for handleFinalize, handleRevert, handleDeleteSlip, handleRecalculateSingle
content = content.replace("const handleFinalize = async (id) => {", "const handleFinalize = async (id) => {\n    if (loading) return;\n    setLoading(true);")
content = content.replace("showNotification('فیش قطعی شد و سند حسابداری آن ثبت گردید', 'success');\n      fetchPayslips();\n    } catch(e) {", "showNotification('فیش قطعی شد و سند حسابداری آن ثبت گردید', 'success');\n      await fetchPayslips();\n    } catch(e) {")
content = content.replace("showNotification('خطا در ثبت سند یا قطعی سازی', 'error');\n    }", "showNotification('خطا در ثبت سند یا قطعی سازی', 'error');\n    } finally {\n      setLoading(false);\n    }")

content = content.replace("const handleRevert = async (id) => {\n    if (!window.confirm", "const handleRevert = async (id) => {\n    if (loading) return;\n    if (!window.confirm")
content = content.replace("const handleDeleteSlip = async (id) => {\n    if (!window.confirm", "const handleDeleteSlip = async (id) => {\n    if (loading) return;\n    if (!window.confirm")
content = content.replace("const handleRecalculateSingle = async (slipId) => {\n    const existing", "const handleRecalculateSingle = async (slipId) => {\n    if (loading) return;\n    const existing")

# Add disabled and loading spinner to buttons
def replace_button(text_to_find, replacement):
    global content
    content = content.replace(text_to_find, replacement)

replace_button(
    '<button onClick={() => handleFinalize(selectedSlip.id)} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-2 shadow-sm">',
    '<button onClick={() => handleFinalize(selectedSlip.id)} disabled={loading} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-2 shadow-sm disabled:opacity-50">'
)
replace_button(
    '<CheckCircle className="w-5 h-5" /> قطعی کردن',
    '{loading ? <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-5 h-5" />} قطعی کردن'
)

replace_button(
    '<button onClick={() => handleRecalculateSingle(selectedSlip.id)} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200 flex items-center gap-2 shadow-sm">',
    '<button onClick={() => handleRecalculateSingle(selectedSlip.id)} disabled={loading} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200 flex items-center gap-2 shadow-sm disabled:opacity-50">'
)
replace_button(
    '<Calculator className="w-5 h-5" /> محاسبه مجدد',
    '{loading ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Calculator className="w-5 h-5" />} محاسبه مجدد'
)

replace_button(
    '<button onClick={() => handleDeleteSlip(selectedSlip.id)} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-rose-50 text-rose-700 font-bold rounded-xl hover:bg-rose-100 transition-colors border border-rose-200 flex items-center gap-2 shadow-sm">',
    '<button onClick={() => handleDeleteSlip(selectedSlip.id)} disabled={loading} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-rose-50 text-rose-700 font-bold rounded-xl hover:bg-rose-100 transition-colors border border-rose-200 flex items-center gap-2 shadow-sm disabled:opacity-50">'
)
replace_button(
    '<Trash2 className="w-5 h-5" /> حذف فیش',
    '{loading ? <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-5 h-5" />} حذف فیش'
)

replace_button(
    '<button onClick={() => handleRevert(selectedSlip.id)} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-amber-50 text-amber-700 font-bold rounded-xl hover:bg-amber-100 transition-colors border border-amber-200 flex items-center gap-2 shadow-sm">',
    '<button onClick={() => handleRevert(selectedSlip.id)} disabled={loading} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-amber-50 text-amber-700 font-bold rounded-xl hover:bg-amber-100 transition-colors border border-amber-200 flex items-center gap-2 shadow-sm disabled:opacity-50">'
)
replace_button(
    '<RotateCcw className="w-5 h-5" /> ویرایش/برگشت',
    '{loading ? <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> : <RotateCcw className="w-5 h-5" />} ویرایش/برگشت'
)

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
