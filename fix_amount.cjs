const fs = require('fs');
let code = fs.readFileSync('src/components/financial/IssueCheckStandalone.tsx', 'utf8');
code = code.replace(
  /onChange=\{\(e: any\) => \{\s*setAmount\(e\.target \? e\.target\.value : e\);\s*if \(errors\.amount\) setErrors\(prev => \(\{\.\.\.prev, amount: ''\}\)\);\s*\}\}/,
  `onChange={(e: any) => {
                    let val = e;
                    if (e && e.target && e.target.value !== undefined) {
                      val = e.target.value;
                    } else if (e && typeof e === 'string') {
                      val = e;
                    }
                    if (typeof val === 'object') val = '';
                    setAmount(val);
                    if (errors.amount) setErrors(prev => ({...prev, amount: ''}));
                  }}`
);
fs.writeFileSync('src/components/financial/IssueCheckStandalone.tsx', code);
