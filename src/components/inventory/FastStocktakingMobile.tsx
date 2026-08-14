import React, { useState, useEffect, useRef } from "react";
import { 
  Package, Plus, Search, CheckCircle, Save, AlertCircle, X, Check, Box, ChevronRight
} from "lucide-react";
import { getProductCategories, getStocktakings, 
  updateStocktaking, 
  getProducts, 
  getWarehouseStocks, 
  addProduct 
} from "../../services/dataService";
import { Stocktaking, StocktakingItem, Product, WarehouseStock } from "../../types";

export default function FastStocktakingMobile({ showNotification }: any) {
  const [stocktakingCode, setStocktakingCode] = useState(() => {
    const hash = window.location.hash;
    const match = hash.match(/id=([^&]+)/);
    return match ? match[1] : "";
  });
  const [session, setSession] = useState<Stocktaking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<WarehouseStock[]>([]);

  // Search & Select
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [countedQty, setCountedQty] = useState("");

  // New Product
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [newProductCategoryId, setNewProductCategoryId] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("عدد");

  const [newProductName, setNewProductName] = useState("");
  const [newProductCode, setNewProductCode] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // initial fetch products
    const loadInit = async () => {
      try {
        const p = await getProducts();
        const cats = await getProductCategories();
        setCategories(cats);
        setProducts(p.filter((pr: any) => pr.type === "product" || !pr.type));
      } catch (err) {}
      if (stocktakingCode) {
         joinSession(stocktakingCode);
      }
    };
    loadInit();
  }, []);

  const joinSession = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const all = await getStocktakings();
      const st = all.find(s => String(s.id) === code.trim());
      if (!st) {
        setError("انبارگردانی با این کد یافت نشد.");
      } else if (st.status === 'confirmed' || st.status === 'applied') {
        setError("این انبارگردانی تایید نهایی شده و بسته شده است.");
      } else {
        const wStocks = await getWarehouseStocks();
        setStocks(wStocks);
        setSession(st);
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
    }
    setLoading(false);
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await joinSession(stocktakingCode);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;
    setLoading(true);
    try {
      const newP = await addProduct({
        name: newProductName,
        code: newProductCode,
        type: "product",
        isActive: true,
        unit: newProductUnit,
        categoryId: newProductCategoryId,
      });
      setProducts(prev => [newP, ...prev]);
      setSelectedProduct(newP);
      setIsCreatingProduct(false);
      setNewProductName("");
      setNewProductCode("");
      setNewProductCategoryId("");
      setNewProductUnit("عدد");
      setTimeout(() => {
         document.getElementById('countedQtyInput')?.focus();
      }, 100);
    } catch (err) {
      setError("خطا در ایجاد کالا");
    }
    setLoading(false);
  };

  const handleSaveCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !session || !countedQty) return;
    const qty = parseFloat(countedQty);
    if (isNaN(qty) || qty < 0) {
      showNotification('تعداد نامعتبر است', 'error');
      return;
    }

    setLoading(true);
    try {
      const updatedItems = [...(session.items || [])];
      const existingIdx = updatedItems.findIndex(i => String(i.productId) === String(selectedProduct.id));
      
      const stockEntry = stocks.find(s => String(s.productId) === String(selectedProduct.id) && String(s.warehouseId) === String(session.warehouseId));
      const expected = stockEntry ? stockEntry.availableStock : 0;

      if (existingIdx !== -1) {
        updatedItems[existingIdx].countedStock = qty;
        updatedItems[existingIdx].difference = qty - updatedItems[existingIdx].expectedStock;
      } else {
        updatedItems.unshift({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          expectedStock: expected,
          countedStock: qty,
          difference: qty - expected,
        });
      }

      const updatedSession = { ...session, items: updatedItems };
      if (updatedSession.status === 'pending') {
          updatedSession.status = 'in_progress';
      }
      
      await updateStocktaking(session.id, updatedSession);
      setSession(updatedSession);
      
      // Reset for next
      setSelectedProduct(null);
      setCountedQty("");
      setSearchQuery("");
      if (searchInputRef.current) searchInputRef.current.focus();

    } catch (err) {
      showNotification('خطا در ذخیره اطلاعات', 'error');
    }
    setLoading(false);
  };

  const filteredProducts = searchQuery
    ? products.filter(p => 
        (p.name && p.name.includes(searchQuery)) || 
        (p.code && p.code.includes(searchQuery))
      )
    : [];

  const handleExit = () => {
     window.location.hash = "";
     window.location.reload();
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
             <Package className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">انبارگردانی سریع</h1>
          <p className="text-sm text-gray-500 text-center mb-8">
            کد جلسه انبارگردانی خود را برای شروع شمارش وارد کنید.
          </p>
          
          <form onSubmit={handleJoinSession} className="w-full space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">کد انبارگردانی</label>
              <input 
                type="text" 
                value={stocktakingCode}
                onChange={e => setStocktakingCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 bg-gray-50 font-mono text-center text-lg"
                placeholder="مثلا: 12345"
                required
              />
            </div>
            {error && (
              <div className="text-sm text-rose-500 bg-rose-50 p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <button 
              type="submit"
              disabled={loading || !stocktakingCode.trim()}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-md shadow-indigo-200"
            >
              {loading ? "در حال بررسی..." : "ورود به جلسه"}
            </button>
          </form>
          <button onClick={handleExit} type="button" className="mt-4 text-sm text-gray-400 font-medium">بازگشت به برنامه</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex-1 w-full">
          <div className="flex justify-between items-center w-full mb-1">
            <h1 className="font-black text-gray-800 text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              در حال شمارش
            </h1>
            <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-lg">
              کد: {session.id}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1.5 w-full">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
               <div 
                 className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                 style={{ width: `${products.length > 0 ? Math.min(100, Math.round(((session.items?.filter((i: any) => i.countedStock !== null).length || 0) / products.length) * 100)) : 0}%` }}
               ></div>
            </div>
            <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
               {session.items?.filter((i: any) => i.countedStock !== null).length || 0} از {products.length}
            </span>
          </div>
        </div>
        <button onClick={() => setSession(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl">
           <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        
        {isCreatingProduct ? (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-500" /> تعریف کالا
                </h3>
                <button type="button" onClick={() => setIsCreatingProduct(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleCreateProduct} className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">نام کالا</label>
                  <input autoFocus type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500" required />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">کد کالا / بارکد (اختیاری)</label>
                  <input type="text" value={newProductCode} onChange={e => setNewProductCode(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-mono" dir="ltr" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">دسته‌بندی (گروه کالا)</label>
                  <select value={newProductCategoryId} onChange={e => setNewProductCategoryId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500">
                    <option value="">بدون دسته‌بندی</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">واحد اندازه‌گیری</label>
                  <input type="text" value={newProductUnit} onChange={e => setNewProductUnit(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500" placeholder="مثال: عدد، کیلوگرم، متر" />
               </div>
               <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                 <Save className="w-4 h-4" /> ذخیره و انتخاب
               </button>
             </form>
          </div>
        ) : !selectedProduct ? (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200 flex-1 flex flex-col">
            <div className="relative mb-4">
              <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-indigo-500 transition-colors text-base"
                placeholder="جستجوی نام یا بارکد کالا..."
              />
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-[50vh]">
               {searchQuery && filteredProducts.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Box className="w-12 h-12 text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium mb-4">کالایی یافت نشد.</p>
                    <button 
                      onClick={() => { setIsCreatingProduct(true); setNewProductName(searchQuery); }}
                      className="px-5 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> تعریف کالای جدید
                    </button>
                 </div>
               ) : (
                 <div className="space-y-2 pb-4">
                    {searchQuery && filteredProducts.slice(0, 20).map((p, idx) => {
                       const countInfo = session.items?.find(i => String(i.productId) === String(p.id));
                       return (
                         <button 
                           key={p.id || `fsm-p-${idx}`}
                           onClick={() => setSelectedProduct(p)}
                           className="w-full flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-right"
                         >
                            <div>
                               <div className="font-bold text-gray-800 text-sm">{p.name}</div>
                               {p.code && <div className="text-xs text-gray-400 font-mono mt-0.5">{p.code}</div>}
                            </div>
                            <div className="flex items-center gap-3">
                              {countInfo && countInfo.countedStock !== null && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-1 rounded-md font-bold">
                                  شمارش شده: {countInfo.countedStock}
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-gray-300" />
                            </div>
                         </button>
                       )
                    })}
                    {!searchQuery && (
                       <div className="text-center py-10 text-gray-400 text-sm flex flex-col items-center">
                          <Search className="w-8 h-8 text-gray-200 mb-2" />
                          برای یافتن کالا جستجو کنید
                       </div>
                    )}
                 </div>
               )}
            </div>
            {!searchQuery && (
              <button 
                onClick={() => setIsCreatingProduct(true)}
                className="mt-auto w-full py-3 bg-gray-50 border border-gray-200 text-gray-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100"
              >
                <Plus className="w-5 h-5" /> کالایی پیدا نکردید؟ تعریف کنید
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200">
             <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black text-gray-800 text-lg">{selectedProduct.name}</h3>
                  {selectedProduct.code && <p className="text-sm font-mono text-gray-400">{selectedProduct.code}</p>}
                </div>
                <button type="button" onClick={() => setSelectedProduct(null)} className="text-gray-400 p-2 bg-gray-50 rounded-xl"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleSaveCount} className="space-y-6">
                <div>
                   <label className="block text-center text-sm font-bold text-gray-600 mb-3">تعداد شمارش شده را وارد کنید</label>
                   <input 
                     id="countedQtyInput"
                     autoFocus
                     type="number" 
                     inputMode="decimal"
                     value={countedQty} 
                     onChange={e => setCountedQty(e.target.value)} 
                     className="w-full text-center text-3xl font-black px-4 py-5 rounded-3xl border-2 border-indigo-100 bg-indigo-50/30 focus:bg-white focus:border-indigo-500 transition-colors" 
                     placeholder="0"
                     required 
                   />
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-black rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-emerald-200">
                  <Check className="w-6 h-6" /> {loading ? "..." : "ثبت شمارش"}
                </button>
             </form>
          </div>
        )}

      </main>
    </div>
  );
}
