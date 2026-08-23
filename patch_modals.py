import re

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

modals_html = """
      {/* Delete Confirmation Modal */}
      {deletingOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">حذف حکم کارگزینی</h3>
              <p className="text-slate-500 font-medium mb-6">
                آیا از حذف این حکم مطمئن هستید؟ این عملیات غیرقابل بازگشت است.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingOrder(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors"
                >
                  حذف حکم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {statusConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">تغییر وضعیت حکم</h3>
              <p className="text-slate-500 font-medium mb-6">
                {statusConfirm.newStatus === 'active' 
                  ? 'با تایید نهایی و فعال کردن این حکم، سایر احکام فعالِ این قرارداد غیرفعال (بایگانی) خواهند شد. آیا مطمئن هستید؟' 
                  : 'آیا از تغییر وضعیت این حکم مطمئن هستید؟'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStatusConfirm(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={confirmStatusChange}
                  className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
                >
                  تایید و ادامه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace("{/* Modal */}", modals_html)

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Modals added!")
