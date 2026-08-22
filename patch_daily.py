import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_stmt = "import { convertToGregorian } from '../../utils/format';\n"
if "convertToGregorian" not in content:
    content = content.replace("import Select from 'react-select';", "import Select from 'react-select';\n" + import_stmt)

old_get_ts = """  const getTimestampStr = (dateVal: any) => {
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
  };"""

new_get_ts = """  const getTimestampStr = (dateVal: any) => {
    if (!dateVal) return null;
    try {
      if (typeof dateVal === 'string') {
        const d = new Date(convertToGregorian(dateVal));
        if (!isNaN(d.getTime())) return d.getTime().toString();
      }
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
  };"""
content = content.replace(old_get_ts, new_get_ts)

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("DailyAttendanceManager patched.")
