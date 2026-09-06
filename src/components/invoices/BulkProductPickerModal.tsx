import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Search,
  Check,
  Plus,
  Minus,
  Package,
  Layers,
  Sparkles,
  ShoppingBag,
  Filter,
  CheckCircle2,
  Trash2,
} from "lucide-react";

interface BulkProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  categories?: any[];
  onAddBulk: (selectedItems: Array<{ productId: string | number; quantity: number }>) => void;
  getProductStockInfo?: (productId: string | number) => any;
  calculateProductCurrentStock?: (productId: string | number) => number;
  formatNumber?: (val: any) => string;
  formatCurrency?: (val: any) => string;
  invoiceCurrency?: string;
  themeColor?: "indigo" | "emerald" | "amber" | "rose" | "blue";
  isPurchase?: boolean;
  toPersianDigits?: (str: any) => string;
}

export default function BulkProductPickerModal({
  isOpen,
  onClose,
  products = [],
  categories = [],
  onAddBulk,
  getProductStockInfo,
  calculateProductCurrentStock,
  formatNumber = (n) => String(n ?? 0),
  formatCurrency = (n) => String(n ?? 0),
  invoiceCurrency = "تومان",
  themeColor = "indigo",
  isPurchase = false,
  toPersianDigits = (s) => String(s ?? ""),
}: BulkProductPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [onlyInStock, setOnlyInStock] = useState(false);
  // Map of productId -> quantity
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuantities({});
      setSearchQuery("");
      setSelectedCategory("all");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle ESC or Ctrl+Enter
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, quantities]);

  // Extract all categories from products or props
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p) => {
      if (p.category && String(p.category).trim()) {
        set.add(String(p.category).trim());
      }
    });
    (categories || []).forEach((c) => {
      if (c.name && String(c.name).trim()) {
        set.add(String(c.name).trim());
      }
    });
    return Array.from(set);
  }, [products, categories]);

  // Filter products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);

    return (products || []).filter((p) => {
      if (!p || p.isActive === false) return false;

      // Category filter
      if (selectedCategory !== "all") {
        if (p.category !== selectedCategory && String(p.categoryId) !== selectedCategory) {
          return false;
        }
      }

      // Stock check
      let availableStock = 0;
      if (typeof getProductStockInfo === "function") {
        const sInfo = getProductStockInfo(p.id);
        availableStock = sInfo?.totalAvailable ?? sInfo?.totalPhysical ?? 0;
      } else if (typeof calculateProductCurrentStock === "function") {
        availableStock = calculateProductCurrentStock(p.id) || 0;
      } else if (p.stock !== undefined) {
        availableStock = Number(p.stock) || 0;
      }

      if (onlyInStock && p.type !== "service" && availableStock <= 0) {
        return false;
      }

      // Query filter
      if (terms.length > 0) {
        const pName = String(p.name || "").toLowerCase();
        const pCode = String(p.code || "").toLowerCase();
        const pBarcode = String(p.barcode || "").toLowerCase();
        const searchable = `${pName} ${pCode} ${pBarcode}`;
        return terms.every((t) => searchable.includes(t));
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, onlyInStock, getProductStockInfo, calculateProductCurrentStock]);

  const updateQuantity = (productId: string | number, deltaOrVal: number, isAbsolute: boolean = false) => {
    const pid = String(productId);
    setQuantities((prev) => {
      const current = prev[pid] || 0;
      const next = isAbsolute ? deltaOrVal : current + deltaOrVal;
      const updated = { ...prev };
      if (next <= 0) {
        delete updated[pid];
      } else {
        updated[pid] = Number(next.toFixed(4));
      }
      return updated;
    });
  };

  // Selected items calculations
  const selectedItemsList = useMemo(() => {
    const list: Array<{ product: any; quantity: number }> = [];
    Object.entries(quantities).forEach(([pid, qty]) => {
      if (qty > 0) {
        const prod = products.find((p) => String(p.id) === pid);
        if (prod) {
          list.push({ product: prod, quantity: qty });
        }
      }
    });
    return list;
  }, [quantities, products]);

  const totalSelectedCount = selectedItemsList.length;
  const totalUnits = selectedItemsList.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalEstimatedAmount = selectedItemsList.reduce((acc, curr) => {
    const price = isPurchase
      ? curr.product.purchasePrice || curr.product.price || 0
      : curr.product.price || 0;
    return acc + curr.quantity * price;
  }, 0);

  const handleSubmit = () => {
    if (selectedItemsList.length === 0) return;
    const payload = selectedItemsList.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));
    onAddBulk(payload);
    onClose();
  };

  const themeClasses = {
    indigo: {
      primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
      border: "border-indigo-200",
      activeTab: "bg-indigo-600 text-white shadow-xs",
      highlight: "bg-indigo-50/70 border-indigo-300",
      accent: "text-indigo-600",
    },
    emerald: {
      primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
      border: "border-emerald-200",
      activeTab: "bg-emerald-600 text-white shadow-xs",
      highlight: "bg-emerald-50/70 border-emerald-300",
      accent: "text-emerald-600",
    },
    amber: {
      primary: "bg-amber-600 hover:bg-amber-700 text-white",
      border: "border-amber-200",
      activeTab: "bg-amber-600 text-white shadow-xs",
      highlight: "bg-amber-50/70 border-amber-300",
      accent: "text-amber-600",
    },
    rose: {
      primary: "bg-rose-600 hover:bg-rose-700 text-white",
      border: "border-rose-200",
      activeTab: "bg-rose-600 text-white shadow-xs",
      highlight: "bg-rose-50/70 border-rose-300",
      accent: "text-rose-600",
    },
    blue: {
      primary: "bg-blue-600 hover:bg-blue-700 text-white",
      border: "border-blue-200",
      activeTab: "bg-blue-600 text-white shadow-xs",
      highlight: "bg-blue-50/70 border-blue-300",
      accent: "text-blue-600",
    },
  }[themeColor] || {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    border: "border-indigo-200",
    activeTab: "bg-indigo-600 text-white shadow-xs",
    highlight: "bg-indigo-50/70 border-indigo-300",
    accent: "text-indigo-600",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl bg-white shadow-xs border ${themeClasses.border} ${themeClasses.accent}`}>
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>انتخاب و ثبت گروهی کالاها (کاتالوگ سریع)</span>
                {totalSelectedCount > 0 && (
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-extrabold border border-emerald-200">
                    {toPersianDigits(totalSelectedCount)} قلم انتخاب شده
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تعداد اقلام مورد نیاز را تعیین کنید و در یک گام همه را به فاکتور منتقل نمایید.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute right-3.5 top-3 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام، کد یا بارکد کالا..."
              className="w-full pr-11 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer text-xs font-bold text-slate-700 transition-colors select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>فقط کالاهای دارای موجودی</span>
            </label>
          </div>
        </div>

        {/* Categories Chip Carousel */}
        {allCategories.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? themeClasses.activeTab
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              همه ({toPersianDigits(products.length)})
            </button>
            {allCategories.map((cat) => {
              const catCount = products.filter(
                (p) => p.category === cat || String(p.categoryId) === cat
              ).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? themeClasses.activeTab
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat} ({toPersianDigits(catCount)})
                </button>
              );
            })}
          </div>
        )}

        {/* Products Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-sm">هیچ کالایی با فیلترهای انتخابی یافت نشد.</p>
              <p className="text-xs text-slate-400 mt-1">
                عبارت جستجو را تغییر داده یا فیلتر دسته‌بندی را پاک کنید.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProducts.map((prod) => {
                const pid = String(prod.id);
                const currentQty = quantities[pid] || 0;
                const isSelected = currentQty > 0;

                let availableStock = 0;
                if (typeof getProductStockInfo === "function") {
                  const sInfo = getProductStockInfo(prod.id);
                  availableStock = sInfo?.totalAvailable ?? sInfo?.totalPhysical ?? 0;
                } else if (typeof calculateProductCurrentStock === "function") {
                  availableStock = calculateProductCurrentStock(prod.id) || 0;
                } else if (prod.stock !== undefined) {
                  availableStock = Number(prod.stock) || 0;
                }

                const price = isPurchase
                  ? prod.purchasePrice || prod.price || 0
                  : prod.price || 0;

                return (
                  <div
                    key={prod.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? `${themeClasses.highlight} shadow-sm border-2`
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-800 truncate">
                            {prod.name}
                          </h4>
                          {prod.type === "service" && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-bold">
                              خدمات
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                          {prod.code && (
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-bold">
                              کد: {toPersianDigits(prod.code)}
                            </span>
                          )}
                          {prod.category && (
                            <span className="text-slate-500 font-sans text-[11px]">
                              {prod.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <div className="font-black text-sm text-slate-800">
                          {formatCurrency(price)}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">
                            {invoiceCurrency}
                          </span>
                        </div>
                        {prod.type !== "service" && (
                          <div className="mt-1 text-right">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                availableStock > 0
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              موجودی: {toPersianDigits(formatNumber(availableStock))} {prod.unit || "عدد"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fast Quantity Selector */}
                    <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 font-bold ml-1">تعداد:</span>
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(prod.id, -1)}
                            disabled={currentQty <= 0}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={currentQty === 0 ? "" : currentQty}
                            placeholder="۰"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              updateQuantity(prod.id, isNaN(val) ? 0 : val, true);
                            }}
                            className="w-14 text-center text-sm font-black text-slate-800 py-1 outline-none bg-transparent"
                            dir="ltr"
                          />

                          <button
                            type="button"
                            onClick={() => updateQuantity(prod.id, 1)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-50 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-400 mr-1">
                          {prod.unit || "عدد"}
                        </span>
                      </div>

                      {/* Quick +1, +5, +10 Shortcuts */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(prod.id, 1)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          +۱
                        </button>
                        <button
                          type="button"
                          onClick={() => updateQuantity(prod.id, 5)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          +۵
                        </button>
                        <button
                          type="button"
                          onClick={() => updateQuantity(prod.id, 10)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          +۱۰
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Summary & Action Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-600 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">اقلام انتخاب شده:</span>
              <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {toPersianDigits(totalSelectedCount)} قلم
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">مجموع تعداد:</span>
              <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {toPersianDigits(formatNumber(totalUnits))}
              </span>
            </div>
            {totalEstimatedAmount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">جمع کل تخمینی:</span>
                <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {formatCurrency(totalEstimatedAmount)} {invoiceCurrency}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {totalSelectedCount > 0 && (
              <button
                type="button"
                onClick={() => setQuantities({})}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              >
                پاک کردن انتخاب‌ها
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 border border-slate-300 transition-colors cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="button"
              disabled={totalSelectedCount === 0}
              onClick={handleSubmit}
              className={`px-6 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${themeClasses.primary}`}
            >
              <Check className="w-4 h-4" />
              <span>
                {totalSelectedCount > 0
                  ? `افزودن ${toPersianDigits(totalSelectedCount)} قلم به فاکتور`
                  : "اقلامی را انتخاب کنید"}
              </span>
              <span className="text-[10px] font-mono px-1 rounded bg-black/10 border border-white/20">
                Ctrl+Enter
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
