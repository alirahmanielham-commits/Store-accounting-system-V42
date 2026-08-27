import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

func_target = """  const handleRevert = async (id) => {"""
func_replacement = """  const handleDeleteSlip = async (id) => {
    if (!window.confirm('آیا از حذف این فیش حقوقی اطمینان دارید؟')) return;
    setLoading(true);
    try {
       await deletePayslipItemsByPayslipId(id);
       await deletePayslip(id);
       if (selectedSlipId === id) setSelectedSlipId(null);
       showNotification('فیش حقوقی حذف شد', 'success');
       fetchPayslips();
    } catch(e) {
       console.error(e);
       showNotification('خطا در حذف فیش', 'error');
    } finally {
       setLoading(false);
    }
  };

  const handleRecalculateSingle = async (slipId) => {
     // A simple way is to just call handleGenerate which recalculates all draft slips for this month
     await handleGenerate();
  };

  const handleRevert = async (id) => {"""

code = code.replace(func_target, func_replacement)

ui_target = """                    {selectedSlip.status === 'draft' ? (
                      <button onClick={() => handleFinalize(selectedSlip.id)} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-2 shadow-sm">
                        <CheckCircle className="w-5 h-5" /> قطعی کردن فیش
                      </button>
                    ) : ("""

ui_replacement = """                    {selectedSlip.status === 'draft' ? (
                      <>
                        <button onClick={() => handleFinalize(selectedSlip.id)} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-2 shadow-sm">
                          <CheckCircle className="w-5 h-5" /> قطعی کردن
                        </button>
                        <button onClick={() => handleRecalculateSingle(selectedSlip.id)} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200 flex items-center gap-2 shadow-sm">
                          <Calculator className="w-5 h-5" /> محاسبه مجدد
                        </button>
                        <button onClick={() => handleDeleteSlip(selectedSlip.id)} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-rose-50 text-rose-700 font-bold rounded-xl hover:bg-rose-100 transition-colors border border-rose-200 flex items-center gap-2 shadow-sm">
                          <Trash2 className="w-5 h-5" /> حذف فیش
                        </button>
                      </>
                    ) : ("""

code = code.replace(ui_target, ui_replacement)

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
