const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

const targetStr = `                              <button className="px-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm text-slate-600">
                                <FolderOpen className="w-5 h-5" />
                              </button>`;

const replacementStr = `                              <button type="button" onClick={() => openPathPicker(storageConfig.localPath)} className="px-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm text-slate-600">
                                <FolderOpen className="w-5 h-5" />
                              </button>`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
