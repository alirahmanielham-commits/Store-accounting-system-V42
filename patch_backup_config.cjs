const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/router\.get\('\/api\/db\/backup-config', \(req, res\) => \{\n    res\.json\(backupConfig\);\n\}\);/, `router.get('/api/db/backup-config', async (req, res) => {
    try {
        const data = await getDbData('backupConfig');
        res.json(data || backupConfig);
    } catch(e) {
        res.json(backupConfig);
    }
});`);

code = code.replace(/const getBackupsDir = \(\) => \{/g, `const getBackupsDir = async () => {
     let pathConf = backupConfig.path;
     try {
        const data = await getDbData('backupConfig');
        if (data && data.path) pathConf = data.path;
     } catch(e) {}
     return pathConf && pathConf.trim() !== '' 
         ? pathConf 
         : path.join(process.cwd(), 'backups');
  };`);

code = code.replace(/const dir = getBackupsDir\(\);/g, 'const dir = await getBackupsDir();');

fs.writeFileSync('src/routes/backup.routes.ts', code);
