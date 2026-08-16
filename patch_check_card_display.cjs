const fs = require('fs');

const cardPath = 'src/components/financial/checks/CheckCardPage.tsx';
let card = fs.readFileSync(cardPath, 'utf8');

// Fix the Person label and Checkbook/Bank details
card = card.replace(
  /<span className="text-slate-400 text-xs mb-1 flex items-center gap-1"><User className="w-3 h-3"\/> ذینفع \(گیرنده\)<\/span>\s+<span className="font-bold text-lg">\{payee \? payee\.name : 'نامشخص'\}<\/span>/,
  `<span className="text-slate-400 text-xs mb-1 flex items-center gap-1"><User className="w-3 h-3"/> {checkType === 'issued' ? 'گیرنده (ذینفع)' : 'پرداخت کننده'}</span>
                <span className="font-bold text-lg">{payee ? payee.name : (checkType === 'issued' ? check.payeeName : check.payerName) || 'نامشخص'}</span>`
);

card = card.replace(
  /<div className="p-4 bg-gray-50 rounded-xl">\s+<span className="block text-gray-500 mb-1">دسته چک مبدأ<\/span>\s+<span className="font-medium text-gray-900">حساب متصل: \{check\.checkbookId \|\| '--'\}<\/span>\s+<\/div>/,
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

// We need to also patch the Accounting document generation
fs.writeFileSync(cardPath, card);
console.log('Patched card display');
