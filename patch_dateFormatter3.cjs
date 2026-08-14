const fs = require('fs');
const file = 'src/utils/dateFormatter.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /if \(typeof jsDate === 'string'\) \{\s*if \(jsDate\.includes\('T'\)\) \{\s*finalDateStr = jsDate\.split\('T'\)\[0\] \+ 'T12:00:00';\s*\} else if \(jsDate\.match\(\/\^\\\\d\{4\}-\\\\d\{2\}-\\\\d\{2\}\$\/\)\) \{\s*finalDateStr = jsDate \+ 'T12:00:00';\s*\}\s*\}/;

const replacement = `if (typeof jsDate === 'string' && !this.config.showTime && overrideShowTime !== true) {
        if (jsDate.includes('T')) {
          finalDateStr = jsDate.split('T')[0] + 'T12:00:00';
        } else if (jsDate.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
          finalDateStr = jsDate + 'T12:00:00';
        }
      }`;

code = code.replace(regex, replacement);

fs.writeFileSync(file, code);
console.log("Patched dateFormatter.ts for time");
