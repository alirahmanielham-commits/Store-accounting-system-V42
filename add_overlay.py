import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

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
    '<div className="min-h-full bg-slate-50/50 p-4 md:p-8 print:bg-white print:p-0" dir="rtl">',
    '<div className="min-h-full bg-slate-50/50 p-4 md:p-8 print:bg-white print:p-0" dir="rtl">' + overlay
)

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
