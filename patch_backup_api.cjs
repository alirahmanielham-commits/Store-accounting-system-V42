const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/router\.get\('\/api\/db\/backup', async \(req, res\) => \{[\s\S]*?res\.send\(JSON\.stringify\(backupData, null, 2\)\);\n    \} catch \(err\) \{/g, `router.get('/api/db/backup', async (req, res) => {
    try {
      const rows = await getAllDbData();
      const backupData = {};
      for (const row of rows) {
        backupData[row.key] = row.value;
      }
      
      const fileName = \`backup-\${Date.now()}.json\`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', \`attachment; filename=\${fileName}\`);
      res.send(JSON.stringify(backupData, null, 2));
    } catch (err) {`);

fs.writeFileSync('src/routes/backup.routes.ts', code);
