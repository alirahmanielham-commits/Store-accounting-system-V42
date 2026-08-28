import re

with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add shortageHours: 0 to initial state
content = re.sub(
    r"overtimeHours:\s*0,",
    "overtimeHours: 0,\n          shortageHours: 0,",
    content
)

# Add a.shortageHours = 0 inside bulk update if needed
content = re.sub(
    r"a\.overtimeHours\s*=\s*parseFloat\(overtimeCount\.toFixed\(2\)\);",
    "a.overtimeHours = parseFloat(overtimeCount.toFixed(2));\n           a.shortageHours = 0;",
    content
)

# Add column header
content = re.sub(
    r'<th className="p-3 text-center text-xs font-black text-slate-500 whitespace-nowrap">ساعات اضافه کاری</th>',
    '<th className="p-3 text-center text-xs font-black text-slate-500 whitespace-nowrap">ساعات اضافه کاری</th>\n                  <th className="p-3 text-center text-xs font-black text-slate-500 whitespace-nowrap">ساعات کسر کار</th>',
    content
)

# Add input
content = re.sub(
    r'<td className="p-3"><input type="number" min="0" value=\{a\.overtimeHours\} onChange=\{\(e\) => handleChange\(a\.personId, \'overtimeHours\', Number\(e\.target\.value\)\)\} className=\{`(.*?)`\} disabled=\{disableInputs\} /></td>',
    r'<td className="p-3"><input type="number" min="0" value={a.overtimeHours} onChange={(e) => handleChange(a.personId, \'overtimeHours\', Number(e.target.value))} className={`\1`} disabled={disableInputs} /></td>\n                          <td className="p-3"><input type="number" min="0" value={a.shortageHours || 0} onChange={(e) => handleChange(a.personId, \'shortageHours\', Number(e.target.value))} className={`\1`} disabled={disableInputs} /></td>',
    content
)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
