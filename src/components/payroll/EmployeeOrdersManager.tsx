import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Edit2, CheckCircle, Save, XCircle, Search, Trash2 } from 'lucide-react';
import { getEmployeeOrders, addEmployeeOrder, updateEmployeeOrder, deleteEmployeeOrder, getEmployeeContracts, getOrderTemplates } from '../../services/hrService';

export default function EmployeeOrdersManager({ personsData, showNotification, DatePicker, persian, persian_fa, storeSettings }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    personId: '',
    contractId: '',
    templateId: '',
    issueDate: new Date(),
    status: 'draft'
  });

  const fetchData = async () => {
    try {
      const ords = await getEmployeeOrders();
      const cnts = await getEmployeeContracts();
      const tmps = await getOrderTemplates();
      setOrders(ords || []);
      setContracts(cnts || []);
      setTemplates(tmps || []);
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
    return contracts.filter(c => c.personId === formData.personId);
  }, [contracts, formData.personId]);

  const handleOpenModal = (order?: any) => {
    if (order) {
      setEditingId(order.id);
      setFormData({
        personId: order.personId || '',
        contractId: order.contractId || '',
        templateId: order.templateId || '',
        issueDate: order.issueDate ? new Date(Number(order.issueDate)) : new Date(),
        status: order.status || 'draft'
      });
    } else {
      setEditingId(null);
      setFormData({
        personId: '',
        contractId: '',
        templateId: '',
        issueDate: new Date(),
        status: 'draft'
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm('آیا از حذف این حکم مطمئن هستید؟')) return;
    try {
      await deleteEmployeeOrder(id);
      showNotification('حکم حذف شد', 'success');
      fetchData();
    } catch(e) {
      showNotification('خطا در حذف', 'error');
    }
  }

  const handleSave = async () => {
    if (!formData.personId || !formData.contractId || !formData.templateId) {
      return showNotification('لطفا شخص، قرارداد و قالب را انتخاب کنید', 'error');
    }

    const issueDateStr = formData.issueDate ? formData.issueDate.getTime().toString() : Date.now().toString();

    try {
      if (formData.status === 'active') {
        // Find all other active orders for this person and deactivate them
        const otherOrders = orders.filter(o => o.personId === formData.personId && o.id !== editingId && o.status === 'active');
        for (const ord of otherOrders) {
          await updateEmployeeOrder(ord.id, { ...ord, status: 'inactive' });
        }
      }

      const payload = {
        personId: formData.personId,
        contractId: formData.contractId,
        templateId: formData.templateId,
        issueDate: issueDateStr,
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
                  <th className="p-4 font-bold">قالب حکم</th>
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
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{emp?.name || '---'}</td>
                        <td className="p-4 text-slate-600 font-medium font-mono">{contract?.contractNumber || '---'}</td>
                        <td className="p-4 text-slate-600">{template?.name || '---'}</td>
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
                              onClick={() => handleOpenModal(order)}
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                              title="ویرایش"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(order.id)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
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
                      setFormData({...formData, personId: e.target.value, contractId: ''});
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">قالب حکم کارگزینی</label>
                  <select
                    value={formData.templateId}
                    onChange={e => setFormData({...formData, templateId: e.target.value})}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  >
                    <option value="">-- انتخاب کنید --</option>
                    {templates.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ صدور</label>
                  <DatePicker
                    calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                    value={formData.issueDate}
                    onChange={(date: any) => setFormData({...formData, issueDate: date?.toDate?.() || date})}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-[14px] text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">وضعیت حکم</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className={`w-full border border-slate-200 rounded-xl p-[14px] outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all ${
                      formData.status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50'
                    }`}
                  >
                    <option value="draft">پیش‌نویس</option>
                    <option value="active">تایید نهایی / فعال (غیرفعال شدن سایر احکام)</option>
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
      )}
    </div>
  );
}
