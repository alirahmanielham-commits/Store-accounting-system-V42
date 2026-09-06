import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ScanLine, Plus, Layers, CornerDownLeft, X, Package, Box, Tag, FilePlus } from "lucide-react";

interface FastItemEntryBarProps {
  products: any[];
  onAddProduct: (productIdStr: string, productObj?: any, quantity?: number) => void;
  onAddBlankRow?: () => void;
  onOpenBulkModal?: () => void;
  onOpenScanner?: () => void;
  onOpenNewProductModal?: () => void;
  getProductStockInfo?: (productId: string | number) => any;
  calculateProductCurrentStock?: (productId: string | number) => number;
  formatNumber?: (val: any) => string;
  formatCurrency?: (val: any) => string;
  invoiceCurrency?: string;
  themeColor?: "indigo" | "emerald" | "amber" | "rose" | "blue";
  isPurchase?: boolean;
  toPersianDigits?: (str: any) => string;
}

export default function FastItemEntryBar({
  products = [],
  onAddProduct,
  onAddBlankRow,
  onOpenBulkModal,
  onOpenScanner,
  onOpenNewProductModal,
  getProductStockInfo,
  calculateProductCurrentStock,
  formatNumber = (n) => String(n ?? 0),
  formatCurrency = (n) => String(n ?? 0),
  invoiceCurrency = "تومان",
  themeColor = "indigo",
  isPurchase = false,
  toPersianDigits = (s) => String(s ?? ""),
}: FastItemEntryBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global shortcut F2 or Alt+A to focus the search bar
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" || (e.altKey && (e.key === "a" || e.key === "A" || e.key === "ش"))) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "F4" && onOpenBulkModal) {
        e.preventDefault();
        onOpenBulkModal();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onOpenBulkModal]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter products in real time with high speed
  const filteredProducts = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const activeList = products.filter((p) => p && p.isActive !== false);

    // Exact barcode / code match first
    const exactMatch = activeList.find(
      (p) =>
        (p.barcode && String(p.barcode).trim().toLowerCase() === trimmed) ||
        (p.code && String(p.code).trim().toLowerCase() === trimmed)
    );
    if (exactMatch) {
      return [exactMatch];
    }

    const terms = trimmed.split(/\s+/).filter(Boolean);
    const matches: any[] = [];

    for (const p of activeList) {
      const pName = String(p.name || "").toLowerCase();
      const pCode = String(p.code || "").toLowerCase();
      const pBarcode = String(p.barcode || "").toLowerCase();
      const pCategory = String(p.category || "").toLowerCase();

      const searchable = `${pName} ${pCode} ${pBarcode} ${pCategory}`;
      const isMatch = terms.every((t) => searchable.includes(t));
      if (isMatch) {
        matches.push(p);
        if (matches.length >= 12) break; // Limit dropdown for high FPS
      }
    }

    return matches;
  }, [query, products]);

  // Keep selected index within bounds
  useEffect(() => {
    if (filteredProducts.length > 0) {
      setSelectedIndex(0);
    }
  }, [filteredProducts.length]);

  const handleSelectProduct = (product: any) => {
    if (!product) return;
    onAddProduct(String(product.id), product, 1);
    setQuery("");
    setIsOpen(false);
    // Keep focus in the input for lightning-fast consecutive item entry!
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && filteredProducts.length > 0) {
        setIsOpen(true);
        return;
      }
      setSelectedIndex((prev) => (prev + 1 < filteredProducts.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        const itemToSelect = filteredProducts[selectedIndex] || filteredProducts[0];
        handleSelectProduct(itemToSelect);
      } else if (query.trim()) {
        // Direct scan fallback: search active products for code or barcode
        const clean = query.trim().toLowerCase();
        const found = products.find(
          (p) =>
            p &&
            p.isActive !== false &&
            (String(p.barcode || "").toLowerCase() === clean ||
              String(p.code || "").toLowerCase() === clean ||
              String(p.name || "").toLowerCase() === clean)
        );
        if (found) {
          handleSelectProduct(found);
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Theme styling configurations
  const themeClasses = {
    indigo: {
      ring: "focus-within:ring-indigo-500",
      border: "border-indigo-200 hover:border-indigo-400",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-100",
      btnPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white",
      btnLight: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200",
      selected: "bg-indigo-50 text-indigo-900 border-r-4 border-indigo-600",
      highlight: "text-indigo-600",
    },
    emerald: {
      ring: "focus-within:ring-emerald-500",
      border: "border-emerald-200 hover:border-emerald-400",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
      btnPrimary: "bg-emerald-600 hover:bg-emerald-700 text-white",
      btnLight: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200",
      selected: "bg-emerald-50 text-emerald-900 border-r-4 border-emerald-600",
      highlight: "text-emerald-600",
    },
    amber: {
      ring: "focus-within:ring-amber-500",
      border: "border-amber-200 hover:border-amber-400",
      badge: "bg-amber-50 text-amber-800 border-amber-100",
      btnPrimary: "bg-amber-600 hover:bg-amber-700 text-white",
      btnLight: "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200",
      selected: "bg-amber-50 text-amber-950 border-r-4 border-amber-600",
      highlight: "text-amber-600",
    },
    rose: {
      ring: "focus-within:ring-rose-500",
      border: "border-rose-200 hover:border-rose-400",
      badge: "bg-rose-50 text-rose-700 border-rose-100",
      btnPrimary: "bg-rose-600 hover:bg-rose-700 text-white",
      btnLight: "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200",
      selected: "bg-rose-50 text-rose-900 border-r-4 border-rose-600",
      highlight: "text-rose-600",
    },
    blue: {
      ring: "focus-within:ring-blue-500",
      border: "border-blue-200 hover:border-blue-400",
      badge: "bg-blue-50 text-blue-700 border-blue-100",
      btnPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
      btnLight: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200",
      selected: "bg-blue-50 text-blue-900 border-r-4 border-blue-600",
      highlight: "text-blue-600",
    },
  }[themeColor] || {
    ring: "focus-within:ring-indigo-500",
    border: "border-indigo-200 hover:border-indigo-400",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-100",
    btnPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    btnLight: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200",
    selected: "bg-indigo-50 text-indigo-900 border-r-4 border-indigo-600",
    highlight: "text-indigo-600",
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        {/* Instant Search and Barcode Input */}
        <div
          className={`flex-1 relative flex items-center bg-white border-2 ${themeClasses.border} rounded-2xl shadow-xs focus-within:ring-2 ${themeClasses.ring} transition-all`}
        >
          <div className="pr-3.5 pl-2 text-slate-400 flex items-center gap-1.5 shrink-0">
            <Search className="w-5 h-5" />
            <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold border border-slate-200">
              F2
            </span>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="🔍 ورود بارکد، کد یا نام کالا... (Enter برای افزودن سریع)"
            className="w-full py-3 px-2 bg-transparent text-sm font-bold text-slate-800 placeholder:text-slate-400 outline-none"
            dir="auto"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1.5 mx-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="p-2 ml-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0"
              title="اسکن بارکد با دوربین دستگاه"
            >
              <ScanLine className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Action Shortcut Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {onOpenBulkModal && (
            <button
              type="button"
              onClick={onOpenBulkModal}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs ${themeClasses.btnLight}`}
              title="افزودن دسته‌جمعی اقلام از کاتالوگ (F4)"
            >
              <Layers className="w-4 h-4" />
              <span>کاتالوگ و افزودن گروهی</span>
              <span className="text-[10px] font-mono px-1 rounded bg-white/70 border border-current opacity-70">
                F4
              </span>
            </button>
          )}

          {onAddBlankRow && (
            <button
              type="button"
              onClick={onAddBlankRow}
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="افزودن یک سطر آزاد دستی بدون نیاز به تعریف در انبار"
            >
              <FilePlus className="w-4 h-4 text-slate-500" />
              <span>ردیف دستی آزاد</span>
            </button>
          )}

          {onOpenNewProductModal && (
            <button
              type="button"
              onClick={onOpenNewProductModal}
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="تعریف کالای جدید در سیستم"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>کالای جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Dropdown Suggestions */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full right-0 left-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden max-h-[360px] flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-400" />
              نتایج کالاها ({toPersianDigits(filteredProducts.length)} مورد)
            </span>
            <span className="text-[11px] text-slate-400">
              با کلیدهای <kbd className="px-1 py-0.5 bg-white border rounded font-mono text-[10px]">↑</kbd>{" "}
              <kbd className="px-1 py-0.5 bg-white border rounded font-mono text-[10px]">↓</kbd> و{" "}
              <kbd className="px-1 py-0.5 bg-white border rounded font-mono text-[10px]">Enter</kbd> انتخاب کنید
            </span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Box className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <span>کالایی با این مشخصات یافت نشد.</span>
                <div className="mt-3 flex justify-center gap-2">
                  {onAddBlankRow && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddBlankRow();
                        setIsOpen(false);
                      }}
                      className="text-xs text-indigo-600 hover:underline font-bold"
                    >
                      افزودن به عنوان سطر آزاد دلخواه
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredProducts.map((prod, idx) => {
                const isSelected = idx === selectedIndex;
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
                    onClick={() => handleSelectProduct(prod)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                      isSelected ? themeClasses.selected : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                          prod.type === "service"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {prod.type === "service" ? "خدمت" : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-slate-800 truncate">
                          {prod.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap font-mono">
                          {prod.code && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600 font-bold">
                              کد: {toPersianDigits(prod.code)}
                            </span>
                          )}
                          {prod.barcode && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600">
                              بارکد: {prod.barcode}
                            </span>
                          )}
                          {prod.category && (
                            <span className="text-slate-500 font-sans text-[11px]">
                              {prod.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-left" dir="ltr">
                      {prod.type !== "service" && (
                        <div className="text-right" dir="rtl">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              availableStock > 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            موجودی: {toPersianDigits(formatNumber(availableStock))} {prod.unit || "عدد"}
                          </span>
                        </div>
                      )}

                      <div className="text-left font-black text-sm text-slate-800">
                        {formatCurrency(price)}{" "}
                        <span className="text-[10px] text-slate-400 font-normal">
                          {invoiceCurrency}
                        </span>
                      </div>

                      <div
                        className={`p-1.5 rounded-lg text-xs font-black flex items-center justify-center ${
                          isSelected ? themeClasses.btnPrimary : "bg-slate-100 text-slate-600"
                        }`}
                        title="افزودن سریع (Enter)"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
