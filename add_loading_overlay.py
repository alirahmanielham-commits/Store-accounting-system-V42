import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

overlay = """
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 min-w-[200px]">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="font-bold text-slate-700">لطفا کمی صبر کنید...</span>
          </div>
        </div>
      )}
"""

# Insert right after `return (` in PayslipsManager
content = content.replace("return (\n    <div className=", f"return (\n    <div className=\"h-full flex flex-col relative\" dir=\"rtl\">\n{overlay}\n      <div className=")
# Note: PayslipsManager return might look different, let's grep it first.
