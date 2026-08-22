import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_stmt = "import { convertToGregorian } from '../../utils/format';\n"
if "convertToGregorian" not in content:
    content = content.replace("import Select from 'react-select';", "import Select from 'react-select';\n" + import_stmt)

# Update onChange logic
def replace_onchange(old_str):
    # This regex is a bit complex, let's just do a string replace since we know the exact text
    pass

old_term = """                    onChange={(date) => {
                      if (!date) {
                          setTerminateDate(null);
                          return;
                      }
                      let d = date?.toDate?.() || new Date(date);
                      if (d && !isNaN(d.getTime())) {
                          d.setHours(0,0,0,0);
                          setTerminateDate(d);
                      }
                    }}"""
new_term = """                    onChange={(date) => {
                      if (!date) {
                          setTerminateDate(null);
                          return;
                      }
                      let d;
                      if (typeof date === 'string') {
                          d = new Date(convertToGregorian(date));
                      } else {
                          d = date?.toDate?.() || new Date(date);
                      }
                      if (d && !isNaN(d.getTime())) {
                          d.setHours(0,0,0,0);
                          setTerminateDate(d);
                      }
                    }}"""
content = content.replace(old_term, new_term)

old_start = """                    onChange={(date) => {
                      if (!date) {
                          setContractForm(prev => ({...prev, startDate: null}));
                          return;
                      }
                      let d = date?.toDate?.() || new Date(date);
                      if (d && !isNaN(d.getTime())) {
                          d.setHours(0,0,0,0);
                          setContractForm(prev => ({...prev, startDate: d}));
                      }
                    }}"""
new_start = """                    onChange={(date) => {
                      if (!date) {
                          setContractForm(prev => ({...prev, startDate: null}));
                          return;
                      }
                      let d;
                      if (typeof date === 'string') {
                          d = new Date(convertToGregorian(date));
                      } else {
                          d = date?.toDate?.() || new Date(date);
                      }
                      if (d && !isNaN(d.getTime())) {
                          d.setHours(0,0,0,0);
                          setContractForm(prev => ({...prev, startDate: d}));
                      }
                    }}"""
content = content.replace(old_start, new_start)

old_end = """                    onChange={(date) => {
                      if (!date) {
                          setContractForm(prev => ({...prev, endDate: null}));
                          return;
                      }
                      let d = date?.toDate?.() || new Date(date);
                      if (d && !isNaN(d.getTime())) {
                          d.setHours(0,0,0,0);
                          setContractForm(prev => ({...prev, endDate: d}));
                      }
                    }}"""
new_end = """                    onChange={(date) => {
                      if (!date) {
                          setContractForm(prev => ({...prev, endDate: null}));
                          return;
                      }
                      let d;
                      if (typeof date === 'string') {
                          d = new Date(convertToGregorian(date));
                      } else {
                          d = date?.toDate?.() || new Date(date);
                      }
                      if (d && !isNaN(d.getTime())) {
                          d.setHours(0,0,0,0);
                          setContractForm(prev => ({...prev, endDate: d}));
                      }
                    }}"""
content = content.replace(old_end, new_end)

# Also fix display format
old_disp_start = "{parseSafeDate(c.startDate)?.toLocaleDateString('fa-IR')}"
new_disp_start = "{parseSafeDate(c.startDate)?.toLocaleDateString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR')}"
content = content.replace(old_disp_start, new_disp_start)

old_disp_end = "{c.endDate ? parseSafeDate(c.endDate)?.toLocaleDateString('fa-IR') : 'نامحدود'}"
new_disp_end = "{c.endDate ? parseSafeDate(c.endDate)?.toLocaleDateString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR') : 'نامحدود'}"
content = content.replace(old_disp_end, new_disp_end)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Date handling properly patched.")
