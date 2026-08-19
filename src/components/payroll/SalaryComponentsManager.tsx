import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { getSalaryComponents, addSalaryComponent, updateSalaryComponent, deleteSalaryComponent } from '../../services/hrService';
import { formatNumber } from '../../utils/format';

export default function SalaryComponentsManager({ storeSettings, accounts, showNotification }) {
  const [components, setComponents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    type: 'earning',
    calculationType: 'fixed',
    formula: '',
    basePercentage: '',
    timeFactor: 'days',
    isTaxable: true,
    isInsurable: true,
    isBaseSalary: false,
    minAmount: '',
    maxAmount: '',
    isActive: true,
    accountingAccountId: ''
  });

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      const data = await getSalaryComponents();
      // Optional: order by displayOrder or similar logic if needed
      setComponents(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!formData.code || !formData.title) return showNotification('کد و عنوان الزامی است', 'error');
    
    try {
      const payload = {
        ...formData,
        minAmount: formData.minAmount ? formData.minAmount.toString() : null,
        maxAmount: formData.maxAmount ? formData.maxAmount.toString() : null,
        basePercentage: formData.basePercentage ? formData.basePercentage.toString() : null,
      };

      if (editingId) {
        await updateSalaryComponent(editingId, payload);
        showNotification('با موفقیت بروزرسانی شد', 'success');
      } else {
        await addSalaryComponent({
          id: Date.now().toString(),
          ...payload
        });
        showNotification('با موفقیت ثبت شد', 'success');
      }
      setIsModalOpen(false);
      fetchComponents();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ذخیره سازی', 'error');
    }
  };

  const handleEdit = (comp) => {
    setFormData({
      code: comp.code || '',
      title: comp.title || '',
      type: comp.type || 'earning',
      calculationType: comp.calculationType || 'fixed',
      formula: comp.formula || '',
      basePercentage: comp.basePercentage || '',
      timeFactor: comp.timeFactor || 'days',
      isTaxable: comp.isTaxable ?? true,
      isInsurable: comp.isInsurable ?? true,
      isBaseSalary: comp.isBaseSalary ?? false,
      minAmount: comp.minAmount || '',
      maxAmount: comp.maxAmount || '',
      isActive: comp.isActive ?? true,
      accountingAccountId: comp.accountingAccountId || ''
    });
    setEditingId(comp.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا مطمئن هستید؟')) return;
    try {
      await deleteSalaryComponent(id);
      showNotification('با موفقیت حذف شد', 'success');
      fetchComponents();
    } catch (e) {
      showNotification('خطا در حذف', 'error');
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">اجزای حقوق و دستمزد</h1>
            <p className="text-sm text-slate-500 mt-1">مدیریت پارامترهای حقوقی، مزایا و کسورات</p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                code: '', title: '', type: 'earning', calculationType: 'fixed',
                formula: '', basePercentage: '', timeFactor: 'days',
                isTaxable: true, isInsurable: true, minAmount: '', maxAmount: '',
                isActive: true, accountingAccountId: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            افزودن جزء جدید
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="p-4 font-bold">کد</th>
                <th className="p-4 font-bold">عنوان</th>
                <th className="p-4 font-bold">نوع</th>
                <th className="p-4 font-bold">محاسبه</th>
                <th className="p-4 font-bold text-center">مشمولیت</th>
                <th className="p-4 font-bold text-center">وضعیت</th>
                <th className="p-4 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {components.map(comp => (
                <tr key={comp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-slate-600">{comp.code}</td>
                  <td className="p-4 font-bold text-slate-800">{comp.title}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${comp.type === 'earning' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {comp.type === 'earning' ? 'مزایا (Earning)' : 'کسورات (Deduction)'}
                    </span>
                    {comp.isBaseSalary && (
                      <span className="mr-2 px-2 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                        حقوق پایه
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-slate-600">
                    {comp.calculationType === 'fixed' && 'مبلغ ثابت'}
                    {comp.calculationType === 'formula' && <span dir="ltr" className="font-mono text-xs">{comp.formula}</span>}
                    {comp.calculationType === 'percentage' && `${comp.basePercentage}%`}
                    {comp.calculationType === 'time_based' && `وابسته به کارکرد (${comp.timeFactor})`}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${comp.isTaxable ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>مالیات</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${comp.isInsurable ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>بیمه</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {comp.isActive ? <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" /> : <XCircle className="w-5 h-5 text-slate-400 mx-auto" />}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(comp)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(comp.id)} className="p-1 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {components.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">هیچ جزء حقوقی یافت نشد.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? 'ویرایش جزء حقوق' : 'تعریف جزء حقوق جدید'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500"><XCircle className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">کد جزء *</label>
                  <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">عنوان جزء *</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">ماهیت</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500">
                    <option value="earning">مزایا (اضافه پرداختی)</option>
                    <option value="deduction">کسورات (کسر از حقوق)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">نحوه محاسبه</label>
                  <select value={formData.calculationType} onChange={e => setFormData({...formData, calculationType: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500">
                    <option value="fixed">مبلغ ثابت</option>
                    <option value="formula">فرمول ترکیبی</option>
                    <option value="percentage">درصدی از حقوق پایه</option>
                    <option value="time_based">وابسته به کارکرد</option>
                  </select>
                </div>
              </div>

              {formData.calculationType === 'formula' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">فرمول محاسبه</label>
                  <input type="text" value={formData.formula} onChange={e => setFormData({...formData, formula: e.target.value})} placeholder="e.g. (base_salary / 220) * 1.4 * overtime_hours" className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono text-left" dir="ltr" />
                  <p className="text-[10px] text-slate-500 mt-1">متغیرهای مجاز: base_salary, overtime_hours, absence_days, work_days</p>
                </div>
              )}

              {formData.calculationType === 'percentage' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">درصد</label>
                  <input type="number" value={formData.basePercentage} onChange={e => setFormData({...formData, basePercentage: e.target.value})} placeholder="مثلا 7" className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-left" dir="ltr" />
                </div>
              )}

              {formData.calculationType === 'time_based' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">فاکتور زمانی</label>
                  <select value={formData.timeFactor} onChange={e => setFormData({...formData, timeFactor: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500">
                    <option value="days">تعداد روز کارکرد</option>
                    <option value="overtime_hours">ساعات اضافه کاری</option>
                    <option value="absence_days">تعداد غیبت</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-100 pt-4 mt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.isTaxable} onChange={e => setFormData({...formData, isTaxable: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">مشمول مالیات</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.isInsurable} onChange={e => setFormData({...formData, isInsurable: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">مشمول بیمه</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer" title="فعال کردن این گزینه باعث می‌شود مبلغ این جزء به عنوان مبنای محاسبه در اجزای درصدی استفاده شود">
                  <input type="checkbox" checked={formData.isBaseSalary} onChange={e => setFormData({...formData, isBaseSalary: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">این حقوق پایه است</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">حساب حسابداری معین (اختیاری)</label>
                  <select value={formData.accountingAccountId} onChange={e => setFormData({...formData, accountingAccountId: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500">
                    <option value="">بدون اتصال به حسابداری</option>
                    {(accounts || []).map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-bold text-slate-700">وضعیت فعال</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold">انصراف</button>
              <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md">ذخیره اطلاعات</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
