import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import DateObjectModule from "react-date-object";
const DateObject = (DateObjectModule as any).default || DateObjectModule;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {
  Search, Plus, FileText, Download, CheckCircle, Edit2, Trash2, Printer, Check, X,
  ArrowUpRight, ArrowDownRight, ArrowRight, CornerDownLeft, Package, User, Clock,
  CheckCircle2, ChevronLeft, ChevronRight, Share2, Eye, Truck, MoreVertical,
  DollarSign, RefreshCw, XCircle, Warehouse, TrendingUp, TrendingDown,
  RotateCcw, AlertCircle, Calendar as CalendarIcon, Tag, Wallet, Ban, Percent,
  ArrowUpDown, Filter, ChevronDown, ChevronUp, CheckCircle as CheckCircleIcon, Building2,
  ShoppingCart, Phone, LayoutGrid, LayoutList, SlidersHorizontal, Barcode,
  Layers, Info, CalendarDays, ExternalLink
} from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import { convertToGregorian, formatDateDisplay, formatInvoiceDate, toPersianDigits, addCommas, formatNumber, getActiveStoreSettings } from "../../utils/format";
import { formatDecimalForExcel } from "../../utils/exportUtils";
import { getUnitRatioDirection, convertQuantityToBaseUnit, convertPriceToBaseUnit } from "../../utils/unitConversion";
import { safePrint } from "../../utils/printHelper";
import InvoiceRowActionsDropdown from "./InvoiceRowActionsDropdown";

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'this_month' | 'last_30_days' | 'this_year' | 'all' | 'custom';

