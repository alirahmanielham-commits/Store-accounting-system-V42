import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add imports
if 'getLedgerAccounts' not in code:
    code = code.replace(
        "import { NumericFormat } from 'react-number-format';",
        "import { NumericFormat } from 'react-number-format';\nimport { getLedgerAccounts, addAccountingDocument, getAccountingDocuments, getTransactions } from '../../services/dataService';\nimport { Eye } from 'lucide-react';"
    )

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
