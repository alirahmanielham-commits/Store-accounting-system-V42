const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

function write(path, content) {
    fs.mkdirSync(path.split('/').slice(0,-1).join('/'), { recursive: true });
    fs.writeFileSync(path, content);
    console.log('Wrote', path);
}

let authMidCode = `import jwt from 'jsonwebtoken';
import { getDbData } from '../db/kv-store';
import { getDb } from '../db/connection';
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';

export const authMiddleware = ${slice(685, 1061).replace('app.use(', '').slice(0, -2)};
`;

authMidCode = authMidCode.replace('(req, res, next)', '(req: any, res: any, next: any)');

write('src/middleware/auth.middleware.ts', authMidCode);

let storeCtxMidCode = `import { loadPgPoolForStore, storeContext } from '../db/connection';

export const storeContextMiddleware = ${slice(1062, 1070).replace('app.use(', '').slice(0, -2)};
`;
storeCtxMidCode = storeCtxMidCode.replace('(req, res, next)', '(req: any, res: any, next: any)');

write('src/middleware/store-context.middleware.ts', storeCtxMidCode);

