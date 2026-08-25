import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import
if 'convertToGregorian' not in code:
    code = code.replace("import Select from 'react-select';", "import Select from 'react-select';\nimport { convertToGregorian } from '../../utils/format';")

# Replace startDate onChange
old_start = r"onChange=\{\(date: any\) => setForm\(\{\.\.\.form, startDate: date\}\)\}"
new_start = """onChange={(date: any) => {
                      if (!date) {
                          setForm(prev => ({...prev, startDate: null as any}));
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
                          setForm(prev => ({...prev, startDate: d}));
                      }
                    }}"""
code = re.sub(old_start, new_start, code)

# Replace endDate onChange
old_end = r"onChange=\{\(date: any\) => setForm\(\{\.\.\.form, endDate: date\}\)\}"
new_end = """onChange={(date: any) => {
                      if (!date) {
                          setForm(prev => ({...prev, endDate: null as any}));
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
                          setForm(prev => ({...prev, endDate: d}));
                      }
                    }}"""
code = re.sub(old_end, new_end, code)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

