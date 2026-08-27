import re

with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add state for selection
state_hook = """  const [viewDetailsPersonId, setViewDetailsPersonId] = useState<string | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);"""
code = re.sub(r'  const \[viewDetailsPersonId.*?null\);', state_hook, code)

# 2. Modify handleCalculateFromDaily
old_calc = """  const handleCalculateFromDaily = async () => {
    try {
      const dailyLogs = await getDailyAttendances();"""
new_calc = """  const handleCalculateFromDaily = async () => {
    try {
      if (selectedPersonIds.length === 0) {
        if (!window.confirm('هیچ پرسنلی انتخاب نشده است. آیا می‌خواهید کارکرد همه پرسنل لیست مجددا محاسبه شود؟')) return;
      }
      const idsToCalculate = selectedPersonIds.length > 0 ? selectedPersonIds : attendances.map(a => a.personId);

      const dailyLogs = await getDailyAttendances();"""
code = code.replace(old_calc, new_calc)

# In handleCalculateFromDaily modify the foreach to skip not selected
old_foreach = """        next.forEach(a => {
           if (a.status === 'approved') return;"""
new_foreach = """        next.forEach(a => {
           if (a.status === 'approved') return;
           if (!idsToCalculate.includes(a.personId)) return;"""
code = code.replace(old_foreach, new_foreach)

# 3. Modify handleSave
old_save = """  const handleSave = async () => {
    try {
      for (const a of attendances) {"""
new_save = """  const handleSave = async () => {
    try {
      if (selectedPersonIds.length === 0) {
        if (!window.confirm('هیچ پرسنلی انتخاب نشده است. آیا می‌خواهید کارکرد همه پرسنل ذخیره شود؟')) return;
      }
      const idsToSave = selectedPersonIds.length > 0 ? selectedPersonIds : attendances.map(a => a.personId);
      const toSave = attendances.filter(a => idsToSave.includes(a.personId));
      for (const a of toSave) {"""
code = code.replace(old_save, new_save)


# 4. Modify the table to add checkboxes
table_head = """              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="p-3 font-bold whitespace-nowrap">نام پرسنل</th>"""
new_table_head = """              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input type="checkbox" className="rounded text-indigo-600 cursor-pointer" 
                      checked={attendances.length > 0 && selectedPersonIds.length === attendances.length}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedPersonIds(attendances.map((a: any) => a.personId));
                        } else {
                          setSelectedPersonIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="p-3 font-bold whitespace-nowrap">نام پرسنل</th>"""
code = code.replace(table_head, new_table_head)

table_row = """                {attendances.map((a: any) => (
                  <tr key={a.personId} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{getPersonName(a.personId)}</td>"""
new_table_row = """                {attendances.map((a: any) => (
                  <tr key={a.personId} className={`hover:bg-slate-50 ${selectedPersonIds.includes(a.personId) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="p-3 text-center">
                      <input type="checkbox" className="rounded text-indigo-600 cursor-pointer" 
                        checked={selectedPersonIds.includes(a.personId)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedPersonIds(prev => [...prev, a.personId]);
                          } else {
                            setSelectedPersonIds(prev => prev.filter(id => id !== a.personId));
                          }
                        }}
                      />
                    </td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{getPersonName(a.personId)}</td>"""
code = code.replace(table_row, new_table_row)

old_empty = """<tr><td colSpan={8} className="p-8 text-center text-slate-500">"""
new_empty = """<tr><td colSpan={10} className="p-8 text-center text-slate-500">"""
code = code.replace(old_empty, new_empty)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
