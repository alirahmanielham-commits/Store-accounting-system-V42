import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the UI block for "اطلاعات پرسنلی مرتبط با قرارداد"
ui_pattern = r'''(<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm col-span-1 md:col-span-2 mt-6">.*?)</div>\s*</div>\s*</div>\s*\)\}\s*\{\/\* Step 3: Components Assignment \*\/\}'''
ui_repl = r'''</div>
                </div>
              )}
              
              {/* Step 3: Components Assignment */}'''
content = re.sub(ui_pattern, ui_repl, content, flags=re.DOTALL)

# 2. Remove states initialization
states_pattern = r'''insuranceNumber: '',\s*insuranceType: '',\s*educationLevel: '',\s*experienceYears: '',\s*maritalStatus: '',\s*studyField: '',\s*jobTitle: '',\s*jobCategory: '',\s*employmentType: '',\s*contractType: '',\s*childrenCount: '''''
content = re.sub(states_pattern, '', content)

# 3. Remove payloadBase fields
payload_pattern = r'''insuranceNumber: contractForm\.insuranceNumber,\s*insuranceType: contractForm\.insuranceType,\s*educationLevel: contractForm\.educationLevel,\s*experienceYears: contractForm\.experienceYears,\s*maritalStatus: contractForm\.maritalStatus,\s*studyField: contractForm\.studyField,\s*jobTitle: contractForm\.jobTitle,\s*jobCategory: contractForm\.jobCategory,\s*employmentType: contractForm\.employmentType,\s*contractType: contractForm\.contractType,\s*childrenCount: contractForm\.childrenCount,'''
content = re.sub(payload_pattern, '', content)

# 4. Remove edit population
edit_pattern = r'''insuranceNumber: c\.insuranceNumber \|\| '',\s*insuranceType: c\.insuranceType \|\| '',\s*educationLevel: c\.educationLevel \|\| '',\s*experienceYears: c\.experienceYears \|\| '',\s*maritalStatus: c\.maritalStatus \|\| '',\s*studyField: c\.studyField \|\| '',\s*jobTitle: c\.jobTitle \|\| '',\s*jobCategory: c\.jobCategory \|\| '',\s*employmentType: c\.employmentType \|\| '',\s*contractType: c\.contractType \|\| '',\s*childrenCount: c\.childrenCount \|\| '''''
content = re.sub(edit_pattern, '', content)

# 5. Remove onSelect auto-fill
autofill_pattern = r'''(if \(selectedPerson\) \{).*?(\})'''
autofill_repl = r'''\1\n                                // Removed auto-fill of personnel info to contract form as they are now managed in EmployeeProfilesManager\n                              \2'''
content = re.sub(autofill_pattern, autofill_repl, content, flags=re.DOTALL)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
