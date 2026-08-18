const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/router\.get\('\/api\/db\/backups\/download\/:filename', async \(req, res\) => \{[\s\S]*?\} catch\(e\) \{/, `router.get('/api/db/backups/download/:filename', async (req, res) => {
     try {
         const { filename } = req.params;
         const storeId = storeContext.getStore() || 'default';
         if (!filename.startsWith(\`backup-\${storeId}-\`) && !filename.startsWith('uploaded-')) {
            return res.status(403).send('Access denied to this file.');
         }
         const dir = await getBackupsDir();
         const filePath = path.join(dir, filename);
         if (!filePath.startsWith(dir)) return res.status(403).send('Invalid path');
         res.download(filePath);
     } catch(e) {`);

code = code.replace(/router\.delete\('\/api\/db\/backups\/:filename', async \(req, res\) => \{[\s\S]*?\} catch\(e\) \{/, `router.delete('/api/db/backups/:filename', async (req, res) => {
      try {
         const { filename } = req.params;
         const storeId = storeContext.getStore() || 'default';
         if (!filename.startsWith(\`backup-\${storeId}-\`) && !filename.startsWith('uploaded-')) {
            return res.status(403).send('Access denied to this file.');
         }
         const dir = await getBackupsDir();
         const filePath = path.join(dir, filename);
         if (!filePath.startsWith(dir)) return res.status(403).send('Invalid path');
         await fsPromises.unlink(filePath);
         res.json({ success: true });
      } catch(e) {`);

code = code.replace(/router\.post\('\/api\/db\/backups\/restore\/:filename', async \(req, res\) => \{[\s\S]*?\} catch\(e\) \{/, `router.post('/api/db/backups/restore/:filename', async (req, res) => {
     try {
         const { filename } = req.params;
         const storeId = storeContext.getStore() || 'default';
         if (!filename.startsWith(\`backup-\${storeId}-\`) && !filename.startsWith('uploaded-')) {
            return res.status(403).send('Access denied to this file.');
         }
         const dir = await getBackupsDir();
         const filePath = path.join(dir, filename);
         if (!filePath.startsWith(dir)) return res.status(403).send('Invalid path');
         
         if (filename.endsWith('.sql')) {
             return res.status(400).json({ error: 'Direct SQL execution is disabled for security reasons.' });
         } else {
             const fileContent = await fsPromises.readFile(filePath, 'utf-8');
             const backupData = JSON.parse(fileContent);
             
             if (isPgActive() && getActivePgPool()) {
               const client = await getActivePgPool().connect();
               try {
                 await client.query('BEGIN');
                 for (const key of KNOWN_TABLES) {
                   try {
                     await client.query(\`TRUNCATE TABLE "\${key}" CASCADE\`);
                   } catch (e) {}
                 }
                 for (const [key, value] of Object.entries(backupData)) {
                     if (KNOWN_TABLES.includes(key)) {
                        await setDbData(key, value);
                     }
                 }
                 await client.query('COMMIT');
               } catch (e) {
                 await client.query('ROLLBACK');
                 throw e;
               } finally {
                 client.release();
               }
             } else {
               try { getDb().prepare('DELETE FROM store').run(); } catch(e) { }
               for (const [key, value] of Object.entries(backupData)) {
                   if (KNOWN_TABLES.includes(key)) {
                      await setDbData(key, value);
                   }
               }
             }
         }
         await appendDbLog('بازیابی اطلاعات', 'success', \`نسخه \${filename} با موفقیت بازیابی شد.\`);
         res.json({ success: true });
     } catch(e) {`);

fs.writeFileSync('src/routes/backup.routes.ts', code);
