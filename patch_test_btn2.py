import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add Play icon
code = code.replace(
    "import { Plus, Edit2, Trash2, FileText, Check, X, AlertCircle, CheckCircle } from 'lucide-react';",
    "import { Plus, Edit2, Trash2, FileText, Check, X, AlertCircle, CheckCircle, Play } from 'lucide-react';"
)

header_old = """      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <input 
          type="text" 
          placeholder="جستجو طرف قرارداد..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm w-64"
        />
        <button """

header_new = """      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            placeholder="جستجو طرف قرارداد..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm w-64"
          />
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
            title="تست ایجاد دستی اسناد سررسید شده"
          >
            <Play className="w-5 h-5" />
            تست ایجاد اسناد
          </button>
        </div>
        <button """

code = code.replace(header_old, header_new)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
