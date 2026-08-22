import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# For terminate date
old_term = """                    onChange={(date) => {
                      if (!date) {
                          setTerminateDate(null);
                          return;
                      }
                      let d;
                      if (typeof date.valueOf === 'function' && typeof date.valueOf() === 'number') {
                          d = new Date(date.valueOf());
                      } else if (date instanceof Date) {
                          d = new Date(date.getTime());
                      } else {
                          d = new Date(date);
                      }
                      if (!isNaN(d.getTime())) {
                          d.setHours(0,0,0,0);
                          setTerminateDate(d);
                      }
                    }}"""
new_term = """                    onChange={(date) => {
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
content = content.replace(old_term, new_term)

# For start date
old_start = """                    onChange={(date) => {
                      if (!date) {
                          setContractForm(prev => ({...prev, startDate: null}));
                          return;
                      }
                      let d;
                      if (typeof date.valueOf === 'function' && typeof date.valueOf() === 'number') {
                          d = new Date(date.valueOf());
                      } else if (date instanceof Date) {
                          d = new Date(date.getTime());
                      } else {
                          d = new Date(date);
                      }
                      if (!isNaN(d.getTime())) {
                          d.setHours(0,0,0,0);
                          setContractForm(prev => ({...prev, startDate: d}));
                      }
                    }}"""
new_start = """                    onChange={(date) => {
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
content = content.replace(old_start, new_start)

# For end date
old_end = """                    onChange={(date) => {
                      if (!date) {
                          setContractForm(prev => ({...prev, endDate: null}));
                          return;
                      }
                      let d;
                      if (typeof date.valueOf === 'function' && typeof date.valueOf() === 'number') {
                          d = new Date(date.valueOf());
                      } else if (date instanceof Date) {
                          d = new Date(date.getTime());
                      } else {
                          d = new Date(date);
                      }
                      if (!isNaN(d.getTime())) {
                          d.setHours(0,0,0,0);
                          setContractForm(prev => ({...prev, endDate: d}));
                      }
                    }}"""
new_end = """                    onChange={(date) => {
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
content = content.replace(old_end, new_end)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Date parsing patched.")
