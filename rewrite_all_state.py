import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace any occurrence of setContractForm({... terminating date etc...})
code = re.sub(
    r"setContractForm\(\{\s*personId:\s*null,\s*contractNumber:\s*'',\s*terminationDate:\s*null,\s*startDate:[^}]+selectedComponents:\s*\[\]\s*\}\);",
    r"setContractForm({ personId: null, contractNumber: '', startDate: new Date(new Date().setHours(0,0,0,0)), endDate: new Date(new Date().setHours(0,0,0,0)), location: '', workplaceId: '', status: 'draft' });",
    code
)

# And wipe out the old wizard step 3 entirely if it got duplicated
if "{/* Step 3: Components Assignment */}" in code:
    code = code[:code.find("{/* Step 3: Components Assignment */}")]
    code += """            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button onClick={()=>setIsContractModalOpen(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleSaveContract} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-sm shadow-emerald-200 hover:bg-emerald-700 hover:shadow-md transition-all flex items-center gap-2">
                <Check className="w-5 h-5" /> {editingContractId ? 'ثبت تغییرات' : 'ثبت نهایی'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Cleaned up everything")
