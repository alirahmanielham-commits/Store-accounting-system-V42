import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Imports
code = code.replace(
    "deleteContractComponent, getEmployeeProfiles } from '../../services/hrService';",
    "deleteContractComponent, getEmployeeProfiles, getWorkplaces } from '../../services/hrService';"
)

# 2. Add workplaces state
if 'const [workplaces, setWorkplaces] = useState([]);' not in code:
    code = code.replace(
        "const [employeeProfiles, setEmployeeProfiles] = useState([]);",
        "const [employeeProfiles, setEmployeeProfiles] = useState([]);\n  const [workplaces, setWorkplaces] = useState([]);"
    )

# 3. Update fetchData
code = code.replace(
    "getEmployeeProfiles()",
    "getEmployeeProfiles(),\n        getWorkplaces()"
)
code = code.replace(
    "const [emps, sals, profiles] = await Promise.all([",
    "const [emps, sals, profiles, works] = await Promise.all(["
)
if "setWorkplaces(works || []);" not in code:
    code = code.replace(
        "setSalComponents((sals || []).filter(s => s.isActive));",
        "setSalComponents((sals || []).filter(s => s.isActive));\n      setWorkplaces(works || []);"
    )

# 4. Update the contract form state initialization in the component and in the button onClick
code = code.replace(
    "status: 'active',",
    "status: 'draft',"
)
# Add workplaceId field
code = code.replace(
    "location: '',",
    "location: '',\n    workplaceId: '',"
)
code = code.replace(
    "startDate: new Date(),",
    "startDate: new Date(new Date().setHours(0,0,0,0)),"
)
code = code.replace(
    "endDate: new Date(),",
    "endDate: new Date(new Date().setHours(0,0,0,0)),"
)
code = code.replace(
    "endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),",
    "endDate: new Date(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).setHours(0,0,0,0)),"
)

# 5. Modify the button text
code = code.replace(
    '<Plus className="w-4 h-4"/> انتساب قرارداد جدید',
    '<Plus className="w-4 h-4"/> ثبت قرارداد جدید'
)
code = code.replace(
    'انتساب قرارداد به پرسنل و مدیریت اجزای حقوقی',
    'ثبت قرارداد به پرسنل'
)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied for states and headers.")
