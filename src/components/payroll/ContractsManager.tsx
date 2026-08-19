import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Users, FileText, Settings, XCircle, Search, Calendar, MapPin, CheckCircle, AlertCircle, X, ChevronDown, Check, Building, FileSignature } from 'lucide-react';
import { getContractTypes, addContractType, updateContractType, deleteContractType, getEmployeeContracts, addEmployeeContract, updateEmployeeContract, deleteEmployeeContract, getSalaryComponents, getContractComponents, addContractComponent, updateContractComponent, deleteContractComponent } from '../../services/hrService';
import Select from 'react-select';

export default function ContractsManager({ personsData, storeSettings, showNotification, DatePicker, persian, persian_fa }) {
  const [activeTab, setActiveTab] = useState('contracts'); // 'contracts', 'types'
  const [types, setTypes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [salComponents, setSalComponents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  // States for Type
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [typeForm, setTypeForm] = useState({ code: '', title: '', durationType: 'fixed_term', standardMonthlyHours: 220 });

  // States for Contract
  const [editingContractId, setEditingContractId] = useState(null);
  const [contractForm, setContractForm] = useState({
    personId: null,
    contractTypeId: '',
    startDate: new Date(),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    location: '',
    status: 'active',
    selectedComponents: [] // Array of { componentId, overrideAmount, overrideFormula }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cTypes, emps, sals] = await Promise.all([
        getContractTypes(),
        getEmployeeContracts(),
        getSalaryComponents()
      ]);
      setTypes(cTypes || []);
      setContracts(emps || []);
      setSalComponents((sals || []).filter(s => s.isActive));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveType = async () => {
    if (!typeForm.code || !typeForm.title) return showNotification('کد و عنوان الزامی است', 'error');
    try {
      if (editingTypeId) {
        await updateContractType(editingTypeId, typeForm);
      } else {
        await addContractType({ id: Date.now().toString(), ...typeForm });
      }
      showNotification('نوع قرارداد ذخیره شد', 'success');
      setIsTypeModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ذخیره', 'error');
    }
  };

  const handleDeleteType = async (id) => {
    if(!window.confirm('مطمئن هستید؟')) return;
    try {
      await deleteContractType(id);
      showNotification('حذف شد', 'success');
      fetchData();
    } catch(e) {
      showNotification('خطا در حذف', 'error');
    }
  };

  const handleSaveContract = async () => {
    if (!contractForm.personId || !contractForm.contractTypeId) return showNotification('پرسنل و نوع قرارداد الزامی است', 'error');
    
    try {
      const contractId = editingContractId || Date.now().toString();
      
      const getTimestampStr = (dateVal) => {
        if (!dateVal) return null;
        if (typeof dateVal.toUnix === 'function') {
           return (dateVal.toUnix() * 1000).toString();
        }
        if (dateVal instanceof Date) {
           return dateVal.getTime().toString();
        }
        return new Date(dateVal).getTime().toString();
      };
      
      const payload = {
        personId: contractForm.personId.value,
        contractTypeId: contractForm.contractTypeId,
        startDate: getTimestampStr(contractForm.startDate),
        endDate: getTimestampStr(contractForm.endDate),
        location: contractForm.location,
        status: contractForm.status
      };

      if (editingContractId) {
        await updateEmployeeContract(contractId, payload);
        const allComps = await getContractComponents();
        for (const c of allComps.filter(c => c.contractId === editingContractId)) {
          await deleteContractComponent(c.id);
        }
      } else {
        await addEmployeeContract({ id: contractId, ...payload });
      }

      if (contractForm.selectedComponents.length > 0) {
        for (const sc of contractForm.selectedComponents) {
          await addContractComponent({
            id: Date.now().toString() + Math.random().toString(),
            contractId,
            componentId: sc.componentId,
            overrideAmount: sc.overrideAmount ? sc.overrideAmount.toString() : null,
            overrideFormula: sc.overrideFormula || null
          });
        }
      }

      showNotification('قرارداد با موفقیت ذخیره شد', 'success');
      setIsContractModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ثبت قرارداد', 'error');
    }
  };

  const getPersonName = (id) => {
    const p = (personsData || []).find(x => x.id === id);
    return p ? p.name : 'نامشخص';
  };

  const getTypeName = (id) => {
    const t = types.find(x => x.id === id);
    return t ? t.title : 'نامشخص';
  };

  const filteredContracts = useMemo(() => {
    if (!searchQuery) return contracts;
    return contracts.filter(c => {
      const pName = getPersonName(c.personId) || '';
      const tName = getTypeName(c.contractTypeId) || '';
      return pName.includes(searchQuery) || tName.includes(searchQuery);
    });
  }, [contracts, searchQuery, personsData, types]);

  const activeContractsCount = contracts.filter(c => c.status === 'active').length;
  const expiredContractsCount = contracts.filter(c => c.status === 'expired').length;

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <FileSignature className="w-8 h-8 text-indigo-600" />
              مدیریت پیشرفته قراردادها
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">تعریف تیپ‌های قراردادی، انتساب به پرسنل و مدیریت اجزای حقوقی</p>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-200/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('contracts')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'contracts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'}`}
            >
              <Users className="w-4 h-4" />
              قراردادهای پرسنل
            </button>
            <button
              onClick={() => setActiveTab('types')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'types' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'}`}
            >
              <Settings className="w-4 h-4" />
              تیپ‌های قراردادی
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {activeTab === 'contracts' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><FileText className="w-6 h-6"/></div>
              <div>
                <p className="text-sm text-slate-500 font-bold mb-1">کل قراردادها</p>
                <h4 className="text-2xl font-black text-slate-800">{contracts.length}</h4>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle className="w-6 h-6"/></div>
              <div>
                <p className="text-sm text-slate-500 font-bold mb-1">قراردادهای فعال</p>
                <h4 className="text-2xl font-black text-slate-800">{activeContractsCount}</h4>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertCircle className="w-6 h-6"/></div>
              <div>
                <p className="text-sm text-slate-500 font-bold mb-1">منقضی / فسخ شده</p>
                <h4 className="text-2xl font-black text-slate-800">{expiredContractsCount}</h4>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Types */}
        {activeTab === 'types' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">قالب‌های استاندارد قرارداد</h3>
              <button onClick={() => {
                setEditingTypeId(null);
                setTypeForm({ code: '', title: '', durationType: 'fixed_term', standardMonthlyHours: 220 });
                setIsTypeModalOpen(true);
              }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4"/> ایجاد تیپ جدید
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-white text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-4 font-bold text-slate-600">کد تیپ</th>
                    <th className="p-4 font-bold text-slate-600">عنوان قرارداد</th>
                    <th className="p-4 font-bold text-slate-600">نوع همکاری</th>
                    <th className="p-4 font-bold text-slate-600">ساعت کار ماهانه</th>
                    <th className="p-4 font-bold text-slate-600 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {types.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-700">{t.code}</td>
                      <td className="p-4 font-bold text-indigo-900">{t.title}</td>
                      <td className="p-4 text-slate-600">{t.durationType === 'fixed_term' ? 'مدت معین' : 'دائم'}</td>
                      <td className="p-4 font-mono text-slate-600">{t.standardMonthlyHours} <span className="font-sans text-xs">ساعت</span></td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setEditingTypeId(t.id); setTypeForm(t); setIsTypeModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={() => handleDeleteType(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {types.length === 0 && (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium">هیچ تیپ قراردادی تعریف نشده است</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Contracts */}
        {activeTab === 'contracts' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div className="relative max-w-md w-full">
                <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="جستجوی پرسنل یا نوع قرارداد..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium"
                />
              </div>
              <button onClick={() => {
                setEditingContractId(null);
                setContractForm({ personId: null, contractTypeId: '', startDate: new Date(), endDate: new Date(), location: '', status: 'active', selectedComponents: [] });
                setIsContractModalOpen(true);
              }} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap">
                <Plus className="w-4 h-4"/> انتساب قرارداد جدید
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-white text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-4 font-bold text-slate-600">پرسنل</th>
                    <th className="p-4 font-bold text-slate-600">نوع قرارداد</th>
                    <th className="p-4 font-bold text-slate-600">تاریخ شروع</th>
                    <th className="p-4 font-bold text-slate-600">تاریخ پایان</th>
                    <th className="p-4 font-bold text-slate-600 text-center">وضعیت</th>
                    <th className="p-4 font-bold text-slate-600 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContracts.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg flex-shrink-0">
                            {getPersonName(c.personId).substring(0, 1)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{getPersonName(c.personId)}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{c.location || 'بدون محل کار'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-700">{getTypeName(c.contractTypeId)}</td>
                      <td className="p-4 text-slate-500 font-mono text-xs">{new Date(parseInt(c.startDate)).toLocaleDateString('fa-IR')}</td>
                      <td className="p-4 text-slate-500 font-mono text-xs">{c.endDate ? new Date(parseInt(c.endDate)).toLocaleDateString('fa-IR') : 'نامحدود'}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border ${
                          c.status==='active'?'bg-emerald-50 text-emerald-700 border-emerald-200':
                          c.status==='expired'?'bg-amber-50 text-amber-700 border-amber-200':
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {c.status === 'active' ? 'فعال' : c.status === 'expired' ? 'منقضی' : 'فسخ شده'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={async () => {
                          const allDbComps = await getContractComponents();
                          const dbComps = allDbComps.filter(cc => cc.contractId === c.id);
                          setEditingContractId(c.id);
                          setContractForm({
                            personId: { value: c.personId, label: getPersonName(c.personId) },
                            contractTypeId: c.contractTypeId,
                            startDate: new Date(parseInt(c.startDate)),
                            endDate: c.endDate ? new Date(parseInt(c.endDate)) : new Date(),
                            location: c.location || '',
                            status: c.status || 'active',
                            selectedComponents: dbComps
                          });
                          setIsContractModalOpen(true);
                        }} className="px-3 py-1.5 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors">
                          مشاهده و ویرایش
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredContracts.length === 0 && (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-medium">هیچ قراردادی یافت نشد</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">{editingTypeId ? 'ویرایش تیپ قرارداد' : 'تعریف تیپ قرارداد'}</h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">کد تیپ</label>
                <input type="text" value={typeForm.code} onChange={e => setTypeForm({...typeForm, code: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-mono text-left" dir="ltr" placeholder="CON-01" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">عنوان</label>
                <input type="text" value={typeForm.title} onChange={e => setTypeForm({...typeForm, title: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500" placeholder="مثلا قرارداد کار موقت" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">نوع مدت</label>
                <select value={typeForm.durationType} onChange={e => setTypeForm({...typeForm, durationType: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-3 outline-none focus:border-indigo-500">
                  <option value="fixed_term">مدت معین (موقت)</option>
                  <option value="permanent">دائم</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">ساعات کار استاندارد ماهانه</label>
                <input type="number" value={typeForm.standardMonthlyHours} onChange={e => setTypeForm({...typeForm, standardMonthlyHours: parseInt(e.target.value)})} className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 font-mono text-left" dir="ltr" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsTypeModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors">لغو</button>
              <button onClick={handleSaveType} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm">ذخیره تیپ</button>
            </div>
          </div>
        </div>
      )}

      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-full overflow-hidden">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><FileSignature className="w-5 h-5"/></div>
                <h3 className="font-bold text-slate-800 text-lg">{editingContractId ? 'ویرایش قرارداد پرسنل' : 'انتساب قرارداد جدید'}</h3>
              </div>
              <button onClick={() => setIsContractModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Employee Selection */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">انتخاب پرسنل</label>
                  <Select
                    options={(personsData||[]).map(p => ({value: p.id, label: p.name}))}
                    value={contractForm.personId}
                    onChange={v => setContractForm({...contractForm, personId: v})}
                    placeholder="جستجو و انتخاب پرسنل..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', padding: '2px', boxShadow: 'none', '&:hover': {borderColor: '#cbd5e1'}}),
                    }}
                  />
                </div>
                
                {/* Contract Type */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">نوع (تیپ) قرارداد</label>
                  <select value={contractForm.contractTypeId} onChange={e => setContractForm({...contractForm, contractTypeId: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-[11px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium">
                    <option value="">انتخاب کنید...</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>

                {/* Dates */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ شروع</label>
                  <DatePicker
                    calendar={persian}
                    locale={persian_fa}
                    value={contractForm.startDate}
                    onChange={(date) => setContractForm({...contractForm, startDate: date})}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[11px] text-center font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ پایان (اختیاری برای دائم)</label>
                  <DatePicker
                    calendar={persian}
                    locale={persian_fa}
                    value={contractForm.endDate}
                    onChange={(date) => setContractForm({...contractForm, endDate: date})}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[11px] text-center font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Location & Status */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">محل خدمت</label>
                  <div className="relative">
                    <MapPin className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={contractForm.location} onChange={e => setContractForm({...contractForm, location: e.target.value})} className="w-full pl-4 pr-10 py-[11px] bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" placeholder="مثلا دفتر مرکزی" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت قرارداد</label>
                  <select value={contractForm.status} onChange={e => setContractForm({...contractForm, status: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-[11px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium">
                    <option value="active">فعال (در حال اجرا)</option>
                    <option value="expired">منقضی شده</option>
                    <option value="terminated">فسخ شده</option>
                  </select>
                </div>
              </div>

              {/* Components Assignment Section */}
              <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 p-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><Building className="w-5 h-5 text-indigo-500"/> مدیریت اجزای حقوقی و کسورات در این قرارداد</h4>
                  <p className="text-xs text-slate-500 mt-1">آیتم‌های مورد نظر را برای این قرارداد فعال کنید. مقادیر پیش‌فرض از تنظیمات حقوق خوانده می‌شود، اما می‌توانید برای این پرسنل مبلغ، درصد یا فرمول اختصاصی تعریف کنید.</p>
                </div>
                
                <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {salComponents.map(comp => {
                    const scData = contractForm.selectedComponents.find(sc => sc.componentId === comp.id);
                    const isSelected = !!scData;
                    return (
                      <div key={comp.id} className={`p-4 border rounded-xl flex flex-col lg:flex-row lg:items-center gap-4 transition-all ${isSelected ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                        
                        <label className="flex items-center gap-3 font-bold min-w-[220px] cursor-pointer group">
                          <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                          <input type="checkbox" checked={isSelected} onChange={(e) => {
                            if (e.target.checked) {
                              setContractForm({...contractForm, selectedComponents: [...contractForm.selectedComponents, { componentId: comp.id, overrideAmount: '', overrideFormula: '' }]});
                            } else {
                              setContractForm({...contractForm, selectedComponents: contractForm.selectedComponents.filter(sc => sc.componentId !== comp.id)});
                            }
                          }} className="hidden" />
                          <div className="flex flex-col">
                            <span className={isSelected ? 'text-indigo-900' : 'text-slate-700'}>{comp.title}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">{comp.type === 'earning' ? 'مزایا' : 'کسورات'} • {
                              comp.calculationType === 'fixed' ? 'مبلغ ثابت' : 
                              comp.calculationType === 'formula' ? 'فرمول' : 
                              comp.calculationType === 'percentage' ? 'درصدی' : 'وابسته به زمان'
                            }</span>
                          </div>
                        </label>
                        
                        {isSelected && (
                          <div className="flex-1 flex gap-3 mt-3 lg:mt-0 animate-in fade-in slide-in-from-right-4 duration-200">
                            {comp.calculationType === 'fixed' && (
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">تومان (اختیاری)</span>
                                <input type="number" placeholder="مبلغ اختصاصی قرارداد" value={scData.overrideAmount || ''} onChange={e => {
                                  setContractForm({...contractForm, selectedComponents: contractForm.selectedComponents.map(sc => sc.componentId === comp.id ? {...sc, overrideAmount: e.target.value} : sc)})
                                }} className="w-full bg-white border border-indigo-100 focus:border-indigo-500 py-2.5 pl-24 pr-3 text-sm rounded-lg outline-none font-mono transition-colors" dir="ltr" />
                              </div>
                            )}
                            {comp.calculationType === 'formula' && (
                              <input type="text" placeholder="فرمول محاسباتی اختصاصی - اختیاری" value={scData.overrideFormula || ''} onChange={e => {
                                setContractForm({...contractForm, selectedComponents: contractForm.selectedComponents.map(sc => sc.componentId === comp.id ? {...sc, overrideFormula: e.target.value} : sc)})
                              }} className="w-full bg-white border border-indigo-100 focus:border-indigo-500 py-2.5 px-3 text-sm rounded-lg outline-none font-mono text-left transition-colors" dir="ltr" />
                            )}
                            {comp.calculationType === 'percentage' && (
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">% درصد (اختیاری)</span>
                                <input type="number" placeholder="درصد اختصاصی" value={scData.overrideAmount || ''} onChange={e => {
                                  setContractForm({...contractForm, selectedComponents: contractForm.selectedComponents.map(sc => sc.componentId === comp.id ? {...sc, overrideAmount: e.target.value} : sc)})
                                }} className="w-full bg-white border border-indigo-100 focus:border-indigo-500 py-2.5 pl-28 pr-3 text-sm rounded-lg outline-none font-mono text-left transition-colors" dir="ltr" />
                              </div>
                            )}
                            {comp.calculationType === 'time_based' && (
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">نرخ پایه (اختیاری)</span>
                                <input type="number" placeholder="نرخ اختصاصی" value={scData.overrideAmount || ''} onChange={e => {
                                  setContractForm({...contractForm, selectedComponents: contractForm.selectedComponents.map(sc => sc.componentId === comp.id ? {...sc, overrideAmount: e.target.value} : sc)})
                                }} className="w-full bg-white border border-indigo-100 focus:border-indigo-500 py-2.5 pl-28 pr-3 text-sm rounded-lg outline-none font-mono text-left transition-colors" dir="ltr" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {salComponents.length === 0 && (
                    <div className="text-center py-8 text-slate-500">ابتدا باید اجزای حقوقی را در تنظیمات تعریف کنید</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button onClick={()=>setIsContractModalOpen(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleSaveContract} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-sm shadow-indigo-200 hover:bg-indigo-700 hover:shadow-md transition-all">ثبت و تایید قرارداد</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
