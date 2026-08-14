import React, { useState, useMemo, useEffect } from "react";
import { Product } from "../../types";
import { Plus, Trash2, ShoppingCart, Search, Filter, Printer, FileText, AlertCircle } from "lucide-react";

interface OrderListProps {
  products: Product[];
  categories: any[];
  formatCurrency: (val: number) => string;
  toPersianDigits: (val: string | number) => string;
}

export default function OrderList({
  products,
  categories,
  formatCurrency,
  toPersianDigits,
}: OrderListProps) {
  // Manual additions saved in localStorage
  const [manualItems, setManualItems] = useState<{ id: string; productId: string; qty: number; note: string }[]>([]);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("app_order_list_manual");
    if (saved) {
      try {
        setManualItems(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("app_order_list_manual", JSON.stringify(manualItems));
    }
  }, [manualItems, isClient]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newProductId, setNewProductId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newNote, setNewNote] = useState("");

  const handleAddManual = () => {
    if (!newProductId) return;
    const qtyNum = parseFloat(newQty) || 1;
    const newItem = {
      id: Date.now().toString(),
      productId: newProductId,
      qty: qtyNum,
      note: newNote,
    };
    setManualItems(prev => [...prev, newItem]);
    setNewProductId("");
    setNewQty("");
    setNewNote("");
  };

  const handleRemoveManual = (id: string) => {
    setManualItems(prev => prev.filter(item => item.id !== id));
  };

  // Compute final list
  const orderListItems = useMemo(() => {
    const items: { 
      source: 'auto' | 'manual'; 
      manualId?: string;
      product: Product; 
      qty: number; 
      note: string 
    }[] = [];

    // Auto items (reached reorder point)
    products.forEach(p => {
      const minStock = p.minStock || p.minStockLevel || 0;
      const currentStock = p.stock || 0;
      if (minStock > 0 && currentStock <= minStock) {
        // Needs ordering
        items.push({
          source: 'auto',
          product: p,
          qty: (minStock - currentStock) || 1, // Suggestion to reach minStock
          note: `موجودی فعلی: ${currentStock} (نقطه سفارش: ${minStock})`
        });
      }
    });

    // Manual items
    manualItems.forEach(mi => {
      const p = products.find(prod => prod.id === mi.productId || prod.id.toString() === mi.productId);
      if (p) {
        items.push({
          source: 'manual',
          manualId: mi.id,
          product: p,
          qty: mi.qty,
          note: mi.note || "اضافه شده دستی"
        });
      }
    });

    return items;
  }, [products, manualItems]);

  // Filter & Group
  const filteredAndGrouped = useMemo(() => {
    let filtered = orderListItems;
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.product.name.toLowerCase().includes(lowerQ));
    }
    if (selectedCategory !== "all") {
      filtered = filtered.filter(i => (i.product.categoryId?.toString() === selectedCategory) || (i.product.category === selectedCategory));
    }

    const grouped: Record<string, typeof filtered> = {};
    filtered.forEach(item => {
      const catName = categories?.find(c => c.id?.toString() === item.product.categoryId?.toString())?.name 
        || item.product.category 
        || "بدون دسته‌بندی";
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(item);
    });

    return grouped;
  }, [orderListItems, searchQuery, selectedCategory, categories]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col h-full overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-800">لیست سفارش خرید (نیازسنجی)</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              کالاهای به نقطه سفارش رسیده و اقلام دستی
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm"
        >
          <Printer className="w-4 h-4" />
          چاپ لیست
        </button>
      </div>

      <div className="p-4 sm:p-6 border-b border-slate-100 bg-white space-y-4">
        {/* Manual Add Form */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" />
            افزودن دستی کالا به لیست خرید
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-600 mb-1">انتخاب کالا</label>
              <select
                value={newProductId}
                onChange={(e) => setNewProductId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">-- انتخاب کنید --</option>
                {products.filter(p => p.type !== 'service' && p.isActive !== false).map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">تعداد/مقدار</label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-600 mb-1">توضیحات (اختیاری)</label>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="مثال: خرید فوری"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                onClick={handleAddManual}
                disabled={!newProductId}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                افزودن
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="جستجوی کالا در لیست..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="w-full sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">همه دسته‌بندی‌ها</option>
              {categories.map((c, i) => (
                <option key={c.id || i} value={c.id || c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/30">
        {Object.keys(filteredAndGrouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-base font-bold text-slate-500">لیست سفارش خالی است</p>
            <p className="text-sm mt-1">کالایی به نقطه سفارش نرسیده یا به صورت دستی افزوده نشده است.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(filteredAndGrouped).map(([categoryName, items]) => (
              <div key={categoryName} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    {categoryName}
                  </h3>
                  <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
                    {toPersianDigits(items.length)} قلم
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">
                            {item.product.name}
                          </span>
                          {item.source === 'auto' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                              <AlertCircle className="w-3 h-3" /> خودکار (نیازسنجی)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              دستی
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          {item.product.code && (
                            <span>کد: {item.product.code}</span>
                          )}
                          <span className="text-slate-400">|</span>
                          <span>{item.note}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <div className="text-sm font-black text-indigo-600">
                            {toPersianDigits(item.qty)} {item.product.unit || 'عدد'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            مقدار پیشنهادی
                          </div>
                        </div>
                        
                        {item.source === 'manual' && item.manualId && (
                          <button
                            onClick={() => handleRemoveManual(item.manualId!)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            title="حذف از لیست"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {item.source === 'auto' && (
                          <div className="w-8"></div> // spacer
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .custom-scrollbar {
            overflow: visible !important;
          }
          .bg-white.rounded-2xl.shadow-sm, .bg-white.rounded-2xl.shadow-sm * {
            visibility: visible;
          }
          .bg-white.rounded-2xl.shadow-sm {
            position: absolute;
            left: 0;
            top: 0;


            width: 100%;
            box-shadow: none;
            border: none;
          }
          .no-print, button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
