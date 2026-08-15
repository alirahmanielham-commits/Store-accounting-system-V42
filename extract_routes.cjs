const fs = require('fs');

const code = fs.readFileSync('server.ts', 'utf8');

// A function to find all app.VERB('/path', ...) blocks
// We can use a simple parser to match the balanced braces for the route handler.

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
                    // find the next closing parenthesis for app.get(...)
                    const endParen = str.indexOf(')', i);
                    if (str.substring(i+1, endParen).trim() === '' || str.substring(i+1, endParen+1).includes(')')) {
                       // We can just find the end of the line
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
    
    // We don't want the fallback app.get('*')
    if (path === '*' || path === '/api/health') continue; // We will handle /api/health manually or in misc
    
    const startIndex = match.index;
    const endLine = getBalancedEnd(code, startIndex);
    
    if (endLine !== -1) {
        const block = code.substring(startIndex, endLine);
        routes.push({ verb, path, block, startIndex, endLine });
        methodRegex.lastIndex = endLine; // skip what we just matched
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
        console.log('UNMATCHED ROUTE:', r.path);
        // Put in misc
        categories.misc.code += r.block.replace(/^app\./, 'router.') + '\n\n';
    }
}

// Generate the files
function getImports() {
    return `import { Router } from 'express';
import fsPromises from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { exec } from 'child_process';
import { validateData } from '../schemas/validation';
import { getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs } from '../db/connection';
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
    console.log(`Wrote ${filePath} with length ${fileContent.length}`);
}

