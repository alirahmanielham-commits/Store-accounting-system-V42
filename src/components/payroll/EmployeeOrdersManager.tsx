import { convertToGregorian } from '../../utils/format';
import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Edit2, CheckCircle, Save, XCircle, Search, Trash2, Eye, ArrowRight, AlertTriangle, Calendar } from 'lucide-react';
import { getEmployeeOrders, addEmployeeOrder, updateEmployeeOrder, deleteEmployeeOrder, getEmployeeContracts, getOrderTemplates, getPayslips } from '../../services/hrService';
import CustomDatePicker from '../ui/CustomDatePicker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

export default function EmployeeOrdersManager({ personsData, showNotification, DatePicker: _propDatePicker, persian: _propPersian, persian_fa: _propPersianFa, storeSettings }: any) {
  const DatePicker = CustomDatePicker;
  const [orders, setOrders] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    personId: '',
    contractId: '',
    templateId: '',
    name: '',
    childrenCount: '',
    experienceYears: '',
    items: [] as any[],
    issueDate: new Date(),
    executionDate: new Date(),
    status: 'draft'
  });

  const fetchData = async () => {
    try {
      const ords = await getEmployeeOrders();
      const cnts = await getEmployeeContracts();
      const tmps = await getOrderTemplates();
      const ps = await getPayslips();
      setOrders(ords || []);
      setContracts(cnts || []);
      setTemplates(tmps || []);
      setPayslips(ps || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const employees = useMemo(() => {
    return (personsData || []).filter((p: any) => p.role === 'employee');
  }, [personsData]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    return orders.filter((o: any) => {
      const p = employees.find((e: any) => e.id === o.personId);
      return p?.name.includes(searchQuery);
    });
  }, [orders, searchQuery, employees]);

  const personContracts = useMemo(() => {
    if (!formData.personId) return [];
    return contracts.filter(c => c.personId === formData.personId && (c.status === 'active' || c.id === formData.contractId));
  }, [contracts, formData.personId, formData.contractId]);

  const handleOpenModal = (order?: any) => {
    if (order) {
      setEditingId(order.id);
      setFormData({
        personId: order.personId || '',
        contractId: order.contractId || '',
        templateId: order.templateId || '',
        name: order.name || '',
        childrenCount: order.childrenCount !== undefined ? order.childrenCount : '',
        experienceYears: order.experienceYears !== undefined ? order.experienceYears : '',
        items: order.items || [],
        issueDate: order.issueDate ? (isNaN(Number(order.issueDate)) ? order.issueDate : new Date(Number(order.issueDate))) : new Date(),
        executionDate: order.executionDate ? (isNaN(Number(order.executionDate)) ? order.executionDate : new Date(Number(order.executionDate))) : new Date(),
        status: order.status || 'draft'
      });
    } else {
      setEditingId(null);
      setFormData({
        personId: '',
        contractId: '',
        templateId: '',
        name: '',
        childrenCount: '',
        experienceYears: '',
        items: [],
        issueDate: new Date(),
    executionDate: new Date(),
        status: 'draft'
      });
    }
    setIsModalOpen(true);
  };

  const [statusConfirm, setStatusConfirm] = useState<{order: any, newStatus: string} | null>(null);

  const confirmStatusChange = async () => {
    if (!statusConfirm) return;
    const { order, newStatus } = statusConfirm;
    
    if (newStatus === 'active') {
      try {
        const otherOrders = orders.filter(o => o.contractId === order.contractId && o.id !== order.id && o.status === 'active');
        for (const ord of otherOrders) {
          await updateEmployeeOrder(ord.id, { ...ord, status: 'inactive' });
        }
        await updateEmployeeOrder(order.id, { ...order, status: 'active' });
        showNotification('حکم با موفقیت تایید نهایی و فعال شد', 'success');
        await fetchData();
        if (viewingOrder?.id === order.id) {
          setViewingOrder({ ...order, status: 'active' });
        }
      } catch (e) {
        showNotification('خطا در تغییر وضعیت', 'error');
      }
    } else {
      try {
        await updateEmployeeOrder(order.id, { ...order, status: newStatus });
        showNotification('وضعیت حکم تغییر کرد', 'success');
        await fetchData();
        if (viewingOrder?.id === order.id) {
          setViewingOrder({ ...order, status: newStatus });
        }
      } catch (e) {
        showNotification('خطا در تغییر وضعیت', 'error');
      }
    }
    setStatusConfirm(null);
  };

  const handleStatusChange = (order: any, newStatus: string) => {
    setStatusConfirm({ order, newStatus });
  };

  const handleDeleteRequest = (order: any) => {
    // Check if contract has payslips and the order is active or was active
    // If it's just a draft, it's fine. 
    if (order.status !== 'draft') {
      const hasPayslips = payslips.some(p => p.contractId === order.contractId);
      if (hasPayslips) {
        showNotification('امکان حذف این حکم وجود ندارد زیرا فیش حقوقی صادر شده به آن وابسته است.', 'error');
        return;
      }
    }
    setDeletingOrder(order);
  };

  const confirmDelete = async () => {
    if (!deletingOrder) return;
    try {
      await deleteEmployeeOrder(deletingOrder.id);
      showNotification('حکم با موفقیت حذف شد', 'success');
      setDeletingOrder(null);
      fetchData();
    } catch(e) {
      showNotification('خطا در حذف', 'error');
    }
  };

  const handleSave = async () => {
    if (loading) return;
    setLoading(true);
    if (!formData.personId || !formData.contractId || !formData.templateId) {
      return showNotification('لطفا شخص، قرارداد و قالب را انتخاب کنید', 'error');
    }

    const getTimestampStr = (dateVal: any) => {
      if (!dateVal) return Date.now().toString();
      try {
        if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? Date.now().toString() : dateVal.getTime().toString();
        if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime().toString();
        if (typeof dateVal === 'string') {
          const iso = convertToGregorian(dateVal);
          const d = new Date(iso);
          return isNaN(d.getTime()) ? Date.now().toString() : d.getTime().toString();
        }
        const num = Number(dateVal);
        if (!isNaN(num) && num > 1000000) return num.toString();
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? Date.now().toString() : d.getTime().toString();
      } catch (e) {
        return Date.now().toString();
      }
    };

    const issueDateStr = getTimestampStr(formData.issueDate);
    const executionDateStr = getTimestampStr(formData.executionDate);

    try {
      if (formData.status === 'active') {
        // Find all other active orders for this contract and deactivate them
        const otherOrders = orders.filter(o => o.contractId === formData.contractId && o.id !== editingId && o.status === 'active');
        for (const ord of otherOrders) {
          await updateEmployeeOrder(ord.id, { ...ord, status: 'inactive' });
        }
      }

      const payload = {
        personId: formData.personId,
        contractId: formData.contractId,
        templateId: formData.templateId,
        name: formData.name,
        childrenCount: formData.childrenCount,
        experienceYears: formData.experienceYears,
        items: formData.items,
        issueDate: issueDateStr,
        executionDate: formData.executionDate.getTime().toString(),
        status: formData.status
      };

      if (editingId) {
        await updateEmployeeOrder(editingId, payload);
      } else {
        await addEmployeeOrder({
          id: Date.now().toString(),
          ...payload
        });
      }
      
      showNotification('حکم کارگزینی با موفقیت ثبت شد', 'success');
      setIsModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ثبت حکم', 'error');
    }
  };

  if (viewingOrder) {
    const emp = employees.find((e: any) => e.id === viewingOrder.personId);
    const contract = contracts.find((c: any) => c.id === viewingOrder.contractId);
    const template = templates.find((t: any) => t.id === viewingOrder.templateId);

    return (
      <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewingOrder(null)}
                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all border border-slate-200"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-indigo-500" />
                  جزئیات حکم کارگزینی
                </h1>
                <p className="text-sm text-slate-500 mt-1">{viewingOrder.name || template?.name || 'حکم بدون نام'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
              {viewingOrder.status === 'draft' && (
                <>
                  <button onClick={() => handleStatusChange(viewingOrder, 'active')} className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> تایید نهایی و فعال
                  </button>
                  <button onClick={() => { setViewingOrder(null); handleOpenModal(viewingOrder); }} className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                    <Edit2 className="w-4 h-4" /> ویرایش
                  </button>
                </>
              )}
              {viewingOrder.status === 'active' && (
                <button onClick={() => handleStatusChange(viewingOrder, 'inactive')} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> غیرفعال کردن حکم
                </button>
              )}
              {viewingOrder.status === 'inactive' && (
                <button onClick={() => handleStatusChange(viewingOrder, 'active')} className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> فعال سازی مجدد
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sidebar Details */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" /> اطلاعات پایه
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">وضعیت حکم</div>
                    <div>
                      {viewingOrder.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          تایید نهایی / فعال
                        </span>
                      ) : viewingOrder.status === 'inactive' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          غیرفعال / بایگانی
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          پیش‌نویس
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">نام پرسنل</div>
                    <div className="font-bold text-slate-800">{emp?.name || '---'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">قرارداد مرتبط</div>
                    <div className="font-bold text-slate-700 font-mono">{contract?.contractNumber || '---'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">تاریخ صدور</div>
                    <div className="font-bold text-slate-700 font-mono">
                      {viewingOrder.issueDate ? new Date(Number(viewingOrder.issueDate)).toLocaleDateString('fa-IR') : '---'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content (Items) */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" /> اقلام و عناوین حکم
                </h3>
                
                {viewingOrder.items && viewingOrder.items.length > 0 ? (
                  <div className="space-y-3">
                    {viewingOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl gap-3">
                        <div>
                          <div className="font-bold text-slate-800">{item.title}</div>
                          <div className="text-xs font-bold mt-1 text-slate-500">
                            {item.type === 'earning' ? 'مزایا (+)' : 'کسورات (-)'}
                          </div>
                        </div>
                        <div className="font-mono font-black text-lg text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200" dir="ltr">
                          {item.amount} {item.type === 'earning' ? '(+)' : '(-)'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 font-bold">
                    هیچ عنوانی برای این حکم ثبت نشده است.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      {/* Delete Confirmation Modal */}
      {deletingOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">حذف حکم کارگزینی</h3>
              <p className="text-slate-500 font-medium mb-6">
                آیا از حذف این حکم مطمئن هستید؟ این عملیات غیرقابل بازگشت است.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingOrder(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors"
                >
                  حذف حکم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {statusConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">تغییر وضعیت حکم</h3>
              <p className="text-slate-500 font-medium mb-6">
                {statusConfirm.newStatus === 'active' 
                  ? 'با تایید نهایی و فعال کردن این حکم، سایر احکام فعالِ این قرارداد غیرفعال (بایگانی) خواهند شد. آیا مطمئن هستید؟' 
                  : 'آیا از تغییر وضعیت این حکم مطمئن هستید؟'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStatusConfirm(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={confirmStatusChange}
                  className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
                >
                  تایید و ادامه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }

  if (isModalOpen) {
    return (
<div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-4xl mx-auto shadow-sm border border-slate-200">
            <div className="bg-white border-b border-slate-100 px-6 py-6 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800">
                    {editingId ? 'ویرایش حکم کارگزینی' : 'صدور حکم جدید'}
                  </h3>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">انتخاب پرسنل</label>
                  <select
                    value={formData.personId}
                    onChange={e => {
                      const selectedPersonId = e.target.value;
                      const profile = personsData?.find((p: any) => p.id === selectedPersonId);
                      setFormData({
                        ...formData, 
                        personId: selectedPersonId, 
                        contractId: '',
                        childrenCount: profile?.childrenCount || '',
                        experienceYears: profile?.experienceYears || ''
                      });
                    }}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  >
                    <option value="">-- انتخاب کنید --</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">قرارداد مرتبط</label>
                  <select
                    value={formData.contractId}
                    onChange={e => setFormData({...formData, contractId: e.target.value})}
                    disabled={!formData.personId}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all disabled:opacity-50"
                  >
                    <option value="">-- انتخاب کنید --</option>
                    {personContracts.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        قرارداد {c.contractNumber} {c.status === 'active' ? '(فعال)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.contractId && (
                  <div className="md:col-span-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                    <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> احکام ثبت شده برای این قرارداد
                    </h4>
                    {orders.filter(o => o.contractId === formData.contractId && o.id !== editingId).length > 0 ? (
                      <div className="space-y-2">
                        {orders.filter(o => o.contractId === formData.contractId && o.id !== editingId).map(ord => (
                          <div key={ord.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-indigo-50">
                            <div>
                              <div className="font-bold text-sm text-slate-800">{ord.name || 'حکم بدون نام'}</div>
                              <div className="text-xs text-slate-500 mt-1">تاریخ صدور: {ord.issueDate ? new Date(Number(ord.issueDate)).toLocaleDateString('fa-IR') : '---'}</div>
                            </div>
                            <div>
                              {ord.status === 'active' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  تایید نهایی / فعال
                                </span>
                              ) : ord.status === 'inactive' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  غیرفعال / بایگانی
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  پیش‌نویس
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-slate-500 bg-white p-3 rounded-xl border border-indigo-50 text-center">
                        حکمی برای این قرارداد یافت نشد
                      </div>
                    )}
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">قالب حکم کارگزینی</label>
                  <select
                    value={formData.templateId}
                    onChange={e => {
                      const tId = e.target.value;
                      const tpl = templates.find(t => String(t.id) === String(tId));
                      if (tpl) {
                        setFormData({
                          ...formData, 
                          templateId: tId, 
                          name: `حکم کارگزینی ${tpl.name}`, 
                          items: JSON.parse(JSON.stringify(tpl.items || []))
                        });
                      } else {
                        setFormData({...formData, templateId: tId});
                      }
                    }}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  >
                    <option value="">-- انتخاب کنید --</option>
                    {templates.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">نام / عنوان حکم</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="مثال: حکم کارگزینی سال 1403"
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">تعداد فرزندان مشمول</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.childrenCount}
                      onChange={e => setFormData({...formData, childrenCount: e.target.value})}
                      placeholder="برای محاسبه حق اولاد"
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">سابقه کار (سال)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.experienceYears}
                      onChange={e => setFormData({...formData, experienceYears: e.target.value})}
                      placeholder="برای محاسبه پایه سنوات"
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-600" /> تاریخ صدور
                      </label>
                      <div className="relative">
                        <DatePicker
                          calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                          locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                          value={formData.issueDate}
                          onChange={(date: any) => setFormData(prev => ({ ...prev, issueDate: date }))}
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
                        <Calendar className="w-4 h-4 text-indigo-600" /> تاریخ اجرا
                      </label>
                      <div className="relative">
                        <DatePicker
                          calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                          locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                          value={formData.executionDate}
                          onChange={(date: any) => setFormData(prev => ({ ...prev, executionDate: date }))}
                          calendarPosition="bottom-right"
                          inputClass="w-full pl-11 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-sans font-bold text-slate-900 text-center transition-all cursor-pointer shadow-sm text-base"
                          containerClassName="w-full"
                        />
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                          <Calendar className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {formData.items && formData.items.length > 0 && (
                  <div className="md:col-span-2 mt-4 space-y-4">
                    <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">عناوین حکمی (قابل ویرایش برای این حکم)</h4>
                    {formData.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">عنوان</label>
                          <input type="text" value={item.title || ''} onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].title = e.target.value;
                            setFormData({...formData, items: newItems});
                          }} className="w-full border border-slate-200 bg-white rounded-lg p-2 outline-none font-bold text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                          disabled={['daily_wage', 'housing', 'marriage', 'grocery', 'child'].includes(item.id)} />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs font-bold text-slate-500 mb-1">نوع</label>
                          <select value={item.type || 'earning'} onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].type = e.target.value;
                            setFormData({...formData, items: newItems});
                          }} className="w-full border border-slate-200 bg-white rounded-lg p-2 outline-none font-bold text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                          disabled={['daily_wage', 'housing', 'marriage', 'grocery', 'child'].includes(item.id)}>
                            <option value="earning">مزایا (+)</option>
                            <option value="deduction">کسورات (-)</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">مبلغ / فرمول</label>
                          <input type="text" value={item.amount || ''} dir="ltr" onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].amount = e.target.value;
                            setFormData({...formData, items: newItems});
                          }} className="w-full border border-slate-200 bg-white rounded-lg p-2 outline-none font-mono text-left text-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت حکم</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className={`w-full border border-slate-200 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all ${
                      formData.status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50'
                    }`}
                  >
                    <option value="draft">پیش‌نویس</option>
                    <option value="active">تایید نهایی / فعال (غیرفعال شدن سایر احکام این قرارداد)</option>
                    <option value="inactive">غیرفعال / بایگانی</option>
                  </select>
                  {formData.status === 'active' && (
                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> سایر احکام این شخص غیرفعال خواهند شد.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-3xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" /> ثبت حکم
              </button>
            </div>
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
      <div className="w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">احکام کارگزینی</h1>
              <p className="text-sm text-slate-500 mt-1">مدیریت و صدور احکام پرسنل بر اساس قراردادها</p>
            </div>
          </div>
          <button onClick={() => handleOpenModal()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2">
            <Plus className="w-5 h-5" /> صدور حکم جدید
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-96">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو نام پرسنل..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold">نام پرسنل</th>
                  <th className="p-4 font-bold">شماره قرارداد مرتبط</th>
                  <th className="p-4 font-bold">عنوان حکم</th>
                  <th className="p-4 font-bold text-center">وضعیت</th>
                  <th className="p-4 font-bold text-center">تاریخ صدور</th>
                  <th className="p-4 font-bold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">هیچ حکمی ثبت نشده است</td>
                  </tr>
                ) : (
                  filteredOrders.map((order: any) => {
                    const emp = employees.find((e: any) => e.id === order.personId);
                    const contract = contracts.find((c: any) => c.id === order.contractId);
                    const template = templates.find((t: any) => t.id === order.templateId);
                    
                    return (
                      <tr key={order.id} onClick={() => setViewingOrder(order)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <td className="p-4 font-bold text-slate-800">{emp?.name || '---'}</td>
                        <td className="p-4 text-slate-600 font-medium font-mono">{contract?.contractNumber || '---'}</td>
                        <td className="p-4 text-slate-600">{order.name || template?.name || '---'}</td>
                        <td className="p-4 text-center">
                          {order.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              تایید نهایی / فعال
                            </span>
                          ) : order.status === 'inactive' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              غیرفعال / بایگانی
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              پیش‌نویس
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center text-slate-500 font-mono">
                          {order.issueDate ? new Date(Number(order.issueDate)).toLocaleDateString('fa-IR') : '---'}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewingOrder(order); }}
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                              title="مشاهده"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(order); }}
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                              title="ویرایش"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteRequest(order); }}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      
      {/* Delete Confirmation Modal */}
      {deletingOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">حذف حکم کارگزینی</h3>
              <p className="text-slate-500 font-medium mb-6">
                آیا از حذف این حکم مطمئن هستید؟ این عملیات غیرقابل بازگشت است.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingOrder(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors"
                >
                  حذف حکم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {statusConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">تغییر وضعیت حکم</h3>
              <p className="text-slate-500 font-medium mb-6">
                {statusConfirm.newStatus === 'active' 
                  ? 'با تایید نهایی و فعال کردن این حکم، سایر احکام فعالِ این قرارداد غیرفعال (بایگانی) خواهند شد. آیا مطمئن هستید؟' 
                  : 'آیا از تغییر وضعیت این حکم مطمئن هستید؟'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStatusConfirm(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={confirmStatusChange}
                  className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
                >
                  تایید و ادامه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}
