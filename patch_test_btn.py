import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add Play icon
code = code.replace(
    "import { Plus, Edit2, Trash2, FileText, Check, X, AlertCircle, CheckCircle } from 'lucide-react';",
    "import { Plus, Edit2, Trash2, FileText, Check, X, AlertCircle, CheckCircle, Play } from 'lucide-react';"
)

# Insert the test button and its handler
buttons_old = """      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          مدیریت قراردادهای اجاره
        </h2>
        <button"""

buttons_new = """      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          مدیریت قراردادهای اجاره
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                await autoGenerateRentCommitments();
                showNotification('بررسی و صدور اتوماتیک اسناد تعهد با موفقیت انجام شد', 'success');
                fetchData();
              } catch (e) {
                console.error(e);
                showNotification('خطا در اجرای تست', 'error');
              }
            }}
            className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-200 transition-colors border border-amber-200"
          >
            <Play className="w-5 h-5" />
            اجرای تست صدور اتوماتیک
          </button>
          <button"""

code = code.replace(buttons_old, buttons_new)

# Make sure to close the div tag around the buttons
btn_end_old = """          <Plus className="w-5 h-5" />
          ثبت قرارداد اجاره جدید
        </button>
      </div>"""

btn_end_new = """          <Plus className="w-5 h-5" />
          ثبت قرارداد اجاره جدید
        </button>
        </div>
      </div>"""

code = code.replace(btn_end_old, btn_end_new)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
