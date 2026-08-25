import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

modals = """      {issueDocModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-indigo-600 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" /> صدور سند تعهد اجاره
              </h3>
              <button onClick={() => setIssueDocModal(null)} className="p-2 bg-indigo-700/50 hover:bg-indigo-700 rounded-xl transition-colors text-white/90">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">حساب هزینه اجاره <span className="text-rose-500">*</span></label>
                <Select
                  options={ledgerAccounts.map(a => ({ value: a.id, label: `${a.code} - ${a.title}` }))}
                  value={docForm.ledgerAccountId ? { value: docForm.ledgerAccountId, label: ledgerAccounts.find(a => String(a.id) === String(docForm.ledgerAccountId))?.title } : null}
                  onChange={(val: any) => setDocForm({ ...docForm, ledgerAccountId: val?.value || '' })}
                  placeholder="جستجو و انتخاب حساب..."
                  className="text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">مبلغ ({storeSettings?.currency || 'ریال'}) <span className="text-rose-500">*</span></label>
                <NumericFormat 
                  value={docForm.amount}
                  onValueChange={(values) => setDocForm({...docForm, amount: values.value})}
                  thousandSeparator=","
                  className="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500 text-left"
                  placeholder="0"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ سند <span className="text-rose-500">*</span></label>
                <DatePicker
                    value={docForm.date}
                    onChange={(date: any) => {
                      if (!date) {
                          setDocForm(prev => ({...prev, date: null as any}));
                          return;
                      }
                      let d;
                      if (typeof date === 'string') {
                          d = new Date(convertToGregorian(date));
                      } else {
                          d = date?.toDate?.() || new Date(date);
                      }
                      if (d && !isNaN(d.getTime())) {
                          d.setHours(0,0,0,0);
                          setDocForm(prev => ({...prev, date: d}));
                      }
                    }}
                    calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500 text-left"
                  />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">شرح سند</label>
                <input
                  type="text"
                  value={docForm.description}
                  onChange={e => setDocForm({ ...docForm, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIssueDocModal(null)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleIssueDoc} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
                <Check className="w-5 h-5" /> صدور سند
              </button>
            </div>
          </div>
        </div>
      )}
      {reportModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-emerald-600 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" /> گزارش قرارداد اجاره {reportModal.contractNumber}
              </h3>
              <button onClick={() => setReportModal(null)} className="p-2 bg-emerald-700/50 hover:bg-emerald-700 rounded-xl transition-colors text-white/90">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">طرف حساب</div>
                  <div className="font-bold text-slate-800">{getPersonName(reportModal.personId)}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">وضعیت قرارداد</div>
                  <div className="font-bold text-slate-800">{reportModal.status === 'active' ? 'فعال' : reportModal.status === 'expired' ? 'خاتمه یافته' : 'پیش‌نویس'}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">اجاره ماهانه</div>
                  <div className="font-bold text-emerald-600">{Number(reportModal.monthlyAmount).toLocaleString()} {storeSettings?.currency || 'ریال'}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">جمع اسناد صادره</div>
                  <div className="font-bold text-indigo-600">
                    {Number(reportData.docs.reduce((acc, doc) => acc + (doc.items?.find(i => i.personId === reportModal.personId)?.creditor || 0), 0)).toLocaleString()} {storeSettings?.currency || 'ریال'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2">اسناد تعهد (حسابداری) صادر شده</h4>
                {reportData.docs.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="p-3 text-right">تاریخ</th>
                          <th className="p-3 text-right">شرح</th>
                          <th className="p-3 text-center">مبلغ بستانکار ({storeSettings?.currency || 'ریال'})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.docs.map((d: any) => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="p-3">{new Date(d.date).toLocaleDateString('fa-IR')}</td>
                            <td className="p-3 text-slate-600">{d.description}</td>
                            <td className="p-3 text-center font-bold text-emerald-600">
                              {Number(d.items?.find((i: any) => i.personId === reportModal.personId)?.creditor || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 text-slate-500 rounded-xl">هیچ سند تعهدی برای این قرارداد یافت نشد.</div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2">پرداختی‌ها به شخص (تراکنش‌ها)</h4>
                {reportData.transactions.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="p-3 text-right">تاریخ</th>
                          <th className="p-3 text-right">شرح</th>
                          <th className="p-3 text-center">مبلغ پرداختی ({storeSettings?.currency || 'ریال'})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.transactions.filter((t: any) => t.type === 'payment').map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="p-3">{new Date(t.date).toLocaleDateString('fa-IR')}</td>
                            <td className="p-3 text-slate-600">{t.description}</td>
                            <td className="p-3 text-center font-bold text-rose-600">
                              {Number(t.amount).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 text-slate-500 rounded-xl">تراکنش پرداختی ثبت نشده است.</div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setReportModal(null)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">بستن</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}"""

code = code.replace("    </div>\n  );\n}", modals)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
