const fs = require('fs');
const cardPath = 'src/components/financial/checks/CheckCardPage.tsx';
let card = fs.readFileSync(cardPath, 'utf8');

card = card.replace(
  `<div className="p-4 bg-gray-50 rounded-xl">
                  <span className="block text-gray-500 mb-1">دسته چک مبدأ</span>
                  <span className="font-medium text-gray-900">حساب متصل: {check.checkbookId || '---'}</span>
                </div>`,
  `{checkType === 'issued' ? (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <span className="block text-gray-500 mb-1">دسته چک و حساب متصل</span>
                    <span className="font-medium text-gray-900">
                      {check.checkbookId ? (() => {
                         const cb = checkbooks.find(c => String(c.id) === String(check.checkbookId));
                         if (cb) {
                            const acc = accounts.find(a => String(a.id) === String(cb.accountId));
                            if (acc) return \`بانک \${acc.bankName} - \${acc.accountNumber}\`;
                            return 'حساب متصل یافت نشد';
                         }
                         return 'دسته چک یافت نشد';
                      })() : '---'}
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <span className="block text-gray-500 mb-1">بانک و شعبه</span>
                    <span className="font-medium text-gray-900">
                      {check.bankName ? \`بانک \${check.bankName} \${check.branchName ? 'شعبه ' + check.branchName : ''}\` : '---'}
                    </span>
                  </div>
                )}`
);

fs.writeFileSync(cardPath, card);
console.log('Patched');
