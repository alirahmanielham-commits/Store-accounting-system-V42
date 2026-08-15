const fs = require('fs');
const lines = fs.readFileSync('server.ts.bak', 'utf8').split('\n');

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

function write(path, content) {
    fs.mkdirSync(path.split('/').slice(0,-1).join('/'), { recursive: true });
    fs.writeFileSync(path, content);
    console.log('Wrote', path);
}

// 1. Connection
const connectionCode = `import 'dotenv/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fsPromises from 'fs/promises';
import { Client, Pool } from 'pg';
import { ensurePostgresTables } from './schema-sync';

export const storeContext = new AsyncLocalStorage<string>();
export const SQLITE_FILE = path.join(process.cwd(), 'database.sqlite');
export const DB_CONFIG_FILE = path.join(process.cwd(), 'db_config.json');
export const DATA_FILE = path.join(process.cwd(), 'database.json');
export const dbs: Record<string, any> = {};
export const activePgPools: Record<string, any> = {};
export const usePgMap: Record<string, boolean> = {};
export const pendingPgPools: Record<string, Promise<void>> = {};

${slice(32,41).replace('function getDb', 'export function getDb')}
${slice(47,130).replace('async function loadPgPoolForStore', 'export async function loadPgPoolForStore')}
${slice(131,135).replace('function getActivePgPool', 'export function getActivePgPool')}
${slice(136,140).replace('function isPgActive', 'export function isPgActive')}
${slice(203,224).replace('async function connectPgDb', 'export async function connectPgDb')}
`;
write('src/db/connection.ts', connectionCode);

// 2. Schema Sync
const schemaSyncCode = `import { getActivePgPool, isPgActive } from './connection';

export const KNOWN_TABLES = [${slice(143,166).replace('const KNOWN_TABLES = [', '')}
export const tableSchemas = new Map<string, Set<string>>();

${slice(172,201).replace('async function syncTableSchema', 'export async function syncTableSchema')}
${slice(497,515).replace('async function ensurePostgresTables', 'export async function ensurePostgresTables')}
`;
write('src/db/schema-sync.ts', schemaSyncCode);

// 3. KV Store
const kvStoreCode = `import { getDb, isPgActive, getActivePgPool } from './connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema } from './schema-sync';

${slice(227,280).replace('async function innerGetDbData', 'export async function innerGetDbData')}
${slice(281,350).replace('async function innerSetDbData', 'export async function innerSetDbData')}
${slice(351,370).replace('async function handleRelations', 'export async function handleRelations')}
${slice(371,394).replace('async function getDbData', 'export async function getDbData')}
${slice(395,445).replace('async function setDbData', 'export async function setDbData')}
${slice(446,495).replace('async function getAllDbData', 'export async function getAllDbData')}
`;
write('src/db/kv-store.ts', kvStoreCode);

// 4. Migration
const migrationCode = `import path from 'path';
import fsPromises from 'fs/promises';
import { getDb, loadPgPoolForStore, isPgActive, getActivePgPool, storeContext, DB_CONFIG_FILE, DATA_FILE } from './connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from './schema-sync';
import { handleRelations } from './kv-store';

${slice(517,605).replace('async function migrateSqliteToPostgres', 'export async function migrateSqliteToPostgres')}
${slice(606,656).replace('async function initDB', 'export async function initDB')}
`;
write('src/db/migration.ts', migrationCode);

// 5. Auth Middleware
let authMidCode = `import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const authMiddleware = ${slice(685, 720).replace('app.use(', '').slice(0, -2)};
`;
authMidCode = authMidCode.replace('(req, res, next)', '(req: any, res: any, next: any)');
write('src/middleware/auth.middleware.ts', authMidCode);

// 6. Store Context Middleware
let storeCtxMidCode = `import { Request, Response, NextFunction } from 'express';
import { loadPgPoolForStore, storeContext } from '../db/connection';

export const storeContextMiddleware = ${slice(1062, 1074).replace('app.use(', '').slice(0, -2)};
`;
storeCtxMidCode = storeCtxMidCode.replace('(req, res, next)', '(req: any, res: any, next: any)');
write('src/middleware/store-context.middleware.ts', storeCtxMidCode);

// 7. Routes Extractor
const code = fs.readFileSync('server.ts.bak', 'utf8');
const routes = [];
let currentIndex = code.indexOf('app.');

function getBalancedEnd(str, startIndex) {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let inRouteHandler = false;
    
    for (let i = startIndex; i < str.length; i++) {
        const char = str[i];
        const prevChar = str[i-1];
        
        if (!inString) {
            if (char === "'" || char === '"' || char === '\`') {
                inString = true;
                stringChar = char;
            } else if (char === '{') {
                braceCount++;
                inRouteHandler = true;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0 && inRouteHandler) {
                    const endParen = str.indexOf(')', i);
                    if (str.substring(i+1, endParen).trim() === '' || str.substring(i+1, endParen+1).includes(')')) {
                       const endLine = str.indexOf('\n', endParen);
                       return endLine !== -1 ? endLine : str.length;
                    }
                }
            }
        } else {
            if (char === stringChar && prevChar !== '\\') {
                inString = false;
            }
        }
    }
    return -1;
}

