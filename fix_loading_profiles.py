import re

with open('src/components/payroll/EmployeeProfilesManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const handleSave = async () => {\n    if (!editingPersonId) return;", "const handleSave = async () => {\n    if (!editingPersonId || loading) return;\n    setLoading(true);")
content = content.replace("if (fetchPersons) fetchPersons();\n    } catch (e) {\n      console.error(e);\n      showNotification('خطا در ذخیره اطلاعات', 'error');\n    }\n  };", "if (fetchPersons) fetchPersons();\n    } catch (e) {\n      console.error(e);\n      showNotification('خطا در ذخیره اطلاعات', 'error');\n    } finally {\n      setLoading(false);\n    }\n  };")

content = content.replace("const [employees, setEmployees] = useState<any[]>([]);", "const [employees, setEmployees] = useState<any[]>([]);\n  const [loading, setLoading] = useState(false);")

content = content.replace('<button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all">',
'<button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all disabled:opacity-50">')

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
    '<div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">',
    '<div className="min-h-full bg-slate-50/50 p-4 md:p-8 relative" dir="rtl">' + overlay
)

with open('src/components/payroll/EmployeeProfilesManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
