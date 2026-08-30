import os

def fix_loading(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    if 'const [loading, setLoading] = useState(false);' not in content:
        if 'const [searchQuery, setSearchQuery] = useState("");' in content:
            content = content.replace('const [searchQuery, setSearchQuery] = useState("");', 'const [searchQuery, setSearchQuery] = useState("");\n  const [loading, setLoading] = useState(false);')
        elif "const [searchQuery, setSearchQuery] = useState('');" in content:
            content = content.replace("const [searchQuery, setSearchQuery] = useState('');", "const [searchQuery, setSearchQuery] = useState('');\n  const [loading, setLoading] = useState(false);")
        else:
            print(f"Could not automatically fix {file_path}")
            return
    with open(file_path, 'w') as f:
        f.write(content)

fix_loading('src/components/payroll/ContractsManager.tsx')
fix_loading('src/components/payroll/EmployeeOrdersManager.tsx')
fix_loading('src/components/payroll/EmployeeProfilesManager.tsx')

