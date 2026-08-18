import { Request, Response, NextFunction } from 'express';
import { loadPgPoolForStore, storeContext } from '../db/connection';

export const storeContextMiddleware = (req: any, res: any, next: any) => {
    const storeId = (req.headers['x-store-id'] as string) || (req.query.storeId as string) || 'default';
    
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
