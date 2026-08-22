import re

with open('src/components/payroll/ContractsManager.tsx', 'r') as f:
    text = f.read()

# Fix the unbalanced divs
text = text.replace('                  </div>\n                </div>\n                </div>\n              )}', '                </div>\n              )}')

# Also we need to rename wizardStep === 3 to wizardStep === 2 since step 2 personnel info was removed? 
# Wait! Step 2 still exists, it has "اطلاعات پایه قرارداد" (Contract basic info) which has contract number, dates, location.
# So step 2 is NOT empty. We just removed the second div (personnel info).
# So wizardStep is still 3 steps! Wait, is step 3 still wizardStep === 3? Let's keep it wizardStep === 3 for now and check how many steps the Next button allows.
# But earlier, I saw `wizardStep < 2` for Next button? Let's check the Next/Prev buttons.

with open('src/components/payroll/ContractsManager.tsx', 'w') as f:
    f.write(text)
