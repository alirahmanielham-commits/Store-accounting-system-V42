with open('src/components/payroll/PayrollSettings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''                              className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all text-sm"
                            />''',
'''                              className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                              disabled={DEFAULT_IDS.includes(item.id)}
                            />''')

content = content.replace(
'''                              className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all text-sm"
                            >
                              <option value="earning">مزایا (+)</option>
                              <option value="deduction">کسورات (-)</option>
                            </select>''',
'''                              className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                              disabled={DEFAULT_IDS.includes(item.id)}
                            >
                              <option value="earning">مزایا (+)</option>
                              <option value="deduction">کسورات (-)</option>
                            </select>''')

content = content.replace(
'''                          <button onClick={() => handleRemoveComponent(index)} className="mt-6 p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors self-end md:self-auto" title="حذف جزء">
                            <Trash2 className="w-5 h-5" />
                          </button>''',
'''                          {!DEFAULT_IDS.includes(item.id) && (
                            <button onClick={() => handleRemoveComponent(index)} className="mt-6 p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors self-end md:self-auto" title="حذف جزء">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}''')

with open('src/components/payroll/PayrollSettings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
