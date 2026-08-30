import re

with open('src/components/payroll/WorkplacesManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the useEffect
content = content.replace(
"""  useEffect(() => {
    if (isOpen) {
      fetchWorkplaces();
      setEditingWorkplaceId(null);
      resetForm();
    }
  }, [isOpen]);""",
"""  useEffect(() => {
    fetchWorkplaces();
    setEditingWorkplaceId(null);
    resetForm();
  }, []);"""
)

# Remove the 'if (!isOpen)'
content = content.replace("  if (!isOpen) return null;", "")

# Replace the wrapper
wrapper_old = """  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col">"""

wrapper_new = """  return (
    <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden" dir="rtl">
      <div className="flex-1 overflow-auto p-6 pt-4 w-full mx-auto">"""
content = content.replace(wrapper_old, wrapper_new)

# Replace the header
header_old = """        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">مدیریت کارگاه‌ها</h2>
              <p className="text-sm text-slate-500 font-bold mt-1">تعریف و ویرایش اطلاعات کارگاه‌های سازمان</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>"""

header_new = """        <div className="p-6 mb-6 border-b border-slate-200 bg-white rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">مدیریت کارگاه‌ها</h1>
              <p className="text-sm text-slate-500 font-bold mt-1">تعریف و ویرایش اطلاعات کارگاه‌های سازمان</p>
            </div>
          </div>
        </div>"""

content = content.replace(header_old, header_new)

with open('src/components/payroll/WorkplacesManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
