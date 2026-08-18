const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(
`export default router;`,
`router.post('/api/db/explore-folders', async (req, res) => {
  try {
    let targetPath = req.body.path || process.cwd();
    targetPath = path.resolve(targetPath);
    try {
      await fsPromises.access(targetPath, fsPromises.constants.R_OK);
    } catch(e) {
      targetPath = process.cwd();
    }
    const items = await fsPromises.readdir(targetPath, { withFileTypes: true });
    const folders = items.filter(i => i.isDirectory()).map(i => i.name).sort();
    const parent = path.dirname(targetPath);
    res.json({ current: targetPath, parent: parent !== targetPath ? parent : null, folders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;`);

fs.writeFileSync('src/routes/backup.routes.ts', code);
