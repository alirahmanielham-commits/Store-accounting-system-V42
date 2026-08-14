import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Package, TrendingUp, TrendingDown, History, BarChart2 } from 'lucide-react';
import { Product, InvoiceItem, Warehouse } from '../../types';
import { getInvoices, getProductPriceHistory, getInventoryTransactions } from '../../services/dataService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { addCommas, toPersianDigits, formatDateDisplay, formatAmount } from '../../utils/format';

export default function ProductCardModal({ product, warehouses = [], currency = 'تومان', onClose, isModal = true, persons = [], storeSettings }: { product: Product, warehouses?: Warehouse[], currency?: string, onClose: () => void, isModal?: boolean, persons?: any[], storeSettings?: any }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculatedStock, setCalculatedStock] = useState<number>(0);
  const [stockPerWarehouse, setStockPerWarehouse] = useState<{ [key: string]: number }>({});
  const [activeTab, setActiveTab] = useState<'info' | 'sales' | 'purchases' | 'warehouse' | 'price_chart' | 'persons'>('info');
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [currentPurchasePrice, setCurrentPurchasePrice] = useState(product.purchasePrice || 0);
  const [currentSalePrice, setCurrentSalePrice] = useState(product.price || 0);
  const [lastSaleDate, setLastSaleDate] = useState<string>('');
  const [lastPurchaseDate, setLastPurchaseDate] = useState<string>('');
  
  const formatCur = (num) => toPersianDigits(formatAmount(Number(num) || 0, storeSettings));
  const formatNum = (num) => toPersianDigits(formatAmount(Number(num) || 0, storeSettings));

  useEffect(() => {
    const salePrices = priceHistory.filter((h: any) => h.type === 'sale').sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const purchasePrices = priceHistory.filter((h: any) => h.type === 'purchase').sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (salePrices.length > 0) {
      setCurrentSalePrice(salePrices[0].price);
      setLastSaleDate(salePrices[0].date);
    }
    if (purchasePrices.length > 0) {
      setCurrentPurchasePrice(purchasePrices[0].price);
      setLastPurchaseDate(purchasePrices[0].date);
    }
  }, [priceHistory]);

  useEffect(() => {
    
const fetchHistory = async () => {
       const invs = await getInvoices();
       const ph = await getProductPriceHistory(product.id.toString());
       setPriceHistory(ph.sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
       
       // Note: we can use getInventoryTransactions() but for compatibility with existing UI we will keep the current structure for other tabs, and inject the history tab.
       const trueHistory = await getInventoryTransactions(product.id.toString());

       const prodHistory: any[] = [];
       let totalStock = product.stock ? Number(product.stock) : 0;
       const defaultWhId = product.warehouseId?.toString() || 'unknown';
       const whStock: { [key: string]: number } = {};
       
       if (totalStock > 0 || totalStock < 0) {
           whStock[defaultWhId] = totalStock;
           prodHistory.push({
               type: 'opening_balance',
               date: '---', 
               invoiceNumber: '---',
               quantity: Math.abs(totalStock),
               isSecondaryUnit: false,
               unitPrice: product.purchasePrice || 0,
               personName: '---',
               warehouseId: defaultWhId
           });
       }

       invs.forEach(inv => {
          if (inv.status === 'voided' || inv.isDeleted || inv.status === 'draft' || inv.isDraft) return;
          if (inv.items) {
             const items = inv.items.filter((i: any) => i.productId?.toString() === product.id?.toString());
             items.forEach((item: any) => {
                let qty = Number(item.quantity) || 0;
                let uPrice = item.unitPrice;
                if (item.isSecondaryUnit && product.unitRatio && product.unitRatio > 0) {
                   qty = qty * product.unitRatio;
                   uPrice = Number((Number(uPrice) / product.unitRatio).toFixed(4));
                }
                prodHistory.push({
                   type: inv.type,
                   date: inv.jalaliDate || new Date(inv.date || inv.createdAt).toLocaleDateString("fa-IR"),
                   invoiceNumber: inv.invoiceNumber,
                   quantity: qty,
                   isSecondaryUnit: false,
                   unitPrice: uPrice,
                   personName: persons?.find((p: any) => p.id?.toString() === (inv.customerId || inv.personId)?.toString())?.name || inv.customerName || inv.personName || "---",
                   warehouseId: item.warehouseId || inv.warehouseId
                });
                
                const whId = (item.warehouseId || inv.warehouseId || product.warehouseId)?.toString() || 'unknown';

                if (!whStock[whId]) whStock[whId] = 0;

                if (inv.type === 'warehouse_receipt') {
                   totalStock += qty;
                   whStock[whId] += qty;
                } else if (inv.type === 'warehouse_remittance') {
                   totalStock -= qty;
                   whStock[whId] -= qty;
                }
             });
          }
       });

       // Now augment prodHistory with the true history from product_inventory_history table for the warehouse tab
       trueHistory.forEach((h: any) => {
          if (h.documentType === 'warehouse_receipt' || h.documentType === 'warehouse_remittance') {
             // Let's rely on trueHistory for the warehouse tab if needed.
             // Actually, the existing prodHistory is already structured for the UI. Let's just set the state.
          }
       });

       setCalculatedStock(totalStock);
       setStockPerWarehouse(whStock);
       setHistory(prodHistory.sort((a,b) => {
          const dateA = a.date !== '---' ? new Date(a.date).getTime() : 0;
          const dateB = b.date !== '---' ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
       }));
       setLoading(false);
    };
    fetchHistory();

  }, [product.id, product.warehouseId]);

  const { recentSalePriceChanges, recentPurchasePriceChanges } = useMemo(() => {
    const saleChanges: any[] = [];
    const purchaseChanges: any[] = [];
    for (const h of priceHistory) {
       const price = Number(h.price);
       if (h.type === 'sale') {
           if (saleChanges.length === 0 || Number(saleChanges[saleChanges.length - 1].price) !== price) {
              saleChanges.push(h);
           }
       } else if (h.type === 'purchase') {
           if (purchaseChanges.length === 0 || Number(purchaseChanges[purchaseChanges.length - 1].price) !== price) {
              purchaseChanges.push(h);
           }
       }
    }
    return { 
       recentSalePriceChanges: saleChanges.slice(0, 3), 
       recentPurchasePriceChanges: purchaseChanges.slice(0, 3) 
    };
  }, [priceHistory]);

   const chartData = useMemo(() => {
     return [...priceHistory].reverse().map((h: any) => ({
       ...h,
       salePrice: h.type === 'sale' ? Number(h.price) : null,
       purchasePrice: h.type === 'purchase' ? Number(h.price) : null,
       date: formatDateDisplay(h.date),
     }));
   }, [priceHistory]);

   const personStats = useMemo(() => {
      const stats: Record<string, Record<string, { in: number, out: number }>> = {};
      
      history.forEach(h => {
         if (h.type === 'opening_balance' || !h.personName || h.personName === '---') return;
         
         const pName = h.personName;
         const wId = h.warehouseId?.toString() || 'unknown';
         
         if (!stats[pName]) stats[pName] = {};
         if (!stats[pName][wId]) stats[pName][wId] = { in: 0, out: 0 };
         
         const qty = Number(h.quantity) || 0;
         
         if (h.type === 'purchase' || h.type === 'warehouse_receipt') {
            stats[pName][wId].in += qty;
         } else if (h.type === 'sale' || h.type === 'warehouse_remittance') {
            stats[pName][wId].out += qty;
         }
      });
      
      return stats;
   }, [history]);

   const content = (
      <motion.div initial={isModal ? { opacity: 0, scale: 0.95 } : { opacity: 0 }} animate={isModal ? { opacity: 1, scale: 1 } : { opacity: 1 }} exit={isModal ? { opacity: 0, scale: 0.95 } : undefined} className={`bg-white rounded-2xl w-full ${isModal ? 'max-w-4xl max-h-[90vh]' : 'h-full min-h-[500px] border border-gray-100'} overflow-hidden shadow-2xl flex flex-col`}>
         
         <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
               <Package className="w-5 h-5 text-indigo-500" />
               کارت کالا: {product.name}
            </h3>
            {isModal ? (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors">
                 <X className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={onClose} className="text-gray-600 font-bold hover:bg-gray-200 bg-gray-100 px-4 py-2 text-sm rounded-xl transition-colors">
                 تغییر کالا
              </button>
            )}
         </div>

         <div className="border-b border-gray-100 px-6 pt-4 flex gap-6 bg-white overflow-x-auto">
            <button
               onClick={() => setActiveTab('info')}
               className={`pb-3 font-bold text-sm whitespace-nowrap transition-colors relative ${activeTab === 'info' ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
            >
               مشخصات و موجودی
               {activeTab === 'info' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>}
            </button>
            <button
               onClick={() => setActiveTab('sales')}
               className={`pb-3 font-bold text-sm whitespace-nowrap transition-colors relative ${activeTab === 'sales' ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
            >
               فاکتورهای فروش
               {activeTab === 'sales' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>}
            </button>
            <button
               onClick={() => setActiveTab('purchases')}
               className={`pb-3 font-bold text-sm whitespace-nowrap transition-colors relative ${activeTab === 'purchases' ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
            >
               فاکتورهای خرید
               {activeTab === 'purchases' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>}
            </button>
            <button
               onClick={() => setActiveTab('warehouse')}
               className={`pb-3 font-bold text-sm whitespace-nowrap transition-colors relative ${activeTab === 'warehouse' ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
            >
               گردش انبار (رسید و حواله)
               {activeTab === 'warehouse' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>}
            </button>
            <button
               onClick={() => setActiveTab('persons')}
               className={`pb-3 font-bold text-sm whitespace-nowrap transition-colors relative ${activeTab === 'persons' ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
            >
               مشتریان و تامین‌کنندگان
               {activeTab === 'persons' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>}
            </button>
            <button
               onClick={() => setActiveTab('price_chart')}
               className={`pb-3 font-bold text-sm whitespace-nowrap transition-colors relative ${activeTab === 'price_chart' ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
            >
               نمودار قیمت
               {activeTab === 'price_chart' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>}
            </button>
         </div>

         <div className="p-6 overflow-y-auto flex-1 bg-white">
            {activeTab === 'info' && (
              <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                   <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex flex-col justify-center">
                     <span className="text-xs text-indigo-600 font-bold block mb-1">کد کالا</span>
                     <span className="text-lg font-mono font-black text-gray-800">{product.code || '---'}</span>
                   </div>
                   <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex flex-col justify-center">
                     <span className="text-xs text-emerald-600 font-bold block mb-1">قیمت فروش فعلی</span>
                     <span className="text-lg font-sans font-black text-gray-800">{Number(currentSalePrice).toLocaleString()} <span className="text-xs font-normal">{currency}</span></span>
                     {lastSaleDate && <span className="text-[10px] text-emerald-700 mt-1">آخرین تغییر: {formatDateDisplay(lastSaleDate)}</span>}
                   </div>
                   <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl flex flex-col justify-center">
                     <span className="text-xs text-rose-600 font-bold block mb-1">قیمت خرید فعلی</span>
                     <span className="text-lg font-sans font-black text-gray-800">{Number(currentPurchasePrice).toLocaleString()} <span className="text-xs font-normal">{currency}</span></span>
                     {lastPurchaseDate && <span className="text-[10px] text-rose-700 mt-1">آخرین تغییر: {formatDateDisplay(lastPurchaseDate)}</span>}
                   </div>
                   <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex flex-col justify-center relative overflow-hidden">
                     <span className="text-xs text-amber-600 font-bold block mb-1 z-10 relative">موجودی مستند (محاسباتی)</span>
                     <span className="text-xl font-sans font-black text-gray-800 z-10 relative" dir="ltr">
                        <span className="text-xs font-normal ml-1">{product.unit || 'عدد'}</span> {loading ? '...' : calculatedStock}
                     </span>
                     {product.secondaryUnit && product.unitRatio && !loading && calculatedStock >= product.unitRatio && (
                       <div className="text-[10px] text-amber-700 mt-1 font-bold z-10 relative">
                         معادل {Math.floor(calculatedStock / product.unitRatio)} {product.secondaryUnit} و {calculatedStock % product.unitRatio} {product.unit}
                       </div>
                     )}
                     <Package className="w-16 h-16 text-amber-500/10 absolute -left-4 -bottom-4 z-0 rotate-12" />
                   </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                   <div className="flex flex-col">
                     <span className="text-[10px] text-gray-500 font-bold mb-1">بارکد</span>
                     <span className="text-sm font-mono text-gray-800">{product.barcode || '---'}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[10px] text-gray-500 font-bold mb-1">نوع</span>
                     <span className="text-sm font-bold text-gray-800">{product.type === 'service' ? 'خدمات' : 'کالا'}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[10px] text-gray-500 font-bold mb-1">دسته‌بندی</span>
                     <span className="text-sm font-bold text-gray-800">{product.category || '---'}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[10px] text-gray-500 font-bold mb-1">واحد اصلی / فرعی</span>
                     <span className="text-sm font-bold text-gray-800">{product.unit || 'عدد'} {product.secondaryUnit ? ` / ${product.secondaryUnit} (نسبت: ${product.unitRatio})` : ''}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[10px] text-gray-500 font-bold mb-1">حداقل موجودی</span>
                     <span className="text-sm font-mono text-gray-800">{product.minStock || product.minStockLevel || '---'}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[10px] text-gray-500 font-bold mb-1">وضعیت</span>
                     <span className={`text-sm font-bold ${product.isActive !== false ? 'text-emerald-600' : 'text-rose-600'}`}>{product.isActive !== false ? 'فعال' : 'غیرفعال'}</span>
                   </div>
                   <div className="flex flex-col col-span-2">
                     <span className="text-[10px] text-gray-500 font-bold mb-1">توضیحات</span>
                     <span className="text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{product.description || '---'}</span>
                   </div>
                </div>

                {!loading && Object.keys(stockPerWarehouse).length > 0 && (
                   <div className="mb-8 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                     <span className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3"><Package className="w-4 h-4 text-slate-400" /> موجودی به تفکیک انبارها:</span>
                     <div className="flex flex-wrap gap-2">
                       {Object.entries(stockPerWarehouse).map(([wId, qty]) => {
                          const wName = warehouses?.find(w => String(w.id) === wId)?.name || (wId === 'unknown' ? 'انبار پیش‌فرض / نامشخص' : 'انبار حذف شده');
                          return (
                             <div key={wId} className="bg-white border text-center border-slate-200 px-4 py-2 rounded-lg flex-1 min-w-[120px] shadow-sm">
                                <div className="text-[10px] text-slate-500 font-bold mb-1">{wName}</div>
                                <div className="font-mono font-black text-indigo-700" dir="ltr">{qty} <span className="text-[10px] font-normal font-sans text-gray-500">{product.unit || 'عدد'}</span></div>
                             </div>
                          )
                       })}
                     </div>
                   </div>
                )}

                 {!loading && (recentSalePriceChanges.length > 0 || recentPurchasePriceChanges.length > 0) && (
                   <div className="mb-0 bg-white border border-slate-200 p-4 rounded-xl shadow-sm mt-6">
                     <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                       <BarChart2 className="w-5 h-5 text-indigo-500" />
                       آخرین تغییرات قیمت (۳ تغییر اخیر)
                     </h4>
                     
                     {recentSalePriceChanges.length > 0 && (
                       <div className="mb-4">
                         <h5 className="text-xs font-bold text-emerald-600 mb-2 border-b border-slate-100 pb-1">تغییرات قیمت فروش</h5>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                           {recentSalePriceChanges.map((change, index) => (
                             <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                               <div className="flex items-center gap-3 relative z-10">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600">
                                     <TrendingUp className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col text-right">
                                     <span className="text-[10px] font-bold text-slate-500">فروش</span>
                                     <span className="text-xs font-bold text-slate-700">{formatDateDisplay(change.date)}</span>
                                  </div>
                               </div>
                               <div className="font-sans font-black text-indigo-700 text-left relative z-10" dir="ltr">
                                  {Number(change.price).toLocaleString()} <span className="text-[9px] font-normal font-sans text-slate-500 block text-right mt-0.5">{currency}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                     {recentPurchasePriceChanges.length > 0 && (
                       <div>
                         <h5 className="text-xs font-bold text-rose-600 mb-2 border-b border-slate-100 pb-1">تغییرات قیمت خرید</h5>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                           {recentPurchasePriceChanges.map((change, index) => (
                             <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                               <div className="flex items-center gap-3 relative z-10">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-100 text-rose-600">
                                     <TrendingDown className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col text-right">
                                     <span className="text-[10px] font-bold text-slate-500">خرید</span>
                                     <span className="text-xs font-bold text-slate-700">{formatDateDisplay(change.date)}</span>
                                  </div>
                               </div>
                               <div className="font-sans font-black text-indigo-700 text-left relative z-10" dir="ltr">
                                  {Number(change.price).toLocaleString()} <span className="text-[9px] font-normal font-sans text-slate-500 block text-right mt-0.5">{currency}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 )}
              </motion.div>
            )}

            {activeTab === 'sales' && (
              <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}>
                {loading ? (
                   <div className="text-center py-10 text-gray-400 font-bold animate-pulse">در حال استخراج سوابق ...</div>
                ) : history.filter(h => h.type === 'sale').length === 0 ? (
                   <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-gray-100">فاکتور فروشی برای این کالا ثبت نشده است.</div>
                ) : (
                   <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
                     <table className="w-full text-right text-sm">
                       <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                         <tr>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">تاریخ</th>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">شماره سند</th>
                           <th className="px-4 py-3 font-semibold text-xs">مشتری</th>
                           <th className="px-4 py-3 font-semibold text-xs">انبار</th>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">تعداد ({product.unit})</th>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">فی ({currency})</th>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">مبلغ کل ({currency})</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50 bg-white">
                         {history.filter(h => h.type === 'sale').map((h, i) => (
                           <tr key={i} className="hover:bg-gray-50 transition-colors">
                             <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{h.date}</td>
                             <td className="px-4 py-3 text-gray-500 text-xs font-mono">{h.invoiceNumber || '---'}</td>
                             <td className="px-4 py-3 font-bold text-gray-800 text-xs truncate max-w-[150px]">{h.personName || '---'}</td>
                             <td className="px-4 py-3 text-xs text-gray-600">
                                {warehouses?.find(w => String(w.id) === String(h.warehouseId))?.name || '---'}
                             </td>
                             <td className="px-4 py-3 font-bold font-mono">
                                <span className="text-emerald-600" dir="ltr">
                                   {formatNum(h.quantity)}
                                </span>
                             </td>
                             <td className="px-4 py-3 font-black text-indigo-700">{Number(h.unitPrice).toLocaleString()}</td>
                             <td className="px-4 py-3 font-black text-indigo-700">{(Number(h.unitPrice) * Number(h.quantity)).toLocaleString()}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                )}
              </motion.div>
            )}

            {activeTab === 'purchases' && (
              <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}>
                {loading ? (
                   <div className="text-center py-10 text-gray-400 font-bold animate-pulse">در حال استخراج سوابق ...</div>
                ) : history.filter(h => h.type === 'purchase').length === 0 ? (
                   <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-gray-100">فاکتور خریدی برای این کالا ثبت نشده است.</div>
                ) : (
                   <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
                     <table className="w-full text-right text-sm">
                       <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                         <tr>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">تاریخ</th>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">شماره سند</th>
                           <th className="px-4 py-3 font-semibold text-xs">تامین‌کننده</th>
                           <th className="px-4 py-3 font-semibold text-xs">انبار</th>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">تعداد ({product.unit})</th>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">فی ({currency})</th>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">مبلغ کل ({currency})</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50 bg-white">
                         {history.filter(h => h.type === 'purchase').map((h, i) => (
                           <tr key={i} className="hover:bg-gray-50 transition-colors">
                             <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{h.date}</td>
                             <td className="px-4 py-3 text-gray-500 text-xs font-mono">{h.invoiceNumber || '---'}</td>
                             <td className="px-4 py-3 font-bold text-gray-800 text-xs truncate max-w-[150px]">{h.personName || '---'}</td>
                             <td className="px-4 py-3 text-xs text-gray-600">
                                {warehouses?.find(w => String(w.id) === String(h.warehouseId))?.name || '---'}
                             </td>
                             <td className="px-4 py-3 font-bold font-mono">
                                <span className="text-rose-600" dir="ltr">
                                   {formatNum(h.quantity)}
                                </span>
                             </td>
                             <td className="px-4 py-3 font-black text-indigo-700">{Number(h.unitPrice).toLocaleString()}</td>
                             <td className="px-4 py-3 font-black text-indigo-700">{(Number(h.unitPrice) * Number(h.quantity)).toLocaleString()}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                )}
              </motion.div>
            )}

            {activeTab === 'warehouse' && (
              <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}>
                {loading ? (
                   <div className="text-center py-10 text-gray-400 font-bold animate-pulse">در حال استخراج سوابق ...</div>
                ) : history.filter(h => h.type === 'warehouse_receipt' || h.type === 'warehouse_remittance').length === 0 ? (
                   <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-gray-100">تراکنش انباری برای این کالا ثبت نشده است.</div>
                ) : (
                   <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
                     <table className="w-full text-right text-sm">
                       <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                         <tr>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">نوع تراکنش</th>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">تاریخ</th>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">شماره سند</th>
                           <th className="px-4 py-3 font-semibold text-xs">شخص / تامین‌کننده</th>
                           <th className="px-4 py-3 font-semibold text-xs">انبار</th>
                           <th className="px-4 py-3 font-semibold text-xs">واحد</th>
                           <th className="px-4 py-3 font-semibold text-xs whitespace-nowrap">مقدار</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50 bg-white">
                         {history.filter(h => h.type === 'warehouse_receipt' || h.type === 'warehouse_remittance').map((h, i) => (
                           <tr key={i} className="hover:bg-gray-50 transition-colors">
                             <td className="px-4 py-3 font-bold whitespace-nowrap">
                                {h.type === 'warehouse_receipt' ? (
                                   <span className="text-blue-600 flex items-center gap-1"><Package className="w-3 h-3" /> رسید انبار (ورود)</span>
                                ) : (
                                   <span className="text-orange-600 flex items-center gap-1"><Package className="w-3 h-3" /> حواله انبار (خروج)</span>
                                )}
                             </td>
                             <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{h.date}</td>
                             <td className="px-4 py-3 text-gray-500 text-xs font-mono">{h.invoiceNumber || '---'}</td>
                             <td className="px-4 py-3 font-bold text-gray-800 text-xs truncate max-w-[150px]">{h.personName || '---'}</td>
                             <td className="px-4 py-3 text-xs text-gray-600">
                                {warehouses?.find(w => String(w.id) === String(h.warehouseId))?.name || '---'}
                             </td>
                             <td className="px-4 py-3 text-xs font-medium text-gray-500">
                                {h.isSecondaryUnit ? product.secondaryUnit : product.unit}
                             </td>
                             <td className="px-4 py-3 font-bold font-mono">
                                <span className={h.type === 'warehouse_remittance' ? 'text-orange-600' : 'text-blue-600'} dir="ltr">
                                   {h.type === 'warehouse_remittance' ? '-' : '+'}{formatNum(h.quantity)}
                                </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                )}
              </motion.div>
            )}

            {activeTab === 'persons' && (
              <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}>
                {loading ? (
                   <div className="text-center py-10 text-gray-400 font-bold animate-pulse">در حال استخراج سوابق ...</div>
                ) : Object.keys(personStats).length === 0 ? (
                   <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-gray-100">سابقه‌ای از مشتریان و تامین‌کنندگان برای این کالا وجود ندارد.</div>
                ) : (
                   <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
                     <table className="w-full text-right text-sm">
                       <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                         <tr>
                           <th className="px-4 py-3 font-semibold text-xs">شخص / شرکت</th>
                           <th className="px-4 py-3 font-semibold text-xs">انبار</th>
                           <th className="px-4 py-3 font-semibold text-xs text-center">تعداد ورود (خرید/رسید)</th>
                           <th className="px-4 py-3 font-semibold text-xs text-center">تعداد خروج (فروش/حواله)</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50 bg-white">
                         {Object.entries(personStats).flatMap(([pName, wStats]) => 
                           Object.entries(wStats).map(([wId, stats], i) => (
                             <tr key={`${pName}-${wId}`} className="hover:bg-gray-50 transition-colors">
                               <td className="px-4 py-3 font-bold text-gray-800 text-xs">
                                 {i === 0 ? pName : ''}
                               </td>
                               <td className="px-4 py-3 text-xs text-gray-600">
                                  {warehouses?.find(w => String(w.id) === wId)?.name || (wId === 'unknown' ? 'نامشخص' : 'حذف شده')}
                               </td>
                               <td className="px-4 py-3 text-center">
                                  {stats.in > 0 ? <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md" dir="ltr">+{formatNum(stats.in)} {product.unit || 'عدد'}</span> : <span className="text-gray-300">-</span>}
                               </td>
                               <td className="px-4 py-3 text-center">
                                  {stats.out > 0 ? <span className="font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md" dir="ltr">-{formatNum(stats.out)} {product.unit || 'عدد'}</span> : <span className="text-gray-300">-</span>}
                               </td>
                             </tr>
                           ))
                         )}
                       </tbody>
                     </table>
                   </div>
                )}
              </motion.div>
            )}

            {activeTab === 'price_chart' && (
              <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="w-full h-[400px]">
                {loading ? (
                   <div className="text-center py-10 text-gray-400 font-bold animate-pulse">در حال استخراج سوابق ...</div>
                ) : priceHistory.length === 0 ? (
                   <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-gray-100">در حال حاضر سابقه‌ای برای تشکیل نمودار وجود ندارد.</div>
                ) : (
                   <div className="w-full h-full border border-gray-100 rounded-xl shadow-sm p-4 pt-8 bg-white" dir="ltr">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart
                         data={chartData}
                         margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                       >
                         <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                         <XAxis 
                           dataKey="date" 
                           stroke="#8884d8" 
                           fontSize={12}
                           tick={{fill: '#9CA3AF'}}
                           tickMargin={10}
                         />
                         <YAxis 
                           stroke="#8884d8" 
                           fontSize={12}
                           tickFormatter={(value) => new Intl.NumberFormat('fa-IR').format(value)}
                           tick={{fill: '#9CA3AF'}}
                           width={80}
                         />
                         <Tooltip 
                           formatter={(value: any, name: string) => [new Intl.NumberFormat('fa-IR').format(value) + ` ${currency}`, name === 'salePrice' ? 'قیمت فروش' : 'قیمت خرید']}
                           labelFormatter={(label) => `تاریخ: ${label}`}
                           contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'vazirmatn, system-ui, sans-serif' }}
                           itemStyle={{ textAlign: 'right' }}
                         />
                         <Legend wrapperStyle={{ paddingTop: '20px' }} />
                         <Line connectNulls type="monotone" dataKey="salePrice" name="قیمت فروش" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                         <Line connectNulls type="monotone" dataKey="purchasePrice" name="قیمت خرید" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                       </LineChart>
                     </ResponsiveContainer>
                   </div>
                )}
              </motion.div>
            )}
         </div>
         
         {isModal && (
           <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={onClose} className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-colors">بستن کارت کالا</button>
           </div>
         )}
      </motion.div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" dir="rtl">
        {content}
      </div>
    );
  }

  return <div dir="rtl">{content}</div>;
}
