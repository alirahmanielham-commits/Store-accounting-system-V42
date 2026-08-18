const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

const targetStr = `                    <button \n                      onClick={() => showNotification('تنظیمات ذخیره‌سازی با موفقیت اعمال شد.', 'success')}\n                      className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-slate-200"\n                    >\n                      <Save className="w-4 h-4" /> اعمال تنظیمات مسیر\n                    </button>`;
const replacementStr = `                    <button \n                      onClick={saveStorageSettings}\n                      className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-slate-200"\n                    >\n                      <Save className="w-4 h-4" /> اعمال تنظیمات مسیر\n                    </button>`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
