import re

with open('src/components/payroll/ContractsManager.tsx', 'r') as f:
    text = f.read()

# 1. Update imports
text = text.replace(
    "deleteContractComponent } from '../../services/hrService';",
    "deleteContractComponent, getEmployeeProfiles } from '../../services/hrService';"
)

# 2. Add profiles state
text = text.replace(
    "const [salComponents, setSalComponents] = useState([]);",
    "const [salComponents, setSalComponents] = useState([]);\n  const [employeeProfiles, setEmployeeProfiles] = useState([]);"
)

# 3. Fetch profiles
old_fetch = """      const [emps, sals] = await Promise.all([
        getEmployeeContracts(),
        getSalaryComponents()
      ]);"""
new_fetch = """      const [emps, sals, profiles] = await Promise.all([
        getEmployeeContracts(),
        getSalaryComponents(),
        getEmployeeProfiles()
      ]);"""
text = text.replace(old_fetch, new_fetch)

text = text.replace(
    "setSalComponents(sals || []);",
    "setSalComponents(sals || []);\n      setEmployeeProfiles(profiles || []);"
)

# 4. Remove all the fields from contractForm state
text = text.replace("    insuranceNumber: '',\n", "")
text = text.replace("    insuranceType: '',\n", "")
text = text.replace("    educationLevel: '',\n", "")
text = text.replace("    experienceYears: '',\n", "")
text = text.replace("    maritalStatus: '',\n", "")
text = text.replace("    studyField: '',\n", "")
text = text.replace("    jobTitle: '',\n", "")
text = text.replace("    jobCategory: '',\n", "")
text = text.replace("    employmentType: '',\n", "")
text = text.replace("    childrenCount: '',\n", "")

text = text.replace("                              insuranceNumber: c.insuranceNumber || '',\n", "")
text = text.replace("                              insuranceType: c.insuranceType || '',\n", "")
text = text.replace("                              educationLevel: c.educationLevel || '',\n", "")
text = text.replace("                              experienceYears: c.experienceYears || '',\n", "")
text = text.replace("                              maritalStatus: c.maritalStatus || '',\n", "")
text = text.replace("                              studyField: c.studyField || '',\n", "")
text = text.replace("                              jobTitle: c.jobTitle || '',\n", "")
text = text.replace("                              jobCategory: c.jobCategory || '',\n", "")
text = text.replace("                              employmentType: c.employmentType || '',\n", "")
text = text.replace("                              childrenCount: c.childrenCount || '',", "")

# 5. Remove updating fields when person selected
updates_block = """                              if (selectedPerson) {
                                updates.insuranceNumber = selectedPerson.insuranceNumber || contractForm.insuranceNumber;
                                updates.insuranceType = selectedPerson.insuranceType || contractForm.insuranceType;
                                updates.educationLevel = selectedPerson.educationLevel || contractForm.educationLevel;
                                updates.experienceYears = selectedPerson.experienceYears ? String(selectedPerson.experienceYears) : contractForm.experienceYears;
                                updates.maritalStatus = selectedPerson.maritalStatus || contractForm.maritalStatus;
                                updates.studyField = selectedPerson.studyField || contractForm.studyField;
                                updates.jobTitle = selectedPerson.jobTitle || contractForm.jobTitle;
                                updates.jobCategory = selectedPerson.jobCategory || contractForm.jobCategory;
                                updates.employmentType = selectedPerson.employmentType || contractForm.employmentType;
                                updates.childrenCount = selectedPerson.childrenCount ? String(selectedPerson.childrenCount) : contractForm.childrenCount;
                              }"""
text = text.replace(updates_block, "")

# 6. Remove the UI block from wizard step 2
# It starts with: <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm col-span-1 md:col-span-2 mt-6">
# And ends before: </div>\n                  </div>\n                </div>\n              )}\n              {/* Step 3
# Let's use a regex to replace this specific block.
pattern = re.compile(r'<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm col-span-1 md:col-span-2 mt-6">\s*<h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">[\s\S]*?اطلاعات پرسنلی مرتبط با قرارداد[\s\S]*?</div>\s*</div>\s*</div>', re.MULTILINE)
text = pattern.sub('</div>\n                </div>', text)

# 7. Modify the `employees` for the Select option in step 1 to only include ones with completed profile.
select_pattern = r'options=\{employees\.map\(p => \(\{value: p\.id, label: p\.name\}\)\)\}'
new_select = 'options={employees.filter(p => {\n                          const prof = employeeProfiles.find(ep => ep.personId === p.id);\n                          return prof && prof.insuranceNumber && prof.jobTitle;\n                        }).map(p => ({value: p.id, label: p.name}))}'
text = text.replace(select_pattern, new_select)

with open('src/components/payroll/ContractsManager.tsx', 'w') as f:
    f.write(text)
