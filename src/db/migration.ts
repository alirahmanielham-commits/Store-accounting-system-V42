import path from 'path';
import fsPromises from 'fs/promises';
import { getDb, loadPgPoolForStore, isPgActive, getActivePgPool, storeContext, DB_CONFIG_FILE, DATA_FILE } from './connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from './schema-sync';
import { handleRelations } from './kv-store';

export async function migrateSqliteToPostgres() {
  if (!isPgActive() || !getActivePgPool()) return;
    try {
      const res = await getActivePgPool().query(`SELECT COUNT(*) as count FROM "users"`);
      const hasSqliteData = getDb().prepare('SELECT count(*) as count FROM store').get() as any;
      if (parseInt(res.rows[0].count) === 0 && hasSqliteData && hasSqliteData.count > 0) {
        // Only migrate if Postgres has no users AND SQLite has data. To prevent accidental data wipe, we don't drop tables.
        console.log('Migrating from SQLite to Postgres...');
        
        try {
            const storeId = storeContext.getStore() || 'default';
            if (storeId === 'default') {
                const businesses = getDb().prepare('SELECT * FROM businesses').all();
                if (businesses.length > 0) {
                    await getActivePgPool().query(`
                      CREATE TABLE IF NOT EXISTS businesses (
                        id VARCHAR PRIMARY KEY,
                        name VARCHAR NOT NULL,
                        db_type VARCHAR DEFAULT 'sqlite',
                        db_host VARCHAR,
                        db_port VARCHAR,
                        db_name VARCHAR,
                        db_user VARCHAR,
                        db_password VARCHAR
                      )
                    `);
                    for (const b of businesses) {
                        await getActivePgPool().query(`
                          INSERT INTO businesses (id, name, db_type, db_host, db_port, db_name, db_user, db_password)
                          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT(id) DO NOTHING
                        `, [b.id, b.name, b.db_type, b.db_host, b.db_port, b.db_name, b.db_user, b.db_password]);
                    }
                }
            }
        } catch(e) { }
        
        tableSchemas.clear();
        const sqliteRows = getDb().prepare('SELECT key, value FROM store').all();
        for (const row of sqliteRows) {
          const key = row.key;
          if (KNOWN_TABLES.includes(key)) {
            const data = JSON.parse(row.value);
            if (key === 'company_profile' || key === 'backupConfig' || !Array.isArray(data)) {
               if (data && typeof data === 'object') {
                  data.id = 'singleton';
                  await syncTableSchema(getActivePgPool(), key, data);
                  const keys = Object.keys(data);
                  const vals = Object.values(data).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
                  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                  const colNames = keys.map(k => `"${k}"`).join(', ');
                  await getActivePgPool().query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO NOTHING`, vals);
               }
            } else {
               for (const item of data) {
                  if (!item.id) item.id = Math.random().toString(36).substring(2, 15);
                  
                  let finalItem = { ...item };
                  let related = null;
                  if (['invoices', 'sales_invoices', 'purchase_invoices', 'warehouse_receipts', 'warehouse_remittances', 'proforma_invoices', 'sale_returns', 'purchase_returns', 'wastes', 'accounting_documents', 'stocktakings'].includes(key)) {
                     const rel = await handleRelations(key, finalItem);
                     finalItem = rel.strippedData;
                     related = rel;
                  }

                  await syncTableSchema(getActivePgPool(), key, finalItem);
                  const keys = Object.keys(finalItem);
                  const vals = Object.values(finalItem).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
                  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                  const colNames = keys.map(k => `"${k}"`).join(', ');
                  await getActivePgPool().query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO NOTHING`, vals);

                  if (related && related.childTable) {
                      for (const it of related.items) {
                          await syncTableSchema(getActivePgPool(), related.childTable, it);
                          const itKeys = Object.keys(it);
                          const itVals = Object.values(it).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
                          const itPlaceholders = itKeys.map((_, idx) => `$${idx + 1}`).join(', ');
                          const itColNames = itKeys.map(k => `"${k}"`).join(', ');
                          await getActivePgPool().query(`INSERT INTO "${related.childTable}" (${itColNames}) VALUES (${itPlaceholders}) ON CONFLICT(id) DO NOTHING`, itVals);
                      }
                  }
               }
            }
          }
        }
        console.log('Migration to Postgres complete');
      }
    } catch(e) { console.error('Migration error', e); }
}
export async function initDB() {
  await loadPgPoolForStore('default');



  getDb().exec(`
    CREATE TABLE IF NOT EXISTS store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  try {
    const raw = await fsPromises.readFile(DATA_FILE, 'utf-8');
    const legacyDB = JSON.parse(raw);
    const getStmt = getDb().prepare('SELECT key FROM store WHERE key = ?');
    const insertStmt = getDb().prepare('INSERT INTO store (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(legacyDB)) {
      if (!getStmt.get(key)) {
        insertStmt.run(key, JSON.stringify(value));
      }
    }
    await fsPromises.rename(DATA_FILE, DATA_FILE + '.bak');
    console.log('Migrated JSON DB to SQLite');
  } catch (e) {}

  if (isPgActive() && getActivePgPool()) {
    await ensurePostgresTables();
    await migrateSqliteToPostgres();
  } else {
    try {
      const configExists = await fsPromises.access(DB_CONFIG_FILE).then(() => true).catch(() => false);
      if (!configExists) {
        const getStmt = getDb().prepare('SELECT value FROM store WHERE key = ?');
        const usersRow = getStmt.get('users') as any;
        const profileRow = getStmt.get('company_profile') as any;
        if (usersRow && profileRow) {
           const users = JSON.parse(usersRow.value);
           const profile = JSON.parse(profileRow.value);
           if (Array.isArray(users) && users.length > 0 && profile && profile.companyName) {
              console.log('Auto-detected existing SQLite configuration. Writing db_config.json...');
              const config = { engine: 'sqlite' };
              await fsPromises.writeFile(DB_CONFIG_FILE, JSON.stringify(config));
           }
        }
      }
    } catch (e) {
      console.error('Error auto-detecting existing SQLite configuration:', e);
    }
  }
}
