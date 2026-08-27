with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """             }
          }

          if (val > 0 || val < 0) {"""
replacement = """             }
          }
          
          val = Math.round(val); // round to nearest integer

          if (val > 0 || val < 0) {"""

code = code.replace(target, replacement)
with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
