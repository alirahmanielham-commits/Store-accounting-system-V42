import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

state_insertion = """  const [searchQuery, setSearchQuery] = useState('');
  const [issueDocModal, setIssueDocModal] = useState<any>(null);
  const [docForm, setDocForm] = useState({ date: new Date(), amount: '', description: '', ledgerAccountId: '' });
  const [ledgerAccounts, setLedgerAccounts] = useState<any[]>([]);
  const [reportModal, setReportModal] = useState<any>(null);
  const [reportData, setReportData] = useState<any>({ docs: [], transactions: [] });"""

code = code.replace("  const [searchQuery, setSearchQuery] = useState('');", state_insertion)

fetch_insertion = """  const fetchData = async () => {
    try {
      const data = await getRentContracts();
      setContracts(data || []);
      const accs = await getLedgerAccounts();
      setLedgerAccounts(accs || []);
    } catch (e) {
      console.error(e);
    }
  };"""

code = re.sub(r"const fetchData = async \(\) => \{[\s\S]*?setContracts\(data \|\| \[\]\);\n\s*\} catch \(e\) \{\n\s*console\.error\(e\);\n\s*\}\n\s*\};", fetch_insertion, code)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
