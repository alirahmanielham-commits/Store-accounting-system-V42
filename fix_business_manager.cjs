const fs = require('fs');
const file = 'src/components/admin/BusinessManager.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const \[newStoreName, setNewStoreName\] = useState\(''\);/, "const [newStoreName, setNewStoreName] = useState('');\n  const [newCalendarType, setNewCalendarType] = useState('jalali');");

content = content.replace(/body: JSON\.stringify\(\{ name: newStoreName \}\)/, "body: JSON.stringify({ name: newStoreName, calendarType: newCalendarType })");

// Insert the calendar dropdown before the name input or after it
const newField = `
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">نوع تقویم پایه</label>
                  <select
                    value={newCalendarType}
                    onChange={(e) => setNewCalendarType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                  >
                    <option value="jalali">شمسی (جلالی)</option>
                    <option value="gregorian">میلادی (Gregorian)</option>
                  </select>
                </div>
`;

content = content.replace(/(<label className="block text-sm font-bold text-gray-700 mb-2">\s*نام کسب و کار جدید\s*<\/label>\s*<input[^\>]+>\s*<\/div>)/, "$1\n" + newField);

fs.writeFileSync(file, content);
console.log('Fixed Business Manager');
