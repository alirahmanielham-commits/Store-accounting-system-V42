const fs = require('fs');
const file = 'src/utils/dateFormatter.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /let jsDate = date;[\s\S]*?const dateObj = new DateObject\(\{ date: new Date\(jsDate as any\), calendar, locale \}\);/;

const replacement = `let jsDate = date;
      if (typeof date === 'string' && date.includes('/')) {
         const parsed = new Date(convertToGregorian(date));
         if (!isNaN(parsed.getTime())) jsDate = parsed;
      }
      
      let finalDateStr = jsDate as string;
      if (typeof jsDate === 'string') {
        if (jsDate.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
          // If it's a date string without time, append T12:00:00 to parse at noon local time 
          // to prevent timezone shift across day boundaries
          finalDateStr = jsDate + 'T12:00:00';
        }
      }
      
      const { calendar, locale } = this.getCalendarInfo();
      const dateObj = new DateObject({ date: new Date(finalDateStr as any), calendar, locale });`;

code = code.replace(regex, replacement);

fs.writeFileSync(file, code);
console.log("Patched dateFormatter.ts");
