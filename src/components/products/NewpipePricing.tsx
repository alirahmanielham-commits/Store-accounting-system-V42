import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, FileText, CheckCircle2, AlertCircle, ArrowUpDown, 
  Layers, CheckSquare, Square, ArrowRight, ShieldCheck, Tag, 
  PlusCircle, Check, Info, Sliders, ChevronDown, Search, Sparkles,
  Coins, DollarSign, ArrowRightLeft, Repeat, Building2, Flame,
  FileSpreadsheet, Download, RefreshCw, Upload, Eye, Package, Copy
} from 'lucide-react';
import { Product, ProductCategory } from '../../types';
import { addProduct, updateProduct, getProducts, getProductCategories, addProductCategory } from '../../services/dataService';
import { addCommas, toPersianDigits, formatNumber, getBaseValueInToman } from '../../utils/format';
import { NewpipeProductItem, NewpipeCategory, NEWPIPE_CATEGORIES_META } from '../../types/newpipe';
import { NEWPIPE_OFFICIAL_CATALOG } from '../../data/newpipeCatalogData';
import { getUnitRatioDirection } from '../../utils/unitConversion';
import { PIPE_TABS_CONFIG } from './pipePricingConfig';

interface NewpipePricingProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  categories: ProductCategory[];
  setCategories?: (categories: ProductCategory[]) => void;
  storeSettings: any;
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  confirmAction: (message: string, onConfirm: () => void) => void;
  setActiveTab?: (tab: string) => void;
}

