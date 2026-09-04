import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Trash2, Edit2, FileText, CheckCircle, 
  XCircle, Save, X, RefreshCw, AlertCircle, Tag, Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SmsTemplate {
  id: string;
  name: string;
  slug: string;
  body: string;
  variables: any;
  category: string;
  providerId: string | null;
  isVerified: boolean;
  isActive: boolean;
  usageCount: number;
}

export default function SmsTemplatesView({ showNotification }: any) {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/data/sms_templates');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTemplates(data);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('خطا در دریافت قالب‌ها', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplatesToDb = async (newTemplates: SmsTemplate[]) => {
    setIsSaving(true);
    try {
      await fetch('/api/data/sms_templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplates)
      });
      setTemplates(newTemplates);
      if (showNotification) showNotification('تغییرات با موفقیت ذخیره شد', 'success');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('خطا در ذخیره‌سازی', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const extractVariables = (text: string) => {
    const matches = text.match(/\{[^}]+\}/g);
    if (!matches) return [];
    return matches.map(m => m.replace(/[{}]/g, ''));
  };

  const handleSave = () => {
    if (!name.trim() || !body.trim() || !slug.trim()) {
      if (showNotification) showNotification('عنوان، شناسه و متن قالب الزامی است', 'error');
      return;
    }

    const variables = extractVariables(body);

    if (editingTemplate) {
      const updated = templates.map(t => 
        t.id === editingTemplate.id ? { 
          ...t, name, slug, body, category, isActive, variables 
        } : t
      );
      saveTemplatesToDb(updated);
    } else {
      const newTemplate: SmsTemplate = {
        id: Math.random().toString(36).substring(2, 15),
        name,
        slug,
        body,
        category,
        isActive,
        variables,
        providerId: null,
        isVerified: false,
        usageCount: 0
      };
      saveTemplatesToDb([...templates, newTemplate]);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('آیا از حذف این قالب اطمینان دارید؟')) {
      const updated = templates.filter(t => t.id !== id);
      saveTemplatesToDb(updated);
    }
  };

  const openNewModal = () => {
    setEditingTemplate(null);
    setName("");
    setSlug("");
    setBody("");
    setCategory("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (template: SmsTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setSlug(template.slug);
    setBody(template.body);
    setCategory(template.category || "");
    setIsActive(template.isActive);
    setIsModalOpen(true);
  };

  const filteredTemplates = templates.filter(t => 
    t.name.includes(searchQuery) || 
    t.body.includes(searchQuery) ||
    t.category?.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" />
            مدیریت پیش‌نویس‌ها و قالب‌های پیام
          </h1>
          <p className="text-slate-500 text-sm mt-1">ساخت و مدیریت قالب‌های متنی با امکان تعریف متغیر پویا</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-200 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          قالب جدید
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="جستجو در عنوان، متن یا دسته‌بندی..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm"
          />
        </div>
        <button onClick={fetchTemplates} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 flex flex-col items-center justify-center text-center border border-slate-100 border-dashed">
          <FileText className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">هیچ قالبی یافت نشد</h3>
          <p className="text-slate-500 mt-2">شما هنوز هیچ قالب پیامکی ایجاد نکرده‌اید.</p>
          <button onClick={openNewModal} className="mt-6 text-indigo-600 font-bold hover:underline">ایجاد اولین قالب</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <motion.div 
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col transition-all ${template.isActive ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200 opacity-70 grayscale-[0.5]'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    {template.name}
                    {!template.isActive && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-normal">غیرفعال</span>}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 font-mono">#{template.slug}</span>
                    {template.category && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">
                        {template.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(template)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(template.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-700 mb-4 flex-1 line-clamp-4 leading-relaxed font-sans whitespace-pre-wrap">
                {template.body}
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                <div className="flex gap-1">
                  {template.variables && Array.isArray(template.variables) && template.variables.map((v: string, i: number) => (
                    <span key={i} className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {v}
                    </span>
                  ))}
                  {(!template.variables || template.variables.length === 0) && (
                    <span className="text-xs text-slate-400">بدون متغیر</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {template.usageCount || 0} بار استفاده
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Editor */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  {editingTemplate ? 'ویرایش قالب' : 'قالب جدید'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-white rounded-full shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">عنوان قالب <span className="text-red-500">*</span></label>
                    <input 
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="مثال: پیام خوش‌آمدگویی"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">شناسه (Slug) <span className="text-red-500">*</span></label>
                    <input 
                      type="text" value={slug} onChange={e => setSlug(e.target.value)}
                      placeholder="مثال: welcome_msg" dir="ltr"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-left"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">دسته‌بندی</label>
                  <input 
                    type="text" value={category} onChange={e => setCategory(e.target.value)}
                    placeholder="مثال: اطلاع‌رسانی، تبریک، هشدار..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700">متن پیام <span className="text-red-500">*</span></label>
                    <span className="text-xs text-slate-500">برای متغیر از <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">{"{متغیر}"}</code> استفاده کنید</span>
                  </div>
                  <textarea 
                    value={body} onChange={e => setBody(e.target.value)}
                    placeholder="متن پیام را وارد کنید. مثال: سلام {name} عزیز..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[150px] resize-none leading-relaxed"
                  />
                  <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-100 leading-relaxed">
                    <strong>متغیرهای سیستمی پرکاربرد:</strong><br />
                    <span className="inline-block mt-1 bg-white px-2 py-1 rounded shadow-sm">{"{name}"} : نام شخص</span>
                    <span className="inline-block mt-1 mr-2 bg-white px-2 py-1 rounded shadow-sm">{"{balance}"} : مانده حساب شخص</span>
                    <span className="inline-block mt-1 mr-2 bg-white px-2 py-1 rounded shadow-sm">{"{balance_status}"} : وضعیت حساب (بدهکار/بستانکار/تسویه)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <div>
                      متغیرهای استفاده شده: 
                      {extractVariables(body).length > 0 ? (
                        <span className="font-bold text-indigo-600 mr-2">{extractVariables(body).join(', ')}</span>
                      ) : (
                        <span className="mr-2">ندارد</span>
                      )}
                    </div>
                    <div className="dir-ltr text-left">
                      {body.length} / 700 chars
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors w-fit">
                    <div className="relative">
                      <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only" />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                    <span className="text-sm font-bold text-slate-700">وضعیت قالب (فعال/غیرفعال)</span>
                  </label>
                </div>
              </div>
              
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm"
                >
                  انصراف
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
                >
                  {isSaving ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  ذخیره قالب
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
