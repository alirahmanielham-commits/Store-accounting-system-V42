import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import getEmployeeContracts
content = content.replace("getLeaves, getMissions", "getLeaves, getMissions, getEmployeeContracts")

# 2. Add contracts state
content = content.replace("const [missions, setMissions] = useState<any[]>([]);", "const [missions, setMissions] = useState<any[]>([]);\n  const [contracts, setContracts] = useState<any[]>([]);")

# 3. Load contracts
old_fetch = """      const [att, lv, mis] = await Promise.all([
        getDailyAttendances(),
        getLeaves(),
        getMissions()
      ]);
      setAttendances(att);
      setLeaves(lv);
      setMissions(mis);"""
new_fetch = """      const [att, lv, mis, cnt] = await Promise.all([
        getDailyAttendances(),
        getLeaves(),
        getMissions(),
        getEmployeeContracts()
      ]);
      setAttendances(att);
      setLeaves(lv);
      setMissions(mis);
      setContracts(cnt);"""
content = content.replace(old_fetch, new_fetch)

# 4. Helper function to check termination date
helper = """  const checkTermination = (personId: string, dateIso: string) => {
    const personContracts = contracts.filter(c => c.personId === personId);
    if (personContracts.length === 0) return false;
    // If they have any active contract, they are not terminated.
    if (personContracts.some(c => c.status === 'active')) return false;
    // Find the latest terminated contract
    const terminated = personContracts.filter(c => c.status === 'terminated' && c.terminationDate).sort((a,b) => (new Date(b.terminationDate).getTime()) - (new Date(a.terminationDate).getTime()));
    if (terminated.length > 0) {
      const tDate = new Date(terminated[0].terminationDate);
      tDate.setHours(0,0,0,0);
      const targetDate = new Date(dateIso);
      targetDate.setHours(0,0,0,0);
      if (targetDate.getTime() > tDate.getTime()) {
        return true;
      }
    }
    return false;
  };

  const handleSaveAttendance ="""
content = content.replace("  const handleSaveAttendance =", helper)

# 5. Use helper in handleSaveAttendance
old_att_save = """    if (!currentDayStr) return;"""
new_att_save = """    if (!currentDayStr) return;
    if (checkTermination(form.personId, currentDayStr)) return showNotification('این شخص ترک کار کرده است و امکان ثبت داده بعد از تاریخ ترک کار وجود ندارد', 'error');"""
content = content.replace(old_att_save, new_att_save)

# 6. Use helper in handleSaveLeave
old_leave_save = """    if (!tsStart || !tsEnd || parseInt(tsStart) > parseInt(tsEnd)) return showNotification('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد', 'error');"""
new_leave_save = """    if (!tsStart || !tsEnd || parseInt(tsStart) > parseInt(tsEnd)) return showNotification('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد', 'error');
    if (checkTermination(leaveForm.personId, tsEnd)) return showNotification('این شخص ترک کار کرده است و امکان ثبت داده بعد از تاریخ ترک کار وجود ندارد', 'error');"""
content = content.replace(old_leave_save, new_leave_save)

# 7. Use helper in handleSaveMission
old_mission_save = """    if (!tsStart || !tsEnd || parseInt(tsStart) > parseInt(tsEnd)) return showNotification('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد', 'error');"""
new_mission_save = """    if (!tsStart || !tsEnd || parseInt(tsStart) > parseInt(tsEnd)) return showNotification('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد', 'error');
    if (checkTermination(missionForm.personId, tsEnd)) return showNotification('این شخص ترک کار کرده است و امکان ثبت داده بعد از تاریخ ترک کار وجود ندارد', 'error');"""
content = content.replace(old_mission_save, new_mission_save)

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
