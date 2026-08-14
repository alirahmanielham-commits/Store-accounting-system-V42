const fs = require('fs');
const file = 'src/components/financial/PayReceiptModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// remove check button
code = code.replace(/<button[^>]*onClick=\{\(\) => setReceiptMethod\("check"\)\}[^>]*>[\s\S]*?<\/button>/, '');
code = code.replace(/\{receiptMethod === 'check' && \([\s\S]*?\}\)/g, ''); // Be careful this doesn't exist, we will use index based replacement if needed

fs.writeFileSync(file, code);
