import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_import = "import { getSalaryComponents, getContractComponents,  getEmployeeContracts, addEmployeeContract, updateEmployeeContract, deleteEmployeeContract,     deleteContractComponent, getEmployeeProfiles, getWorkplaces } from '../../services/hrService';"
new_import = "import { getSalaryComponents, getContractComponents,  getEmployeeContracts, addEmployeeContract, updateEmployeeContract, deleteEmployeeContract,     deleteContractComponent, getEmployeeProfiles, getWorkplaces, getEmployeeOrders, getPayslips } from '../../services/hrService';"
content = content.replace(old_import, new_import)

# 2. Add states
new_states = """  const [deleteContractId, setDeleteContractId] = useState(null);
  const [deleteError, setDeleteError] = useState('');"""
content = content.replace("const [terminateDate, setTerminateDate] = useState(new Date());", "const [terminateDate, setTerminateDate] = useState(new Date());\n" + new_states)

# 3. Replace old handleDeleteContract with new confirm logic
old_handle_delete = """  const handleDeleteContract = async (id) => {
    if(!window.confirm('آیا از حذف این قرارداد مطمئن هستید؟')) return;
    try {
      await deleteEmployeeContract(id);
      const allComps = await getContractComponents();
      for (const c of allComps.filter(c => c.contractId === id)) {
        await deleteContractComponent(c.id);
      }
      showNotification('قرارداد با موفقیت حذف شد', 'success');
      fetchData();
    } catch(e) {
      showNotification('خطا در حذف', 'error');
    }
  };"""

new_handle_delete = """  const handleConfirmDelete = async () => {
    try {
      const orders = await getEmployeeOrders();
      const payslips = await getPayslips();
      
      const hasOrders = orders.some(o => o.contractId === deleteContractId);
      const hasPayslips = payslips.some(p => p.contractId === deleteContractId);
      
      if (hasOrders || hasPayslips) {
        setDeleteError('امکان حذف وجود ندارد. برای این قرارداد حکم یا فیش حقوقی ثبت شده است.');
        return;
      }
      
      await deleteEmployeeContract(deleteContractId);
      const allComps = await getContractComponents();
      for (const c of allComps.filter(c => c.contractId === deleteContractId)) {
        await deleteContractComponent(c.id);
      }
      showNotification('قرارداد با موفقیت حذف شد', 'success');
      setDeleteContractId(null);
      setDeleteError('');
      fetchData();
    } catch(e) {
      showNotification('خطا در حذف', 'error');
    }
  };"""
content = content.replace(old_handle_delete, new_handle_delete)

# 4. Update the delete button click handler
# <button onClick={() => handleDeleteContract(c.id)}
content = content.replace("onClick={() => handleDeleteContract(c.id)}", "onClick={() => { setDeleteContractId(c.id); setDeleteError(''); }}")

# 5. Add delete modal
delete_modal = """
      {deleteContractId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center"><AlertCircle className="w-5 h-5"/></div>
                <h3 className="font-bold text-slate-800 text-lg">حذف قرارداد</h3>
              </div>
              <button onClick={() => { setDeleteContractId(null); setDeleteError(''); }} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 bg-slate-50/50 space-y-4 text-center">
              <p className="text-sm text-slate-600 mb-2">آیا از حذف این قرارداد مطمئن هستید؟ این عملیات غیرقابل بازگشت است.</p>
              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl font-bold">
                  {deleteError}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button onClick={()=>{ setDeleteContractId(null); setDeleteError(''); }} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleConfirmDelete} className="px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold shadow-sm hover:bg-rose-700 transition-all">
                حذف قرارداد
              </button>
            </div>
          </div>
        </div>
      )}
"""
content = content.replace("{/* Modals */}", "{/* Modals */}\n" + delete_modal)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Delete modal added")
