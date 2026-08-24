import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add depositAmount to form
code = re.sub(
    r"monthlyAmount: '',\n\s*description:",
    "monthlyAmount: '',\n    depositAmount: '',\n    description:",
    code
)

code = re.sub(
    r"monthlyAmount: c.monthlyAmount \|\| '',\n\s*description:",
    "monthlyAmount: c.monthlyAmount || '',\n                          depositAmount: c.depositAmount || '',\n                          description:",
    code
)

# Add depositAmount to payload
code = re.sub(
    r"monthlyAmount: Number\(form\.monthlyAmount\),\n\s*description:",
    "monthlyAmount: Number(form.monthlyAmount),\n        depositAmount: Number(form.depositAmount),\n        description:",
    code
)

# Add numeric format import if not exists
if "NumericFormat" not in code:
    code = code.replace(
        "import Select from 'react-select';",
        "import Select from 'react-select';\nimport { NumericFormat } from 'react-number-format';"
    )

# Change monthlyAmount table column to include deposit
code = re.sub(
    r'<th className="p-4 font-bold text-center">مبلغ ماهانه \(ریال\)</th>',
    '<th className="p-4 font-bold text-center">مبالغ قرارداد</th>',
    code
)

code = re.sub(
    r'<td className="p-4 text-center font-bold text-emerald-600">\{Number\(c.monthlyAmount\)\.toLocaleString\(\)\}</td>',
    '''<td className="p-4 text-center text-sm">
                    <div className="flex flex-col gap-1 items-center">
                      <span className="font-bold text-emerald-600" title="اجاره ماهانه">{Number(c.monthlyAmount).toLocaleString()} {storeSettings?.currency || 'ریال'}</span>
                      {c.depositAmount ? <span className="text-xs text-amber-600" title="ودیعه">(ودیعه: {Number(c.depositAmount).toLocaleString()} {storeSettings?.currency || 'ریال'})</span> : null}
                    </div>
                  </td>''',
    code
)

# Change monthlyAmount input to NumericFormat and add depositAmount
old_monthly_input = r'''<div>\s*<label className="block text-sm font-bold text-slate-700 mb-2">مبلغ ماهانه تعهد \(ریال\) <span className="text-rose-500">\*</span></label>\s*<input\s*type="number"\s*value=\{form\.monthlyAmount\}\s*onChange=\{e => setForm\(\{\.\.\.form, monthlyAmount: e\.target\.value\}\)\}\s*className="w-full border border-slate-200 rounded-xl p-\[9px\] outline-none focus:border-indigo-500 text-left"\s*placeholder="0"\s*dir="ltr"\s*/>\s*</div>'''

new_monthly_input = '''<div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">مبلغ ماهانه تعهد ({storeSettings?.currency || 'ریال'}) <span className="text-rose-500">*</span></label>
                  <NumericFormat 
                    value={form.monthlyAmount}
                    onValueChange={(values) => setForm({...form, monthlyAmount: values.value})}
                    thousandSeparator=","
                    className="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500 text-left"
                    placeholder="0"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">مبلغ ودیعه/پیش‌پرداخت ({storeSettings?.currency || 'ریال'})</label>
                  <NumericFormat 
                    value={form.depositAmount}
                    onValueChange={(values) => setForm({...form, depositAmount: values.value})}
                    thousandSeparator=","
                    className="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500 text-left"
                    placeholder="0"
                    dir="ltr"
                  />
                </div>'''

code = re.sub(old_monthly_input, new_monthly_input, code)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

