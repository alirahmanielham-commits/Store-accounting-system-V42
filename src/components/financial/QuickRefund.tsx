import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import DatePickerModule from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { User, Wallet, FileText, CheckCircle, CreditCard, Banknote, List, Plus, Archive, ChevronDown, RefreshCw, X, TrendingUp, TrendingDown, DollarSign, Activity, PieChart as PieChartIcon } from 'lucide-react';
import { getAccounts, getCashboxes, getPersons, addTransaction, addPerson, getRefundRequests, addRefundRequest, updateRefundRequest, getStoreSettings, getPersonGroups } from '../../services/dataService';
import { Account, Cashbox, Person, RefundRequest, PersonGroup } from '../../types';
import { showInvoiceCurrency } from '../../utils/format';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import CustomDatePicker from "../ui/CustomDatePicker";
const DatePicker = CustomDatePicker;

export default function QuickRefund({ showNotification, onComplete }: { showNotification?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void, onComplete?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [personGroups, setPersonGroups] = useState<PersonGroup[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [storeCur, setStoreCur] = useState('IRT');
  
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'report'>('list');

  // Form State
  const [amount, setAmount] = useState('');
  const [resourceType, setResourceType] = useState<'bank' | 'cashbox'>('bank');
  const [resourceId, setResourceId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  
  // Person state
  const [personOption, setPersonOption] = useState<'select' | 'miscellaneous'>('miscellaneous');
  const [personId, setPersonId] = useState('');
  const [miscName, setMiscName] = useState('');
  const [miscGroupId, setMiscGroupId] = useState('');

  const [date, setDate] = useState<string>(new Date().toLocaleDateString('fa-IR'));
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accs, cbs, pers, reqs, settings, groups] = await Promise.all([
        getAccounts(),
        getCashboxes(),
        getPersons(),
        getRefundRequests(),
        getStoreSettings(),
        getPersonGroups()
      ]);
      setAccounts(accs as Account[]);
      setCashboxes(cbs as Cashbox[]);
      setPersons(pers as Person[]);
      setPersonGroups(groups as PersonGroup[]);
      setRefundRequests(reqs as RefundRequest[]);
      const settingsTyped = settings as any;
      if (settingsTyped?.currency) setStoreCur(settingsTyped.currency);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      showNotification?.('لطفاً مبلغ معتبری وارد کنید', 'error');
      return;
    }
    if (!resourceId) {
      showNotification?.('لطفاً منبع پرداخت را مشخص کنید', 'error');
      return;
    }
    if (personOption === 'select' && !personId) {
      showNotification?.('لطفاً شخص/مشتری را انتخاب کنید', 'error');
      return;
    }
    if (personOption === 'miscellaneous' && !miscName) {
      showNotification?.('لطفاً نام شخص متفرقه را وارد کنید', 'error');
      return;
    }
    if (personOption === 'miscellaneous' && !miscGroupId) {
      showNotification?.('لطفاً گروه شخص متفرقه را مشخص کنید', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<RefundRequest> = {
        date: date || new Date().toLocaleDateString('fa-IR'),
        amount: Number(amount),
        personId: personOption === 'select' ? personId : undefined,
        miscName: personOption === 'miscellaneous' ? miscName : undefined,
        miscGroupId: personOption === 'miscellaneous' ? miscGroupId : undefined,
        cardNumber: cardNumber || undefined,
        resourceType,
        resourceId,
        description,
        status: 'registered'
      };

      await addRefundRequest(payload);
      await fetchData();

      showNotification?.('استرداد وجه در وضعیت ثبت‌شده قرار گرفت.', 'success');
      
      // Reset form
      setAmount('');
      setResourceId('');
      setPersonOption('miscellaneous');
      setMiscName('');
      setMiscGroupId('');
      setPersonId('');
      setCardNumber('');
      setDescription('');
      
      setActiveTab('list');
      
    } catch (error) {
      console.error('Error submitting refund:', error);
      showNotification?.('خطا در ثبت استرداد وجه', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (req: RefundRequest, newStatus: 'registered' | 'paid' | 'cancelled') => {
    if (req.status === 'paid' && newStatus !== 'paid') {
      showNotification?.('استرداد پرداخت‌شده را نمی‌توان به وضعیت قبلی برگرداند', 'error');
      return;
    }
    
    try {
      if (newStatus === 'paid' && window.confirm('آیا مطمئن هستید که این استرداد پرداخت شده است؟ مبلغ از حساب مشخص شده کسر خواهد شد.')) {
        let finalPersonId = String(req.personId || '');
        
        // Handle miscellaneous person
        if (!req.personId && req.miscName) {
            const payload: Partial<Person> = {
              name: req.miscName,
              personType: 'real',
              role: 'customer',
              group: String(req.miscGroupId || ''),
              cardNumber: req.cardNumber || undefined,
              additionalNotes: 'تولید شده خودکار به عنوان متفرقه جهت استرداد وجه'
            };
            const newP = await addPerson(payload);
            if (newP && newP.id) {
                finalPersonId = newP.id.toString();
            } else { // Fallback get all persons to find latest if return object doesn't have ID
                await fetchData(); // refresh persons list
                const ps = persons; // actually we might need to get latest from DB, but let's just re-fetch
                const ps_nav = await getPersons();
                finalPersonId = ps_nav[ps_nav.length - 1].id.toString();
            }
        }

        // Post transaction 
        await addTransaction({
          type: 'pay',
          resourceType: req.resourceType,
          resourceId: req.resourceId,
          personId: finalPersonId,
          amount: Number(req.amount),
          date: new Date().toLocaleDateString('fa-IR'),
          receiptNumber: `REF-${Math.floor(Math.random() * 100000)}`,
          description: req.description || `استرداد وجه بابت عودت متفرقه - ${req.cardNumber ? 'به کارت ' + req.cardNumber : ''}`
        });
        
        await updateRefundRequest(String(req.id), { status: newStatus });
        showNotification?.('استرداد با موفقیت پرداخت شد و سند آن ثبت گردید', 'success');
        onComplete?.();
        
      } else if (newStatus === 'cancelled' || newStatus === 'registered') {
        await updateRefundRequest(String(req.id), { status: newStatus });
        showNotification?.('وضعیت با موفقیت به‌روزرسانی شد.', 'success');
      }
      
      await fetchData();
    } catch (error) {
      console.error(error);
      showNotification?.('خطا در تغییر وضعیت', 'error');
    }
  };

  // Report Stats Calculation
  const reportStats = useMemo(() => {
    const totalRequests = refundRequests.length;
    let totalAmountRegistered = 0;
    let totalAmountPaid = 0;
    let totalAmountCancelled = 0;
    const dateMap: Record<string, { date: string; registered: number; paid: number; cancelled: number }> = {};

    refundRequests.forEach(req => {
      const amt = Number(req.amount) || 0;
      if (req.status === 'registered') totalAmountRegistered += amt;
      else if (req.status === 'paid') totalAmountPaid += amt;
      else if (req.status === 'cancelled') totalAmountCancelled += amt;

      if (!dateMap[req.date]) {
        dateMap[req.date] = { date: req.date, registered: 0, paid: 0, cancelled: 0 };
      }
      dateMap[req.date][req.status] += amt;
    });

    const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    const pieData = [
      { name: 'ثبت شده', value: totalAmountRegistered, color: '#f59e0b' },
      { name: 'پرداخت شده', value: totalAmountPaid, color: '#10b981' },
      { name: 'کنسل شده', value: totalAmountCancelled, color: '#f43f5e' }
    ].filter(d => d.value > 0);

    return { totalRequests, totalAmountRegistered, totalAmountPaid, totalAmountCancelled, chartData, pieData };
  }, [refundRequests]);

  if (loading) {
    return <div className="text-center py-10">در حال بارگذاری اطلاعات...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full" dir="rtl">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
           <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
             <User className="w-6 h-6 text-rose-600" />
             مدیریت استردادهای سریع متفرقه
           </h1>
           <p className="text-xs text-gray-500 mt-1">امکان ثبت و پیگیری سریع استرداد وجه بازگشتی به مشتریان بدون نیاز به فاکتور</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto overflow-hidden">
           <button 
             onClick={() => setActiveTab('list')}
             className={`flex-1 sm:px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'list' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
           >
             <List className="w-4 h-4" /> لیست استردادها
           </button>
           <button 
             onClick={() => setActiveTab('add')}
             className={`flex-1 sm:px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'add' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
           >
             <Plus className="w-4 h-4" /> ثبت استرداد جدید
           </button>
           <button 
             onClick={() => setActiveTab('report')}
             className={`flex-1 sm:px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'report' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
           >
             <PieChartIcon className="w-4 h-4" /> گزارشات مالی
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'list' ? (
          <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-right">
                   <thead>
                     <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                       <th className="px-4 py-3 font-bold">شماره پیگیری</th>
                       <th className="px-4 py-3 font-bold">مشتری متفرقه / شخص</th>
                       <th className="px-4 py-3 font-bold">مبلغ ({showInvoiceCurrency(storeCur)})</th>
                       <th className="px-4 py-3 font-bold">تاریخ درخواست</th>
                       <th className="px-4 py-3 font-bold">حساب/صندوق</th>
                       <th className="px-4 py-3 font-bold">توضیحات</th>
                       <th className="px-4 py-3 font-bold text-center">وضعیت</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50 text-sm">
                     {refundRequests.map((req) => {
                       const personName = req.personId ? (() => { const p = persons.find(p => p.id?.toString() === req.personId?.toString()); return p ? (p.alias || p.name) : undefined; })() : req.miscName;
                       const sourceName = req.resourceType === 'bank' 
                         ? accounts.find(a => a.id?.toString() === req.resourceId?.toString())?.bankName
                         : cashboxes.find(c => c.id?.toString() === req.resourceId?.toString())?.name;

                       return (
                         <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                           <td className="px-4 py-3 font-mono text-gray-600 text-xs">#{req.id?.toString().slice(-4)}</td>
                           <td className="px-4 py-3 font-bold text-gray-800">
                             {personName || 'نامشخص'}
                             {req.cardNumber && <span className="block font-mono text-[10px] text-gray-400 mt-0.5">{req.cardNumber}</span>}
                           </td>
                           <td className="px-4 py-3 font-black text-rose-600 font-sans">{Number(req.amount).toLocaleString()}</td>
                           <td className="px-4 py-3 text-gray-600">{req.date}</td>
                           <td className="px-4 py-3 text-gray-600 text-xs">{sourceName || 'نامشخص'}</td>
                           <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[150px]">{req.description || '-'}</td>
                           <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleStatusChange(req, 'registered')}
                                  title="ثبت شده"
                                  disabled={req.status === 'paid'}
                                  className={`p-1.5 rounded-lg transition-colors border ${req.status === 'registered' ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-xs' : 'text-gray-400 border-transparent hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50'}`}
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(req, 'cancelled')}
                                  title="کنسل شده"
                                  disabled={req.status === 'paid'}
                                  className={`p-1.5 rounded-lg transition-colors border ${req.status === 'cancelled' ? 'bg-rose-100 text-rose-700 border-rose-200 shadow-xs' : 'text-gray-400 border-transparent hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50'}`}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(req, 'paid')}
                                  title="پرداخت شده"
                                  disabled={req.status === 'paid'}
                                  className={`p-1.5 rounded-lg transition-colors border ${req.status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-xs' : 'text-gray-400 border-transparent hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50'}`}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              </div>
                           </td>
                         </tr>
                       );
                     })}
                     {refundRequests.length === 0 && (
                       <tr>
                         <td colSpan={7} className="px-4 py-12 text-center text-gray-400 font-medium">هیچ لیست استردادی یافت نشد.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
          </motion.div>
        ) : activeTab === 'add' ? (
          <motion.div key="add" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden max-w-2xl mx-auto">
              <div className="bg-rose-50 text-rose-900 px-6 py-4 flex items-center gap-3 border-b border-rose-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-600 shadow-sm border border-rose-100">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black font-sans">ثبت درخواست جدید</h2>
                  <p className="text-xs text-rose-700/80 mt-1">تکمیل فرم ثبت اطلاعات رسید استرداد</p>
                </div>
              </div>

              <form onSubmit={handleRefundSubmit} className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Amount */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-2">مبلغ استردادی ({showInvoiceCurrency(storeCur)}) <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input 
                        required
                        type="text" 
                        value={Number(amount || 0).toLocaleString()} 
                        onChange={(e) => {
                          const val = e.target.value.replace(/,/g, '');
                          if (!isNaN(Number(val))) setAmount(val);
                        }}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-16 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 font-sans text-xl font-black text-rose-700 transition-all text-left"
                        dir="ltr"
                        placeholder="0"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">{showInvoiceCurrency(storeCur)}</span>
                    </div>
                  </div>

                  {/* Which Customer? */}
                  <div className="md:col-span-2 bg-gray-50 p-4 border border-gray-100 rounded-xl space-y-4">
                    <div className="flex gap-4 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-800">
                        <input type="radio" className="text-rose-600" checked={personOption === 'miscellaneous'} onChange={() => setPersonOption('miscellaneous')} />
                        مشتری متفرقه (جدید)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-800">
                        <input type="radio" className="text-indigo-600" checked={personOption === 'select'} onChange={() => setPersonOption('select')} />
                        تخصیص به یک مشتری موجود
                      </label>
                    </div>

                    {personOption === 'miscellaneous' ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">نام مشتری متفرقه <span className="text-rose-500">*</span></label>
                            <input 
                              required
                              type="text" 
                              value={miscName} 
                              onChange={e => setMiscName(e.target.value)} 
                              className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" 
                              placeholder="مثلا: آقای احمدی (خرید خرد)"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">گروه شخص <span className="text-rose-500">*</span></label>
                            <select 
                              required
                              value={miscGroupId}
                              onChange={e => setMiscGroupId(e.target.value)}
                              className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            >
                              <option value="">-- گروه مشتری متفرقه --</option>
                              {(personGroups || []).map(g => (
                                <option key={g.id} value={g.id}>{g.icon ? g.icon + " " : ""}{g.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                               شماره کارت واریزی <span className="text-gray-400 font-normal">اختیاری</span>
                            </label>
                            <div className="relative">
                              <input 
                                type="text" 
                                value={cardNumber} 
                                onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))} 
                                className="w-full border rounded-xl px-4 py-2.5 pl-10 text-sm bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono tracking-widest text-left" 
                                dir="ltr"
                                placeholder="____ ____ ____ ____"
                              />
                              <CreditCard className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                         <label className="block text-xs font-bold text-gray-700 mb-1.5">انتخاب شخص <span className="text-rose-500">*</span></label>
                         <select required value={personId} onChange={e => setPersonId(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                           <option value="">-- انتخاب کنید --</option>
                           {(persons || []).filter(p => p.isActive !== false).map(p => (
                             <option key={p.id} value={p.id}>{p.alias || p.name} {p.personType === 'legal' ? '(حقوقی)' : ''}</option>
                           ))}
                         </select>
                      </div>
                    )}
                  </div>

                  {/* Payment Source */}
                  <div className="md:col-span-2">
                     <label className="block text-xs font-bold text-gray-700 mb-2">منبع کسر وجه <span className="text-rose-500">*</span></label>
                     <div className="flex bg-gray-100 p-1 rounded-xl mb-3">
                        <button type="button" onClick={() => {setResourceType('bank'); setResourceId('');}} className={`flex-1 py-2 text-sm font-bold flex justify-center items-center gap-2 rounded-lg transition-all ${resourceType === 'bank' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}>
                          <CreditCard className="w-4 h-4" /> بانک
                        </button>
                        <button type="button" onClick={() => {setResourceType('cashbox'); setResourceId('');}} className={`flex-1 py-2 text-sm font-bold flex justify-center items-center gap-2 rounded-lg transition-all ${resourceType === 'cashbox' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}>
                          <Banknote className="w-4 h-4" /> صندوق نقدی
                        </button>
                      </div>

                      <select required value={resourceId} onChange={e => setResourceId(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-bold text-gray-800">
                        <option value="">-- انتخاب {resourceType === 'bank' ? 'حساب بانکی' : 'صندوق'} --</option>
                        {(resourceType === 'bank' ? accounts : cashboxes).map((item: any, idx: number) => (
                          <option key={item.id ? `qr-${item.id}-${idx}` : `qr-idx-${idx}`} value={item.id}>{item.bankName || item.name} (موجودی: {Number(item.balance).toLocaleString()} {showInvoiceCurrency(storeCur)})</option>
                        ))}
                      </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">تاریخ ثبت درخواست <span className="text-rose-500">*</span></label>
                    <div className="custom-datepicker-wrapper w-full">
                      <DatePicker
                        value={date}
                        onChange={(d: any) => setDate(d?.format?.('YYYY/MM/DD') || '')}
                        calendar={persian}
                        locale={persian_fa}
                        calendarPosition="bottom-right"
                        render={(value: string, openCalendar: () => void) => (
                          <div className="relative cursor-pointer" onClick={openCalendar}>
                            <input 
                              readOnly 
                              value={value} 
                              className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white cursor-pointer focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" 
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">توضیحات</label>
                    <input 
                      type="text" 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" 
                      placeholder="بابت عودت..."
                    />
                  </div>
                  
                </div>

                <div className="pt-6 border-t mt-6 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
                  >
                    {submitting ? 'در حال ثبت...' : (
                      <>
                        <CheckCircle className="w-5 h-5" /> تایید و ثبت درخواست
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : activeTab === 'report' ? (
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
               <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold mb-1">تعداد استردادها</p>
                    <p className="text-xl font-black font-sans">{reportStats.totalRequests}</p>
                  </div>
               </div>
               
               <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Archive className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold mb-1">جمع ثبت شده</p>
                    <p className="text-xl font-black font-sans text-amber-600">{Number(reportStats.totalAmountRegistered).toLocaleString()}</p>
                  </div>
               </div>

               <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold mb-1">جمع پرداخت شده</p>
                    <p className="text-xl font-black font-sans text-emerald-600">{Number(reportStats.totalAmountPaid).toLocaleString()}</p>
                  </div>
               </div>

               <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <X className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold mb-1">جمع کنسل شده</p>
                    <p className="text-xl font-black font-sans text-rose-600">{Number(reportStats.totalAmountCancelled).toLocaleString()}</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" /> روند استردادها (ریالی)
                </h3>
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportStats.chartData}>
                      <defs>
                        <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={val => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val)} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" name="ثبت شده" dataKey="registered" stroke="#f59e0b" fillOpacity={1} fill="url(#colorReg)" />
                      <Area type="monotone" name="پرداخت شده" dataKey="paid" stroke="#10b981" fillOpacity={1} fill="url(#colorPaid)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-indigo-500" /> تفکیک مبالغ استردادی
                </h3>
                {reportStats.pieData.length > 0 ? (
                  <div className="flex-1 flex flex-col justify-center min-h-[300px]" dir="ltr">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={reportStats.pieData}
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {reportStats.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center flex-wrap gap-4 mt-6" dir="rtl">
                      {reportStats.pieData.map(d => (
                        <div key={d.name} className="flex items-center gap-2 text-xs font-bold text-gray-600">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                          {d.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-medium">پراکنش دادهای یافت نشد</div>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}