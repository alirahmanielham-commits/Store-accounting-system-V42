import { getUnitRatioDirection, convertQuantityToBaseUnit } from "../../utils/unitConversion";
import { convertToGregorian, formatNumber as formatNumberUtil, getActiveStoreSettings } from '../../utils/format';
import { exportToExcel, formatDecimalForExcel } from '../../utils/exportUtils';
import React, { useState, useEffect, useMemo } from "react";
import { 
  Package, Search, Download, FileText, ArrowUpDown, Filter, Printer, Box, RefreshCw, 
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BarChart3, TrendingUp, TrendingDown, 
  Layers, ChevronDown, ChevronUp, Activity, Sparkles, SlidersHorizontal, Check 
} from "lucide-react";
const BeautifulLoading = () => <div className="flex justify-center items-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import DateObjectModule from "react-date-object";
const DateObject = (DateObjectModule as any).default || DateObjectModule;
import DatePickerModule from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { getProducts, getInvoices, getWarehouses, getStoreSettings } from '../../services/dataService';
import { Product, Warehouse, CompanySettings } from '../../types';
import CustomDatePicker from "../ui/CustomDatePicker";
const DatePicker = CustomDatePicker;

interface InventoryReportProps {
  showNotification?: (type: 'success' | 'error', message: string) => void;
  categories?: any[];
  formatNumber?: (num: number | string) => string;
  storeSettings?: any;
}

