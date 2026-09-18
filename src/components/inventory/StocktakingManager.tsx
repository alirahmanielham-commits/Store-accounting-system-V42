import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ClipboardList, Plus, Search, RefreshCw, Handshake, Trash2, X, ArrowLeft, 
  CheckCircle2, AlertTriangle, Printer, Box, Filter, Eye, ChevronDown, Check, 
  Scan, ArrowDownRight, ArrowUpRight, RotateCcw, FileText, Smartphone, Calendar,
  Package, Sparkles, Layers, CheckSquare
} from 'lucide-react';
import { 
  getStocktakings, 
  addStocktaking, 
  updateStocktaking, 
  deleteStocktaking, 
  getProducts, 
  getWarehouses, 
  getWarehouseStocks,
  getProductCategories,
  getStoreSettings,
  rollbackStocktakingSession
} from '../../services/dataService';
import { Stocktaking, StocktakingItem, Product, Warehouse, WarehouseStock, ProductCategory, CompanySettings } from '../../types';
import FastProductCreateModal from '../products/FastProductCreateModal';
import CustomDatePicker from '../ui/CustomDatePicker';
import StocktakingApplyModal from './StocktakingApplyModal';
import StocktakingPrintModal from './StocktakingPrintModal';
import StocktakingUnitModal from './StocktakingUnitModal';

interface Props {
  showNotification?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  currentUser?: string;
  onNavigateToDocs?: () => void;
}

