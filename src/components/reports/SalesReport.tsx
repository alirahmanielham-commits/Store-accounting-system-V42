import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Printer,
  Download,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
  BarChart3,
  Users,
  Package,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShoppingCart,
  Percent,
  Layers,
  ArrowLeftRight,
  Info,
  ChevronRight,
  ChevronLeft,
  Store,
  Tag,
  Clock,
  Sparkles,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import DateObjectModule from "react-date-object";
const DateObject = (DateObjectModule as any).default || DateObjectModule;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { getInvoices, getProducts, getPersons, getWarehouses, getStoreSettings } from '../../services/dataService';
import { Product, Warehouse, Person, CompanySettings } from '../../types';
import CustomDatePicker from '../ui/CustomDatePicker';
import { convertToGregorian, formatDateDisplay, toPersianDigits } from '../../utils/format';
import { convertQuantityToBaseUnit, getUnitRatioDirection } from '../../utils/unitConversion';

interface SalesReportProps {
  showNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
  toPersianDigits?: (str: string | number | undefined | null) => string;
  formatCurrency?: (num: number | string) => string;
  formatDateDisplay?: (date: string | Date | number | undefined | null) => string;
  setViewingInvoice?: (inv: any) => void;
  setActiveTab?: (tab: string) => void;
}

type ViewMode = 'invoices' | 'daily' | 'monthly' | 'products' | 'customers' | 'charts';
type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'this_month' | 'last_30_days' | 'this_season' | 'this_year' | 'all' | 'custom';

const formatNumFa = (val: number | string) => {
  const n = Number(val) || 0;
  return new Intl.NumberFormat('fa-IR').format(Math.round(n));
};

