import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Package,
  Layers,
  Check,
  ChevronDown,
  X,
  SlidersHorizontal,
  Barcode,
  ArrowUpDown,
  Filter,
  AlertCircle
} from "lucide-react";
import { Product } from "../../types";
import { toPersianDigits, addCommas } from "../../utils/format";

interface AdvancedProductSearchSelectProps {
  products: Product[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  categories?: any[];
}

export default function AdvancedProductSearchSelect({
  products,
  selectedProductId,
  onSelectProduct,
  categories = []
}: AdvancedProductSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "inStock" | "outOfStock">("all");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When dropdown opens, focus input
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id?.toString() === selectedProductId?.toString());
  }, [products, selectedProductId]);

  // Unique categories from products if not provided
  const categoryList = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).map((c) => ({ id: c, name: c }));
  }, [categories, products]);

  // Filter products based on search query, category, and stock status
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return products.filter((p) => {
      // 1. Query search
      if (q) {
        const nameMatch = p.name?.toLowerCase().includes(q);
        const codeMatch = p.code?.toLowerCase().includes(q);
        const barcodeMatch = p.barcode?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        const descMatch = p.description?.toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !barcodeMatch && !catMatch && !descMatch) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== "all") {
        const matchCat =
          p.categoryId?.toString() === selectedCategory ||
          p.category?.toString() === selectedCategory;
        if (!matchCat) return false;
      }

      // 3. Stock filter
      const stock = Number(p.stock) || 0;
      if (stockFilter === "inStock" && stock <= 0) return false;
      if (stockFilter === "outOfStock" && stock > 0) return false;

      return true;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  // Reset active index when filtered results change
  useEffect(() => {
    setActiveIndex(0);
  }, [filteredProducts.length, searchQuery]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
      scrollActiveItemIntoView(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollActiveItemIntoView(activeIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredProducts[activeIndex]) {
        handleSelect(filteredProducts[activeIndex].id?.toString() || "");
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const scrollActiveItemIntoView = (index: number) => {
    if (!listRef.current) return;
    const item = listRef.current.children[index] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  };

  const handleSelect = (id: string) => {
    onSelectProduct(id);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full font-sans" dir="rtl">
      {/* Selected Product Display / Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="w-full bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-2.5 transition-all cursor-pointer shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none flex items-center justify-between gap-2"
      >
        {selectedProduct ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 font-bold">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 truncate">
                  {selectedProduct.name}
                </span>
                {selectedProduct.code && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                    کد: {toPersianDigits(selectedProduct.code)}
                  </span>
                )}
                {selectedProduct.category && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 shrink-0 hidden sm:inline">
                    {selectedProduct.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                <span>واحد: <strong className="text-slate-700">{selectedProduct.unit || "عدد"}</strong></span>
                <span>•</span>
                <span>
                  موجودی پایه:{" "}
                  <strong
                    className={
                      Number(selectedProduct.stock || 0) > 0
                        ? "text-emerald-700 font-black"
                        : "text-rose-600 font-black"
                    }
                  >
                    {toPersianDigits(addCommas(Number(selectedProduct.stock || 0)))}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
            <Search className="w-4 h-4 text-slate-400" />
            <span>جستجو و انتخاب کالا از انبار...</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors">
            جستجوی پیشرفته
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              isOpen ? "rotate-180 text-indigo-600" : ""
            }`}
          />
        </div>
      </div>

      {/* Advanced Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full right-0 left-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Input Bar */}
          <div className="p-3 bg-slate-50/80 border-b border-slate-200 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-indigo-600" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="جستجو بر اساس نام کالا، کد، بارکد یا مشخصات فنی..."
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl pr-9 pl-8 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-[11px] rounded-lg px-2 py-1 outline-none font-bold"
                >
                  <option value="all">همه دسته‌بندی‌ها ({products.length})</option>
                  {categoryList.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Filter Chips */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setStockFilter("all")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                    stockFilter === "all"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  همه ({toPersianDigits(products.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter("inStock")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                    stockFilter === "inStock"
                      ? "bg-emerald-600 text-white"
                      : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  موجود
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter("outOfStock")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                    stockFilter === "outOfStock"
                      ? "bg-rose-600 text-white"
                      : "text-rose-600 hover:bg-rose-50"
                  }`}
                >
                  ناموجود
                </button>
              </div>
            </div>
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1"
          >
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">کالایی با این مشخصات یافت نشد</p>
                <p className="text-[11px] text-slate-400">
                  می‌توانید عبارت جستجو یا فیلتر دسته‌بندی را تغییر دهید
                </p>
              </div>
            ) : (
              filteredProducts.map((product, idx) => {
                const isSelected = product.id?.toString() === selectedProductId?.toString();
                const isActive = idx === activeIndex;
                const stock = Number(product.stock || 0);

                return (
                  <div
                    key={product.id}
                    onClick={() => handleSelect(product.id?.toString() || "")}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-indigo-50/80 border border-indigo-200"
                        : isActive
                        ? "bg-slate-50 text-slate-900"
                        : "hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800 truncate">
                            {product.name}
                          </span>
                          {product.code && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                              کد: {toPersianDigits(product.code)}
                            </span>
                          )}
                          {product.barcode && (
                            <span className="text-[10px] text-slate-400 hidden sm:inline">
                              بارکد: {toPersianDigits(product.barcode)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          {product.category && (
                            <span className="text-indigo-600 font-medium">
                              {product.category}
                            </span>
                          )}
                          <span>•</span>
                          <span>واحد: {product.unit || "عدد"}</span>
                          {product.purchasePrice ? (
                            <>
                              <span>•</span>
                              <span>
                                فی خرید:{" "}
                                <strong className="text-slate-700 font-bold">
                                  {toPersianDigits(addCommas(Math.round(product.purchasePrice)))} تومان
                                </strong>
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Stock status badge */}
                    <div className="text-left shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black ${
                          stock > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {stock > 0 ? (
                          <>
                            <span>{toPersianDigits(addCommas(stock))}</span>
                            <span className="text-[10px] font-normal">{product.unit || "عدد"}</span>
                          </>
                        ) : (
                          "موجودی صفر"
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
            <span>تعداد نتایج یافت‌شده: {toPersianDigits(filteredProducts.length)} کالا</span>
            <div className="flex items-center gap-2 text-slate-400">
              <span>با کلیدهای ↑ و ↓ جابجا شوید و با اینتر انتخاب کنید</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-600 font-bold hover:text-slate-800"
              >
                بستن (ESC)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
