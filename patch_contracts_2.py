import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "// Employee details specific to contract" in line:
        skip = True
        continue
    
    if skip:
        if "childrenCount: ''" in line or "childrenCount: c.childrenCount || ''" in line or "childrenCount: contractForm.childrenCount," in line:
            skip = False
            continue
        if "childrenCount: contractForm.childrenCount," in line:
            skip = False
            continue
        # Also handle the edit population area
        if "insuranceNumber:" in line:
            continue
        if "insuranceType:" in line:
            continue
        if "educationLevel:" in line:
            continue
        if "experienceYears:" in line:
            continue
        if "maritalStatus:" in line:
            continue
        if "studyField:" in line:
            continue
        if "jobTitle:" in line:
            continue
        if "jobCategory:" in line:
            continue
        if "employmentType:" in line:
            continue
        if "contractType:" in line:
            continue
        if "childrenCount:" in line:
            skip = False
            continue
            
    new_lines.append(line)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
