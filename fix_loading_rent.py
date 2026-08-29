import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const handleSave = async () => {\n    if (!form.personId)", "const handleSave = async () => {\n    if (loading) return;\n    if (!form.personId)")
content = content.replace("return showNotification('مبلغ ماهانه الزامی است', 'error');\n\n    try {", "return showNotification('مبلغ ماهانه الزامی است', 'error');\n\n    setLoading(true);\n    try {")

content = content.replace("setIsFormOpen(false);\n      fetchData();\n    } catch (e) {\n      console.error(e);\n      showNotification('خطا در ذخیره', 'error');\n    }\n  };", "setIsFormOpen(false);\n      await fetchData();\n    } catch (e) {\n      console.error(e);\n      showNotification('خطا در ذخیره', 'error');\n    } finally {\n      setLoading(false);\n    }\n  };")

content = content.replace('<button onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 flex-1 shadow-sm">',
'<button onClick={handleSave} disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 flex-1 shadow-sm disabled:opacity-50">')

content = content.replace('<Save className="w-5 h-5" />\n                    ذخیره',
'{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}\n                    ذخیره')


overlay = """
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 min-w-[200px] border border-slate-100">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="font-bold text-slate-700 animate-pulse">در حال پردازش...</span>
          </div>
        </div>
      )}
"""
content = content.replace(
    '<div className="bg-slate-50 min-h-[calc(100vh-2rem)] p-4 md:p-8" dir="rtl">',
    '<div className="bg-slate-50 min-h-[calc(100vh-2rem)] p-4 md:p-8 relative" dir="rtl">' + overlay
)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
