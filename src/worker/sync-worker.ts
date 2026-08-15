import { syncManager } from '../services/syncManager';
import { activePgPools } from '../db/connection';

export function startSyncWorker() {
    setInterval(() => {
        try {
            syncManager.processQueue((storeId) => activePgPools[storeId]);
        } catch(e) {
            console.error("Sync worker error:", e);
        }
    }, 10000); // run every 10s
}
