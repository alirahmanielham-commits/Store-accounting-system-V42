const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

const importRegex = /import React, \{ useState, useEffect, useMemo \} from 'react';/;
if (code.match(importRegex)) {
  // It's already there
}

const dummyStateRegex = /\/\/ Dummy Initial Data[\s\S]*?(?=const \[backupType, setBackupType\])/;
const newState = `
  const [backups, setBackups] = useState<any[]>([]);
  const loadBackups = async () => {
    try {
      const res = await fetch('/api/db/backups');
      const data = await res.json();
      const formatted = data.map((b: any, index: number) => {
        const d = new Date(b.time);
        return {
          id: b.file,
          date: new Intl.DateTimeFormat('fa-IR').format(d),
          time: d.toLocaleTimeString('fa-IR'),
          size: (b.size / 1024 / 1024).toFixed(2) + ' MB',
          type: 'کامل (Full)',
          status: 'success',
          file: b.file
        };
      });
      setBackups(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/db/backup-config');
      const data = await res.json();
      if (data) {
        setScheduleConfig(prev => ({ ...prev, enabled: data.intervalHours > 0, retention: data.intervalHours }));
        if (data.path) {
          setStorageConfig(prev => ({ ...prev, localPath: data.path }));
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadBackups();
    loadConfig();
  }, []);

  `;
code = code.replace(dummyStateRegex, newState);

const immediateBackupRegex = /const handleImmediateBackup = \(\) => \{[\s\S]*?\};\n\n  const executeRestore/m;
const newImmediateBackup = `const handleImmediateBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(30);
    try {
      const res = await fetch('/api/db/backups/create', { method: 'POST' });
      if (!res.ok) throw new Error('Backup failed');
      setBackupProgress(100);
      showNotification('بک‌آپ با موفقیت تهیه شد', 'success');
      loadBackups();
      
      let typeLabel = 'کامل (Full)';
      if (backupType === 'incremental') typeLabel = 'افزایشی';
      if (backupType === 'structure') typeLabel = 'فقط ساختار';
      if (backupType === 'data') typeLabel = 'فقط داده';
      setLogs([{
        id: Date.now().toString(),
        date: new Intl.DateTimeFormat('fa-IR').format(new Date()) + ' ' + new Date().toLocaleTimeString('fa-IR'),
        action: \`بک‌آپ دستی (\${typeLabel})\`,
        status: 'success',
        details: 'عملیات با موفقیت انجام شد.'
      }, ...logs]);
    } catch(err) {
      showNotification('خطا در تهیه بک‌آپ', 'error');
      setLogs([{
        id: Date.now().toString(),
        date: new Intl.DateTimeFormat('fa-IR').format(new Date()) + ' ' + new Date().toLocaleTimeString('fa-IR'),
        action: 'بک‌آپ دستی',
        status: 'error',
        details: 'خطا در عملیات بک‌آپ'
      }, ...logs]);
    }
    setTimeout(() => {
      setIsBackingUp(false);
      setBackupProgress(0);
    }, 1000);
  };

  const executeRestore`;
code = code.replace(immediateBackupRegex, newImmediateBackup);

const executeRestoreRegex = /const executeRestore = \(\) => \{[\s\S]*?\};\n\n  const tabs/m;
const newExecuteRestore = `const executeRestore = async () => {
    setIsRestoreModalOpen(false);
    try {
      if (!selectedBackupForRestore || !selectedBackupForRestore.file) {
        showNotification('فایل بک‌آپ نامعتبر است.', 'error');
        return;
      }
      const res = await fetch(\`/api/db/backups/restore/\${selectedBackupForRestore.file}\`, { method: 'POST' });
      if (!res.ok) throw new Error('Restore failed');
      showNotification('بازیابی اطلاعات با موفقیت انجام شد.', 'success');
      setLogs([{
        id: Date.now().toString(),
        date: new Intl.DateTimeFormat('fa-IR').format(new Date()) + ' ' + new Date().toLocaleTimeString('fa-IR'),
        action: 'بازیابی اطلاعات',
        status: 'success',
        details: \`نسخه \${selectedBackupForRestore.date} بازیابی شد.\`
      }, ...logs]);
    } catch(e) {
      showNotification('خطا در بازیابی اطلاعات', 'error');
    }
    setSelectedBackupForRestore(null);
  };

  const tabs`;
code = code.replace(executeRestoreRegex, newExecuteRestore);

const saveScheduleRegex = /<button[\s\S]*?onClick=\{saveScheduleSettings\}[\s\S]*?<\/button>/m;
const saveScheduleFnRegex = /const saveScheduleSettings = \(\) => \{[\s\S]*?\};/m;

if (!code.match(saveScheduleFnRegex)) {
  // Let's add save functions if they don't exist
  const tabsIndex = code.indexOf('const tabs = [');
  const newFns = `
  const saveScheduleSettings = async () => {
    try {
      await fetch('/api/db/backup-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalHours: scheduleConfig.enabled ? scheduleConfig.retention : 0 })
      });
      showNotification('تنظیمات زمان‌بندی ذخیره شد', 'success');
    } catch (e) {
      showNotification('خطا در ذخیره تنظیمات', 'error');
    }
  };

  const saveStorageSettings = async () => {
    try {
      await fetch('/api/db/backup-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: storageConfig.localPath })
      });
      showNotification('مسیر ذخیره‌سازی ذخیره شد', 'success');
    } catch (e) {
      showNotification('خطا در ذخیره مسیر', 'error');
    }
  };
  
  `;
  code = code.slice(0, tabsIndex) + newFns + code.slice(tabsIndex);
  
  // Also we need to replace the console.log hooks or whatever it had for buttons.
  code = code.replace(/<button([^>]*?)>(\s*<Save className="w-4 h-4" \/>\s*ذخیره تنظیمات زمان‌بندی\s*)<\/button>/, '<button$1 onClick={saveScheduleSettings}>$2</button>');
  code = code.replace(/<button([^>]*?)>(\s*<Save className="w-4 h-4" \/>\s*ذخیره تنظیمات مسیر\s*)<\/button>/, '<button$1 onClick={saveStorageSettings}>$2</button>');
}

fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
console.log('Patched DatabaseDashboard.tsx successfully!');
