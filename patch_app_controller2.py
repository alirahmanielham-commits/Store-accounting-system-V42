import re

with open('src/hooks/useAppController.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import if missing
if "autoGenerateRentCommitments" not in code:
    code = code.replace(
        "import { checkFinancialYear, fetchCurrentFinancialYear } from '../services/dataService';",
        "import { checkFinancialYear, fetchCurrentFinancialYear } from '../services/dataService';\nimport { autoGenerateRentCommitments } from '../services/hrService';"
    )
    # If the exact string above is not found, let's just do a generic replace
    if "autoGenerateRentCommitments" not in code:
        code = code.replace(
            "import { getTransactions",
            "import { autoGenerateRentCommitments } from '../services/hrService';\nimport { getTransactions"
        )

# Call it in fetchDataSilent
if "autoGenerateRentCommitments();" not in code:
    code = code.replace(
        "fetchLoansAndInstallments(),\n      ]);\n      await fetchInvoices();",
        "fetchLoansAndInstallments(),\n      ]);\n      await fetchInvoices();\n      await autoGenerateRentCommitments();"
    )

with open('src/hooks/useAppController.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
