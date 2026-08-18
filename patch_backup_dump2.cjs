const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/router\.get\('\/api\/db\/backup', async \(req, res\) => \{[\s\S]*?\} catch \(err\) \{/, `router.get('/api/db/backup', async (req, res) => {
    try {
      const rows = await getAllDbData();
      res.json({ count: rows.length, rows: rows });
    } catch (err) {`);

fs.writeFileSync('src/routes/backup.routes.ts', code);
