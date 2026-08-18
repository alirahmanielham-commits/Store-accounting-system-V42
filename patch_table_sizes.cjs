const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

const replacement = `router.get('/api/db/table-sizes', async (req, res) => {
  try {
    if (isPgActive() && getActivePgPool()) {
      const tableList = KNOWN_TABLES.map(t => \`'\${t}'\`).join(', ');
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
        AND relname IN (\${tableList})
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
  } catch(e) {`;

code = code.replace(/router\.get\('\/api\/db\/table-sizes', async \(req, res\) => \{[\s\S]*?\} catch\(e\) \{/, replacement);

fs.writeFileSync('src/routes/backup.routes.ts', code);
