with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('''                            setFormData({...formData, items: newItems});
                          }} className="w-full border border-slate-200 bg-white rounded-lg p-2 outline-none font-bold text-sm" />''',
'''                            setFormData({...formData, items: newItems});
                          }} className="w-full border border-slate-200 bg-white rounded-lg p-2 outline-none font-bold text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                          disabled={['daily_wage', 'housing', 'marriage', 'grocery', 'child'].includes(item.id)} />''')


content = content.replace('''                            setFormData({...formData, items: newItems});
                          }} className="w-full border border-slate-200 bg-white rounded-lg p-2 outline-none font-bold text-sm">''',
'''                            setFormData({...formData, items: newItems});
                          }} className="w-full border border-slate-200 bg-white rounded-lg p-2 outline-none font-bold text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                          disabled={['daily_wage', 'housing', 'marriage', 'grocery', 'child'].includes(item.id)}>''')

with open('src/components/payroll/EmployeeOrdersManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
