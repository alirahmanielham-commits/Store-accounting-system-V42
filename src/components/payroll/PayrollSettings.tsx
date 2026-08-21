import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Building2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { getWorkplaces, addWorkplace, updateWorkplace, deleteWorkplace, getOrderTemplates, addOrderTemplate, updateOrderTemplate, deleteOrderTemplate } from '../../services/hrService';
import { generateId } from '../../services/dataService';
import { formatNumber, toPersianDigits } from '../../utils/format';
import { motion, AnimatePresence } from 'framer-motion';

const STATUTORY_ITEMS = [
  { key: 'minimum_daily_wage', label: 'حداقل مزد روزانه' },
  { key: 'daily_base_seniority', label: 'پایه سنوات روزانه' },
  { key: 'housing_allowance', label: 'حق مسکن' },
  { key: 'grocery_allowance', label: 'بن خوار و بار' },
  { key: 'marriage_allowance', label: 'حق تاهل' },
  { key: 'attraction_allowance', label: 'حق جذب' },
  { key: 'supervision_allowance', label: 'حق سرپرستی' },
  { key: 'management_allowance', label: 'حق مدیریت' },
  { key: 'job_extra', label: 'فوق العاده شغل' },
  { key: 'education_allowance', label: 'حق تحصیلات' },
  { key: 'hardship_extra', label: 'فوق العاده سختی کار' },
  { key: 'oncall_allowance', label: 'حق آنکال' },
  { key: 'bad_weather_extra', label: 'فوق العاده بدی هوا' },
  { key: 'deprivation_extra', label: 'محرومیت از تسهیلات' },
  { key: 'location_extra', label: 'فوق العاده محل خدمت' },
  { key: 'environment_extra', label: 'فوق العاده محیط کار' },
  { key: 'commute_allowance', label: 'ایاب و ذهاب' },
  { key: 'food_subsidy', label: 'یارانه غذا' },
  { key: 'milk_allowance', label: 'حق شیر' },
  { key: 'kindergarten_subsidy', label: 'کمک هزینه مهدکودک' },
  { key: 'sports_subsidy', label: 'کمک هزینه ورزش' },
  { key: 'mobile_subsidy', label: 'کمک هزینه موبایل' },
  { key: 'continuous_noncash_benefits', label: 'مزایای مستمر غیرنقدی' },
];

const NON_STATUTORY_ITEMS = [
  { key: 'children_allowance', label: 'حق اولاد' },
  { key: 'overtime', label: 'اضافه کاری' },
  { key: 'night_shift', label: 'شب کاری' },
  { key: 'holiday_work', label: 'تعطیل کاری' },
  { key: 'shift_work', label: 'نوبت کاری' },
  { key: 'mission_allowance', label: 'حق ماموریت' },
];

