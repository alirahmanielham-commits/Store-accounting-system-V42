const fs = require('fs');

let header = fs.readFileSync('src/layouts/AdminLTE/components/Header.tsx', 'utf8');

header = header.replace(
  "import { Menu, Settings, Bell, Search, Moon, Sun, Power } from 'lucide-react';",
  "import { Menu, Settings, Bell, Search, Moon, Sun, Power, AlertTriangle } from 'lucide-react';\nimport { useMemo } from 'react';"
);

header = header.replace(
  "const { storeSettings, user, signOut } = appState;",
  `const { storeSettings, user, signOut, issuedChecks, receivedChecks } = appState;
  
  const nearDueChecksCount = useMemo(() => {
    let count = 0;
    const today = new Date();
    const thresholdDays = 7;
    const thresholdTime = thresholdDays * 24 * 60 * 60 * 1000;

    const allChecks = [...(issuedChecks || []), ...(receivedChecks || [])];
    allChecks.forEach(check => {
      if (['issued', 'received', 'deposited', 'assigned'].includes(check.status)) {
         if (check.dueDate) {
            const dueDate = new Date(check.dueDate);
            const diff = dueDate.getTime() - today.getTime();
            if (diff <= thresholdTime) {
               count++;
            }
         }
      }
    });
    return count;
  }, [issuedChecks, receivedChecks]);`
);

header = header.replace(
  '<Bell className="w-5 h-5" />',
  `<Bell className="w-5 h-5" />
        </button>
        <button className={\`p-2 rounded-md transition-colors relative \${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}\`}>
          <AlertTriangle className={\`w-5 h-5 \${nearDueChecksCount > 0 ? 'text-amber-500' : ''}\`} />
          {nearDueChecksCount > 0 && <span className="absolute top-1.5 right-1.5 bg-[#dc3545] text-white text-[10px] min-w-[15px] h-[15px] flex items-center justify-center rounded-full font-bold px-1">{nearDueChecksCount}</span>}`
);

fs.writeFileSync('src/layouts/AdminLTE/components/Header.tsx', header);
console.log('Patched Header.tsx');
