with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """        const taxAmount = taxable > 12000000 ? (taxable - 12000000) * 0.1 : 0;
        const insAmount = insurable * 0.07;

        totalDeductions += taxAmount + insAmount;"""

replacement = """        const taxAmount = taxable > 12000000 ? Math.round((taxable - 12000000) * 0.1) : 0;
        const insAmount = Math.round(insurable * 0.07);

        totalDeductions += taxAmount + insAmount;"""

code = code.replace(target, replacement)
with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
