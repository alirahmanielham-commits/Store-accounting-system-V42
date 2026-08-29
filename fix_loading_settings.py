import re

with open('src/components/payroll/PayrollSettings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const handleSaveTemplate = async () => {\n    if (!templateForm.name) {", "const handleSaveTemplate = async () => {\n    if (loading) return;\n    if (!templateForm.name) {")
content = content.replace("return showNotification('نام قالب الزامی است', 'error');\n    }\n    try {", "return showNotification('نام قالب الزامی است', 'error');\n    }\n    setLoading(true);\n    try {")

content = content.replace("fetchData();\n    } catch (e) {\n      showNotification('خطا در ذخیره قالب', 'error');\n    }\n  };", "await fetchData();\n    } catch (e) {\n      showNotification('خطا در ذخیره قالب', 'error');\n    } finally {\n      setLoading(false);\n    }\n  };")

content = content.replace("const [showTemplateForm, setShowTemplateForm] = useState(false);", "const [showTemplateForm, setShowTemplateForm] = useState(false);\n  const [loading, setLoading] = useState(false);")

content = content.replace('<button onClick={handleSaveTemplate} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2">',
'<button onClick={handleSaveTemplate} disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">')

content = content.replace('<Save className="w-5 h-5" />',
'{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}')

overlay = """
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 min-w-[200px] border border-slate-100">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="font-bold text-slate-700 animate-pulse">در حال ذخیره...</span>
          </div>
        </div>
      )}
"""
content = content.replace(
    '<div className="bg-slate-50 min-h-[calc(100vh-2rem)] p-4 md:p-8" dir="rtl">',
    '<div className="bg-slate-50 min-h-[calc(100vh-2rem)] p-4 md:p-8 relative" dir="rtl">' + overlay
)

with open('src/components/payroll/PayrollSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