export default function SalesReport(props: SalesReportProps) {
  const {
    showNotification,
    setViewingInvoice,
    setActiveTab,
  } = props;

  // Data states
  const [invoices, setInvoices] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [storeSettings, setStoreSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active view tab
  const [viewMode, setViewMode] = useState<ViewMode>('invoices');

  // Filter states
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [startDate, setStartDate] = useState<any>(null);
  const [endDate, setEndDate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [selectedInvoiceType, setSelectedInvoiceType] = useState<'all' | 'sale' | 'sale_return'>('all');
  const [profitFilter, setProfitFilter] = useState<'all' | 'profit' | 'loss' | 'breakeven'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Expanded rows in invoices list
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<string, boolean>>({});

  // Pagination for invoice table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Sorting
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Currency label
  const currency = storeSettings?.currency || 'تومان';

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [invs, prods, pers, whs, sets] = await Promise.all([
        getInvoices(),
        getProducts(),
        getPersons(),
        getWarehouses(),
        getStoreSettings()
      ]);
      setInvoices(invs || []);
      setProducts(prods || []);
      setPersons(pers || []);
      setWarehouses(whs || []);
      setStoreSettings(sets || null);
      applyDatePreset('this_month');
    } catch (err) {
      console.error('Error fetching sales report data:', err);
      if (showNotification) showNotification('error', 'خطا در دریافت اطلاعات فروش');
    } finally {
      setIsLoading(false);
    }
  };

  // Set date ranges according to presets
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    
    // We compute Shamsi date components using DateObject
    const dJalali = new DateObject({ date: now, calendar: persian, locale: persian_fa });
    const jYear = dJalali.year;
    const jMonth = dJalali.month.number; // 1 - 12
    const jDay = dJalali.day;

    if (preset === 'today') {
      const start = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: jMonth, day: jDay }).toDate();
      const end = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: jMonth, day: jDay }).toDate();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'yesterday') {
      const d = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: jMonth, day: jDay - 1 });
      const start = d.toDate();
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this_week') {
      // In Iranian calendar, week starts on Saturday (شنبه)
      const dayOfWeek = dJalali.weekDay.index; // 0 for Saturday in Persian calendar
      const start = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: jMonth, day: jDay - dayOfWeek }).toDate();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'last_7_days') {
      const start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this_month') {
      const start = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: jMonth, day: 1 }).toDate();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'last_30_days') {
      const start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this_season') {
      // Seasons: Spring (1,2,3), Summer (4,5,6), Autumn (7,8,9), Winter (10,11,12)
      const seasonStartMonth = Math.floor((jMonth - 1) / 3) * 3 + 1;
      const start = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: seasonStartMonth, day: 1 }).toDate();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this_year') {
      const start = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: 1, day: 1 }).toDate();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'all') {
      setStartDate(null);
      setEndDate(null);
    }
  };

  // Build product purchase price lookup table
  // Fallbacks: product.purchasePrice -> purchase invoices latest purchase price -> 0
  const productCostMap = useMemo(() => {
    const costMap: Record<string, number> = {};

    // 1. Initial product prices
    (products || []).forEach(p => {
      const pid = String(p.id);
      const buyPrice = Number(p.purchasePrice || (p as any).buyPrice || 0);
      costMap[pid] = buyPrice;
    });

    // 2. Scan purchase invoices to find purchase prices
    const purchaseInvoices = (invoices || [])
      .filter(i => (i.type === 'purchase' || i.type === 'warehouse_receipt') && !i.isDeleted && i.status !== 'voided')
      .sort((a, b) => {
        const timeA = new Date(convertToGregorian(a.date || a.createdAt || 0)).getTime();
        const timeB = new Date(convertToGregorian(b.date || b.createdAt || 0)).getTime();
        return timeA - timeB;
      });

    purchaseInvoices.forEach(inv => {
      if (Array.isArray(inv.items)) {
        inv.items.forEach((item: any) => {
          const pid = String(item.productId || '');
          if (!pid) return;
          const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
          if (unitPrice > 0) {
            // Overwrite with newer purchase price if product has 0, or keep track of latest
            if (!costMap[pid] || costMap[pid] === 0) {
              costMap[pid] = unitPrice;
            }
          }
        });
      }
    });

    return costMap;
  }, [products, invoices]);

  // Helper to extract Jalali day & month info from invoice date
  const parseInvoiceDate = (dateVal: any) => {
    if (!dateVal) return { jalaliDay: 'نامشخص', jalaliMonth: 'نامشخص', jalaliMonthName: 'نامشخص', timestamp: 0 };
    try {
      const str = String(dateVal).trim();
      // If starts with 13xx or 14xx
      if (str.startsWith('13') || str.startsWith('14')) {
        const parts = str.split(/[\/\-\s]/);
        const y = parts[0];
        const m = parts[1]?.padStart(2, '0') || '01';
        const d = parts[2]?.padStart(2, '0') || '01';
        const jalaliDay = `${y}/${m}/${d}`;
        const jalaliMonth = `${y}/${m}`;
        const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
        const mIdx = parseInt(m, 10) - 1;
        const jalaliMonthName = `${monthNames[mIdx] || m} ${y}`;
        const gregorianIso = convertToGregorian(str);
        const timestamp = new Date(gregorianIso).getTime();
        return { jalaliDay, jalaliMonth, jalaliMonthName, timestamp };
      } else {
        const gregorianIso = convertToGregorian(str);
        const jsDate = new Date(gregorianIso);
        if (isNaN(jsDate.getTime())) return { jalaliDay: 'نامشخص', jalaliMonth: 'نامشخص', jalaliMonthName: 'نامشخص', timestamp: 0 };
        const dObj = new DateObject({ date: jsDate, calendar: persian, locale: persian_fa });
        const jalaliDay = dObj.format("YYYY/MM/DD");
        const jalaliMonth = dObj.format("YYYY/MM");
        const jalaliMonthName = dObj.format("MMMM YYYY");
        return { jalaliDay, jalaliMonth, jalaliMonthName, timestamp: jsDate.getTime() };
      }
    } catch {
      return { jalaliDay: 'نامشخص', jalaliMonth: 'نامشخص', jalaliMonthName: 'نامشخص', timestamp: 0 };
    }
  };

  // Process all sales and return invoices with detailed row-by-row cost and profit
  const processedInvoices = useMemo(() => {
    const rawSales = (invoices || []).filter(inv => {
      if (inv.isDeleted || inv.status === 'voided' || inv.status === 'draft' || inv.isDraft) return false;
      return inv.type === 'sale' || inv.type === 'sale_return';
    });

    return rawSales.map(inv => {
      const isReturn = inv.type === 'sale_return';
      const sign = isReturn ? -1 : 1;

      const dateInfo = parseInvoiceDate(inv.date || inv.createdAt);
      const customer = (persons || []).find(p => String(p.id) === String(inv.customerId));
      const customerName = customer ? (customer.alias || customer.name || (customer.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : 'مشتری')) : (inv.customerName || 'مشتری متفرقه');

      let grossSales = 0; // مجموع ناخالص قبل از تخفیف فاکتور
      let totalItemDiscounts = 0;
      let totalCost = 0; // بهای تمام شده کل اقلام
      let itemsProfit = 0;

      const processedItems = (inv.items || []).map((item: any, idx: number) => {
        const pid = String(item.productId || '');
        const prod = (products || []).find(p => String(p.id) === pid);
        const prodName = item.productName || prod?.name || `کالای ردیف ${idx + 1}`;
        const unitName = item.selectedUnit || prod?.unit || 'عدد';

        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
        const discPercent = Number(item.discountPercent) || 0;

        // Base unit quantity
        let baseQty = qty;
        if (item.baseQuantity !== undefined && item.baseQuantity !== null) {
          baseQty = Number(item.baseQuantity) || qty;
        } else if (prod && prod.unitRatio && item.isSecondaryUnit) {
          const dir = prod.unitRatioDirection || getUnitRatioDirection(prod);
          baseQty = convertQuantityToBaseUnit(qty, true, Number(prod.unitRatio), dir);
        }

        const rawLineTotal = qty * unitPrice;
        const lineDiscount = rawLineTotal * (discPercent / 100);
        const netLineTotal = item.totalPrice !== undefined ? Number(item.totalPrice) : (rawLineTotal - lineDiscount);

        // Product cost per base unit
        const unitCost = Number(item.costPrice ?? productCostMap[pid] ?? 0);
        const lineCost = unitCost * baseQty;

        const lineProfit = (netLineTotal - lineCost) * sign;
        const lineProfitMargin = netLineTotal > 0 ? (lineProfit / netLineTotal) * 100 : 0;

        grossSales += rawLineTotal;
        totalItemDiscounts += lineDiscount;
        totalCost += lineCost;
        itemsProfit += lineProfit;

        return {
          ...item,
          productName: prodName,
          unitName,
          quantity: qty,
          baseQuantity: baseQty,
          unitPrice,
          discountPercent: discPercent,
          rawLineTotal,
          lineDiscount,
          netLineTotal,
          unitCost,
          lineCost,
          lineProfit,
          lineProfitMargin,
          hasCostInfo: unitCost > 0
        };
      });

      // Overall invoice adjustments
      const overallDiscountAmt = Number(inv.invoiceTotalDiscount || inv.discountAmount || 0);
      const taxAmt = Number(inv.taxAmount || 0);
      
      // Net invoice total
      let netSales = inv.totalAmount !== undefined ? Number(inv.totalAmount) : (grossSales - totalItemDiscounts - overallDiscountAmt + taxAmt);
      if (netSales < 0) netSales = 0;

      // Adjust signed values
      const signedGrossSales = grossSales * sign;
      const signedNetSales = netSales * sign;
      const signedCost = totalCost * sign;
      const grossProfit = (signedNetSales - signedCost); // سود ناخالص = فروش خالص - بهای تمام شده
      const profitMarginPercent = signedNetSales !== 0 ? (grossProfit / Math.abs(signedNetSales)) * 100 : 0;

      // Warehouse name
      const wh = (warehouses || []).find(w => String(w.id) === String(inv.warehouseId || inv.targetWarehouseId));
      const warehouseName = wh ? wh.name : 'انبار مرکزی';

      return {
        ...inv,
        isReturn,
        sign,
        dateInfo,
        customerName,
        customer,
        warehouseName,
        itemsCount: processedItems.length,
        items: processedItems,
        grossSales: signedGrossSales,
        totalDiscounts: (totalItemDiscounts + overallDiscountAmt) * sign,
        netSales: signedNetSales,
        totalCost: signedCost,
        grossProfit,
        profitMarginPercent,
        isProfitable: grossProfit > 0,
        isLoss: grossProfit < 0,
        isBreakEven: grossProfit === 0,
        paidAmount: Number(inv.paidAmount) || 0,
        remainingAmount: Math.max(0, netSales - (Number(inv.paidAmount) || 0)),
        isSettled: (Number(inv.paidAmount) || 0) >= netSales
      };
    });
  }, [invoices, products, persons, warehouses, productCostMap]);

  // Apply User Filters
  const filteredInvoices = useMemo(() => {
    return processedInvoices.filter(inv => {
      // 1. Date filter
      if (startDate) {
        const startTs = new Date(startDate).setHours(0, 0, 0, 0);
        if (inv.dateInfo.timestamp < startTs) return false;
      }
      if (endDate) {
        const endTs = new Date(endDate).setHours(23, 59, 59, 999);
        if (inv.dateInfo.timestamp > endTs) return false;
      }

      // 2. Customer filter
      if (selectedCustomerId !== 'all') {
        if (String(inv.customerId) !== selectedCustomerId) return false;
      }

      // 3. Product filter
      if (selectedProductId !== 'all') {
        const hasProd = (inv.items || []).some((it: any) => String(it.productId) === selectedProductId);
        if (!hasProd) return false;
      }

      // 4. Warehouse filter
      if (selectedWarehouseId !== 'all') {
        if (String(inv.warehouseId) !== selectedWarehouseId) return false;
      }

      // 5. Invoice type
      if (selectedInvoiceType !== 'all') {
        if (inv.type !== selectedInvoiceType) return false;
      }

      // 6. Profit status filter
      if (profitFilter === 'profit' && inv.grossProfit <= 0) return false;
      if (profitFilter === 'loss' && inv.grossProfit >= 0) return false;
      if (profitFilter === 'breakeven' && inv.grossProfit !== 0) return false;

      // 7. Payment status filter
      if (paymentStatusFilter === 'paid' && !inv.isSettled) return false;
      if (paymentStatusFilter === 'unpaid' && inv.isSettled) return false;

      // 8. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = String(inv.invoiceNumber || '').toLowerCase().includes(q);
        const matchCustomer = String(inv.customerName || '').toLowerCase().includes(q);
        const matchNote = String(inv.note || inv.description || '').toLowerCase().includes(q);
        const matchItems = (inv.items || []).some((it: any) => String(it.productName || '').toLowerCase().includes(q));
        if (!matchNum && !matchCustomer && !matchNote && !matchItems) return false;
      }

      return true;
    });
  }, [
    processedInvoices,
    startDate,
    endDate,
    selectedCustomerId,
    selectedProductId,
    selectedWarehouseId,
    selectedInvoiceType,
    profitFilter,
    paymentStatusFilter,
    searchQuery
  ]);

  // Sorted Invoices
  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'date') {
        valA = a.dateInfo.timestamp;
        valB = b.dateInfo.timestamp;
      } else if (sortField === 'profit') {
        valA = a.grossProfit;
        valB = b.grossProfit;
      } else if (sortField === 'sales') {
        valA = a.netSales;
        valB = b.netSales;
      } else if (sortField === 'cost') {
        valA = a.totalCost;
        valB = b.totalCost;
      } else if (sortField === 'margin') {
        valA = a.profitMarginPercent;
        valB = b.profitMarginPercent;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredInvoices, sortField, sortOrder]);

  // Paginated Invoices
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedInvoices.slice(start, start + pageSize);
  }, [sortedInvoices, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedInvoices.length / pageSize) || 1;

  // KPI Overall Metrics
  const summaryMetrics = useMemo(() => {
    let totalGrossSales = 0;
    let totalDiscounts = 0;
    let totalNetSales = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let profitableCount = 0;
    let lossCount = 0;
    let breakEvenCount = 0;
    let totalItemsSold = 0;

    filteredInvoices.forEach(inv => {
      totalGrossSales += inv.grossSales;
      totalDiscounts += inv.totalDiscounts;
      totalNetSales += inv.netSales;
      totalCost += inv.totalCost;
      totalProfit += inv.grossProfit;

      if (inv.grossProfit > 0) profitableCount++;
      else if (inv.grossProfit < 0) lossCount++;
      else breakEvenCount++;

      (inv.items || []).forEach((it: any) => {
        totalItemsSold += (it.quantity || 0) * inv.sign;
      });
    });

    const overallMargin = totalNetSales > 0 ? (totalProfit / totalNetSales) * 100 : 0;
    const avgProfitPerInvoice = filteredInvoices.length > 0 ? totalProfit / filteredInvoices.length : 0;
    const avgInvoiceAmount = filteredInvoices.length > 0 ? totalNetSales / filteredInvoices.length : 0;

    return {
      totalInvoices: filteredInvoices.length,
      totalGrossSales,
      totalDiscounts,
      totalNetSales,
      totalCost,
      totalProfit,
      overallMargin,
      profitableCount,
      lossCount,
      breakEvenCount,
      totalItemsSold,
      avgProfitPerInvoice,
      avgInvoiceAmount
    };
  }, [filteredInvoices]);

  // Daily Aggregated Data
  const dailySummary = useMemo(() => {
    const map: Record<string, {
      jalaliDay: string;
      timestamp: number;
      invoicesCount: number;
      salesCount: number;
      returnsCount: number;
      grossSales: number;
      discounts: number;
      netSales: number;
      cost: number;
      profit: number;
      invoices: any[];
    }> = {};

    filteredInvoices.forEach(inv => {
      const dayKey = inv.dateInfo.jalaliDay;
      if (!map[dayKey]) {
        map[dayKey] = {
          jalaliDay: dayKey,
          timestamp: inv.dateInfo.timestamp,
          invoicesCount: 0,
          salesCount: 0,
          returnsCount: 0,
          grossSales: 0,
          discounts: 0,
          netSales: 0,
          cost: 0,
          profit: 0,
          invoices: []
        };
      }
      map[dayKey].invoicesCount++;
      if (inv.isReturn) map[dayKey].returnsCount++;
      else map[dayKey].salesCount++;

      map[dayKey].grossSales += inv.grossSales;
      map[dayKey].discounts += inv.totalDiscounts;
      map[dayKey].netSales += inv.netSales;
      map[dayKey].cost += inv.totalCost;
      map[dayKey].profit += inv.grossProfit;
      map[dayKey].invoices.push(inv);
    });

    return Object.values(map)
      .map(d => ({
        ...d,
        marginPercent: d.netSales > 0 ? (d.profit / d.netSales) * 100 : 0,
        avgInvoiceProfit: d.invoicesCount > 0 ? d.profit / d.invoicesCount : 0
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredInvoices]);

  // Monthly Aggregated Data
  const monthlySummary = useMemo(() => {
    const map: Record<string, {
      jalaliMonth: string;
      jalaliMonthName: string;
      timestamp: number;
      invoicesCount: number;
      daysWithSales: Set<string>;
      grossSales: number;
      discounts: number;
      netSales: number;
      cost: number;
      profit: number;
      invoices: any[];
    }> = {};

    filteredInvoices.forEach(inv => {
      const monthKey = inv.dateInfo.jalaliMonth;
      if (!map[monthKey]) {
        map[monthKey] = {
          jalaliMonth: monthKey,
          jalaliMonthName: inv.dateInfo.jalaliMonthName,
          timestamp: inv.dateInfo.timestamp,
          invoicesCount: 0,
          daysWithSales: new Set(),
          grossSales: 0,
          discounts: 0,
          netSales: 0,
          cost: 0,
          profit: 0,
          invoices: []
        };
      }
      map[monthKey].invoicesCount++;
      map[monthKey].daysWithSales.add(inv.dateInfo.jalaliDay);
      map[monthKey].grossSales += inv.grossSales;
      map[monthKey].discounts += inv.totalDiscounts;
      map[monthKey].netSales += inv.netSales;
      map[monthKey].cost += inv.totalCost;
      map[monthKey].profit += inv.grossProfit;
      map[monthKey].invoices.push(inv);
    });

    return Object.values(map)
      .map(m => {
        const workingDays = m.daysWithSales.size || 1;
        const marginPercent = m.netSales > 0 ? (m.profit / m.netSales) * 100 : 0;
        const avgDailyProfit = m.profit / workingDays;
        return {
          ...m,
          workingDaysCount: m.daysWithSales.size,
          marginPercent,
          avgDailyProfit
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredInvoices]);

  // Product Profitability Analysis
  const productProfitability = useMemo(() => {
    const map: Record<string, {
      productId: string;
      productName: string;
      category: string;
      unit: string;
      invoicesCount: number;
      quantitySold: number;
      grossRevenue: number;
      totalCost: number;
      netProfit: number;
    }> = {};

    filteredInvoices.forEach(inv => {
      (inv.items || []).forEach((item: any) => {
        const pid = String(item.productId || item.productName || 'unknown');
        if (!map[pid]) {
          const p = (products || []).find(prod => String(prod.id) === pid);
          map[pid] = {
            productId: pid,
            productName: item.productName || p?.name || 'کالای نامشخص',
            category: p?.category || 'عمومی',
            unit: item.unitName || p?.unit || 'عدد',
            invoicesCount: 0,
            quantitySold: 0,
            grossRevenue: 0,
            totalCost: 0,
            netProfit: 0
          };
        }
        map[pid].invoicesCount++;
        map[pid].quantitySold += (item.quantity || 0) * inv.sign;
        map[pid].grossRevenue += (item.netLineTotal || 0) * inv.sign;
        map[pid].totalCost += (item.lineCost || 0) * inv.sign;
        map[pid].netProfit += (item.lineProfit || 0);
      });
    });

    const totalSystemProfit = summaryMetrics.totalProfit || 1;

    return Object.values(map)
      .map(p => {
        const marginPercent = p.grossRevenue > 0 ? (p.netProfit / p.grossRevenue) * 100 : 0;
        const profitShare = totalSystemProfit > 0 ? (p.netProfit / totalSystemProfit) * 100 : 0;
        return {
          ...p,
          marginPercent,
          profitShare
        };
      })
      .sort((a, b) => b.netProfit - a.netProfit);
  }, [filteredInvoices, products, summaryMetrics.totalProfit]);

  // Customer Profitability Analysis
  const customerProfitability = useMemo(() => {
    const map: Record<string, {
      customerId: string;
      customerName: string;
      phone: string;
      invoicesCount: number;
      totalSales: number;
      totalCost: number;
      totalProfit: number;
    }> = {};

    filteredInvoices.forEach(inv => {
      const cid = String(inv.customerId || 'misc');
      if (!map[cid]) {
        map[cid] = {
          customerId: cid,
          customerName: inv.customerName,
          phone: inv.customer?.phone || inv.customer?.mobile || '-',
          invoicesCount: 0,
          totalSales: 0,
          totalCost: 0,
          totalProfit: 0
        };
      }
      map[cid].invoicesCount++;
      map[cid].totalSales += inv.netSales;
      map[cid].totalCost += inv.totalCost;
      map[cid].totalProfit += inv.grossProfit;
    });

    return Object.values(map)
      .map(c => {
        const marginPercent = c.totalSales > 0 ? (c.totalProfit / c.totalSales) * 100 : 0;
        const avgProfitPerInvoice = c.invoicesCount > 0 ? c.totalProfit / c.invoicesCount : 0;
        return {
          ...c,
          marginPercent,
          avgProfitPerInvoice
        };
      })
      .sort((a, b) => b.totalProfit - a.totalProfit);
  }, [filteredInvoices]);

  // Chart data for daily/monthly trend
  const chartData = useMemo(() => {
    // If daily view or custom short period, show daily data reversed (chronological order)
    if (dailySummary.length <= 40) {
      return [...dailySummary].reverse().map(d => ({
        name: d.jalaliDay.substring(5), // MM/DD
        fullDate: d.jalaliDay,
        sales: Math.round(d.netSales),
        cost: Math.round(d.cost),
        profit: Math.round(d.profit)
      }));
    } else {
      // Monthly view
      return [...monthlySummary].reverse().map(m => ({
        name: m.jalaliMonthName,
        fullDate: m.jalaliMonth,
        sales: Math.round(m.netSales),
        cost: Math.round(m.cost),
        profit: Math.round(m.profit)
      }));
    }
  }, [dailySummary, monthlySummary]);

  // Toggle row expand
  const toggleRowExpand = (id: string | number) => {
    const strId = String(id);
    setExpandedInvoiceIds(prev => ({ ...prev, [strId]: !prev[strId] }));
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Invoices Profit & Loss
      const invoicesData = sortedInvoices.map((inv, idx) => ({
        'ردیف': idx + 1,
        'شماره فاکتور': inv.invoiceNumber || '-',
        'تاریخ': inv.dateInfo.jalaliDay,
        'نوع سند': inv.isReturn ? 'برگشت از فروش' : 'فاکتور فروش',
        'مشتری / طرف حساب': inv.customerName,
        'تعداد اقلام': inv.itemsCount,
        'فروش ناخالص (تومان)': Math.round(inv.grossSales),
        'تخفیف (تومان)': Math.round(inv.totalDiscounts),
        'فروش خالص (تومان)': Math.round(inv.netSales),
        'بهای تمام شده (تومان)': Math.round(inv.totalCost),
        'سود ناخالص (تومان)': Math.round(inv.grossProfit),
        'درصد سود (%)': Number(inv.profitMarginPercent.toFixed(1)),
        'وضعیت': inv.isProfitable ? 'سودده' : (inv.isLoss ? 'زیان‌ده' : 'سربه‌سر')
      }));
      const wsInvoices = XLSX.utils.json_to_sheet(invoicesData);
      XLSX.utils.book_append_sheet(wb, wsInvoices, 'سود و زیان فاکتورها');

      // Sheet 2: Daily Summary
      const dailyData = dailySummary.map((d, idx) => ({
        'ردیف': idx + 1,
        'تاریخ': d.jalaliDay,
        'تعداد فاکتور': d.invoicesCount,
        'فروش ناخالص (تومان)': Math.round(d.grossSales),
        'تخفیفات (تومان)': Math.round(d.discounts),
        'فروش خالص (تومان)': Math.round(d.netSales),
        'بهای تمام شده (تومان)': Math.round(d.cost),
        'سود خالص روزانه (تومان)': Math.round(d.profit),
        'درصد سود (%)': Number(d.marginPercent.toFixed(1))
      }));
      const wsDaily = XLSX.utils.json_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, wsDaily, 'گزارش روزانه');

      // Sheet 3: Monthly Summary
      const monthlyData = monthlySummary.map((m, idx) => ({
        'ردیف': idx + 1,
        'ماه': m.jalaliMonthName,
        'تعداد فاکتور': m.invoicesCount,
        'روزهای کاری': m.workingDaysCount,
        'فروش خالص (تومان)': Math.round(m.netSales),
        'بهای تمام شده (تومان)': Math.round(m.cost),
        'سود خالص ماهانه (تومان)': Math.round(m.profit),
        'درصد سود (%)': Number(m.marginPercent.toFixed(1)),
        'میانگین سود روزانه (تومان)': Math.round(m.avgDailyProfit)
      }));
      const wsMonthly = XLSX.utils.json_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(wb, wsMonthly, 'گزارش ماهانه');

      // Sheet 4: Products Profitability
      const productData = productProfitability.map((p, idx) => ({
        'ردیف': idx + 1,
        'نام کالا': p.productName,
        'دسته‌بندی': p.category,
        'تعداد فروش': p.quantitySold,
        'واحد': p.unit,
        'درآمد فروش (تومان)': Math.round(p.grossRevenue),
        'بهای تمام شده (تومان)': Math.round(p.totalCost),
        'سود خالص (تومان)': Math.round(p.netProfit),
        'حاشیه سود (%)': Number(p.marginPercent.toFixed(1)),
        'سهم از کل سود (%)': Number(p.profitShare.toFixed(1))
      }));
      const wsProducts = XLSX.utils.json_to_sheet(productData);
      XLSX.utils.book_append_sheet(wb, wsProducts, 'سودآوری کالاها');

      XLSX.writeFile(wb, `Sales_Profit_Loss_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      if (showNotification) showNotification('success', 'فایل اکسل گزارش با موفقیت ایجاد و دانلود شد');
    } catch (e) {
      console.error(e);
      if (showNotification) showNotification('error', 'خطا در خروجی فایل اکسل');
    }
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8" dir="rtl">
        <div className="w-14 h-14 relative flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
          <TrendingUp className="w-6 h-6 text-indigo-600 animate-pulse" />
        </div>
        <div className="text-base font-black text-slate-800">در حال محاسبه و پردازش سود و زیان فاکتورها...</div>
        <p className="text-xs text-slate-500 mt-1 font-bold">بهای تمام‌شده، حاشیه‌های سود روزانه و ماهانه در حال استخراج است</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 font-sans" dir="rtl">
      {/* Print Header (Only visible in Print) */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-xl font-black text-slate-900">{storeSettings?.companyName || 'سیستم مدیریت فروش'}</h1>
        <h2 className="text-base font-bold text-slate-700 mt-1">گزارش تحلیلی فروش و سود و زیان فاکتورها</h2>
        <div className="text-xs text-slate-500 mt-2 flex justify-center gap-6">
          <span>تاریخ تهیه گزارش: {new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD HH:mm")}</span>
          <span>واحد پول: {currency}</span>
        </div>
      </div>

      {/* Top Banner & Title Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-800">
                  گزارش فروش و سود و زیان
                </h1>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  محاسبه بهای تمام‌شده کالاها، سود و زیان هر فاکتور، تجمیع روزانه و ماهانه
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchInitialData}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="بروزرسانی داده‌ها"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">بروزرسانی</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="چاپ گزارش"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>چاپ</span>
            </button>

            <button
              onClick={exportToExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>خروجی اکسل (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 mt-6 p-1.5 bg-slate-100/90 rounded-2xl overflow-x-auto">
          {[
            { id: 'invoices', label: 'سود و زیان هر فاکتور', icon: <FileText className="w-4 h-4" />, count: filteredInvoices.length },
            { id: 'daily', label: 'سود و زیان روزانه', icon: <Calendar className="w-4 h-4" />, count: dailySummary.length },
            { id: 'monthly', label: 'سود و زیان ماهانه', icon: <Clock className="w-4 h-4" />, count: monthlySummary.length },
            { id: 'products', label: 'سودآوری کالاها', icon: <Package className="w-4 h-4" />, count: productProfitability.length },
            { id: 'customers', label: 'سودآوری مشتریان', icon: <Users className="w-4 h-4" />, count: customerProfitability.length },
            { id: 'charts', label: 'نمودارها و تحلیل بصری', icon: <BarChart3 className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-emerald-700 shadow-sm shadow-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {toPersianDigits ? toPersianDigits(tab.count) : tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Net Sales */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-black">فروش خالص (درآمد)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            {formatNumFa(summaryMetrics.totalNetSales)}
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mr-1.5">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-bold mt-2 flex items-center gap-1.5">
            <span>تخفیفات: {formatNumFa(summaryMetrics.totalDiscounts)}</span>
          </div>
        </div>

        {/* Total Cost / COGS */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-black">بهای تمام‌شده (خرید)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            {formatNumFa(summaryMetrics.totalCost)}
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mr-1.5">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-bold mt-2 flex items-center gap-1.5">
            <span>تعداد اقلام: {formatNumFa(summaryMetrics.totalItemsSold)} عدد</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs relative overflow-hidden ${
          summaryMetrics.totalProfit >= 0
            ? 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border-emerald-200/80'
            : 'bg-gradient-to-br from-rose-50/70 to-red-50/40 border-rose-200/80'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-black ${summaryMetrics.totalProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
              سود ناخالص کل
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              summaryMetrics.totalProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {summaryMetrics.totalProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-black font-mono tracking-tight ${
            summaryMetrics.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {summaryMetrics.totalProfit >= 0 ? '+' : ''}{formatNumFa(summaryMetrics.totalProfit)}
            <span className="text-[10px] sm:text-xs font-bold mr-1.5">{currency}</span>
          </div>
          <div className="text-[11px] font-bold mt-2 flex items-center gap-1.5">
            <span className={summaryMetrics.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
              میانگین سود هر فاکتور: {formatNumFa(summaryMetrics.avgProfitPerInvoice)} {currency}
            </span>
          </div>
        </div>

        {/* Margin & Invoices Breakdown */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-black">حاشیه سود درصد</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-black font-mono tracking-tight ${
            summaryMetrics.overallMargin >= 0 ? 'text-purple-700' : 'text-rose-600'
          }`}>
            {summaryMetrics.overallMargin.toFixed(1)}٪
          </div>
          <div className="text-[11px] text-slate-500 font-bold mt-2 flex items-center gap-2">
            <span className="text-emerald-600 font-black">▲ {toPersianDigits ? toPersianDigits(summaryMetrics.profitableCount) : summaryMetrics.profitableCount} سودده</span>
            <span className="text-rose-600 font-black">▼ {toPersianDigits ? toPersianDigits(summaryMetrics.lossCount) : summaryMetrics.lossCount} زیان‌ده</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4 print:hidden">
        {/* Date presets */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              بازه زمانی تحلیل سود و زیان:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'امروز' },
              { id: 'yesterday', label: 'دیروز' },
              { id: 'this_week', label: 'این هفته' },
              { id: 'last_7_days', label: '۷ روز گذشته' },
              { id: 'this_month', label: 'ماه جاری' },
              { id: 'last_30_days', label: '۳۰ روز اخیر' },
              { id: 'this_season', label: 'فصل جاری' },
              { id: 'this_year', label: 'کل سال' },
              { id: 'all', label: 'همه زمان‌ها' },
              { id: 'custom', label: 'بازه دلخواه...' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyDatePreset(p.id as DatePreset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">از تاریخ:</span>
                <div className="w-44">
                  <CustomDatePicker
                    value={startDate}
                    onChange={(val: any) => setStartDate(val ? new Date(val) : null)}
                    placeholder="تاریخ شروع"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">تا تاریخ:</span>
                <div className="w-44">
                  <CustomDatePicker
                    value={endDate}
                    onChange={(val: any) => setEndDate(val ? new Date(val) : null)}
                    placeholder="تاریخ پایان"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Detailed Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="جستجو شماره فاکتور، مشتری، نام کالا..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          {/* Customer Filter */}
          <div>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer"
            >
              <option value="all">همه مشتریان</option>
              {(persons || []).map(p => (
                <option key={p.id} value={String(p.id)}>
                  {p.alias || p.name || `${p.firstName || ''} ${p.lastName || ''}`}
                </option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer"
            >
              <option value="all">همه کالاها</option>
              {(products || []).map(p => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Profit status */}
          <div>
            <select
              value={profitFilter}
              onChange={e => setProfitFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer"
            >
              <option value="all">همه وضعیت‌های سود</option>
              <option value="profit">فقط فاکتورهای سودده</option>
              <option value="loss">فقط فاکتورهای زیان‌ده</option>
              <option value="breakeven">سربه‌سر (سود صفر)</option>
            </select>
          </div>

          {/* Invoice type */}
          <div>
            <select
              value={selectedInvoiceType}
              onChange={e => setSelectedInvoiceType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer"
            >
              <option value="all">فروش و برگشت از فروش</option>
              <option value="sale">فقط فاکتورهای فروش</option>
              <option value="sale_return">فقط برگشت از فروش</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Areas based on viewMode */}

      {/* 1. Invoices View Mode */}
      {viewMode === 'invoices' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                سود و زیان هر فاکتور ({toPersianDigits ? toPersianDigits(sortedInvoices.length) : sortedInvoices.length} سند)
              </h2>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                برای مشاهده جزئیات اقلام، فی خرید و سود هر ردیف، روی سطر یا دکمه مشاهده اقلام کلیک نمایید
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span>تعداد در صفحه:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                <option value={10}>۱۰</option>
                <option value={25}>۲۵</option>
                <option value={50}>۵۰</option>
                <option value={100}>۱۰۰</option>
              </select>
            </div>
          </div>

          {sortedInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <div className="text-sm font-bold text-slate-600">هیچ فاکتور فروشی با این فیلترها یافت نشد</div>
              <p className="text-xs text-slate-400 mt-1">بازه زمانی یا گزینه‌های فیلتر را تغییر دهید</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-black text-slate-600">
                    <th className="p-3.5 w-12 text-center">#</th>
                    <th className="p-3.5 cursor-pointer select-none" onClick={() => handleSort('invoiceNumber')}>
                      <div className="flex items-center gap-1">
                        <span>ش. فاکتور</span>
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </div>
                    </th>
                    <th className="p-3.5 cursor-pointer select-none" onClick={() => handleSort('date')}>
                      <div className="flex items-center gap-1">
                        <span>تاریخ</span>
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </div>
                    </th>
                    <th className="p-3.5">مشتری / طرف حساب</th>
                    <th className="p-3.5 text-center">اقلام</th>
                    <th className="p-3.5 text-left cursor-pointer select-none" onClick={() => handleSort('sales')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>مبلغ کل فروش</span>
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </div>
                    </th>
                    <th className="p-3.5 text-left cursor-pointer select-none" onClick={() => handleSort('cost')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>بهای تمام شده</span>
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </div>
                    </th>
                    <th className="p-3.5 text-left cursor-pointer select-none" onClick={() => handleSort('profit')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>سود / زیان فاکتور</span>
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </div>
                    </th>
                    <th className="p-3.5 text-center cursor-pointer select-none" onClick={() => handleSort('margin')}>
                      <div className="flex items-center justify-center gap-1">
                        <span>حاشیه سود</span>
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </div>
                    </th>
                    <th className="p-3.5 text-center">وضعیت</th>
                    <th className="p-3.5 text-center w-28 print:hidden">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedInvoices.map((inv, idx) => {
                    const isExpanded = expandedInvoiceIds[String(inv.id)];
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                    return (
                      <React.Fragment key={inv.id}>
                        <tr className={`transition-colors hover:bg-slate-50/80 ${
                          inv.isReturn ? 'bg-rose-50/20' : ''
                        }`}>
                          <td className="p-3.5 text-center text-slate-400 font-bold font-mono">
                            {toPersianDigits ? toPersianDigits(rowNumber) : rowNumber}
                          </td>
                          <td className="p-3.5 font-bold font-mono text-slate-800">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {toPersianDigits ? toPersianDigits(inv.invoiceNumber || inv.id) : (inv.invoiceNumber || inv.id)}
                            </span>
                            {inv.isReturn && (
                              <span className="mr-1.5 text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-black">
                                برگشت
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-bold text-slate-650">
                            {formatDateDisplay ? formatDateDisplay(inv.date || inv.createdAt) : inv.dateInfo.jalaliDay}
                          </td>
                          <td className="p-3.5 font-bold text-slate-800">
                            {inv.customerName}
                          </td>
                          <td className="p-3.5 text-center text-slate-600 font-bold">
                            {toPersianDigits ? toPersianDigits(inv.itemsCount) : inv.itemsCount} قلم
                          </td>
                          <td className="p-3.5 text-left font-mono font-bold text-slate-900">
                            {formatNumFa(inv.netSales)}
                            <span className="text-[10px] text-slate-400 mr-1">{currency}</span>
                          </td>
                          <td className="p-3.5 text-left font-mono font-bold text-slate-600">
                            {formatNumFa(inv.totalCost)}
                            <span className="text-[10px] text-slate-400 mr-1">{currency}</span>
                          </td>
                          <td className="p-3.5 text-left font-mono font-black">
                            <span className={`px-2.5 py-1 rounded-xl text-xs inline-block ${
                              inv.grossProfit > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                : inv.grossProfit < 0
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {inv.grossProfit > 0 ? '+' : ''}{formatNumFa(inv.grossProfit)} {currency}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold">
                            <span className={`text-xs ${
                              inv.profitMarginPercent > 0 ? 'text-emerald-700' : (inv.profitMarginPercent < 0 ? 'text-rose-600' : 'text-slate-500')
                            }`}>
                              {inv.profitMarginPercent.toFixed(1)}٪
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            {inv.grossProfit > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                سودده
                              </span>
                            ) : inv.grossProfit < 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                زیان‌ده
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                سربه‌سر
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center print:hidden">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => toggleRowExpand(inv.id)}
                                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                  isExpanded
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                                title={isExpanded ? 'بستن جزئیات' : 'مشاهده اقلام و بهای خرید'}
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                <span className="text-[10px]">اقلام</span>
                              </button>

                              {setViewingInvoice && (
                                <button
                                  onClick={() => setViewingInvoice(inv)}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all cursor-pointer"
                                  title="مشاهده فاکتور کامل"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Item Breakdown Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 border-b border-slate-200">
                            <td colSpan={11} className="p-4 sm:p-5">
                              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                                <div className="text-xs font-black text-slate-800 mb-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-emerald-600" />
                                    <span>جزئیات اقلام فاکتور و محاسبه سود به تفکیک ردیف‌ها:</span>
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-500">
                                    انبار: {inv.warehouseName}
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-right text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-100 text-[11px] text-slate-500 font-bold">
                                        <th className="py-2 pr-2">نام کالا</th>
                                        <th className="py-2 text-center">مقدار</th>
                                        <th className="py-2 text-left">فی فروش</th>
                                        <th className="py-2 text-center">تخفیف</th>
                                        <th className="py-2 text-left">مجموع فروش</th>
                                        <th className="py-2 text-left">فی خرید (بهای تمام‌شده)</th>
                                        <th className="py-2 text-left">بهای تمام‌شده کل</th>
                                        <th className="py-2 text-left">سود ردیف</th>
                                        <th className="py-2 text-center">حاشیه سود</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {(inv.items || []).map((it: any, iIdx: number) => (
                                        <tr key={iIdx} className="hover:bg-slate-50/50">
                                          <td className="py-2.5 pr-2 font-bold text-slate-800">
                                            {it.productName}
                                            {!it.hasCostInfo && (
                                              <span className="mr-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold" title="قیمت خرید برای این کالا تعریف نشده است">
                                                (بدون فی خرید)
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2.5 text-center font-bold text-slate-700">
                                            {toPersianDigits ? toPersianDigits(it.quantity) : it.quantity} {it.unitName}
                                          </td>
                                          <td className="py-2.5 text-left font-mono text-slate-800">
                                            {formatNumFa(it.unitPrice)}
                                          </td>
                                          <td className="py-2.5 text-center font-mono text-slate-500">
                                            {it.discountPercent > 0 ? `${it.discountPercent}٪` : '-'}
                                          </td>
                                          <td className="py-2.5 text-left font-mono font-bold text-slate-900">
                                            {formatNumFa(it.netLineTotal)}
                                          </td>
                                          <td className="py-2.5 text-left font-mono text-slate-600">
                                            {formatNumFa(it.unitCost)}
                                          </td>
                                          <td className="py-2.5 text-left font-mono text-slate-600">
                                            {formatNumFa(it.lineCost)}
                                          </td>
                                          <td className={`py-2.5 text-left font-mono font-bold ${
                                            it.lineProfit > 0 ? 'text-emerald-700' : (it.lineProfit < 0 ? 'text-rose-700' : 'text-slate-500')
                                          }`}>
                                            {it.lineProfit > 0 ? '+' : ''}{formatNumFa(it.lineProfit)}
                                          </td>
                                          <td className={`py-2.5 text-center font-mono font-bold ${
                                            it.lineProfitMargin > 0 ? 'text-emerald-700' : (it.lineProfitMargin < 0 ? 'text-rose-700' : 'text-slate-500')
                                          }`}>
                                            {it.lineProfitMargin.toFixed(1)}٪
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 print:hidden">
              <div>
                صفحه {toPersianDigits ? toPersianDigits(currentPage) : currentPage} از {toPersianDigits ? toPersianDigits(totalPages) : totalPages}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>قبلی</span>
                </button>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
                >
                  <span>بعدی</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Daily Summary View Mode */}
      {viewMode === 'daily' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                گزارش تجمیعی سود و زیان روزانه ({toPersianDigits ? toPersianDigits(dailySummary.length) : dailySummary.length} روز کاری)
              </h2>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                مجموع فروش، بهای تمام‌شده و سود خالص هر روز در بازه زمانی انتخابی
              </p>
            </div>
          </div>

          {dailySummary.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <div className="text-sm font-bold text-slate-600">اطلاعاتی در این بازه زمانی موجود نیست</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-black text-slate-600">
                    <th className="p-3.5 w-12 text-center">#</th>
                    <th className="p-3.5">تاریخ روز</th>
                    <th className="p-3.5 text-center">تعداد فاکتور</th>
                    <th className="p-3.5 text-left">فروش ناخالص</th>
                    <th className="p-3.5 text-left">تخفیفات روز</th>
                    <th className="p-3.5 text-left">فروش خالص</th>
                    <th className="p-3.5 text-left">بهای تمام‌شده</th>
                    <th className="p-3.5 text-left">سود خالص روزانه</th>
                    <th className="p-3.5 text-center">حاشیه سود</th>
                    <th className="p-3.5 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {dailySummary.map((d, idx) => (
                    <tr key={d.jalaliDay} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 text-center text-slate-400 font-bold font-mono">
                        {toPersianDigits ? toPersianDigits(idx + 1) : idx + 1}
                      </td>
                      <td className="p-3.5 font-bold font-mono text-slate-800">
                        {toPersianDigits ? toPersianDigits(d.jalaliDay) : d.jalaliDay}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {toPersianDigits ? toPersianDigits(d.invoicesCount) : d.invoicesCount}
                        {d.returnsCount > 0 && (
                          <span className="text-[10px] text-rose-600 mr-1">({d.returnsCount} برگشتی)</span>
                        )}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-slate-800">
                        {formatNumFa(d.grossSales)}
                      </td>
                      <td className="p-3.5 text-left font-mono text-slate-500">
                        {formatNumFa(d.discounts)}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-slate-900">
                        {formatNumFa(d.netSales)}
                      </td>
                      <td className="p-3.5 text-left font-mono text-slate-600">
                        {formatNumFa(d.cost)}
                      </td>
                      <td className="p-3.5 text-left font-mono font-black">
                        <span className={`px-2.5 py-1 rounded-xl text-xs inline-block ${
                          d.profit > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            : d.profit < 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {d.profit > 0 ? '+' : ''}{formatNumFa(d.profit)} {currency}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold">
                        <span className={d.marginPercent >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {d.marginPercent.toFixed(1)}٪
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {d.profit > 0 ? (
                          <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            سودده
                          </span>
                        ) : d.profit < 0 ? (
                          <span className="text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                            زیان‌ده
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            سربه‌سر
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Monthly Summary View Mode */}
      {viewMode === 'monthly' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                گزارش تجمیعی سود و زیان ماهانه
              </h2>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                بررسی روند عملکرد فروش، درآمد و سودآوری ماه به ماه
              </p>
            </div>
          </div>

          {monthlySummary.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <div className="text-sm font-bold text-slate-600">اطلاعاتی در این بازه زمانی موجود نیست</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-black text-slate-600">
                    <th className="p-3.5 w-12 text-center">#</th>
                    <th className="p-3.5">ماه و سال</th>
                    <th className="p-3.5 text-center">روزهای کاری</th>
                    <th className="p-3.5 text-center">تعداد فاکتور</th>
                    <th className="p-3.5 text-left">فروش خالص</th>
                    <th className="p-3.5 text-left">بهای تمام‌شده</th>
                    <th className="p-3.5 text-left">سود خالص ماه</th>
                    <th className="p-3.5 text-center">حاشیه سود</th>
                    <th className="p-3.5 text-left">میانگین سود روزانه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {monthlySummary.map((m, idx) => (
                    <tr key={m.jalaliMonth} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 text-center text-slate-400 font-bold font-mono">
                        {toPersianDigits ? toPersianDigits(idx + 1) : idx + 1}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{m.jalaliMonthName}</span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {toPersianDigits ? toPersianDigits(m.workingDaysCount) : m.workingDaysCount} روز
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {toPersianDigits ? toPersianDigits(m.invoicesCount) : m.invoicesCount}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-slate-900">
                        {formatNumFa(m.netSales)}
                      </td>
                      <td className="p-3.5 text-left font-mono text-slate-600">
                        {formatNumFa(m.cost)}
                      </td>
                      <td className="p-3.5 text-left font-mono font-black">
                        <span className={`px-2.5 py-1 rounded-xl text-xs inline-block ${
                          m.profit > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            : m.profit < 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {m.profit > 0 ? '+' : ''}{formatNumFa(m.profit)} {currency}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold">
                        <span className={m.marginPercent >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {m.marginPercent.toFixed(1)}٪
                        </span>
                      </td>
                      <td className="p-3.5 text-left font-mono text-slate-700">
                        {formatNumFa(m.avgDailyProfit)} {currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Products Profitability View Mode */}
      {viewMode === 'products' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                سودآوری کالاها (مرتب‌شده بر اساس بیشترین سود)
              </h2>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                کدام کالاها بیشترین درآمد و بالاترین حاشیه سود خالص را برای کسب‌وکار رقم زده‌اند
              </p>
            </div>
          </div>

          {productProfitability.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <div className="text-sm font-bold text-slate-600">اطلاعات فروش کالا در این بازه یافت نشد</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-black text-slate-600">
                    <th className="p-3.5 w-12 text-center">رتبه</th>
                    <th className="p-3.5">نام کالا</th>
                    <th className="p-3.5">دسته‌بندی</th>
                    <th className="p-3.5 text-center">تعداد فروخته‌شده</th>
                    <th className="p-3.5 text-left">مجموع فروش</th>
                    <th className="p-3.5 text-left">بهای تمام‌شده</th>
                    <th className="p-3.5 text-left">سود خالص کالا</th>
                    <th className="p-3.5 text-center">حاشیه سود</th>
                    <th className="p-3.5 text-center">سهم از کل سود</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {productProfitability.map((p, idx) => (
                    <tr key={p.productId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 text-center font-mono font-bold text-slate-400">
                        {toPersianDigits ? toPersianDigits(idx + 1) : idx + 1}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {p.productName}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {toPersianDigits ? toPersianDigits(p.quantitySold) : p.quantitySold} {p.unit}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-slate-900">
                        {formatNumFa(p.grossRevenue)}
                      </td>
                      <td className="p-3.5 text-left font-mono text-slate-600">
                        {formatNumFa(p.totalCost)}
                      </td>
                      <td className="p-3.5 text-left font-mono font-black">
                        <span className={`px-2.5 py-1 rounded-xl text-xs inline-block ${
                          p.netProfit > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            : p.netProfit < 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.netProfit > 0 ? '+' : ''}{formatNumFa(p.netProfit)} {currency}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold">
                        <span className={p.marginPercent >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {p.marginPercent.toFixed(1)}٪
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-700">
                        {p.profitShare > 0 ? `${p.profitShare.toFixed(1)}٪` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Customers Profitability View Mode */}
      {viewMode === 'customers' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                سودآوری به تفکیک اشخاص و مشتریان
              </h2>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                مشتریانی که بیشترین سود ناخالص را برای شرکت داشته‌اند
              </p>
            </div>
          </div>

          {customerProfitability.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <div className="text-sm font-bold text-slate-600">اطلاعاتی در این بازه زمانی موجود نیست</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-black text-slate-600">
                    <th className="p-3.5 w-12 text-center">رتبه</th>
                    <th className="p-3.5">نام مشتری / طرف حساب</th>
                    <th className="p-3.5">شماره تماس</th>
                    <th className="p-3.5 text-center">تعداد فاکتور</th>
                    <th className="p-3.5 text-left">مجموع خرید</th>
                    <th className="p-3.5 text-left">بهای تمام‌شده</th>
                    <th className="p-3.5 text-left">سود ناخالص مشتری</th>
                    <th className="p-3.5 text-center">حاشیه سود</th>
                    <th className="p-3.5 text-left">میانگین سود هر فاکتور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {customerProfitability.map((c, idx) => (
                    <tr key={c.customerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 text-center font-mono font-bold text-slate-400">
                        {toPersianDigits ? toPersianDigits(idx + 1) : idx + 1}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {c.customerName}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">
                        {c.phone}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {toPersianDigits ? toPersianDigits(c.invoicesCount) : c.invoicesCount}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-slate-900">
                        {formatNumFa(c.totalSales)}
                      </td>
                      <td className="p-3.5 text-left font-mono text-slate-600">
                        {formatNumFa(c.totalCost)}
                      </td>
                      <td className="p-3.5 text-left font-mono font-black">
                        <span className={`px-2.5 py-1 rounded-xl text-xs inline-block ${
                          c.totalProfit > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                            : c.totalProfit < 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {c.totalProfit > 0 ? '+' : ''}{formatNumFa(c.totalProfit)} {currency}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold">
                        <span className={c.marginPercent >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {c.marginPercent.toFixed(1)}٪
                        </span>
                      </td>
                      <td className="p-3.5 text-left font-mono text-slate-700">
                        {formatNumFa(c.avgProfitPerInvoice)} {currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. Visual Charts View Mode */}
      {viewMode === 'charts' && (
        <div className="space-y-6">
          {/* Main Trend Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  نمودار مقایسه‌ای فروش، بهای تمام‌شده و سود خالص در طول زمان
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  مقایسه حجم فروش (آبی)، بهای تمام شده کالاها (زرد) و سود ناخالص واقعی (سبز)
                </p>
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="p-12 text-center text-slate-400">اطلاعاتی جهت ترسیم نمودار یافت نشد</div>
            ) : (
              <div className="h-80 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={val => formatNumFa(val)} />
                    <Tooltip
                      formatter={(val: any) => [`${formatNumFa(val)} ${currency}`, '']}
                      labelFormatter={(lbl: any) => `تاریخ: ${lbl}`}
                      contentStyle={{ direction: 'rtl', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    />
                    <Legend
                      formatter={(val) => {
                        if (val === 'sales') return 'فروش خالص';
                        if (val === 'cost') return 'بهای تمام‌شده (خرید)';
                        if (val === 'profit') return 'سود ناخالص';
                        return val;
                      }}
                    />
                    <Area type="monotone" dataKey="sales" name="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#salesGrad)" strokeWidth={2} />
                    <Line type="monotone" dataKey="cost" name="cost" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="profit" name="profit" stroke="#10b981" fillOpacity={1} fill="url(#profitGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Secondary Grid: Top Products vs Top Customers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Products Bar Chart */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
              <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                ۵ کالای پرسود دوره
              </h4>
              <div className="space-y-3">
                {productProfitability.slice(0, 5).map((p, idx) => {
                  const maxProfit = productProfitability[0]?.netProfit || 1;
                  const barWidth = Math.max(5, Math.min(100, (p.netProfit / maxProfit) * 100));

                  return (
                    <div key={p.productId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800 truncate max-w-[200px]">{p.productName}</span>
                        <span className="text-emerald-700 font-mono font-black">{formatNumFa(p.netProfit)} {currency}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Customers Bar Chart */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
              <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                ۵ مشتری پرسود دوره
              </h4>
              <div className="space-y-3">
                {customerProfitability.slice(0, 5).map((c, idx) => {
                  const maxProfit = customerProfitability[0]?.totalProfit || 1;
                  const barWidth = Math.max(5, Math.min(100, (c.totalProfit / maxProfit) * 100));

                  return (
                    <div key={c.customerId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800 truncate max-w-[200px]">{c.customerName}</span>
                        <span className="text-indigo-700 font-mono font-black">{formatNumFa(c.totalProfit)} {currency}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-indigo-500 to-purple-400 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
