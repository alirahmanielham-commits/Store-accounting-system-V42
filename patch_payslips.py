import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_generate = """  const handleGenerate = async () => {
    setLoading(true);
    try {
      const attendances = allAttendances;"""

new_generate = """  const handleGenerate = async () => {
    setLoading(true);
    try {
      const allAtts = await getMonthlyAttendances();
      const attendances = allAtts.filter(a => Number(a.periodYear) === Number(year) && Number(a.periodMonth) === Number(month));
      setAllAttendances(attendances);"""

code = code.replace(old_generate, new_generate)

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
