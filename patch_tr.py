import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_import = "import { getEmployeeOrders, addEmployeeOrder, updateEmployeeOrder, deleteEmployeeOrder, getEmployeeContracts, getOrderTemplates } from '../../services/hrService';"
new_import = "import { getEmployeeOrders, addEmployeeOrder, updateEmployeeOrder, deleteEmployeeOrder, getEmployeeContracts, getOrderTemplates, getPayslips } from '../../services/hrService';"
content = content.replace(old_import, new_import)

# 2. Add state variables for payslips and deleting modal
old_state = "  const [viewingOrder, setViewingOrder] = useState<any>(null);\n  const [editingId, setEditingId] = useState<string | null>(null);"
new_state = "  const [viewingOrder, setViewingOrder] = useState<any>(null);\n  const [editingId, setEditingId] = useState<string | null>(null);\n  const [deletingOrder, setDeletingOrder] = useState<any>(null);\n  const [payslips, setPayslips] = useState<any[]>([]);"
content = content.replace(old_state, new_state)

# 3. Add fetching payslips
old_fetch = """      const ords = await getEmployeeOrders();
      const cnts = await getEmployeeContracts();
      const tmps = await getOrderTemplates();
      setOrders(ords || []);
      setContracts(cnts || []);
      setTemplates(tmps || []);"""
new_fetch = """      const ords = await getEmployeeOrders();
      const cnts = await getEmployeeContracts();
      const tmps = await getOrderTemplates();
      const ps = await getPayslips();
      setOrders(ords || []);
      setContracts(cnts || []);
      setTemplates(tmps || []);
      setPayslips(ps || []);"""
content = content.replace(old_fetch, new_fetch)

# 4. Modify handleStatusChange to use custom modal
old_status_change = """  const handleStatusChange = async (order: any, newStatus: string) => {
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
  };"""

new_status_change = """  const [statusConfirm, setStatusConfirm] = useState<{order: any, newStatus: string} | null>(null);

  const confirmStatusChange = async () => {
    if (!statusConfirm) return;
    const { order, newStatus } = statusConfirm;
    
    if (newStatus === 'active') {
      try {
        const otherOrders = orders.filter(o => o.contractId === order.contractId && o.id !== order.id && o.status === 'active');
        for (const ord of otherOrders) {
          await updateEmployeeOrder(ord.id, { ...ord, status: 'inactive' });
        }
        await updateEmployeeOrder(order.id, { ...order, status: 'active' });
        showNotification('حکم با موفقیت تایید نهایی و فعال شد', 'success');
        await fetchData();
        if (viewingOrder?.id === order.id) {
          setViewingOrder({ ...order, status: 'active' });
        }
      } catch (e) {
        showNotification('خطا در تغییر وضعیت', 'error');
      }
    } else {
      try {
        await updateEmployeeOrder(order.id, { ...order, status: newStatus });
        showNotification('وضعیت حکم تغییر کرد', 'success');
        await fetchData();
        if (viewingOrder?.id === order.id) {
          setViewingOrder({ ...order, status: newStatus });
        }
      } catch (e) {
        showNotification('خطا در تغییر وضعیت', 'error');
      }
    }
    setStatusConfirm(null);
  };

  const handleStatusChange = (order: any, newStatus: string) => {
    setStatusConfirm({ order, newStatus });
  };"""

content = content.replace(old_status_change, new_status_change)

# 5. Modify handleDelete to use custom modal and check dependencies
old_delete = """  const handleDelete = async (id: string) => {
    if(!window.confirm('آیا از حذف این حکم مطمئن هستید؟')) return;
    try {
      await deleteEmployeeOrder(id);
      showNotification('حکم حذف شد', 'success');
      fetchData();
    } catch(e) {
      showNotification('خطا در حذف', 'error');
    }
  }"""

new_delete = """  const handleDeleteRequest = (order: any) => {
    // Check if contract has payslips and the order is active or was active
    // If it's just a draft, it's fine. 
    if (order.status !== 'draft') {
      const hasPayslips = payslips.some(p => p.contractId === order.contractId);
      if (hasPayslips) {
        showNotification('امکان حذف این حکم وجود ندارد زیرا فیش حقوقی صادر شده به آن وابسته است.', 'error');
        return;
      }
    }
    setDeletingOrder(order);
  };

  const confirmDelete = async () => {
    if (!deletingOrder) return;
    try {
      await deleteEmployeeOrder(deletingOrder.id);
      showNotification('حکم با موفقیت حذف شد', 'success');
      setDeletingOrder(null);
      fetchData();
    } catch(e) {
      showNotification('خطا در حذف', 'error');
    }
  };"""

content = content.replace(old_delete, new_delete)

# 6. Make row clickable and add stopPropagation
old_row = '<tr key={order.id} className="hover:bg-slate-50 transition-colors">'
new_row = '<tr key={order.id} onClick={() => setViewingOrder(order)} className="hover:bg-slate-50 transition-colors cursor-pointer">'
content = content.replace(old_row, new_row)

old_actions = """                            <button
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
                            </button>
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>"""

new_actions = """                            <button
                              onClick={(e) => { e.stopPropagation(); setViewingOrder(order); }}
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                              title="مشاهده"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(order); }}
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                              title="ویرایش"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteRequest(order); }}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>"""
content = content.replace(old_actions, new_actions)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Changes applied!")
