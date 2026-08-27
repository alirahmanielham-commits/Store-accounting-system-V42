import re

with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

state_target = "const [allDailyLogs, setAllDailyLogs] = useState<any[]>([]);"
state_new = """const [allDailyLogs, setAllDailyLogs] = useState<any[]>([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);"""
code = code.replace(state_target, state_new)

fetch_target = "const fetchAttendance = async () => {\n    setLoading(true);"
fetch_new = """const fetchAttendance = async () => {
    setLoading(true);
    setSelectedPersonIds([]);"""
code = code.replace(fetch_target, fetch_new)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
