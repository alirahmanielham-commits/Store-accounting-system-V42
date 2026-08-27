with open('src/components/payroll/EmployeeProfilesManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<th className="p-4 font-bold">نام پرسنل</th>',
    '<th className="p-4 font-bold">شماره پرسنلی</th>\n                  <th className="p-4 font-bold">نام پرسنل</th>'
)

# We need to find the <tr> structure inside the map
# '<td className="p-4 font-bold text-slate-800">{emp.name}</td>'
content = content.replace(
    '<td className="p-4 font-bold text-slate-800">{emp.name}</td>',
    '<td className="p-4 font-mono text-slate-500">{emp.personnelCode || "-"}</td>\n                    <td className="p-4 font-bold text-slate-800">{emp.name}</td>'
)

with open('src/components/payroll/EmployeeProfilesManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
