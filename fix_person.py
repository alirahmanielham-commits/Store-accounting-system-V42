with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const orderItems = order.items || [];" in line:
        # Check if person is defined before this in the last 20 lines
        block = "".join(lines[max(0, i-20):i])
        if "const person =" not in block:
            lines.insert(i, "        const person = (personsData || []).find(p => p.id === att.personId);\n        if (!person) continue;\n")

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write("".join(lines))
