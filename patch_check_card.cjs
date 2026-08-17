const fs = require('fs');
let code = fs.readFileSync('src/components/financial/checks/CheckCardPage.tsx', 'utf8');

code = code.replace(
  'import { motion } from "framer-motion";',
  'import { motion, AnimatePresence } from "framer-motion";'
);

fs.writeFileSync('src/components/financial/checks/CheckCardPage.tsx', code, 'utf8');
