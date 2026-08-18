const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

const targetStr = `      </AnimatePresence>
    </div>
  );
}`;

const replacementStr = `      </AnimatePresence>

      <AnimatePresence>
        {isPathPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPathPickerOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
              style={{ maxHeight: '80vh' }}
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-indigo-600" />
                  انتخاب مسیر ذخیره‌سازی
                </h3>
                <button onClick={() => setIsPathPickerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 border-b border-slate-100">
                <div className="text-xs font-mono text-slate-600 bg-slate-100 p-2 rounded-lg break-all" dir="ltr">
                  {pickerPath}
                </div>
              </div>

              <div className="p-2 overflow-y-auto flex-1 bg-white" dir="ltr">
                {pickerParent && (
                  <button 
                    onClick={() => loadPickerPath(pickerParent)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-sm font-medium border border-transparent hover:border-slate-200"
                  >
                    <FolderOpen className="w-5 h-5 text-slate-400" />
                    ..
                  </button>
                )}
                
                {pickerFolders.map(folder => (
                  <button 
                    key={folder}
                    onClick={() => loadPickerPath(pickerPath + (pickerPath.endsWith('/') || pickerPath.endsWith('\\\\') ? '' : '/') + folder)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-sm font-medium border border-transparent hover:border-slate-200"
                  >
                    <FolderOpen className="w-5 h-5 text-indigo-400" />
                    {folder}
                  </button>
                ))}
                
                {pickerFolders.length === 0 && !pickerParent && (
                  <div className="p-4 text-center text-slate-400 text-sm">پوشه‌ای یافت نشد</div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                <button 
                  onClick={() => setIsPathPickerOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-sm transition-colors shadow-sm"
                >
                  انصراف
                </button>
                <button 
                  onClick={() => {
                     setStorageConfig({...storageConfig, localPath: pickerPath});
                     setIsPathPickerOpen(false);
                  }}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-200"
                >
                  انتخاب این پوشه
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
