const fs = require('fs');

let auth = fs.readFileSync('src/routes/auth.routes.ts', 'utf8');
// Fix token reference error if the regex missed it
auth = auth.replace(/const decoded = jwt\.verify\(token, process\.env\.JWT_SECRET \|\| 'default_secret'\) as any;/, "const decoded = jwt.verify(req.headers.authorization?.split(' ')[1] || '', process.env.JWT_SECRET || 'default_secret') as any;");

// check the file content first before fixing
fs.writeFileSync('src/routes/auth.routes.ts', auth);

console.log('Fixed lint issues 3');
