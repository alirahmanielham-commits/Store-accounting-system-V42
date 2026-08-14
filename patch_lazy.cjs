const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const importsToAdd = `
const IssueCheckStandalone = React.lazy(() => import('./components/financial/IssueCheckStandalone'));
const CheckCardPage = React.lazy(() => import('./components/financial/checks/CheckCardPage'));
`;

if (!code.includes('const CheckCardPage')) {
  code = code.replace(
    "const CheckManagement = React.lazy(() => import('./components/financial/CheckManagement'));",
    "const CheckManagement = React.lazy(() => import('./components/financial/CheckManagement'));" + importsToAdd
  );
}

fs.writeFileSync(file, code);
console.log('patched lazy imports');