const methodRegex = /app\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
let match;
while ((match = methodRegex.exec(code)) !== null) {
    const verb = match[1];
    const path = match[2];
    
    if (path === '*' || path === '/api/health') continue;
    
    const startIndex = match.index;
    const endLine = getBalancedEnd(code, startIndex);
    
    if (endLine !== -1) {
        const block = code.substring(startIndex, endLine);
        routes.push({ verb, path, block, startIndex, endLine });
        methodRegex.lastIndex = endLine;
    }
}

const categories = {
    auth: { match: (p) => p.startsWith('/api/auth/'), code: '' },
    setup: { match: (p) => p.startsWith('/api/setup/') || p === '/api/system/info', code: '' },
    database: { match: (p) => p.startsWith('/api/databases'), code: '' },
    data: { match: (p) => p.startsWith('/api/data/'), code: '' },
    backup: { match: (p) => p.startsWith('/api/db/backup') || p === '/api/db/restore' || p === '/api/db/stats', code: '' },
    migration: { match: (p) => p.startsWith('/api/migrate-postgres/'), code: '' },
    reports: { match: (p) => p.startsWith('/api/reports/'), code: '' },
    system: { match: (p) => p.startsWith('/api/sys/') || p === '/api/system/update' || p === '/api/db/execute' || p === '/api/db/config' || p === '/api/db/test' || p === '/api/db/recalculate-stocks', code: '' },
    misc: { match: (p) => p === '/api/generate_demo_data' || p === '/api/search-products' || p === '/api/persons/check-duplicates', code: '' }
};

for (const r of routes) {
    let foundCategory = false;
    for (const [catName, catDef] of Object.entries(categories)) {
        if (catDef.match(r.path)) {
            catDef.code += r.block.replace(/^app\./, 'router.') + '\n\n';
            foundCategory = true;
            break;
        }
    }
    if (!foundCategory) {
        categories.misc.code += r.block.replace(/^app\./, 'router.') + '\n\n';
    }
}

function getImports() {
    return `import { Router } from 'express';
import fsPromises from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { exec } from 'child_process';
import { validateData } from '../schemas/validation';
import { getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';
import { KNOWN_TABLES, tableSchemas } from '../db/schema-sync';
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from '../db/schema';
import * as schema from '../db/schema';

const router = Router();
`;
}

for (const [catName, catDef] of Object.entries(categories)) {
    let fileContent = getImports() + catDef.code + `\nexport default router;\n`;
    const filePath = `src/routes/${catName}.routes.ts`;
    fs.mkdirSync('src/routes', { recursive: true });
    fs.writeFileSync(filePath, fileContent);
    console.log(`Wrote ${filePath}`);
}

// 8. Sync Worker
const syncWorkerCode = `import { syncManager } from '../services/syncManager';
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
`;
write('src/worker/sync-worker.ts', syncWorkerCode);

// 9. Final Server Code
const serverCode = `import os from "os";
import 'dotenv/config';
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';

import { initDB } from './src/db/migration';
import { startCronJobs } from './src/jobs/checkNotificationsJob';
import { authMiddleware } from './src/middleware/auth.middleware';
import { storeContextMiddleware } from './src/middleware/store-context.middleware';
import { startSyncWorker } from './src/worker/sync-worker';

import authRoutes from './src/routes/auth.routes';
import setupRoutes from './src/routes/setup.routes';
import databaseRoutes from './src/routes/database.routes';
import dataRoutes from './src/routes/data.routes';
import backupRoutes from './src/routes/backup.routes';
import migrationRoutes from './src/routes/migration.routes';
import reportsRoutes from './src/routes/reports.routes';
import systemRoutes from './src/routes/system.routes';
import miscRoutes from './src/routes/misc.routes';

if (process.env.SENTRY_DSN && String(process.env.SENTRY_DSN).startsWith('http')) {
  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });
  } catch (e) {
    console.error("Failed to initialize Sentry on backend:", e);
  }
}

async function startServer() {
  startCronJobs();
  await initDB();
  const app = express();
  const PORT = 3000;
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.text({ limit: '500mb', type: ['text/*', 'application/sql', 'application/json'] }));
  app.use(cookieParser());

  app.use(authMiddleware);
  app.use(storeContextMiddleware);

  app.use(authRoutes);
  app.use(setupRoutes);
  app.use(databaseRoutes);
  app.use(dataRoutes);
  app.use(backupRoutes);
  app.use(migrationRoutes);
  app.use(reportsRoutes);
  app.use(systemRoutes);
  app.use(miscRoutes);

  if (process.env.SENTRY_DSN && String(process.env.SENTRY_DSN).startsWith('http')) {
    Sentry.setupExpressErrorHandler(app);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on port \${PORT}\`);
  });
}

startServer();
startSyncWorker();
`;
write('server.ts', serverCode);

