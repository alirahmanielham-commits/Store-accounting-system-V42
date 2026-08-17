const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

const logCode = `
const appendDbLog = async (action, status, details) => {
  try {
    let logs = [];
    const data = await getDbData('databaseLogs');
    if (data && Array.isArray(data)) logs = data;
    logs.unshift({
      id: Date.now().toString(),
      date: new Intl.DateTimeFormat('fa-IR').format(new Date()) + ' ' + new Date().toLocaleTimeString('fa-IR'),
      action, status, details
    });
    if (logs.length > 200) logs = logs.slice(0, 200);
    await setDbData('databaseLogs', logs);
  } catch(e) {
    console.error('Failed to append db log', e);
  }
};

router.get('/api/db/logs', async (req, res) => {
  try {
    const data = await getDbData('databaseLogs');
    res.json(data || []);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/db/logs', async (req, res) => {
  try {
    const { action, status, details } = req.body;
    await appendDbLog(action, status, details);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
`;

if (!code.includes('appendDbLog')) {
  code = code.replace('const router = Router();', 'const router = Router();\n' + logCode);
}

// Update runBackupJob to log
code = code.replace(
  /await fsPromises\.writeFile\(path\.join\(dir, fileName\), JSON\.stringify\(backupData\)\);/,
  "await fsPromises.writeFile(path.join(dir, fileName), JSON.stringify(backupData));\n        await appendDbLog('بک‌آپ خودکار/دستی', 'success', `بک‌آپ با حجم \${Buffer.byteLength(JSON.stringify(backupData))} بایت ایجاد شد.`);"
);

// Update restore to log
code = code.replace(
  /res\.json\(\{ success: true \}\);\n     \} catch\(e\) \{/,
  "await appendDbLog('بازیابی اطلاعات', 'success', `نسخه \${filename} با موفقیت بازیابی شد.`);\n         res.json({ success: true });\n     } catch(e) {\n         await appendDbLog('بازیابی اطلاعات', 'error', `خطا: \${e.message}`);"
);

// Add upload endpoint
const uploadCode = `
router.post('/api/db/backups/upload', async (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'Missing filename or content' });
    const dir = getBackupsDir();
    await fsPromises.mkdir(dir, { recursive: true });
    const safeName = 'uploaded-' + Date.now() + '-' + path.basename(filename);
    const filePath = path.join(dir, safeName);
    
    // Convert base64 or raw text to file. If it's a JSON string, we just write it.
    await fsPromises.writeFile(filePath, content, 'utf-8');
    
    await appendDbLog('آپلود بک‌آپ', 'success', \`فایل \${filename} با موفقیت آپلود شد.\`);
    res.json({ success: true, file: safeName });
  } catch (err) {
    await appendDbLog('آپلود بک‌آپ', 'error', \`خطا در آپلود: \${err.message}\`);
    res.status(500).json({ error: err.message });
  }
});
`;

if (!code.includes('/api/db/backups/upload')) {
  code = code.replace('export default router;', uploadCode + '\nexport default router;');
}

fs.writeFileSync('src/routes/backup.routes.ts', code);
console.log('Patched backup.routes.ts for upload and logs.');
