const fs = require('fs');
const lines = fs.readFileSync('server.ts.bak', 'utf8').split('\n');
function slice(start, end) { return lines.slice(start - 1, end).join('\n'); }

// 1. Auth routes
const authPre = `
${slice(1077, 1108)}
const finalizeLogin = ${slice(1220, 1228).replace('const finalizeLogin = ', '').trim()}
`;

let authRoutes = fs.readFileSync('src/routes/auth.routes.ts', 'utf8');
authRoutes = authRoutes.replace('const router = Router();', 'const router = Router();\n' + authPre);
fs.writeFileSync('src/routes/auth.routes.ts', authRoutes);

// 2. Backup routes
const backupPre = `
${slice(1232, 1275)}
`;
let backupRoutes = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');
backupRoutes = backupRoutes.replace('const router = Router();', 'const router = Router();\n' + backupPre);
fs.writeFileSync('src/routes/backup.routes.ts', backupRoutes);

// 3. Migration routes
const migrationPre = `
${slice(2385, 2391)}
`;
let migrationRoutes = fs.readFileSync('src/routes/migration.routes.ts', 'utf8');
migrationRoutes = migrationRoutes.replace('const router = Router();', 'const router = Router();\n' + migrationPre);
fs.writeFileSync('src/routes/migration.routes.ts', migrationRoutes);

