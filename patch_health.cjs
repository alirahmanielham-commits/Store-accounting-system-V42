const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

const healthRoute = `
router.get('/api/db/health', async (req, res) => {
  try {
    let permissionsOk = true;
    let permissionsError = '';
    const dir = getBackupsDir();
    try {
      await fsPromises.access(dir, fsPromises.constants.W_OK | fsPromises.constants.R_OK);
    } catch(e) { 
      permissionsOk = false;
      permissionsError = e.message;
    }

    let connectionOk = true;
    let connectionError = '';
    if (isPgActive() && getActivePgPool()) {
      try { await getActivePgPool().query('SELECT 1'); } catch(e) { connectionOk = false; connectionError = e.message; }
    } else {
      try { getDb().prepare('SELECT 1').get(); } catch(e) { connectionOk = false; connectionError = e.message; }
    }

    let orphanedRecords = 0;
    if (isPgActive() && getActivePgPool()) {
      try {
        const result = await getActivePgPool().query(\`
          SELECT 
            (SELECT count(*) FROM transactions WHERE account_id IS NOT NULL AND account_id NOT IN (SELECT id FROM accounts)) +
            (SELECT count(*) FROM invoice_items WHERE invoice_id IS NOT NULL AND invoice_id NOT IN (SELECT id FROM invoices)) as orphaned_count
        \`);
        orphanedRecords = parseInt(result.rows[0].orphaned_count, 10);
      } catch(e) { console.error('Orphan check error', e); }
    }

    res.json({
      permissionsOk,
      permissionsError,
      connectionOk,
      connectionError,
      orphanedRecords
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
`;

if (!code.includes('/api/db/health')) {
  code = code.replace('export default router;', healthRoute + '\nexport default router;');
  fs.writeFileSync('src/routes/backup.routes.ts', code);
  console.log('Health route added.');
} else {
  console.log('Health route already exists.');
}
