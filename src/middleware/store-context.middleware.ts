import { Request, Response, NextFunction } from 'express';
import { loadPgPoolForStore, storeContext } from '../db/connection';

export const storeContextMiddleware = (req: any, res: any, next: any) => {
    let storeId = (req.headers['x-store-id'] as string) || (req.query.storeId as string) || (req.cookies?.activeStoreId as string);
    if (!storeId && req.headers.cookie) {
        const match = req.headers.cookie.match(/activeStoreId=([^;]+)/);
        if (match) {
            try { storeId = decodeURIComponent(match[1].trim()); } catch (_) {}
        }
    }
    if (!storeId || storeId === 'null' || storeId === 'undefined') {
        storeId = 'default';
    }

    res.setHeader('x-store-id', storeId);
    
    loadPgPoolForStore(storeId).then(() => {
        storeContext.run(storeId, () => {
            next();
        });
    }).catch((e) => {
        console.error("Failed to load pool for store", storeId, e);
        storeContext.run(storeId, () => {
            next();
        });
    });
};
