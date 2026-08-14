const fs = require('fs');
const file = 'src/components/financial/checks/CheckCardPage.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('import Num2persian from')) {
    code = code.replace(
        'import { formatDateDisplay } from "../../../utils/format";',
        'import { formatDateDisplay } from "../../../utils/format";\nimport Num2persian from "num2persian";'
    );
}

code = code.replace(
    "{Number(check.amount).toLocaleString('fa-IR')} <span className=\"text-lg text-emerald-200 font-normal\">{storeSettings?.currency || 'تومان'}</span>",
    "{Number(check.amount).toLocaleString('fa-IR')} <span className=\"text-lg text-emerald-200 font-normal\">{storeSettings?.currency || 'تومان'}</span>\n                 <div className=\"text-sm text-slate-300 mt-2 font-normal\">{Num2persian(check.amount)} {storeSettings?.currency || 'تومان'}</div>"
);

fs.writeFileSync(file, code);
console.log('patched check_card 5 for words');