export default function PayrollSettings({ showNotification }: { showNotification: (msg: string, type: 'success' | 'error') => void }) {
  const [activeTab, setActiveTab] = useState<'workplaces' | 'order_templates'>('workplaces');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [workplaces, setWorkplaces] = useState<any[]>([]);
  const [orderTemplates, setOrderTemplates] = useState<any[]>([]);
  
  const [editingWorkplaceId, setEditingWorkplaceId] = useState<string | null>(null);
  const [workplaceForm, setWorkplaceForm] = useState({
    code: '', name: '', employerName: '', postalCode: '', address: '', branchCode: '', branchName: '', isActive: true
  });
  
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<any>({ name: '', items: {} });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setWorkplaces(await getWorkplaces());
    setOrderTemplates(await getOrderTemplates());
  };

  const handleSaveWorkplace = async () => {
    if (!workplaceForm.name) return showNotification('نام کارگاه الزامی است', 'error');
    if (!workplaceForm.code) return showNotification('کد کارگاه الزامی است', 'error');
    try {
      if (editingWorkplaceId) {
        await updateWorkplace(editingWorkplaceId, workplaceForm);
        showNotification('کارگاه با موفقیت بروزرسانی شد', 'success');
      } else {
        await addWorkplace({ id: generateId(), ...workplaceForm });
        showNotification('کارگاه با موفقیت افزوده شد', 'success');
      }
      setEditingWorkplaceId(null);
      setWorkplaceForm({ code: '', name: '', employerName: '', postalCode: '', address: '', branchCode: '', branchName: '', isActive: true });
      fetchData();
    } catch (e) {
      showNotification('خطا در ذخیره کارگاه', 'error');
    }
  };

  const handleDeleteWorkplace = async (id: string) => {
    if (window.confirm('آیا از حذف این کارگاه اطمینان دارید؟')) {
      await deleteWorkplace(id);
      showNotification('کارگاه حذف شد', 'success');
      fetchData();
    }
  };

  const handleEditWorkplace = (w: any) => {
    setEditingWorkplaceId(w.id);
    setWorkplaceForm({
      code: w.code || '',
      name: w.name || '',
      employerName: w.employerName || '',
      postalCode: w.postalCode || '',
      address: w.address || '',
      branchCode: w.branchCode || '',
      branchName: w.branchName || '',
      isActive: w.isActive !== false
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name) return showNotification('نام قالب الزامی است', 'error');
    try {
      if (editingTemplateId) {
        await updateOrderTemplate(editingTemplateId, templateForm);
        showNotification('قالب با موفقیت بروزرسانی شد', 'success');
      } else {
        await addOrderTemplate({ id: generateId(), ...templateForm });
        showNotification('قالب با موفقیت افزوده شد', 'success');
      }
      setEditingTemplateId(null);
      setTemplateForm({ name: '', items: {} });
      setShowTemplateForm(false);
      fetchData();
    } catch (e) {
      showNotification('خطا در ذخیره قالب', 'error');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('آیا از حذف این قالب اطمینان دارید؟')) {
      await deleteOrderTemplate(id);
      showNotification('قالب حذف شد', 'success');
      fetchData();
    }
  };

  const handleEditTemplate = (t: any) => {
    setEditingTemplateId(t.id);
    setTemplateForm({
      name: t.name || '',
      items: t.items || {}
    });
    setShowTemplateForm(true);
  };

  const updateTemplateItem = (key: string, field: string, value: any) => {
    setTemplateForm((prev: any) => {
      const newItems = { ...prev.items };
      const isStatutory = STATUTORY_ITEMS.some(i => i.key === key);
      
      if (!newItems[key]) {
        newItems[key] = {
          type: isStatutory ? 'statutory' : 'non_statutory',
          nature: isStatutory ? 'continuous' : 'non_continuous',
          isTaxExempt: false,
          isInsuranceExempt: false,
          isBaseWage: false,
        };
      }
      
      newItems[key][field] = value;
      return { ...prev, items: newItems };
    });
  };

  const formatAmountInput = (val: string) => {
    const raw = val.replace(/,/g, '');
    if (!raw || isNaN(Number(raw))) return '';
    return formatNumber(Number(raw));
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-black text-slate-800 mb-6">تنظیمات حقوق و دستمزد</h1>
        <div className="flex gap-4 p-2 bg-white rounded-2xl shadow-sm border border-slate-200">
          <button onClick={() => setActiveTab('workplaces')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all flex-1 justify-center ${activeTab === 'workplaces' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Building2 className="w-5 h-5" />
            مدیریت کارگاه‌ها
          </button>
          <button onClick={() => setActiveTab('order_templates')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all flex-1 justify-center ${activeTab === 'order_templates' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <FileText className="w-5 h-5" />
            قالب‌های حکم کارگزینی
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 pt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'workplaces' && (
            <motion.div key="workplaces" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6">
                <h2 className="text-lg font-black text-slate-800 mb-6 border-b border-slate-100 pb-4">
                  {editingWorkplaceId ? 'ویرایش کارگاه' : 'ثبت کارگاه جدید'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">نام کارگاه</label>
                    <input type="text" value={workplaceForm.name} onChange={e => setWorkplaceForm({...workplaceForm, name: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">کد کارگاه</label>
                    <input type="text" value={workplaceForm.code} onChange={e => setWorkplaceForm({...workplaceForm, code: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-mono text-left transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">نام کارفرما</label>
                    <input type="text" value={workplaceForm.employerName} onChange={e => setWorkplaceForm({...workplaceForm, employerName: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">کد پستی</label>
                    <input type="text" value={workplaceForm.postalCode} onChange={e => setWorkplaceForm({...workplaceForm, postalCode: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-mono text-left transition-all" />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">آدرس</label>
                    <input type="text" value={workplaceForm.address} onChange={e => setWorkplaceForm({...workplaceForm, address: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">نام شعبه</label>
                    <input type="text" value={workplaceForm.branchName} onChange={e => setWorkplaceForm({...workplaceForm, branchName: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">کد شعبه</label>
                    <input type="text" value={workplaceForm.branchCode} onChange={e => setWorkplaceForm({...workplaceForm, branchCode: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-mono text-left transition-all" />
                  </div>
                  <div className="flex items-center gap-3 mt-8">
                    <input type="checkbox" id="isActive" checked={workplaceForm.isActive} onChange={e => setWorkplaceForm({...workplaceForm, isActive: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded-md" />
                    <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">کارگاه فعال است</label>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  {editingWorkplaceId && (
                    <button onClick={() => {
                      setEditingWorkplaceId(null);
                      setWorkplaceForm({ code: '', name: '', employerName: '', postalCode: '', address: '', branchCode: '', branchName: '', isActive: true });
                    }} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
                      انصراف
                    </button>
                  )}
                  <button onClick={handleSaveWorkplace} className="px-8 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-sm flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    {editingWorkplaceId ? 'ثبت تغییرات' : 'ثبت کارگاه'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 font-bold text-slate-600">کد کارگاه</th>
                        <th className="p-4 font-bold text-slate-600">نام کارگاه</th>
                        <th className="p-4 font-bold text-slate-600">نام کارفرما</th>
                        <th className="p-4 font-bold text-slate-600">کد / نام شعبه</th>
                        <th className="p-4 font-bold text-slate-600 text-center">وضعیت</th>
                        <th className="p-4 font-bold text-slate-600 text-left">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {workplaces.map(w => (
                        <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-mono text-slate-700">{w.code}</td>
                          <td className="p-4 font-bold text-slate-800">{w.name}</td>
                          <td className="p-4 text-slate-600">{w.employerName || '-'}</td>
                          <td className="p-4 text-slate-600">{w.branchCode ? `${w.branchCode} / ${w.branchName || '-'}` : '-'}</td>
                          <td className="p-4 text-center">
                            {w.isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                                <CheckCircle className="w-4 h-4" /> فعال
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold">
                                <XCircle className="w-4 h-4" /> غیرفعال
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleEditWorkplace(w)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button onClick={() => handleDeleteWorkplace(w.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {workplaces.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">هیچ کارگاهی ثبت نشده است.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'order_templates' && (
            <motion.div key="order_templates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              
              {!showTemplateForm ? (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-800">
                      لیست قالب‌های حکم کارگزینی
                    </h2>
                    <button onClick={() => { setEditingTemplateId(null); setTemplateForm({ name: '', items: {} }); setShowTemplateForm(true); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      تعریف قالب جدید
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orderTemplates.map(t => (
                      <div key={t.id} className="flex flex-col p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-slate-50 transition-all gap-4 shadow-sm hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-lg">{t.name}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditTemplate(t)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-500 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          {Object.keys(t.items || {}).length} عنوان ثبت شده
                        </div>
                      </div>
                    ))}
                  </div>
                  {orderTemplates.length === 0 && (
                    <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 mt-4">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="font-bold">هیچ قالبی ثبت نشده است.</p>
                      <p className="text-sm mt-1">برای شروع روی دکمه «تعریف قالب جدید» کلیک کنید.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-slate-100 pb-4 gap-4">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-indigo-600" />
                      {editingTemplateId ? 'ویرایش قالب حکم' : 'تعریف قالب حکم جدید'}
                    </h2>
                    <div className="flex gap-3">
                      <button onClick={() => {
                        setEditingTemplateId(null);
                        setTemplateForm({ name: '', items: {} });
                        setShowTemplateForm(false);
                      }} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-sm transition-colors">
                        انصراف و بازگشت
                      </button>
                      <button onClick={handleSaveTemplate} className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-sm flex items-center gap-2 text-sm">
                        <Save className="w-5 h-5" />
                        {editingTemplateId ? 'ثبت تغییرات' : 'ذخیره قالب'}
                      </button>
                    </div>
                  </div>

                  <div className="mb-8">
                  <label className="block text-sm font-bold text-slate-700 mb-2">نام قالب</label>
                  <input type="text" value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} placeholder="مثال: قالب حکم پرسنل تولید" className="w-full md:w-1/2 border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" />
                </div>

                <div className="space-y-8">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">۱</div>
                      <h3 className="text-lg font-black text-slate-800">عناوین حکمی</h3>
                    </div>
                    <div className="flex flex-col gap-4">
                      {STATUTORY_ITEMS.map(item => (
                        <div key={item.key} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <span className="font-bold text-slate-700 text-sm md:w-1/4 whitespace-nowrap">{item.label}</span>
                          <div className="flex flex-col md:flex-row gap-3 flex-1">
                            <input 
                              type="text" 
                              placeholder="مبلغ (ریال)" 
                              value={formatNumber(templateForm.items[item.key]?.amount || '')}
                              onChange={e => updateTemplateItem(item.key, 'amount', e.target.value.replace(/,/g, ''))}
                              className="w-full md:w-1/4 border border-slate-200 bg-white rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-mono text-left transition-all text-sm"
                            />
                            <select
                              value={templateForm.items[item.key]?.nature || 'continuous'}
                              onChange={e => updateTemplateItem(item.key, 'nature', e.target.value)}
                              className="w-full md:w-1/4 border border-slate-200 bg-white rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all text-sm text-slate-700"
                            >
                              <option value="continuous">مستمر</option>
                              <option value="non_continuous">غیر مستمر</option>
                              <option value="daily_wage">دستمزد روزانه</option>
                            </select>
                            
                            <div className="flex flex-wrap items-center justify-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 flex-1">
                              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={templateForm.items[item.key]?.isTaxExempt || false} onChange={e => updateTemplateItem(item.key, 'isTaxExempt', e.target.checked)} className="rounded text-indigo-600 w-3.5 h-3.5" />
                                معاف از مالیات
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={templateForm.items[item.key]?.isInsuranceExempt || false} onChange={e => updateTemplateItem(item.key, 'isInsuranceExempt', e.target.checked)} className="rounded text-indigo-600 w-3.5 h-3.5" />
                                معاف از بیمه
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={templateForm.items[item.key]?.isBaseWage || false} onChange={e => updateTemplateItem(item.key, 'isBaseWage', e.target.checked)} className="rounded text-indigo-600 w-3.5 h-3.5" />
                                مزد پایه
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">۲</div>
                      <h3 className="text-lg font-black text-slate-800">عناوین غیر حکمی</h3>
                    </div>
                    <div className="flex flex-col gap-4">
                      {NON_STATUTORY_ITEMS.map(item => (
                        <div key={item.key} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <span className="font-bold text-slate-700 text-sm md:w-1/4 whitespace-nowrap">{item.label}</span>
                          <div className="flex flex-col md:flex-row gap-3 flex-1">
                            <select
                              value={templateForm.items[item.key]?.nature || 'non_continuous'}
                              onChange={e => updateTemplateItem(item.key, 'nature', e.target.value)}
                              className="w-full md:w-1/3 border border-slate-200 bg-white rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all text-sm text-slate-700"
                            >
                              <option value="continuous">مستمر</option>
                              <option value="non_continuous">غیر مستمر</option>
                              <option value="daily_wage">دستمزد روزانه</option>
                            </select>
                            
                            <div className="flex flex-wrap items-center justify-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 flex-1">
                              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={templateForm.items[item.key]?.isTaxExempt || false} onChange={e => updateTemplateItem(item.key, 'isTaxExempt', e.target.checked)} className="rounded text-indigo-600 w-3.5 h-3.5" />
                                معاف از مالیات
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={templateForm.items[item.key]?.isInsuranceExempt || false} onChange={e => updateTemplateItem(item.key, 'isInsuranceExempt', e.target.checked)} className="rounded text-indigo-600 w-3.5 h-3.5" />
                                معاف از بیمه
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
