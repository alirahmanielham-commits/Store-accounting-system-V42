const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(
`            const res = await client.query('SELECT id FROM businesses WHERE deleted_at IS NULL');`,
`            let res;
            try {
                res = await client.query('SELECT id FROM businesses WHERE deleted_at IS NULL');
            } catch (err) {
                if (err.code === '42703') {
                    res = await client.query('SELECT id FROM businesses');
                } else {
                    throw err;
                }
            }`);

fs.writeFileSync('src/routes/backup.routes.ts', code);
