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
    private queue: SyncRecord[] = [];
    private nextId = 1;

    constructor() {
    }

    public enqueueSet(storeId: string, key: string, value: any) {
        this.queue.push({
            id: this.nextId++,
            store_id: storeId,
            action: 'SET',
            key,
            value: JSON.stringify(value),
            created_at: Date.now()
        });
        console.log(`[SyncManager] Enqueued SET for key: ${key} in store: ${storeId}`);
    }

    public enqueueDelete(storeId: string, key: string) {
        this.queue.push({
            id: this.nextId++,
            store_id: storeId,
            action: 'DELETE',
            key,
            created_at: Date.now()
        });
        console.log(`[SyncManager] Enqueued DELETE for key: ${key} in store: ${storeId}`);
    }

    public getPendingRecords(): SyncRecord[] {
        return [...this.queue].sort((a, b) => a.created_at - b.created_at);
    }

    public markAsSynced(id: number) {
        this.queue = this.queue.filter(r => r.id !== id);
        console.log(`[SyncManager] Removed synced record ID ${id} from in-memory buffer.`);
    }

    public async processQueue(getActivePgPool: (storeId: string) => Pool | undefined | null) {
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
                
                // Successfully written to PG -> delete from buffer
                this.markAsSynced(record.id);
            } catch (err: any) {
                console.error(`[SyncManager] Error syncing record ${record.id} to PG:`, err.message);
                // Will retry on next tick
            }
        }
    }
}

export const syncManager = new SyncManager();
