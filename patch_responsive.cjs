const fs = require('fs');
let code = fs.readFileSync('src/layouts/AdminLTE/components/Header.tsx', 'utf8');

// Fix positioning for LTR/RTL so it doesn't overflow off screen on mobile
code = code.replace("left-0 mt-2", "left-0 sm:left-auto sm:right-0 mt-2");
code = code.replace("w-72", "w-[280px] sm:w-72"); // Prevent it from being too wide on very small phones

fs.writeFileSync('src/layouts/AdminLTE/components/Header.tsx', code);
