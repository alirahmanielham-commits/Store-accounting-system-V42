import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Loader2, Plus, CheckCircle, X, Check, SearchIcon, Sparkles } from "lucide-react";

interface AIProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  onAddProducts: (products: any[], categoryId: string) => void;
}

export default function AIProductSearchModal({
  isOpen,
  onClose,
  categories,
  onAddProducts,
}: AIProductSearchModalProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError("");
    setResults([]);
    setSelectedIds(new Set());

    try {
      const selectedCat = categories.find((c) => c.id.toString() === categoryId);
      const catName = selectedCat ? selectedCat.name : "";

      const res = await fetch("/api/search-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, category: catName }),
      });

      if (!res.ok) {
        throw new Error("خطا در ارتباط با سرور یا تنظیمات هوش مصنوعی انجام نشده است.");
      }

      const data = await res.json();
      if (data.products && Array.isArray(data.products)) {
        setResults((data.products || []).map((p: any, index: number) => ({ ...p, id: index })));
      } else {
        setResults([]);
      }
    } catch (err: any) {
      setError(err.message || "خطایی رخ داد");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    setSelectedIds(new Set(results.map((r) => r.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleAddSelected = () => {
    if (selectedIds.size === 0) return;
    
    const selectedProducts = results.filter((r) => selectedIds.has(r.id)).map(r => ({
      name: r.name,
      description: r.description || "",
      price: r.priceStr ? parseInt(r.priceStr.replace(/\D/g, ""), 10) || 0 : 0
    }));

    onAddProducts(selectedProducts, categoryId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col font-sans"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-l from-indigo-50/50 to-white">
          <div className="flex items-center gap-3 text-indigo-700">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">استخراج خودکار کالا از اینترنت</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">با استفاده از هوش مصنوعی کالاها را جستجو و ثبت کنید</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6 bg-slate-50/30">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  کلمه کلیدی یا موضوع جستجو
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="مثال: قطعات یدکی پراید"
                    className="w-full pl-4 pr-11 py-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                  <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  دسته‌بندی مرتبط (اختیاری)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="">بدون دسته‌بندی</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال جستجو...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    جستجوی هوشمند
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-sm font-bold text-slate-800">
                  نتایج یافت شده ({results.length})
                </span>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-indigo-600 font-bold hover:underline">
                    انتخاب همه
                  </button>
                  <span className="text-slate-300">|</span>
                  <button onClick={deselectAll} className="text-xs text-slate-500 font-bold hover:underline">
                    لغو انتخاب
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1">
                {results.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => toggleSelect(result.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                      selectedIds.has(result.id)
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-200 hover:border-indigo-300 bg-white"
                    }`}
                  >
                    <div className={`w-5 h-5 mt-0.5 shrink-0 rounded flex items-center justify-center border ${
                      selectedIds.has(result.id) ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-300"
                    }`}>
                      {selectedIds.has(result.id) && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{result.name}</h4>
                      {result.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {result.description}
                        </p>
                      )}
                      {result.priceStr && (
                        <p className="text-xs font-mono text-indigo-600 mt-1.5 font-bold">
                          {result.priceStr}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500">
            {selectedIds.size} مورد انتخاب شده
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
            >
              انصراف
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              افزودن به سیستم
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
