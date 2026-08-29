import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "import { getRentContracts, addRentContract, updateRentContract, deleteRentContract, autoGenerateRentCommitments, testGenerateRentCommitments } from '../../services/hrService';",
    "import { getRentContracts, addRentContract, updateRentContract, deleteRentContract, autoGenerateRentCommitments, testGenerateRentCommitments, getPendingRentCommitments } from '../../services/hrService';"
)

content = content.replace(
    "const [contracts, setContracts] = useState<any[]>([]);",
    "const [contracts, setContracts] = useState<any[]>([]);\n  const [pendingDocs, setPendingDocs] = useState<any[]>([]);"
)

fetch_data_old = """
  const fetchData = async () => {
    try {
      const data = await getRentContracts();
      setContracts(data || []);
      const accs = await getLedgerAccounts();
      setLedgerAccounts((accs || []).filter((a: any) => a.level === 'subsidiary'));
    } catch (e) {
      console.error(e);
    }
  };
"""
fetch_data_new = """
  const fetchData = async () => {
    try {
      const data = await getRentContracts();
      setContracts(data || []);
      const accs = await getLedgerAccounts();
      setLedgerAccounts((accs || []).filter((a: any) => a.level === 'subsidiary'));
      
      const pDocs = await getPendingRentCommitments();
      setPendingDocs(pDocs || []);
    } catch (e) {
      console.error(e);
    }
  };
"""
content = content.replace(fetch_data_old, fetch_data_new)

alert_html = """
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">قراردادهای اجاره و پیمانکاری</h1>
              <p className="text-sm text-slate-500 mt-1">مدیریت قراردادها و صدور اسناد تعهد پرداخت</p>
            </div>
          </div>
          <button onClick={() => {
            setForm({
              personId: null, contractNumber: '', startDate: new Date(), endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
              monthlyAmount: '', depositAmount: '', paymentDay: '', expenseAccountId: '', description: '', status: 'draft'
            });
            setEditingId(null);
            setIsModalOpen(true);
          }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all w-full md:w-auto justify-center">
            <Plus className="w-5 h-5" />
            قرارداد جدید
          </button>
        </div>
        
        {pendingDocs.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <div>
                <p className="font-bold">اسناد تعهد معوق</p>
                <p className="text-sm mt-1 text-amber-700">تعداد {pendingDocs.length} سند تعهد اجاره به تاریخ سررسید رسیده‌اند اما صادر نشده‌اند.</p>
              </div>
            </div>
            <button onClick={async () => {
              setLoading(true);
              try {
                await autoGenerateRentCommitments();
                showNotification('اسناد معوق با موفقیت صادر شدند', 'success');
                fetchData();
              } catch(e) {
                showNotification('خطا در صدور اسناد', 'error');
              } finally {
                setLoading(false);
              }
            }} className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors whitespace-nowrap">
              صدور اسناد تعهد
            </button>
          </div>
        )}
"""

content = content.replace(
    """<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">قراردادهای اجاره و پیمانکاری</h1>
              <p className="text-sm text-slate-500 mt-1">مدیریت قراردادها و صدور اسناد تعهد پرداخت</p>
            </div>
          </div>
          <button onClick={() => {
            setForm({
              personId: null, contractNumber: '', startDate: new Date(), endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
              monthlyAmount: '', depositAmount: '', paymentDay: '', expenseAccountId: '', description: '', status: 'draft'
            });
            setEditingId(null);
            setIsModalOpen(true);
          }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all w-full md:w-auto justify-center">
            <Plus className="w-5 h-5" />
            قرارداد جدید
          </button>
        </div>""",
    alert_html
)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

