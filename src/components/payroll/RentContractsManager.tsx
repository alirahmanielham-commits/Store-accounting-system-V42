import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, FileText, Check, X, AlertCircle, CheckCircle, Play } from 'lucide-react';
import { getRentContracts, addRentContract, updateRentContract, deleteRentContract, autoGenerateRentCommitments, testGenerateRentCommitments, getPendingRentCommitments } from '../../services/hrService';
import Select from 'react-select';
import { convertToGregorian } from '../../utils/format';
import { NumericFormat } from 'react-number-format';
import { getLedgerAccounts, addAccountingDocument, getAccountingDocuments, getTransactions } from '../../services/dataService';
import { Eye, Calendar } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

export default function RentContractsManager({ personsData, storeSettings, showNotification, DatePicker: _propDatePicker, persian: _propPersian, persian_fa: _propPersianFa }: any) {
  const DatePicker = CustomDatePicker;
  const [contracts, setContracts] = useState<any[]>([]);
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [issueDocModal, setIssueDocModal] = useState<any>(null);
  const [docForm, setDocForm] = useState({ date: new Date(), amount: '', description: '', ledgerAccountId: '' });
  const [ledgerAccounts, setLedgerAccounts] = useState<any[]>([]);
  const [reportModal, setReportModal] = useState<any>(null);
  const [activationModal, setActivationModal] = useState<any>(null);
  const [reportData, setReportData] = useState<any>({ docs: [], transactions: [] });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    personId: null as any,
    contractNumber: '',
    startDate: new Date(),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    monthlyAmount: '',
    depositAmount: '',
    paymentDay: '',
    expenseAccountId: '',
    description: '',
    status: 'draft'
  });

  const autoGenerateContractNumber = (selectedPersonId: any, sDate: any, eDate: any) => {
    if (!selectedPersonId || !sDate || !eDate || !personsData) return '';
    const person = personsData.find((p: any) => String(p.id) === String(selectedPersonId));
    if (!person) return '';
    const code = person.personCode || person.id;
    try {
      const sDateObj = sDate instanceof Date ? sDate : new Date(convertToGregorian(sDate));
      const eDateObj = eDate instanceof Date ? eDate : new Date(convertToGregorian(eDate));
      const sYear = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(sDateObj);
      const eYear = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(eDateObj);
      return `${code}${sYear}${eYear}`;
    } catch(e) {
      return '';
    }
  };

  useEffect(() => {
    if (!editingId && form.personId && form.startDate && form.endDate) {
      const generated = autoGenerateContractNumber(form.personId.value, form.startDate, form.endDate);
      if (generated && generated !== form.contractNumber) {
        setForm(prev => ({ ...prev, contractNumber: generated }));
      }
    }
  }, [form.personId, form.startDate, form.endDate, editingId, personsData]);


  const [deleteId, setDeleteId] = useState<string | null>(null);

  const parseSafeDate = (val: any) => {
    if (!val) return null;
    const num = Number(val);
    const dateObj = !isNaN(num) ? new Date(num) : new Date(val);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  };

  useEffect(() => {
    fetchData();
  }, []);

    const fetchData = async () => {
    try {
      const data = await getRentContracts();
      setContracts(data || []);
      const accs = await getLedgerAccounts();
      setLedgerAccounts(accs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const getPersonName = (id: string) => {
    const p = (personsData || []).find((x: any) => x.id === id);
    return p ? p.name : 'نامشخص';
  };

  const filteredContracts = useMemo(() => {
    if (!searchQuery) return contracts;
    return contracts.filter(c => getPersonName(c.personId).includes(searchQuery));
  }, [contracts, searchQuery, personsData]);

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      personId: { value: c.personId, label: getPersonName(c.personId) },
      contractNumber: c.contractNumber || '',
      startDate: c.startDate ? new Date(c.startDate) : new Date(),
      endDate: c.endDate ? new Date(c.endDate) : new Date(),
      monthlyAmount: c.monthlyAmount || '',
      depositAmount: c.depositAmount || '',
      paymentDay: c.paymentDay || '',
      expenseAccountId: c.expenseAccountId || '',
      description: c.description || '',
      status: c.status || 'draft'
    });
    setIsModalOpen(true);
  };

  const handleIssueDoc = async () => {
    if (!docForm.ledgerAccountId) {
      return showNotification('انتخاب حساب هزینه الزامی است', 'error');
    }
    if (!docForm.amount || Number(docForm.amount) <= 0) {
      return showNotification('مبلغ نامعتبر است', 'error');
    }

    try {
      const doc = {
        date: docForm.date instanceof Date ? docForm.date.toISOString() : new Date(docForm.date).toISOString(),
        description: docForm.description,
        status: 'approved',
        sourceType: 'rent_contract',
        sourceId: issueDocModal.id,
        items: [
          {
            ledgerAccountId: docForm.ledgerAccountId,
            detailedAccountId: '',
            debit: Number(docForm.amount),
            credit: 0,
            description: docForm.description
          },
          {
            ledgerAccountId: (await getLedgerAccounts()).find((a: any) => a.code === '2001' || a.title === 'حسابهای پرداختنی')?.id || docForm.ledgerAccountId,
            detailedAccountId: issueDocModal.personId,
            debit: 0,
            credit: Number(docForm.amount),
            description: docForm.description
          }
        ]
      };
      await addAccountingDocument(doc);
      showNotification('سند تعهد با موفقیت صادر شد', 'success');
      setIssueDocModal(null);
    } catch (e) {
      console.error(e);
      showNotification('خطا در صدور سند', 'error');
    }
  };

  const handleActivate = async () => {
    if (!activationModal) return;
    try {
      await updateRentContract(activationModal.id, { ...activationModal, status: 'active' });
      await autoGenerateRentCommitments();
      showNotification('قرارداد با موفقیت تایید نهایی شد', 'success');
      setActivationModal(null);
      fetchData();
    } catch (e) {
      console.error(e);
      showNotification('خطا در تایید قرارداد', 'error');
    }
  };

  const handleSave = async () => {
    if (loading) return;
    if (!form.personId) return showNotification('طرف قرارداد باید انتخاب شود', 'error');
    if (!form.monthlyAmount) return showNotification('مبلغ ماهانه الزامی است', 'error');

    setLoading(true);
    try {
      const getIsoDateStr = (dateVal: any) => {
        if (!dateVal) return null;
        try {
          if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal.toISOString();
          if (typeof dateVal.toDate === 'function') return dateVal.toDate().toISOString();
          if (typeof dateVal === 'string') {
            return convertToGregorian(dateVal);
          }
          const parsed = new Date(dateVal);
          if (!isNaN(parsed.getTime())) return parsed.toISOString();
          return null;
        } catch(e) {
          return null;
        }
      };

      const startDateIso = getIsoDateStr(form.startDate);
      const endDateIso = getIsoDateStr(form.endDate);

      if (!startDateIso) return showNotification('تاریخ شروع الزامی است', 'error');

      const personContracts = contracts.filter(c => c.personId === form.personId.value && c.id !== editingId && c.status === 'active');
      const newStartObj = new Date(startDateIso);
      newStartObj.setHours(0,0,0,0);
      const newStart = newStartObj.getTime();

      const newEndObj = endDateIso ? new Date(endDateIso) : null;
      if (newEndObj) newEndObj.setHours(23,59,59,999);
      const newEnd = newEndObj ? newEndObj.getTime() : Infinity;

      const hasOverlap = personContracts.some(existing => {
        const exStartObj = parseSafeDate(existing.startDate);
        const exEndObj = parseSafeDate(existing.endDate);
        if (!exStartObj) return false;
        
        exStartObj.setHours(0,0,0,0);
        const exStart = exStartObj.getTime();

        if (exEndObj) exEndObj.setHours(23,59,59,999);
        const exEnd = exEndObj ? exEndObj.getTime() : Infinity;

        return (newStart <= exEnd) && (newEnd >= exStart);
      });

      if (hasOverlap && form.status === 'active') {
        return showNotification('این طرف قرارداد در این بازه زمانی قرارداد فعال دیگری دارد.', 'error');
      }

      let pDay = Number(form.paymentDay);
      if (!pDay) {
        const jd = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {day: 'numeric'}).format(new Date(startDateIso));
        pDay = parseInt(jd, 10) || 1;
      }

      const payload = {
        personId: form.personId.value,
        contractNumber: form.contractNumber,
        startDate: startDateIso,
        endDate: endDateIso,
        monthlyAmount: Number(form.monthlyAmount),
        depositAmount: Number(form.depositAmount),
        paymentDay: pDay,
        expenseAccountId: form.expenseAccountId,
        description: form.description,
        status: form.status
      };

      if (editingId) {
        await updateRentContract(editingId, payload);
      } else {
        const newId = Date.now().toString() + Math.random().toString().substring(2,8);
        await addRentContract({ id: newId, ...payload });
      }

      showNotification('قرارداد اجاره با موفقیت ثبت شد', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (e) {
      showNotification('خطا در ثبت قرارداد', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteId) {
        await deleteRentContract(deleteId);
        showNotification('قرارداد با موفقیت حذف شد', 'success');
        setDeleteId(null);
        fetchData();
      }
    } catch (e) {
      showNotification('خطا در حذف قرارداد', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            placeholder="جستجو طرف قرارداد..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm w-64"
          />
          <button
            onClick={async () => {
              try {
                await testGenerateRentCommitments();
                showNotification('برای هر قرارداد فعال، یک سند تستی صادر شد', 'success');
                fetchData();
              } catch (e) {
                console.error(e);
                showNotification('خطا در اجرای تست', 'error');
              }
            }}
            className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-200 transition-colors border border-amber-200"
            title="صدور اجباری سند برای همه قراردادهای فعال (بدون در نظر گرفتن تاریخ)"
          >
            <Play className="w-5 h-5" />
            تست ایجاد اسناد
          </button>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setForm({
              personId: null,
              contractNumber: '',
              startDate: new Date(new Date().setHours(0,0,0,0)),
              endDate: new Date(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).setHours(0,0,0,0)),
              monthlyAmount: '',
    depositAmount: '',
    paymentDay: '',
    expenseAccountId: '',
    description: '',
              status: 'draft'
            });
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          ثبت قرارداد اجاره جدید
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="p-4 font-bold">طرف قرارداد</th>
                <th className="p-4 font-bold">شماره قرارداد</th>
                <th className="p-4 font-bold">بازه زمانی</th>
                <th className="p-4 font-bold text-center">مبالغ قرارداد</th>
                <th className="p-4 font-bold text-center">وضعیت</th>
                <th className="p-4 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContracts.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{getPersonName(c.personId)}</td>
                  <td className="p-4 text-slate-600">{c.contractNumber || '---'}</td>
                  <td className="p-4 text-slate-500 text-xs">
                    {parseSafeDate(c.startDate)?.toLocaleDateString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR')}
                    {' '}تا{' '}
                    {c.endDate ? parseSafeDate(c.endDate)?.toLocaleDateString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR') : 'نامحدود'}
                  </td>
                  <td className="p-4 text-center text-sm">
                    <div className="flex flex-col gap-1 items-center">
                      <span className="font-bold text-emerald-600" title="اجاره ماهانه">{Number(c.monthlyAmount).toLocaleString()} {storeSettings?.currency || 'ریال'}</span>
                      {c.depositAmount ? <span className="text-xs text-amber-600" title="ودیعه">(ودیعه: {Number(c.depositAmount).toLocaleString()} {storeSettings?.currency || 'ریال'})</span> : null}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border \${
                      c.status==='active'?'bg-emerald-50 text-emerald-700 border-emerald-200':
                      c.status==='expired'?'bg-amber-50 text-amber-700 border-amber-200':
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {c.status === 'active' ? 'فعال' : c.status === 'expired' ? 'منقضی' : 'پیش‌نویس'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                      {c.status === 'draft' && (
                        <button onClick={() => setActivationModal(c)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="تایید نهایی قرارداد">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
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
                        const cTrans = (trans || []).filter((t: any) => String(t.personId) === String(c.personId) && t.type === 'payment');
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
                    </div>
                  </td>
                </tr>
              ))}
              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">قرارداد اجاره‌ای ثبت نشده است</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                {editingId ? 'ویرایش قرارداد اجاره' : 'ثبت قرارداد اجاره جدید'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">طرف قرارداد <span className="text-rose-500">*</span></label>
                  <Select
                    value={form.personId}
                    onChange={(val) => setForm({...form, personId: val})}
                    options={(personsData || []).map((p: any) => ({ value: p.id, label: p.name }))}
                    placeholder="انتخاب شخص..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">شماره قرارداد</label>
                  <input 
                    type="text" 
                    value={form.contractNumber}
                    onChange={e => setForm({...form, contractNumber: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500"
                    placeholder="مثال: R-102"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" /> تاریخ شروع <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <DatePicker
                      value={form.startDate}
                      onChange={(date: any) => setForm(prev => ({ ...prev, startDate: date }))}
                      calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                      locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                      calendarPosition="bottom-right"
                      inputClass="w-full pl-11 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-sans font-bold text-slate-900 text-center transition-all cursor-pointer shadow-sm text-base"
                      containerClassName="w-full"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" /> تاریخ پایان
                  </label>
                  <div className="relative">
                    <DatePicker
                      value={form.endDate}
                      onChange={(date: any) => setForm(prev => ({ ...prev, endDate: date }))}
                      calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                      locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                      calendarPosition="bottom-right"
                      inputClass="w-full pl-11 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-sans font-bold text-slate-900 text-center transition-all cursor-pointer shadow-sm text-base"
                      containerClassName="w-full"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">مبلغ ماهانه تعهد ({storeSettings?.currency || 'ریال'}) <span className="text-rose-500">*</span></label>
                  <NumericFormat 
                    value={form.monthlyAmount}
                    onValueChange={(values) => setForm({...form, monthlyAmount: values.value})}
                    thousandSeparator=","
                    className="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500 text-left"
                    placeholder="0"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">مبلغ ودیعه/پیش‌پرداخت ({storeSettings?.currency || 'ریال'})</label>
                  <NumericFormat 
                    value={form.depositAmount}
                    onValueChange={(values) => setForm({...form, depositAmount: values.value})}
                    thousandSeparator=","
                    className="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500 text-left"
                    placeholder="0"
                    dir="ltr"
                  />
                </div>
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
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">حساب هزینه (برای صدور اتوماتیک)</label>
                  <Select
                    options={ledgerAccounts.map(a => ({ value: a.id, label: `${a.code} - ${a.title}` }))}
                    value={form.expenseAccountId ? { value: form.expenseAccountId, label: ledgerAccounts.find(a => String(a.id) === String(form.expenseAccountId))?.title } : null}
                    onChange={(val: any) => setForm({ ...form, expenseAccountId: val?.value || '' })}
                    placeholder="انتخاب حساب..."
                    className="text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت</label>
                  <select 
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500"
                  >
                    <option value="draft">پیش‌نویس</option>
                    <option value="active">فعال</option>
                    <option value="expired">منقضی شده</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">توضیحات</label>
                  <textarea 
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 h-24 resize-none"
                    placeholder="توضیحات تکمیلی اجاره‌نامه..."
                  ></textarea>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
                <Check className="w-5 h-5" /> ثبت و ذخیره
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">حذف قرارداد اجاره</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                آیا از حذف این قرارداد اطمینان دارید؟ این عمل غیرقابل بازگشت است.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold shadow-sm hover:bg-rose-700 transition-all">حذف قرارداد</button>
            </div>
          </div>
        </div>
      )}

      {activationModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 bg-emerald-600 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> تایید نهایی قرارداد اجاره
              </h3>
              <button onClick={() => setActivationModal(null)} className="p-2 bg-emerald-700/50 hover:bg-emerald-700 rounded-xl transition-colors text-white/90">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-sm text-slate-500">طرف حساب:</span>
                  <span className="font-bold text-slate-800">{getPersonName(activationModal.personId)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-sm text-slate-500">شماره قرارداد:</span>
                  <span className="font-bold text-slate-800 font-mono">{activationModal.contractNumber || '---'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-sm text-slate-500">مبلغ اجاره:</span>
                  <span className="font-bold text-emerald-600">{Number(activationModal.monthlyAmount).toLocaleString()} {storeSettings?.currency || 'ریال'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">روز تعهد پرداخت:</span>
                  <span className="font-bold text-indigo-600">روز {activationModal.paymentDay} هر ماه</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-100 text-justify">
                <strong>توجه:</strong> با تایید نهایی این قرارداد، سیستم به‌طور خودکار در سررسیدِ تعیین‌شده (روز {activationModal.paymentDay} هر ماه) یک سند حسابداری تعهدی صادر کرده و مبلغ اجاره را به حساب شخص بستانکار می‌کند. آیا از تایید نهایی اطمینان دارید؟
              </p>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setActivationModal(null)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleActivate} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> تایید و فعال‌سازی
              </button>
            </div>
          </div>
        </div>
      )}

      {issueDocModal && (
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
}
