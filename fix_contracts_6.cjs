const fs = require('fs');
let code = fs.readFileSync('src/components/payroll/ContractsManager.tsx', 'utf-8');

// The file might be in a mess because fix_contracts_4 failed to replace the function definition,
// but it did append the new function at the bottom.
// Let's remove the appended one if it exists.
const lastExport = code.lastIndexOf('export default function ContractsManager(props) {');
if (lastExport !== -1) {
    code = code.substring(0, lastExport);
}

// Now let's rename the top function
code = code.replace(/export default function ContractsManager\(\{([^}]+)\}\) \{/g, 'function EmploymentContracts({$1}) {');

// Remove activeTab
code = code.replace(/const \[activeTab, setActiveTab\] = useState\('employment'\);\s*/g, '');

// The old tabs were removed. But we need to make sure the tab bar we had added earlier is gone.
// Let's just check if it's there.
code = code.replace(/<div className="flex border-b border-slate-200 mb-8 overflow-x-auto hide-scrollbar">[\s\S]*?<\/div>\s*<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">/, `<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">`);
code = code.replace(/<div className="flex border-b border-slate-200 mb-8 overflow-x-auto hide-scrollbar">[\s\S]*?<\/div>\s*\{activeTab === 'employment' && \(\s*<>\s*<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">/, `<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">`);

// Replace the top header from EmploymentContracts
code = code.replace(/<div className="min-h-full bg-slate-50\/50 p-4 md:p-8" dir="rtl">\s*<div className="w-full mx-auto">\s*\{\/\* Header Section \*\/\}\s*<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">\s*<div>\s*<h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">\s*<FileSignature className="w-8 h-8 text-indigo-600" \/>\s*مدیریت پیشرفته قراردادها\s*<\/h1>\s*<p className="text-sm text-slate-500 mt-2 font-medium">ثبت قرارداد به پرسنل<\/p>\s*<\/div>\s*<\/div>/, '<div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">\n      <div className="w-full mx-auto">\n');

// The very first header was removed by fix_contracts_5 but if not, above regex handles it. Wait, I did replace in fix_5!
// So it might already be gone.

// Also need to append the main export again.
code += `

export default function ContractsManager(props) {
  const { personsData, personGroups, storeSettings, showNotification, DatePicker, persian, persian_fa } = props;
  const [activeTab, setActiveTab] = React.useState('employment');
  
  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
      <div className="w-full mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <FileSignature className="w-8 h-8 text-indigo-600" />
              مدیریت پیشرفته قراردادها
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">ثبت و مدیریت قراردادهای کاری و اجاره</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-8 overflow-x-auto hide-scrollbar">
          <button 
            className={\`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap \${activeTab === 'employment' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}
            onClick={() => setActiveTab('employment')}
          >
            قراردادهای کاری
          </button>
          <button 
            className={\`px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap \${activeTab === 'rent' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}
            onClick={() => setActiveTab('rent')}
          >
            قراردادهای اجاره
          </button>
        </div>

        {activeTab === 'employment' ? (
          <div className="-mx-4 md:-mx-8 -my-4 md:-my-8 mt-0 pt-0">
            <EmploymentContracts {...props} />
          </div>
        ) : (
          <RentContractsManager {...props} />
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/payroll/ContractsManager.tsx', code);