const InventoryReport: React.FC<InventoryReportProps> = ({
  showNotification,
  categories = [],
  formatNumber: propFormatNumber,
  storeSettings: propStoreSettings
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(propStoreSettings || null);
  
  const activeSettings = settings || propStoreSettings || getActiveStoreSettings();
  const formatNumber = (num: number | string) => {
    if (propFormatNumber) return propFormatNumber(num);
    return formatNumberUtil(num, activeSettings);
  };
  const formatCurrency = formatNumber;
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Monthly Top Consumed Items Bar Chart States
  const [chartTimeRange, setChartTimeRange] = useState<'last_6_months' | 'last_12_months' | 'current_year'>('last_6_months');
  const [chartTargetCount, setChartTargetCount] = useState<number>(5);
  const [selectedChartProductId, setSelectedChartProductId] = useState<string>('all_top');
  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(true);
  const [chartSortBy, setChartSortBy] = useState<'outbound' | 'turnover'>('outbound');

  const PERSIAN_MONTH_NAMES = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const parseJalaliYearMonth = (dateVal: any): { year: number; month: number; key: string; name: string } | null => {
    if (!dateVal) return null;
    try {
      let str = typeof dateVal === 'string' ? dateVal.trim() : '';
      str = str.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
               .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

      if (str.startsWith('13') || str.startsWith('14')) {
        const parts = str.split(/[\/\-\s]/);
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
            const key = `${y}/${String(m).padStart(2, '0')}`;
            const monthName = `${PERSIAN_MONTH_NAMES[m - 1]} ${y}`;
            return { year: y, month: m, key, name: monthName };
          }
        }
      }

      const gregIso = convertToGregorian(dateVal);
      const jsDate = new Date(gregIso);
      if (!isNaN(jsDate.getTime())) {
        const dObj = new DateObject({ date: jsDate, calendar: persian, locale: persian_fa });
        const y = dObj.year;
        const m = dObj.month.number;
        const key = `${y}/${String(m).padStart(2, '0')}`;
        const monthName = `${PERSIAN_MONTH_NAMES[m - 1]} ${y}`;
        return { year: y, month: m, key, name: monthName };
      }
    } catch {
      // fallback
    }
    return null;
  };

  const isDocInbound = (doc: any) => {
    if (doc.type === 'warehouse_receipt' || doc.type === 'sales_return') return true;
    if (doc.type === 'purchase') {
      return !invoices.some(other => other.type === 'warehouse_receipt' && other.sourceInvoiceId?.toString() === doc.id?.toString() && !other.isDeleted && other.status !== 'voided');
    }
    return false;
  };

  const isDocOutbound = (doc: any) => {
    if (doc.type === 'warehouse_remittance' || doc.type === 'purchase_return' || doc.type === 'waste') return true;
    if (doc.type === 'sale') {
      return !invoices.some(other => other.type === 'warehouse_remittance' && other.sourceInvoiceId?.toString() === doc.id?.toString() && !other.isDeleted && other.status !== 'voided');
    }
    return false;
  };

  // Rank products to identify top-consumed items
  const productTurnoverStats = useMemo(() => {
    const map = new Map<string, { product: Product; totalOut: number; totalIn: number; totalTurnover: number }>();
    
    products.forEach(p => {
      map.set(p.id.toString(), { product: p, totalOut: 0, totalIn: 0, totalTurnover: 0 });
    });

    invoices.forEach(inv => {
      if (inv.status === 'voided' || inv.isDeleted || inv.status === 'draft' || inv.isDraft) return;
      const isIn = isDocInbound(inv);
      const isOut = isDocOutbound(inv);
      if (!isIn && !isOut) return;

      (inv.items || []).forEach((item: any) => {
        const pid = item.productId?.toString();
        if (!pid || !map.has(pid)) return;
        
        const p = map.get(pid)!.product;
        const defaultWhId = (p.warehouseId || (warehouses[0]?.id) || 'unknown').toString();
        const whId = (item.warehouseId || inv.warehouseId || defaultWhId).toString();
        if (selectedWarehouseId !== 'all' && whId !== selectedWarehouseId) return;

        const prodDir = p.unitRatioDirection || getUnitRatioDirection(p);
        const q = convertQuantityToBaseUnit(
          Number(item.quantity) || 0,
          Boolean(item.isSecondaryUnit),
          Number(p.unitRatio || 1),
          prodDir
        );

        const entry = map.get(pid)!;
        if (isIn) entry.totalIn += q;
        if (isOut) entry.totalOut += q;
        entry.totalTurnover += q;
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (chartSortBy === 'outbound') {
        if (b.totalOut !== a.totalOut) return b.totalOut - a.totalOut;
        if (b.totalTurnover !== a.totalTurnover) return b.totalTurnover - a.totalTurnover;
      } else {
        if (b.totalTurnover !== a.totalTurnover) return b.totalTurnover - a.totalTurnover;
        if (b.totalOut !== a.totalOut) return b.totalOut - a.totalOut;
      }
      return (Number(b.product.stock) || 0) - (Number(a.product.stock) || 0);
    });
  }, [products, invoices, warehouses, selectedWarehouseId, chartSortBy]);

  const topConsumedProducts = useMemo(() => {
    return productTurnoverStats.slice(0, Math.min(chartTargetCount, productTurnoverStats.length));
  }, [productTurnoverStats, chartTargetCount]);

  const activeChartProducts = useMemo(() => {
    if (selectedChartProductId !== 'all_top') {
      const single = products.find(p => p.id?.toString() === selectedChartProductId);
      return single ? [single] : topConsumedProducts.map(t => t.product);
    }
    return topConsumedProducts.map(t => t.product);
  }, [selectedChartProductId, topConsumedProducts, products]);

  // Months list for the selected timeframe
  const monthsList = useMemo(() => {
    const list: { key: string; name: string; shortName: string; year: number; month: number }[] = [];
    const nowObj = new DateObject({ calendar: persian, locale: persian_fa });
    const curYear = nowObj.year;

    if (chartTimeRange === 'last_6_months') {
      for (let i = 5; i >= 0; i--) {
        const d = new DateObject({ calendar: persian, locale: persian_fa }).subtract(i, 'months');
        const y = d.year;
        const m = d.month.number;
        const key = `${y}/${String(m).padStart(2, '0')}`;
        const shortName = PERSIAN_MONTH_NAMES[m - 1];
        const name = `${shortName} ${y % 100}`;
        list.push({ key, name, shortName, year: y, month: m });
      }
    } else if (chartTimeRange === 'last_12_months') {
      for (let i = 11; i >= 0; i--) {
        const d = new DateObject({ calendar: persian, locale: persian_fa }).subtract(i, 'months');
        const y = d.year;
        const m = d.month.number;
        const key = `${y}/${String(m).padStart(2, '0')}`;
        const shortName = PERSIAN_MONTH_NAMES[m - 1];
        const name = `${shortName} ${y % 100}`;
        list.push({ key, name, shortName, year: y, month: m });
      }
    } else {
      // current_year
      for (let m = 1; m <= 12; m++) {
        const key = `${curYear}/${String(m).padStart(2, '0')}`;
        const shortName = PERSIAN_MONTH_NAMES[m - 1];
        const name = `${shortName} ${curYear % 100}`;
        list.push({ key, name, shortName, year: curYear, month: m });
      }
    }
    return list;
  }, [chartTimeRange]);

  // Aggregated monthly data for the BarChart
  const monthlyChartData = useMemo(() => {
    const activeIds = new Set(activeChartProducts.map(p => p.id.toString()));
    if (activeIds.size === 0) return [];

    const dataByMonth = new Map<string, {
      monthKey: string;
      monthName: string;
      year: number;
      month: number;
      inboundQty: number;
      outboundQty: number;
      netQty: number;
      itemBreakdown: Record<string, { name: string; inQty: number; outQty: number; unit: string }>;
    }>();

    monthsList.forEach(m => {
      dataByMonth.set(m.key, {
        monthKey: m.key,
        monthName: m.name,
        year: m.year,
        month: m.month,
        inboundQty: 0,
        outboundQty: 0,
        netQty: 0,
        itemBreakdown: {}
      });
    });

    invoices.forEach(inv => {
      if (inv.status === 'voided' || inv.isDeleted || inv.status === 'draft' || inv.isDraft) return;
      const isIn = isDocInbound(inv);
      const isOut = isDocOutbound(inv);
      if (!isIn && !isOut) return;

      const dateInfo = parseJalaliYearMonth(inv.date || inv.createdAt);
      if (!dateInfo || !dataByMonth.has(dateInfo.key)) return;

      const monthEntry = dataByMonth.get(dateInfo.key)!;

      (inv.items || []).forEach((item: any) => {
        const pid = item.productId?.toString();
        if (!pid || !activeIds.has(pid)) return;

        const p = products.find(prod => prod.id?.toString() === pid);
        if (!p) return;

        const defaultWhId = (p.warehouseId || (warehouses[0]?.id) || 'unknown').toString();
        const whId = (item.warehouseId || inv.warehouseId || defaultWhId).toString();
        if (selectedWarehouseId !== 'all' && whId !== selectedWarehouseId) return;

        const prodDir = p.unitRatioDirection || getUnitRatioDirection(p);
        const q = convertQuantityToBaseUnit(
          Number(item.quantity) || 0,
          Boolean(item.isSecondaryUnit),
          Number(p.unitRatio || 1),
          prodDir
        );

        if (isIn) monthEntry.inboundQty += q;
        if (isOut) monthEntry.outboundQty += q;

        if (!monthEntry.itemBreakdown[pid]) {
          monthEntry.itemBreakdown[pid] = {
            name: p.name,
            inQty: 0,
            outQty: 0,
            unit: p.unit || 'عدد'
          };
        }
        if (isIn) monthEntry.itemBreakdown[pid].inQty += q;
        if (isOut) monthEntry.itemBreakdown[pid].outQty += q;
      });
    });

    return monthsList.map(m => {
      const entry = dataByMonth.get(m.key)!;
      entry.netQty = entry.inboundQty - entry.outboundQty;
      return {
        ...entry,
        breakdownList: Object.values(entry.itemBreakdown)
      };
    });
  }, [monthsList, invoices, activeChartProducts, products, warehouses, selectedWarehouseId]);

  // Aggregate stats across the chart's time range
  const chartTotals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    monthlyChartData.forEach(d => {
      totalIn += d.inboundQty;
      totalOut += d.outboundQty;
    });
    const mostConsumedInActive = activeChartProducts.length === 1 
      ? activeChartProducts[0] 
      : (topConsumedProducts[0]?.product || null);
    const mostConsumedStat = productTurnoverStats.find(s => s.product.id?.toString() === mostConsumedInActive?.id?.toString());

    return {
      totalIn,
      totalOut,
      netTurnover: totalIn - totalOut,
      mostConsumedProduct: mostConsumedInActive,
      mostConsumedQty: mostConsumedStat?.totalOut || 0,
      mostConsumedUnit: mostConsumedInActive?.unit || 'عدد'
    };
  }, [monthlyChartData, activeChartProducts, topConsumedProducts, productTurnoverStats]);

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

          const prodDir = product.unitRatioDirection || getUnitRatioDirection(product);
          let q = convertQuantityToBaseUnit(
            i.quantity,
            Boolean(i.isSecondaryUnit),
            Number(product.unitRatio),
            prodDir
          );

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

  const handleExportExcel = () => {
    try {
      const selectedWhName = selectedWarehouseId === 'all' 
        ? 'همه_انبارها' 
        : (warehouses.find(w => w.id?.toString() === selectedWarehouseId)?.name || 'انبار_انتخابی');

      const excelRows = rows.map((row, idx) => {
        const catName = categories.find(c => c.id == row.product.categoryId)?.name || 'بدون دسته‌بندی';
        return {
          'ردیف': idx + 1,
          'کد کالا': row.product.code || '-',
          'نام کالا': row.product.name,
          'دسته‌بندی': catName,
          'واحد سنجش': row.product.unit || 'عدد',
          'موجودی ابتدای دوره': formatDecimalForExcel(row.openingStock, activeSettings),
          'وارده (ورودی)': formatDecimalForExcel(row.periodIncreases, activeSettings),
          'صادره (خروجی)': formatDecimalForExcel(row.periodDecreases, activeSettings),
          'موجودی نهایی': formatDecimalForExcel(row.closingStock, activeSettings),
          'نرخ خرید (تومان)': formatDecimalForExcel(row.product.purchasePrice || row.product.price || 0, activeSettings),
          'ارزش ریالی نهایی (تومان)': formatDecimalForExcel(row.financialValue, activeSettings),
          'وضعیت سفارش': row.closingStock <= (row.product.minStockLevel || settings?.lowStockThresholdsByCategory?.[row.product.categoryId] || 0) ? 'نیازمند سفارش' : 'مطلوب'
        };
      });

      const fileName = `گزارش_موجودی_انبار_${selectedWhName}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}`;

      exportToExcel({
        filename: fileName,
        sheetName: 'موجودی انبار',
        data: excelRows,
        storeSettings: activeSettings
      });

      if (showNotification) showNotification('success', 'فایل اکسل گزارش موجودی با موفقیت ایجاد و دانلود شد');
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('error', 'خطا در خروجی فایل اکسل');
    }
  };

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
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all font-bold text-xs shadow-2xs cursor-pointer"
            title="خروجی فایل اکسل از جدول موجودی انبار با رعایت فرمت اعشار"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            خروجی اکسل (.xlsx)
          </button>
          <button onClick={fetchData} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
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

      {/* Monthly Turnover Bar Chart for Top Consumed Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header & Controls Toolbar */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-gray-900">
                  نمودار میله‌ای گردش ماهانه ورودی و خروجی کالاهای پرمصرف
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100/70 text-indigo-800">
                  گردش تعدادی اقلام پرگردش
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 mr-9">
                تحلیل روند ماهانه ورود به انبار (وارده) و خروج/مصرف (صادره) برای پرمصرف‌ترین کالاها در بازه‌های زمانی مشخص با Recharts
              </p>
            </div>

            {/* Action & Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Target items selector */}
              <div className="flex items-center bg-gray-50 border border-gray-200 p-1 rounded-xl text-xs font-bold text-gray-600">
                <button
                  type="button"
                  onClick={() => { setChartTargetCount(3); setSelectedChartProductId('all_top'); }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${chartTargetCount === 3 && selectedChartProductId === 'all_top' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  ۳ کالای برتر
                </button>
                <button
                  type="button"
                  onClick={() => { setChartTargetCount(5); setSelectedChartProductId('all_top'); }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${chartTargetCount === 5 && selectedChartProductId === 'all_top' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  ۵ کالای برتر
                </button>
                <button
                  type="button"
                  onClick={() => { setChartTargetCount(10); setSelectedChartProductId('all_top'); }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${chartTargetCount === 10 && selectedChartProductId === 'all_top' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  ۱۰ کالای برتر
                </button>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center bg-gray-50 border border-gray-200 p-1 rounded-xl text-xs font-bold text-gray-600">
                <button
                  type="button"
                  onClick={() => setChartTimeRange('last_6_months')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${chartTimeRange === 'last_6_months' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  ۶ ماه اخیر
                </button>
                <button
                  type="button"
                  onClick={() => setChartTimeRange('last_12_months')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${chartTimeRange === 'last_12_months' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  ۱۲ ماه اخیر
                </button>
                <button
                  type="button"
                  onClick={() => setChartTimeRange('current_year')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${chartTimeRange === 'current_year' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  سال جاری
                </button>
              </div>

              {/* Product Single Picker Dropdown */}
              <select
                value={selectedChartProductId}
                onChange={(e) => setSelectedChartProductId(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none max-w-[180px] truncate"
              >
                <option value="all_top">همه کالاهای پرمصرف ({chartTargetCount} کالا)</option>
                {productTurnoverStats.slice(0, 15).map((stat) => (
                  <option key={stat.product.id} value={stat.product.id}>
                    {stat.product.name} ({stat.product.code || 'بدون کد'})
                  </option>
                ))}
              </select>

              {/* Expand/Collapse Button */}
              <button
                type="button"
                onClick={() => setIsChartExpanded(!isChartExpanded)}
                className="p-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
                title={isChartExpanded ? "بستن نمودار" : "نمایش نمودار"}
              >
                {isChartExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Chart Body */}
        {isChartExpanded && (
          <div className="p-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Most Consumed Product */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-white p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between text-indigo-600 mb-1">
                  <span className="text-xs font-bold text-gray-500">پرمصرف‌ترین کالا</span>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="font-extrabold text-gray-900 text-sm truncate" title={chartTotals.mostConsumedProduct?.name || 'کالایی ثبت نشده'}>
                  {chartTotals.mostConsumedProduct?.name || 'بدون داده'}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-800 font-mono">
                  <span>کل مصرف:</span>
                  <span className="font-bold">{formatNumber(chartTotals.mostConsumedQty)}</span>
                  <span className="text-[10px] text-gray-500 font-sans">{chartTotals.mostConsumedUnit}</span>
                </div>
              </div>

              {/* Total Inbound In Period */}
              <div className="bg-gradient-to-br from-emerald-50/70 to-white p-4 rounded-xl border border-emerald-100">
                <div className="flex items-center justify-between text-emerald-600 mb-1">
                  <span className="text-xs font-bold text-gray-500">کل گردش ورودی (وارده)</span>
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div className="text-xl font-black text-emerald-900 font-mono" dir="ltr">
                  +{formatNumber(chartTotals.totalIn)}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  ورودی کالاهای منتخب در بازه
                </p>
              </div>

              {/* Total Outbound In Period */}
              <div className="bg-gradient-to-br from-rose-50/70 to-white p-4 rounded-xl border border-rose-100">
                <div className="flex items-center justify-between text-rose-600 mb-1">
                  <span className="text-xs font-bold text-gray-500">کل گردش خروجی (صادره)</span>
                  <ArrowUpFromLine className="w-4 h-4" />
                </div>
                <div className="text-xl font-black text-rose-900 font-mono" dir="ltr">
                  -{formatNumber(chartTotals.totalOut)}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  خروج/مصرف کالاهای منتخب در بازه
                </p>
              </div>

              {/* Net Balance */}
              <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between text-slate-600 mb-1">
                  <span className="text-xs font-bold text-gray-500">خالص تغییرات دوره</span>
                  <Activity className="w-4 h-4" />
                </div>
                <div className={`text-xl font-black font-mono ${chartTotals.netTurnover >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} dir="ltr">
                  {chartTotals.netTurnover > 0 ? `+${formatNumber(chartTotals.netTurnover)}` : formatNumber(chartTotals.netTurnover)}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  تراز تعدادی (ورودی منهای خروجی)
                </p>
              </div>
            </div>

            {/* Quick Product Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 custom-scrollbar">
              <span className="text-xs font-bold text-gray-400 shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> فیلتر سریع کالا:
              </span>
              <button
                type="button"
                onClick={() => setSelectedChartProductId('all_top')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedChartProductId === 'all_top'
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                مجموع {chartTargetCount} کالای پرمصرف
              </button>
              {topConsumedProducts.map((stat, idx) => {
                const isSelected = selectedChartProductId === stat.product.id?.toString();
                return (
                  <button
                    key={stat.product.id}
                    type="button"
                    onClick={() => setSelectedChartProductId(stat.product.id?.toString())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                        : 'bg-white border border-gray-200 hover:bg-indigo-50/50 hover:border-indigo-200 text-gray-700'
                    }`}
                  >
                    <span className="opacity-75">#{formatNumber(idx + 1)}</span>
                    <span className="max-w-[130px] truncate">{stat.product.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isSelected ? 'bg-indigo-700 text-white' : 'bg-rose-50 text-rose-700'}`}>
                      {formatNumber(stat.totalOut)} {stat.product.unit || 'عدد'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Recharts BarChart */}
            {monthlyChartData.every(d => d.inboundQty === 0 && d.outboundQty === 0) ? (
              <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-800 mb-1">
                  گردش ورودی و خروجی در این بازه زمانی ثبت نشده است
                </h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
                  برای مشاهده سوابق، می‌توانید بازه زمانی را به «۱۲ ماه اخیر» یا «سال جاری» تغییر داده یا کالاهای دیگری را انتخاب نمایید.
                </p>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChartTimeRange('last_12_months')}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    مشاهده ۱۲ ماه اخیر
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartTimeRange('current_year')}
                    className="px-4 py-2 bg-indigo-600 rounded-xl text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                  >
                    مشاهده سال جاری
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-80 sm:h-96 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 25, right: 15, left: 10, bottom: 5 }} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="monthName"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={(val) => formatNumber(val)}
                    />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0]?.payload;
                        if (!data) return null;

                        return (
                          <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-xl text-right font-sans min-w-[240px]" dir="rtl">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-800 text-sm">{data.monthName}</span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">گردش ماهانه</span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/70 border border-emerald-100 px-3 py-1.5 rounded-xl font-bold">
                                <div className="flex items-center gap-1.5">
                                  <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>گردش ورودی (وارده):</span>
                                </div>
                                <span className="font-mono text-sm">{formatNumber(data.inboundQty)}</span>
                              </div>

                              <div className="flex items-center justify-between text-rose-700 bg-rose-50/70 border border-rose-100 px-3 py-1.5 rounded-xl font-bold">
                                <div className="flex items-center gap-1.5">
                                  <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-600" />
                                  <span>گردش خروجی (صادره/مصرف):</span>
                                </div>
                                <span className="font-mono text-sm">{formatNumber(data.outboundQty)}</span>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-slate-700 font-bold px-1">
                                <span>تراز گردش تعدادی:</span>
                                <span className={`font-mono text-sm ${data.netQty >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {data.netQty > 0 ? `+${formatNumber(data.netQty)}` : formatNumber(data.netQty)}
                                </span>
                              </div>
                            </div>

                            {data.breakdownList && data.breakdownList.length > 1 && (
                              <div className="mt-3 pt-2.5 border-t border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                                  <span>کالاهای سهیم در این ماه:</span>
                                  <span>ورودی / خروجی</span>
                                </div>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                                  {data.breakdownList.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                                      <span className="truncate max-w-[130px] font-medium" title={item.name}>{item.name}</span>
                                      <span className="font-mono text-[10px] flex items-center gap-1" dir="ltr">
                                        <span className="text-emerald-600 font-bold">+{formatNumber(item.inQty)}</span>
                                        <span className="text-slate-300">/</span>
                                        <span className="text-rose-600 font-bold">-{formatNumber(item.outQty)}</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: 16 }}
                      formatter={(val) => {
                        if (val === 'inboundQty') return <span className="text-xs font-bold text-emerald-800 mr-2">گردش ورودی (وارده)</span>;
                        if (val === 'outboundQty') return <span className="text-xs font-bold text-rose-800 mr-2">گردش خروجی (صادره / مصرف)</span>;
                        return val;
                      }}
                    />
                    <Bar
                      dataKey="inboundQty"
                      name="inboundQty"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                    />
                    <Bar
                      dataKey="outboundQty"
                      name="outboundQty"
                      fill="#f43f5e"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-gray-800 text-sm">جدول تفصیلی کاردکس و موجودی کالاها</h3>
            <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold">
              {formatNumber(rows.length)} کالا
            </span>
          </div>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all font-bold text-xs shadow-2xs cursor-pointer"
            title="خروجی فایل اکسل از جدول موجودی انبار با رعایت فرمت اعشار"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            خروجی اکسل (.xlsx)
          </button>
        </div>
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
