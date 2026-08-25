import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

actions_replacement = """                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => {
                        setIssueDocModal(c);
                        setDocForm({
                          date: new Date(),
                          amount: c.monthlyAmount || '',
                          description: `سند تعهد اجاره ماهانه بابت قرارداد ${c.contractNumber || ''}`,
                          ledgerAccountId: ''
                        });
                      }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="صدور سند تعهد">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={async () => {
                        const docs = await getAccountingDocuments();
                        const trans = await getTransactions();
                        const cDocs = (docs || []).filter((d: any) => d.sourceType === 'rent_contract' && d.sourceId === c.id);
                        const cTrans = (trans || []).filter((t: any) => t.personId === c.personId && t.description?.includes(c.contractNumber || '---'));
                        setReportData({ docs: cDocs, transactions: cTrans });
                        setReportModal(c);
                      }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="گزارش قرارداد">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>"""

code = re.sub(
    r'<div className="flex items-center justify-center gap-2">[\s\S]*?<Trash2 className="w-4 h-4" />\s*</button>\s*</div>',
    actions_replacement,
    code
)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
