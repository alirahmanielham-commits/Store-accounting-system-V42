const fs = require('fs');

let code = fs.readFileSync('src/components/financial/IssueCheckStandalone.tsx', 'utf8');

// 1. Fix CurrencyInput onChange
code = code.replace(
  /onChange=\{\(v\) => \{\s*setAmount\(v\);\s*if \(errors\.amount\)/g,
  `onChange={(e: any) => {\n                    setAmount(e.target ? e.target.value : e);\n                    if (errors.amount)`
);

// 2. Add Accounts
if (!code.includes('getAccounts')) {
  code = code.replace('getCheckbooks, getPersons }', 'getCheckbooks, getPersons, getAccounts }');
}

if (!code.includes('const [accounts')) {
  code = code.replace('const [allChecks, setAllChecks] = useState<any[]>([]);', 'const [allChecks, setAllChecks] = useState<any[]>([]);\n  const [accounts, setAccounts] = useState<any[]>([]);');
}

code = code.replace('setAllChecks(await getIssuedChecks());', 'setAllChecks(await getIssuedChecks());\n    setAccounts(await getAccounts());');

code = code.replace(
  /const checkbookOptions = useMemo\(\(\) => checkbooks\.map\(cb => \(\{ value: cb\.id, label: `\$\{cb\.bankName\}.*?\` \}\)\), \[checkbooks\]\);/s,
  `const checkbookOptions = useMemo(() => {
    return checkbooks.map(cb => {
      const acc = accounts.find(a => String(a.id) === String(cb.accountId));
      return { 
        value: cb.id, 
        label: acc ? \`\${acc.bankName} - شعبه \${acc.branchName || 'مرکزی'} - حساب \${acc.accountNumber}\` : \`دسته‌چک \${cb.id}\`
      };
    });
  }, [checkbooks, accounts]);`
);

code = code.replace(
  /const selectedCheckbook = useMemo\(\(\) => checkbooks\.find\(cb => cb\.id === checkbookId\), \[checkbooks, checkbookId\]\);/,
  `const selectedCheckbook = useMemo(() => {
    const cb = checkbooks.find(c => c.id === checkbookId);
    if (!cb) return null;
    const acc = accounts.find(a => String(a.id) === String(cb.accountId));
    return { ...cb, ...acc };
  }, [checkbooks, checkbookId, accounts]);`
);

// 3. Make dates beautiful
const date1Regex = /<div className=\{`p-1 border-2 rounded-2xl transition-colors \$\{errors\.issueDate \? "border-rose-300" : "border-slate-200 hover:border-slate-300 focus-within:border-indigo-500"\} \$\{!checkLeafId \? 'opacity-50 pointer-events-none bg-slate-50' : 'bg-white'\}`\}>\s*<div className="flex items-center">\s*<Calendar className="w-5 h-5 text-slate-400 mx-3" \/>\s*<div className="flex-1 text-lg font-bold">\s*<CustomDatePicker value=\{issueDate\} onChange=\{setIssueDate\} \/>\s*<\/div>\s*<\/div>\s*<\/div>/s;

const date1Replacement = `<div className={\`flex flex-col p-2 border-2 rounded-2xl transition-all duration-200 \${errors.issueDate ? "border-rose-300 bg-rose-50/50" : "border-slate-200 hover:border-slate-300 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] bg-slate-50/30"} \${!checkLeafId ? 'opacity-50 pointer-events-none' : 'bg-white'}\`}>
                   <div className="flex items-center gap-3 px-1">
                     <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100 shrink-0 text-slate-500 group-focus-within:text-indigo-600 transition-colors">
                       <Calendar className="w-6 h-6" />
                     </div>
                     <div className="flex-1 w-full date-picker-lg">
                       <CustomDatePicker 
                         value={issueDate} 
                         onChange={setIssueDate} 
                       />
                     </div>
                   </div>
                </div>`;
code = code.replace(date1Regex, date1Replacement);

const date2Regex = /<div className=\{`p-1 border-2 rounded-2xl transition-colors \$\{errors\.dueDate \? "border-rose-300" : "border-slate-200 hover:border-slate-300 focus-within:border-indigo-500"\} \$\{!checkLeafId \? 'opacity-50 pointer-events-none bg-slate-50' : 'bg-white'\}`\}>\s*<div className="flex items-center">\s*<Calendar className="w-5 h-5 text-indigo-500 mx-3" \/>\s*<div className="flex-1 text-lg font-black text-indigo-700">\s*<CustomDatePicker value=\{dueDate\} onChange=\{setDueDate\} \/>\s*<\/div>\s*<\/div>\s*<\/div>/s;

const date2Replacement = `<div className={\`flex flex-col p-2 border-2 rounded-2xl transition-all duration-200 \${errors.dueDate ? "border-rose-300 bg-rose-50/50" : "border-indigo-200 hover:border-indigo-300 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_4px_rgba(79,70,229,0.15)] bg-indigo-50/10"} \${!checkLeafId ? 'opacity-50 pointer-events-none' : 'bg-white'}\`}>
                   <div className="flex items-center gap-3 px-1">
                     <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md border border-indigo-500 shrink-0 text-white">
                       <Calendar className="w-6 h-6" />
                     </div>
                     <div className="flex-1 w-full date-picker-lg dueDate">
                       <CustomDatePicker 
                         value={dueDate} 
                         onChange={setDueDate} 
                       />
                     </div>
                   </div>
                </div>`;
code = code.replace(date2Regex, date2Replacement);

fs.writeFileSync('src/components/financial/IssueCheckStandalone.tsx', code);
