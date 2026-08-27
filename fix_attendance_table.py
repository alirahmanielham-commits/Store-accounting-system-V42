with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add a getPersonnelCode function right under getPersonName
code_func = """
  const getPersonName = (id: string) => {
    const p = (personsData || []).find((x: any) => x.id === id);
    return p ? p.name : 'ناشناس';
  };
  
  const getPersonnelCode = (id: string) => {
    const p = (personsData || []).find((x: any) => x.id === id);
    return p?.personnelCode ? p.personnelCode : id.substring(0, 6);
  };
"""
content = content.replace("  const getPersonName = (id: string) => {", "  const getPersonnelCode = (id: string) => {\n    const p = (personsData || []).find((x: any) => x.id === id);\n    return p?.personnelCode ? p.personnelCode : id.substring(0, 6);\n  };\n\n  const getPersonName = (id: string) => {")

# Add the column header
header_old = '<th className="p-3 font-bold whitespace-nowrap">نام پرسنل</th>'
header_new = '<th className="p-3 font-bold whitespace-nowrap">شماره پرسنلی</th>\n                  <th className="p-3 font-bold whitespace-nowrap">نام پرسنل</th>'
content = content.replace(header_old, header_new)

# Add the column cell
cell_old = '<td className="p-3 font-bold text-slate-800 whitespace-nowrap">{getPersonName(a.personId)}</td>'
cell_new = '<td className="p-3 font-mono text-slate-500 whitespace-nowrap">{getPersonnelCode(a.personId)}</td>\n                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{getPersonName(a.personId)}</td>'
content = content.replace(cell_old, cell_new)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

