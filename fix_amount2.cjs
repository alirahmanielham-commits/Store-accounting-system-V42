const fs = require('fs');
let code = fs.readFileSync('src/components/financial/IssueCheckStandalone.tsx', 'utf8');
code = code.replace(
  /onChange=\{\(e: any\) => \{\s*let val = e;\s*if \(e && e\.target && e\.target\.value !== undefined\) \{\s*val = e\.target\.value;\s*\} else if \(e && typeof e === 'string'\) \{\s*val = e;\s*\}\s*if \(typeof val === 'object'\) val = '';\s*setAmount\(val\);\s*if \(errors\.amount\) setErrors\(prev => \(\{\.\.\.prev, amount: ''\}\)\);\s*\}\}/,
  `onChange={(e: any) => {
                    let val = e;
                    if (e && e.target && e.target.value !== undefined) {
                      val = e.target.value;
                    } else if (e && typeof e === 'string') {
                      val = e;
                    } else if (e && e.value !== undefined) {
                      val = e.value;
                    } else if (typeof e === 'object' && Object.keys(e).length === 0) {
                      val = ''; // Sometimes empty object is passed
                    } else if (typeof e === 'number') {
                      val = e.toString();
                    }
                    if (typeof val === 'object') {
                      console.error("CurrencyInput onChange returned an object that we didn't handle:", e);
                      val = '';
                    }
                    setAmount(val);
                    if (errors.amount) setErrors(prev => ({...prev, amount: ''}));
                  }}`
);
fs.writeFileSync('src/components/financial/IssueCheckStandalone.tsx', code);
