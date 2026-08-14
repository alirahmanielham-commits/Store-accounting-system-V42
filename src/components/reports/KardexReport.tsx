import React, { useState, useEffect, useMemo } from "react";
import { History, Search, Download, FileText, ArrowUpDown, Filter, Printer, RefreshCw, Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
const BeautifulLoading = () => <div className="flex justify-center items-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
import { motion } from "motion/react";
import DatePickerModule from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { getProducts, getWarehouses, getProductInventoryHistory } from '../../services/dataService';
import { Product, Warehouse } from '../../types';
import CustomDatePicker from "../ui/CustomDatePicker";
const DatePicker = CustomDatePicker;

const formatNumber = (num: number) => new Intl.NumberFormat('fa-IR').format(num);

export default function KardexReport() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
       fetchKardex();
    } else {
       setHistory([]);
    }
  }, [selectedProductId, selectedWarehouseId, startDate, endDate]);

  const fetchBaseData = async () => {
    setIsLoading(true);
    try {
      const prods = await getProducts();
      setProducts(prods.filter(p => p.type !== 'service'));
      setWarehouses(await getWarehouses());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKardex = async () => {
    setIsLoading(true);
    try {
      const whId = selectedWarehouseId === 'all' ? undefined : selectedWarehouseId;
      const h = await getProductInventoryHistory(selectedProductId, whId);
      
      let filtered = h.sort((a,b) => a.timestamp - b.timestamp);
      
      if (startDate || endDate) {
         const startObj = startDate ? new Date(startDate.setHours(0,0,0,0)).getTime() : 0;
         const endObj = endDate ? new Date(endDate.setHours(23,59,59,999)).getTime() : Infinity;
         filtered = filtered.filter(item => {
            return item.timestamp >= startObj && item.timestamp <= endObj;
         });
      }
      setHistory(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id?.toString() === selectedProductId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
          <FileText className="w-8 h-8 text-indigo-600" />
          کاردکس کالا (تاریخچه ورود و خروج)
        </h1>
        <button onClick={fetchKardex} disabled={!selectedProductId || isLoading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-bold shadow-sm text-sm">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          بروزرسانی
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1 md:col-span-1">
             <label className="text-xs font-bold text-gray-500">انتخاب کالا (الزامی)</label>
             <select 
               className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none"
               value={selectedProductId}
               onChange={(e) => setSelectedProductId(e.target.value)}
             >
               <option value="">-- انتخاب کنید --</option>
               {products.map((p, idx) => <option key={`${p.id}-${idx}`} value={p.id}>{p.name} ({p.code || '-'})</option>)}
             </select>
          </div>
          
          <div className="space-y-1">
             <label className="text-xs font-bold text-gray-500">انبار هدف</label>
             <select 
               className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none"
               value={selectedWarehouseId}
               onChange={(e) => setSelectedWarehouseId(e.target.value)}
             >
               <option value="all">همه انبارها</option>
               {warehouses.map((w, idx) => <option key={`${w.id}-${idx}`} value={w.id}>{w.name}</option>)}
             </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500">از تاریخ</label>
            <DatePicker
               calendar={persian}
               locale={persian_fa}
               value={startDate}
               onChange={(d: any) => setStartDate(d?.toDate() || null)}
               format="YYYY/MM/DD"
               inputClass="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-mono"
               placeholder="انتخاب تاریخ"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500">تا تاریخ</label>
            <DatePicker
               calendar={persian}
               locale={persian_fa}
               value={endDate}
               onChange={(d: any) => setEndDate(d?.toDate() || null)}
               format="YYYY/MM/DD"
               inputClass="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-mono"
               placeholder="انتخاب تاریخ"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
           <div className="h-64 flex items-center justify-center">
             <BeautifulLoading />
           </div>
        ) : !selectedProductId ? (
           <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
             <Package className="w-12 h-12 text-gray-200" />
             <p className="font-bold">لطفاً ابتدا یک کالا را انتخاب کنید</p>
           </div>
        ) : history.length === 0 ? (
           <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
             <AlertTriangle className="w-12 h-12 text-gray-200" />
             <p className="font-bold">هیچ تراکنشی برای این کالا و فیلترهای انتخابی یافت نشد.</p>
           </div>
        ) : (
           <div className="overflow-x-auto">
             <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">ردیف</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">تاریخ</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">انبار</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">مرجع سند</th>
                    <th className="px-4 py-3 font-semibold">شرح</th>
                    <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">وارده (+)</th>
                    <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">صادره (-)</th>
                    <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">موجودی پس از تراکنش</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {history.map((item, idx) => {
                     const wh = warehouses.find(w => w.id?.toString() === item.warehouseId?.toString());
                     const isInput = item.type === 'in';
                     return (
                        <tr key={`${item.id}-${idx}`} className="hover:bg-indigo-50/30 transition-colors group">
                           <td className="px-4 py-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                           <td className="px-4 py-3 text-slate-600 font-mono text-xs" dir="ltr">{item.date} {item.time || ''}</td>
                           <td className="px-4 py-3 font-bold text-slate-700 text-xs">{wh ? wh.name : 'پیش‌فرض'}</td>
                           <td className="px-4 py-3 text-slate-500 text-xs">
                             <div className="flex flex-col">
                               <span className="font-bold text-indigo-600">{item.documentNumber || '-'}</span>
                               <span className="text-[10px] text-slate-400">
                                  {item.documentType === 'warehouse_receipt' ? 'رسید انبار' : item.documentType === 'warehouse_remittance' ? 'حواله انبار' : item.documentType === 'initial_stock' ? 'موجودی اولیه' : item.documentType}
                               </span>
                             </div>
                           </td>
                           <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate" title={item.description}>{item.description || '-'}</td>
                           <td className="px-4 py-3 text-center">
                              {isInput ? (
                                <span className="inline-flex items-center gap-1 font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                  <ArrowDownToLine className="w-3 h-3" />
                                  {formatNumber(item.quantity)}
                                </span>
                              ) : '-'}
                           </td>
                           <td className="px-4 py-3 text-center">
                              {!isInput ? (
                                <span className="inline-flex items-center gap-1 font-mono font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-md">
                                  <ArrowUpFromLine className="w-3 h-3" />
                                  {formatNumber(item.quantity)}
                                </span>
                              ) : '-'}
                           </td>
                           <td className="px-4 py-3 text-center">
                              <span className="font-mono font-black text-slate-800 text-sm bg-slate-100 px-3 py-1 rounded-lg">
                                 {formatNumber(item.balanceAfter)}
                              </span>
                           </td>
                        </tr>
                     );
                  })}
                </tbody>
             </table>
           </div>
        )}
      </div>
    </div>
  );
}