export default function InvoicesList(props: any) {
  const {
    invoices = [],
    invoiceSearchQuery = '',
    setInvoiceSearchQuery,
    persons = [],
    activeTab = 'list_sale',
    setActiveTab,
    purchaseFilter,
    setPurchaseFilter,
    formatCurrency = (v: any) => formatNumber(v, storeSettings),
    getPersonDisplayName,
    formatDateDisplay: propFormatDateDisplay,
    calculateInvoiceTotal,
    numToPersianWords,
    setInvoiceWarehouseId,
    warehouses = [],
    setCustomerId,
    handlePrintInvoice,
    getRoleName,
    setEditingInvoiceId,
    handleDeleteInvoice,
    handleConvertProformaToSale,
    handlePayPurchase,
    handleReturnSale,
    handleReturnPurchase,
    storeSettings = {},
    invoiceCurrentPage = 1,
    setInvoiceCurrentPage,
    invoicePageSize = 20,
    setInvoicePageSize,
    toPersianDigits: propToPersianDigits = toPersianDigits,
    listFilter,
    setListFilter,
    invoiceGroupMode = 'none',
    setInvoiceGroupMode,
    List,
    clearDraft,
    setInvoiceType,
    setWarehouseOperationType,
    Calendar,
    renderPersonLink = (id: any, name: any) => <span>{name || 'نامشخص'}</span>,
    products = [],
    setPricingWizardItems,
    setPricingWizardInvoice,
    setSuccessMsg,
    setReceiptPersonId,
    setViewingInvoice,
    handleEditInvoiceAction,
    handleVoidInvoice,
    handleFastWarehouseReceipt,
    fetchInvoices,
    ...rest
  } = props;

  const currency = storeSettings?.currency || 'تومان';

  // Sub-filter tabs state
  const [invoiceTabFilter, setInvoiceTabFilter] = useState<string>('all');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');
  
  // View mode: 'table' (optimized compact table with no horizontal scroll) or 'cards' (responsive grid)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Expanded row id for inline accordion breakdown
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Advanced filters toggle to avoid visual clutter
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Ensure invoices are loaded on mount if empty
  useEffect(() => {
    if ((!invoices || invoices.length === 0) && typeof fetchInvoices === 'function') {
      fetchInvoices();
    }
  }, [invoices?.length, fetchInvoices]);

  // Date range presets state
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<any>(null);
  const [endDate, setEndDate] = useState<any>(null);

  // Fast warehouse receipt modal
  const [fastReceiptInvoice, setFastReceiptInvoice] = useState<any>(null);
  const [fastReceiptWarehouseId, setFastReceiptWarehouseId] = useState<string>('');

  // Reset tab filter on activeTab change
  useEffect(() => {
    setInvoiceTabFilter('all');
    setSelectedPersonFilter('all');
    setSelectedPaymentStatus('all');
    setSelectedWarehouseFilter('all');
    setExpandedInvoiceId(null);
    if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
  }, [activeTab]);

  // Apply date preset
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
    const now = new Date();
    const dJalali = new DateObject({ date: now, calendar: persian, locale: persian_fa });
    const jYear = dJalali.year;
    const jMonth = dJalali.month.number;
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
      const dayOfWeek = dJalali.weekDay.index;
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

  // Helper to extract timestamp from invoice date
  const getInvoiceTimestamp = (inv: any): number => {
    const raw = inv.date || inv.jalaliDate || inv.createdAt;
    if (!raw) return 0;
    try {
      const str = String(raw).trim();
      const iso = convertToGregorian(str);
      const t = new Date(iso).getTime();
      return isNaN(t) ? 0 : t;
    } catch {
      return 0;
    }
  };

  // Warehouse name resolver
  const getDocWarehouseName = (inv: any): string => {
    if (!inv) return "نامشخص";
    let targetWhId = inv.warehouseId || inv.targetWarehouseId || inv.toWarehouseId || inv.destinationWarehouseId || inv.fromWarehouseId;
    if (!targetWhId && Array.isArray(inv.items) && inv.items.length > 0) {
      const itemWhIds = inv.items
        .map((it: any) => it?.warehouseId)
        .filter((id: any) => id !== undefined && id !== null && id !== "");
      const uniqueItemWhIds = Array.from(new Set(itemWhIds.map((id: any) => String(id))));
      if (uniqueItemWhIds.length === 1) {
        targetWhId = uniqueItemWhIds[0];
      } else if (uniqueItemWhIds.length > 1) {
        const foundNames = uniqueItemWhIds
          .map((id: any) => {
            const w = (warehouses || []).find((wh: any) => String(wh.id) === String(id));
            return w?.name || w?.title;
          })
          .filter(Boolean);
        if (foundNames.length > 0) return foundNames.join("، ");
      }
    }
    if (!targetWhId && inv.sourceInvoiceId) {
      const sourceInv = (invoices || []).find((si: any) => String(si.id) === String(inv.sourceInvoiceId));
      if (sourceInv) {
        targetWhId = sourceInv.warehouseId || sourceInv.items?.find((it: any) => it?.warehouseId)?.warehouseId;
      }
    }
    if (targetWhId) {
      const wh = (warehouses || []).find((w: any) => String(w.id) === String(targetWhId));
      if (wh) return wh.name || wh.title || `انبار ${wh.id}`;
    }
    const activeWarehouses = (warehouses || []).filter((w: any) => w.isActive !== false);
    if (activeWarehouses.length === 1) {
      return activeWarehouses[0].name || activeWarehouses[0].title || "نامشخص";
    }
    return "نامشخص";
  };

  // Warehouse fulfillment status resolver
  const getInvoiceWarehouseStatus = (inv: any): 'pending' | 'partial' | 'completed' => {
    if (!inv) return "pending";
    const isReceiptType = inv.type === "purchase" || inv.type === "sale_return";
    const docType = isReceiptType ? "warehouse_receipt" : "warehouse_remittance";

    const linkedDocs = (invoices || []).filter(
      (wh: any) =>
        wh.type === docType &&
        wh.sourceInvoiceId?.toString() === inv.id?.toString() &&
        wh.status !== "voided" &&
        !wh.isDeleted,
    );

    if (!linkedDocs || linkedDocs.length === 0) return "pending";

    const processedAmounts: Record<string, number> = {};
    let totalProcessedQty = 0;

    linkedDocs.forEach((doc: any) => {
      if (doc.items) {
        doc.items.forEach((item: any) => {
          const key = String(item.productId || item.productName || "");
          if (!key) return;
          const qty = Number(item.quantity) || 0;
          processedAmounts[key] = (processedAmounts[key] || 0) + qty;
          totalProcessedQty += qty;
        });
      }
    });

    if (totalProcessedQty <= 0) return "pending";

    const invItems = inv.items || [];
    let hasRemaining = false;
    let hasPhysicalItems = false;

    for (const it of invItems) {
      const prod = (products || []).find(
        (p: any) => p.id?.toString() === it.productId?.toString(),
      );
      if (prod?.type === "service") continue;

      hasPhysicalItems = true;
      const key = String(it.productId || it.productName || "");
      const processed = key ? processedAmounts[key] || 0 : 0;
      const required = Number(it.quantity) || 0;

      if (required - processed > 0.0001) {
        hasRemaining = true;
      }
    }

    if (!hasPhysicalItems) return "completed";
    return hasRemaining ? "partial" : "completed";
  };

  const isInvoiceOverdue = (dueDateStr: any) => {
    if (!dueDateStr) return false;
    try {
      const gregStr = convertToGregorian(dueDateStr);
      const target = new Date(gregStr).getTime();
      if (isNaN(target)) return false;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return target < now.getTime();
    } catch {
      return false;
    }
  };

  // Dynamic Page Configuration based on activeTab
  const pageConfig = useMemo(() => {
    switch (activeTab) {
      case 'list_sale':
        return {
          title: 'فاکتورهای فروش',
          subtitle: 'فاکتورهای فروش، وضعیت تسویه حساب، حواله خروج انبار و وصول مطالبات',
          themeGradient: 'from-emerald-600 to-teal-500',
          accentColor: 'emerald',
          mainIcon: <ShoppingCart className="w-5 h-5 text-white" />,
          createBtnLabel: 'ثبت فاکتور فروش',
          createTab: 'create_sale',
          personRoleLabel: 'مشتری',
          totalLabel: 'فروش کل',
          paidLabel: 'دریافت شده',
          unpaidLabel: 'مانده از مشتریان',
        };
      case 'list_purchase':
        return {
          title: 'فاکتورهای خرید',
          subtitle: 'فاکتورهای خرید، تامین‌کنندگان، تسویه حساب‌های نقدی/چکی و رسید انبار',
          themeGradient: 'from-blue-600 to-indigo-600',
          accentColor: 'indigo',
          mainIcon: <Package className="w-5 h-5 text-white" />,
          createBtnLabel: 'ثبت فاکتور خرید',
          createTab: 'create_purchase',
          personRoleLabel: 'تامین‌کننده / فروشنده',
          totalLabel: 'خرید کل',
          paidLabel: 'پرداخت شده',
          unpaidLabel: 'بدهی به تامین‌کنندگان',
        };
      case 'list_sale_return':
        return {
          title: 'برگشت از فروش',
          subtitle: 'اقلام مرجوعی مشتریان، اسناد بستانکاری و مدیریت ورود مجدد کالا به انبار',
          themeGradient: 'from-amber-600 to-orange-500',
          accentColor: 'amber',
          mainIcon: <RotateCcw className="w-5 h-5 text-white" />,
          createBtnLabel: 'ثبت برگشت از فروش',
          createTab: 'create_sale_return',
          personRoleLabel: 'مشتری',
          totalLabel: 'کل مرجوعی فروش',
          paidLabel: 'استرداد شده',
          unpaidLabel: 'مانده بستانکاری',
        };
      case 'list_purchase_return':
        return {
          title: 'برگشت از خرید',
          subtitle: 'کالاهای مرجوع شده به تامین‌کنندگان، مطالبات و حواله خروج کالا از انبار',
          themeGradient: 'from-rose-600 to-pink-600',
          accentColor: 'rose',
          mainIcon: <Truck className="w-5 h-5 text-white" />,
          createBtnLabel: 'ثبت برگشت از خرید',
          createTab: 'create_purchase_return',
          personRoleLabel: 'تامین‌کننده',
          totalLabel: 'کل مرجوعی خرید',
          paidLabel: 'وجه بازپس‌گرفته',
          unpaidLabel: 'مانده طلب از تامین‌کننده',
        };
      case 'list_warehouse_docs':
      default:
        return {
          title: 'اسناد انبارداری (رسید و حواله)',
          subtitle: 'رسیدهای ورود کالا، حواله‌های خروج و جابجایی موجودی انبارها',
          themeGradient: 'from-purple-600 to-indigo-600',
          accentColor: 'purple',
          mainIcon: <Warehouse className="w-5 h-5 text-white" />,
          createBtnLabel: 'ثبت رسید انبار',
          createTab: 'create_warehouse_doc',
          personRoleLabel: 'طرف‌حساب',
          totalLabel: 'کل ارزش اسناد',
          paidLabel: 'اسناد قطعی',
          unpaidLabel: 'اسناد در جریان',
        };
    }
  }, [activeTab]);

  // Base invoices list for this tab before filters
  const baseInvoices = useMemo(() => {
    return (invoices || []).filter((i: any) => {
      if (!i || i.isDeleted) return false;
      const type = String(i.type || 'sale').toLowerCase().trim();
      if (activeTab === "list_sale") {
        return type === "sale" || type === "sales" || type === "proforma";
      } else if (activeTab === "list_purchase") {
        return type === "purchase" || type === "purchases";
      } else if (activeTab === "list_sale_return") {
        return type === "sale_return" || type === "sales_return";
      } else if (activeTab === "list_purchase_return") {
        return type === "purchase_return" || type === "purchases_return";
      } else if (activeTab === "list_warehouse_docs") {
        return type === "warehouse_receipt" || type === "warehouse_remittance";
      }
      return false;
    });
  }, [invoices, activeTab]);

  // Filtered invoices list
  const filteredInvoicesList = useMemo(() => {
    return baseInvoices.filter((inv: any) => {
      // 1. Warehouse status / Tab filter
      const whStatus = getInvoiceWarehouseStatus(inv);
      const isRemittedOrReceived = whStatus !== "pending";

      if (activeTab === "list_sale") {
        if (invoiceTabFilter === "proforma" && inv.type !== "proforma") return false;
        if (invoiceTabFilter === "sale" && inv.type !== "sale") return false;
        if (invoiceTabFilter === "remitted" && (inv.type !== "sale" || !isRemittedOrReceived)) return false;
        if (invoiceTabFilter === "pending_remit" && (inv.type !== "sale" || isRemittedOrReceived)) return false;
        if (invoiceTabFilter === "paid" && (inv.type !== "sale" || inv.paymentStatus !== "paid")) return false;
        if (invoiceTabFilter === "unpaid" && (inv.type !== "sale" || (inv.paymentStatus !== "unpaid" && inv.paymentStatus !== "partial"))) return false;
      } else if (activeTab === "list_purchase") {
        if (invoiceTabFilter === "received" && !isRemittedOrReceived) return false;
        if (invoiceTabFilter === "pending_receive" && isRemittedOrReceived) return false;
        if (invoiceTabFilter === "paid" && inv.paymentStatus !== "paid") return false;
        if (invoiceTabFilter === "unpaid" && (inv.paymentStatus !== "unpaid" && inv.paymentStatus !== "partial")) return false;
      } else if (activeTab === "list_sale_return") {
        if (invoiceTabFilter === "paid" && inv.paymentStatus !== "paid") return false;
        if (invoiceTabFilter === "unpaid" && (inv.paymentStatus !== "unpaid" && inv.paymentStatus !== "partial")) return false;
        if (invoiceTabFilter === "received" && !isRemittedOrReceived) return false;
        if (invoiceTabFilter === "pending_receive" && isRemittedOrReceived) return false;
      } else if (activeTab === "list_purchase_return") {
        if (invoiceTabFilter === "paid" && inv.paymentStatus !== "paid") return false;
        if (invoiceTabFilter === "unpaid" && (inv.paymentStatus !== "unpaid" && inv.paymentStatus !== "partial")) return false;
        if (invoiceTabFilter === "remitted" && !isRemittedOrReceived) return false;
        if (invoiceTabFilter === "pending_remit" && isRemittedOrReceived) return false;
      } else if (activeTab === "list_warehouse_docs") {
        if (listFilter === "receipt" && inv.type !== "warehouse_receipt") return false;
        if (listFilter === "remittance" && inv.type !== "warehouse_remittance") return false;
      }

      // 2. Person filter
      if (selectedPersonFilter !== "all") {
        if (String(inv.customerId || inv.personId) !== String(selectedPersonFilter)) return false;
      }

      // 3. Payment Status Filter
      if (selectedPaymentStatus !== "all") {
        if (selectedPaymentStatus === "paid" && inv.paymentStatus !== "paid") return false;
        if (selectedPaymentStatus === "partial" && inv.paymentStatus !== "partial") return false;
        if (selectedPaymentStatus === "unpaid" && inv.paymentStatus !== "unpaid") return false;
      }

      // 4. Warehouse filter
      if (selectedWarehouseFilter !== "all") {
        const whId = inv.warehouseId || inv.targetWarehouseId || inv.toWarehouseId;
        if (String(whId) !== String(selectedWarehouseFilter)) return false;
      }

      // 5. Date filter
      if (startDate || endDate) {
        const t = getInvoiceTimestamp(inv);
        if (t > 0) {
          if (startDate && t < new Date(startDate).getTime()) return false;
          if (endDate && t > new Date(endDate).getTime()) return false;
        }
      }

      // 6. Search query
      if (invoiceSearchQuery) {
        const term = invoiceSearchQuery.toLowerCase().trim();
        const p = persons.find(
          (per: any) => String(per.id) === String(inv.customerId || inv.personId)
        );
        const pName = (p?.alias || p?.name || `${p?.firstName || ''} ${p?.lastName || ''}`).toLowerCase();
        const invNum = String(inv.invoiceNumber || '').toLowerCase();
        const sellNum = String(inv.sellerInvoiceNumber || '').toLowerCase();
        const note = String(inv.note || inv.title || '').toLowerCase();
        const whName = getDocWarehouseName(inv).toLowerCase();

        const matches =
          pName.includes(term) ||
          invNum.includes(term) ||
          sellNum.includes(term) ||
          note.includes(term) ||
          whName.includes(term);

        if (!matches) return false;
      }

      return true;
    });
  }, [
    baseInvoices, activeTab, invoiceTabFilter, listFilter, selectedPersonFilter,
    selectedPaymentStatus, selectedWarehouseFilter, startDate, endDate,
    invoiceSearchQuery, persons
  ]);

  // Summary Metrics calculations
  const summaryMetrics = useMemo(() => {
    let totalGross = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let completedWarehouseCount = 0;
    let totalItems = 0;

    filteredInvoicesList.forEach((inv: any) => {
      const tot = Number(inv.totalAmount || 0);
      const paid = Number(inv.paidAmount || 0);
      const rem = Math.max(tot - paid, 0);

      totalGross += tot;
      totalPaid += paid;
      totalRemaining += rem;

      if (inv.paymentStatus === 'paid') paidCount++;
      else unpaidCount++;

      if (getInvoiceWarehouseStatus(inv) === 'completed') {
        completedWarehouseCount++;
      }

      if (Array.isArray(inv.items)) {
        totalItems += inv.items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0);
      }
    });

    const count = filteredInvoicesList.length;
    const avgInvoiceAmount = count > 0 ? totalGross / count : 0;
    const settlementPercent = totalGross > 0 ? (totalPaid / totalGross) * 100 : 0;
    const fulfillmentPercent = count > 0 ? (completedWarehouseCount / count) * 100 : 0;

    return {
      totalGross,
      totalPaid,
      totalRemaining,
      paidCount,
      unpaidCount,
      completedWarehouseCount,
      totalItems,
      count,
      avgInvoiceAmount,
      settlementPercent,
      fulfillmentPercent,
    };
  }, [filteredInvoicesList]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(invoiceSearchQuery) ||
      invoiceTabFilter !== 'all' ||
      selectedPersonFilter !== 'all' ||
      selectedPaymentStatus !== 'all' ||
      selectedWarehouseFilter !== 'all' ||
      datePreset !== 'all' ||
      Boolean(startDate) ||
      Boolean(endDate)
    );
  }, [invoiceSearchQuery, invoiceTabFilter, selectedPersonFilter, selectedPaymentStatus, selectedWarehouseFilter, datePreset, startDate, endDate]);

  const clearAllFilters = () => {
    if (setInvoiceSearchQuery) setInvoiceSearchQuery('');
    setInvoiceTabFilter('all');
    setSelectedPersonFilter('all');
    setSelectedPaymentStatus('all');
    setSelectedWarehouseFilter('all');
    setDatePreset('all');
    setStartDate(null);
    setEndDate(null);
    if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
  };

  // Pagination calculation
  const invoiceTotalPages = Math.max(1, Math.ceil(filteredInvoicesList.length / invoicePageSize));
  const invoiceSafeCurrentPage = Math.max(1, Math.min(invoiceCurrentPage, invoiceTotalPages));
  const paginatedFilteredInvoicesList = useMemo(() => {
    return filteredInvoicesList.slice(
      (invoiceSafeCurrentPage - 1) * invoicePageSize,
      invoiceSafeCurrentPage * invoicePageSize,
    );
  }, [filteredInvoicesList, invoiceSafeCurrentPage, invoicePageSize]);

  // Grouping calculation
  const groupedInvoices = useMemo(() => {
    if (invoiceGroupMode === "none") {
      return [{ groupName: "همه", invoices: paginatedFilteredInvoicesList }];
    }
    const groupMap = new Map<string, any[]>();
    paginatedFilteredInvoicesList.forEach((inv: any) => {
      let gName = "نامشخص";
      const rawDate = inv.date || inv.jalaliDate || "";
      if (rawDate) {
        const parts = String(rawDate).split(/[\/\-]/);
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (invoiceGroupMode === "month") {
            const months = [
              "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
              "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
            ];
            gName = `${months[m - 1] || m} ${parts[0]}`;
          } else if (invoiceGroupMode === "season") {
            const seasons = ["فصل بهار", "فصل تابستان", "فصل پاییز", "فصل زمستان"];
            const sIdx = Math.floor((m - 1) / 3);
            gName = `${seasons[sIdx] || "نامشخص"} ${parts[0]}`;
          }
        }
      }
      if (!groupMap.has(gName)) groupMap.set(gName, []);
      groupMap.get(gName)!.push(inv);
    });
    return Array.from(groupMap.entries()).map(([k, v]) => ({
      groupName: k,
      invoices: v,
    }));
  }, [paginatedFilteredInvoicesList, invoiceGroupMode]);

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    try {
      const activeSettings = storeSettings || getActiveStoreSettings();
      const curr = activeSettings?.currency || 'تومان';
      const wb = XLSX.utils.book_new();

      const exportData = filteredInvoicesList.map((inv: any, idx: number) => {
        const p = persons.find(
          (per: any) => String(per.id) === String(inv.customerId || inv.personId)
        );
        const pName = p ? (p.alias || p.name || `${p.firstName || ''} ${p.lastName || ''}`) : (inv.customerName || 'نامشخص');
        const whStatus = getInvoiceWarehouseStatus(inv);
        const whStatusLabel = whStatus === 'completed' ? 'تکمیل شده' : (whStatus === 'partial' ? 'تعدادی' : 'در انتظار');

        return {
          'ردیف': idx + 1,
          'شماره فاکتور / سند': inv.invoiceNumber || inv.id || '-',
          'نوع سند': inv.type === 'proforma' ? 'پیش‌فاکتور' : (inv.title || pageConfig.title),
          'طرف حساب': pName,
          'تاریخ': formatInvoiceDate(inv.date || inv.jalaliDate || inv.createdAt, storeSettings?.calendarType, { showTime: false }),
          'سررسید': inv.dueDate ? formatInvoiceDate(inv.dueDate, storeSettings?.calendarType, { showTime: false }) : '-',
          [`مبلغ کل (${curr})`]: formatDecimalForExcel(inv.totalAmount || 0, activeSettings),
          [`دریافتی / پرداختی (${curr})`]: formatDecimalForExcel(inv.paidAmount || 0, activeSettings),
          [`مانده (${curr})`]: formatDecimalForExcel(Math.max((inv.totalAmount || 0) - (inv.paidAmount || 0), 0), activeSettings),
          'وضعیت تسویه': inv.paymentStatus === 'paid' ? 'تسویه کامل' : (inv.paymentStatus === 'partial' ? 'علی‌الحساب' : 'پرداخت نشده'),
          'وضعیت انبار': whStatusLabel,
          'انبار': getDocWarehouseName(inv),
          'توضیحات': inv.note || '-'
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      if (!ws['!dir']) ws['!dir'] = 'rtl';
      XLSX.utils.book_append_sheet(wb, ws, pageConfig.title);
      XLSX.writeFile(wb, `${pageConfig.title}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
      if (setSuccessMsg) setSuccessMsg('خروجی اکسل با موفقیت دانلود شد');
    } catch (e) {
      console.error('Excel export error:', e);
    }
  };

  // Print List
  const handlePrintList = () => {
    safePrint('#invoices-table-container', {
      timeoutMs: 3000,
      documentTitle: `${pageConfig.title} - ${storeSettings?.companyName || ''}`
    });
  };

  // Quick print invoice helper
  const triggerInvoicePrint = (inv: any) => {
    if (setViewingInvoice) {
      setViewingInvoice(inv);
      setTimeout(() => {
        safePrint("#invoice-sheet-to-print", {
          timeoutMs: 4000,
          documentTitle: `فاکتور شماره ${inv.invoiceNumber || inv.id || ""}`
        });
      }, 250);
    }
  };

  // Pricing wizard launcher
  const launchPricingWizard = (inv: any) => {
    const newWizardItems = (inv.items || [])
      .filter((it: any) => {
        const prod = products.find((p: any) => String(p.id) === String(it.productId));
        return prod && prod.type !== "service";
      })
      .map((it: any) => {
        const prod = products.find((p: any) => String(p.id) === String(it.productId));
        const prodDir = prod?.unitRatioDirection || getUnitRatioDirection(prod);
        let basePurchasePrice = Number(it.unitPrice) || 0;
        const isSecUnit = Boolean(it.isSecondaryUnit);
        if (isSecUnit && prod?.unitRatio && prod.unitRatio > 0) {
          basePurchasePrice = convertPriceToBaseUnit(basePurchasePrice, true, prod.unitRatio, prodDir);
        }
        return {
          productId: it.productId,
          productName: it.productName,
          purchasePrice: Math.round(basePurchasePrice),
          originalUnitPrice: Number(it.unitPrice) || 0,
          isSecondaryUnit: isSecUnit,
          invoiceUnit: isSecUnit ? (prod?.secondaryUnit || 'واحد فرعی') : (prod?.unit || 'واحد اصلی'),
          mainUnit: prod?.unit || 'عدد',
          secondaryUnit: prod?.secondaryUnit || '',
          unitRatio: prod?.unitRatio || 1,
          unitRatioDirection: prodDir,
          marginPercent: 0,
          salePrice: prod ? Number(prod.price) : 0,
        };
      });
    if (newWizardItems.length > 0) {
      if (setPricingWizardItems) setPricingWizardItems(newWizardItems);
      if (setPricingWizardInvoice) setPricingWizardInvoice(inv);
    } else if (setSuccessMsg) {
      setSuccessMsg("هیچ کالای فیزیکی قابل قیمت‌گذاری در این فاکتور وجود ندارد.");
    }
  };

  // Render Sub-Filter Segmented Tabs
  const renderSegmentedTabs = () => {
    let tabs: { id: string; label: string; count: number }[] = [];

    if (activeTab === "list_sale") {
      tabs = [
        { id: 'all', label: 'همه فاکتورها', count: baseInvoices.length },
        { id: 'sale', label: 'فروش قطعی', count: baseInvoices.filter((i: any) => i.type === 'sale').length },
        { id: 'proforma', label: 'پیش‌فاکتورها', count: baseInvoices.filter((i: any) => i.type === 'proforma').length },
        { id: 'paid', label: 'تسویه کامل', count: baseInvoices.filter((i: any) => i.type === 'sale' && i.paymentStatus === 'paid').length },
        { id: 'unpaid', label: 'مانده‌دار', count: baseInvoices.filter((i: any) => i.type === 'sale' && i.paymentStatus !== 'paid').length },
        { id: 'remitted', label: 'حواله شده', count: baseInvoices.filter((i: any) => i.type === 'sale' && getInvoiceWarehouseStatus(i) !== 'pending').length },
        { id: 'pending_remit', label: 'در انتظار حواله', count: baseInvoices.filter((i: any) => i.type === 'sale' && getInvoiceWarehouseStatus(i) === 'pending').length },
      ];
    } else if (activeTab === "list_purchase") {
      tabs = [
        { id: 'all', label: 'همه خریدها', count: baseInvoices.length },
        { id: 'paid', label: 'تسویه شده', count: baseInvoices.filter((i: any) => i.paymentStatus === 'paid').length },
        { id: 'unpaid', label: 'مانده‌دار / بدهی', count: baseInvoices.filter((i: any) => i.paymentStatus !== 'paid').length },
        { id: 'received', label: 'رسید انبار شده', count: baseInvoices.filter((i: any) => getInvoiceWarehouseStatus(i) !== 'pending').length },
        { id: 'pending_receive', label: 'در انتظار رسید', count: baseInvoices.filter((i: any) => getInvoiceWarehouseStatus(i) === 'pending').length },
      ];
    } else if (activeTab === "list_sale_return") {
      tabs = [
        { id: 'all', label: 'همه مرجوعی‌ها', count: baseInvoices.length },
        { id: 'paid', label: 'مسترد شده', count: baseInvoices.filter((i: any) => i.paymentStatus === 'paid').length },
        { id: 'unpaid', label: 'مانده بستانکاری', count: baseInvoices.filter((i: any) => i.paymentStatus !== 'paid').length },
        { id: 'received', label: 'تحویل انبار شده', count: baseInvoices.filter((i: any) => getInvoiceWarehouseStatus(i) !== 'pending').length },
        { id: 'pending_receive', label: 'در انتظار انبار', count: baseInvoices.filter((i: any) => getInvoiceWarehouseStatus(i) === 'pending').length },
      ];
    } else if (activeTab === "list_purchase_return") {
      tabs = [
        { id: 'all', label: 'همه مرجوعی‌ها', count: baseInvoices.length },
        { id: 'paid', label: 'وصول شده', count: baseInvoices.filter((i: any) => i.paymentStatus === 'paid').length },
        { id: 'unpaid', label: 'طلب بازپس‌گیری', count: baseInvoices.filter((i: any) => i.paymentStatus !== 'paid').length },
        { id: 'remitted', label: 'حواله خروج شده', count: baseInvoices.filter((i: any) => getInvoiceWarehouseStatus(i) !== 'pending').length },
        { id: 'pending_remit', label: 'در انتظار خروج', count: baseInvoices.filter((i: any) => getInvoiceWarehouseStatus(i) === 'pending').length },
      ];
    } else if (activeTab === "list_warehouse_docs") {
      tabs = [
        { id: 'all', label: 'همه اسناد انبار', count: baseInvoices.length },
        { id: 'receipt', label: 'رسیدهای ورود کالا', count: baseInvoices.filter((i: any) => i.type === 'warehouse_receipt').length },
        { id: 'remittance', label: 'حواله‌های خروج کالا', count: baseInvoices.filter((i: any) => i.type === 'warehouse_remittance').length },
      ];
    }

    if (tabs.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl overflow-x-auto custom-scrollbar">
        {tabs.map(tab => {
          const isActive = activeTab === "list_warehouse_docs" ? (listFilter || 'all') === tab.id : invoiceTabFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (activeTab === "list_warehouse_docs") {
                  if (setListFilter) setListFilter(tab.id);
                } else {
                  setInvoiceTabFilter(tab.id);
                }
                if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {toPersianDigits(tab.count)}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-20 font-sans" dir="rtl">
      {/* Top Banner & Title Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${pageConfig.themeGradient} flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0`}>
              {pageConfig.mainIcon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-slate-800">
                  {pageConfig.title}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">
                  {toPersianDigits(filteredInvoicesList.length)} سند
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                {pageConfig.subtitle}
              </p>
            </div>
          </div>

          {/* Action buttons & View mode toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Table vs Cards */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 ml-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="نمای جدولی بهینه"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">جدول</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="نمای کارتی مدرن"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">کارت‌ها</span>
              </button>
            </div>

            <button
              onClick={() => {
                if (clearDraft) clearDraft();
                if (activeTab === "list_warehouse_docs") {
                  if (setInvoiceType) setInvoiceType("warehouse_receipt");
                  if (setWarehouseOperationType) setWarehouseOperationType("purchase_invoice");
                }
                if (setActiveTab) setActiveTab(pageConfig.createTab);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{pageConfig.createBtnLabel}</span>
            </button>

            {activeTab === "list_warehouse_docs" && (
              <button
                onClick={() => {
                  if (clearDraft) clearDraft();
                  if (setInvoiceType) setInvoiceType("warehouse_remittance");
                  if (setWarehouseOperationType) setWarehouseOperationType("sales_invoice");
                  if (setActiveTab) setActiveTab("create_warehouse_doc");
                }}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>حواله خروج</span>
              </button>
            )}

            {(activeTab === "list_sale" || activeTab === "list_sale_return") && (
              <button
                onClick={() => setActiveTab && setActiveTab("sales_report")}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="مشاهده گزارش سود و زیان"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">گزارش سود و زیان</span>
              </button>
            )}

            <button
              onClick={handlePrintList}
              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
              title="چاپ لیست"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">چاپ</span>
            </button>

            <button
              onClick={exportToExcel}
              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
              title="خروجی اکسل"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">اکسل</span>
            </button>
          </div>
        </div>

        {/* Sub-Filters / Segmented Status Tabs */}
        <div className="mt-4">
          {renderSegmentedTabs()}
        </div>
      </div>

      {/* KPI Compact Metrics Row (Zero Slop, Clean ERP Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        {/* Metric 1: Total Amount */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs relative">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-black text-slate-600">{pageConfig.totalLabel}</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-slate-900 font-mono tracking-tight">
            {toPersianDigits(formatCurrency(summaryMetrics.totalGross))}
            <span className="text-[10px] font-bold text-slate-500 mr-1">{currency}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-bold mt-1">
            {toPersianDigits(summaryMetrics.count)} سند • {toPersianDigits(summaryMetrics.totalItems)} قلم کالا
          </div>
        </div>

        {/* Metric 2: Settled / Paid Amount */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs relative">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-black text-slate-600">{pageConfig.paidLabel}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-emerald-700 font-mono tracking-tight">
            {toPersianDigits(formatCurrency(summaryMetrics.totalPaid))}
            <span className="text-[10px] font-bold text-slate-500 mr-1">{currency}</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">
            {toPersianDigits(summaryMetrics.paidCount)} تسویه کامل ({toPersianDigits(summaryMetrics.settlementPercent.toFixed(0))}٪)
          </div>
        </div>

        {/* Metric 3: Remaining / Unpaid Balance */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs relative">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-black text-slate-600">{pageConfig.unpaidLabel}</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${summaryMetrics.totalRemaining > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-base sm:text-xl font-black font-mono tracking-tight ${summaryMetrics.totalRemaining > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
            {toPersianDigits(formatCurrency(summaryMetrics.totalRemaining))}
            <span className="text-[10px] font-bold text-slate-500 mr-1">{currency}</span>
          </div>
          <div className="text-[10px] text-rose-600 font-bold mt-1">
            {toPersianDigits(summaryMetrics.unpaidCount)} فاکتور مانده‌دار
          </div>
        </div>

        {/* Metric 4: Warehouse Fulfillment / Average */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs relative">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-black text-slate-600">تحویل انبار و میانگین</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Warehouse className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-slate-900 font-mono tracking-tight">
            {toPersianDigits(summaryMetrics.fulfillmentPercent.toFixed(0))}٪
            <span className="text-[10px] font-bold text-slate-400 mr-1">تکمیل انبار</span>
          </div>
          <div className="text-[10px] text-slate-500 font-bold mt-1 truncate">
            میانگین: {toPersianDigits(formatCurrency(summaryMetrics.avgInvoiceAmount))} {currency}
          </div>
        </div>
      </div>

      {/* Streamlined Search and Filter Bar (Clean & Non-Cluttered) */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={invoiceSearchQuery}
              onChange={e => {
                if (setInvoiceSearchQuery) setInvoiceSearchQuery(e.target.value);
                if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
              }}
              placeholder="جستجوی سریع شماره فاکتور، شخص، انبار، کالا..."
              className="w-full pr-9 pl-8 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
            {invoiceSearchQuery && (
              <button
                onClick={() => setInvoiceSearchQuery && setInvoiceSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Date Presets Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            {[
              { id: 'all', label: 'همه' },
              { id: 'today', label: 'امروز' },
              { id: 'this_week', label: 'این هفته' },
              { id: 'this_month', label: 'این ماه' },
              { id: 'last_30_days', label: '۳۰ روز' },
              { id: 'custom', label: 'دلخواه...' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyDatePreset(p.id as DatePreset)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  datePreset === p.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Toggle Advanced Filters Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                showAdvancedFilters || (selectedPersonFilter !== 'all' || selectedPaymentStatus !== 'all' || selectedWarehouseFilter !== 'all' || invoiceGroupMode !== 'none')
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>فیلترهای پیشرفته</span>
              {(selectedPersonFilter !== 'all' || selectedPaymentStatus !== 'all' || selectedWarehouseFilter !== 'all' || invoiceGroupMode !== 'none') && (
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2.5 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="پاکسازی تمام فیلترها"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">پاکسازی</span>
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Pickers Drawer */}
        {datePreset === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">از تاریخ:</span>
              <div className="w-40">
                <CustomDatePicker
                  value={startDate}
                  onChange={(val: any) => {
                    setStartDate(val ? new Date(val) : null);
                    if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
                  }}
                  placeholder="تاریخ شروع"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">تا تاریخ:</span>
              <div className="w-40">
                <CustomDatePicker
                  value={endDate}
                  onChange={(val: any) => {
                    setEndDate(val ? new Date(val) : null);
                    if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
                  }}
                  placeholder="تاریخ پایان"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Advanced Filters Expandable Drawer */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 overflow-hidden"
            >
              {/* Person Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">طرف‌حساب:</label>
                <select
                  value={selectedPersonFilter}
                  onChange={e => {
                    setSelectedPersonFilter(e.target.value);
                    if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                >
                  <option value="all">همه اشخاص و طرف‌حساب‌ها</option>
                  {(persons || []).map((p: any) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.alias || p.name || `${p.firstName || ''} ${p.lastName || ''}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">وضعیت تسویه مالی:</label>
                <select
                  value={selectedPaymentStatus}
                  onChange={e => {
                    setSelectedPaymentStatus(e.target.value);
                    if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                >
                  <option value="all">همه وضعیت‌های تسویه</option>
                  <option value="paid">تسویه کامل (پرداخت‌شده)</option>
                  <option value="partial">علی‌الحساب (بخشی پرداخت‌شده)</option>
                  <option value="unpaid">تسویه نشده (پرداخت‌نشده)</option>
                </select>
              </div>

              {/* Warehouse Filter */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">انبار:</label>
                <select
                  value={selectedWarehouseFilter}
                  onChange={e => {
                    setSelectedWarehouseFilter(e.target.value);
                    if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                >
                  <option value="all">همه انبارها</option>
                  {(warehouses || []).map((wh: any) => (
                    <option key={wh.id} value={String(wh.id)}>
                      {wh.name || wh.title || `انبار ${wh.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grouping Mode */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">گروه‌بندی زمانی:</label>
                <select
                  value={invoiceGroupMode}
                  onChange={e => setInvoiceGroupMode && setInvoiceGroupMode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                >
                  <option value="none">بدون گروه‌بندی</option>
                  <option value="month">گروه‌بندی ماهانه</option>
                  <option value="season">گروه‌بندی فصلی</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content Area: Responsive Compact Table or Modern Card Grid */}
      <div id="invoices-table-container" className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Printable Header */}
        <div className="hidden print:block p-4 border-b border-slate-200 text-center">
          <h2 className="text-lg font-black text-slate-900">{storeSettings?.companyName || 'فروشگاه'}</h2>
          <h3 className="text-sm font-bold text-slate-700 mt-1">{pageConfig.title}</h3>
          <div className="text-xs text-slate-500 mt-2 flex justify-center gap-6">
            <span>تاریخ چاپ: {new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD HH:mm")}</span>
            <span>تعداد کل اقلام: {toPersianDigits(filteredInvoicesList.length)} سند</span>
          </div>
        </div>

        {/* View Mode 1: Table (Consolidated 6 columns to eliminate horizontal scrolling!) */}
        {viewMode === 'table' && (
          <div className="w-full">
            <table className="w-full text-right table-fixed">
              <thead className="bg-slate-50/95 text-slate-700 border-b border-slate-200 uppercase font-black text-xs sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-3 px-2 text-center w-12 text-slate-500">ردیف</th>
                  <th className="py-3 px-3 w-[22%]">مشخصات و اقلام فاکتور</th>
                  <th className="py-3 px-3 w-[22%]">طرف‌حساب و انبار</th>
                  <th className="py-3 px-3 w-[15%]">تاریخ و سررسید</th>
                  <th className="py-3 px-3 text-left w-[20%]">مبالغ و تسویه</th>
                  <th className="py-3 px-3 text-center w-[13%]">وضعیت‌ها</th>
                  <th className="py-3 px-2 text-center print:hidden w-[8%]">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedInvoices.map((group) => (
                  <React.Fragment key={group.groupName}>
                    {invoiceGroupMode !== "none" && group.invoices.length > 0 && (
                      <tr className="bg-slate-100/70 border-y border-slate-200">
                        <td colSpan={7} className="py-2.5 px-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4 text-indigo-600" />
                              <span className="font-extrabold text-xs text-slate-800">
                                {group.groupName}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500 text-xs font-bold">
                                تعداد: <span className="text-slate-800">{toPersianDigits(group.invoices.length)}</span>
                              </span>
                              <span className="text-indigo-700 text-xs font-bold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                مجموع: {toPersianDigits(formatCurrency(group.invoices.reduce((a, b) => a + (b.totalAmount || 0), 0)))} {currency}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {(group.invoices || []).map((inv: any, invIdx: number) => {
                      const isVoided = inv.status === "voided";
                      const isDraft = inv.isDraft || inv.status === "draft";
                      const isProforma = inv.type === "proforma";
                      const whStatus = getInvoiceWarehouseStatus(inv);
                      const remainingBalance = Math.max((inv.totalAmount || 0) - (inv.paidAmount || 0), 0);
                      const isExpanded = expandedInvoiceId === String(inv.id);

                      const personObj = persons.find((p: any) => String(p.id) === String(inv.customerId || inv.personId));
                      const personDisplayName = personObj ? (personObj.alias || personObj.name || `${personObj.firstName || ''} ${personObj.lastName || ''}`.trim()) : (inv.customerName || 'نامشخص');
                      const phone = personObj?.mobile || personObj?.phone || inv.customerPhone;
                      const whName = getDocWarehouseName(inv);
                      const itemsCount = inv.items?.length || 0;

                      return (
                        <React.Fragment key={inv.id ? `inv-${inv.id}` : `inv-row-${invIdx}`}>
                          <tr
                            className={`transition-colors group ${
                              isVoided ? "bg-rose-50/40 opacity-75" : isExpanded ? "bg-indigo-50/40" : "hover:bg-slate-50/70"
                            }`}
                          >
                            {/* Column 1: Row index & Expand button */}
                            <td className="py-2.5 px-2 text-center text-xs font-bold text-slate-400">
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className="font-mono text-[11px] text-slate-500">
                                  {toPersianDigits((invoiceSafeCurrentPage - 1) * invoicePageSize + invIdx + 1)}
                                </span>
                                {itemsCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedInvoiceId(isExpanded ? null : String(inv.id))}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded cursor-pointer"
                                    title={isExpanded ? "بستن جزئیات اقلام" : "مشاهده اقلام فاکتور"}
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Column 2: Invoice Number, Badges & Items Summary */}
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    onClick={() => setViewingInvoice && setViewingInvoice(inv)}
                                    className="font-black text-slate-900 text-xs sm:text-sm hover:text-indigo-600 hover:underline transition-colors decoration-dashed underline-offset-4 cursor-pointer"
                                    title="مشاهده پیش‌نمایش فاکتور"
                                  >
                                    #{toPersianDigits(inv.invoiceNumber || inv.id)}
                                  </span>
                                  {isProforma && (
                                    <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-1.5 py-0.2 rounded border border-slate-200">
                                      پیش‌فاکتور
                                    </span>
                                  )}
                                  {isDraft && (
                                    <span className="bg-amber-50 text-amber-800 text-[10px] font-black px-1.5 py-0.2 rounded border border-amber-200">
                                      پیش‌نویس
                                    </span>
                                  )}
                                  {isVoided && (
                                    <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-1.5 py-0.2 rounded border border-rose-200">
                                      ابطال
                                    </span>
                                  )}
                                  {inv.type === "sale_return" && (
                                    <span className="bg-amber-50 text-amber-800 text-[10px] font-black px-1.5 py-0.2 rounded border border-amber-200">
                                      برگشت فروش
                                    </span>
                                  )}
                                  {inv.type === "purchase_return" && (
                                    <span className="bg-rose-50 text-rose-700 text-[10px] font-black px-1.5 py-0.2 rounded border border-rose-200">
                                      برگشت خرید
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold truncate">
                                  <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100/90 px-1.5 py-0.2 rounded">
                                    <Package className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{toPersianDigits(itemsCount)} قلم</span>
                                  </span>
                                  {inv.sellerInvoiceNumber && (
                                    <span className="text-[10px] text-emerald-800 font-mono truncate" title="شماره فاکتور فروشنده">
                                      ش.فروشنده: {toPersianDigits(inv.sellerInvoiceNumber)}
                                    </span>
                                  )}
                                  {inv.sourceInvoiceId && (
                                    <span className="text-[10px] text-indigo-700 font-mono truncate" title="فاکتور مرجع">
                                      مرجع: #{toPersianDigits(inv.sourceInvoiceId)}
                                    </span>
                                  )}
                                  {inv.note && !inv.sellerInvoiceNumber && !inv.sourceInvoiceId && (
                                    <span className="text-[10px] text-slate-400 truncate" title={inv.note}>
                                      {inv.note}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Column 3: Counterparty Person & Warehouse */}
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col gap-0.5">
                                <div className="font-black text-slate-900 text-xs hover:text-indigo-600 transition-colors truncate">
                                  {renderPersonLink(inv.customerId || inv.personId, personDisplayName)}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold">
                                  <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50/80 px-1.5 py-0.2 rounded text-[10px] border border-purple-100/80 truncate max-w-[130px]">
                                    <Warehouse className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                                    <span className="truncate">{whName}</span>
                                  </span>
                                  {phone && (
                                    <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-slate-400 font-mono" title="شماره تماس">
                                      <Phone className="w-2.5 h-2.5" />
                                      <span>{toPersianDigits(phone)}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Column 4: Date & Due Date */}
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                                  <CalendarIcon className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span>
                                    {formatInvoiceDate(inv.date || inv.jalaliDate || inv.createdAt, storeSettings?.calendarType, { showTime: false })}
                                  </span>
                                </div>
                                {(inv.dueDate || inv.jalaliDueDate) && (() => {
                                  const isOverdue = remainingBalance > 0 && isInvoiceOverdue(inv.dueDate);
                                  const dueFormatted = formatInvoiceDate(inv.dueDate || inv.jalaliDueDate, storeSettings?.calendarType, { showTime: false });
                                  return (
                                    <div className="text-[10px]">
                                      {isOverdue ? (
                                        <span className="inline-flex items-center gap-1 font-black text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                          <Clock className="w-2.5 h-2.5 text-rose-600" />
                                          <span>سررسید گذشته: {dueFormatted}</span>
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-medium">
                                          سررسید: {dueFormatted}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>

                            {/* Column 5: Financial Summary (Total & Remaining/Paid combined!) */}
                            <td className="py-2.5 px-3 text-left">
                              <div className="flex flex-col items-end gap-0.5">
                                <div className="font-sans font-black text-xs sm:text-sm text-slate-900 tracking-tight">
                                  {toPersianDigits(formatCurrency(inv.totalAmount || 0))}{" "}
                                  <span className="text-[10px] text-slate-500 font-bold">{currency}</span>
                                </div>
                                <div>
                                  {remainingBalance <= 0 ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-flex items-center gap-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>تسویه کامل</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 inline-block font-sans">
                                      مانده: {toPersianDigits(formatCurrency(remainingBalance))} {currency}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Column 6: Combined Status (Payment + Warehouse stacked!) */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex flex-col items-center justify-center gap-1">
                                {/* Financial Status */}
                                {inv.paymentStatus === "paid" || remainingBalance <= 0 ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 font-black rounded-lg border border-emerald-200 whitespace-nowrap">
                                    تسویه کامل
                                  </span>
                                ) : inv.paymentStatus === "partial" ? (
                                  <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 font-black rounded-lg border border-amber-200 whitespace-nowrap">
                                    علی‌الحساب
                                  </span>
                                ) : (
                                  <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 font-black rounded-lg border border-rose-200 whitespace-nowrap">
                                    {activeTab === 'list_sale' ? 'تسویه نشده' : activeTab === 'list_purchase' ? 'پرداخت نشده' : 'در انتظار تسویه'}
                                  </span>
                                )}

                                {/* Warehouse Status */}
                                {whStatus === "completed" ? (
                                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-lg whitespace-nowrap">
                                    {inv.type === "purchase" ? "رسید شده" : inv.type === "sale_return" ? "تحویل انبار" : inv.type === "purchase_return" ? "خارج شده" : "حواله شده"}
                                  </span>
                                ) : whStatus === "partial" ? (
                                  <span className="text-blue-700 bg-blue-50 border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded-lg whitespace-nowrap">
                                    تعدادی
                                  </span>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-lg whitespace-nowrap">
                                    {inv.type === "purchase" ? "در انتظار رسید" : "در انتظار حواله"}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Column 7: Actions */}
                            <td className="py-2.5 px-2 print:hidden text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setViewingInvoice && setViewingInvoice(inv)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 bg-white border border-slate-200 rounded-lg cursor-pointer transition-colors"
                                  title="پیش‌نمایش فاکتور"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerInvoicePrint(inv)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 bg-white border border-slate-200 rounded-lg cursor-pointer transition-colors"
                                  title="چاپ فاکتور"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <InvoiceRowActionsDropdown
                                  invoice={inv}
                                  activeTab={activeTab}
                                  products={products}
                                  warehouses={warehouses}
                                  currency={currency}
                                  isVoided={isVoided}
                                  whStatus={whStatus}
                                  onView={() => setViewingInvoice && setViewingInvoice(inv)}
                                  onDirectPrint={() => triggerInvoicePrint(inv)}
                                  onOpenPricingWizard={
                                    (inv.type === "purchase" || activeTab === "list_purchase")
                                      ? () => launchPricingWizard(inv)
                                      : undefined
                                  }
                                  onFastReceipt={
                                    !isVoided && whStatus !== "completed" && (inv.type === "purchase" || inv.type === "sale_return" || activeTab === "list_purchase")
                                      ? () => {
                                          setFastReceiptInvoice(inv);
                                          const defaultWh = inv.warehouseId || inv.items?.find((it: any) => it?.warehouseId)?.warehouseId || (warehouses?.[0]?.id || "");
                                          setFastReceiptWarehouseId(defaultWh ? String(defaultWh) : "");
                                        }
                                      : undefined
                                  }
                                  onPaymentReceipt={
                                    !isVoided
                                      ? () => {
                                          if (setReceiptPersonId) setReceiptPersonId(inv.customerId || inv.personId);
                                          if (inv.type === "sale" || inv.type === "purchase_return") {
                                            if (setActiveTab) setActiveTab("create_receive_receipt");
                                          } else {
                                            if (setActiveTab) setActiveTab("create_pay_receipt");
                                          }
                                        }
                                      : undefined
                                  }
                                  onConvertProformaToSale={
                                    isProforma && handleConvertProformaToSale
                                      ? () => handleConvertProformaToSale(inv)
                                      : undefined
                                  }
                                  onReturnInvoice={
                                    !isVoided && (inv.type === "sale" ? handleReturnSale : handleReturnPurchase)
                                      ? () => (inv.type === "sale" ? handleReturnSale(inv) : handleReturnPurchase(inv))
                                      : undefined
                                  }
                                  onEdit={!isVoided && handleEditInvoiceAction ? () => handleEditInvoiceAction(inv) : undefined}
                                  onVoid={!isVoided && handleVoidInvoice ? () => handleVoidInvoice(inv.id) : undefined}
                                  onDelete={!isVoided && handleDeleteInvoice ? () => handleDeleteInvoice(inv.id) : undefined}
                                />
                              </div>
                            </td>
                          </tr>

                          {/* Accordion Detail Breakdown (Expandable on-demand!) */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 border-b border-indigo-100">
                              <td colSpan={7} className="p-4">
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
                                >
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-4 h-4 text-indigo-600" />
                                      <span className="font-black text-xs text-slate-800">
                                        اقلام فاکتور شماره #{toPersianDigits(inv.invoiceNumber || inv.id)} ({toPersianDigits(itemsCount)} قلم)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setViewingInvoice && setViewingInvoice(inv)}
                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>مشاهده فاکتور کامل</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Items Table */}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-right text-xs">
                                      <thead className="bg-slate-50 text-slate-600 text-[11px] font-black border-b border-slate-200">
                                        <tr>
                                          <th className="py-2 px-3 w-10 text-center">#</th>
                                          <th className="py-2 px-3">نام کالا / خدمت</th>
                                          <th className="py-2 px-3 text-center">تعداد / مقدار</th>
                                          <th className="py-2 px-3 text-left">قیمت واحد</th>
                                          <th className="py-2 px-3 text-left">مجموع</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {(inv.items || []).map((it: any, itemIdx: number) => {
                                          const prod = products.find((p: any) => String(p.id) === String(it.productId));
                                          const unitName = it.selectedUnit || (it.isSecondaryUnit ? (prod?.secondaryUnit || 'واحد فرعی') : (prod?.unit || 'عدد'));
                                          const lineTotal = Number(it.totalPrice) || (Number(it.quantity || 0) * Number(it.unitPrice || 0));

                                          return (
                                            <tr key={itemIdx} className="hover:bg-slate-50/50">
                                              <td className="py-2 px-3 text-center text-slate-400 font-mono">
                                                {toPersianDigits(itemIdx + 1)}
                                              </td>
                                              <td className="py-2 px-3 font-bold text-slate-800">
                                                {it.productName || prod?.name || 'کالای نامشخص'}
                                              </td>
                                              <td className="py-2 px-3 text-center font-bold text-slate-700">
                                                {toPersianDigits(it.quantity)}{" "}
                                                <span className="text-[10px] text-slate-400 mr-0.5">{unitName}</span>
                                              </td>
                                              <td className="py-2 px-3 text-left font-mono font-bold text-slate-700">
                                                {toPersianDigits(formatCurrency(it.unitPrice || 0))}{" "}
                                                <span className="text-[10px] text-slate-400 mr-0.5">{currency}</span>
                                              </td>
                                              <td className="py-2 px-3 text-left font-mono font-black text-slate-900">
                                                {toPersianDigits(formatCurrency(lineTotal))}{" "}
                                                <span className="text-[10px] text-slate-400 mr-0.5">{currency}</span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {inv.note && (
                                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="font-bold">یادداشت فاکتور:</span>
                                      <span>{inv.note}</span>
                                    </div>
                                  )}
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {filteredInvoicesList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileText className="w-8 h-8 text-slate-300" />
                            <span className="text-sm font-bold text-slate-500">هیچ سندی با فیلترهای جاری یافت نشد.</span>
                            {hasActiveFilters && (
                              <button
                                type="button"
                                onClick={clearAllFilters}
                                className="mt-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                پاکسازی فیلترها و مشاهده همه
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Mode 2: Modern Cards Grid (Zero horizontal scrolling, perfect for responsive browsing) */}
        {viewMode === 'cards' && (
          <div className="p-4 sm:p-5">
            {filteredInvoicesList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span className="text-sm font-bold text-slate-500">هیچ سندی با فیلترهای جاری یافت نشد.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedFilteredInvoicesList.map((inv: any, idx: number) => {
                  const isVoided = inv.status === "voided";
                  const isDraft = inv.isDraft || inv.status === "draft";
                  const isProforma = inv.type === "proforma";
                  const whStatus = getInvoiceWarehouseStatus(inv);
                  const remainingBalance = Math.max((inv.totalAmount || 0) - (inv.paidAmount || 0), 0);
                  const personObj = persons.find((p: any) => String(p.id) === String(inv.customerId || inv.personId));
                  const personDisplayName = personObj ? (personObj.alias || personObj.name || `${personObj.firstName || ''} ${personObj.lastName || ''}`.trim()) : (inv.customerName || 'نامشخص');
                  const phone = personObj?.mobile || personObj?.phone || inv.customerPhone;
                  const whName = getDocWarehouseName(inv);
                  const itemsCount = inv.items?.length || 0;

                  return (
                    <div
                      key={inv.id || idx}
                      className={`bg-white rounded-2xl border transition-all p-4 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                        isVoided ? "border-rose-200 bg-rose-50/20" : "border-slate-200/90 hover:border-indigo-300"
                      }`}
                    >
                      {/* Card Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                onClick={() => setViewingInvoice && setViewingInvoice(inv)}
                                className="font-black text-slate-900 text-sm hover:text-indigo-600 cursor-pointer"
                              >
                                #{toPersianDigits(inv.invoiceNumber || inv.id)}
                              </span>
                              {isProforma && (
                                <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-1.5 py-0.2 rounded border border-slate-200">
                                  پیش‌فاکتور
                                </span>
                              )}
                              {isDraft && (
                                <span className="bg-amber-50 text-amber-800 text-[10px] font-black px-1.5 py-0.2 rounded border border-amber-200">
                                  پیش‌نویس
                                </span>
                              )}
                              {isVoided && (
                                <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-1.5 py-0.2 rounded border border-rose-200">
                                  ابطال
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-bold mt-1 flex items-center gap-1.5">
                              <CalendarIcon className="w-3 h-3 text-slate-400" />
                              <span>{formatInvoiceDate(inv.date || inv.jalaliDate || inv.createdAt, storeSettings?.calendarType, { showTime: false })}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingInvoice && setViewingInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="پیش‌نمایش"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <InvoiceRowActionsDropdown
                              invoice={inv}
                              activeTab={activeTab}
                              products={products}
                              warehouses={warehouses}
                              currency={currency}
                              isVoided={isVoided}
                              whStatus={whStatus}
                              onView={() => setViewingInvoice && setViewingInvoice(inv)}
                              onDirectPrint={() => triggerInvoicePrint(inv)}
                              onOpenPricingWizard={
                                (inv.type === "purchase" || activeTab === "list_purchase")
                                  ? () => launchPricingWizard(inv)
                                  : undefined
                              }
                              onFastReceipt={
                                !isVoided && whStatus !== "completed" && (inv.type === "purchase" || inv.type === "sale_return" || activeTab === "list_purchase")
                                  ? () => {
                                      setFastReceiptInvoice(inv);
                                      const defaultWh = inv.warehouseId || inv.items?.find((it: any) => it?.warehouseId)?.warehouseId || (warehouses?.[0]?.id || "");
                                      setFastReceiptWarehouseId(defaultWh ? String(defaultWh) : "");
                                    }
                                  : undefined
                              }
                              onPaymentReceipt={
                                !isVoided
                                  ? () => {
                                      if (setReceiptPersonId) setReceiptPersonId(inv.customerId || inv.personId);
                                      if (inv.type === "sale" || inv.type === "purchase_return") {
                                        if (setActiveTab) setActiveTab("create_receive_receipt");
                                      } else {
                                        if (setActiveTab) setActiveTab("create_pay_receipt");
                                      }
                                    }
                                  : undefined
                              }
                              onConvertProformaToSale={
                                isProforma && handleConvertProformaToSale
                                  ? () => handleConvertProformaToSale(inv)
                                  : undefined
                              }
                              onReturnInvoice={
                                !isVoided && (inv.type === "sale" ? handleReturnSale : handleReturnPurchase)
                                  ? () => (inv.type === "sale" ? handleReturnSale(inv) : handleReturnPurchase(inv))
                                  : undefined
                              }
                              onEdit={!isVoided && handleEditInvoiceAction ? () => handleEditInvoiceAction(inv) : undefined}
                              onVoid={!isVoided && handleVoidInvoice ? () => handleVoidInvoice(inv.id) : undefined}
                              onDelete={!isVoided && handleDeleteInvoice ? () => handleDeleteInvoice(inv.id) : undefined}
                            />
                          </div>
                        </div>

                        {/* Person & Warehouse Info */}
                        <div className="py-2.5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-bold">{pageConfig.personRoleLabel}:</span>
                            <span className="font-black text-slate-800">
                              {renderPersonLink(inv.customerId || inv.personId, personDisplayName)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-bold">انبار:</span>
                            <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-bold text-[11px] border border-purple-100">
                              {whName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-bold">اقلام:</span>
                            <span className="text-slate-600 font-bold text-[11px]">
                              {toPersianDigits(itemsCount)} قلم کالا
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Financial & Status Badges */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">مبلغ کل فاکتور:</span>
                          <span className="font-mono font-black text-sm text-slate-900">
                            {toPersianDigits(formatCurrency(inv.totalAmount || 0))} <span className="text-[10px] text-slate-500 font-normal">{currency}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-bold">وضعیت مالی:</span>
                          {remainingBalance <= 0 ? (
                            <span className="text-emerald-700 bg-emerald-50 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200">
                              تسویه کامل
                            </span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 text-[10px] font-black px-2 py-0.5 rounded-md border border-rose-200">
                              مانده: {toPersianDigits(formatCurrency(remainingBalance))} {currency}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-bold">وضعیت انبار:</span>
                          {whStatus === "completed" ? (
                            <span className="text-emerald-700 bg-emerald-50 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200">
                              {inv.type === "purchase" ? "رسید شده" : "حواله شده"}
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-200">
                              {inv.type === "purchase" ? "در انتظار رسید" : "در انتظار حواله"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        {filteredInvoicesList.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 print:hidden">
            <div className="text-xs text-slate-500 font-bold">
              نمایش ردیف‌های{" "}
              <span className="text-slate-800 font-sans font-black">
                {toPersianDigits((invoiceSafeCurrentPage - 1) * invoicePageSize + 1)}
              </span>{" "}
              تا{" "}
              <span className="text-slate-800 font-sans font-black">
                {toPersianDigits(Math.min(filteredInvoicesList.length, invoiceSafeCurrentPage * invoicePageSize))}
              </span>{" "}
              از مجموع{" "}
              <span className="text-indigo-600 font-sans font-black">
                {toPersianDigits(filteredInvoicesList.length)}
              </span>{" "}
              سند
            </div>

            {invoiceTotalPages > 1 && (
              <div className="flex items-center gap-1.5" dir="ltr">
                <button
                  disabled={invoiceSafeCurrentPage === 1}
                  onClick={() => setInvoiceCurrentPage && setInvoiceCurrentPage((prev: number) => Math.max(1, prev - 1))}
                  className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                  title="صفحه قبل"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-1 font-sans font-black text-xs">
                  {Array.from({ length: invoiceTotalPages })
                    .map((_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === invoiceTotalPages ||
                        Math.abs(p - invoiceSafeCurrentPage) <= 1,
                    )
                    .map((p, i, arr) => (
                      <React.Fragment key={p}>
                        {i > 0 && arr[i - 1] !== p - 1 && (
                          <span className="text-slate-300 px-1">...</span>
                        )}
                        <button
                          onClick={() => setInvoiceCurrentPage && setInvoiceCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            invoiceSafeCurrentPage === p
                              ? "bg-indigo-600 text-white font-black shadow-xs shadow-indigo-600/30"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-bold"
                          }`}
                        >
                          {toPersianDigits(p)}
                        </button>
                      </React.Fragment>
                    ))}
                </div>

                <button
                  disabled={invoiceSafeCurrentPage === invoiceTotalPages}
                  onClick={() => setInvoiceCurrentPage && setInvoiceCurrentPage((prev: number) => Math.min(invoiceTotalPages, prev + 1))}
                  className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                  title="صفحه بعد"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">تعداد در صفحه:</span>
              <select
                value={invoicePageSize}
                onChange={e => {
                  if (setInvoicePageSize) setInvoicePageSize(Number(e.target.value));
                  if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
                }}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-sans font-bold rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                dir="ltr"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Fast Warehouse Receipt Modal */}
      <AnimatePresence>
        {fastReceiptInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <div className="p-6">
                <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-500" />
                  رسید سریع انبار
                </h3>
                <p className="text-slate-500 text-xs mb-5">
                  لطفا انبار مقصد برای فاکتور خرید شماره {toPersianDigits(fastReceiptInvoice.invoiceNumber || fastReceiptInvoice.id)} را انتخاب کنید:
                </p>
                <div className="space-y-4">
                  <select
                    value={fastReceiptWarehouseId}
                    onChange={(e) => setFastReceiptWarehouseId(e.target.value)}
                    className="w-full p-2.5 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 text-xs font-bold text-emerald-900 outline-none cursor-pointer"
                  >
                    <option value="">-- انتخاب انبار --</option>
                    {(warehouses || []).map((wh: any) => (
                      <option key={wh.id} value={wh.id}>{wh.name || wh.title || `انبار ${wh.id}`}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => {
                      setFastReceiptInvoice(null);
                      setFastReceiptWarehouseId("");
                    }}
                    className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={async () => {
                      if (handleFastWarehouseReceipt) {
                        const receipt = await handleFastWarehouseReceipt(fastReceiptInvoice, fastReceiptWarehouseId);
                        setFastReceiptInvoice(null);
                        setFastReceiptWarehouseId("");
                        if (receipt && setViewingInvoice) {
                          setViewingInvoice(receipt);
                        }
                      }
                    }}
                    disabled={!fastReceiptWarehouseId}
                    className="flex-1 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    ثبت رسید انبار
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
