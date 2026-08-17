const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

const tableSizesRoute = `
router.get('/api/db/table-sizes', async (req, res) => {
  try {
    if (isPgActive() && getActivePgPool()) {
      const result = await getActivePgPool().query(\`
        SELECT 
          relname as name, 
          pg_total_relation_size(C.oid) as size,
          n_live_tup as recordCount
        FROM pg_class C
        LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace)
        LEFT JOIN pg_stat_user_tables S ON (S.relid = C.oid)
        WHERE nspname NOT IN ('pg_catalog', 'information_schema')
        AND C.relkind <> 'i'
        AND nspname !~ '^pg_toast'
        AND relname IN ('persons', 'invoices', 'invoice_items', 'transactions', 'accounts', 'products', 'cashboxes')
        ORDER BY pg_total_relation_size(C.oid) DESC;
      \`);
      let totalSizeRes = await getActivePgPool().query('SELECT pg_database_size(current_database()) as size');
      let totalSize = parseInt(totalSizeRes.rows[0].size, 10);
      
      const tables = result.rows.map(r => ({
        name: r.name,
        size: parseInt(r.size, 10),
        recordCount: parseInt(r.recordcount || '0', 10)
      }));
      
      res.json({ tables, totalSize });
    } else {
      res.json({ tables: [], totalSize: 0 });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
`;

if (!code.includes('/api/db/table-sizes')) {
  code = code.replace('export default router;', tableSizesRoute + '\nexport default router;');
  fs.writeFileSync('src/routes/backup.routes.ts', code);
  console.log('Table sizes route added.');
} else {
  console.log('Table sizes route already exists.');
}
