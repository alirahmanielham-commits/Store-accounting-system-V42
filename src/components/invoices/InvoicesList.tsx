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
  ArrowUpDown, Filter, ChevronDown, CheckCircle as CheckCircleIcon, Building2,
  ShoppingCart
} from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import { convertToGregorian, formatDateDisplay, formatInvoiceDate, toPersianDigits, addCommas, formatNumber } from "../../utils/format";
import { getUnitRatioDirection, convertQuantityToBaseUnit, convertPriceToBaseUnit } from "../../utils/unitConversion";
import { safePrint } from "../../utils/printHelper";

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
    ...rest
  } = props;

  const currency = storeSettings?.currency || 'تومان';

  // Sub-filter tabs state
  const [invoiceTabFilter, setInvoiceTabFilter] = useState<string>('all');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');

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

  // Warehouse status resolver
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

  // Dynamic Page Configuration based on activeTab
  const pageConfig = useMemo(() => {
    switch (activeTab) {
      case 'list_sale':
        return {
          title: 'لیست فاکتورهای فروش',
          subtitle: 'مدیریت و پیگیری فاکتورهای فروش کالا و خدمات، وضعیت تسویه حساب، حواله خروج انبار و صدور رسید',
          themeGradient: 'from-emerald-600 to-teal-500',
          themeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          accentColor: 'emerald',
          mainIcon: <ShoppingCart className="w-6 h-6 text-white" />,
          createBtnLabel: 'ثبت فاکتور فروش جدید',
          createTab: 'create_sale',
          personRoleLabel: 'مشتری',
          totalLabel: 'فروش کل',
          paidLabel: 'دریافت شده',
          unpaidLabel: 'مانده از مشتریان',
        };
      case 'list_purchase':
        return {
          title: 'لیست فاکتورهای خرید',
          subtitle: 'ثبت و نظارت بر فاکتورهای خرید، تامین‌کنندگان، تسویه حساب‌های نقدی و غیرنقدی و رسید انبار',
          themeGradient: 'from-blue-600 to-indigo-600',
          themeBg: 'bg-blue-50 text-blue-700 border-blue-200',
          accentColor: 'indigo',
          mainIcon: <Package className="w-6 h-6 text-white" />,
          createBtnLabel: 'ثبت فاکتور خرید جدید',
          createTab: 'create_purchase',
          personRoleLabel: 'تامین‌کننده / فروشنده',
          totalLabel: 'خرید کل',
          paidLabel: 'پرداخت شده',
          unpaidLabel: 'بدهی به تامین‌کنندگان',
        };
      case 'list_sale_return':
        return {
          title: 'لیست برگشت از فروش',
          subtitle: 'پیگیری اقلام مرجوعی مشتریان، ثبت اسناد بستانکاری و مدیریت ورود مجدد کالا به انبار',
          themeGradient: 'from-amber-600 to-orange-500',
          themeBg: 'bg-amber-50 text-amber-700 border-amber-200',
          accentColor: 'amber',
          mainIcon: <RotateCcw className="w-6 h-6 text-white" />,
          createBtnLabel: 'ثبت برگشت از فروش جدید',
          createTab: 'create_sale_return',
          personRoleLabel: 'مشتری',
          totalLabel: 'کل مرجوعی فروش',
          paidLabel: 'مبالغ استرداد شده',
          unpaidLabel: 'مانده بستانکاری',
        };
      case 'list_purchase_return':
        return {
          title: 'لیست برگشت از خرید',
          subtitle: 'مدیریت و پیگیری کالاهای مرجوع شده به تامین‌کنندگان، دریافت مطالبات و اسناد خروج کالا',
          themeGradient: 'from-rose-600 to-pink-600',
          themeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          accentColor: 'rose',
          mainIcon: <Truck className="w-6 h-6 text-white" />,
          createBtnLabel: 'ثبت برگشت از خرید جدید',
          createTab: 'create_purchase_return',
          personRoleLabel: 'تامین‌کننده',
          totalLabel: 'کل مرجوعی خرید',
          paidLabel: 'مبالغ بازپس گرفته',
          unpaidLabel: 'مانده طلب از تامین‌کننده',
        };
      case 'list_warehouse_docs':
      default:
        return {
          title: 'اسناد انبارداری (رسید و حواله)',
          subtitle: 'رسیدهای ورود کالا به انبار، حواله‌های خروج و جابجایی کالاهای موجودی انبار',
          themeGradient: 'from-purple-600 to-indigo-600',
          themeBg: 'bg-purple-50 text-purple-700 border-purple-200',
          accentColor: 'purple',
          mainIcon: <Warehouse className="w-6 h-6 text-white" />,
          createBtnLabel: 'ثبت رسید انبار جدید',
          createTab: 'create_warehouse_doc',
          personRoleLabel: 'طرف حساب / تحویل‌دهنده',
          totalLabel: 'کل ارزش اسناد',
          paidLabel: 'اسناد قطعی',
          unpaidLabel: 'اسناد در جریان',
        };
    }
  }, [activeTab]);

  // Base invoices list for this tab before filters
  const baseInvoices = useMemo(() => {
    return (invoices || []).filter((i: any) => {
      if (i.isDeleted) return false;
      if (activeTab === "list_sale") {
        return i.type === "sale" || i.type === "proforma";
      } else if (activeTab === "list_purchase") {
        return i.type === "purchase";
      } else if (activeTab === "list_sale_return") {
        return i.type === "sale_return";
      } else if (activeTab === "list_purchase_return") {
        return i.type === "purchase_return";
      } else if (activeTab === "list_warehouse_docs") {
        return i.type === "warehouse_receipt" || i.type === "warehouse_remittance";
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
          'مبلغ کل (تومان)': Math.round(inv.totalAmount || 0),
          'دریافتی / پرداختی (تومان)': Math.round(inv.paidAmount || 0),
          'مانده (تومان)': Math.round(Math.max((inv.totalAmount || 0) - (inv.paidAmount || 0), 0)),
          'وضعیت تسویه': inv.paymentStatus === 'paid' ? 'تسویه کامل' : (inv.paymentStatus === 'partial' ? 'علی‌الحساب' : 'پرداخت نشده'),
          'وضعیت انبار': whStatusLabel,
          'انبار': getDocWarehouseName(inv),
          'توضیحات': inv.note || '-'
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, pageConfig.title);
      XLSX.writeFile(wb, `${pageConfig.title}_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  return (
    <div className="space-y-6 pb-20 font-sans" dir="rtl">
      {/* Top Banner & Title Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${pageConfig.themeGradient} flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0`}>
              {pageConfig.mainIcon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-800">
                  {pageConfig.title}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">
                  {toPersianDigits(filteredInvoicesList.length)} سند
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {pageConfig.subtitle}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (clearDraft) clearDraft();
                if (activeTab === "list_warehouse_docs") {
                  if (setInvoiceType) setInvoiceType("warehouse_receipt");
                  if (setWarehouseOperationType) setWarehouseOperationType("purchase_invoice");
                }
                if (setActiveTab) setActiveTab(pageConfig.createTab);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
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
                className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت حواله خروج</span>
              </button>
            )}

            {(activeTab === "list_sale" || activeTab === "list_sale_return") && (
              <button
                onClick={() => setActiveTab && setActiveTab("sales_report")}
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                title="مشاهده گزارش سود و زیان و بهای تمام‌شده فاکتورها"
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>گزارش سود و زیان</span>
              </button>
            )}

            <button
              onClick={handlePrintList}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="چاپ لیست جاری"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>چاپ</span>
            </button>

            <button
              onClick={exportToExcel}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="خروجی اکسل"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>اکسل</span>
            </button>
          </div>
        </div>

        {/* Sub-Filters / Segmented Status Tabs */}
        {activeTab === "list_sale" && (
          <div className="flex items-center gap-1.5 mt-5 p-1 bg-slate-100/80 rounded-2xl overflow-x-auto">
            {[
              { id: 'all', label: 'همه فاکتورها', count: baseInvoices.length },
              { id: 'sale', label: 'فقط فاکتورهای فروش', count: baseInvoices.filter((i: any) => i.type === 'sale').length },
              { id: 'proforma', label: 'پیش‌فاکتورها', count: baseInvoices.filter((i: any) => i.type === 'proforma').length },
              { id: 'paid', label: 'تسویه کامل', count: baseInvoices.filter((i: any) => i.type === 'sale' && i.paymentStatus === 'paid').length },
              { id: 'unpaid', label: 'تسویه نشده / مانده‌دار', count: baseInvoices.filter((i: any) => i.type === 'sale' && i.paymentStatus !== 'paid').length },
              { id: 'remitted', label: 'حواله خروج شده', count: baseInvoices.filter((i: any) => i.type === 'sale' && getInvoiceWarehouseStatus(i) !== 'pending').length },
              { id: 'pending_remit', label: 'در انتظار حواله خروج', count: baseInvoices.filter((i: any) => i.type === 'sale' && getInvoiceWarehouseStatus(i) === 'pending').length },
            ].map(tab => {
              const isActive = invoiceTabFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setInvoiceTabFilter(tab.id);
                    if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {toPersianDigits(tab.count)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "list_purchase" && (
          <div className="flex items-center gap-1.5 mt-5 p-1 bg-slate-100/80 rounded-2xl overflow-x-auto">
            {[
              { id: 'all', label: 'همه فاکتورهای خرید', count: baseInvoices.length },
              { id: 'paid', label: 'تسویه شده', count: baseInvoices.filter((i: any) => i.paymentStatus === 'paid').length },
              { id: 'unpaid', label: 'تسویه نشده / مانده‌دار', count: baseInvoices.filter((i: any) => i.paymentStatus !== 'paid').length },
              { id: 'received', label: 'رسید انبار شده', count: baseInvoices.filter((i: any) => getInvoiceWarehouseStatus(i) !== 'pending').length },
              { id: 'pending_receive', label: 'در انتظار رسید انبار', count: baseInvoices.filter((i: any) => getInvoiceWarehouseStatus(i) === 'pending').length },
            ].map(tab => {
              const isActive = invoiceTabFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setInvoiceTabFilter(tab.id);
                    if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {toPersianDigits(tab.count)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "list_warehouse_docs" && (
          <div className="flex items-center gap-1.5 mt-5 p-1 bg-slate-100/80 rounded-2xl overflow-x-auto">
            {[
              { id: 'all', label: 'همه اسناد انبار', count: baseInvoices.length },
              { id: 'receipt', label: '⬇️ رسیدهای ورود کالا', count: baseInvoices.filter((i: any) => i.type === 'warehouse_receipt').length },
              { id: 'remittance', label: '⬆️ حواله‌های خروج کالا', count: baseInvoices.filter((i: any) => i.type === 'warehouse_remittance').length },
            ].map(tab => {
              const isActive = (listFilter || 'all') === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (setListFilter) setListFilter(tab.id);
                    if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive ? 'bg-purple-50 text-purple-700' : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {toPersianDigits(tab.count)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* KPI Summary Cards Grid (4 Cards like SalesReport) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        {/* Card 1: Total Amount */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-black">{pageConfig.totalLabel}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            {toPersianDigits(formatCurrency(summaryMetrics.totalGross))}
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mr-1.5">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-bold mt-2 flex items-center gap-1.5">
            <span>تعداد: {toPersianDigits(summaryMetrics.count)} سند</span>
            <span>•</span>
            <span>اقلام: {toPersianDigits(summaryMetrics.totalItems)} عدد</span>
          </div>
        </div>

        {/* Card 2: Settled / Paid Amount */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-black">{pageConfig.paidLabel}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-700 font-mono tracking-tight">
            {toPersianDigits(formatCurrency(summaryMetrics.totalPaid))}
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mr-1.5">{currency}</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1.5">
            <span>تسویه کامل: {toPersianDigits(summaryMetrics.paidCount)} فاکتور</span>
            <span>({toPersianDigits(summaryMetrics.settlementPercent.toFixed(0))}٪)</span>
          </div>
        </div>

        {/* Card 3: Remaining / Unpaid Balance */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-black">{pageConfig.unpaidLabel}</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${summaryMetrics.totalRemaining > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-black font-mono tracking-tight ${summaryMetrics.totalRemaining > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
            {toPersianDigits(formatCurrency(summaryMetrics.totalRemaining))}
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mr-1.5">{currency}</span>
          </div>
          <div className="text-[11px] text-rose-600 font-bold mt-2 flex items-center gap-1.5">
            <span>مانده‌دار: {toPersianDigits(summaryMetrics.unpaidCount)} فاکتور</span>
          </div>
        </div>

        {/* Card 4: Warehouse Fulfillment / Average */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-black">وضعیت انبار و میانگین</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            {toPersianDigits(summaryMetrics.fulfillmentPercent.toFixed(0))}٪
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mr-1.5">تحویل انبار</span>
          </div>
          <div className="text-[11px] text-slate-500 font-bold mt-2 flex items-center gap-1.5">
            <span>میانگین فاکتور: {toPersianDigits(formatCurrency(summaryMetrics.avgInvoiceAmount))} {currency}</span>
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4 print:hidden">
        {/* Date presets row */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
              بازه زمانی فاکتورها:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'همه زمان‌ها' },
              { id: 'today', label: 'امروز' },
              { id: 'yesterday', label: 'دیروز' },
              { id: 'this_week', label: 'این هفته' },
              { id: 'last_7_days', label: '۷ روز گذشته' },
              { id: 'this_month', label: 'ماه جاری' },
              { id: 'last_30_days', label: '۳۰ روز اخیر' },
              { id: 'this_year', label: 'کل سال' },
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
                <div className="w-44">
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
        </div>

        {/* Detailed Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={invoiceSearchQuery}
              onChange={e => {
                if (setInvoiceSearchQuery) setInvoiceSearchQuery(e.target.value);
                if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
              }}
              placeholder="جستجو شماره فاکتور، شخص، انبار، کالا..."
              className="w-full pr-9 pl-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
            {invoiceSearchQuery && (
              <button
                onClick={() => setInvoiceSearchQuery && setInvoiceSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Person Filter */}
          <div>
            <select
              value={selectedPersonFilter}
              onChange={e => {
                setSelectedPersonFilter(e.target.value);
                if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
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
            <select
              value={selectedPaymentStatus}
              onChange={e => {
                setSelectedPaymentStatus(e.target.value);
                if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="all">همه وضعیت‌های تسویه</option>
              <option value="paid">تسویه کامل (پرداخت‌شده)</option>
              <option value="partial">علی‌الحساب (بخشی پرداخت‌شده)</option>
              <option value="unpaid">تسویه نشده (پرداخت‌نشده)</option>
            </select>
          </div>

          {/* Warehouse Filter */}
          <div>
            <select
              value={selectedWarehouseFilter}
              onChange={e => {
                setSelectedWarehouseFilter(e.target.value);
                if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
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
            <select
              value={invoiceGroupMode}
              onChange={e => setInvoiceGroupMode && setInvoiceGroupMode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="none">بدون گروه‌بندی</option>
              <option value="month">گروه‌بندی ماهانه</option>
              <option value="season">گروه‌بندی فصلی</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200 uppercase font-black text-xs">
              <tr>
                <th className="p-4 whitespace-nowrap">شماره</th>
                <th className="p-4 whitespace-nowrap">عنوان / شرح سند</th>
                <th className="p-4 whitespace-nowrap">طرف حساب</th>
                <th className="p-4 whitespace-nowrap">تاریخ و زمان</th>
                {activeTab.includes("warehouse") ? (
                  <th className="p-4 text-center whitespace-nowrap">انبار مربوطه</th>
                ) : (
                  <th className="p-4 text-left whitespace-nowrap">مبلغ کل</th>
                )}
                {!activeTab.includes("warehouse") && (
                  <>
                    <th className="p-4 text-left whitespace-nowrap">دریافتی/پرداختی</th>
                    <th className="p-4 text-left whitespace-nowrap">مانده فاکتور</th>
                    <th className="p-4 text-center whitespace-nowrap">وضعیت تسویه</th>
                    <th className="p-4 text-center whitespace-nowrap">وضعیت انبار</th>
                  </>
                )}
                <th className="p-4 text-center whitespace-nowrap print:hidden">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedInvoices.map((group) => (
                <React.Fragment key={group.groupName}>
                  {invoiceGroupMode !== "none" && group.invoices.length > 0 && (
                    <tr className="bg-slate-100/70 border-y border-slate-200">
                      <td colSpan={10} className="p-3">
                        <div className="flex justify-between items-center px-2">
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

                    return (
                      <tr
                        key={inv.id ? `inv-${inv.id}` : `inv-row-${invIdx}`}
                        className={`transition-colors ${isVoided ? "bg-rose-50/40 opacity-75" : "hover:bg-slate-50/80"}`}
                      >
                        {/* Column 1: Number & Status Badges */}
                        <td className="p-4 font-sans font-black text-slate-800 text-sm whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => setViewingInvoice && setViewingInvoice(inv)}
                              className="cursor-pointer hover:text-indigo-600 hover:underline transition-colors decoration-dashed underline-offset-4"
                              title="مشاهده پیش‌نمایش فاکتور"
                            >
                              #{toPersianDigits(inv.invoiceNumber || inv.id)}
                            </span>
                            {isDraft && (
                              <span className="bg-amber-50 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-amber-200">
                                پیش‌نویس
                              </span>
                            )}
                            {isProforma && (
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-slate-200">
                                پیش‌فاکتور
                              </span>
                            )}
                            {isVoided && (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-rose-200">
                                ابطال شده
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Column 2: Title / Note / Seller Number */}
                        <td className="p-4 font-bold text-slate-800 text-xs max-w-[200px]">
                          <div className="truncate font-black text-slate-800" title={inv.title || pageConfig.title}>
                            {inv.title || pageConfig.title}
                          </div>
                          {inv.note && (
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5 truncate" title={inv.note}>
                              {inv.note}
                            </div>
                          )}
                          {(inv.type === "purchase" || inv.type === "purchase_return") && inv.sellerInvoiceNumber && (
                            <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                              ش.فروشنده: {toPersianDigits(inv.sellerInvoiceNumber)}
                            </div>
                          )}
                        </td>

                        {/* Column 3: Customer / Person */}
                        <td className="p-4 text-xs font-bold text-slate-800">
                          {renderPersonLink(
                            inv.customerId || inv.personId,
                            persons.find((p: any) => String(p.id) === String(inv.customerId || inv.personId))?.name || inv.customerName || 'نامشخص'
                          )}
                        </td>

                        {/* Column 4: Date & Due Date */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <CalendarIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-sans font-black text-xs text-slate-800">
                              {formatInvoiceDate(inv.date || inv.jalaliDate || inv.createdAt, storeSettings?.calendarType, { showTime: false })}
                            </span>
                          </div>
                          {(inv.dueDate || inv.jalaliDueDate) && (
                            <div className="flex items-center gap-1 text-[10px] text-rose-600 font-bold mt-1">
                              <span>سررسید:</span>
                              <span className="font-sans font-black">
                                {formatInvoiceDate(inv.dueDate || inv.jalaliDueDate, storeSettings?.calendarType, { showTime: false })}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Column 5: Warehouse or Total Amount */}
                        {activeTab.includes("warehouse") ? (
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 text-xs font-bold border border-purple-100">
                              <Warehouse className="w-3.5 h-3.5 text-purple-600" />
                              <span>{getDocWarehouseName(inv)}</span>
                            </span>
                          </td>
                        ) : (
                          <td className="p-4 text-left">
                            <span className="font-sans font-black text-sm text-slate-900 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80 inline-block">
                              {toPersianDigits(formatCurrency(inv.totalAmount || 0))}{" "}
                              <span className="text-[10px] text-slate-500 font-bold mr-0.5">{currency}</span>
                            </span>
                          </td>
                        )}

                        {/* Financial and Fulfillment Columns */}
                        {!activeTab.includes("warehouse") && (
                          <>
                            {/* Paid Amount */}
                            <td className="p-4 text-left">
                              <span className="font-sans font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">
                                {toPersianDigits(formatCurrency(inv.paidAmount || 0))}{" "}
                                <span className="text-[9px] text-emerald-600 mr-0.5">{currency}</span>
                              </span>
                            </td>

                            {/* Remaining Balance */}
                            <td className="p-4 text-left">
                              <span className={`font-sans font-bold text-xs px-2.5 py-1 rounded-lg inline-block ${
                                remainingBalance > 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-500 bg-slate-50'
                              }`}>
                                {toPersianDigits(formatCurrency(remainingBalance))}{" "}
                                <span className="text-[9px] mr-0.5">{currency}</span>
                              </span>
                            </td>

                            {/* Payment Status Badge */}
                            <td className="p-4 text-center whitespace-nowrap">
                              {inv.paymentStatus === "paid" ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-1 font-black rounded-lg border border-emerald-200">
                                  تسویه کامل
                                </span>
                              ) : inv.paymentStatus === "partial" ? (
                                <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-1 font-black rounded-lg border border-amber-200">
                                  علی‌الحساب
                                </span>
                              ) : (
                                <span className="bg-rose-100 text-rose-800 text-[10px] px-2.5 py-1 font-black rounded-lg border border-rose-200">
                                  پرداخت نشده
                                </span>
                              )}
                            </td>

                            {/* Warehouse Status Badge */}
                            <td className="p-4 text-center whitespace-nowrap">
                              {whStatus === "completed" ? (
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-[10px] font-black px-2.5 py-1 rounded-lg">
                                  {inv.type === "purchase" || inv.type === "sale_return" ? "رسید شده" : "حواله شده"}
                                </span>
                              ) : whStatus === "partial" ? (
                                <span className="text-blue-700 bg-blue-50 border border-blue-200 text-[10px] font-black px-2.5 py-1 rounded-lg">
                                  {inv.type === "purchase" || inv.type === "sale_return" ? "تعدادی رسید" : "تعدادی حواله"}
                                </span>
                              ) : (
                                <span className="text-amber-700 bg-amber-50 border border-amber-200 text-[10px] font-black px-2.5 py-1 rounded-lg">
                                  {inv.type === "purchase" || inv.type === "sale_return" ? "در انتظار رسید" : "در انتظار حواله"}
                                </span>
                              )}
                            </td>
                          </>
                        )}

                        {/* Action Buttons Column */}
                        <td className="p-4 print:hidden">
                          <div className="flex items-center justify-center gap-1 bg-slate-50/90 p-1 rounded-xl border border-slate-200/60 w-max mx-auto">
                            {/* Fast Pricing for purchase invoices */}
                            {activeTab === "list_purchase" && (
                              <button
                                onClick={() => {
                                  const newWizardItems = (inv.items || [])
                                    .filter((it: any) => {
                                      const prod = products.find((p: any) => p.id === it.productId);
                                      return prod && prod.type !== "service";
                                    })
                                    .map((it: any) => {
                                      const prod = products.find((p: any) => p.id === it.productId);
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
                                    setSuccessMsg("هیچ کالای قابل قیمت‌گذاری در این فاکتور وجود ندارد.");
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg cursor-pointer transition-colors"
                                title="ثبت و چاپ قیمت فروش"
                              >
                                <Tag className="w-4 h-4" />
                              </button>
                            )}

                            {/* Financial Receipt (Receive/Pay) */}
                            {!isVoided && !activeTab.includes("warehouse") && (
                              <button
                                onClick={() => {
                                  if (inv.type === "sale" || inv.type === "purchase_return") {
                                    if (setReceiptPersonId) setReceiptPersonId(inv.customerId || inv.personId);
                                    if (setActiveTab) setActiveTab("create_receive_receipt");
                                  } else if (inv.type === "purchase" || inv.type === "sale_return") {
                                    if (setReceiptPersonId) setReceiptPersonId(inv.customerId || inv.personId);
                                    if (setActiveTab) setActiveTab("create_pay_receipt");
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg cursor-pointer transition-colors"
                                title={
                                  inv.type === "sale" || inv.type === "purchase_return"
                                    ? "ثبت دریافت وجه"
                                    : "ثبت پرداخت وجه"
                                }
                              >
                                <Wallet className="w-4 h-4" />
                              </button>
                            )}

                            {/* Fast Warehouse Receipt for Purchase */}
                            {inv.type === "purchase" && !isVoided && whStatus !== "completed" && (
                              <button
                                onClick={() => {
                                  setFastReceiptInvoice(inv);
                                  const defaultWh = inv.warehouseId || inv.items?.find((it: any) => it?.warehouseId)?.warehouseId || (warehouses?.[0]?.id || "");
                                  setFastReceiptWarehouseId(defaultWh ? String(defaultWh) : "");
                                }}
                                className="p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg cursor-pointer transition-colors"
                                title="رسید سریع به انبار"
                              >
                                <Package className="w-4 h-4" />
                              </button>
                            )}

                            {/* View Invoice Modal */}
                            <button
                              onClick={() => setViewingInvoice && setViewingInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg cursor-pointer transition-colors"
                              title="مشاهده پیش‌نمایش و چاپ فاکتور"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Direct Print Button */}
                            <button
                              onClick={() => {
                                if (setViewingInvoice) {
                                  setViewingInvoice(inv);
                                  setTimeout(() => {
                                    safePrint("#invoice-sheet-to-print", {
                                      timeoutMs: 4000,
                                      documentTitle: `فاکتور شماره ${inv.invoiceNumber || inv.id || ""}`
                                    });
                                  }, 250);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg cursor-pointer transition-colors"
                              title="چاپ مستقیم فاکتور"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Edit Invoice */}
                            {!isVoided && handleEditInvoiceAction && (
                              <button
                                onClick={() => handleEditInvoiceAction(inv)}
                                className="p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 rounded-lg cursor-pointer transition-colors"
                                title="ویرایش فاکتور (بازگشت به پیش‌نویس)"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Void Invoice */}
                            {!isVoided && handleVoidInvoice && (
                              <button
                                onClick={() => handleVoidInvoice(inv.id)}
                                className="p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
                                title="ابطال سند"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete Invoice */}
                            {!isVoided && handleDeleteInvoice && (
                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                                title="حذف دائمی"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredInvoicesList.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText className="w-8 h-8 text-slate-300" />
                          <span className="text-sm font-bold text-slate-500">هیچ سندی با فیلترهای جاری یافت نشد.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredInvoicesList.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/70 print:hidden">
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
                  className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                  title="صفحه قبل"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-2 font-sans font-black text-xs">
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
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
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
                  className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                  title="صفحه بعد"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">نمایش در صفحه:</span>
              <select
                value={invoicePageSize}
                onChange={e => {
                  if (setInvoicePageSize) setInvoicePageSize(Number(e.target.value));
                  if (setInvoiceCurrentPage) setInvoiceCurrentPage(1);
                }}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-sans font-bold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
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
                <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                  <Package className="w-6 h-6 text-emerald-500" />
                  رسید سریع انبار
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  لطفا انبار مقصد برای فاکتور خرید شماره {toPersianDigits(fastReceiptInvoice.invoiceNumber || fastReceiptInvoice.id)} را انتخاب کنید:
                </p>
                <div className="space-y-4">
                  <select
                    value={fastReceiptWarehouseId}
                    onChange={(e) => setFastReceiptWarehouseId(e.target.value)}
                    className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 text-sm font-bold text-emerald-900 outline-none cursor-pointer"
                  >
                    <option value="">-- انتخاب انبار --</option>
                    {(warehouses || []).map((wh: any) => (
                      <option key={wh.id} value={wh.id}>{wh.name || wh.title || `انبار ${wh.id}`}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => {
                      setFastReceiptInvoice(null);
                      setFastReceiptWarehouseId("");
                    }}
                    className="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors cursor-pointer"
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
                    className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    ثبت و مشاهده رسید انبار
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
