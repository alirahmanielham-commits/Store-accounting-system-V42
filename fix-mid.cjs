const fs = require('fs');
const lines = fs.readFileSync('/tmp/server_copy.ts', 'utf8').split('\n');

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

let authMidCode = `import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const authMiddleware = ${slice(685, 720).replace('app.use(', '').slice(0, -2)};
`;
authMidCode = authMidCode.replace('(req, res, next)', '(req: any, res: any, next: any)');

fs.writeFileSync('src/middleware/auth.middleware.ts', authMidCode);

// Where does storeContextMiddleware end?
// Let's check lines 1062 to 1075 of /tmp/server_copy.ts
