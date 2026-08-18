const fs = require('fs');
let code = fs.readFileSync('src/layouts/AdminLTE/components/Header.tsx', 'utf8');

code = code.replace(/<div className=\{\`hidden sm:flex items-center px-3 py-2 text-\[15px\] rounded-md transition-colors cursor-pointer \$\{isDarkMode \? 'hover:bg-white\/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'\}\`\}>\s*<span>خانه<\/span>\s*<\/div>/, 
`<div className={\`hidden sm:flex items-center px-3 py-2 text-[15px] font-medium transition-colors \${isDarkMode ? 'text-gray-300' : 'text-gray-600'}\`}>
          <span>{appModules.find(m => m.id === systemModule)?.title || 'داشبورد'}</span>
        </div>`);

fs.writeFileSync('src/layouts/AdminLTE/components/Header.tsx', code);
