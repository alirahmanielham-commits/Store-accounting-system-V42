import React, { useState, useEffect } from 'react';
import BeautifulLoading from '../BeautifulLoading';
import { Users, Search, Filter, Printer, RefreshCw, HandCoins, UserX, UserCheck, Calculator, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { getPersons, getInvoices, getTransactions, getIssuedChecks, getReceivedChecks, getStoreSettings, getPersonGroups, getAccountingDocuments } from '../../services/dataService';
import { Person, PersonGroup } from '../../types';
import { getDefaultExchangeRate, formatDateDisplay } from '../../utils/format';
import SendPersonMessageModal from '../modals/SendPersonMessageModal';

const formatNumber = (num: number) => new Intl.NumberFormat('fa-IR').format(num);

interface DebtsCreditsReportProps {
  showNotification?: (type: 'success' | 'error', message: string) => void;
}

const DebtsCreditsReport: React.FC<DebtsCreditsReportProps> = ({ showNotification }) => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [issuedChecks, setIssuedChecks] = useState<any[]>([]);
  const [receivedChecks, setReceivedChecks] = useState<any[]>([]);
  const [accountingDocuments, setAccountingDocuments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [groups, setGroups] = useState<PersonGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'debtor' | 'creditor' | 'settled'>('all');

  // Message modal state
  const [messagePerson, setMessagePerson] = useState<any | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  const handleOpenMessage = (row: any) => {
    const fullPerson = (persons || []).find(p => String(p?.id) === String(row?.id)) || row;
    setMessagePerson(fullPerson);
    setIsMessageModalOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      setPersons(await getPersons());
      setInvoices(await getInvoices());
      setTransactions(await getTransactions());
      setIssuedChecks(await getIssuedChecks());
      setReceivedChecks(await getReceivedChecks());
      setAccountingDocuments(await getAccountingDocuments());
      setSettings(await getStoreSettings());
      setGroups(await getPersonGroups());
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('error', 'خطا در دریافت اطلاعات');
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePersonBalance = (personId: string | number) => {
    const person = (persons || []).find(p => p?.id?.toString() === personId?.toString());
    if (!person) return { amount: 0, status: 'بی‌حساب', value: 0 };

    let balance = 0;
    
    (accountingDocuments || []).forEach(doc => {
      if (doc.status === 'draft' || doc.isDeleted) return;
      if (doc.items && Array.isArray(doc.items)) {
        doc.items.forEach(item => {
          if (item.detailedAccountId?.toString() === personId.toString()) {
            balance += (Number(item.debit) || 0) - (Number(item.credit) || 0);
          }
        });
      }
    });

    if (balance > 0) return { amount: balance, status: 'بدهکار', value: balance, color: 'text-rose-600', bg: 'bg-rose-50' };
    if (balance < 0) return { amount: Math.abs(balance), status: 'بستانکار', value: balance, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    return { amount: 0, status: 'بی‌حساب', value: 0, color: 'text-gray-500', bg: 'bg-gray-100' };
  };

  const getReportData = () => {
    let rows = (persons || []).map(p => {
        const balanceInfo = calculatePersonBalance(p.id);
        const groupObj = (groups || []).find(g => g?.id?.toString() === p.group?.toString());
        return {
            ...p,
            groupName: groupObj?.name || 'بدون گروه',
            balanceAmount: balanceInfo.amount,
            balanceValue: balanceInfo.value,
            balanceStatus: balanceInfo.status,
            balanceColor: balanceInfo.color,
            balanceBg: balanceInfo.bg
        };
    });

    if (searchQuery) {
        rows = rows.filter(r => r.name.includes(searchQuery) || (r.phone && r.phone.includes(searchQuery)));
    }
    
    if (selectedGroup !== 'all') {
        rows = rows.filter(r => r.group?.toString() === selectedGroup.toString());
    }

    if (filterType !== 'all') {
        if (filterType === 'debtor') rows = rows.filter(r => r.balanceValue > 0);
        else if (filterType === 'creditor') rows = rows.filter(r => r.balanceValue < 0);
        else if (filterType === 'settled') rows = rows.filter(r => r.balanceValue === 0);
    }

    return rows.sort((a, b) => Math.abs(b.balanceValue) - Math.abs(a.balanceValue));
  };

  const rows = getReportData();
  const totalDebts = rows.filter(r => r.balanceValue > 0).reduce((sum, r) => sum + r.balanceValue, 0);
  const totalCredits = rows.filter(r => r.balanceValue < 0).reduce((sum, r) => sum + Math.abs(r.balanceValue), 0);
  const netBalance = totalDebts - totalCredits;

  if (isLoading) {
    return (
      <BeautifulLoading />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-right font-sans print-section"
      dir="rtl"
    >
      <div className="bg-gradient-to-l from-indigo-50 to-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-indigo-600" />
            گزارش لیست اشخاص (بدهی‌ها و طلب‌ها)
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-bold leading-relaxed">
            مشاهده وضعیت حساب و پرداختی‌های اشخاص و شرکت‌ها
          </p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm shadow-sm"
        >
          <Printer className="w-4 h-4" />
          چاپ گزارش
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100/50 flex flex-col relative overflow-hidden">
           <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent to-rose-500"></div>
           <span className="text-sm font-bold text-gray-500 flex items-center gap-1.5"><UserX className="w-4 h-4 text-rose-500"/> مجموع بدهی مشتریان به ما</span>
           <div className="mt-3 text-2xl font-black text-rose-600 drop-shadow-sm truncate" title={formatNumber(totalDebts)}>
             {formatNumber(totalDebts)} <span className="text-xs font-bold text-rose-400">{settings?.currency}</span>
           </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100/50 flex flex-col relative overflow-hidden">
           <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent to-emerald-500"></div>
           <span className="text-sm font-bold text-gray-500 flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-emerald-500"/> مجموع بستانکاری مشتریان</span>
           <div className="mt-3 text-2xl font-black text-emerald-600 drop-shadow-sm truncate" title={formatNumber(totalCredits)}>
             {formatNumber(totalCredits)} <span className="text-xs font-bold text-emerald-400">{settings?.currency}</span>
           </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100/50 flex flex-col relative overflow-hidden">
           <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent to-indigo-500"></div>
           <span className="text-sm font-bold text-gray-500 flex items-center gap-1.5"><Calculator className="w-4 h-4 text-indigo-500"/> تراز کل اشخاص</span>
           <div className="mt-3 text-2xl font-black text-indigo-600 drop-shadow-sm truncate" dir="ltr" title={formatNumber(netBalance)}>
             {netBalance < 0 ? `(${formatNumber(Math.abs(netBalance))})` : formatNumber(netBalance)} <span className="text-xs font-bold text-indigo-400">{settings?.currency}</span>
           </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
            <span className="text-xs font-bold text-gray-400 mb-1">تعداد نتیجه فیلتر</span>
            <span className="text-3xl font-black text-slate-800">{rows.length}</span>
            <span className="text-xs font-bold text-gray-400 mt-1">نفر / شرکت</span>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 print:hidden">
          <div className="md:col-span-5 relative">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="جستجو بر اساس نام شخص، شرکت یا تلفن..."
              className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="md:col-span-3 relative">
            <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none font-bold text-sm"
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
            >
              <option value="all">همه گروه‌ها</option>
              {groups.map((g, idx) => (
                <option key={`${g.id}-${idx}`} value={g.id.toString()}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 relative">
             <select
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none font-bold text-sm text-center"
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
            >
              <option value="all">نمایش همه وضعیت‌ها</option>
              <option value="debtor">اشخاص بدهکار (طلب ما)</option>
              <option value="creditor">اشخاص طلبکار (بدهی ما)</option>
              <option value="settled">فقط بی‌حساب</option>
            </select>
          </div>
        </div>

        <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
            <h2 className="text-2xl font-black text-slate-900 border-2 border-slate-800 py-2 px-4 inline-block rounded-xl mb-4">
               گزارش لیست اشخاص (بدهی‌ها و طلب‌ها)
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm font-bold text-slate-700">
               <div>فیلتر گروه: {selectedGroup === 'all' ? 'همه' : (groups || []).find(g => g?.id?.toString() === selectedGroup?.toString())?.name}</div>
               <div>وضعیت تسویه: {filterType === 'all' ? 'همه' : filterType === 'debtor' ? 'اشخاص بدهکار' : filterType === 'creditor' ? 'اشخاص طلبکار' : 'بی‌حساب'}</div>
               <div className="col-span-2">تاریخ گزارش: {formatDateDisplay(new Date())}</div>
            </div>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-right border-collapse text-sm border border-gray-100 print:border-slate-300 rounded-xl font-sans">
            <thead className="bg-gray-50 print:bg-slate-100">
              <tr>
                <th className="py-4 px-4 font-bold text-gray-600 border-b print:border-slate-300 border-l border-gray-100 print:border-slate-300">ردیف</th>
                <th className="py-4 px-4 font-bold text-gray-600 border-b print:border-slate-300 border-l border-gray-100 print:border-slate-300">نام شخص / شرکت</th>
                <th className="py-4 px-4 font-bold text-gray-600 border-b print:border-slate-300 border-l border-gray-100 print:border-slate-300">گروه (کدینگ)</th>
                <th className="py-4 px-4 font-bold text-gray-600 border-b print:border-slate-300 border-l border-gray-100 print:border-slate-300">تلفن تماس</th>
                <th className="py-4 px-4 font-bold text-gray-600 border-b print:border-slate-300 border-l border-gray-100 print:border-slate-300 text-center">وضعیت حساب</th>
                <th className="py-4 px-4 font-bold text-gray-600 border-b print:border-slate-300 text-left">مبلغ تراز ({settings?.currency})</th>
                <th className="py-4 px-4 font-bold text-gray-600 border-b print:hidden text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 print:divide-slate-300">
              {rows.map((row, idx) => (
                <tr key={`${row.id}-${idx}`} className="hover:bg-gray-50/50 transition-colors print:hover:bg-transparent">
                  <td className="py-3 px-4 font-bold text-gray-500 border-l border-gray-100 print:border-slate-300 text-center">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-800 border-l border-gray-100 print:border-slate-300">
                    <div className="flex items-center gap-2">
                       <Users className="w-4 h-4 text-gray-400 print:hidden" />
                       {row.name}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 border-l border-gray-100 print:border-slate-300 text-xs font-bold">{row.groupName}</td>
                  <td className="py-3 px-4 text-gray-600 border-l border-gray-100 print:border-slate-300 text-sm font-bold" dir="ltr">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>{row.phone || '-'}</span>
                      {row.phone && (
                        <button
                          type="button"
                          onClick={() => handleOpenMessage(row)}
                          className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors print:hidden cursor-pointer"
                          title="ارسال سریع پیام به این شماره"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 border-l border-gray-100 print:border-slate-300 text-center">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg print:border print:bg-transparent ${row.balanceBg} ${row.balanceColor} print:border-current inline-block`}>
                      {row.balanceStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-black text-left">
                     <span className={row.balanceValue > 0 ? 'text-rose-600' : row.balanceValue < 0 ? 'text-emerald-600' : 'text-gray-500'}>
                         {formatNumber(row.balanceAmount)}
                     </span>
                  </td>
                  <td className="py-3 px-4 text-center print:hidden">
                    <button
                      type="button"
                      onClick={() => handleOpenMessage(row)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 rounded-xl text-xs font-black transition-all shadow-2xs border border-indigo-100/80 cursor-pointer"
                      title="ارسال پیامک با مانده حساب و یادآوری"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>ارسال پیام</span>
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 font-bold border-t border-gray-100">
                    هیچ نتیجه‌ای یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-slate-50 print:bg-slate-100 border-t-2 border-gray-200 print:border-slate-800 font-black text-sm text-slate-800 print:text-xs">
                <tr>
                  <td colSpan={5} className="py-4 px-4 text-left border-l border-gray-200 print:border-slate-400">جمع تراز محاسبه شده (کسر بدهی از طلب):</td>
                  <td colSpan={2} className="py-4 px-4 text-left font-sans text-lg print:text-base whitespace-nowrap" dir="ltr">
                     {netBalance < 0 ? `(${formatNumber(Math.abs(netBalance))})` : formatNumber(netBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {messagePerson && (
        <SendPersonMessageModal
          isOpen={isMessageModalOpen}
          onClose={() => {
            setIsMessageModalOpen(false);
            setMessagePerson(null);
          }}
          person={messagePerson}
          showNotification={(msg, type) => {
            if (showNotification) showNotification(type === 'error' ? 'error' : 'success', msg);
          }}
          calculatePersonBalance={calculatePersonBalance}
          storeSettings={settings}
        />
      )}
    </motion.div>
  );
};

export default DebtsCreditsReport;
