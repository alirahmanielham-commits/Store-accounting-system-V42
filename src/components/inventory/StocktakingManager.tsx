import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, ClipboardList, PenTool, CheckCircle, Search, Save, AlertCircle, RefreshCcw, Handshake, Trash2, X } from 'lucide-react';
import { getStocktakings, addStocktaking, updateStocktaking, deleteStocktaking, getProducts, getWarehouses, getWarehouseStocks } from '../../services/dataService';
import DatePickerModule, { Calendar as RMCalendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { Stocktaking, StocktakingItem, Product, Warehouse, WarehouseStock } from '../../types';
import FastProductCreateModal from '../products/FastProductCreateModal';
import CustomDatePicker from "../ui/CustomDatePicker";
const DatePicker = CustomDatePicker;

interface Props {
  showNotification?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  currentUser?: string;
  onNavigateToDocs?: () => void;
}

export default function StocktakingManager({ showNotification, currentUser = 'سیستم', onNavigateToDocs }: Props) {
  const [stocktakings, setStocktakings] = useState<Stocktaking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stocks, setStocks] = useState<WarehouseStock[]>([]);
  const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [currentId, setCurrentId] = useState<string | number>('');
  const [warehouseId, setWarehouseId] = useState<string | number>('');
  const [date, setDate] = useState(new Date().toLocaleDateString('fa-IR'));
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<StocktakingItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fast Search State
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [sts, prods, whs, whStocks] = await Promise.all([
        getStocktakings(),
        getProducts(),
        getWarehouses(),
        getWarehouseStocks()
      ]);
      setStocktakings(sts);
      setProducts(prods);
      setWarehouses(whs);
      setStocks(whStocks);
    } catch (e) {
      if (showNotification) showNotification('خطا در بارگذاری اطلاعات!', 'error');
    }
    setIsLoading(false);
  };

  const handleCreateNew = () => {
    setWarehouseId('');
    setDate(new Date().toLocaleDateString('fa-IR'));
    setDescription('');
    setItems([]);
    setCurrentId('');
    setProductSearch('');
    setSearchTerm('');
    setViewState('create');
  };

  const handleStartCountingAll = () => {
    if (!warehouseId) {
      if (showNotification) showNotification('لطفا انبار را انتخاب کنید', 'error');
      return;
    }
    const newItems: StocktakingItem[] = (products || []).filter(p => p.type === 'product' || !p.type).map(p => {
      const stockEntry = stocks.find(s => s.productId?.toString() === p.id?.toString() && s.warehouseId?.toString() === warehouseId.toString());
      const expected = stockEntry ? stockEntry.availableStock : 0;
      return {
        productId: p.id,
        productName: p.name,
        expectedStock: expected,
        countedStock: null,
        difference: 0,
        costValue: 0
      };
    });
    setItems(newItems);
  };

  const handleAddProductToCounting = (product: Product) => {
    if (!warehouseId) {
      if (showNotification) showNotification('لطفا انبار را انتخاب کنید', 'error');
      return;
    }
    
    setProductSearch('');
    setShowProductDropdown(false);

    const exists = items.findIndex(it => it.productId === product.id);
    if (exists > -1) {
      // Highlight existing
      const row = document.getElementById(`item-row-${product.id}`);
      if (row && tableRef.current) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('bg-indigo-50');
        setTimeout(() => row.classList.remove('bg-indigo-50'), 2000);
        const input = row.querySelector('input');
        if (input) input.focus();
      }
      return;
    }

    const stockEntry = stocks.find(s => s.productId?.toString() === product.id?.toString() && s.warehouseId?.toString() === warehouseId.toString());
    const expected = stockEntry ? stockEntry.availableStock : 0;
    
    const newItem: StocktakingItem = {
      productId: product.id,
      productName: product.name,
      expectedStock: expected,
      countedStock: null,
      difference: 0,
      costValue: 0
    };

    setItems([newItem, ...items]);
    
    // Focus the new row's input after render
    setTimeout(() => {
      const row = document.getElementById(`item-row-${product.id}`);
      if (row) {
        const input = row.querySelector('input');
        if (input) input.focus();
      }
    }, 100);
  };

  const handleRemoveItem = (productId: string | number) => {
    setItems((items || []).filter(it => it.productId !== productId));
  };

  const handleViewOrEdit = (st: Stocktaking) => {
    setCurrentId(st.id);
    setWarehouseId(st.warehouseId);
    setDate(st.date);
    setDescription(st.description || '');
    setItems(st.items);
    setViewState('edit');
  };

  const handleSaveDraft = async () => {
    if (!warehouseId) {
      if (showNotification) showNotification('انبار باید انتخاب شود', 'error');
      return;
    }
    
    let totalDeficit = 0;
    let totalSurplus = 0;
    items.forEach(it => {
        const p = products.find(prod => prod.id === it.productId);
        const cost = p?.purchasePrice || p?.price || 0;
        const cValue = it.difference * cost;
        it.costValue = cValue;
        if (cValue < 0) totalDeficit += Math.abs(cValue);
        if (cValue > 0) totalSurplus += cValue;
    });

    const payload: Omit<Stocktaking, 'id'> = {
      date,
      warehouseId,
      status: 'in_progress',
      items,
      description,
      createdBy: currentUser,
      totalDeficitValue: totalDeficit,
      totalSurplusValue: totalSurplus
    };

    try {
      if (viewState === 'create') {
        const added = await addStocktaking(payload as any);
        setStocktakings([...stocktakings, added]);
        if (showNotification) showNotification('انبارگردانی با موفقیت ذخیره شد', 'success');
        setViewState('list');
      } else {
        const updated = await updateStocktaking(currentId, { ...payload, id: currentId, status: stocktakings.find(s => s.id === currentId)?.status || 'in_progress' });
        setStocktakings(stocktakings.map(s => s.id === currentId ? updated : s));
        if (showNotification) showNotification('انبارگردانی با موفقیت بروزرسانی شد', 'success');
        setViewState('list');
      }
    } catch {
      if (showNotification) showNotification('خطا در ذخیره اطلاعات', 'error');
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('آیا از حذف این انبارگردانی مطمئن هستید؟')) return;
    await deleteStocktaking(id);
    setStocktakings(stocktakings.filter(s => s.id !== id));
    if (showNotification) showNotification('با موفقیت حذف شد', 'success');
  };

  const toPersianDigits = (str: string | number) => str?.toString().replace(/\d/g, x => ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'][parseInt(x)]);

  const filteredItems = (items || []).filter(it => (it.productName || '').includes(searchTerm || '') || (products.find(p => p.id === it.productId)?.code || '').includes(searchTerm || ''));

  const whMap = warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w.name }), {} as Record<string, string>);

  if (isLoading) return <div className="flex justify-center p-20"><RefreshCcw className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
         <div>
           <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
             <ClipboardList className="w-6 h-6 text-indigo-600" /> 
             ماژول انبارگردانی
           </h1>
           <p className="text-sm text-slate-500 mt-1">مدیریت موجودی واقعی انبار، مغایرت‌گیری و صدور حواله/رسید اصلاحی</p>
         </div>
         {viewState === 'list' && (
           <button onClick={handleCreateNew} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-100">
             <Plus className="w-5 h-5" /> شروع انبارگردانی جدید
           </button>
         )}
         {viewState !== 'list' && (
           <button onClick={() => setViewState('list')} className="px-6 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold flex items-center gap-2 transition-all">
             بازگشت به لیست
           </button>
         )}
      </div>

      {viewState === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {stocktakings.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400">
              <ClipboardList className="w-16 h-16 mb-4 text-slate-200" />
              <p className="font-bold text-lg text-slate-500">هیچ سابقه انبارگردانی ثبت نشده است.</p>
              <button onClick={handleCreateNew} className="mt-4 px-6 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition-colors">ثبت اولین انبارگردانی</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right" dir="rtl">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-sm">
                  <tr>
                    <th className="p-4">تاریخ</th>
                    <th className="p-4">انبار</th>
                    <th className="p-4">شرح</th>
                    <th className="p-4">تعداد کالاها</th>
                    <th className="p-4">ارزش کسری مغایرت</th>
                    <th className="p-4">وضعیت</th>
                    <th className="p-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stocktakings.map(st => (
                    <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-800">{st.date}</td>
                      <td className="p-4 font-bold text-indigo-700">{whMap[st.warehouseId] || 'نامشخص'}</td>
                      <td className="p-4 text-sm text-slate-600 truncate max-w-[200px]">{st.description || '-'}</td>
                      <td className="p-4 font-bold text-slate-700">{toPersianDigits((st.items || []).length)} ردیف</td>
                      <td className="p-4 font-mono text-rose-600 font-bold">{st.totalDeficitValue ? toPersianDigits(st.totalDeficitValue.toLocaleString()) : '۰'} تومان</td>
                      <td className="p-4">
                        {st.status === 'in_progress' ? <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">در حال شمارش</span> : 
                         st.status === 'applied' ? <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">اعمال شده</span> : 
                         <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">{st.status}</span>}
                      </td>
                      <td className="p-4 text-center">
                         {st.status !== 'applied' && (
                           <div className="flex flex-col items-center gap-1">
                             <a href={`#fast-stocktaking?id=${st.id}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1 whitespace-nowrap">باز کردن در موبایل</a>
                             <span className="text-[10px] text-slate-400 font-mono">کد: {st.id}</span>
                           </div>
                         )}
                      </td>
                      <td className="p-4 flex items-center justify-center gap-2">
                        <button onClick={() => handleViewOrEdit(st)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="مشاهده / ویرایش / اعمال">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(st.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50" disabled={st.status === 'applied'}>
                          <AlertCircle className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">انتخاب انبار <span className="text-rose-500">*</span></label>
                   <select 
                     value={warehouseId} 
                     onChange={e => setWarehouseId(e.target.value)}
                     disabled={(items || []).length > 0}
                     className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-bold"
                   >
                     <option value="">-- یک انبار انتخاب کنید --</option>
                     {(warehouses || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ انبارگردانی</label>
                   <DatePicker
                      value={date}
                      onChange={(d: any) => setDate(d?.format() || new Date().toLocaleDateString('fa-IR'))}
                      calendar={persian}
                      locale={persian_fa}
                      calendarPosition="bottom-right"
                      inputClass="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none font-bold text-left font-mono"
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">توضیحات (اختیاری)</label>
                   <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none" placeholder="یادداشت..." />
                </div>
             </div>

             {(items || []).length === 0 ? (
               <div className="mt-8 flex flex-col md:flex-row items-center justify-end gap-4 border-t pt-6">
                 <div className="relative w-full md:w-96" ref={tableRef}>
                    <div className="relative">
                      <Search className="w-5 h-5 absolute right-3 top-3.5 text-slate-400" />
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && productSearch.trim()) {
                                const matched = (products || []).filter(p => (p.type === 'product' || !p.type) && (p.name.includes(productSearch) || p.code?.includes(productSearch) || p.barcode?.includes(productSearch)));
                                if (matched.length > 0) {
                                  handleAddProductToCounting(matched[0]);
                                }
                              }
                            }}

                        placeholder="جستجوی سریع کالا / اسکن بارکد ..." 
                        className="w-full py-3 pr-10 pl-4 bg-white border-2 border-indigo-100 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 font-bold transition-all shadow-sm"
                        disabled={!warehouseId}
                      />
                    </div>
                    {showProductDropdown && productSearch && warehouseId && (
                      <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-50">
                        {(products || []).filter(p => (p.type === 'product' || !p.type) && (p.name.includes(productSearch) || p.code?.includes(productSearch) || p.barcode?.includes(productSearch))).length > 0 ? (
                          (products || []).filter(p => (p.type === 'product' || !p.type) && (p.name.includes(productSearch) || p.code?.includes(productSearch) || p.barcode?.includes(productSearch))).map((p, pIdx) => (
                            <button 
                              key={p.id || pIdx}
                              onClick={() => handleAddProductToCounting(p)}
                              className="w-full text-right p-3 hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                                <span className="text-xs text-slate-500 font-mono mt-0.5">{p.code || p.barcode || 'بدون کد'}</span>
                              </div>
                              <Plus className="w-4 h-4 text-indigo-500" />
                            </button>
                          ))
                        ) : (
                          
                              <div className="p-4 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                                کالایی یافت نشد
                                <button onClick={() => setIsProductModalOpen(true)} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                                  + افزودن کالای جدید
                                </button>
                              </div>

                        )}
                      </div>
                    )}
                 </div>
                 <div className="w-full md:w-auto text-center text-slate-400 font-bold text-sm">یا</div>
                 <button onClick={handleStartCountingAll} disabled={!warehouseId} className="w-full md:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                   <Package className="w-5 h-5" /> فراخوانی تمام کالاها
                 </button>
               </div>
             ) : (
               <div className="mt-8 space-y-4">
                 <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
                   <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><PenTool className="w-5 h-5 text-amber-500" /> ثبت شمارش موجودی</h3>
                   
                   <div className="flex flex-col md:flex-row gap-4 items-center flex-1 justify-end">
                     <div className="relative w-full md:w-80" ref={tableRef}>
                        <div className="relative">
                          <Plus className="w-5 h-5 absolute right-3 top-2.5 text-indigo-500" />
                          <input 
                            ref={searchInputRef}
                            type="text" 
                            value={productSearch}
                            onChange={(e) => {
                              setProductSearch(e.target.value);
                              setShowProductDropdown(true);
                            }}
                            onFocus={() => setShowProductDropdown(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && productSearch.trim()) {
                                const matched = (products || []).filter(p => (p.type === 'product' || !p.type) && (p.name.includes(productSearch) || p.code?.includes(productSearch) || p.barcode?.includes(productSearch)));
                                if (matched.length > 0) {
                                  handleAddProductToCounting(matched[0]);
                                }
                              }
                            }}

                            placeholder="افزودن کالای جدید (اسکن/جستجو)..." 
                            className="w-full py-2 pr-10 pl-4 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none focus:border-indigo-400 focus:bg-white text-sm font-bold transition-all placeholder-indigo-300"
                          />
                        </div>
                        {showProductDropdown && productSearch && (
                          <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto z-50">
                            {(products || []).filter(p => (p.type === 'product' || !p.type) && (p.name.includes(productSearch) || p.code?.includes(productSearch) || p.barcode?.includes(productSearch))).length > 0 ? (
                              (products || []).filter(p => (p.type === 'product' || !p.type) && (p.name.includes(productSearch) || p.code?.includes(productSearch) || p.barcode?.includes(productSearch))).map((p, pIdx) => (
                                <button 
                                  key={p.id || pIdx}
                                  onClick={() => handleAddProductToCounting(p)}
                                  className="w-full text-right p-3 hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                                    <span className="text-xs text-slate-500 font-mono mt-0.5">{p.code || p.barcode || 'بدون کد'}</span>
                                  </div>
                                  <Plus className="w-4 h-4 text-indigo-500" />
                                </button>
                              ))
                            ) : (
                              
                              <div className="p-4 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                                کالایی یافت نشد
                                <button onClick={() => setIsProductModalOpen(true)} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                                  + افزودن کالای جدید
                                </button>
                              </div>

                            )}
                          </div>
                        )}
                     </div>

                     <div className="relative w-full md:w-64">
                       <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                       <input type="text" placeholder="فیلتر در اقلام لیست..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full py-2 pr-9 pl-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-sm" />
                     </div>
                   </div>
                 </div>
                 
                 <div className="max-h-[500px] overflow-y-auto border border-slate-100 rounded-xl">
                   <table className="w-full text-right" dir="rtl">
                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-bold sticky top-0 z-10">
                       <tr>
                         <th className="p-4 w-12 text-center">#</th>
                         <th className="p-4">جستجو / کد</th>
                         <th className="p-4">نام کالا</th>
                         <th className="p-4 text-center">موجودی فعلی (سیستم)</th>
                         <th className="p-4 w-48 text-center bg-indigo-50/50 text-indigo-800">تعداد شمارش شده</th>
                         <th className="p-4 text-center">مغایرت</th>
                         <th className="p-4 w-12 text-center">حذف</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {filteredItems.map((it, idx) => {
                         const p = products.find(prod => prod.id === it.productId);
                         return (
                           <tr key={`${it.productId}-${idx}`} id={`item-row-${it.productId}`} className="hover:bg-slate-50/30 transition-colors">
                             <td className="p-4 text-center text-slate-400 font-mono text-sm">{idx + 1}</td>
                             <td className="p-4 font-mono text-sm text-slate-500">{p?.code || p?.barcode || '-'}</td>
                             <td className="p-4 font-bold text-slate-800">{it.productName}</td>
                             <td className="p-4 text-center font-mono font-bold text-slate-600 bg-slate-50/50">{it.expectedStock} {p?.unit}</td>
                             <td className="p-3 bg-indigo-50/30">
                               <input 
                                 type="number" 
                                 min="0"
                                 value={it.countedStock !== null ? it.countedStock : ''}
                                 onChange={(e) => {
                                   const val = e.target.value === '' ? null : Number(e.target.value);
                                   const newItems = [...items];
                                   const targetIdx = newItems.findIndex(x => x.productId === it.productId);
                                   if (targetIdx > -1) {
                                     newItems[targetIdx].countedStock = val;
                                     newItems[targetIdx].difference = val !== null ? val - newItems[targetIdx].expectedStock : 0;
                                     setItems(newItems);
                                   }
                                 }}
                                 placeholder="شماره/مقدار؟"
                                 className="w-full p-2 border border-indigo-200 text-center font-mono font-bold text-lg text-indigo-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder-indigo-200 shadow-inner bg-white"
                               />
                             </td>
                             <td className="p-4 text-center font-mono font-bold">
                               {it.countedStock === null ? <span className="text-slate-300">-</span> : 
                                it.difference === 0 ? <span className="text-slate-400">بدون مغایرت</span> : 
                                it.difference > 0 ? <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">+{it.difference} (اضافی)</span> : 
                                <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-md">{it.difference} (کسری)</span>}
                             </td>
                             <td className="p-4 text-center">
                                <button onClick={() => handleRemoveItem(it.productId)} className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                             </td>
                           </tr>
                         )
                       })}
                     </tbody>
                   </table>
                 </div>

                 
                 <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-6">
                    <div className="flex flex-col md:flex-row gap-6 w-full lg:w-auto flex-1">
                      <div className="flex gap-6">
                        <div className="text-sm">
                          <span className="text-slate-500 block mb-1">اقلام شمرده شده</span>
                          <span className="font-bold text-slate-800">
                            {toPersianDigits((items || []).filter(i => i.countedStock !== null).length)} از {toPersianDigits((products || []).filter(p => p.type === 'product' || !p.type).length)} کل کالاها
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-slate-500 block mb-1">دارای مغایرت</span>
                          <span className="font-bold text-rose-600">
                            {toPersianDigits((items || []).filter(i => i.countedStock !== null && i.difference !== 0).length)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-1 w-full max-w-sm self-center">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="font-bold text-slate-600">پیشرفت کل انبارگردانی</span>
                          <span className="font-bold text-indigo-600">
                            {toPersianDigits(
                              (products || []).filter(p => p.type === 'product' || !p.type).length > 0 
                              ? Math.min(100, Math.round(((items || []).filter(i => i.countedStock !== null).length / (products || []).filter(p => p.type === 'product' || !p.type).length) * 100))
                              : 0
                            )}٪
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                            style={{ 
                              width: `${(products || []).filter(p => p.type === 'product' || !p.type).length > 0 ? Math.min(100, Math.round(((items || []).filter(i => i.countedStock !== null).length / (products || []).filter(p => p.type === 'product' || !p.type).length) * 100)) : 0}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 w-full lg:w-auto justify-end">

                       <button onClick={handleSaveDraft} className="px-6 py-2.5 bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 hover:text-indigo-700 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-indigo-100">
                         <Save className="w-5 h-5" /> ذخیره موقت انبارگردانی
                       </button>

                       {/* For demo, we just instruct the user if they want to apply. In a full system, hitting 'Apply' would generate inventory docs. */}
                       {stocktakings.find(s => s.id === currentId)?.status !== 'applied' && (
                         <button 
                           onClick={() => {
                             if(showNotification) showNotification('برای تسویه موجودی، اسناد رسید/حواله انبار ثبت کنید.', 'info');
                             if(onNavigateToDocs) onNavigateToDocs();
                           }} 
                           className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
                         >
                           <Handshake className="w-5 h-5" /> گزارش مغایرت و تنظیم اسناد
                         </button>
                       )}
                    </div>
                 </div>

               </div>
             )}
          </div>
        </div>
      )}
    
      {isProductModalOpen && (
        <FastProductCreateModal
          onClose={() => setIsProductModalOpen(false)}
          isOpen={true}
          onSave={async (newProduct) => {
             
             getProducts().then((prods) => {
                 setProducts(prods.filter((pr) => pr.type === 'product' || !pr.type));
                 setIsProductModalOpen(false);
                 setProductSearch('');
                 handleAddProductToCounting(newProduct);
             });
             return true;
          }}
        />
      )}
</div>
  );
}
