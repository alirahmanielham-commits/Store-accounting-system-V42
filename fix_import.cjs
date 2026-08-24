const fs = require('fs');
let code = fs.readFileSync('src/components/payroll/ContractsManager.tsx', 'utf-8');

if (!code.includes("import RentContractsManager")) {
  code = code.replace(
    "import Select from 'react-select';",
    "import Select from 'react-select';\nimport RentContractsManager from './RentContractsManager';"
  );
  fs.writeFileSync('src/components/payroll/ContractsManager.tsx', code);
}
