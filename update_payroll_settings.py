import re

with open('src/components/payroll/PayrollSettings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_defaults = """const REQUIRED_DEFAULTS = [
  { id: 'daily_wage', title: 'دستمزد روزانه', type: 'earning', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: true, nature: 'continuous' },
  { id: 'housing', title: 'حق مسکن', type: 'earning', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' },
  { id: 'marriage', title: 'حق تاهل', type: 'earning', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' },
  { id: 'grocery', title: 'خوار بار', type: 'earning', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' },
  { id: 'child', title: 'حق اولاد', type: 'earning', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' }
];

const DEFAULT_COMPONENTS = [
  ...REQUIRED_DEFAULTS,
  { id: 'insurance', title: 'بیمه تامین اجتماعی (سهم کارگر)', type: 'deduction', amount: 'daily_wage * 31 * 0.07', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' },
  { id: 'tax', title: 'مالیات حقوق', type: 'deduction', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' }
];

const DEFAULT_IDS = ['daily_wage', 'housing', 'marriage', 'grocery', 'child'];
"""

# Replace DEFAULT_COMPONENTS
pattern = r"const DEFAULT_COMPONENTS = \[.*?\];"
content = re.sub(pattern, new_defaults, content, flags=re.DOTALL)

# Add logic to handleEditTemplate
edit_pattern = r"(const handleEditTemplate = \(t: any\) => \{\n\s*let migratedItems = \[\];\n.*?)(    setTemplateForm\(\{ name: t\.name \|\| '', items: migratedItems \}\);)"

new_edit_logic = r"""\1
    // Ensure all required defaults exist
    REQUIRED_DEFAULTS.forEach(rd => {
      const exists = migratedItems.find(i => i.id === rd.id);
      if (!exists) {
        migratedItems.unshift({...rd}); // Add to top or where appropriate
      }
    });

\2"""
content = re.sub(edit_pattern, new_edit_logic, content, flags=re.DOTALL)

with open('src/components/payroll/PayrollSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
