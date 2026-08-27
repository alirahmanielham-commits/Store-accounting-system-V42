import os

files = [
    'src/components/payroll/EmployeeProfilesManager.tsx',
    'src/components/payroll/MonthlyAttendance.tsx',
    'src/components/payroll/PayslipsManager.tsx'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace personnelCode with personCode
    new_content = content.replace('personnelCode', 'personCode')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

print("Done")
