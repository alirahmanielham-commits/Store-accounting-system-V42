import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_imports = "import { FileText, Plus, Edit2, CheckCircle, Save, XCircle, Search, Trash2 } from 'lucide-react';"
new_imports = "import { FileText, Plus, Edit2, CheckCircle, Save, XCircle, Search, Trash2, Eye, ArrowRight, AlertTriangle } from 'lucide-react';"
content = content.replace(old_imports, new_imports)

# 2. Add viewingOrder state
old_state = "  const [searchQuery, setSearchQuery] = useState('');\n  const [isModalOpen, setIsModalOpen] = useState(false);"
new_state = "  const [searchQuery, setSearchQuery] = useState('');\n  const [isModalOpen, setIsModalOpen] = useState(false);\n  const [viewingOrder, setViewingOrder] = useState<any>(null);"
content = content.replace(old_state, new_state)

# 3. Add handleStatusChange
old_delete = "  const handleDelete = async (id: string) => {"
new_status_change = """  const handleStatusChange = async (order: any, newStatus: string) => {
    if (newStatus === 'active') {
      if(!window.confirm('با تایید نهایی و فعال کردن این حکم، سایر احکام فعالِ این قرارداد غیرفعال (بایگانی) خواهند شد. آیا مطمئن هستید؟')) return;
      try {
        const otherOrders = orders.filter(o => o.contractId === order.contractId && o.id !== order.id && o.status === 'active');
        for (const ord of otherOrders) {
          await updateEmployeeOrder(ord.id, { ...ord, status: 'inactive' });
        }
        await updateEmployeeOrder(order.id, { ...order, status: 'active' });
        showNotification('حکم با موفقیت تایید نهایی و فعال شد', 'success');
        await fetchData();
        setViewingOrder({ ...order, status: 'active' });
      } catch (e) {
        showNotification('خطا در تغییر وضعیت', 'error');
      }
    } else {
      if(!window.confirm('آیا از تغییر وضعیت این حکم مطمئن هستید؟')) return;
      try {
        await updateEmployeeOrder(order.id, { ...order, status: newStatus });
        showNotification('وضعیت حکم تغییر کرد', 'success');
        await fetchData();
        setViewingOrder({ ...order, status: newStatus });
      } catch (e) {
        showNotification('خطا در تغییر وضعیت', 'error');
      }
    }
  };

  const handleDelete = async (id: string) => {"""
content = content.replace(old_delete, new_status_change)

# 4. Add the Eye button in the table actions
old_table_actions = """                            <button
                              onClick={() => handleOpenModal(order)}
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                              title="ویرایش"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>"""

new_table_actions = """                            <button
                              onClick={() => setViewingOrder(order)}
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                              title="مشاهده"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenModal(order)}
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                              title="ویرایش"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>"""
content = content.replace(old_table_actions, new_table_actions)

# 5. Add the view rendering logic
old_render = """  if (isModalOpen) {
    return ("""

view_render = """  if (viewingOrder) {
    const emp = employees.find((e: any) => e.id === viewingOrder.personId);
    const contract = contracts.find((c: any) => c.id === viewingOrder.contractId);
    const template = templates.find((t: any) => t.id === viewingOrder.templateId);

    return (
      <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewingOrder(null)}
                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all border border-slate-200"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-indigo-500" />
                  جزئیات حکم کارگزینی
                </h1>
                <p className="text-sm text-slate-500 mt-1">{viewingOrder.name || template?.name || 'حکم بدون نام'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
              {viewingOrder.status === 'draft' && (
                <>
                  <button onClick={() => handleStatusChange(viewingOrder, 'active')} className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> تایید نهایی و فعال
                  </button>
                  <button onClick={() => { setViewingOrder(null); handleOpenModal(viewingOrder); }} className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                    <Edit2 className="w-4 h-4" /> ویرایش
                  </button>
                </>
              )}
              {viewingOrder.status === 'active' && (
                <button onClick={() => handleStatusChange(viewingOrder, 'inactive')} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> غیرفعال کردن حکم
                </button>
              )}
              {viewingOrder.status === 'inactive' && (
                <button onClick={() => handleStatusChange(viewingOrder, 'active')} className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> فعال سازی مجدد
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sidebar Details */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" /> اطلاعات پایه
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">وضعیت حکم</div>
                    <div>
                      {viewingOrder.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          تایید نهایی / فعال
                        </span>
                      ) : viewingOrder.status === 'inactive' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          غیرفعال / بایگانی
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          پیش‌نویس
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">نام پرسنل</div>
                    <div className="font-bold text-slate-800">{emp?.name || '---'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">قرارداد مرتبط</div>
                    <div className="font-bold text-slate-700 font-mono">{contract?.contractNumber || '---'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">تاریخ صدور</div>
                    <div className="font-bold text-slate-700 font-mono">
                      {viewingOrder.issueDate ? new Date(Number(viewingOrder.issueDate)).toLocaleDateString('fa-IR') : '---'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content (Items) */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" /> اقلام و عناوین حکم
                </h3>
                
                {viewingOrder.items && viewingOrder.items.length > 0 ? (
                  <div className="space-y-3">
                    {viewingOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl gap-3">
                        <div>
                          <div className="font-bold text-slate-800">{item.title}</div>
                          <div className="text-xs font-bold mt-1 text-slate-500">
                            {item.type === 'earning' ? 'مزایا (+)' : 'کسورات (-)'}
                          </div>
                        </div>
                        <div className="font-mono font-black text-lg text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200" dir="ltr">
                          {item.amount} {item.type === 'earning' ? '(+)' : '(-)'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 font-bold">
                    هیچ عنوانی برای این حکم ثبت نشده است.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isModalOpen) {"""
content = content.replace(old_render, view_render)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied.")
