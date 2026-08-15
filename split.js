const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

// We will build this manually by searching for known lines.
