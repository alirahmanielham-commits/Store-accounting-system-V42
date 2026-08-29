import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Save, CheckCircle, Settings, Building2 } from 'lucide-react';
import { getOrderTemplates, addOrderTemplate, updateOrderTemplate, deleteOrderTemplate, getEmployeeOrders } from '../../services/hrService';
import { generateId } from '../../services/dataService';
import WorkplaceManagerModal from './WorkplaceManagerModal';

const REQUIRED_DEFAULTS = [
  { id: 'daily_wage', title: 'دستمزد روزانه', type: 'earning', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: true, nature: 'continuous' },
  { id: 'housing', title: 'حق مسکن', type: 'earning', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' },
  { id: 'marriage', title: 'حق تاهل', type: 'earning', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' },
  { id: 'grocery', title: 'خوار بار', type: 'earning', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' },
  { id: 'child', title: 'حق اولاد', type: 'earning', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' }
];

const DEFAULT_COMPONENTS = [
  ...REQUIRED_DEFAULTS,
  { id: 'insurance', title: 'بیمه تامین اجتماعی (سهم کارگر)', type: 'deduction', amount: 'daily_wage * 31 * 0.07', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' },
  { id: 'tax', title: 'مالیات حقوق', type: 'deduction', amount: '', isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' }
];

const DEFAULT_IDS = ['daily_wage', 'housing', 'marriage', 'grocery', 'child'];


export default function PayrollSettings({ showNotification, storeSettings }: any) {
  const [orderTemplates, setOrderTemplates] = useState<any[]>([]);
  
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<any>({ name: '', items: [] });
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isWorkplaceModalOpen, setIsWorkplaceModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const ot = await getOrderTemplates();
      setOrderTemplates(ot || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveTemplate = async () => {
    if (loading) return;
    if (!templateForm.name) {
      return showNotification('نام قالب الزامی است', 'error');
    }
    setLoading(true);
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
      await fetchData();
    } catch (e) {
      showNotification('خطا در ذخیره قالب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (t: any) => {
    let migratedItems = [];
    if (Array.isArray(t.items)) {
      migratedItems = t.items;
    } else if (t.items && typeof t.items === 'object') {
      Object.keys(t.items).forEach(key => {
        migratedItems.push({
          id: key, title: key, type: 'earning', amount: t.items[key].amount || '',
          isTaxExempt: t.items[key].isTaxExempt || false, isInsuranceExempt: t.items[key].isInsuranceExempt || false,
          isBaseWage: t.items[key].isBaseWage || false, nature: t.items[key].nature || 'continuous'
        });
      });
    }
    

    // Ensure all required defaults exist
    REQUIRED_DEFAULTS.forEach(rd => {
      const exists = migratedItems.find(i => i.id === rd.id);
      if (!exists) {
        migratedItems.unshift({...rd}); // Add to top or where appropriate
      }
    });

    setTemplateForm({ name: t.name || '', items: migratedItems });
    setEditingTemplateId(t.id);
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const orders = await getEmployeeOrders();
      const isUsed = orders.some((o: any) => o.templateId === id);
      if (isUsed) {
        showNotification('این قالب در صدور احکام استفاده شده است و قابل حذف نیست', 'error');
        return;
      }
      
      if (!window.confirm('آیا از حذف این قالب مطمئن هستید؟')) return;
      
      await deleteOrderTemplate(id);
      showNotification('قالب حذف شد', 'success');
      fetchData();
    } catch (e) {
      showNotification('خطا در بررسی یا حذف قالب', 'error');
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
        id: generateId(), title: '', type: 'earning', amount: '', 
        isTaxExempt: false, isInsuranceExempt: false, isBaseWage: false, nature: 'continuous' 
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
      <div className="p-6 pb-2 w-full mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800">مدیریت قالب‌های حکم کارگزینی</h1>
        <button onClick={() => setIsWorkplaceModalOpen(true)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          مدیریت کارگاه‌ها
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 pt-4 w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-6">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-indigo-600" />
                  قالب‌های تعریف شده
                </h2>
                {!showTemplateForm && (
                  <button onClick={handleCreateNewTemplate} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors" title="قالب جدید">
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {orderTemplates.map((t: any) => (
                  <div key={t.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex justify-between items-center group hover:border-indigo-300 transition-colors">
                    <div className="font-bold text-slate-800 truncate pl-2">{t.name}</div>
                    <div className="flex items-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditTemplate(t)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors" title="ویرایش">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {orderTemplates.length === 0 && (
                  <div className="text-center p-6 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Settings className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-sm">هیچ قالبی تعریف نشده است.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showTemplateForm && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-black text-slate-800">
                    {editingTemplateId ? 'ویرایش قالب حکم' : 'تعریف قالب حکم جدید'}
                  </h2>
                  <div className="flex gap-3">
                    <button onClick={() => { setShowTemplateForm(false); setEditingTemplateId(null); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm">
                      انصراف
                    </button>
                    <button onClick={handleSaveTemplate} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 text-sm">
                      <Save className="w-4 h-4" />
                      ذخیره قالب
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">نام قالب</label>
                  <input type="text" value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} placeholder="مثال: کارمندان قراردادی 1403" className="w-full md:w-1/2 border border-slate-200 bg-slate-50 rounded-xl p-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all" />
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
                              className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                              disabled={DEFAULT_IDS.includes(item.id)}
                            />
                          </div>
                          
                          <div className="w-32">
                            <label className="block text-xs font-bold text-slate-500 mb-1">نوع</label>
                            <select 
                              value={item.type}
                              onChange={e => handleUpdateComponent(index, 'type', e.target.value)}
                              className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-bold transition-all text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                              disabled={DEFAULT_IDS.includes(item.id)}
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

                          {!DEFAULT_IDS.includes(item.id) && (
                            <button onClick={() => handleRemoveComponent(index)} className="mt-6 p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors self-end md:self-auto" title="حذف جزء">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
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
            </div>
          )}
        </div>
      </div>
      
      <WorkplaceManagerModal 
        isOpen={isWorkplaceModalOpen} 
        onClose={() => setIsWorkplaceModalOpen(false)} 
        showNotification={showNotification}
        storeSettings={storeSettings}
      />
    </div>
  );
}
