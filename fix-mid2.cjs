const fs = require('fs');
const lines = fs.readFileSync('/tmp/server_copy.ts', 'utf8').split('\n');

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

let storeCtxMidCode = `import { Request, Response, NextFunction } from 'express';
import { loadPgPoolForStore, storeContext } from '../db/connection';

export const storeContextMiddleware = ${slice(1062, 1074).replace('app.use(', '').slice(0, -2)};
`;
storeCtxMidCode = storeCtxMidCode.replace('(req, res, next)', '(req: any, res: any, next: any)');

fs.writeFileSync('src/middleware/store-context.middleware.ts', storeCtxMidCode);
