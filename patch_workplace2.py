with open('src/components/payroll/WorkplaceManagerModal.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "await addWorkplace(defaultWorkplace);" in line and skip == False:
        skip = True
        continue
    
    if skip:
        if "useEffect(() => {" in line:
            skip = False
            new_lines.append(line)
        continue
    
    new_lines.append(line)

with open('src/components/payroll/WorkplaceManagerModal.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
