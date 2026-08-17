const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

const handleDeleteMatch = code.match(/const handleDeleteBackup/);
if (!handleDeleteMatch) {
  const tabsIndex = code.indexOf('const tabs = [');
  const newFns = `
  const handleDeleteBackup = async (filename: string) => {
    if (!confirm('آیا از حذف این بک‌آپ اطمینان دارید؟')) return;
    try {
      const res = await fetch(\`/api/db/backups/\${filename}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showNotification('بک‌آپ با موفقیت حذف شد', 'success');
      loadBackups();
    } catch(e) {
      showNotification('خطا در حذف بک‌آپ', 'error');
    }
  };

  const handleDownloadBackup = (filename: string) => {
    window.open(\`/api/db/backups/download/\${filename}\`, '_blank');
  };
  
  `;
  code = code.slice(0, tabsIndex) + newFns + code.slice(tabsIndex);
  
  // replace download button
  code = code.replace(/<button title="دانلود" className="([^"]*?)">(\s*<Download className="w-4 h-4" \/>\s*)<\/button>/g, 
  '<button title="دانلود" className="$1" onClick={() => handleDownloadBackup(b.file)}>$2</button>');
  
  // replace delete button
  code = code.replace(/<button title="حذف" className="([^"]*?)">(\s*<Trash2 className="w-4 h-4" \/>\s*)<\/button>/g, 
  '<button title="حذف" className="$1" onClick={() => handleDeleteBackup(b.file)}>$2</button>');
  
  fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
  console.log('Patched buttons!');
} else {
  console.log('Already patched!');
}
