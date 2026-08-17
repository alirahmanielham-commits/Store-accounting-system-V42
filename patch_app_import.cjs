const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("const CheckbooksManager =")) {
  code = code.replace(
    /const CheckManagement = React.lazy\(\(\) => import\('\.\/components\/financial\/CheckManagement'\)\);/,
    "const CheckManagement = React.lazy(() => import('./components/financial/CheckManagement'));\nconst CheckbooksManager = React.lazy(() => import('./components/financial/CheckbooksManager'));"
  );
  fs.writeFileSync('src/App.tsx', code, 'utf8');
}
