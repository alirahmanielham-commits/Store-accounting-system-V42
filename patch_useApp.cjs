const fs = require('fs');
const file = 'src/hooks/useAppController.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace standard useState for viewingCheck
code = code.replace(
  'const [viewingCheck, setViewingCheck] = useState<any>(null);',
  `const [viewingCheck, setViewingCheckState] = useState<any>(null);
   const setViewingCheck = (val: any) => {
     setViewingCheckState(val);
     if (val) setActiveTab('check_card');
   };`
);

fs.writeFileSync(file, code);
console.log('patched useAppController.tsx');
