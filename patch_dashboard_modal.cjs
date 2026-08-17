const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

const restoreModalStart = /\{\/\* Restore Warning Modal \*\/\}/;
// Split code at the modal start
const parts = code.split(restoreModalStart);
if(parts.length === 2) {
  // We completely replace the modal code
  const newModal = `
      {/* Restore Warning Modal */}
      <AnimatePresence>
        {isRestoreModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200"
            >
              {restoreState === 'confirm' && (
                <>
                  <div className="bg-rose-50 p-6 text-center border-b border-rose-100">
                    <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                      <AlertCircle className="w-8 h-8 text-rose-600" />
                    </div>
                    <h3 className="text-xl font-black text-rose-700 mb-2">هشدار بسیار مهم</h3>
                    <p className="text-sm text-rose-600/80 font-bold">آیا از بازیابی این نسخه اطمینان دارید؟</p>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <p className="text-sm font-medium text-slate-600 leading-relaxed text-center">
                      عملیات بازیابی (Restore) غیرقابل بازگشت است. 
                      <br />تمامی اطلاعات فعلی سیستم با اطلاعات موجود در فایل بک‌آپ زیر جایگزین خواهد شد:
                    </p>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                      <div className="text-lg font-black text-slate-800" dir="ltr">{selectedBackupForRestore?.date} - {selectedBackupForRestore?.time}</div>
                      <div className="text-xs font-bold text-slate-500 mt-1">حجم: {selectedBackupForRestore?.size} | نوع: {selectedBackupForRestore?.type}</div>
                      {selectedBackupForRestore?.isUpload && (
                        <div className="mt-2 text-xs font-bold text-indigo-600 bg-indigo-50 py-1 rounded">فایل بارگذاری شده: {selectedBackupForRestore?.rawFile?.name}</div>
                      )}
                    </div>
                    <div className="pt-4 flex gap-3">
                      <button 
                        onClick={() => setIsRestoreModalOpen(false)}
                        className="flex-1 py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                      >
                        انصراف
                      </button>
                      <button 
                        onClick={executeRestore}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                      >
                        بله، بازیابی کن
                      </button>
                    </div>
                  </div>
                </>
              )}

              {restoreState === 'progress' && (
                <div className="p-10 text-center space-y-6">
                  <div className="relative w-24 h-24 mx-auto">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-[4px] border-slate-100 border-t-indigo-600"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-indigo-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">در حال بازیابی اطلاعات...</h3>
                    <p className="text-sm font-medium text-slate-500 mt-2">لطفاً تا پایان عملیات این پنجره را نبندید.</p>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: \`\${restoreProgress}%\` }}
                    />
                  </div>
                  <p className="text-xs font-bold text-indigo-600">{restoreProgress}% تکمیل شده</p>
                </div>
              )}

              {restoreState === 'success' && (
                <div className="p-10 text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    type="spring"
                    className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto border-8 border-emerald-50"
                  >
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-black text-emerald-700">بازیابی با موفقیت انجام شد!</h3>
                    <p className="text-sm font-medium text-slate-500 mt-2">سیستم اکنون با داده‌های جدید در دسترس است.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsRestoreModalOpen(false);
                      setRestoreState('confirm');
                      setSelectedBackupForRestore(null);
                      // Force a hard reload if necessary, or let react re-render based on new state.
                      window.location.reload();
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-200"
                  >
                    تازه‌سازی سیستم (بازنشانی)
                  </button>
                </div>
              )}

              {restoreState === 'error' && (
                <div className="p-10 text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    type="spring"
                    className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mx-auto border-8 border-rose-50"
                  >
                    <XCircle className="w-10 h-10 text-rose-600" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-black text-rose-700">خطا در عملیات بازیابی</h3>
                    <p className="text-sm font-medium text-slate-500 mt-2">متأسفانه بازیابی اطلاعات با مشکل مواجه شد. لاگ‌ها را بررسی کنید.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsRestoreModalOpen(false);
                      setRestoreState('confirm');
                    }}
                    className="w-full py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                  >
                    بستن پنجره
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
`;
  
  code = parts[0] + newModal;
  fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
  console.log('Restoration modal patched.');
}
