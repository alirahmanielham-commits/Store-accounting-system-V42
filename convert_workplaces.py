import os

with open('src/components/payroll/WorkplaceManagerModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change function signature
content = content.replace("export default function WorkplaceManagerModal({ isOpen, onClose, showNotification, storeSettings }: any) {", "export default function WorkplacesManager({ showNotification, storeSettings }: any) {")

# Remove modal wrapper
modal_wrapper_start = """  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">"""

new_wrapper_start = """  return (
    <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden" dir="rtl">"""

content = content.replace(modal_wrapper_start, new_wrapper_start)

# Replace the close button header
header_old = """        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
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

header_new = """        <div className="px-6 py-6 border-b border-slate-200 bg-white">
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

# Remove the extra div closures at the end
end_old = """        </div>
      </div>
    </div>
  );
}"""

end_new = """        </div>
    </div>
  );
}"""

content = content.replace(end_old, end_new)

# Replace loading spinner class name addition if any (already handled inside conversion)

with open('src/components/payroll/WorkplacesManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

