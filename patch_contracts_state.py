import re

with open('src/components/payroll/ContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_state = """  const [contracts, setContracts] = useState([]);
  const [salComponents, setSalComponents] = useState([]);"""
new_state = """  const [contracts, setContracts] = useState([]);
  const [salComponents, setSalComponents] = useState([]);
  const [orders, setOrders] = useState([]);"""
content = content.replace(old_state, new_state)

old_fetch = """      const [emps, sals, profiles, works] = await Promise.all([
        getEmployeeContracts(),
        getSalaryComponents(),
        getEmployeeProfiles(),
        getWorkplaces()
      ]);
      setContracts(emps);
      setSalComponents(sals);
      setEmployeeProfiles(profiles);
      setWorkplaces(works);"""
new_fetch = """      const [emps, sals, profiles, works, allOrders] = await Promise.all([
        getEmployeeContracts(),
        getSalaryComponents(),
        getEmployeeProfiles(),
        getWorkplaces(),
        getEmployeeOrders()
      ]);
      setContracts(emps);
      setSalComponents(sals);
      setEmployeeProfiles(profiles);
      setWorkplaces(works);
      setOrders(allOrders);"""
content = content.replace(old_fetch, new_fetch)

# Insert the orders list in the summary modal
old_modal = """                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-slate-500 text-sm">وضعیت:</span>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border ${
                            c.status==='active'?'bg-emerald-50 text-emerald-700 border-emerald-200':
                            c.status==='expired'?'bg-amber-50 text-amber-700 border-amber-200':
                            c.status==='terminated'?'bg-rose-50 text-rose-700 border-rose-200':
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {c.status === 'active' ? 'فعال' : c.status === 'expired' ? 'منقضی' : c.status === 'terminated' ? 'فسخ شده' : 'پیش‌نویس'}
                  </span>
                </div>
              </div>
              <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">"""
new_modal = """                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-slate-500 text-sm">وضعیت:</span>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border ${
                            c.status==='active'?'bg-emerald-50 text-emerald-700 border-emerald-200':
                            c.status==='expired'?'bg-amber-50 text-amber-700 border-amber-200':
                            c.status==='terminated'?'bg-rose-50 text-rose-700 border-rose-200':
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {c.status === 'active' ? 'فعال' : c.status === 'expired' ? 'منقضی' : c.status === 'terminated' ? 'فسخ شده' : 'پیش‌نویس'}
                  </span>
                </div>
              </div>
              
              {(() => {
                const contractOrders = orders.filter(o => o.contractId === c.id);
                if (contractOrders.length > 0) {
                  return (
                    <div className="px-6 py-4 bg-white border-t border-slate-100">
                      <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        احکام کارگزینی ثبت شده
                      </h4>
                      <div className="space-y-2">
                        {contractOrders.map((order, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
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
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">"""
content = content.replace(old_modal, new_modal)

with open('src/components/payroll/ContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("ContractsManager patched.")
