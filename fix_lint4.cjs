const fs = require('fs');

let auth = fs.readFileSync('src/routes/auth.routes.ts', 'utf8');

auth = auth.replace(/const decoded = jwt\.verify\(req\.headers\.authorization\?\.split\(' '\)\[1\] \|\| '', process\.env\.JWT_SECRET \|\| 'default_secret'\) as any;/, "const decoded = jwt.verify(tempToken || '', process.env.JWT_SECRET || 'default_secret') as any;");

fs.writeFileSync('src/routes/auth.routes.ts', auth);

console.log('Fixed lint issues 4');
