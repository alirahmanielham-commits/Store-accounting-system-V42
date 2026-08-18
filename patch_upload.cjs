const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

const targetStr = `  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };`;

const replacementStr = `  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    showNotification('در حال آپلود فایل، لطفاً صبر کنید...', 'info');
    try {
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      const res = await fetch('/api/db/backups/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content })
      });
      if (!res.ok) throw new Error('Upload failed');
      showNotification('فایل بک‌آپ با موفقیت اضافه شد. اکنون می‌توانید آن را بازیابی کنید.', 'success');
      loadBackups();
    } catch (err) {
      showNotification('خطا در آپلود فایل', 'error');
    } finally {
      e.target.value = '';
    }
  };`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
