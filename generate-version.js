import fs from 'fs';
fs.writeFileSync('src/version.ts', `export const APP_VERSION = '${new Date().toISOString()}';\n`);
