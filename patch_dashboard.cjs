const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

code = code.replace(
`                                <button title="دانلود فایل" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100">
                                  <Download className="w-4 h-4" />
                                </button>`,
`                                <button onClick={() => window.open(\`/api/db/backups/download/\${b.file}\`, '_blank')} title="دانلود فایل" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100">
                                  <Download className="w-4 h-4" />
                                </button>`);

fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
