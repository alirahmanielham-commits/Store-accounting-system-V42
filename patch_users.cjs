const fs = require('fs');
let code = fs.readFileSync('src/components/financial/checks/CheckCardPage.tsx', 'utf8');

if (!code.includes('const [users, setUsers]')) {
    code = code.replace(
        'const [accounts, setAccounts] = useState<any[]>([]);',
        'const [accounts, setAccounts] = useState<any[]>([]);\n  const [users, setUsers] = useState<any[]>([]);'
    );
    fs.writeFileSync('src/components/financial/checks/CheckCardPage.tsx', code, 'utf8');
}
