const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

const targetStr = `                     {/* Cloud Storage Card */}
                     <div 
                        onClick={() => setStorageConfig({...storageConfig, type: 'cloud'})}
                        className={\`p-6 rounded-2xl border-2 cursor-pointer transition-all \${
                          storageConfig.type === 'cloud' ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }\`}
                     >`;

const replacementStr = `                     {/* Cloud Storage Card (Disabled) */}
                     <div 
                        className="p-6 rounded-2xl border-2 border-slate-200 bg-slate-50 opacity-60 pointer-events-none relative"
                     >
                        <div className="absolute top-4 left-4 bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full">
                           فاز بعدی
                        </div>`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
