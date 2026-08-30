import os

with open('src/components/payroll/PayrollSettings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change component name
content = content.replace("export default function PayrollSettings(", "export default function OrderTemplatesManager(")

# Remove isWorkplaceModalOpen
content = content.replace("  const [isWorkplaceModalOpen, setIsWorkplaceModalOpen] = useState(false);\n", "")

# Remove WorkplaceManagerModal import
content = content.replace("import WorkplaceManagerModal from './WorkplaceManagerModal';\n", "")

# Replace header and button
header_old = """      <div className="p-6 pb-2 w-full mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800">مدیریت قالب‌های حکم کارگزینی</h1>
        <button onClick={() => setIsWorkplaceModalOpen(true)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          مدیریت کارگاه‌ها
        </button>
      </div>"""

header_new = """      <div className="p-6 pb-2 w-full mx-auto flex items-center justify-between border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-2xl font-black text-slate-800">مدیریت قالب‌های حکم کارگزینی</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">تعریف و تنظیم قالب‌های آماده برای صدور احکام</p>
        </div>
      </div>"""

content = content.replace(header_old, header_new)

# Remove the WorkplaceManagerModal render at the bottom
render_old = """      <WorkplaceManagerModal 
        isOpen={isWorkplaceModalOpen} 
        onClose={() => setIsWorkplaceModalOpen(false)} 
        showNotification={showNotification}
        storeSettings={storeSettings}
      />
    </div>"""

render_new = """    </div>"""

content = content.replace(render_old, render_new)

with open('src/components/payroll/OrderTemplatesManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

