const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

const dateHelper = `
const getFormattedBackupDate = () => {
   return new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Tehran'
   }).format(new Date()).replace(/[\\/\\s:,]+/g, '-');
};
`;

code = code.replace(/import \{ getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations \} from '\.\.\/db\/kv-store';/, "import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';\n" + dateHelper);

code = code.replace(/const fileName = \`backup-\$\{storeId\}-\$\{Date\.now\(\)\}\.json\`;/g, 'const fileName = `backup-${storeId}-${getFormattedBackupDate()}.json`;');

fs.writeFileSync('src/routes/backup.routes.ts', code);
