import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Select from "react-select";
import { Tag, Plus, Edit2, X, Save } from "lucide-react";

interface ProductCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategoryId: string | null;
  productCategories: any[];
  newCatName: string;
  setNewCatName: (v: string) => void;
  newCatDesc: string;
  setNewCatDesc: (v: string) => void;
  newCatParentId: string;
  setNewCatParentId: (v: string) => void;
  handleSaveCategory: () => void;
  resetCategoryForm: () => void;
}

export default function ProductCategoryModal({
  isOpen,
  onClose,
  editingCategoryId,
  productCategories,
  newCatName,
  setNewCatName,
  newCatDesc,
  setNewCatDesc,
  newCatParentId,
  setNewCatParentId,
  handleSaveCategory,
  resetCategoryForm,
}: ProductCategoryModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              {editingCategoryId ? (
                <>
                  <Edit2 className="w-4 h-4 text-emerald-500" />
                  ویرایش گروه‌بندی
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-indigo-500" />
                  ثبت گروه‌بندی جدید
                </>
              )}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4 max-h-[70vh]">
            {/* Name input */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                نام گروه کالایی <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="مثال: مواد پروتئینی، لبنیات"
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 font-sans font-bold transition-all shadow-xs text-sm outline-none"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Tag className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Parent selection */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex justify-between items-center">
                <span>گروه والد (زیرمجموعه از)</span>
                <span className="text-[10px] text-slate-400 font-bold">(اختیاری)</span>
              </label>
              <Select
                isRtl
                value={
                  newCatParentId
                    ? {
                        value: newCatParentId,
                        label:
                          productCategories.find(
                            (c) =>
                              c.id === newCatParentId ||
                              c.id.toString() === newCatParentId?.toString()
                          )?.name || "گروه والد",
                      }
                    : null
                }
                onChange={(option: any) => setNewCatParentId(option ? option.value : "")}
                options={productCategories
                  .filter((c) => c.id !== editingCategoryId)
                  .map((c) => ({
                    value: c.id.toString(),
                    label: c.name,
                  }))}
                placeholder="انتخاب گروه والد..."
                isClearable
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    borderColor: "#e2e8f0",
                    fontSize: "14px",                    
                    fontWeight: "bold",
                    padding: "1.5px",
                    boxShadow: "none",
                    "&:hover": {
                      backgroundColor: "#f1f5f9",
                    },
                  }),
                  menu: (base) => ({
                    ...base,
                    fontSize: "13px",
                    fontWeight: "bold",
                    zIndex: 9999,
                  }),
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex justify-between items-center">
                <span>توضیحات</span>
                <span className="text-[10px] text-slate-400 font-bold">(اختیاری)</span>
              </label>
              <textarea
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="توضیحات مربوط به این دسته..."
                rows={3}
                className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 font-sans font-medium transition-all shadow-xs text-sm outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200/50 rounded-xl transition-all cursor-pointer border-none bg-transparent"
            >
              انصراف
            </button>
            <button
              onClick={() => {
                handleSaveCategory();
              }}
              disabled={!newCatName}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer border-none"
            >
              <Save className="w-4 h-4" />
              {editingCategoryId ? "ذخیره تغییرات" : "ثبت گروه جدید"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
