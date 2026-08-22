import { convertToGregorian } from '../../utils/format';
import React, { useState, useEffect, useMemo } from "react";
import { Package, Search, Download, FileText, ArrowUpDown, Filter, Printer, Box, RefreshCw, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
const BeautifulLoading = () => <div className="flex justify-center items-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
import { motion } from "motion/react";
import DatePickerModule from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { getProducts, getInvoices, getWarehouses, getStoreSettings } from '../../services/dataService';
import { Product, Warehouse, CompanySettings } from '../../types';
import CustomDatePicker from "../ui/CustomDatePicker";
const DatePicker = CustomDatePicker;

const formatNumber = (num: number) => new Intl.NumberFormat('fa-IR').format(num);
const formatCurrency = formatNumber;

interface InventoryReportProps {
  showNotification?: (type: 'success' | 'error', message: string) => void;
  categories?: any[];
}

const InventoryReport: React.FC<InventoryReportProps> = ({ showNotification, categories = [] }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const prods = await getProducts();
      setProducts(prods.filter(p => p.type !== 'service'));
      setWarehouses(await getWarehouses());
      setInvoices(await getInvoices());
      setSettings(await getStoreSettings());
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('error', 'خطا در دریافت اطلاعات');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateReportData = () => {
    let reportRows: any[] = [];
    
    // Convert dates for comparison
    const startObj = startDate ? new Date(startDate.setHours(0,0,0,0)).getTime() : null;
    const endObj = endDate ? new Date(endDate.setHours(23,59,59,999)).getTime() : null;

    products.forEach(product => {
      // Apply Search Filter
      if (searchQuery && 
          !product.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !product.code?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      const defaultWhId = (product.warehouseId || (warehouses[0]?.id) || 'unknown').toString();
      
      let baseStock = Number(product.stock) || 0;
      // If a specific warehouse is selected and it doesn't match default warehouse, base stock is not for this warehouse
      if (selectedWarehouseId !== 'all' && defaultWhId !== selectedWarehouseId) {
        baseStock = 0;
      }

      let openingIncreases = 0;
      let openingDecreases = 0;
      let periodIncreases = 0;
      let periodDecreases = 0;

      invoices.forEach(inv => {
        if (inv.type !== 'warehouse_receipt' && inv.type !== 'warehouse_remittance') return;
        if (inv.status === 'voided' || inv.isDeleted || inv.status === 'draft' || inv.isDraft) return;
        
        let invDate = new Date(inv.date).getTime();
        
        inv.items?.forEach((i: any) => {
          if (i.productId?.toString() !== product.id.toString()) return;
          
          const whId = (i.warehouseId || inv.warehouseId || defaultWhId).toString();
          if (selectedWarehouseId !== 'all' && whId !== selectedWarehouseId) return;

          let q = Number(i.quantity) || 0;
          if (i.isSecondaryUnit && product.unitRatio) {
            q = q * Number(product.unitRatio);
          }

          const isBeforeStart = startObj ? invDate < startObj : false;
          const isWithinPeriod = (!startObj || invDate >= startObj) && (!endObj || invDate <= endObj);

          if (inv.type === 'warehouse_receipt') {
            if (isBeforeStart) openingIncreases += q;
            else if (isWithinPeriod) periodIncreases += q;
          } else if (inv.type === 'warehouse_remittance') {
            if (isBeforeStart) openingDecreases += q;
            else if (isWithinPeriod) periodDecreases += q;
          }
        });
      });

      const openingStock = baseStock + openingIncreases - openingDecreases;
      const closingStock = openingStock + periodIncreases - periodDecreases;
      
      const unitValue = product.purchasePrice || product.price || 0;
      const financialValue = closingStock * unitValue;

      reportRows.push({
        product,
        openingStock,
        periodIncreases,
        periodDecreases,
        closingStock,
        financialValue
      });
    });

    return reportRows;
  };

  const rows = calculateReportData();
  const totalFinancialValue = rows.reduce((sum, row) => sum + row.financialValue, 0);

  if (isLoading) {
    return (
      <BeautifulLoading />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-right"
      dir="rtl"
    >
      <div className="bg-gradient-to-l from-indigo-50 to-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Box className="w-6 h-6 text-indigo-600 font-bold" />
            گزارش موجودی و کاردکس کالا
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            مشاهده موجودی ریالی و تعدادی کالاها براساس انبارهای مختلف در بازه‌های زمانی مشخص
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-1">
             <label className="block text-xs font-bold text-gray-500 mb-2">جستجوی کالا</label>
             <div className="relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="نام یا کد کالا..." 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-mono text-sm outline-none"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
             </div>
          </div>
          <div className="md:col-span-1">
             <label className="block text-xs font-bold text-gray-500 mb-2">انتخاب انبار</label>
             <select 
               value={selectedWarehouseId}
               onChange={(e) => setSelectedWarehouseId(e.target.value)}
               className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-sans text-sm outline-none"
             >
               <option value="all">تمام انبارها (کلي)</option>
               {(warehouses || []).filter(w => w.isActive !== false).map((w, idx) => (
                 <option key={`${w.id}-${idx}`} value={w.id}>{w.name}</option>
               ))}
             </select>
          </div>
          <div className="md:col-span-1 border-r border-gray-100 pr-5">
             <label className="block text-xs font-bold text-gray-500 mb-2">از تاریخ</label>
             <DatePicker
                 value={startDate}
                 onChange={(date: any) => setStartDate(typeof date === 'string' ? new Date(convertToGregorian(date)) : (date?.toDate?.() || null))}
                 calendar={settings?.calendarType === 'gregorian' ? undefined : persian}
                 locale={settings?.calendarType === 'gregorian' ? undefined : persian_fa}
                 calendarPosition="bottom-right"
                 inputClass="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-mono text-center outline-none bg-indigo-50/30 text-indigo-900 font-bold"
                 containerClassName="w-full"
                 placeholder="بدون محدودیت"
             />
          </div>
          <div className="md:col-span-1">
             <label className="block text-xs font-bold text-gray-500 mb-2">تا تاریخ</label>
             <DatePicker
                 value={endDate}
                 onChange={(date: any) => setEndDate(typeof date === 'string' ? new Date(convertToGregorian(date)) : (date?.toDate?.() || null))}
                 calendar={settings?.calendarType === 'gregorian' ? undefined : persian}
                 locale={settings?.calendarType === 'gregorian' ? undefined : persian_fa}
                 calendarPosition="bottom-right"
                 inputClass="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 font-mono text-center outline-none bg-indigo-50/30 text-indigo-900 font-bold"
                 containerClassName="w-full"
                 placeholder="امروز"
             />
          </div>
        </div>
      </div>

      {/* Summary Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border-l-[6px] border-indigo-600 shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
             <p className="text-gray-500 font-bold mb-1">ارزش کل موجودی کالا</p>
             <h3 className="text-2xl font-black text-indigo-950 font-mono" dir="ltr">{formatCurrency(totalFinancialValue)}</h3>
             <p className="text-xs text-gray-400 mt-2 font-mono">بر اساس آخرین نرخ خرید محاسبه شده</p>
           </div>
           <div className="bg-indigo-50 p-4 rounded-xl">
             <FileText className="w-8 h-8 text-indigo-600" />
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-l-[6px] border-emerald-500 shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
             <p className="text-gray-500 font-bold mb-1">تعداد اقلام موجود</p>
             <h3 className="text-2xl font-black text-emerald-900 font-mono" dir="ltr">{formatNumber(rows.filter(r => r.closingStock > 0).length)}</h3>
             <p className="text-xs text-gray-400 mt-2 font-mono">کالاهای دارای موجودی مثبت</p>
           </div>
           <div className="bg-emerald-50 p-4 rounded-xl">
             <Package className="w-8 h-8 text-emerald-600" />
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-l-[6px] border-amber-500 shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
             <p className="text-gray-500 font-bold mb-1">اقلام نیازمند سفارش</p>
             <h3 className="text-2xl font-black text-amber-900 font-mono" dir="ltr">{formatNumber(rows.filter(r => r.closingStock <= (r.product.minStockLevel || settings?.lowStockThresholdsByCategory?.[r.product.categoryId] || 0)).length)}</h3>
             <p className="text-xs text-gray-400 mt-2 font-mono">رسیده به نقطه سفارش یا کمتر</p>
           </div>
           <div className="bg-amber-50 p-4 rounded-xl">
             <AlertTriangle className="w-8 h-8 text-amber-600" />
           </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-right">
             <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
               <tr>
                 <th className="py-4 px-6 font-bold w-12 text-center">#</th>
                 <th className="py-4 px-6 font-bold w-1/4">کالا / مشخصات</th>
                 <th className="py-4 px-6 font-bold text-center border-r border-gray-100">ابتدای دوره</th>
                 <th className="py-4 px-6 font-bold text-emerald-700 text-center border-r border-gray-100 bg-emerald-50/30">وارده</th>
                 <th className="py-4 px-6 font-bold text-rose-700 text-center border-r border-gray-100 bg-rose-50/30">صادره</th>
                 <th className="py-4 px-6 font-bold text-indigo-900 text-center border-r border-gray-100 bg-indigo-50/30">موجودی نهایی</th>
                 <th className="py-4 px-6 font-bold border-r border-gray-100">ارزش ریالی ({settings?.currency || 'تومان'})</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 text-sm">
               {rows.length === 0 ? (
                 <tr>
                   <td colSpan={7} className="py-12 text-center text-gray-400 font-bold">
                     <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                     {searchQuery ? 'کالایی با این مشخصات یافت نشد' : 'اطلاعاتی برای نمایش وجود ندارد'}
                   </td>
                 </tr>
               ) : (
                 rows.map((row, idx) => (
                   <tr key={`${row.product.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                     <td className="py-3 px-6 text-center font-bold text-gray-400">{formatNumber(idx + 1)}</td>
                     <td className="py-3 px-6">
                       <div className="font-bold text-gray-800">{row.product.name}</div>
                       <div className="text-xs text-gray-400 mt-1 pt-1 opacity-80">
                         {formatNumber(row.product.code || '-')}
                         <span className="mr-2 px-1.5 py-0.5 bg-gray-100 rounded-md text-[10px]">{categories.find(c=>c.id==row.product.categoryId)?.name || 'بدون دسته'}</span>
                       </div>
                     </td>
                     <td className="py-3 px-6 text-center font-bold text-gray-700 border-r border-gray-100" dir="ltr">
                       {formatNumber(row.openingStock)} <span className="text-[10px] text-gray-400 font-sans ml-1">{row.product.unit || 'عدد'}</span>
                     </td>
                     <td className="py-3 px-6 text-center font-bold text-emerald-700 border-r border-gray-100 bg-emerald-50/10" dir="ltr">
                       {row.periodIncreases > 0 ? (
                         <div className="flex items-center justify-center gap-1">
                           <ArrowDownToLine className="w-3 h-3" />
                           {formatNumber(row.periodIncreases)}
                         </div>
                       ) : '-'}
                     </td>
                     <td className="py-3 px-6 text-center font-bold text-rose-700 border-r border-gray-100 bg-rose-50/10" dir="ltr">
                        {row.periodDecreases > 0 ? (
                         <div className="flex items-center justify-center gap-1">
                           <ArrowUpFromLine className="w-3 h-3" />
                           {formatNumber(row.periodDecreases)}
                         </div>
                       ) : '-'}
                     </td>
                     <td className="py-3 px-6 text-center font-black border-r border-gray-100 bg-indigo-50/20" dir="ltr">
                       <div className="flex items-center justify-center gap-2">
                         {row.closingStock <= (row.product.minStockLevel || settings?.lowStockThresholdsByCategory?.[row.product.categoryId] || 0) && (
                            <span title="موجودی کمتر از نقطه سفارش"><AlertTriangle className="w-4 h-4 text-amber-500" /></span>
                         )}
                         <span className={row.closingStock <= 0 ? "text-rose-600" : "text-indigo-900"}>{formatNumber(row.closingStock)}</span>
                         <span className="text-[10px] text-indigo-400 font-sans">{row.product.unit || 'عدد'}</span>
                       </div>
                     </td>
                     <td className="py-3 px-6 font-black text-gray-800 border-r border-gray-100 text-left" dir="ltr">
                       {formatCurrency(row.financialValue)}
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
        </div>
      </div>
    </motion.div>
  );
};

export default InventoryReport;
