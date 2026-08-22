import re

with open('src/components/payroll/ContractsManager.tsx', 'r') as f:
    text = f.read()

# 1. Remove references to these fields in handleSaveContract
fields_to_remove = [
    'insuranceNumber', 'insuranceType', 'educationLevel', 'experienceYears', 
    'maritalStatus', 'studyField', 'jobTitle', 'jobCategory', 'employmentType'
]
for field in fields_to_remove:
    # Remove lines like: insuranceNumber: contractForm.insuranceNumber,
    text = re.sub(r'\s*' + field + r':\s*contractForm\.' + field + r',?', '', text)

# Remove `childrenCount: contractForm.childrenCount,` separately since childrenCount could be numeric parsing
text = re.sub(r'\s*childrenCount:\s*contractForm\.childrenCount,?', '', text)
text = re.sub(r'\s*childrenCount:\s*Number\(contractForm\.childrenCount\) \|\| 0,?', '', text)

# 2. Append wizardStep === 3
# First, let's find the closing tags of step 2.
# We know currently it ends with `              )}` followed by some buttons.
# Let's insert step 3 before the buttons.
# The buttons block starts with: `<div className="flex items-center gap-3">`
# Let's insert exactly before `              <div className="flex items-center gap-3">`

step3_code = """
              {/* Step 3: Components Assignment */}
              {wizardStep === 3 && (
                <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-slate-50 border-b border-slate-200 p-5">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><Building className="w-5 h-5 text-indigo-500"/> مدیریت اجزای حقوقی و کسورات در این قرارداد</h4>
                    <p className="text-sm text-slate-500 mt-2">آیتم‌های مورد نظر را برای این قرارداد فعال کنید. مقادیر پیش‌فرض از تنظیمات حقوق خوانده می‌شود، اما می‌توانید مبلغ، درصد یا فرمول اختصاصی تعریف کنید.</p>
                  </div>
                  
                  <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {salComponents.map(comp => {
                      const scData = contractForm.selectedComponents.find(sc => sc.componentId === comp.id);
                      const isSelected = !!scData;
                      return (
                        <div key={comp.id} className={`p-5 border rounded-2xl flex flex-col lg:flex-row lg:items-center gap-5 transition-all ${isSelected ? 'bg-indigo-50/40 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          
                          <label className="flex items-center gap-4 font-bold min-w-[240px] cursor-pointer group">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <input type="checkbox" checked={isSelected} onChange={(e) => {
                              if (e.target.checked) {
                                setContractForm({...contractForm, selectedComponents: [...contractForm.selectedComponents, { componentId: comp.id, overrideAmount: '', overrideFormula: '' }]});
                              } else {
                                setContractForm({...contractForm, selectedComponents: contractForm.selectedComponents.filter(sc => sc.componentId !== comp.id)});
                              }
                            }} className="hidden" />
                            <div className="flex flex-col">
                              <span className={isSelected ? 'text-indigo-900 text-base' : 'text-slate-700 text-base'}>{comp.title} {comp.isBaseSalary && <span className="mr-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">پایه</span>}</span>
                              <span className="text-xs text-slate-400 mt-1">{comp.type === 'earning' ? 'مزایا' : 'کسورات'} • {
                                comp.calculationType === 'fixed' ? 'مبلغ ثابت' : 
                                comp.calculationType === 'percentage' ? 'درصدی' : 'فرمول محاسباتی'
                              }</span>
                            </div>
                          </label>
                          
                          {isSelected && (
                            <div className="flex-1 flex gap-3 mt-3 lg:mt-0 animate-in fade-in slide-in-from-right-4 duration-200">
                              {comp.calculationType === 'fixed' && (
                                <div className="flex-1">
                                  <label className="block text-xs font-bold text-slate-500 mb-1.5">مبلغ جایگزین (ریال)</label>
                                  <input type="number" value={scData.overrideAmount || ''} onChange={e => {
                                    const newSelected = contractForm.selectedComponents.map(sc => sc.componentId === comp.id ? {...sc, overrideAmount: e.target.value} : sc);
                                    setContractForm({...contractForm, selectedComponents: newSelected});
                                  }} className="w-full border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-indigo-500 text-sm font-mono" placeholder={comp.amount ? comp.amount.toString() : 'مبلغ پیش فرض...'} />
                                </div>
                              )}
                              
                              {comp.calculationType === 'percentage' && (
                                <div className="flex-1">
                                  <label className="block text-xs font-bold text-slate-500 mb-1.5">درصد جایگزین</label>
                                  <input type="number" value={scData.overrideAmount || ''} onChange={e => {
                                    const newSelected = contractForm.selectedComponents.map(sc => sc.componentId === comp.id ? {...sc, overrideAmount: e.target.value} : sc);
                                    setContractForm({...contractForm, selectedComponents: newSelected});
                                  }} className="w-full border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-indigo-500 text-sm font-mono" placeholder={comp.percentage ? comp.percentage.toString() : 'درصد پیش فرض...'} />
                                </div>
                              )}
                              
                              {comp.calculationType === 'formula' && (
                                <div className="flex-1">
                                  <label className="block text-xs font-bold text-slate-500 mb-1.5">فرمول محاسباتی</label>
                                  <input type="text" value={scData.overrideFormula || ''} onChange={e => {
                                    const newSelected = contractForm.selectedComponents.map(sc => sc.componentId === comp.id ? {...sc, overrideFormula: e.target.value} : sc);
                                    setContractForm({...contractForm, selectedComponents: newSelected});
                                  }} className="w-full border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-indigo-500 text-sm text-left" dir="ltr" placeholder={comp.formula || 'مثال: B * 0.1'} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
"""

text = text.replace('              <div className="flex items-center gap-3">', step3_code + '\n              <div className="flex items-center gap-3">')

# 3. Wizard Step max is 3, but I want it to be only 2 steps now? 
# Wait, "Step 2" is now just the Contract Base Info (contractNumber, location, dates).
# We can rename wizardStep === 3 to wizardStep === 2 and just have 2 steps!
# Wait! Previously Step 1 was Employees Selection, Step 2 was Base Info + Personnel Info, Step 3 was Components!
# If we keep Base Info as Step 2, and we add Components inside Step 2, we can just have 2 steps!
# But Base Info and Components are quite long. Keeping 3 steps is fine. Step 1: select person. Step 2: Base Info. Step 3: components.
# Let's fix the Next button: `wizardStep < 3` instead of `wizardStep < 2` if it was 2.
text = text.replace('wizardStep < 2 ?', 'wizardStep < 3 ?')

with open('src/components/payroll/ContractsManager.tsx', 'w') as f:
    f.write(text)
