with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix getPersonnelCode
func = """
  const getPersonnelCode = (id) => {
    const p = (personsData || []).find(x => x.id === id);
    return p?.personnelCode ? p.personnelCode : id.substring(0, 6);
  };
"""
content = content.replace("  const getPersonName = (id) => {", func + "\n  const getPersonName = (id) => {")

# Fix line 39
content = content.replace("await handleGenerate();", "await handleGenerate([editAttendanceForm.personId]);")

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

