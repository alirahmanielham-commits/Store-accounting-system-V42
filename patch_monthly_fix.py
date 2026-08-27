import re

with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

bad_decl = """  const [viewDetailsPersonId, setViewDetailsPersonId] = useState<string | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [allDailyLogs, setAllDailyLogs] = useState<any[]>([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);"""

fixed_decl = """  const [viewDetailsPersonId, setViewDetailsPersonId] = useState<string | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [allDailyLogs, setAllDailyLogs] = useState<any[]>([]);"""

code = code.replace(bad_decl, fixed_decl)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
