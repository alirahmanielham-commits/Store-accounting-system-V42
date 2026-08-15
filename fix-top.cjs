const fs = require('fs');

let authContent = fs.readFileSync('src/routes/auth.routes.ts', 'utf8');
authContent = authContent.replace("const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';", "// const JWT_SECRET = ...");
authContent = authContent.replace("const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-2024';", "// const JWT_REFRESH_SECRET = ...");
fs.writeFileSync('src/routes/auth.routes.ts', authContent);

let backupContent = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');
// Replace the top-level await block
const badAwaitBlock = `  let backupConfig = { path: '', intervalHours: 4 };
  try {
     const backupData = await getDbData('backupConfig');
     if (backupData) {
        Object.assign(backupConfig, backupData);
     }
  } catch(e) { }`;

const goodBlock = `  let backupConfig = { path: '', intervalHours: 4 };
  (async () => {
    try {
       const backupData = await getDbData('backupConfig');
       if (backupData) {
          Object.assign(backupConfig, backupData);
       }
    } catch(e) { }
  })();`;

backupContent = backupContent.replace(badAwaitBlock, goodBlock);
fs.writeFileSync('src/routes/backup.routes.ts', backupContent);
