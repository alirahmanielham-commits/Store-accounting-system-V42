import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Building2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { getWorkplaces, addWorkplace, updateWorkplace, deleteWorkplace, getOrderTemplates, addOrderTemplate, updateOrderTemplate, deleteOrderTemplate } from '../../services/hrService';
import { generateId } from '../../services/dataService';
import { formatNumber, toPersianDigits } from '../../utils/format';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_COMPONENTS = [
  { id: 'c1', title: 'پایه حقوق', type: 'earning', amount: '100000000', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: true, nature: 'continuous' },
  { id: 'c2', title: 'حق مسکن', type: 'earning', amount: '9000000', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' },
  { id: 'c3', title: 'بن کارگری', type: 'earning', amount: '14000000', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' },
  { id: 'c4', title: 'حق اولاد', type: 'earning', amount: '7166184', isTaxExempt: true, isInsuranceExempt: true, isBaseWage: false, nature: 'continuous' },
  { id: 'c5', title: 'حق بیمه سهم کارگر', type: 'deduction', amount: 'base * 0.07', isTaxExempt: true, isInsuranceExempt: true, isBaseWage: false, nature: 'continuous' },
  { id: 'c6', title: 'مالیات', type: 'deduction', amount: 'tax_formula', isTaxExempt: true, isInsuranceExempt: true, isBaseWage: false, nature: 'continuous' }
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
  const [templateForm, setTemplateForm] = useState<any>({ name: '', items: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [wp, ot] = await Promise.all([
        getWorkplaces(),
        getOrderTemplates()
      ]);
      setWorkplaces(wp || []);
      setOrderTemplates(ot || []);
    } catch (e) {
      console.error(e);
      showNotification('خطا در دریافت اطلاعات', 'error');
    }
  };

  // --- Workplaces methods ---
  const handleSaveWorkplace = async () => {
    if (!workplaceForm.name || !workplaceForm.code) {
      return showNotification('کد و نام کارگاه الزامی است', 'error');
    }
    try {
      if (editingWorkplaceId) {
        await updateWorkplace(editingWorkplaceId, workplaceForm);
        showNotification('تغییرات ذخیره شد', 'success');
      } else {
        await addWorkplace({ id: Date.now().toString(), ...workplaceForm });
        showNotification('کارگاه جدید ثبت شد', 'success');
      }
      setEditingWorkplaceId(null);
      setWorkplaceForm({ code: '', name: '', employerName: '', postalCode: '', address: '', branchCode: '', branchName: '', isActive: true });
      fetchData();
    } catch (e) {
      showNotification('خطا در ذخیره کارگاه', 'error');
    }
  };

  const handleEditWorkplace = (w: any) => {
    setWorkplaceForm({
      code: w.code || '', name: w.name || '', employerName: w.employerName || '', 
      postalCode: w.postalCode || '', address: w.address || '', branchCode: w.branchCode || '', 
      branchName: w.branchName || '', isActive: w.isActive ?? true
    });
    setEditingWorkplaceId(w.id);
  };

  const handleDeleteWorkplace = async (id: string) => {
    if (!window.confirm('آیا از حذف این کارگاه مطمئن هستید؟')) return;
    try {
      await deleteWorkplace(id);
      showNotification('کارگاه حذف شد', 'success');
      fetchData();
    } catch (e) {
      showNotification('خطا در حذف کارگاه', 'error');
    }
  };

  // --- Order Templates methods ---
  const handleSaveTemplate = async () => {
    if (!templateForm.name) {
      return showNotification('نام قالب الزامی است', 'error');
    }
    try {
      if (editingTemplateId) {
        await updateOrderTemplate(editingTemplateId, templateForm);
        showNotification('تغییرات قالب ذخیره شد', 'success');
      } else {
        await addOrderTemplate({ id: generateId(), ...templateForm });
        showNotification('قالب جدید ثبت شد', 'success');
      }
      setEditingTemplateId(null);
      setTemplateForm({ name: '', items: [] });
      setShowTemplateForm(false);
      fetchData();
    } catch (e) {
      showNotification('خطا در ذخیره قالب', 'error');
    }
  };

  const handleEditTemplate = (t: any) => {
    let migratedItems = [];
    if (Array.isArray(t.items)) {
      migratedItems = t.items;
    } else if (t.items && typeof t.items === 'object') {
      // Migrate old format
      Object.keys(t.items).forEach(key => {
        migratedItems.push({
          id: key,
          title: key,
          type: 'earning',
          amount: t.items[key].amount || '',
          isTaxExempt: t.items[key].isTaxExempt || false,
          isInsuranceExempt: t.items[key].isInsuranceExempt || false,
          isBaseWage: t.items[key].isBaseWage || false,
          nature: t.items[key].nature || 'continuous'
        });
      });
    }
    
    setTemplateForm({
      name: t.name || '',
      items: migratedItems
    });
    setEditingTemplateId(t.id);
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('آیا از حذف این قالب مطمئن هستید؟')) return;
    try {
      await deleteOrderTemplate(id);
      showNotification('قالب حذف شد', 'success');
      fetchData();
    } catch (e) {
      showNotification('خطا در حذف قالب', 'error');
    }
  };

  const handleCreateNewTemplate = () => {
    setEditingTemplateId(null);
    setTemplateForm({ name: '', items: JSON.parse(JSON.stringify(DEFAULT_COMPONENTS)) });
    setShowTemplateForm(true);
  };

  const handleAddComponent = () => {
    setTemplateForm((prev: any) => ({
      ...prev,
      items: [...prev.items, { 
        id: generateId(), 
        title: '', 
        type: 'earning', 
        amount: '', 
        isTaxExempt: false, 
        isInsuranceExempt: false, 
        isBaseWage: false, 
        nature: 'continuous' 
      }]
    }));
  };

  const handleUpdateComponent = (index: number, field: string, value: any) => {
    setTemplateForm((prev: any) => {
      const newItems = [...prev.items];
      newItems[index][field] = value;
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveComponent = (index: number) => {
    setTemplateForm((prev: any) => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden" dir="rtl">
      <div className="p-6 pb-2 w-full mx-auto">
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

      <div className="flex-1 overflow-auto p-6 pt-4 w-full mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'workplaces' && (
            <motion.div key="workplaces" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Workplaces Form */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-6">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                      <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-indigo-600" />
                        {editingWorkplaceId ? 'ویرایش کارگاه' : 'تعریف کارگاه جدید'}
                      </h2>
                      {editingWorkplaceId && (
                        <button onClick={() => { setEditingWorkplaceId(null); setWorkplaceForm({ code: '', name: '', employerName: '', postalCode: '', address: '', branchCode: '', branchName: '', isActive: true }); }} className="text-sm text-slate-500 hover:text-slate-700 font-bold bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                          انصراف
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">کد کارگاه</label>
                          <input type="text" value={workplaceForm.code} onChange={e => setWorkplaceForm({...workplaceForm, code: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 font-mono transition-all" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">نام کارگاه</label>
                          <input type="text" value={workplaceForm.name} onChange={e => setWorkplaceForm({...workplaceForm, name: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 font-bold transition-all" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">نام کارفرما</label>
                        <input type="text" value={workplaceForm.employerName} onChange={e => setWorkplaceForm({...workplaceForm, employerName: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 font-bold transition-all" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">کد شعبه تامین اجتماعی</label>
                          <input type="text" value={workplaceForm.branchCode} onChange={e => setWorkplaceForm({...workplaceForm, branchCode: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 font-mono transition-all" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">نام شعبه</label>
                          <input type="text" value={workplaceForm.branchName} onChange={e => setWorkplaceForm({...workplaceForm, branchName: e.target.value})} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 font-bold transition-all" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">آدرس کارگاه</label>
                        <textarea value={workplaceForm.address} onChange={e => setWorkplaceForm({...workplaceForm, address: e.target.value})} rows={2} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 font-bold transition-all resize-none"></textarea>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-10 h-6 rounded-full transition-colors relative ${workplaceForm.isActive ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${workplaceForm.isActive ? 'left-1' : 'left-5'}`}></div>
                          </div>
                          <input type="checkbox" checked={workplaceForm.isActive} onChange={e => setWorkplaceForm({...workplaceForm, isActive: e.target.checked})} className="hidden" />
                          <span className="text-sm font-bold text-slate-700 select-none group-hover:text-indigo-600 transition-colors">کارگاه فعال است</span>
                        </label>
                        <button onClick={handleSaveWorkplace} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          {editingWorkplaceId ? 'ثبت تغییرات' : 'ذخیره'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Workplaces List */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                    <h2 className="text-lg font-black text-slate-800 mb-6 border-b border-slate-100 pb-4">
                      لیست کارگاه‌های تعریف شده
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {workplaces.map(w => (
                        <div key={w.id} className={`p-5 rounded-2xl border transition-all ${!w.isActive ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-indigo-100 hover:border-indigo-300 shadow-sm hover:shadow-md'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                {w.name}
                                {!w.isActive && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">غیرفعال</span>}
                              </h3>
                              <p className="text-sm text-slate-500 font-mono mt-1">کد: {w.code}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                              <button onClick={() => handleEditWorkplace(w)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="ویرایش">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteWorkplace(w.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="حذف">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mt-4 pt-4 border-t border-slate-50">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">کارفرما:</span>
                              <span className="font-bold text-slate-700">{w.employerName || '---'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">شعبه تامین اجتماعی:</span>
                              <span className="font-bold text-slate-700">{w.branchName || '---'} <span className="text-xs font-mono text-slate-400">({w.branchCode})</span></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {workplaces.length === 0 && (
                      <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="font-bold">هیچ کارگاهی ثبت نشده است.</p>
                        <p className="text-sm mt-1">از فرم سمت راست برای تعریف کارگاه استفاده کنید.</p>
                      </div>
                    )}
                  </div>
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
                    <button onClick={handleCreateNewTemplate} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2">
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
                          {t.items?.length || 0} عنوان ثبت شده
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
                        setTemplateForm({ name: '', items: [] });
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

                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">اجزای حقوقی (عناوین حکمی و غیرحکمی)</h3>
                      <button onClick={handleAddComponent} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-all shadow-sm flex items-center gap-2 text-sm">
                        <Plus className="w-4 h-4" />
                        افزودن جزء جدید
                      </button>
                    </div>

                    <div className="space-y-4">
                      {templateForm.items.map((item: any, index: number) => (
                        <div key={index} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col gap-4 shadow-sm hover:border-indigo-300 transition-colors">
                          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                            
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-xs font-bold text-slate-500 mb-1">عنوان جزء</label>
                              <input 
                                type="text" 
                                value={item.title}
                                onChange={e => handleUpdateComponent(index, 'title', e.target.value)}
                                placeholder="مثال: پایه حقوق"
                                className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all text-sm"
                              />
                            </div>
                            
                            <div className="w-32">
                              <label className="block text-xs font-bold text-slate-500 mb-1">نوع</label>
                              <select 
                                value={item.type}
                                onChange={e => handleUpdateComponent(index, 'type', e.target.value)}
                                className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all text-sm"
                              >
                                <option value="earning">مزایا (+)</option>
                                <option value="deduction">کسورات (-)</option>
                              </select>
                            </div>

                            <div className="flex-1 min-w-[150px]">
                              <label className="block text-xs font-bold text-slate-500 mb-1">مبلغ / فرمول</label>
                              <input 
                                type="text" 
                                value={item.amount}
                                onChange={e => handleUpdateComponent(index, 'amount', e.target.value)}
                                placeholder="مثال: 10000000 یا base * 0.1"
                                className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-mono text-left transition-all text-sm"
                                dir="ltr"
                              />
                            </div>

                            <div className="w-36">
                              <label className="block text-xs font-bold text-slate-500 mb-1">ماهیت</label>
                              <select 
                                value={item.nature}
                                onChange={e => handleUpdateComponent(index, 'nature', e.target.value)}
                                className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all text-sm"
                              >
                                <option value="continuous">مستمر</option>
                                <option value="non_continuous">غیر مستمر</option>
                                <option value="daily_wage">دستمزد روزانه</option>
                              </select>
                            </div>

                            <button onClick={() => handleRemoveComponent(index)} className="mt-6 p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors self-end md:self-auto" title="حذف جزء">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${item.isTaxExempt ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                {item.isTaxExempt && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <input type="checkbox" checked={item.isTaxExempt} onChange={e => handleUpdateComponent(index, 'isTaxExempt', e.target.checked)} className="hidden" />
                              <span className="text-xs font-bold text-slate-700">معاف از مالیات</span>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${item.isInsuranceExempt ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                {item.isInsuranceExempt && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <input type="checkbox" checked={item.isInsuranceExempt} onChange={e => handleUpdateComponent(index, 'isInsuranceExempt', e.target.checked)} className="hidden" />
                              <span className="text-xs font-bold text-slate-700">معاف از بیمه</span>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${item.isBaseWage ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                {item.isBaseWage && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <input type="checkbox" checked={item.isBaseWage} onChange={e => handleUpdateComponent(index, 'isBaseWage', e.target.checked)} className="hidden" />
                              <span className="text-xs font-bold text-slate-700">حقوق پایه (مرجع محاسبات)</span>
                            </label>
                          </div>
                        </div>
                      ))}
                      
                      {templateForm.items.length === 0 && (
                        <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <p className="font-bold text-slate-500">هیچ جزء حقوقی در این قالب وجود ندارد.</p>
                        </div>
                      )}
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
