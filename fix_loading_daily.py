import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add loading check to saves
content = content.replace("const handleSaveAttendance = async (e: React.FormEvent) => {\n    e.preventDefault();", "const handleSaveAttendance = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if(loading) return;\n    setLoading(true);")
content = content.replace("showNotification('تردد ثبت شد', 'success');\n      await fetchData();\n    } catch (err) {\n      showNotification('خطا در ثبت', 'error');\n    }\n  };", "showNotification('تردد ثبت شد', 'success');\n      await fetchData();\n    } catch (err) {\n      showNotification('خطا در ثبت', 'error');\n    } finally {\n      setLoading(false);\n    }\n  };")

content = content.replace("const handleSaveLeave = async (e: React.FormEvent) => {\n    e.preventDefault();", "const handleSaveLeave = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if(loading) return;\n    setLoading(true);")
content = content.replace("showNotification('مرخصی ثبت شد', 'success');\n      await fetchData();\n    } catch (err) {\n      showNotification('خطا در ثبت', 'error');\n    }\n  };", "showNotification('مرخصی ثبت شد', 'success');\n      await fetchData();\n    } catch (err) {\n      showNotification('خطا در ثبت', 'error');\n    } finally {\n      setLoading(false);\n    }\n  };")

content = content.replace("const handleSaveMission = async (e: React.FormEvent) => {\n    e.preventDefault();", "const handleSaveMission = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if(loading) return;\n    setLoading(true);")
content = content.replace("showNotification('ماموریت ثبت شد', 'success');\n      await fetchData();\n    } catch (err) {\n      showNotification('خطا در ثبت', 'error');\n    }\n  };", "showNotification('ماموریت ثبت شد', 'success');\n      await fetchData();\n    } catch (err) {\n      showNotification('خطا در ثبت', 'error');\n    } finally {\n      setLoading(false);\n    }\n  };")

content = content.replace("const handleDeleteRecord = (type: string, id: string) => {\n    setConfirmConfig({", "const handleDeleteRecord = (type: string, id: string) => {\n    if (loading) return;\n    setConfirmConfig({")

content = content.replace("const confirmDelete = async () => {\n    try {", "const confirmDelete = async () => {\n    if (loading) return;\n    setLoading(true);\n    try {")

content = content.replace("showNotification('عملیات با موفقیت انجام شد', 'success');\n      await fetchData();\n    } catch (err) {\n      showNotification('خطا در حذف', 'error');\n    } finally {\n      setConfirmConfig({ isOpen: false, message: '', onConfirm: () => {} });\n    }", "showNotification('عملیات با موفقیت انجام شد', 'success');\n      await fetchData();\n    } catch (err) {\n      showNotification('خطا در حذف', 'error');\n    } finally {\n      setConfirmConfig({ isOpen: false, message: '', onConfirm: () => {} });\n      setLoading(false);\n    }")


# Add overlay and disable save buttons
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

content = content.replace(
    '<button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2">',
    '<button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">'
)

content = content.replace(
    '<button onClick={confirmConfig.onConfirm} className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-sm">',
    '<button onClick={confirmConfig.onConfirm} disabled={loading} className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50">'
)


with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
