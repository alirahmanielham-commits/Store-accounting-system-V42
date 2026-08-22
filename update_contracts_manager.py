import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add parseSafeDate helper
if 'const parseSafeDate' not in content:
    content = content.replace(
        "const [searchQuery, setSearchQuery] = useState('');",
        "const [searchQuery, setSearchQuery] = useState('');\n\n  const parseSafeDate = (val) => {\n    if (!val) return null;\n    const num = Number(val);\n    const dateObj = !isNaN(num) ? new Date(num) : new Date(val);\n    return isNaN(dateObj.getTime()) ? null : dateObj;\n  };\n"
    )

# 2. Replace getTimestampStr with getIsoDateStr in handleSaveContract
old_getTimestampStr = """      const getTimestampStr = (dateVal) => {
        if (!dateVal) return null;
        try {
          if (typeof dateVal.valueOf === 'function') {
            const val = dateVal.valueOf();
            if (typeof val === 'number' && !isNaN(val)) return val.toString();
          }
          if (typeof dateVal.toUnix === 'function') return (dateVal.toUnix() * 1000).toString();
          if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime().toString();
          if (dateVal instanceof Date) return dateVal.getTime().toString();
          const parsed = new Date(dateVal).getTime();
          if (!isNaN(parsed)) return parsed.toString();
          return null;
        } catch(e) {
          return null;
        }
      };
      
      const startDateStr = getTimestampStr(contractForm.startDate);
      const endDateStr = getTimestampStr(contractForm.endDate);
      

      if (!startDateStr) return showNotification('تاریخ شروع قرارداد الزامی است', 'error');

      // Overlap validation
      const personContracts = contracts.filter(c => c.personId === contractForm.personId.value && c.id !== editingContractId);
      const newStart = Number(startDateStr);
      const newEnd = endDateStr ? Number(endDateStr) : Infinity;

      const hasOverlap = personContracts.some(existing => {
        const exStart = Number(existing.startDate);
        const exEnd = existing.endDate ? Number(existing.endDate) : Infinity;
        return (newStart <= exEnd) && (newEnd >= exStart);
      });"""

new_getIsoDateStr = """      const getIsoDateStr = (dateVal) => {
        if (!dateVal) return null;
        try {
          if (dateVal instanceof Date) return dateVal.toISOString();
          if (typeof dateVal.toDate === 'function') return dateVal.toDate().toISOString();
          const parsed = new Date(dateVal);
          if (!isNaN(parsed.getTime())) return parsed.toISOString();
          return null;
        } catch(e) {
          return null;
        }
      };
      
      const startDateIso = getIsoDateStr(contractForm.startDate);
      const endDateIso = getIsoDateStr(contractForm.endDate);

      if (!startDateIso) return showNotification('تاریخ شروع قرارداد الزامی است', 'error');

      // Overlap validation
      const personContracts = contracts.filter(c => c.personId === contractForm.personId.value && c.id !== editingContractId);
      const newStart = new Date(startDateIso).getTime();
      const newEnd = endDateIso ? new Date(endDateIso).getTime() : Infinity;

      const hasOverlap = personContracts.some(existing => {
        const exStartObj = parseSafeDate(existing.startDate);
        const exEndObj = parseSafeDate(existing.endDate);
        const exStart = exStartObj ? exStartObj.getTime() : 0;
        const exEnd = exEndObj ? exEndObj.getTime() : Infinity;
        return (newStart <= exEnd) && (newEnd >= exStart);
      });"""

content = content.replace(old_getTimestampStr, new_getIsoDateStr)

# 3. Fix handleSaveContract payload
content = content.replace("startDate: startDateStr,", "startDate: startDateIso,")
content = content.replace("endDate: endDateStr,", "endDate: endDateIso,")

# 4. Fix list view rendering - find parseInt
content = content.replace("new Date(parseInt(c.startDate))", "parseSafeDate(c.startDate)")
content = content.replace("new Date(parseInt(c.endDate))", "parseSafeDate(c.endDate)")

# 5. Fix edit modal - fix DatePicker onChange and value settings
content = re.sub(
    r"onChange=\{\(date\) => \{\s*if\(date\) \{\s*const d = new Date\(date\.valueOf\(\)\);\s*d\.setHours\(0,0,0,0\);\s*setContractForm\(\{\.\.\.contractForm, startDate: d\}\);\s*\} else \{\s*setContractForm\(\{\.\.\.contractForm, startDate: null\}\);\s*\}\s*\}\}",
    """onChange={(date) => {
                        if(date) {
                            const d = (date && typeof date.toDate === 'function') ? date.toDate() : new Date(date);
                            d.setHours(0,0,0,0);
                            setContractForm({...contractForm, startDate: d});
                        } else {
                            setContractForm({...contractForm, startDate: null});
                        }
                     }}""",
    content
)

content = re.sub(
    r"onChange=\{\(date\) => \{\s*if\(date\) \{\s*const d = new Date\(date\.valueOf\(\)\);\s*d\.setHours\(0,0,0,0\);\s*setContractForm\(\{\.\.\.contractForm, endDate: d\}\);\s*\} else \{\s*setContractForm\(\{\.\.\.contractForm, endDate: null\}\);\s*\}\s*\}\}",
    """onChange={(date) => {
                        if(date) {
                            const d = (date && typeof date.toDate === 'function') ? date.toDate() : new Date(date);
                            d.setHours(0,0,0,0);
                            setContractForm({...contractForm, endDate: d});
                        } else {
                            setContractForm({...contractForm, endDate: null});
                        }
                     }}""",
    content
)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("ContractsManager patched")
