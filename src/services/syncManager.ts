import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';

export interface SyncRecord {
    id: number;
    store_id: string;
    action: 'SET' | 'DELETE';
    key: string;
    value?: string; // JSON string
    created_at: number;
}

class SyncManager {
    private db: DatabaseSync;

    constructor() {
        const dbPath = path.join(process.cwd(), 'sync_queue.sqlite');
        this.db = new DatabaseSync(dbPath);
        this.init();
    }

    private init() {
        // SQLite is strictly used as an offline queue/buffer here.
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                store_id TEXT NOT NULL,
                action TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                created_at INTEGER NOT NULL
            )
        `);
    }

    public enqueueSet(storeId: string, key: string, value: any) {
        const stmt = this.db.prepare('INSERT INTO sync_queue (store_id, action, key, value, created_at) VALUES (?, ?, ?, ?, ?)');
        stmt.run(storeId, 'SET', key, JSON.stringify(value), Date.now());
        console.log(`[SyncManager] Enqueued SET for key: ${key} in store: ${storeId}`);
    }

    public enqueueDelete(storeId: string, key: string) {
        const stmt = this.db.prepare('INSERT INTO sync_queue (store_id, action, key, created_at) VALUES (?, ?, ?, ?)');
        stmt.run(storeId, 'DELETE', key, Date.now());
        console.log(`[SyncManager] Enqueued DELETE for key: ${key} in store: ${storeId}`);
    }

    public getPendingRecords(): SyncRecord[] {
        const stmt = this.db.prepare('SELECT * FROM sync_queue ORDER BY created_at ASC');
        return stmt.all() as unknown as SyncRecord[];
    }

    public markAsSynced(id: number) {
        const stmt = this.db.prepare('DELETE FROM sync_queue WHERE id = ?');
        stmt.run(id);
        console.log(`[SyncManager] Removed synced record ID ${id} from SQLite buffer.`);
    }

    public async processQueue(getActivePgPool: (storeId: string) => Pool | undefined) {
        const records = this.getPendingRecords();
        if (records.length === 0) return;

        for (const record of records) {
            const pool = getActivePgPool(record.store_id);
            if (!pool) {
                console.log(`[SyncManager] Cannot sync record ${record.id}: PG Pool for store ${record.store_id} is unavailable.`);
                continue;
            }

            try {
                if (record.action === 'SET' && record.value) {
                    await pool.query(
                        'INSERT INTO store (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
                        [record.key, record.value]
                    );
                } else if (record.action === 'DELETE') {
                    await pool.query('DELETE FROM store WHERE key = $1', [record.key]);
                }
                
                // Successfully written to PG -> delete from SQLite buffer
                this.markAsSynced(record.id);
            } catch (err: any) {
                console.error(`[SyncManager] Error syncing record ${record.id} to PG:`, err.message);
                // Will retry on next tick
            }
        }
    }
}

export const syncManager = new SyncManager();