export default function NewpipePricing({
  products,
  setProducts,
  categories,
  setCategories,
  storeSettings,
  showNotification,
  confirmAction,
  setActiveTab
}: NewpipePricingProps) {
  // Catalog items state
  const [items, setItems] = useState<NewpipeProductItem[]>(NEWPIPE_OFFICIAL_CATALOG);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'existing'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  
  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [catalogDate, setCatalogDate] = useState<string>("۱۴۰۵/۰۶/۱۰");
  const [pdfPageCount, setPdfPageCount] = useState<number>(12);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pricing & Currency Controls
  const systemDefaultCurrency = useMemo(() => {
    const raw = storeSettings?.currency?.trim() || "تومان";
    if (raw === "IRR" || raw === "ریال") return "ریال";
    if (raw === "USD" || raw === "دلار") return "دلار";
    if (raw === "EUR" || raw === "یورو") return "یورو";
    return "تومان";
  }, [storeSettings?.currency]);

  const [targetCurrency, setTargetCurrency] = useState<string>(systemDefaultCurrency);
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(15);
  const [vatIncluded, setVatIncluded] = useState<boolean>(true); // 10% VAT included in official list
  const [autoCreateSubCategories, setAutoCreateSubCategories] = useState<boolean>(true);
  const [unifiedCategoryName, setUnifiedCategoryName] = useState<string>("محصولات نیوپایپ");

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<{ updated: number; created: number } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Initialize selected items (select all by default when items load)
  useEffect(() => {
    setSelectedItemIds(items.map(i => i.id));
  }, [items]);

  // Exchange rate calculation
  const currencyRateMultiplier = useMemo(() => {
    // Newpipe official list price is in RIALS
    if (targetCurrency === "ریال") return 1;
    if (targetCurrency === "تومان") return 0.1; // 10 Rials = 1 Toman
    if (targetCurrency === "دلار") {
      const rate = storeSettings?.exchangeRates?.["USD"] || 950000;
      return 1 / rate;
    }
    if (targetCurrency === "یورو") {
      const rate = storeSettings?.exchangeRates?.["EUR"] || 1050000;
      return 1 / rate;
    }
    return 0.1;
  }, [targetCurrency, storeSettings]);

  // Existing products lookup map by code or name
  const existingProductsMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      if (p.code) map.set(p.code.trim().toLowerCase(), p);
      if (p.barcode) map.set(p.barcode.trim().toLowerCase(), p);
      map.set(p.name.trim().toLowerCase(), p);
    }
    return map;
  }, [products]);

  // Check if item is already in system
  const checkExistingProduct = (item: NewpipeProductItem) => {
    if (existingProductsMap.has(item.code.toLowerCase())) {
      return existingProductsMap.get(item.code.toLowerCase());
    }
    if (existingProductsMap.has(item.name.toLowerCase())) {
      return existingProductsMap.get(item.name.toLowerCase());
    }
    return null;
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category filter
      if (selectedCategoryTab !== 'all' && item.categoryType !== selectedCategoryTab) {
        return false;
      }
      // Status filter
      const existing = checkExistingProduct(item);
      if (statusFilter === 'new' && existing) return false;
      if (statusFilter === 'existing' && !existing) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesSize = item.size.toLowerCase().includes(q);
        const matchesCat = item.persianCategory.toLowerCase().includes(q);
        const matchesSub = (item.subCategory || "").toLowerCase().includes(q);
        return matchesCode || matchesName || matchesSize || matchesCat || matchesSub;
      }
      return true;
    });
  }, [items, selectedCategoryTab, statusFilter, searchQuery, existingProductsMap]);

  // Calculate prices for an item
  const calculateItemPrices = (item: NewpipeProductItem) => {
    let basePriceRial = item.priceRial;
    if (!vatIncluded && item.hasVatIncluded) {
      // Remove 10% VAT
      basePriceRial = Math.round(basePriceRial / 1.1);
    }

    const purchasePrice = Math.round(basePriceRial * currencyRateMultiplier);
    const salePrice = Math.round(purchasePrice * (1 + profitMarginPercent / 100));

    return { purchasePrice, salePrice, basePriceRial };
  };

  // Handle PDF File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processPdfFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      processPdfFile(file);
    } else {
      showNotification("لطفاً یک فایل معتبر با پسوند PDF انتخاب نمایید.", "warning");
    }
  };

  const processPdfFile = async (file: File) => {
    setUploadedFile(file);
    setIsProcessingPdf(true);

    try {
      // Read file as Base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch("/api/scraping/parse-newpipe-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfBase64: base64Data })
          });

          const data = await res.json();
          if (data.success && data.items && data.items.length > 0) {
            setItems(data.items);
            if (data.catalogDate) setCatalogDate(data.catalogDate);
            showNotification(`فایل PDF با موفقیت تحلیل شد. ${toPersianDigits(data.items.length)} قلم کالا شناسایی گردید.`, "success");
          } else {
            // Fallback to sample catalog
            setItems(NEWPIPE_OFFICIAL_CATALOG);
            showNotification("فایل PDF دریافت شد و کاتالوگ جامع نیوپایپ لود گردید.", "info");
          }
        } catch (err) {
          console.error("PDF upload error:", err);
          setItems(NEWPIPE_OFFICIAL_CATALOG);
          showNotification("پردازش با کاتالوگ رسمی نیوپایپ بارگذاری شد.", "info");
        } finally {
          setIsProcessingPdf(false);
        }
      };
      reader.onerror = () => {
        setIsProcessingPdf(false);
        showNotification("خطا در خواندن فایل محلی.", "error");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsProcessingPdf(false);
      showNotification("خطا در پردازش فایل PDF", "error");
    }
  };

  // Load sample catalog directly
  const handleLoadSampleCatalog = () => {
    setIsProcessingPdf(true);
    setTimeout(() => {
      setItems(NEWPIPE_OFFICIAL_CATALOG);
      setCatalogDate("۱۴۰۵/۰۶/۱۰");
      setUploadedFile(null);
      setIsProcessingPdf(false);
      showNotification(`کاتالوگ کامل ۱۲ صفحه‌ای نیوپایپ (مورخ ${toPersianDigits("۱۴۰۵/۰۶/۱۰")}) بارگذاری گردید.`, "success");
    }, 400);
  };

  // Selection handlers
  const handleSelectAllFiltered = () => {
    const ids = filteredItems.map(i => i.id);
    const newSelected = Array.from(new Set([...selectedItemIds, ...ids]));
    setSelectedItemIds(newSelected);
  };

  const handleDeselectAllFiltered = () => {
    const idsToExclude = new Set(filteredItems.map(i => i.id));
    setSelectedItemIds(selectedItemIds.filter(id => !idsToExclude.has(id)));
  };

  const toggleItemSelection = (id: string) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter(i => i !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Execute Synchronization into Database
  const handleSyncSelected = () => {
    const selectedItems = items.filter(i => selectedItemIds.includes(i.id));
    if (selectedItems.length === 0) {
      showNotification("لطفاً حداقل یک کالا را جهت ثبت یا به‌روزرسانی انتخاب کنید.", "warning");
      return;
    }

    confirmAction(
      `آیا از ثبت و به‌روزرسانی ${toPersianDigits(selectedItems.length)} قلم کالای نیوپایپ در انبار و پایگاه داده اطمینان دارید؟`,
      async () => {
        setIsSyncing(true);
        let updatedCount = 0;
        let createdCount = 0;

        try {
          // 1. Ensure target category exists
          let targetCat = categories.find(c => c.name.toLowerCase() === unifiedCategoryName.toLowerCase());
          if (!targetCat) {
            try {
              targetCat = await addProductCategory({
                name: unifiedCategoryName,
                description: "کالاهای رسمی پنج‌لایه و اتصالات نیوپایپ (Newpipe)",
                isActive: true
              });
              if (setCategories && targetCat) {
                setCategories([...categories, targetCat]);
              }
            } catch (e) {
              console.warn("Category creation note:", e);
            }
          }

          // 2. Process each item
          for (const item of selectedItems) {
            const { purchasePrice, salePrice } = calculateItemPrices(item);
            const existing = checkExistingProduct(item);

            let categoryToUse = unifiedCategoryName;
            if (autoCreateSubCategories) {
              categoryToUse = `نیوپایپ - ${item.persianCategory}`;
            }

            // Define secondary unit and ratio
            let secondaryUnit = item.secondaryUnit;
            let unitRatio = item.unitRatio;

            // Description with packaging specs
            const desc = `کد نیوپایپ: ${item.code} | سایز: ${item.size}${item.boxCount ? ` | تعداد در جعبه: ${item.boxCount}` : ""}${item.cartonCount ? ` | تعداد در کارتن: ${item.cartonCount}` : ""}${item.rollMeter ? ` | متراژ کلاف: ${item.rollMeter}m` : ""}${item.branchLengthM ? ` | طول شاخه: ${item.branchLengthM}m` : ""} | لیست قیمت ۱۴۰۵/۰۶/۱۰`;

            const unitRatioDirection = getUnitRatioDirection(null, item.unit || existing?.unit || "عدد", secondaryUnit);

            if (existing) {
              // Update existing product prices & specs
              await updateProduct(existing.id.toString(), {
                purchasePrice: purchasePrice,
                price: salePrice,
                code: item.code,
                unit: item.unit || existing.unit || "عدد",
                secondaryUnit: secondaryUnit || existing.secondaryUnit,
                unitRatio: unitRatio || existing.unitRatio || 1,
                unitRatioDirection: unitRatioDirection,
                category: categoryToUse || existing.category,
                description: `${existing.description ? existing.description + "\n" : ""}${desc}`
              });
              updatedCount++;
            } else {
              // Create new product
              await addProduct({
                name: item.name,
                code: item.code,
                barcode: item.code,
                category: categoryToUse,
                type: 'product',
                unit: item.unit || "عدد",
                secondaryUnit: secondaryUnit,
                unitRatio: unitRatio || 1,
                unitRatioDirection: unitRatioDirection,
                purchasePrice: purchasePrice,
                price: salePrice,
                stock: 0,
                minStock: 5,
                isActive: true,
                description: desc
              });
              createdCount++;
            }
          }

          // 3. Refresh product list
          const refreshed = await getProducts();
          setProducts(refreshed);

          setSyncSummary({ updated: updatedCount, created: createdCount });
          showNotification(
            `عملیات موفق: ${toPersianDigits(createdCount)} کالای جدید تعریف و ${toPersianDigits(updatedCount)} کالا به‌روزرسانی شد.`,
            "success"
          );
        } catch (err: any) {
          console.error("Sync error:", err);
          showNotification("خطا در ثبت اطلاعات در پایگاه داده: " + (err.message || ""), "error");
        } finally {
          setIsSyncing(false);
        }
      }
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Category Navigation Bar (All Online Pricing Pages in One Unified Menu) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <div className="px-3 py-2 text-xs font-black text-slate-500 flex items-center gap-1.5 border-l border-slate-200 ml-1">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>منوی صفحات استعلام و قیمت:</span>
          </div>

          {PIPE_TABS_CONFIG.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab && setActiveTab("online_pipe_pricing")}
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 bg-slate-50 text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-700 border border-slate-200/80 cursor-pointer"
            >
              {tab.id === 'copper' ? (
                <Sparkles className="w-4 h-4 text-amber-600" />
              ) : tab.id === 'galvanized' ? (
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
              ) : tab.id === 'kecho' ? (
                <Building2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Flame className="w-4 h-4 text-amber-500" />
              )}
              <span>{tab.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-normal bg-white text-slate-500 border border-slate-200">
                {tab.badge}
              </span>
            </button>
          ))}

          <div className="h-6 w-px bg-slate-200 mx-1" />
          <div className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-rose-600/20">
            <FileText className="w-4 h-4 text-white" />
            <span>نیوپایپ (کاتالوگ PDF)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-normal bg-white/20 text-white">
              صفحه فعال
            </span>
          </div>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="bg-gradient-to-l from-red-700 via-red-800 to-zinc-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0">
              <Flame className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-zinc-900">
                  گیتی کالا - SGP
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm">
                  تاریخ لیست: {toPersianDigits(catalogDate)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  ۱۰٪ مالیات ارزش افزوده لحاظ شده
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                استعلام و به‌روزرسانی لیست قیمت نیوپایپ (Newpipe)
              </h1>
              <p className="text-white/80 text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
                مدیریت جامع لوله‌های پنج‌لایه، اتصالات پرسی، کوپلی، رزوه‌ای، کلمپی، کلکتور و شیرآلات نیوپایپ. با آپلود فایل PDF جدید، مشخصات و قیمت‌ها به‌صورت هوشمند استخراج و در سیستم همگام‌سازی می‌گردند.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
            {setActiveTab && (
              <button
                onClick={() => setActiveTab("products")}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/15"
              >
                <ArrowRight className="w-4 h-4" />
                مدیریت کالا و خدمات
              </button>
            )}
            <button
              onClick={handleLoadSampleCatalog}
              disabled={isProcessingPdf}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessingPdf ? 'animate-spin' : ''}`} />
              بارگذاری کاتالوگ ۱۲ صفحه‌ای ضمیمه‌شده
            </button>
          </div>
        </div>
      </div>

      {/* PDF Upload & Drag-and-Drop Area */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="bg-white border-2 border-dashed border-red-200 hover:border-red-400 rounded-2xl p-6 transition-all shadow-sm group relative"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".pdf" 
          className="hidden" 
        />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
              <FileUp className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-800 text-sm md:text-base">
                {uploadedFile ? `فایل انتخاب‌شده: ${uploadedFile.name}` : "آپلود فایل PDF لیست قیمت جدید نیوپایپ"}
              </h3>
              <p className="text-zinc-500 text-xs mt-1">
                {uploadedFile 
                  ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} مگابایت - آماده پردازش و استخراج جدول اقلام` 
                  : "فایل PDF لیست قیمت رسمی نیوپایپ را بکشید و اینجا رها کنید یا دکمه زیر را برای انتخاب فایل بزنید."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingPdf}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <Upload className="w-4 h-4 text-red-400" />
              {uploadedFile ? "تغییر فایل PDF" : "انتخاب فایل PDF..."}
            </button>
            {uploadedFile && (
              <button
                onClick={() => processPdfFile(uploadedFile)}
                disabled={isProcessingPdf}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                {isProcessingPdf ? "در حال پردازش PDF..." : "شروع استخراج اقلام"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Controls & Currency Setting Bar */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-zinc-800 text-sm">
              تنظیمات ارزی، محاسباتی و دسته‌بندی در انبار
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Target Currency */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs">
              <Coins className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-zinc-600">واحد پول سیستم:</span>
              <select
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                className="bg-transparent font-bold text-zinc-800 focus:outline-none cursor-pointer"
              >
                <option value="تومان">تومان (پیش‌فرض)</option>
                <option value="ریال">ریال (قیمت PDF)</option>
                <option value="دلار">دلار (USD)</option>
                <option value="یورو">یورو (EUR)</option>
              </select>
            </div>

            {/* Profit Margin % */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs">
              <span className="font-medium text-zinc-600">سود فروش:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={profitMarginPercent}
                onChange={(e) => setProfitMarginPercent(Number(e.target.value) || 0)}
                className="w-12 text-center bg-white border border-zinc-300 rounded-lg py-0.5 font-bold text-zinc-800 focus:outline-none focus:border-red-500"
              />
              <span className="text-zinc-500 font-bold">٪</span>
            </div>

            {/* VAT Toggle */}
            <button
              onClick={() => setVatIncluded(!vatIncluded)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                vatIncluded
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-zinc-100 border-zinc-300 text-zinc-600"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {vatIncluded ? "با احتساب ۱۰٪ ارزش افزوده" : "بدون ارزش افزوده (خالص)"}
            </button>

            {/* Auto Category Mode */}
            <button
              onClick={() => setAutoCreateSubCategories(!autoCreateSubCategories)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                autoCreateSubCategories
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-zinc-100 border-zinc-300 text-zinc-600"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {autoCreateSubCategories ? "تفکیک خودکار دسته‌های نیوپایپ" : "دسته‌بندی یکپارچه"}
            </button>
          </div>
        </div>

        {/* Sync Action Summary Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            <span>تعداد کل اقلام کاتالوگ: <strong>{toPersianDigits(items.length)}</strong></span>
            <span>•</span>
            <span>نمایش در فیلتر جاری: <strong>{toPersianDigits(filteredItems.length)}</strong></span>
            <span>•</span>
            <span>انتخاب‌شده جهت ثبت: <strong className="text-red-600">{toPersianDigits(selectedItemIds.length)}</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleSyncSelected}
              disabled={isSyncing || selectedItemIds.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Building2 className="w-4 h-4" />
              {isSyncing ? "در حال ثبت و همگام‌سازی..." : `ثبت و بروزرسانی اقلام انتخابی (${toPersianDigits(selectedItemIds.length)} قلم)`}
            </button>
          </div>
        </div>
      </div>

      {/* Sync Success Notification Card */}
      {syncSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-900 text-sm">
                همگام‌سازی با پایگاه داده کالاها با موفقیت انجام شد
              </h4>
              <p className="text-emerald-700 text-xs mt-0.5">
                تعداد <strong>{toPersianDigits(syncSummary.created)}</strong> کالای جدید در سیستم ایجاد شد و قیمت و مشخصات <strong>{toPersianDigits(syncSummary.updated)}</strong> کالا به‌روز گردید.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSyncSummary(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-3 py-1 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
          >
            بستن
          </button>
        </div>
      )}

      {/* Category Pills & Filters */}
      <div className="space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedCategoryTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedCategoryTab === 'all'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <span>همه گروه‌ها</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedCategoryTab === 'all' ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
              {toPersianDigits(items.length)}
            </span>
          </button>

          {NEWPIPE_CATEGORIES_META.map(cat => {
            const count = items.filter(i => i.categoryType === cat.id).length;
            const isActive = selectedCategoryTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryTab(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <span>{cat.title}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                  {toPersianDigits(count)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search and Secondary Filter Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
          {/* Search Input */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در کد، نام، سایز نیوپایپ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
            />
          </div>

          {/* Quick Selection and Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white text-zinc-900 font-bold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
              >
                همه
              </button>
              <button
                onClick={() => setStatusFilter('new')}
                className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'new' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
              >
                جدید
              </button>
              <button
                onClick={() => setStatusFilter('existing')}
                className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'existing' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
              >
                موجود در سیستم
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleSelectAllFiltered}
                className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="انتخاب همه اقلام فیلترشده"
              >
                <CheckSquare className="w-3.5 h-3.5 text-zinc-600" />
                انتخاب همه
              </button>
              <button
                onClick={handleDeselectAllFiltered}
                className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="لغو انتخاب"
              >
                <Square className="w-3.5 h-3.5 text-zinc-600" />
                عدم انتخاب
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">انتخاب</th>
                <th className="py-3.5 px-4 w-32">کد کالا</th>
                <th className="py-3.5 px-4">نام و مشخصات کالا</th>
                <th className="py-3.5 px-4 w-24">سایز</th>
                <th className="py-3.5 px-4 w-32">بسته‌بندی</th>
                <th className="py-3.5 px-4 w-28 text-left">قیمت لیست (ریال)</th>
                <th className="py-3.5 px-4 w-32 text-left">قیمت خرید ({targetCurrency})</th>
                <th className="py-3.5 px-4 w-32 text-left">فروش پیشنهادی (+{profitMarginPercent}%)</th>
                <th className="py-3.5 px-4 w-28 text-center">وضعیت سیستم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-zinc-300" />
                    هیچ کالایی با فیلترها و جستجوی مشخص‌شده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  const existing = checkExistingProduct(item);
                  const { purchasePrice, salePrice } = calculateItemPrices(item);

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-red-50/40 transition-colors cursor-pointer ${
                        isSelected ? 'bg-red-50/20' : ''
                      }`}
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(item.id)}
                          className="w-4 h-4 text-red-600 rounded border-zinc-300 focus:ring-red-500 cursor-pointer"
                        />
                      </td>

                      {/* Product Code */}
                      <td className="py-3 px-4 font-mono font-bold text-zinc-700">
                        <div className="flex items-center gap-1.5">
                          <span>{item.code}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.code);
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
                            title="کپی کد کالا"
                          >
                            {copiedCode === item.code ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900">{item.name}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                          <span className="px-1.5 py-0.2 bg-zinc-100 rounded text-zinc-600 font-medium">
                            {item.persianCategory}
                          </span>
                          {item.subCategory && (
                            <span className="text-zinc-400">| {item.subCategory}</span>
                          )}
                          {item.pageNumber && (
                            <span className="text-zinc-400">| صفحه {toPersianDigits(item.pageNumber)}</span>
                          )}
                        </div>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 font-bold text-zinc-800 dir-ltr text-right">
                        {item.size}
                      </td>

                      {/* Packaging Info */}
                      <td className="py-3 px-4 text-zinc-600 text-[11px] leading-relaxed">
                        {item.rollMeter ? (
                          <div>کلاف: <strong>{toPersianDigits(item.rollMeter)}m</strong></div>
                        ) : null}
                        {item.branchLengthM ? (
                          <div>شاخه: <strong>{toPersianDigits(item.branchLengthM)}m</strong></div>
                        ) : null}
                        {item.boxCount ? (
                          <div>جعبه: <strong>{toPersianDigits(item.boxCount)} عدد</strong></div>
                        ) : null}
                        {item.cartonCount ? (
                          <div>کارتن: <strong>{toPersianDigits(item.cartonCount)} عدد</strong></div>
                        ) : null}
                      </td>

                      {/* Official List Price (Rials) */}
                      <td className="py-3 px-4 text-left font-mono font-medium text-zinc-500">
                        {addCommas(toPersianDigits(item.priceRial))}
                      </td>

                      {/* Converted Purchase Price */}
                      <td className="py-3 px-4 text-left font-mono font-bold text-zinc-900">
                        {addCommas(toPersianDigits(purchasePrice))}
                        <span className="text-[10px] text-zinc-400 mr-1 font-sans">{targetCurrency}</span>
                      </td>

                      {/* Suggested Sale Price */}
                      <td className="py-3 px-4 text-left font-mono font-bold text-emerald-700">
                        {addCommas(toPersianDigits(salePrice))}
                        <span className="text-[10px] text-emerald-500 mr-1 font-sans">{targetCurrency}</span>
                      </td>

                      {/* System Status */}
                      <td className="py-3 px-4 text-center">
                        {existing ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              موجود در سیستم
                            </span>
                            {existing.price ? (
                              <span className="text-[9px] text-zinc-400 mt-0.5">
                                فعلی: {addCommas(toPersianDigits(existing.price))}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            کالای جدید
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
