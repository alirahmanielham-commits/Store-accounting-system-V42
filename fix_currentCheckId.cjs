const fs = require('fs');
let code = fs.readFileSync('src/components/financial/checks/CheckCardPage.tsx', 'utf8');

code = code.replace(
  "const [currentCheckId, setCurrentCheckId] = useState(checkId);",
  `const [currentCheckId, setCurrentCheckId] = useState(checkId);\n  useEffect(() => { setCurrentCheckId(checkId); }, [checkId]);`
);

fs.writeFileSync('src/components/financial/checks/CheckCardPage.tsx', code);
