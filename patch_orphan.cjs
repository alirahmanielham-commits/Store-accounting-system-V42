const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(
`    if (isPgActive() && getActivePgPool()) {
      try {
        const result = await getActivePgPool().query(\`
          SELECT 
            (SELECT count(*) FROM transactions WHERE account_id IS NOT NULL AND account_id NOT IN (SELECT id FROM accounts)) +
            (SELECT count(*) FROM invoice_items WHERE invoice_id IS NOT NULL AND invoice_id NOT IN (SELECT id FROM invoices)) as orphaned_count
        \`);
        orphanedRecords = parseInt(result.rows[0].orphaned_count, 10);
      } catch(e) { console.error('Orphan check error', e); }
    }`,
`    if (isPgActive() && getActivePgPool()) {
      try {
        let tCount = 0;
        let iCount = 0;
        try {
           const tres = await getActivePgPool().query(\`SELECT count(*) FROM transactions WHERE account_id IS NOT NULL AND account_id NOT IN (SELECT id FROM accounts)\`);
           tCount = parseInt(tres.rows[0].count, 10);
        } catch(e) {}
        try {
           const ires = await getActivePgPool().query(\`SELECT count(*) FROM invoice_items WHERE invoice_id IS NOT NULL AND invoice_id NOT IN (SELECT id FROM invoices)\`);
           iCount = parseInt(ires.rows[0].count, 10);
        } catch(e) {}
        orphanedRecords = tCount + iCount;
      } catch(e) { console.error('Orphan check error', e); }
    }`);

fs.writeFileSync('src/routes/backup.routes.ts', code);
