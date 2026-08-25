import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add expenseAccountId to state
code = code.replace(
    "paymentDay: '',",
    "paymentDay: '',\n    expenseAccountId: '',"
)

# Load it in handleEdit
code = code.replace(
    "paymentDay: c.paymentDay || '',",
    "paymentDay: c.paymentDay || '',\n      expenseAccountId: c.expenseAccountId || '',"
)

# Save it in payload
code = code.replace(
    "paymentDay: pDay,",
    "paymentDay: pDay,\n        expenseAccountId: form.expenseAccountId,"
)

# Insert HTML field for it before or after paymentDay
expense_html = """
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">حساب هزینه (برای صدور اتوماتیک)</label>
                  <Select
                    options={ledgerAccounts.map(a => ({ value: a.id, label: `${a.code} - ${a.title}` }))}
                    value={form.expenseAccountId ? { value: form.expenseAccountId, label: ledgerAccounts.find(a => String(a.id) === String(form.expenseAccountId))?.title } : null}
                    onChange={(val: any) => setForm({ ...form, expenseAccountId: val?.value || '' })}
                    placeholder="انتخاب حساب..."
                    className="text-sm font-bold"
                  />
                </div>
"""

# let's inject after paymentDay
code = code.replace(
    'isAllowed={(values) => {\n                      const { floatValue } = values;\n                      return floatValue === undefined || (floatValue >= 1 && floatValue <= 31);\n                    }}\n                  />\n                </div>',
    'isAllowed={(values) => {\n                      const { floatValue } = values;\n                      return floatValue === undefined || (floatValue >= 1 && floatValue <= 31);\n                    }}\n                  />\n                </div>' + expense_html
)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
