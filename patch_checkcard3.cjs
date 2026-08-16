const fs = require('fs');
let code = fs.readFileSync('src/components/financial/checks/CheckCardPage.tsx', 'utf8');

// First replace checkType prop destructuring and add internal state
const propTarget = `checkType: "issued" | "received";`;
code = code.replace(propTarget, `checkType: "issued" | "received" | undefined;`);

const propTarget2 = `checkType,\n  onClose,`;
code = code.replace(propTarget2, `checkType: initialCheckType,\n  onClose,`);

const stateTarget = `const [currentCheckId, setCurrentCheckId] = useState(checkId);`;
const stateReplacement = `const [currentCheckId, setCurrentCheckId] = useState(checkId);\n  const [checkType, setCheckType] = useState<"issued" | "received">(initialCheckType || 'issued');`;

code = code.replace(stateTarget, stateReplacement);

// Now update the empty state render
const renderTarget = `if (!check) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 max-w-[1400px] w-full mx-auto h-full overflow-y-auto" dir="rtl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-black text-slate-800 tracking-tight font-display">
              جستجو و انتخاب پرونده چک
            </h1>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md relative">
            <div className="relative w-full">
              <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="جستجوی شماره چک یا مبلغ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {isDropdownOpen && filteredChecks.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto z-50">
                  {filteredChecks.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                         setCurrentCheckId(c.id);
                         setSearchQuery('');
                         setIsDropdownOpen(false);
                      }}
                      className="w-full text-right p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{c.checkNumber}</span>
                        <span className="text-xs text-slate-400">{persons.find(p => p.id === (checkType === "received" ? c.payerId : c.payeeId))?.name || 'ناشناس'}</span>
                      </div>
                      <span className="text-indigo-600 font-bold text-sm">{Number(c.amount).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-indigo-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-600">یک چک را برای مشاهده پرونده انتخاب کنید</h2>
          <p className="text-slate-400 mt-2">می‌توانید از کادر جستجوی بالا استفاده نمایید</p>
        </div>
      </motion.div>
    );
  }`;

const renderReplacement = `if (!check) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 max-w-[1400px] w-full mx-auto h-full overflow-y-auto" dir="rtl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-black text-slate-800 tracking-tight font-display">
              جستجو و انتخاب پرونده چک
            </h1>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md relative">
            <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
                <button 
                  onClick={() => {
                     setCheckType('issued');
                     setCurrentCheckId(null);
                     setSearchQuery('');
                  }}
                  className={\`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors \${checkType === 'issued' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}\`}
                >
                  پرداختی
                </button>
                <button 
                  onClick={() => {
                     setCheckType('received');
                     setCurrentCheckId(null);
                     setSearchQuery('');
                  }}
                  className={\`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors \${checkType === 'received' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}\`}
                >
                  دریافتی
                </button>
            </div>
            <div className="relative w-full">
              <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="جستجوی شماره چک یا مبلغ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {isDropdownOpen && filteredChecks.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto z-50">
                  {filteredChecks.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                         setCurrentCheckId(c.id);
                         setSearchQuery('');
                         setIsDropdownOpen(false);
                      }}
                      className="w-full text-right p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{c.checkNumber}</span>
                        <span className="text-xs text-slate-400">{persons.find(p => p.id === (checkType === "received" ? c.payerId : c.payeeId))?.name || 'ناشناس'}</span>
                      </div>
                      <span className="text-indigo-600 font-bold text-sm">{Number(c.amount).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-indigo-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-600">یک چک را برای مشاهده پرونده انتخاب کنید</h2>
          <p className="text-slate-400 mt-2">ابتدا نوع چک (پرداختی/دریافتی) را مشخص کرده و سپس در کادر بالا جستجو کنید</p>
        </div>
      </motion.div>
    );
  }`;

code = code.replace(renderTarget, renderReplacement);
fs.writeFileSync('src/components/financial/checks/CheckCardPage.tsx', code, 'utf8');
console.log("Patched full search layout");
