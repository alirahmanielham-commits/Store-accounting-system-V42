import React, { useState, useRef, useEffect } from 'react';
import { X, Zap, Barcode, Package, DollarSign, Plus, Check, FolderPlus, Folder } from 'lucide-react';
import { toPersianDigits } from '../../utils/format';
import { getProductCategories, addProductCategory } from '../../services/dataService';

interface FastProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: any) => Promise<boolean>; // Returns true if success
}

export default function FastProductCreateModal({
  isOpen,
  onClose,
  onSave
}: FastProductCreateModalProps) {
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const cats = await getProductCategories();
      setCategories(cats || []);
    } catch (e) {
      console.error("Error loading categories", e);
    }
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) {
      setIsAddingNewCategory(false);
      return;
    }
    
    try {
      const newCat = { name: newCategoryName.trim() };
      const savedCat = await addProductCategory(newCat);
      setCategories(prev => [...prev, savedCat]);
      setCategory(savedCat.name);
      setNewCategoryName("");
      setIsAddingNewCategory(false);
    } catch (e) {
      console.error("Error saving category", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setSuccessMsg("");

    const newProduct = {
      name: name.trim(),
        imageUrl: imageUrl.trim(),
      barcode: barcode.trim(),
      purchasePrice: purchasePrice ? Number(purchasePrice) : 0,
      price: sellPrice ? Number(sellPrice) : 0,
      stock: stock ? Number(stock) : 0,
      category: category || "بدون دسته‌بندی",
      type: 'product',
      code: barcode.trim() || `P${Math.floor(Math.random() * 10000)}`, // auto code if empty
    };

    try {
      const success = await onSave(newProduct);
      if (success) {
        setSuccessMsg(`کالا "${name}" ثبت شد.`);
        // Reset form for next fast input
        setBarcode("");
        setName("");
        setPurchasePrice("");
        setSellPrice("");
        setStock("");
            setImageUrl("");
        // category is kept intentionally for sequential product additions
        
        // Focus barcode again
        barcodeInputRef.current?.focus();
        
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-slide-up sm:animate-scale-in">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">ثبت سریع کالا</h2>
              <p className="text-xs font-bold text-slate-500 mt-0.5">ویژه موبایل / بارکدخوان</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {successMsg && (
            <div className="mb-4 bg-emerald-50 text-emerald-700 p-3 rounded-xl flex items-center gap-2 text-sm font-bold border border-emerald-100">
              <Check className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-slate-400" /> بارکد / کد
              </label>
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-left"
                placeholder="اسکن بارکد..."
                dir="ltr"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    nameInputRef.current?.focus();
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-slate-400" /> دسته‌بندی کالا
                </label>
                {!isAddingNewCategory && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCategory(true)}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg"
                  >
                    <Plus className="w-3 h-3" /> دسته جدید
                  </button>
                )}
              </div>
              
              {isAddingNewCategory ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
                    placeholder="نام دسته بندی جدید"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveCategory}
                    className="p-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors shrink-0"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCategory(false)}
                    className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm font-medium"
                >
                  <option value="">بدون دسته‌بندی</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-slate-400" /> نام کالا <span className="text-rose-500">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                placeholder="نام کالا را وارد کنید"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-slate-400" /> قیمت خرید
                </label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-left"
                  placeholder="0"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-slate-400" /> قیمت فروش
                </label>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-left"
                  placeholder="0"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-slate-400" /> موجودی اولیه
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono text-left"
                placeholder="0"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full py-4 mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-xl shadow-lg shadow-amber-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  ثبت و کالای بعدی
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
