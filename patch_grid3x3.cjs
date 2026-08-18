const fs = require('fs');
let code = fs.readFileSync('src/layouts/AdminLTE/components/Header.tsx', 'utf8');

code = code.replace("Grip,", "Grid3x3,");
code = code.replace("<Grip", "<Grid3x3");

fs.writeFileSync('src/layouts/AdminLTE/components/Header.tsx', code);
