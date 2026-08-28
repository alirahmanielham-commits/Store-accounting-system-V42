with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('          </div>\n    );\n  }\n\n  return (', '          </div>\n        </div>\n    );\n  }\n\n  return (')

content = content.replace('      </div>\n    );\n  }\n\n', '      </div>\n    </div>\n    );\n  }\n\n')

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
