import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add paymentDay input after depositAmount
deposit_html = """                  <NumericFormat 
                    value={form.depositAmount}
                    onValueChange={(values) => setForm({...form, depositAmount: values.value})}
                    thousandSeparator=","
                    className="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500 text-left"
                    placeholder="0"
                    dir="ltr"
                  />
                </div>"""

payment_day_html = deposit_html + """
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">روز تعهد پرداخت (۱ تا ۳۱)</label>
                  <NumericFormat 
                    value={form.paymentDay}
                    onValueChange={(values) => setForm({...form, paymentDay: values.value})}
                    className="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500 text-center"
                    placeholder="پیش‌فرض: روز تاریخ شروع"
                    dir="ltr"
                    allowNegative={false}
                    decimalScale={0}
                    isAllowed={(values) => {
                      const { floatValue } = values;
                      return floatValue === undefined || (floatValue >= 1 && floatValue <= 31);
                    }}
                  />
                </div>"""

code = code.replace(deposit_html, payment_day_html)

# Set paymentDay automatically when startDate changes if it's not set.
# Wait, actually since calendar type might be gregorian or jalali, the day is based on the selected calendar date.
# A simpler approach: if `paymentDay` is not set during save, we extract the Jalali day. But how?
# The user can just type it. Or we calculate it using Persian date formatter.

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
