const fs = require('fs');
let code = fs.readFileSync('src/db/kv-store.ts', 'utf8');

code = code.replace(
`         const res = await client.query(\`SELECT * FROM "\${key}"\${isSoftDeletable ? ' WHERE deleted_at IS NULL' : ''}\`);`,
`         let res;
         try {
             res = await client.query(\`SELECT * FROM "\${key}"\${isSoftDeletable ? ' WHERE deleted_at IS NULL' : ''}\`);
         } catch (err) {
             if (err.code === '42703') {
                 res = await client.query(\`SELECT * FROM "\${key}"\`);
             } else {
                 throw err;
             }
         }`);

fs.writeFileSync('src/db/kv-store.ts', code);
