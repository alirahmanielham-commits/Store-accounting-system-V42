import re

with open('src/services/hrService.ts', 'r', encoding='utf-8') as f:
    code = f.read()

if "addAccountingDocument" not in code.split('export const getPayslips')[0]:
    code = code.replace("import { convertToGregorian } from '../utils/format';", "import { convertToGregorian } from '../utils/format';\nimport { addAccountingDocument, getAccountingDocuments } from './dataService';")

with open('src/services/hrService.ts', 'w', encoding='utf-8') as f:
    f.write(code)
