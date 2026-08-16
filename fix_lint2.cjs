const fs = require('fs');

// Fix auth.routes.ts
let auth = fs.readFileSync('src/routes/auth.routes.ts', 'utf8');
// It seems `jwt.verify` might be typed. I'll cast `decoded` as `any` properly.
auth = auth.replace(/const decoded = jwt\.verify\([^;]+\);/g, "const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as any;");
// Double check the usages
auth = auth.replace(/decoded\.username/g, "(decoded as any).username");
auth = auth.replace(/decoded\.tokenVersion/g, "(decoded as any).tokenVersion");

fs.writeFileSync('src/routes/auth.routes.ts', auth);

// Fix data.routes.ts
let data = fs.readFileSync('src/routes/data.routes.ts', 'utf8');
data = data.replace(/validationResult\.error\.errors/g, "(validationResult as any).error?.errors");
fs.writeFileSync('src/routes/data.routes.ts', data);

console.log('Fixed lint issues 2');
