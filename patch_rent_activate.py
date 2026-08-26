import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add CheckCircle to lucide-react imports if not there
if "CheckCircle" not in code:
    code = code.replace(
        "import { Plus, Edit2, Trash2, FileText, Check, X, AlertCircle } from 'lucide-react';",
        "import { Plus, Edit2, Trash2, FileText, Check, X, AlertCircle, CheckCircle } from 'lucide-react';"
    )
    
if "autoGenerateRentCommitments" not in code:
    code = code.replace(
        "import { getRentContracts, addRentContract, updateRentContract, deleteRentContract } from '../../services/hrService';",
        "import { getRentContracts, addRentContract, updateRentContract, deleteRentContract, autoGenerateRentCommitments } from '../../services/hrService';"
    )

# Add activationModal state
code = code.replace(
    "const [reportModal, setReportModal] = useState<any>(null);",
    "const [reportModal, setReportModal] = useState<any>(null);\n  const [activationModal, setActivationModal] = useState<any>(null);"
)

# Add activation button
actions_old = """                      <button onClick={() => {
                        setIssueDocModal(c);"""

actions_new = """                      {c.status === 'draft' && (
                        <button onClick={() => setActivationModal(c)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="تایید نهایی قرارداد">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => {
                        setIssueDocModal(c);"""

code = code.replace(actions_old, actions_new)

# Add handleActivate function
handle_activate_func = """  const handleActivate = async () => {
    if (!activationModal) return;
    try {
      await updateRentContract(activationModal.id, { ...activationModal, status: 'active' });
      await autoGenerateRentCommitments();
      showNotification('قرارداد با موفقیت تایید نهایی شد', 'success');
      setActivationModal(null);
      fetchData();
    } catch (e) {
      console.error(e);
      showNotification('خطا در تایید قرارداد', 'error');
    }
  };
"""
code = code.replace("  const handleSave = async () => {", handle_activate_func + "\n  const handleSave = async () => {")

# Add Activation Modal
activation_modal_html = """
      {activationModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 bg-emerald-600 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> تایید نهایی قرارداد اجاره
              </h3>
              <button onClick={() => setActivationModal(null)} className="p-2 bg-emerald-700/50 hover:bg-emerald-700 rounded-xl transition-colors text-white/90">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-sm text-slate-500">طرف حساب:</span>
                  <span className="font-bold text-slate-800">{getPersonName(activationModal.personId)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-sm text-slate-500">شماره قرارداد:</span>
                  <span className="font-bold text-slate-800 font-mono">{activationModal.contractNumber || '---'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-sm text-slate-500">مبلغ اجاره:</span>
                  <span className="font-bold text-emerald-600">{Number(activationModal.monthlyAmount).toLocaleString()} {storeSettings?.currency || 'ریال'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">روز تعهد پرداخت:</span>
                  <span className="font-bold text-indigo-600">روز {activationModal.paymentDay} هر ماه</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-100 text-justify">
                <strong>توجه:</strong> با تایید نهایی این قرارداد، سیستم به‌طور خودکار در سررسیدِ تعیین‌شده (روز {activationModal.paymentDay} هر ماه) یک سند حسابداری تعهدی صادر کرده و مبلغ اجاره را به حساب شخص بستانکار می‌کند. آیا از تایید نهایی اطمینان دارید؟
              </p>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setActivationModal(null)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleActivate} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> تایید و فعال‌سازی
              </button>
            </div>
          </div>
        </div>
      )}
"""
code = code.replace("      {issueDocModal && (", activation_modal_html + "\n      {issueDocModal && (")

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