export default function StocktakingManager({ showNotification, currentUser = 'مدیر سیستم', onNavigateToDocs }: Props) {
  const [stocktakings, setStocktakings] = useState<Stocktaking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stocks, setStocks] = useState<WarehouseStock[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [currentId, setCurrentId] = useState<string | number>('');
  const [warehouseId, setWarehouseId] = useState<string | number>('');
  const [date, setDate] = useState(new Date().toLocaleDateString('fa-IR'));
  const [description, setDescription] = useState('');
  const [verifierName, setVerifierName] = useState('');
  const [counterName, setCounterName] = useState('');
  const [items, setItems] = useState<StocktakingItem[]>([]);

  // Filtering and Search State in Items Table
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'discrepant' | 'deficit' | 'surplus' | 'matched' | 'uncounted'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [sessionSearch, setSessionSearch] = useState('');

  // Fast Search / Barcode State
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [barcodeFeedback, setBarcodeFeedback] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSession, setPrintSession] = useState<Stocktaking | null>(null);
  const [unitModalData, setUnitModalData] = useState<{ product: Product; item: StocktakingItem } | null>(null);

  const toPersianDigits = (str: string | number | null | undefined) =>
    str === null || str === undefined
      ? '-'
      : str.toString().replace(/\d/g, x => ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'][parseInt(x)]);

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
      const [sts, prods, whs, whStocks, cats, settings] = await Promise.all([
        getStocktakings(),
        getProducts(),
        getWarehouses(),
        getWarehouseStocks(),
        getProductCategories().catch(() => []),
        getStoreSettings().catch(() => null)
      ]);
      setStocktakings(sts);
      setProducts(prods);
      setWarehouses(whs);
      setStocks(whStocks);
      setCategories(cats);
      setCompanySettings(settings);
    } catch (e) {
      if (showNotification) showNotification('خطا در بارگذاری اطلاعات!', 'error');
    }
    setIsLoading(false);
  };

  const currentSession = stocktakings.find(s => String(s.id) === String(currentId));
  const isSessionApplied = currentSession?.status === 'applied';

  // Warehouses map
  const whMap = useMemo(() => {
    return (warehouses || []).reduce((acc, w) => ({ ...acc, [String(w.id)]: w.name }), {} as Record<string, string>);
  }, [warehouses]);

  const handleCreateNew = () => {
    const defaultWh = warehouses.length > 0 ? String(warehouses[0].id) : '';
    setWarehouseId(defaultWh);
    setDate(new Date().toLocaleDateString('fa-IR'));
    setDescription('');
    setVerifierName('');
    setCounterName(currentUser || '');
    setItems([]);
    setCurrentId('');
    setProductSearch('');
    setSearchTerm('');
    setActiveFilter('all');
    setSelectedCategoryId('all');
    setViewState('create');
  };

  const handleViewOrEdit = (st: Stocktaking) => {
    setCurrentId(st.id);
    setWarehouseId(String(st.warehouseId));
    setDate(st.date);
    setDescription(st.description || '');
    setVerifierName(st.verifierName || '');
    setCounterName(st.counterName || st.createdBy || '');
    setItems(st.items || []);
    setActiveFilter('all');
    setSelectedCategoryId('all');
    setSearchTerm('');
    setProductSearch('');
    setViewState('edit');
  };

  // Populate all products of the warehouse
  const handleLoadAllProducts = () => {
    if (!warehouseId) {
      if (showNotification) showNotification('لطفاً ابتدا انبار را انتخاب کنید', 'error');
      return;
    }
    const physicalProducts = (products || []).filter(p => p.type === 'product' || !p.type);
    const newItems: StocktakingItem[] = physicalProducts.map(p => {
      const stockEntry = stocks.find(
        s => String(s.productId) === String(p.id) && String(s.warehouseId) === String(warehouseId)
      );
      const expected = stockEntry ? Number(stockEntry.availableStock || stockEntry.physicalStock || 0) : 0;
      const existing = items.find(it => String(it.productId) === String(p.id));

      return {
        productId: p.id,
        productName: p.name,
        expectedStock: expected,
        countedStock: existing ? existing.countedStock : null,
        difference: existing && existing.countedStock !== null ? existing.countedStock - expected : 0,
        unitPrice: Number(p.purchasePrice || p.price || 0),
        unit: p.unit || 'عدد',
        secondaryUnit: p.secondaryUnit,
        unitRatio: p.unitRatio,
        unitRatioDirection: p.unitRatioDirection,
        countedBoxes: existing?.countedBoxes,
        countedUnits: existing?.countedUnits,
      };
    });

    setItems(newItems);
    if (showNotification) showNotification(`${toPersianDigits(newItems.length)} کالا در کاربرگ شمارش انبار قرار گرفتند.`, 'info');
  };

  // Add a specific product or handle barcode scan
  const handleAddOrIncrementProduct = (product: Product, isBarcodeScan = false) => {
    if (!warehouseId) {
      if (showNotification) showNotification('لطفاً ابتدا انبار را انتخاب کنید', 'error');
      return;
    }

    setProductSearch('');
    setShowProductDropdown(false);

    const existingIdx = items.findIndex(it => String(it.productId) === String(product.id));

    if (existingIdx > -1) {
      // If already in list:
      const updated = [...items];
      const targetItem = updated[existingIdx];

      if (isBarcodeScan) {
        // Auto-increment on barcode scanner!
        const currentCount = targetItem.countedStock === null ? 0 : Number(targetItem.countedStock);
        const nextCount = currentCount + 1;
        targetItem.countedStock = nextCount;
        targetItem.difference = nextCount - targetItem.expectedStock;
        setBarcodeFeedback(`+۱ به شمارش «${product.name}» اضافه شد (مجموع: ${toPersianDigits(nextCount)})`);
        setTimeout(() => setBarcodeFeedback(null), 2500);
      }

      setItems(updated);

      // Scroll to row and highlight
      setTimeout(() => {
        const row = document.getElementById(`item-row-${product.id}`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.add('bg-indigo-100/70');
          setTimeout(() => row.classList.remove('bg-indigo-100/70'), 1500);
          const input = row.querySelector('input');
          if (input && !isBarcodeScan) input.focus();
        }
      }, 50);

      return;
    }

    // New item to append
    const stockEntry = stocks.find(
      s => String(s.productId) === String(product.id) && String(s.warehouseId) === String(warehouseId)
    );
    const expected = stockEntry ? Number(stockEntry.availableStock || stockEntry.physicalStock || 0) : 0;
    const initialCount = isBarcodeScan ? 1 : null;

    const newItem: StocktakingItem = {
      productId: product.id,
      productName: product.name,
      expectedStock: expected,
      countedStock: initialCount,
      difference: initialCount !== null ? initialCount - expected : 0,
      unitPrice: Number(product.purchasePrice || product.price || 0),
      unit: product.unit || 'عدد',
      secondaryUnit: product.secondaryUnit,
      unitRatio: product.unitRatio,
      unitRatioDirection: product.unitRatioDirection,
    };

    setItems([newItem, ...items]);

    if (isBarcodeScan) {
      setBarcodeFeedback(`کالای «${product.name}» افزوده و شمارش شد (تعداد: ۱)`);
      setTimeout(() => setBarcodeFeedback(null), 2500);
    }

    setTimeout(() => {
      const row = document.getElementById(`item-row-${product.id}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = row.querySelector('input');
        if (input && !isBarcodeScan) input.focus();
      }
    }, 100);
  };

  const handleBarcodeKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && productSearch.trim()) {
      e.preventDefault();
      const term = productSearch.trim().toLowerCase();
      const matched = (products || []).filter(
        p => (p.type === 'product' || !p.type) &&
             (p.barcode?.toLowerCase() === term || p.code?.toLowerCase() === term || p.name?.toLowerCase().includes(term))
      );

      if (matched.length > 0) {
        // Priority to exact barcode or code match
        const exactMatch = matched.find(p => p.barcode?.toLowerCase() === term || p.code?.toLowerCase() === term) || matched[0];
        handleAddOrIncrementProduct(exactMatch, true);
      } else {
        if (showNotification) showNotification(`کالایی با کد یا بارکد «${productSearch}» یافت نشد.`, 'warning');
      }
    }
  };

  const handleRemoveItem = (productId: string | number) => {
    if (isSessionApplied) return;
    setItems(items.filter(it => String(it.productId) !== String(productId)));
  };

  // Bulk actions on counting
  const handleSetUncountedToExpected = () => {
    if (isSessionApplied) return;
    const updated = items.map(it => {
      if (it.countedStock === null) {
        return {
          ...it,
          countedStock: it.expectedStock,
          difference: 0
        };
      }
      return it;
    });
    setItems(updated);
    if (showNotification) showNotification('اقلام شمرده نشده، منطبق با موجودی دفتری تنظیم شدند.', 'success');
  };

  const handleSetUncountedToZero = () => {
    if (isSessionApplied) return;
    const updated = items.map(it => {
      if (it.countedStock === null) {
        return {
          ...it,
          countedStock: 0,
          difference: -it.expectedStock
        };
      }
      return it;
    });
    setItems(updated);
    if (showNotification) showNotification('اقلام شمرده نشده، با مقدار ۰ ثبت شدند.', 'info');
  };

  const handleClearAllCounts = () => {
    if (isSessionApplied) return;
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید تمام شمارش‌ها پاک شوند؟')) return;
    const updated = items.map(it => ({
      ...it,
      countedStock: null,
      difference: 0,
      countedBoxes: null,
      countedUnits: null
    }));
    setItems(updated);
    if (showNotification) showNotification('شمارش تمام اقلام ریست شد.', 'info');
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!warehouseId) {
      if (showNotification) showNotification('انتخاب انبار الزامی است', 'error');
      return;
    }

    setIsSaving(true);

    let totalDeficit = 0;
    let totalSurplus = 0;
    const calculatedItems = items.map(it => {
      const p = products.find(prod => String(prod.id) === String(it.productId));
      const cost = Number(it.unitPrice || p?.purchasePrice || p?.price || 0);
      const diff = Number(it.difference || 0);
      const cValue = diff * cost;
      if (it.countedStock !== null) {
        if (cValue < 0) totalDeficit += Math.abs(cValue);
        if (cValue > 0) totalSurplus += cValue;
      }
      return {
        ...it,
        unitPrice: cost,
        costValue: cValue
      };
    });

    const payload: Partial<Stocktaking> = {
      date,
      warehouseId,
      status: (currentSession?.status === 'applied' ? 'applied' : 'in_progress') as any,
      items: calculatedItems,
      description,
      verifierName,
      counterName,
      createdBy: currentUser,
      totalDeficitValue: totalDeficit,
      totalSurplusValue: totalSurplus,
    };

    try {
      if (viewState === 'create' || !currentId) {
        const added = await addStocktaking(payload as any);
        setStocktakings([added, ...stocktakings]);
        setCurrentId(added.id);
        if (showNotification) showNotification(`جلسه انبارگردانی شماره ${toPersianDigits(added.id)} ذخیره شد.`, 'success');
        setViewState('list');
      } else {
        const updated = await updateStocktaking(currentId, { ...payload, id: currentId });
        setStocktakings(stocktakings.map(s => String(s.id) === String(currentId) ? updated : s));
        if (showNotification) showNotification('تغییرات انبارگردانی ذخیره شد.', 'success');
        setViewState('list');
      }
    } catch {
      if (showNotification) showNotification('خطا در ذخیره اطلاعات انبارگردانی', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Rollback applied session
  const handleRollbackSession = async (sessionId: string | number) => {
    const confirmRollback = window.confirm(
      'هشدار: با ابطال انبارگردانی، اسناد رسید و حواله تعدیل صادره باطل شده و موجودی انبار به حالت قبل بازمی‌گردد.\nآیا ادامه می‌دهید؟'
    );
    if (!confirmRollback) return;

    setIsLoading(true);
    try {
      const rolledBack = await rollbackStocktakingSession(sessionId);
      setStocktakings(stocktakings.map(s => String(s.id) === String(sessionId) ? rolledBack : s));
      const freshStocks = await getWarehouseStocks();
      setStocks(freshStocks);
      if (showNotification) showNotification('انبارگردانی با موفقیت ابطال شد و به حالت در حال شمارش برگشت.', 'success');
      if (viewState !== 'list') {
        handleViewOrEdit(rolledBack);
      }
    } catch (err: any) {
      if (showNotification) showNotification(err?.message || 'خطا در ابطال انبارگردانی', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    const st = stocktakings.find(s => String(s.id) === String(id));
    if (st?.status === 'applied') {
      if (showNotification) showNotification('جلسه انبارگردانی اعمال شده قابل حذف مستقیم نیست. ابتدا آن را ابطال کنید.', 'warning');
      return;
    }
    if (!confirm('آیا از حذف این جلسه انبارگردانی مطمئن هستید؟')) return;
    await deleteStocktaking(id);
    setStocktakings(stocktakings.filter(s => String(s.id) !== String(id)));
    if (showNotification) showNotification('جلسه انبارگردانی حذف شد', 'success');
  };

  // Filtering items in active session
  const filteredItems = useMemo(() => {
    return (items || []).filter(it => {
      // Category filter
      if (selectedCategoryId !== 'all') {
        const prod = products.find(p => String(p.id) === String(it.productId));
        if (String(prod?.categoryId) !== String(selectedCategoryId)) return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const p = products.find(prod => String(prod.id) === String(it.productId));
        const matchesName = it.productName?.toLowerCase().includes(term);
        const matchesCode = p?.code?.toLowerCase().includes(term);
        const matchesBarcode = p?.barcode?.toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesBarcode) return false;
      }

      // Status filter
      if (activeFilter === 'discrepant') {
        return it.countedStock !== null && Number(it.difference) !== 0;
      }
      if (activeFilter === 'deficit') {
        return it.countedStock !== null && Number(it.difference) < 0;
      }
      if (activeFilter === 'surplus') {
        return it.countedStock !== null && Number(it.difference) > 0;
      }
      if (activeFilter === 'matched') {
        return it.countedStock !== null && Number(it.difference) === 0;
      }
      if (activeFilter === 'uncounted') {
        return it.countedStock === null;
      }

      return true;
    });
  }, [items, selectedCategoryId, searchTerm, activeFilter, products]);

  // Counting Statistics
  const stats = useMemo(() => {
    const totalItems = items.length;
    const countedItems = items.filter(i => i.countedStock !== null);
    const countedCount = countedItems.length;
    const uncountedCount = totalItems - countedCount;
    const surplusItems = countedItems.filter(i => Number(i.difference) > 0);
    const deficitItems = countedItems.filter(i => Number(i.difference) < 0);
    const matchedItems = countedItems.filter(i => Number(i.difference) === 0);

    let totalSurplusVal = 0;
    let totalDeficitVal = 0;

    surplusItems.forEach(it => {
      const p = products.find(prod => String(prod.id) === String(it.productId));
      const cost = Number(it.unitPrice || p?.purchasePrice || p?.price || 0);
      totalSurplusVal += Number(it.difference) * cost;
    });

    deficitItems.forEach(it => {
      const p = products.find(prod => String(prod.id) === String(it.productId));
      const cost = Number(it.unitPrice || p?.purchasePrice || p?.price || 0);
      totalDeficitVal += Math.abs(Number(it.difference)) * cost;
    });

    const netVal = totalSurplusVal - totalDeficitVal;
    const progressPercent = totalItems > 0 ? Math.round((countedCount / totalItems) * 100) : 0;

    return {
      totalItems,
      countedCount,
      uncountedCount,
      surplusCount: surplusItems.length,
      deficitCount: deficitItems.length,
      matchedCount: matchedItems.length,
      discrepantCount: surplusItems.length + deficitItems.length,
      totalSurplusVal,
      totalDeficitVal,
      netVal,
      progressPercent,
    };
  }, [items, products]);

  // Sessions list stats
  const listStats = useMemo(() => {
    const total = stocktakings.length;
    const inProgress = stocktakings.filter(s => s.status === 'in_progress' || s.status === 'pending').length;
    const applied = stocktakings.filter(s => s.status === 'applied').length;
    const totalDeficitAll = stocktakings.reduce((sum, s) => sum + (Number(s.totalDeficitValue) || 0), 0);
    const totalSurplusAll = stocktakings.reduce((sum, s) => sum + (Number(s.totalSurplusValue) || 0), 0);
    return { total, inProgress, applied, totalDeficitAll, totalSurplusAll };
  }, [stocktakings]);

  // Session search filtered
  const filteredStocktakings = useMemo(() => {
    if (!sessionSearch.trim()) return stocktakings;
    const term = sessionSearch.toLowerCase();
    return stocktakings.filter(s =>
      String(s.id).includes(term) ||
      s.date?.includes(term) ||
      whMap[String(s.warehouseId)]?.toLowerCase().includes(term) ||
      s.description?.toLowerCase().includes(term)
    );
  }, [stocktakings, sessionSearch, whMap]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs font-bold text-slate-500">در حال بارگذاری ماژول انبارگردانی...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">
              ماژول انبارگردانی و تطبیق موجودی
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              شمارش فیزیکی کالاها، محاسبه دقیق مغایرت‌ها و صدور اسناد اتوماتیک رسید و حواله تعدیل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {viewState === 'list' ? (
            <button
              onClick={handleCreateNew}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> انبارگردانی جدید
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewState('list')}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> بازگشت به لیست
              </button>

              <button
                onClick={() => {
                  const targetSession: Stocktaking = {
                    id: currentId || 'پیش‌نویس',
                    date,
                    warehouseId,
                    status: (currentSession?.status || 'in_progress') as any,
                    items,
                    description,
                    totalDeficitValue: stats.totalDeficitVal,
                    totalSurplusValue: stats.totalSurplusVal,
                    receiptNumber: currentSession?.receiptNumber,
                    remittanceNumber: currentSession?.remittanceNumber,
                    appliedDate: currentSession?.appliedDate,
                  };
                  setPrintSession(targetSession);
                  setIsPrintModalOpen(true);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" /> چاپ کاربرگ / صورت‌جلسه
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          VIEW: LIST OF SESSIONS
         ========================================================================= */}
      {viewState === 'list' ? (
        <div className="space-y-6">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block mb-1">کل جلسات</span>
                <span className="text-xl font-black text-slate-800 font-mono">{toPersianDigits(listStats.total)}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-700 block mb-1">در حال شمارش / باز</span>
                <span className="text-xl font-black text-amber-700 font-mono">{toPersianDigits(listStats.inProgress)}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-700 block mb-1">اعمال شده در انبار</span>
                <span className="text-xl font-black text-emerald-700 font-mono">{toPersianDigits(listStats.applied)}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-rose-700 block mb-1">مجموع ارزش کسری انبار</span>
                <span className="text-lg font-black text-rose-700 font-mono">
                  {toPersianDigits(listStats.totalDeficitAll.toLocaleString())} ت
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder="جستجو در جلسات انبارگردانی (کد، تاریخ، انبار)..."
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-bold">
              {toPersianDigits(filteredStocktakings.length)} جلسه ثبت شده
            </span>
          </div>

          {/* Table of Sessions */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            {filteredStocktakings.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                <ClipboardList className="w-16 h-16 mb-4 text-slate-200" />
                <p className="font-bold text-base text-slate-600">هیچ جلسه انبارگردانی یافت نشد.</p>
                <p className="text-xs text-slate-400 mt-1">با کلیک روی دکمه زیر اولین انبارگردانی را ثبت و آغاز کنید.</p>
                <button
                  onClick={handleCreateNew}
                  className="mt-5 px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition-colors"
                >
                  + شروع انبارگردانی جدید
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3.5 text-center w-14">کد جلسه</th>
                      <th className="p-3.5">تاریخ</th>
                      <th className="p-3.5">انبار</th>
                      <th className="p-3.5">تعداد اقلام</th>
                      <th className="p-3.5">مغایرت‌ها</th>
                      <th className="p-3.5">ارزش کسری / مازاد</th>
                      <th className="p-3.5">وضعیت</th>
                      <th className="p-3.5">اسناد صادر شده</th>
                      <th className="p-3.5 text-center w-40">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStocktakings.map((st) => {
                      const stItems = st.items || [];
                      const countedCount = stItems.filter(i => i.countedStock !== null).length;
                      const deficitsCount = stItems.filter(i => i.countedStock !== null && Number(i.difference) < 0).length;
                      const surplusesCount = stItems.filter(i => i.countedStock !== null && Number(i.difference) > 0).length;

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                            {toPersianDigits(st.id)}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-700">
                            {toPersianDigits(st.date)}
                          </td>
                          <td className="p-3.5 font-bold text-indigo-700">
                            {whMap[String(st.warehouseId)] || 'انبار نامشخص'}
                          </td>
                          <td className="p-3.5 text-slate-700">
                            <span className="font-bold">{toPersianDigits(countedCount)}</span> از{' '}
                            <span className="text-slate-400 font-mono">{toPersianDigits(stItems.length)}</span>
                          </td>
                          <td className="p-3.5">
                            {deficitsCount === 0 && surplusesCount === 0 ? (
                              <span className="text-slate-400 text-[11px]">بدون مغایرت</span>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                {deficitsCount > 0 && (
                                  <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md">
                                    {toPersianDigits(deficitsCount)} کسری
                                  </span>
                                )}
                                {surplusesCount > 0 && (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                    {toPersianDigits(surplusesCount)} مازاد
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 font-mono">
                            <div className="space-y-0.5 text-[11px]">
                              {st.totalDeficitValue ? (
                                <div className="text-rose-600 font-bold">
                                  -{toPersianDigits(st.totalDeficitValue.toLocaleString())} ت
                                </div>
                              ) : null}
                              {st.totalSurplusValue ? (
                                <div className="text-emerald-600 font-bold">
                                  +{toPersianDigits(st.totalSurplusValue.toLocaleString())} ت
                                </div>
                              ) : null}
                              {!st.totalDeficitValue && !st.totalSurplusValue && (
                                <span className="text-slate-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {st.status === 'applied' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> اعمال شده در انبار
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-bold border border-amber-200">
                                <RefreshCw className="w-3 h-3 animate-spin" /> در حال شمارش
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-[11px]">
                            {st.status === 'applied' ? (
                              <div className="space-y-0.5 font-mono text-slate-600">
                                {st.receiptNumber && <div>رسید: <strong>{st.receiptNumber}</strong></div>}
                                {st.remittanceNumber && <div>حواله: <strong>{st.remittanceNumber}</strong></div>}
                                {!st.receiptNumber && !st.remittanceNumber && <span>تعدیل ثبت شد</span>}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">منتظر تایید نهایی</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleViewOrEdit(st)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title={st.status === 'applied' ? 'مشاهده جزئیات' : 'ویرایش و ادامه شمارش'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setPrintSession(st);
                                  setIsPrintModalOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="چاپ صورت‌جلسه / کاربرگ"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {st.status === 'applied' ? (
                                <button
                                  onClick={() => handleRollbackSession(st.id)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="ابطال اعمال و بازگشت به حالت شمارش"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDelete(st.id)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="حذف جلسه"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}

                              {st.status !== 'applied' && (
                                <a
                                  href={`#fast-stocktaking?id=${st.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="باز کردن در موبایل / بارکدخوان"
                                >
                                  <Smartphone className="w-4 h-4" />
                                </a>
                              )}
                            </div>
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
      ) : (
        /* =========================================================================
            VIEW: CREATE / EDIT SESSION
           ========================================================================= */
        <div className="space-y-6">
          
          {/* Session Banner if applied */}
          {isSessionApplied && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-emerald-900">این انبارگردانی در سیستم تایید و اعمال شده است.</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    موجودی‌ها تعدیل شدند. رسید انبار: <strong>{currentSession?.receiptNumber || '-'}</strong> | حواله انبار: <strong>{currentSession?.remittanceNumber || '-'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRollbackSession(currentId)}
                className="px-4 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>ابطال و بازگشت از اعمال</span>
              </button>
            </div>
          )}

          {/* Session Metadata Card */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  انتخاب انبار <span className="text-rose-500">*</span>
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => {
                    setWarehouseId(e.target.value);
                  }}
                  disabled={isSessionApplied || items.length > 0}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60"
                >
                  <option value="">-- انبار را انتخاب کنید --</option>
                  {(warehouses || []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ انبارگردانی</label>
                <CustomDatePicker
                  value={date}
                  onChange={(d: any) => setDate(d?.format ? d.format() : d || new Date().toLocaleDateString('fa-IR'))}
                  calendarPosition="bottom-right"
                  disabled={isSessionApplied}
                  inputClass="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-left font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نام شمارش‌گر</label>
                <input
                  type="text"
                  value={counterName}
                  onChange={(e) => setCounterName(e.target.value)}
                  disabled={isSessionApplied}
                  placeholder="مثلا: محمد رضایی"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">سرپرست انبارگردانی / ناظر</label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  disabled={isSessionApplied}
                  placeholder="مثلا: مدیر مالی / حسابرس"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">توضیحات و بابت انبارگردانی</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSessionApplied}
                placeholder="مثلا: انبارگردانی پایان دوره مالی سال ۱۴۰۳..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Quick Actions & Barcode Input Bar */}
          {!isSessionApplied && (
            <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Barcode & Search Input */}
              <div className="relative w-full md:w-96" ref={searchInputRef}>
                <div className="relative">
                  <Scan className="w-5 h-5 absolute right-3 top-2.5 text-indigo-500" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    onKeyDown={handleBarcodeKeydown}
                    disabled={!warehouseId}
                    placeholder="اسکن بارکدخوان یا جستجوی نام/کد کالا..."
                    className="w-full pr-10 pl-4 py-2.5 bg-indigo-50/40 border border-indigo-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 placeholder-indigo-300"
                  />
                </div>

                {/* Dropdown search results */}
                {showProductDropdown && productSearch && warehouseId && (
                  <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-50 divide-y divide-slate-100">
                    {(products || [])
                      .filter(
                        p =>
                          (p.type === 'product' || !p.type) &&
                          (p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                           p.code?.toLowerCase().includes(productSearch.toLowerCase()) ||
                           p.barcode?.toLowerCase().includes(productSearch.toLowerCase()))
                      )
                      .slice(0, 10)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleAddOrIncrementProduct(p, false)}
                          className="w-full text-right p-3 hover:bg-indigo-50 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-bold text-xs text-slate-800 block">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              کد: {p.code || '-'} | بارکد: {p.barcode || '-'}
                            </span>
                          </div>
                          <Plus className="w-4 h-4 text-indigo-600" />
                        </button>
                      ))}

                    <div className="p-2.5 text-center bg-slate-50">
                      <button
                        onClick={() => setIsProductModalOpen(true)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        + تعریف و ثبت کالای جدید
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Barcode feedback alert */}
              {barcodeFeedback && (
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 animate-in fade-in duration-150">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{barcodeFeedback}</span>
                </div>
              )}

              {/* Populate buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleLoadAllProducts}
                  disabled={!warehouseId}
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Package className="w-4 h-4" />
                  <span>فراخوانی تمام کالاهای انبار</span>
                </button>
              </div>
            </div>
          )}

          {/* Items Table Container */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden" ref={tableContainerRef}>
            
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-50/70">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  همه ({toPersianDigits(items.length)})
                </button>
                <button
                  onClick={() => setActiveFilter('discrepant')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeFilter === 'discrepant' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  دارای مغایرت ({toPersianDigits(stats.discrepantCount)})
                </button>
                <button
                  onClick={() => setActiveFilter('deficit')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeFilter === 'deficit' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  کسری‌ها ({toPersianDigits(stats.deficitCount)})
                </button>
                <button
                  onClick={() => setActiveFilter('surplus')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeFilter === 'surplus' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  مازادها ({toPersianDigits(stats.surplusCount)})
                </button>
                <button
                  onClick={() => setActiveFilter('matched')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeFilter === 'matched' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  منطبق ({toPersianDigits(stats.matchedCount)})
                </button>
                <button
                  onClick={() => setActiveFilter('uncounted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeFilter === 'uncounted' ? 'bg-slate-700 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  شمارش نشده ({toPersianDigits(stats.uncountedCount)})
                </button>
              </div>

              {/* Category & Table search */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="all">همه دسته‌ها</option>
                  {(categories || []).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="جستجو در اقلام لیست..."
                    className="pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 w-44"
                  />
                </div>

                {/* Bulk Actions Dropdown / Menu */}
                {!isSessionApplied && items.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleSetUncountedToExpected}
                      title="تنظیم خودکار اقلام شمرده‌نشده مساوی موجودی دفتری"
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold transition-colors"
                    >
                      تطبیق شمرده‌نشده‌ها
                    </button>
                    <button
                      onClick={handleSetUncountedToZero}
                      title="تنظیم اقلام شمرده‌نشده به صفر"
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold transition-colors"
                    >
                      صفر کردن باقیمانده
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            {items.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Package className="w-12 h-12 mx-auto text-slate-300" />
                <p className="font-bold text-sm text-slate-600">هنوز کالایی در کاربرگ انبارگردانی وارد نشده است.</p>
                <p className="text-xs text-slate-400">
                  از دکمه «فراخوانی تمام کالاهای انبار» استفاده کنید یا بارکد کالاها را با بارکدخوان اسکن نمایید.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[520px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3 w-28">کد / بارکد</th>
                      <th className="p-3">نام کالا</th>
                      <th className="p-3 w-28 text-center">واحد اصلی</th>
                      <th className="p-3 w-28 text-center">واحد فرعی</th>
                      <th className="p-3 w-24 text-center">موجودی سیستم</th>
                      <th className="p-3 w-40 text-center bg-indigo-50/50 text-indigo-900">تعداد شمارش شده</th>
                      <th className="p-3 w-28 text-center">مغایرت</th>
                      <th className="p-3 w-28 text-center">بهای واحد</th>
                      <th className="p-3 w-32 text-center">ارزش ریالی مغایرت</th>
                      {!isSessionApplied && <th className="p-3 w-12 text-center">حذف</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((it, idx) => {
                      const p = products.find(prod => String(prod.id) === String(it.productId));
                      const hasSecUnit = Boolean(p?.secondaryUnit || it.secondaryUnit) && Number(p?.unitRatio || it.unitRatio || 1) > 1;
                      const ratio = Number(p?.unitRatio || it.unitRatio || 1);
                      const cost = Number(it.unitPrice || p?.purchasePrice || p?.price || 0);
                      const diff = Number(it.difference || 0);
                      const diffValue = diff * cost;

                      return (
                        <tr
                          key={it.productId}
                          id={`item-row-${it.productId}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="p-3 text-center text-slate-400 font-mono">
                            {toPersianDigits(idx + 1)}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            <div>{p?.code || '-'}</div>
                            {p?.barcode && <div className="text-[10px] text-slate-400">{p.barcode}</div>}
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            {it.productName}
                          </td>
                          <td className="p-3 text-center text-slate-600">
                            {it.unit || p?.unit || 'عدد'}
                          </td>
                          <td className="p-3 text-center">
                            {hasSecUnit ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSessionApplied || !p) return;
                                  setUnitModalData({ product: p, item: it });
                                }}
                                disabled={isSessionApplied}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 border border-indigo-100"
                              >
                                <Box className="w-3 h-3" />
                                <span>{p?.secondaryUnit} ({toPersianDigits(ratio)})</span>
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700 bg-slate-50/50">
                            {toPersianDigits(it.expectedStock)}
                          </td>
                          <td className="p-2.5 bg-indigo-50/30">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={it.countedStock !== null ? it.countedStock : ''}
                                disabled={isSessionApplied}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                  const newItems = [...items];
                                  const targetIdx = newItems.findIndex(x => String(x.productId) === String(it.productId));
                                  if (targetIdx > -1) {
                                    newItems[targetIdx].countedStock = val;
                                    newItems[targetIdx].difference = val !== null ? val - newItems[targetIdx].expectedStock : 0;
                                    setItems(newItems);
                                  }
                                }}
                                placeholder="شمارش نشده"
                                className="w-full p-2 border border-indigo-200 text-center font-mono font-bold text-sm text-indigo-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder-indigo-200 bg-white"
                              />

                              {hasSecUnit && !isSessionApplied && p && (
                                <button
                                  type="button"
                                  onClick={() => setUnitModalData({ product: p, item: it })}
                                  title="ورود تعداد بر اساس کارتن و بسته"
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg shrink-0"
                                >
                                  <Box className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono font-bold">
                            {it.countedStock === null ? (
                              <span className="text-slate-300">-</span>
                            ) : diff === 0 ? (
                              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">منطبق</span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                                +{toPersianDigits(diff)} (مازاد)
                              </span>
                            ) : (
                              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md text-[11px]">
                                {toPersianDigits(diff)} (کسری)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-600 text-[11px]">
                            {toPersianDigits(cost.toLocaleString())}
                          </td>
                          <td className={`p-3 text-center font-mono font-bold text-[11px] ${
                            diffValue > 0 ? 'text-emerald-700' : diffValue < 0 ? 'text-rose-700' : 'text-slate-400'
                          }`}>
                            {it.countedStock === null || diffValue === 0
                              ? '۰'
                              : `${diffValue > 0 ? '+' : ''}${toPersianDigits(diffValue.toLocaleString())} ت`}
                          </td>
                          {!isSessionApplied && (
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleRemoveItem(it.productId)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Summary & Progress Bar */}
            <div className="p-5 border-t border-slate-200 bg-slate-50/90 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              {/* Progress & Quick stats */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto flex-1">
                <div className="w-full sm:w-56 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>پیشرفت شمارش اقلام:</span>
                    <span className="text-indigo-600 font-mono">{toPersianDigits(stats.progressPercent)}٪</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.progressPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {toPersianDigits(stats.countedCount)} از {toPersianDigits(stats.totalItems)} کالا شمارش شده
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">کل کسری انبار:</span>
                    <span className="font-bold text-rose-600 font-mono">
                      -{toPersianDigits(stats.totalDeficitVal.toLocaleString())} ت
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">کل مازاد انبار:</span>
                    <span className="font-bold text-emerald-600 font-mono">
                      +{toPersianDigits(stats.totalSurplusVal.toLocaleString())} ت
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">خالص اثر ریالی:</span>
                    <span className={`font-bold font-mono ${stats.netVal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {stats.netVal >= 0 ? '+' : ''}{toPersianDigits(stats.netVal.toLocaleString())} ت
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving || isSessionApplied}
                  className="px-5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                  <span>ذخیره موقت</span>
                </button>

                {!isSessionApplied ? (
                  <button
                    onClick={() => {
                      if (!warehouseId) {
                        if (showNotification) showNotification('لطفاً ابتدا انبار را انتخاب کنید', 'error');
                        return;
                      }
                      if (stats.countedCount === 0) {
                        if (showNotification) showNotification('حداقل باید موجودی یک کالا را شمارش کنید', 'warning');
                        return;
                      }
                      setIsApplyModalOpen(true);
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Handshake className="w-4 h-4" />
                    <span>بررسی و اعمال نهایی انبارگردانی</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleRollbackSession(currentId)}
                    className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>ابطال و بازگشت از اعمال</span>
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* Apply Stocktaking Modal */}
      {isApplyModalOpen && (
        <StocktakingApplyModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          session={{
            id: currentId || 'پیش‌نویس',
            date,
            warehouseId,
            status: (currentSession?.status || 'in_progress') as any,
            items,
            description,
            totalDeficitValue: stats.totalDeficitVal,
            totalSurplusValue: stats.totalSurplusVal,
          }}
          products={products}
          warehouse={warehouses.find(w => String(w.id) === String(warehouseId))}
          currentUser={currentUser}
          onSuccess={async (appliedSession) => {
            await fetchData();
            setViewState('list');
            if (showNotification) showNotification('انبارگردانی با موفقیت اعمال و اسناد رسید/حواله صادر گردید.', 'success');
          }}
          onOpenPrint={() => {
            const targetSession: Stocktaking = {
              id: currentId,
              date,
              warehouseId,
              status: 'applied',
              items,
              description,
              totalDeficitValue: stats.totalDeficitVal,
              totalSurplusValue: stats.totalSurplusVal,
              receiptNumber: currentSession?.receiptNumber,
              remittanceNumber: currentSession?.remittanceNumber,
              appliedDate: currentSession?.appliedDate || new Date().toLocaleDateString('fa-IR'),
            };
            setPrintSession(targetSession);
            setIsPrintModalOpen(true);
          }}
          onNavigateToDocs={onNavigateToDocs}
        />
      )}

      {/* Print Sheets Modal */}
      {isPrintModalOpen && printSession && (
        <StocktakingPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          session={printSession}
          products={products}
          warehouse={warehouses.find(w => String(w.id) === String(printSession.warehouseId))}
          companySettings={companySettings}
        />
      )}

      {/* Dual Unit Calculator Modal */}
      {unitModalData && (
        <StocktakingUnitModal
          isOpen={Boolean(unitModalData)}
          onClose={() => setUnitModalData(null)}
          product={unitModalData.product}
          item={unitModalData.item}
          onConfirm={(totalBaseQty, boxes, looseUnits) => {
            const updated = [...items];
            const idx = updated.findIndex(it => String(it.productId) === String(unitModalData.item.productId));
            if (idx > -1) {
              updated[idx].countedStock = totalBaseQty;
              updated[idx].countedBoxes = boxes;
              updated[idx].countedUnits = looseUnits;
              updated[idx].difference = totalBaseQty - updated[idx].expectedStock;
              setItems(updated);
            }
          }}
        />
      )}

      {/* Fast Product Create Modal */}
      {isProductModalOpen && (
        <FastProductCreateModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSave={async (newProduct) => {
            const freshProds = await getProducts();
            setProducts(freshProds);
            setIsProductModalOpen(false);
            handleAddOrIncrementProduct(newProduct, false);
            return true;
          }}
        />
      )}

    </div>
  );
}
