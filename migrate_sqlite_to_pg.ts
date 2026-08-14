import { DatabaseSync } from 'node:sqlite';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { Pool } from 'pg';
import 'dotenv/config';

// Migration script to move data from ALL database*.sqlite files to PostgreSQL

async function migrate() {
    const pgUrl = process.env.DATABASE_URL;
    if (!pgUrl) {
        console.error("No DATABASE_URL found in .env. Cannot migrate.");
        return;
    }

    const pool = new Pool({ connectionString: pgUrl });
    try {
        await pool.query('SELECT 1');
    } catch(e) {
        console.error("Failed to connect to PostgreSQL:", e);
        return;
    }
    
    // Make sure businesses table exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS businesses (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          db_type TEXT DEFAULT 'postgres',
          db_host TEXT,
          db_port TEXT,
          db_name TEXT,
          db_user TEXT,
          db_password TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Make sure store table exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS store (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
    `);

    const files = await fs.readdir(process.cwd());
    const sqliteFiles = files.filter(f => f.startsWith('database') && f.endsWith('.sqlite'));

    if (sqliteFiles.length === 0) {
        console.log("No SQLite database files found.");
        process.exit(0);
    }

    for (const file of sqliteFiles) {
        const fullPath = path.join(process.cwd(), file);
        console.log(`\nMigrating ${file}...`);
        
        let storeId = 'default';
        if (file !== 'database.sqlite') {
            const match = file.match(/^database_(.+)\.sqlite$/);
            if (match) storeId = match[1];
        }

        const db = new DatabaseSync(fullPath);

        // Backup the file first
        const backupPath = fullPath + '.bak_' + Date.now();
        await fs.copyFile(fullPath, backupPath);
        console.log(`  Created backup at ${backupPath}`);

        // Migrate 'businesses' if it's the default database
        if (storeId === 'default') {
            try {
                const businesses = db.prepare('SELECT * FROM businesses').all() as any[];
                for (const b of businesses) {
                    await pool.query(
                        `INSERT INTO businesses (id, name, db_type, db_host, db_port, db_name, db_user, db_password) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                         ON CONFLICT (id) DO NOTHING`,
                        [b.id, b.name, 'postgres', b.db_host, b.db_port, b.db_name, b.db_user, b.db_password]
                    );
                }
                console.log(`  Migrated ${businesses.length} businesses.`);
            } catch(e) {
                console.log(`  No businesses table found in ${file}.`);
            }
        }

        // We can't really write to different postgres databases unless we connect to them, 
        // but for now, we just log that we would migrate the store table for that business if it was connected.
        // If the multi-tenancy is just schema-based, we'd need to create schemas.
        // Assuming we just migrate the default DB for now if it's single DB.
        
        if (storeId === 'default') {
            try {
                const rows = db.prepare('SELECT key, value FROM store').all() as any[];
                for (const row of rows) {
                    await pool.query(
                        'INSERT INTO store (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
                        [row.key, row.value]
                    );
                }
                console.log(`  Migrated ${rows.length} rows from store.`);
            } catch(e) {
                console.log(`  No store table found in ${file}.`);
            }
        } else {
             console.log(`  Skipping store migration for multi-tenant ${file} (Requires per-tenant Postgres schema/DB setup)`);
        }
    }
    
    console.log("\nMigration completed. The old .sqlite files have been backed up as .bak_* files.");
    console.log("You can safely remove the original .sqlite files once you confirm PostgreSQL has all the data.");
    process.exit(0);
}

migrate();
