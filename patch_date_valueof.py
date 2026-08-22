import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"if \(typeof date\.toDate === 'function'\) \{\s*d = new Date\(date\.toDate\(\)\.getTime\(\)\);\s*\}\s*else if \(date instanceof Date\) \{\s*d = new Date\(date\.getTime\(\)\);\s*\}\s*else \{\s*d = new Date\(date\);\s*\}",
    r"if (typeof date.valueOf === 'function' && typeof date.valueOf() === 'number') {\n                          d = new Date(date.valueOf());\n                      } else if (date instanceof Date) {\n                          d = new Date(date.getTime());\n                      } else {\n                          d = new Date(date);\n                      }",
    content
)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("ValueOf patched")
