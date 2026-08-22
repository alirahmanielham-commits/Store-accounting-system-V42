import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Users, FileText, Settings, XCircle, Search, Calendar, MapPin, CheckCircle, AlertCircle, X, ChevronDown, Check, Building, FileSignature, ArrowRight, ArrowLeft } from 'lucide-react';
import { getSalaryComponents, getContractComponents,  getEmployeeContracts, addEmployeeContract, updateEmployeeContract, deleteEmployeeContract,     deleteContractComponent, getEmployeeProfiles, getWorkplaces, getEmployeeOrders, getPayslips } from '../../services/hrService';
import Select from 'react-select';
import { convertToGregorian } from '../../utils/format';


export default function ContractsManager({ personsData, personGroups, storeSettings, showNotification, DatePicker, persian, persian_fa }) {
   
  
  const [contracts, setContracts] = useState([]);
  const [salComponents, setSalComponents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [employeeProfiles, setEmployeeProfiles] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const parseSafeDate = (val) => {
    if (!val) return null;
    const num = Number(val);
    const dateObj = !isNaN(num) ? new Date(num) : new Date(val);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  };

  
  
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  // States for Type
  
  const typeFormDummy = ({ code: '', title: '', durationType: 'fixed_term', standardMonthlyHours: 220 });

  // States for Contract Wizard
  const [wizardStep, setWizardStep] = useState(1);
  const [editingContractId, setEditingContractId] = useState(null);
    const [viewContractId, setViewContractId] = useState(null);
  const [terminateContractId, setTerminateContractId] = useState(null);
  const [terminateDate, setTerminateDate] = useState(new Date());
  const [deleteContractId, setDeleteContractId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [contractForm, setContractForm] = useState({
    personId: null,
    contractNumber: '',
    startDate: new Date(new Date().setHours(0,0,0,0)),
    endDate: new Date(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).setHours(0,0,0,0)),
    location: '',
    workplaceId: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [emps, sals, profiles, works] = await Promise.all([
        getEmployeeContracts(),
        getSalaryComponents(),
        getEmployeeProfiles(),
        getWorkplaces()
      ]);
      
      setContracts(emps || []);
      setSalComponents((sals || []).filter(s => s.isActive));
      setWorkplaces(works || []);
    } catch (e) {
      console.error(e);
    }
  };

  const employees = useMemo(() => {
    return (personsData || []).filter(p => p.role === 'employee');
  }, [personsData]);

  

    const handleFinalizeContract = async (cId) => {
    try {
      const c = contracts.find(x => x.id === cId);
      if(!c) return;
      await updateEmployeeContract(c.id, { ...c, status: 'active' });
      showNotification('قرارداد با موفقیت تایید نهایی شد', 'success');
      setViewContractId(null);
      fetchData();
    } catch(e) {
      showNotification('خطا در تایید نهایی', 'error');
    }
  };

  const handleTerminateContract = async () => {
    if (!terminateDate) return showNotification('تاریخ ترک کار الزامی است', 'error');
    try {
      const c = contracts.find(x => x.id === terminateContractId);
      if(!c) return;
      const getIsoDateStr = (dateVal) => {
        if (!dateVal) return null;
        try {
          if (dateVal instanceof Date) return dateVal.toISOString();
          if (typeof dateVal.toDate === 'function') return dateVal.toDate().toISOString();
          const parsed = new Date(dateVal);
          if (!isNaN(parsed.getTime())) return parsed.toISOString();
          return null;
        } catch(e) { return null; }
      };
      const termIso = getIsoDateStr(terminateDate);
      await updateEmployeeContract(c.id, { ...c, status: 'terminated', terminationDate: termIso });
      showNotification('ترک کار با موفقیت ثبت شد', 'success');
      setTerminateContractId(null);
      fetchData();
    } catch(e) {
      showNotification('خطا در ثبت ترک کار', 'error');
    }
  };

  const handleSaveContract = async () => {
    if (!contractForm.personId) return showNotification('پرسنل باید انتخاب شود', 'error');
    try {
      const getIsoDateStr = (dateVal) => {
        if (!dateVal) return null;
        try {
          if (dateVal instanceof Date) return dateVal.toISOString();
          if (typeof dateVal.toDate === 'function') return dateVal.toDate().toISOString();
          const parsed = new Date(dateVal);
          if (!isNaN(parsed.getTime())) return parsed.toISOString();
          return null;
        } catch(e) {
          return null;
        }
      };
      
      const startDateIso = getIsoDateStr(contractForm.startDate);
      const endDateIso = getIsoDateStr(contractForm.endDate);

      if (!startDateIso) return showNotification('تاریخ شروع قرارداد الزامی است', 'error');

      // Overlap validation
      const personContracts = contracts.filter(c => c.personId === contractForm.personId.value && c.id !== editingContractId);
      const newStart = new Date(startDateIso).getTime();
      const newEnd = endDateIso ? new Date(endDateIso).getTime() : Infinity;

      const hasOverlap = personContracts.some(existing => {
        // If terminated, the effective end date is the termination date.
        const effectiveEnd = (existing.status === 'terminated' && existing.terminationDate) 
                              ? existing.terminationDate 
                              : existing.endDate;
        const exStartObj = parseSafeDate(existing.startDate);
        const exEndObj = parseSafeDate(effectiveEnd);
        
        // Exclude contracts that don't have a valid start date
        if (!exStartObj) return false;
        
        const exStart = exStartObj.getTime();
        const exEnd = exEndObj ? exEndObj.getTime() : Infinity;
        
        // Strict overlap: one starts BEFORE the other ends, AND one ends AFTER the other starts
        // Also handle the case where a contract starts exactly when another ends as NOT an overlap 
        // by using strictly less than (<) if appropriate, but <= is standard if day is inclusive.
        // Usually, if exEnd is 2024-05-10, and newStart is 2024-05-11, 2024-05-11 <= 2024-05-10 is False. No overlap.
        // If newStart is 2024-05-10, 2024-05-10 <= 2024-05-10 is True. Overlap. This is correct for inclusive days.
        return (newStart <= exEnd) && (newEnd >= exStart);
      });

      if (hasOverlap) {
        return showNotification('بازه زمانی این قرارداد با سایر قراردادهای این شخص تداخل دارد.', 'error');
      }

      const payloadBase = {
        
        contractNumber: contractForm.contractNumber,
        workplaceId: contractForm.workplaceId,
        startDate: startDateIso,
        endDate: endDateIso,
        location: contractForm.location,
        status: contractForm.status
      };

      if (editingContractId) {
        // Editing a single existing contract
        await updateEmployeeContract(editingContractId, { ...payloadBase, personId: contractForm.personId.value });
        } else {
        // Bulk or single new contract assignment
        const contractId = Date.now().toString() + Math.random().toString().substring(2,8);
        await addEmployeeContract({ id: contractId, personId: contractForm.personId.value, ...payloadBase });
        }

      showNotification('قرارداد(ها) با موفقیت ذخیره شد', 'success');
      setIsContractModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ثبت قرارداد', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const orders = await getEmployeeOrders();
      const payslips = await getPayslips();
      
      const hasOrders = orders.some(o => o.contractId === deleteContractId);
      const hasPayslips = payslips.some(p => p.contractId === deleteContractId);
      
      if (hasOrders || hasPayslips) {
        setDeleteError('امکان حذف وجود ندارد. برای این قرارداد حکم یا فیش حقوقی ثبت شده است.');
        return;
      }
      
      await deleteEmployeeContract(deleteContractId);
      const allComps = await getContractComponents();
      for (const c of allComps.filter(c => c.contractId === deleteContractId)) {
        await deleteContractComponent(c.id);
      }
      showNotification('قرارداد با موفقیت حذف شد', 'success');
      setDeleteContractId(null);
      setDeleteError('');
      fetchData();
    } catch(e) {
      showNotification('خطا در حذف', 'error');
    }
  };

  const getPersonName = (id) => {
    const p = (personsData || []).find(x => x.id === id);
    return p ? p.name : 'نامشخص';
  };

  
  const filteredContracts = useMemo(() => {
    if (!searchQuery) return contracts;
    return contracts.filter(c => {
      const pName = getPersonName(c.personId) || '';
      return pName.includes(searchQuery) ;
    });
  }, [contracts, searchQuery, personsData]);

  const activeContractsCount = contracts.filter(c => c.status === 'active').length;
  const expiredContractsCount = contracts.filter(c => c.status === 'expired').length;

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
      <div className="w-full mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <FileSignature className="w-8 h-8 text-indigo-600" />
              مدیریت پیشرفته قراردادها
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">ثبت قرارداد به پرسنل</p>
          </div>
          
          
        </div>

        
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
        
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div className="relative max-w-md w-full">
                <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="جستجوی پرسنل..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium"
                />
              </div>
              <button onClick={() => {
                setEditingContractId(null);
                setWizardStep(1);
                setContractForm({ personId: null, contractNumber: '', startDate: new Date(new Date().setHours(0,0,0,0)), endDate: new Date(new Date().setHours(0,0,0,0)), location: '', workplaceId: '', status: 'draft' });
                setIsContractModalOpen(true);
              }} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap">
                <Plus className="w-4 h-4"/> ثبت قرارداد جدید
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-white text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-4 font-bold text-slate-600">پرسنل</th>
                    <th className="p-4 font-bold text-slate-600">شماره قرارداد</th>
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
                        <td className="p-4 text-slate-600">{c.contractNumber || '---'}</td>
                        <td className="p-4 text-slate-500 text-xs">{parseSafeDate(c.startDate)?.toLocaleDateString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR')}</td>
                        <td className="p-4 text-slate-500 text-xs">{c.endDate ? parseSafeDate(c.endDate)?.toLocaleDateString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR') : 'نامحدود'}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border ${
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
                              <button onClick={() => setViewContractId(c.id)} className="px-3 py-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors">
                                تایید نهایی
                              </button>
                            )}
                            {c.status === 'active' && (
                              <button onClick={() => { setTerminateContractId(c.id); setTerminateDate(new Date()); }} className="px-3 py-1.5 text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors whitespace-nowrap">
                                ثبت ترک کار
                              </button>
                            )}
                            {c.status !== 'draft' && c.status !== 'active' && (
                              <button onClick={() => setViewContractId(c.id)} className="px-3 py-1.5 text-slate-600 bg-slate-50 border border-slate-100 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors">
                                مشاهده
                              </button>
                            )}
                            <button onClick={() => {
                              setEditingContractId(c.id);
                              setContractForm({
                                personId: { value: c.personId, label: getPersonName(c.personId) },
                                contractNumber: c.contractNumber || '',
                                workplaceId: c.workplaceId || '',
                                startDate: parseSafeDate(c.startDate),
                                endDate: c.endDate ? parseSafeDate(c.endDate) : new Date(),
                                location: c.location || '',
                                status: c.status || 'draft',
                              });
                              setIsContractModalOpen(true);
                            }} className="px-3 py-1.5 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors">
                              ویرایش
                            </button>
                            <button onClick={() => { setDeleteContractId(c.id); setDeleteError(''); }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
          </div>
          
      {/* Modals */}

      {deleteContractId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center"><AlertCircle className="w-5 h-5"/></div>
                <h3 className="font-bold text-slate-800 text-lg">حذف قرارداد</h3>
              </div>
              <button onClick={() => { setDeleteContractId(null); setDeleteError(''); }} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 bg-slate-50/50 space-y-4 text-center">
              <p className="text-sm text-slate-600 mb-2">آیا از حذف این قرارداد مطمئن هستید؟ این عملیات غیرقابل بازگشت است.</p>
              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl font-bold">
                  {deleteError}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button onClick={()=>{ setDeleteContractId(null); setDeleteError(''); }} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleConfirmDelete} className="px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold shadow-sm hover:bg-rose-700 transition-all">
                حذف قرارداد
              </button>
            </div>
          </div>
        </div>
      )}


      {viewContractId && (() => {
        const c = contracts.find(x => x.id === viewContractId);
        if(!c) return null;
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><FileText className="w-5 h-5"/></div>
                  <h3 className="font-bold text-slate-800 text-lg">خلاصه قرارداد</h3>
                </div>
                <button onClick={() => setViewContractId(null)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 bg-slate-50/50 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-slate-500 text-sm">نام پرسنل:</span>
                  <span className="font-bold text-slate-800">{getPersonName(c.personId)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-slate-500 text-sm">شماره قرارداد:</span>
                  <span className="font-bold text-slate-800">{c.contractNumber || '---'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-slate-500 text-sm">تاریخ شروع:</span>
                  <span className="font-bold text-slate-800">{parseSafeDate(c.startDate)?.toLocaleDateString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR')}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-slate-500 text-sm">تاریخ پایان:</span>
                  <span className="font-bold text-slate-800">{c.endDate ? parseSafeDate(c.endDate)?.toLocaleDateString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR') : 'نامحدود'}</span>
                </div>
                {c.terminationDate && (
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                    <span className="text-slate-500 text-sm">تاریخ ترک کار:</span>
                    <span className="font-bold text-rose-600">{parseSafeDate(c.terminationDate)?.toLocaleDateString('fa-IR')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
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

              <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">
                <button onClick={()=>setViewContractId(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">بستن</button>
                {c.status === 'draft' && (
                  <button onClick={() => handleFinalizeContract(c.id)} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-sm shadow-emerald-200 hover:bg-emerald-700 hover:shadow-md transition-all flex items-center gap-2">
                    <Check className="w-5 h-5" /> تایید نهایی
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {terminateContractId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><AlertCircle className="w-5 h-5"/></div>
                <h3 className="font-bold text-slate-800 text-lg">ثبت ترک کار</h3>
              </div>
              <button onClick={() => setTerminateContractId(null)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 bg-slate-50/50 space-y-4">
              <p className="text-sm text-slate-600 mb-4">لطفاً تاریخ دقیق ترک کار پرسنل را انتخاب کنید.</p>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ ترک کار</label>
                <DatePicker
                    calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                    value={terminateDate}
                    onChange={(date) => {
                      if (!date) {
                          setTerminateDate(null);
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
                          setTerminateDate(d);
                      }
                    }}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button onClick={()=>setTerminateContractId(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleTerminateContract} className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-bold shadow-sm hover:bg-amber-600 transition-all">
                ثبت ترک کار
              </button>
            </div>
          </div>
        </div>
      )}

      {isContractModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-6">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-full overflow-hidden">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><FileSignature className="w-5 h-5"/></div>
                <h3 className="font-bold text-slate-800 text-lg">{editingContractId ? 'ویرایش قرارداد پرسنل' : 'ثبت قرارداد جدید'}</h3>
              </div>
              <button onClick={() => setIsContractModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">انتخاب کارمند</label>
                    <Select
                      isDisabled={!!editingContractId}
                      options={employees.map(p => ({value: p.id, label: p.name + (!p.nationalId ? ' (نقص اطلاعات - کد ملی)' : ''), isDisabled: !p.nationalId}))}
                      value={contractForm.personId}
                      onChange={v => setContractForm({...contractForm, personId: v})}
                      placeholder="جستجو و انتخاب شخص..."
                      className="react-select-container"
                      classNamePrefix="react-select"
                      noOptionsMessage={() => "کارمندی یافت نشد"}
                      styles={{
                        control: (base) => ({...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', padding: '4px', boxShadow: 'none', '&:hover': {borderColor: '#cbd5e1'}}),
                      }}
                    />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">شماره قرارداد</label>
                   <input type="text" value={contractForm.contractNumber} onChange={e => setContractForm({...contractForm, contractNumber: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت قرارداد</label>
                   <select value={contractForm.status} onChange={e => setContractForm({...contractForm, status: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium transition-all">
                     <option value="draft">پیش‌نویس</option>
                     <option value="active">فعال (در حال اجرا)</option>
                     <option value="expired">منقضی شده</option>
                     <option value="terminated">فسخ شده</option>
                   </select>
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ شروع قرارداد</label>
                   <DatePicker
                     calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                     locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                     value={contractForm.startDate}
                     onChange={(date) => {
                      if (!date) {
                          setContractForm(prev => ({...prev, startDate: null}));
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
                          setContractForm(prev => ({...prev, startDate: d}));
                      }
                    }}
                     calendarPosition="bottom-right"
                     inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ پایان قرارداد</label>
                   <DatePicker
                     calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                     locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                     value={contractForm.endDate}
                     onChange={(date) => {
                      if (!date) {
                          setContractForm(prev => ({...prev, endDate: null}));
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
                          setContractForm(prev => ({...prev, endDate: d}));
                      }
                    }}
                     calendarPosition="bottom-right"
                     inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
                   />
                 </div>

                 <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-slate-700 mb-2">کارگاه</label>
                   <Select
                     options={(workplaces || []).map(w => ({value: w.id, label: w.name}))}
                     value={(workplaces || []).find(w => w.id === contractForm.workplaceId) ? {value: contractForm.workplaceId, label: (workplaces || []).find(w => w.id === contractForm.workplaceId).name} : null}
                     onChange={v => setContractForm({...contractForm, workplaceId: v ? v.value : ''})}
                     placeholder="انتخاب کارگاه..."
                     className="react-select-container"
                     classNamePrefix="react-select"
                     noOptionsMessage={() => "کارگاهی یافت نشد"}
                     styles={{
                       control: (base) => ({...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', padding: '4px', boxShadow: 'none', '&:hover': {borderColor: '#cbd5e1'}}),
                     }}
                   />
                 </div>
                 
                 <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-slate-700 mb-2">محل خدمت (اختیاری)</label>
                   <div className="relative">
                     <MapPin className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input type="text" value={contractForm.location} onChange={e => setContractForm({...contractForm, location: e.target.value})} className="w-full pl-4 pr-12 py-[14px] bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="مثلا دفتر مرکزی - طبقه دوم" />
                   </div>
                 </div>
               </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button onClick={()=>setIsContractModalOpen(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleSaveContract} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-sm shadow-emerald-200 hover:bg-emerald-700 hover:shadow-md transition-all flex items-center gap-2">
                <Check className="w-5 h-5" /> {editingContractId ? 'ثبت تغییرات' : 'ثبت نهایی'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
