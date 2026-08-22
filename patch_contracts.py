import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix overlap logic
old_overlap = """      const hasOverlap = personContracts.some(existing => {
        const exStartObj = parseSafeDate(existing.startDate);
        const exEndObj = parseSafeDate(existing.endDate);
        const exStart = exStartObj ? exStartObj.getTime() : 0;
        const exEnd = exEndObj ? exEndObj.getTime() : Infinity;
        return (newStart <= exEnd) && (newEnd >= exStart);
      });"""

new_overlap = """      const hasOverlap = personContracts.some(existing => {
        // If terminated, the effective end date is the termination date.
        const effectiveEnd = (existing.status === 'terminated' && existing.terminationDate) 
                              ? existing.terminationDate 
                              : existing.endDate;
        const exStartObj = parseSafeDate(existing.startDate);
        const exEndObj = parseSafeDate(effectiveEnd);
        
        // Exclude contracts that don't have a valid start date
        if (!exStartObj) return false;
        
        const exStart = exStartObj.getTime();
        const exEnd = exEndObj ? exEndObj.getTime() : Infinity;
        
        // Strict overlap: one starts BEFORE the other ends, AND one ends AFTER the other starts
        // Also handle the case where a contract starts exactly when another ends as NOT an overlap 
        // by using strictly less than (<) if appropriate, but <= is standard if day is inclusive.
        // Usually, if exEnd is 2024-05-10, and newStart is 2024-05-11, 2024-05-11 <= 2024-05-10 is False. No overlap.
        // If newStart is 2024-05-10, 2024-05-10 <= 2024-05-10 is True. Overlap. This is correct for inclusive days.
        return (newStart <= exEnd) && (newEnd >= exStart);
      });"""

content = content.replace(old_overlap, new_overlap)

# 2. Fix the Select options to disable incomplete profiles
# Search for options={employees.map(p => ({value: p.id, label: p.name}))}
old_options = "options={employees.map(p => ({value: p.id, label: p.name}))}"
new_options = "options={employees.map(p => ({value: p.id, label: p.name + (!p.nationalId ? ' (نقص اطلاعات - کد ملی)' : ''), isDisabled: !p.nationalId}))}"

content = content.replace(old_options, new_options)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied")
