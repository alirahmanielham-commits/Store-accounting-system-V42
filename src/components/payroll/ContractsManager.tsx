import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, FileText, Settings, XCircle } from 'lucide-react';
import { getContractTypes, addContractType, updateContractType, deleteContractType, getEmployeeContracts, addEmployeeContract, updateEmployeeContract, deleteEmployeeContract, getSalaryComponents, getContractComponents, addContractComponent, updateContractComponent, deleteContractComponent } from '../../services/hrService';
import Select from 'react-select';

export default function ContractsManager({ personsData, storeSettings, showNotification, DatePicker, persian, persian_fa }) {
  const [activeTab, setActiveTab] = useState('contracts'); // 'contracts', 'types'
  const [types, setTypes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [salComponents, setSalComponents] = useState([]);
  
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
    if (!typeForm.code || !typeForm.title) return showNotification('فیلدهای ضروری را پر کنید', 'error');
    try {
      if (editingTypeId) {
        await updateContractType(editingTypeId, typeForm);
        showNotification('با موفقیت ویرایش شد', 'success');
      } else {
        await addContractType({ id: Date.now().toString(), ...typeForm });
        showNotification('نوع قرارداد جدید ثبت شد', 'success');
      }
      setIsTypeModalOpen(false);
      fetchData();
    } catch (e) {
      showNotification('خطا در ذخیره', 'error');
    }
  };

  const getTimestampStr = (dateVal: any) => {
    if (!dateVal) return Date.now().toString();
    if (typeof dateVal.toUnix === 'function') {
      return (dateVal.toUnix() * 1000).toString();
    }
    if (typeof dateVal.toDate === 'function') {
      return dateVal.toDate().getTime().toString();
    }
    if (typeof dateVal.getTime === 'function') {
      return dateVal.getTime().toString();
    }
    const parsed = new Date(dateVal).getTime();
    return isNaN(parsed) ? Date.now().toString() : parsed.toString();
  };

  const handleSaveContract = async () => {
    if (!contractForm.personId || !contractForm.contractTypeId) return showNotification('پرسنل و نوع قرارداد الزامی است', 'error');
    try {
      const contractId = editingContractId || Date.now().toString();
      const startDateStr = getTimestampStr(contractForm.startDate);
      const endDateStr = getTimestampStr(contractForm.endDate);

      const payload = {
        personId: contractForm.personId.value,
        contractTypeId: contractForm.contractTypeId,
        startDate: startDateStr,
        endDate: endDateStr,
        location: contractForm.location,
        status: contractForm.status
      };

      if (editingContractId) {
        await updateEmployeeContract(editingContractId, payload);
        const allComps = await getContractComponents();
        for (const c of allComps.filter(c => c.contractId === editingContractId)) {
          await deleteContractComponent(c.id);
        }
      } else {
        await addEmployeeContract({ id: contractId, ...payload });
      }

      // Insert components
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

  return (
    <div className="p-6 bg-slate-50 min-h-full" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">مدیریت قراردادهای پرسنلی</h1>
            <p className="text-sm text-slate-500 mt-1">تخصیص شرایط حقوقی و دستمزد به کارمندان</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('types'); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'types' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
              <Settings className="w-4 h-4 inline-block ml-2" />
              انواع قرارداد
            </button>
            <button
              onClick={() => { setActiveTab('contracts'); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'contracts' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
              <Users className="w-4 h-4 inline-block ml-2" />
              لیست قراردادها
            </button>
          </div>
        </div>

        {activeTab === 'types' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between">
              <h3 className="font-bold text-slate-800">انواع قالب قرارداد</h3>
              <button onClick={() => {
                setEditingTypeId(null);
                setTypeForm({ code: '', title: '', durationType: 'fixed_term', standardMonthlyHours: 220 });
                setIsTypeModalOpen(true);
              }} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4"/> جدید</button>
            </div>
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr><th className="p-4">کد</th><th className="p-4">عنوان</th><th className="p-4">نوع مدت</th><th className="p-4">ساعات استاندارد</th><th className="p-4 text-center">عملیات</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {types.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono">{t.code}</td>
                    <td className="p-4 font-bold">{t.title}</td>
                    <td className="p-4">{t.durationType === 'fixed_term' ? 'مدت معین' : 'دائم'}</td>
                    <td className="p-4">{t.standardMonthlyHours} ساعت</td>
                    <td className="p-4 text-center">
                      <button onClick={() => { setEditingTypeId(t.id); setTypeForm(t); setIsTypeModalOpen(true); }} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 className="w-4 h-4"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-4 border-b border-slate-100 flex justify-between">
              <h3 className="font-bold text-slate-800">قراردادهای تخصیص یافته</h3>
              <button onClick={() => {
                setEditingContractId(null);
                setContractForm({ personId: null, contractTypeId: '', startDate: new Date(), endDate: new Date(), location: '', status: 'active', selectedComponents: [] });
                setIsContractModalOpen(true);
              }} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4"/> تخصیص قرارداد</button>
            </div>
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr><th className="p-4">پرسنل</th><th className="p-4">نوع قرارداد</th><th className="p-4">شروع</th><th className="p-4">پایان</th><th className="p-4">وضعیت</th><th className="p-4 text-center">عملیات</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold">{getPersonName(c.personId)}</td>
                    <td className="p-4">{getTypeName(c.contractTypeId)}</td>
                    <td className="p-4 text-slate-500 font-mono text-xs">{new Date(parseInt(c.startDate)).toLocaleDateString('fa-IR')}</td>
                    <td className="p-4 text-slate-500 font-mono text-xs">{c.endDate ? new Date(parseInt(c.endDate)).toLocaleDateString('fa-IR') : 'نامحدود'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${c.status==='active'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>
                        {c.status === 'active' ? 'فعال' : c.status === 'expired' ? 'منقضی' : 'فسخ شده'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button className="text-indigo-600 hover:text-indigo-800 text-xs font-bold" onClick={async () => {
                        // Load components to edit
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
                      }}>ویرایش</button>
                    </td>
                  </tr>
                ))}
                {contracts.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-slate-500">هیچ قراردادی ثبت نشده است</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-96 p-6">
            <h2 className="font-bold mb-4">{editingTypeId ? 'ویرایش قالب' : 'قالب قرارداد جدید'}</h2>
            <div className="space-y-4 text-sm">
               <div>
                  <label className="block mb-1 text-slate-600">کد قالب</label>
                  <input type="text" value={typeForm.code} onChange={e=>setTypeForm({...typeForm, code: e.target.value})} className="w-full border p-2 rounded" />
               </div>
               <div>
                  <label className="block mb-1 text-slate-600">عنوان</label>
                  <input type="text" value={typeForm.title} onChange={e=>setTypeForm({...typeForm, title: e.target.value})} className="w-full border p-2 rounded" />
               </div>
               <div>
                  <label className="block mb-1 text-slate-600">نوع</label>
                  <select value={typeForm.durationType} onChange={e=>setTypeForm({...typeForm, durationType: e.target.value})} className="w-full border p-2 rounded">
                    <option value="fixed_term">مدت دار (معین)</option>
                    <option value="indefinite">دائمی (نامحدود)</option>
                  </select>
               </div>
               <div>
                  <label className="block mb-1 text-slate-600">ساعت کار ماهانه</label>
                  <input type="number" value={typeForm.standardMonthlyHours} onChange={e=>setTypeForm({...typeForm, standardMonthlyHours: parseInt(e.target.value)})} className="w-full border p-2 rounded" />
               </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={()=>setIsTypeModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">انصراف</button>
              <button onClick={handleSaveType} className="px-4 py-2 bg-indigo-600 text-white rounded">ذخیره</button>
            </div>
          </div>
        </div>
      )}

      {isContractModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">{editingContractId ? 'ویرایش قرارداد' : 'تخصیص قرارداد'}</h2>
              <button onClick={()=>setIsContractModalOpen(false)}><XCircle className="w-6 h-6 text-slate-400"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">پرسنل</label>
                  <Select
                    value={contractForm.personId}
                    onChange={(v) => setContractForm({...contractForm, personId: v})}
                    options={(personsData||[]).map(p => ({value: p.id, label: p.name}))}
                    placeholder="انتخاب پرسنل"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">نوع قرارداد</label>
                  <select value={contractForm.contractTypeId} onChange={e=>setContractForm({...contractForm, contractTypeId: e.target.value})} className="w-full border p-2 rounded h-[38px]">
                    <option value="">انتخاب...</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">تاریخ شروع</label>
                  <DatePicker value={contractForm.startDate} onChange={d=>setContractForm({...contractForm, startDate: d})} calendar={persian} locale={persian_fa} inputClass="w-full border p-2 rounded h-[38px] text-center font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">تاریخ پایان</label>
                  <DatePicker value={contractForm.endDate} onChange={d=>setContractForm({...contractForm, endDate: d})} calendar={persian} locale={persian_fa} inputClass="w-full border p-2 rounded h-[38px] text-center font-mono" />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-indigo-700 border-b pb-2 mb-4 mt-6">اجزای حقوقی قرارداد (تخصیص فردی)</h3>
                <div className="space-y-2">
                  {salComponents.map(comp => {
                    const isSelected = contractForm.selectedComponents.some(sc => sc.componentId === comp.id);
                    const scData = contractForm.selectedComponents.find(sc => sc.componentId === comp.id) || {};
                    return (
                      <div key={comp.id} className={`p-3 border rounded-xl flex items-center gap-4 ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                        <label className="flex items-center gap-2 font-bold min-w-[200px]">
                          <input type="checkbox" checked={isSelected} onChange={(e) => {
                            if (e.target.checked) {
                              setContractForm({...contractForm, selectedComponents: [...contractForm.selectedComponents, { componentId: comp.id, overrideAmount: '', overrideFormula: '' }]});
                            } else {
                              setContractForm({...contractForm, selectedComponents: contractForm.selectedComponents.filter(sc => sc.componentId !== comp.id)});
                            }
                          }} className="w-4 h-4 rounded" />
                          {comp.title} ({comp.type === 'earning' ? '+' : '-'})
                        </label>
                        {isSelected && (
                          <div className="flex-1 flex gap-2">
                            {comp.calculationType === 'fixed' && (
                              <input type="number" placeholder="مبلغ اختصاصی (تومان) - اختیاری" value={scData.overrideAmount || ''} onChange={e => {
                                setContractForm({...contractForm, selectedComponents: contractForm.selectedComponents.map(sc => sc.componentId === comp.id ? {...sc, overrideAmount: e.target.value} : sc)})
                              }} className="border p-1.5 text-xs rounded flex-1" />
                            )}
                            {comp.calculationType === 'formula' && (
                              <input type="text" placeholder="فرمول اختصاصی - اختیاری" value={scData.overrideFormula || ''} onChange={e => {
                                setContractForm({...contractForm, selectedComponents: contractForm.selectedComponents.map(sc => sc.componentId === comp.id ? {...sc, overrideFormula: e.target.value} : sc)})
                              }} className="border p-1.5 text-xs rounded flex-1 text-left font-mono" dir="ltr" />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-slate-50">
              <button onClick={()=>setIsContractModalOpen(false)} className="px-6 py-2 bg-white border rounded-xl font-bold">لغو</button>
              <button onClick={handleSaveContract} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">ثبت قرارداد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
