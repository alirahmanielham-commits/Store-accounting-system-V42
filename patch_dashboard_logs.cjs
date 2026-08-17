const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

// 1. Fetch real logs
const logsRegex = /const \[logs, setLogs\] = useState\(\[[\s\S]*?\]\);/;
const loadLogsFn = `
  const [logs, setLogs] = useState<any[]>([]);
  const loadLogs = async () => {
    try {
      const res = await fetch('/api/db/logs');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch(e) {}
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab]);
`;

code = code.replace(logsRegex, loadLogsFn);

// 2. Add File Input Reference & State
const fileInputState = `
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [restoreState, setRestoreState] = useState<'confirm' | 'progress' | 'success' | 'error'>('confirm');
  const [restoreProgress, setRestoreProgress] = useState(0);
`;
code = code.replace(/const \[isRestoreModalOpen, setIsRestoreModalOpen\] = useState\(false\);/, "const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);\n" + fileInputState);

// 3. Update executeRestore function
const executeRestoreRegex = /const executeRestore = async \(\) => \{[\s\S]*?setSelectedBackupForRestore\(null\);\n  \};/m;
const newExecuteRestore = `
  const executeRestore = async () => {
    setRestoreState('progress');
    setRestoreProgress(0);
    
    // Simulate some nice progress phases before actual request
    const phases = [10, 35, 60, 85];
    for(const phase of phases) {
      await new Promise(r => setTimeout(r, 400));
      setRestoreProgress(phase);
    }
    
    try {
      if (!selectedBackupForRestore || !selectedBackupForRestore.file) {
        throw new Error('فایل بک‌آپ نامعتبر است.');
      }
      
      let filename = selectedBackupForRestore.file;
      
      // If it's a direct upload (no existing file on server yet)
      if (selectedBackupForRestore.isUpload) {
         setRestoreProgress(90);
         const res = await fetch('/api/db/backups/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: selectedBackupForRestore.rawFile.name, content: selectedBackupForRestore.content })
         });
         if (!res.ok) throw new Error('آپلود ناموفق بود.');
         const data = await res.json();
         filename = data.file;
      }
      
      setRestoreProgress(95);
      const res = await fetch(\`/api/db/backups/restore/\${filename}\`, { method: 'POST' });
      if (!res.ok) throw new Error('بازیابی ناموفق بود.');
      
      setRestoreProgress(100);
      setRestoreState('success');
      loadBackups(); // reload list
    } catch(e) {
      setRestoreState('error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
       const content = ev.target?.result as string;
       setSelectedBackupForRestore({
          isUpload: true,
          rawFile: file,
          content,
          date: new Intl.DateTimeFormat('fa-IR').format(new Date()),
          time: new Date().toLocaleTimeString('fa-IR'),
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          type: 'فایل آپلود شده'
       });
       setRestoreState('confirm');
       setIsRestoreModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };
`;
code = code.replace(executeRestoreRegex, newExecuteRestore);

// 4. Update the restore Upload button UI
const uploadButtonRegex = /<button className="px-5 py-2\.5 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm">[\s\S]*?<\/button>/m;
const newUploadBtn = `
  <div>
    <input type="file" ref={fileInputRef} className="hidden" accept=".json,.sql" onChange={handleFileUpload} />
    <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm">
      <Upload className="w-4 h-4" /> آپلود فایل بک‌آپ خارجی
    </button>
  </div>
`;
code = code.replace(uploadButtonRegex, newUploadBtn);

fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
console.log('Logs and file upload patched.');
