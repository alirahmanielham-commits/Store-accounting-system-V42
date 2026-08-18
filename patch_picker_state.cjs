const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

const targetStr = `  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<any>(null);

  // Manual Backup Action`;

const replacementStr = `  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<any>(null);

  const [isPathPickerOpen, setIsPathPickerOpen] = useState(false);
  const [pickerPath, setPickerPath] = useState('');
  const [pickerParent, setPickerParent] = useState<string|null>(null);
  const [pickerFolders, setPickerFolders] = useState<string[]>([]);
  
  const openPathPicker = async (initialPath: string) => {
    setIsPathPickerOpen(true);
    await loadPickerPath(initialPath || '/');
  };

  const loadPickerPath = async (targetPath: string) => {
    try {
      const res = await fetch('/api/db/explore-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath })
      });
      if (!res.ok) throw new Error('Cannot load folders');
      const data = await res.json();
      setPickerPath(data.current);
      setPickerParent(data.parent);
      setPickerFolders(data.folders || []);
    } catch (e) {
      showNotification('خطا در بارگیری لیست پوشه‌ها', 'error');
    }
  };

  // Manual Backup Action`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
