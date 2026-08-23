import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_order_view = """                          <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                            <div>
                              <div className="font-bold text-slate-700 text-sm">{order.name || 'حکم بدون نام'}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                تاریخ: {order.issueDate ? new Date(Number(order.issueDate)).toLocaleDateString('fa-IR') : '---'}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${order.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                              {order.status === 'active' ? 'فعال' : 'غیرفعال'}
                            </span>
                          </div>"""

new_order_view = """                          <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-bold text-slate-700 text-sm">{order.name || 'حکم بدون نام'}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                  تاریخ: {order.issueDate ? new Date(Number(order.issueDate)).toLocaleDateString('fa-IR') : '---'}
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${order.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                                {order.status === 'active' ? 'فعال' : 'غیرفعال'}
                              </span>
                            </div>
                            {order.items && order.items.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <div className="text-xs font-bold text-slate-500 mb-2">عناوین حکمی و غیر حکمی:</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {order.items.map((it: any, i: number) => (
                                    <div key={i} className="flex justify-between bg-white border border-slate-100 rounded-lg p-2 text-xs">
                                      <span className="text-slate-600">{it.title}</span>
                                      <span className="font-mono font-bold text-slate-800" dir="ltr">{it.amount} {it.type === 'earning' ? '(+)' : '(-)'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>"""

if old_order_view in content:
    content = content.replace(old_order_view, new_order_view)
    with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched ContractsManager.")
else:
    print("Could not find the target string.")

