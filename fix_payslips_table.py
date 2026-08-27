with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add getPersonnelCode
content = content.replace("  const getPersonName = (id: string) => {\n", "  const getPersonnelCode = (id: string) => {\n    const p = (personsData || []).find((x: any) => x.id === id);\n    return p?.personnelCode ? p.personnelCode : id.substring(0, 6);\n  };\n\n  const getPersonName = (id: string) => {\n")

# Use it in the header
content = content.replace(
    "کد پرسنلی: {toPersianDigits(selectedSlip.personId.substring(0, 6))}",
    "کد پرسنلی: {toPersianDigits(getPersonnelCode(selectedSlip.personId))}"
)

# Also let's check if there is a table in PayslipsManager
if '<th className="p-4 font-bold text-slate-600">نام پرسنل</th>' in content:
    content = content.replace(
        '<th className="p-4 font-bold text-slate-600">نام پرسنل</th>',
        '<th className="p-4 font-bold text-slate-600">شماره پرسنلی</th>\n                    <th className="p-4 font-bold text-slate-600">نام پرسنل</th>'
    )
    content = content.replace(
        '<td className="p-4 font-bold text-slate-800">{getPersonName(slip.personId)}</td>',
        '<td className="p-4 font-mono text-slate-500">{toPersianDigits(getPersonnelCode(slip.personId))}</td>\n                      <td className="p-4 font-bold text-slate-800">{getPersonName(slip.personId)}</td>'
    )

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
