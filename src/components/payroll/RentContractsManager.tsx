import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, FileText, Check, X, AlertCircle } from 'lucide-react';
import { getRentContracts, addRentContract, updateRentContract, deleteRentContract } from '../../services/hrService';
import Select from 'react-select';
import { NumericFormat } from 'react-number-format';

export default function RentContractsManager({ personsData, storeSettings, showNotification, DatePicker, persian, persian_fa }: any) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    personId: null as any,
    contractNumber: '',
    startDate: new Date(),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    monthlyAmount: '',
    depositAmount: '',
    description: '',
    status: 'draft'
  });

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

  const handleSave = async () => {
    if (!form.personId) return showNotification('طرف قرارداد باید انتخاب شود', 'error');
    if (!form.monthlyAmount) return showNotification('مبلغ ماهانه الزامی است', 'error');

    try {
      const getIsoDateStr = (dateVal: any) => {
        if (!dateVal) return null;
        if (dateVal instanceof Date) return dateVal.toISOString();
        if (typeof dateVal.toDate === 'function') return dateVal.toDate().toISOString();
        const parsed = new Date(dateVal);
        if (!isNaN(parsed.getTime())) return parsed.toISOString();
        return null;
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

      const payload = {
        personId: form.personId.value,
        contractNumber: form.contractNumber,
        startDate: startDateIso,
        endDate: endDateIso,
        monthlyAmount: Number(form.monthlyAmount),
        depositAmount: Number(form.depositAmount),
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
        <input 
          type="text" 
          placeholder="جستجو طرف قرارداد..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm w-64"
        />
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
                      <button onClick={() => {
                        setEditingId(c.id);
                        setForm({
                          personId: { value: c.personId, label: getPersonName(c.personId) },
                          contractNumber: c.contractNumber || '',
                          startDate: parseSafeDate(c.startDate) || new Date(),
                          endDate: c.endDate ? parseSafeDate(c.endDate) : new Date(),
                          monthlyAmount: c.monthlyAmount || '',
                          depositAmount: c.depositAmount || '',
                          description: c.description || '',
                          status: c.status || 'draft'
                        });
                        setIsModalOpen(true);
                      }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
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
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ شروع <span className="text-rose-500">*</span></label>
                  <DatePicker
                    value={form.startDate}
                    onChange={(date: any) => setForm({...form, startDate: date})}
                    calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500 text-left"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ پایان</label>
                  <DatePicker
                    value={form.endDate}
                    onChange={(date: any) => setForm({...form, endDate: date})}
                    calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[9px] outline-none focus:border-indigo-500 text-left"
                  />
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
    </div>
  );
}
