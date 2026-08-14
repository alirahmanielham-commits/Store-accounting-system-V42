const fs = require('fs');
const file = 'src/utils/dateFormatter.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /let finalDateStr = jsDate as string;[\s\S]*?const \{ calendar, locale \} = this\.getCalendarInfo\(\);/;

const replacement = `let finalDateStr = jsDate as string;
      if (typeof jsDate === 'string') {
        if (jsDate.includes('T')) {
          finalDateStr = jsDate.split('T')[0] + 'T12:00:00';
        } else if (jsDate.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
          finalDateStr = jsDate + 'T12:00:00';
        }
      }
      
      const { calendar, locale } = this.getCalendarInfo();`;

code = code.replace(regex, replacement);

fs.writeFileSync(file, code);
console.log("Patched dateFormatter.ts again");
