import React, { useState, useEffect, useMemo } from 'react';
import { Copy, Edit2, Trash2, Plus, Save, Search, X, Check } from 'lucide-react';
import { getOrderTemplates, addOrderTemplate, updateOrderTemplate, deleteOrderTemplate } from '../../services/hrService';
import { generateId } from '../../services/dataService';
import { toPersianDigits, formatNumber } from '../../utils/format';

export default function OrderTemplatesManager({ showNotification }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [templateForm, setTemplateForm] = useState<any>({
    name: '',
    items: []
  });

  const availableComponents = [
    { id: 'daily_wage', title: 'دستمزد روزانه', type: 'earning' },
    { id: 'housing', title: 'حق مسکن', type: 'earning' },
    { id: 'marriage', title: 'حق تاهل', type: 'earning' },
    { id: 'grocery', title: 'خوار بار', type: 'earning' },
    { id: 'child', title: 'حق اولاد', type: 'earning' },
    { id: 'base_years', title: 'پایه سنوات', type: 'earning' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getOrderTemplates();
      setTemplates(data);
    } catch (e) {
      console.error(e);
      showNotification('خطا در دریافت لیست قالب‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template = null) => {
    if (template) {
      setEditingTemplateId(template.id);
      setTemplateForm(template);
    } else {
      setEditingTemplateId(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplateId(null);
    resetForm();
  };

  const resetForm = () => {
    setTemplateForm({
      name: '',
      items: []
    });
  };

  const handleToggleComponent = (comp: any) => {
    const exists = templateForm.items.find((i: any) => i.id === comp.id);
    if (exists) {
      setTemplateForm({
        ...templateForm,
        items: templateForm.items.filter((i: any) => i.id !== comp.id)
      });
    } else {
      setTemplateForm({
        ...templateForm,
        items: [...templateForm.items, { ...comp, amount: '' }]
      });
    }
  };

  const handleItemAmountChange = (id: string, val: string) => {
    setTemplateForm({
      ...templateForm,
      items: templateForm.items.map((i: any) => i.id === id ? { ...i, amount: val } : i)
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name) {
      return showNotification('لطفاً نام قالب را وارد کنید', 'error');
    }

    if (loading) return;
    setLoading(true);

    try {
      if (editingTemplateId) {
        await updateOrderTemplate(editingTemplateId, templateForm);
        showNotification('قالب با موفقیت ویرایش شد', 'success');
      } else {
        await addOrderTemplate({
          id: generateId(),
          ...templateForm
        });
        showNotification('قالب جدید با موفقیت ثبت شد', 'success');
      }
      handleCloseModal();
      fetchData();
    } catch (error) {
      showNotification('خطا در ذخیره قالب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('آیا از حذف این قالب مطمئن هستید؟')) {
      try {
        await deleteOrderTemplate(id);
        showNotification('قالب با موفقیت حذف شد', 'success');
        fetchData();
      } catch (error) {
        showNotification('خطا در حذف قالب', 'error');
      }
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => 
      (t.name || '').includes(searchQuery)
    );
  }, [templates, searchQuery]);

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
      <div className="w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Copy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">قالب‌های حکم کارگزینی</h1>
              <p className="text-sm text-slate-500 mt-1">تعریف و مدیریت قالب‌های آماده برای صدور احکام</p>
            </div>
          </div>
          <button onClick={() => handleOpenModal()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2">
            <Plus className="w-5 h-5" /> قالب جدید
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-96">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو بر اساس نام قالب..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold">نام قالب</th>
                  <th className="p-4 font-bold">تعداد آیتم‌ها</th>
                  <th className="p-4 font-bold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 font-bold">در حال بارگذاری...</td>
                  </tr>
                ) : filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 font-bold">هیچ قالبی یافت نشد</td>
                  </tr>
                ) : (
                  filteredTemplates.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{t.name}</td>
                      <td className="p-4 text-slate-600 font-medium font-mono">{toPersianDigits(t.items?.length || 0)} مورد</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(t)}
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                            title="ویرایش"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(t.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Template Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Copy className="w-6 h-6 text-indigo-500" />
                {editingTemplateId ? 'ویرایش قالب' : 'ایجاد قالب جدید'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">نام قالب</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={e => setTemplateForm({...templateForm, name: e.target.value})}
                  className="w-full border border-slate-200 bg-white rounded-xl p-3 outline-none focus:border-indigo-500 font-bold transition-all text-sm"
                  placeholder="مثال: قالب حکم سال ۱۴۰۳ کارگران ساده"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">آیتم‌های حقوق و مزایا (انتخاب کنید)</label>
                <div className="flex flex-wrap gap-2 mb-6">
                  {availableComponents.map(comp => {
                    const isSelected = templateForm.items.some((i: any) => i.id === comp.id);
                    return (
                      <button
                        key={comp.id}
                        onClick={() => handleToggleComponent(comp)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {comp.title}
                      </button>
                    );
                  })}
                </div>

                {templateForm.items.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">مقادیر ثابت برای این قالب (اختیاری)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templateForm.items.map((item: any) => (
                        <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <label className="block text-xs font-bold text-slate-700 mb-2">{item.title}</label>
                          <input
                            type="text"
                            value={item.amount || ''}
                            onChange={(e) => handleItemAmountChange(item.id, e.target.value)}
                            placeholder="مبلغ ثابت (ریال) یا فرمول"
                            className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2 outline-none focus:border-indigo-500 font-mono transition-all text-sm"
                            dir="ltr"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button onClick={handleCloseModal} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm">
                انصراف
              </button>
              <button onClick={handleSaveTemplate} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 text-sm">
                <Save className="w-4 h-4" />
                {editingTemplateId ? 'ثبت تغییرات' : 'ذخیره قالب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
