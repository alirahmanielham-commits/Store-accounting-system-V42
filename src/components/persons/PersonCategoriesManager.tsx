import React, { useState, useEffect } from "react";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Palette,
  Check,
  RotateCw,
  X,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  getPersonCategories,
  addPersonCategory,
  updatePersonCategory,
  deletePersonCategory,
  getPersons
} from "../../services/dataService";
import { PersonCategory, Person } from "../../types";

interface PersonCategoriesManagerProps {
  showNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

const colorPresets = [
  { value: "indigo", label: "نیلی", bg: "bg-indigo-50", text: "text-indigo-850", border: "border-indigo-200", dot: "bg-indigo-500" },
  { value: "emerald", label: "زمردی", bg: "bg-emerald-50", text: "text-emerald-850", border: "border-emerald-200", dot: "bg-emerald-500" },
  { value: "rose", label: "سرخ", bg: "bg-rose-50", text: "text-rose-850", border: "border-rose-200", dot: "bg-rose-500" },
  { value: "amber", label: "کهربایی", bg: "bg-amber-50", text: "text-amber-850", border: "border-amber-200", dot: "bg-amber-500" },
  { value: "purple", label: "بنفش", bg: "bg-purple-50", text: "text-purple-850", border: "border-purple-200", dot: "bg-purple-500" },
  { value: "cyan", label: "فیروزه‌ای", bg: "bg-cyan-50", text: "text-cyan-850", border: "border-cyan-200", dot: "bg-cyan-500" },
  { value: "orange", label: "پرتقالی", bg: "bg-orange-50", text: "text-orange-850", border: "border-orange-200", dot: "bg-orange-500" },
  { value: "slate", label: "سنگی", bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200", dot: "bg-slate-500" },
];

export default function PersonCategoriesManager({ showNotification }: PersonCategoriesManagerProps) {
  const [categories, setCategories] = useState<PersonCategory[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("indigo");
  const [categoryIcon, setCategoryIcon] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fetchedCategories, fetchedPersons] = await Promise.all([
        getPersonCategories(),
        getPersons(),
      ]);
      setCategories(fetchedCategories as any);
      setPersons(fetchedPersons as any);
    } catch (error) {
      console.error("Error fetching categories:", error);
      showNotification("خطا در دریافت اطلاعات", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (category: PersonCategory) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryColor(category.color || "indigo");
    setCategoryIcon(category.icon || "");
    setIsModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryColor("indigo");
    setCategoryIcon("");
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      showNotification("عنوان برچسب الزامی است", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: categoryName,
        color: categoryColor,
        icon: categoryIcon,
      };

      if (editingCategoryId) {
        await updatePersonCategory(editingCategoryId, payload);
        showNotification("برچسب با موفقیت ویرایش شد", "success");
      } else {
        await addPersonCategory(payload);
        showNotification("برچسب جدید با موفقیت ایجاد شد", "success");
      }
      handleCancelEdit();
      await fetchData();
    } catch (error) {
      console.error("Error saving category:", error);
      showNotification("خطا در ذخیره برچسب", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const usageCount = getCategoryUsageCount(id);
      if (usageCount > 0) {
        showNotification("این برچسب به اشخاص اختصاص داده شده و قابل حذف نیست", "error");
        setDeletingCategoryId(null);
        return;
      }

      await deletePersonCategory(id);
      showNotification("برچسب با موفقیت حذف شد", "success");
      setDeletingCategoryId(null);
      await fetchData();
    } catch (error) {
      console.error("Error deleting category:", error);
      showNotification("خطا در حذف برچسب", "error");
    }
  };

  const getColorClasses = (colorName: string) => {
    const preset = colorPresets.find((p) => p.value === colorName);
    if (!preset) return "bg-slate-50 text-slate-700 border-slate-200";
    return `${preset.bg} ${preset.text} ${preset.border}`;
  };
  
  const getCategoryUsageCount = (categoryId: string) => {
      // Check if it's assigned to any person
      return persons.filter(p => p.categories && p.categories.includes(categoryId)).length;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">برچسب‌ها و دسته‌بندی‌ها</h1>
            <p className="text-xs text-slate-500 mt-1 font-bold">مدیریت برچسب‌های متصل به اشخاص</p>
          </div>
        </div>
        <button
          onClick={() => {
            handleCancelEdit();
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-600/30 active:translate-y-0 text-sm font-black cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          برچسب جدید
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-indigo-600 gap-3 flex-1">
          <RotateCw className="w-8 h-8 animate-spin" />
          <span className="text-sm font-black text-slate-600">در حال دریافت اطلاعات...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <Tag className="w-12 h-12 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">هیچ برچسبی ثبت نشده است.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
              >
                ایجاد اولین برچسب
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.map((category) => {
                const usageCount = getCategoryUsageCount(category.id);
                
                return (
                  <div key={category.id} className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-4 relative group ${getColorClasses(category.color || 'slate')}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {category.icon && <span className="text-xl">{category.icon}</span>}
                        <h3 className="font-black">{category.name}</h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/60 border border-white/50 backdrop-blur-sm">
                            <Users className="w-3.5 h-3.5" />
                            <span className="text-xs font-black">{usageCount} عضو</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {deletingCategoryId === category.id ? (
                                <div className="flex items-center gap-1 bg-white/90 p-1 rounded-lg backdrop-blur-sm shadow-sm absolute bottom-4 left-4 z-10 border border-slate-200">
                                    <button onClick={() => handleDelete(category.id)} className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black rounded-md transition-colors">حذف</button>
                                    <button onClick={() => setDeletingCategoryId(null)} className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black rounded-md transition-colors">لغو</button>
                                </div>
                            ) : (
                                <>
                                    <button onClick={() => handleStartEdit(category)} className="p-1.5 bg-white/60 hover:bg-white/90 rounded-md transition-colors backdrop-blur-sm shadow-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setDeletingCategoryId(category.id)} disabled={usageCount > 0} className="p-1.5 bg-white/60 hover:bg-rose-100 hover:text-rose-600 rounded-md transition-colors backdrop-blur-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 className="w-3.5 h-3.5" /></button>
                                </>
                            )}
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelEdit}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col z-10"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                      <h2 className="text-base font-black text-slate-800">
                        {editingCategoryId ? "ویرایش برچسب" : "ایجاد برچسب جدید"}
                      </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="p-2 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer border border-slate-200 shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                  <form id="category-form" onSubmit={handleSave} className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2">عنوان برچسب <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="مثال: مشتری VIP، بدحساب..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-right"
                        required
                        autoFocus
                      />
                    </div>
                        
                    <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">آیکون (اموجی یا نماد)</label>
                        <input
                            type="text"
                            value={categoryIcon}
                            onChange={(e) => setCategoryIcon(e.target.value)}
                            placeholder="مثال: ⭐"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-right"
                        />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2.5 flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-indigo-500" />
                        رنگ برچسب
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {colorPresets.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setCategoryColor(preset.value)}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-[10px] font-black transition-all relative cursor-pointer ${
                              categoryColor === preset.value
                                ? `${preset.bg} ${preset.text} border-2 border-indigo-600 scale-[1.05] shadow-md`
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full ${preset.dot} mb-2`} />
                            {preset.label}
                            {categoryColor === preset.value && (
                              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm">
                                <Check className="w-3 h-3" strokeWidth={4} />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Live Preview Card */}
                    <div className="pt-2">
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">پیش‌نمایش</label>
                      <div className="flex items-center">
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm flex items-center gap-1.5 ${getColorClasses(categoryColor)}`}>
                          {categoryIcon && <span>{categoryIcon}</span>}
                          {categoryName || "عنوان برچسب"}
                        </span>
                      </div>
                    </div>
                  </form>
              </div>
              
              <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-3xl">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    form="category-form"
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-sm rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    {submitting ? (
                        <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Check className="w-4 h-4" strokeWidth={3} />
                    )}
                    <span>{editingCategoryId ? "ذخیره تغییرات" : "ایجاد برچسب"}</span>
                  </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
