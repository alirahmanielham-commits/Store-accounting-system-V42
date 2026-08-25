import re

with open('src/hooks/useAppController.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import if missing
if "autoGenerateRentCommitments" not in code:
    code = code.replace(
        "import { getRentContracts, getPayslips, getMonthlyAttendances } from '../services/hrService';",
        "import { getRentContracts, getPayslips, getMonthlyAttendances, autoGenerateRentCommitments } from '../services/hrService';"
    )

# Call it in fetchDataSilent
if "autoGenerateRentCommitments();" not in code:
    code = code.replace(
        "fetchLoansAndInstallments(),\n      ]);\n      await fetchInvoices();",
        "fetchLoansAndInstallments(),\n      ]);\n      await fetchInvoices();\n      await autoGenerateRentCommitments();"
    )

with open('src/hooks/useAppController.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
