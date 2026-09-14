import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, Globe, CheckCircle2, AlertCircle, ArrowUpDown, 
  ExternalLink, Layers, Scale, Ruler, Hash, CheckSquare, Square, 
  ArrowRight, ShieldCheck, Tag, PlusCircle, Check, Info, 
  FileText, Sliders, ChevronDown, Clock, Search, Sparkles,
  Coins, DollarSign, ArrowRightLeft, Repeat
} from 'lucide-react';
import { Product, ProductCategory } from '../../types';
import { addProduct, updateProduct, getProducts, getProductCategories, addProductCategory } from '../../services/dataService';
import { addCommas, toPersianDigits, formatNumber, getBaseValueInToman } from '../../utils/format';

interface PipeOnlineItem {
  id: string;
  diameterInch: string;
  thicknessMm: number;
  diameterMm: number;
  lengthM: number;
  weightPerBranchKg: number;
  location: string;
  pricePerKg: number;
  pricePerBranch: number;
  pricePerMeter: number;
  name: string;
  brand: string;
  productUrl?: string;
  defaultCategory: string;
  mainUnit: string;
  secondaryUnitWeight: string;
  secondaryUnitMeter: string;
  unitRatioWeight: number;
  unitRatioMeter: number;
}

interface OnlinePipePricingProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: ProductCategory[];
  setCategories?: React.Dispatch<React.SetStateAction<ProductCategory[]>>;
  storeSettings?: any;
  showNotification: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  confirmAction?: (message: string, onConfirm: () => Promise<void> | void, details?: string) => void;
  setActiveTab?: (tab: string) => void;
}

interface CurrencyPreset {
  id: string;
  name: string;
  symbol: string;
  type: 'base' | 'multiplier' | 'divisor';
  defaultRate: number;
  description: string;
}

const CURRENCY_PRESETS: CurrencyPreset[] = [
  { 
    id: "تومان", 
    name: "تومان (IRT)", 
    symbol: "تومان", 
    type: "base", 
    defaultRate: 1, 
    description: "واحد ارزی پیش‌فرض سایت مرکزآهن (بدون تغییر)" 
  },
  { 
    id: "ریال", 
    name: "ریال (IRR)", 
    symbol: "ریال", 
    type: "multiplier", 
    defaultRate: 10, 
    description: "هر ۱ تومان = ۱۰ ریال (ضرب در ۱۰)" 
  },
  { 
    id: "دلار", 
    name: "دلار آمریکا (USD)", 
    symbol: "$", 
    type: "divisor", 
    defaultRate: 70000, 
    description: "قیمت تومان تقسیم بر نرخ روز دلار" 
  },
  { 
    id: "یورو", 
    name: "یورو (EUR)", 
    symbol: "€", 
    type: "divisor", 
    defaultRate: 75000, 
    description: "قیمت تومان تقسیم بر نرخ روز یورو" 
  },
  { 
    id: "درهم", 
    name: "درهم امارات (AED)", 
    symbol: "درهم", 
    type: "divisor", 
    defaultRate: 19000, 
    description: "قیمت تومان تقسیم بر نرخ روز درهم" 
  },
  { 
    id: "افغانی", 
    name: "افغانی (AFN)", 
    symbol: "افغانی", 
    type: "divisor", 
    defaultRate: 1000, 
    description: "قیمت تومان تقسیم بر نرخ روز افغانی" 
  },
  { 
    id: "سفارشی", 
    name: "سایر / ارز سفارشی", 
    symbol: "واحد", 
    type: "divisor", 
    defaultRate: 1, 
    description: "نرخ برابری دلخواه واردشده توسط کاربر" 
  }
];

export default function OnlinePipePricing({
  products,
  setProducts,
  categories,
  setCategories,
  storeSettings,
  showNotification,
  confirmAction,
  setActiveTab
}: OnlinePipePricingProps) {
  const [sourceUrl, setSourceUrl] = useState("https://www.markazeahan.com/company/%D9%84%D9%88%D9%84%D9%87-%DA%AF%D8%A7%D8%B2-%D8%AA%D9%88%DA%A9%D8%A7%D8%B1-%D8%B3%D9%BE%D8%A7%D9%87%D8%A7%D9%86/");
  const [loading, setLoading] = useState(false);
  const [lastFetchedTime, setLastFetchedTime] = useState<string | null>(null);
  const [onlinePipes, setOnlinePipes] = useState<PipeOnlineItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  
  // Customization controls for import/update
  const [pricingBasis, setPricingBasis] = useState<'kg' | 'branch' | 'meter'>('branch');
  const [targetCategory, setTargetCategory] = useState<string>("لوله گاز توکار سپاهان");
  const [selectedMainUnit, setSelectedMainUnit] = useState<string>("شاخه");
  const [selectedSecondaryUnit, setSelectedSecondaryUnit] = useState<string>("کیلوگرم");
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(10); // درصد سود پیشنهادی برای قیمت فروش
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<{ updated: number; created: number; currency: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // System Currency Detection
  const systemDefaultCurrency = useMemo(() => {
    const raw = storeSettings?.currency?.trim() || "تومان";
    if (raw.includes("ریال") || raw === "IRR") return "ریال";
    if (raw.includes("دلار") || raw === "USD") return "دلار";
    if (raw.includes("یورو") || raw === "EUR") return "یورو";
    if (raw.includes("درهم") || raw === "AED") return "درهم";
    if (raw.includes("افغانی")) return "افغانی";
    if (raw.includes("تومان") || raw === "IRT") return "تومان";
    return raw;
  }, [storeSettings?.currency]);

  // Target Currency State - Defaults to System Currency
  const [targetCurrency, setTargetCurrency] = useState<string>(systemDefaultCurrency);
  const [customCurrencyName, setCustomCurrencyName] = useState<string>("");
  
  // Exchange Rate State
  const initialPreset = useMemo(() => {
    return CURRENCY_PRESETS.find(p => p.id === systemDefaultCurrency) || CURRENCY_PRESETS[0];
  }, [systemDefaultCurrency]);

  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    if (systemDefaultCurrency === "ریال") return 10;
    if (systemDefaultCurrency === "تومان") return 1;
    const baseVal = getBaseValueInToman(systemDefaultCurrency);
    if (baseVal && baseVal !== 1 && baseVal !== 0.1) return baseVal;
    return initialPreset.defaultRate;
  });

  // Keep target currency in sync if system currency changes and user hasn't switched
  useEffect(() => {
    if (systemDefaultCurrency && systemDefaultCurrency !== "تومان" && targetCurrency === "تومان") {
      setTargetCurrency(systemDefaultCurrency);
      if (systemDefaultCurrency === "ریال") {
        setExchangeRate(10);
      } else {
        const rate = getBaseValueInToman(systemDefaultCurrency);
        if (rate > 1) setExchangeRate(rate);
      }
    }
  }, [systemDefaultCurrency]);

  // Handle Currency Selection Change
  const handleCurrencyChange = (newCur: string) => {
    setTargetCurrency(newCur);
    const preset = CURRENCY_PRESETS.find(p => p.id === newCur);
    if (preset) {
      if (newCur === "ریال") {
        setExchangeRate(10);
      } else if (newCur === "تومان") {
        setExchangeRate(1);
      } else {
        const baseVal = getBaseValueInToman(newCur);
        setExchangeRate(baseVal > 1 ? baseVal : preset.defaultRate);
      }
    }
  };

  // Convert Toman Price to Target Currency
  const convertFromToman = (amountInToman: number): number => {
    if (!amountInToman || isNaN(amountInToman)) return 0;
    const cur = targetCurrency === "سفارشی" ? (customCurrencyName || "ارز سفارشی") : targetCurrency;
    
    if (cur === "تومان" || cur === "IRT") {
      return amountInToman;
    }
    if (cur === "ریال" || cur === "IRR") {
      // 1 Toman = exchangeRate Rials (usually 10)
      return Math.round(amountInToman * (exchangeRate || 10));
    }
    // Foreign or Divisor currencies (USD, EUR, AED, etc.)
    // Price in target currency = Price in Toman / exchangeRate
    const rate = exchangeRate || 1;
    if (rate <= 0) return amountInToman;
    return amountInToman / rate;
  };

  // Price Formatter in Target Currency
  const formatPriceInTargetCurrency = (tomanAmount: number): string => {
    const converted = convertFromToman(tomanAmount);
    const cur = targetCurrency === "سفارشی" ? (customCurrencyName || "واحد") : targetCurrency;
    
    if (cur === "ریال" || cur === "تومان") {
      return toPersianDigits(addCommas(Math.round(converted)));
    }
    // Foreign currency: format with 2 decimal places if needed
    if (Number.isInteger(converted)) {
      return toPersianDigits(addCommas(converted));
    }
    return toPersianDigits(addCommas(converted.toFixed(2)));
  };

  const activeCurrencyLabel = targetCurrency === "سفارشی" ? (customCurrencyName || "واحد سفارشی") : targetCurrency;

  // Fetch online prices
  const fetchOnlinePrices = async () => {
    setLoading(true);
    setSyncResults(null);
    try {
      const res = await fetch("/api/scraping/markaz-ahan-pipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setOnlinePipes(data.items);
        setLastFetchedTime(new Date().toLocaleTimeString('fa-IR'));
        // Select all by default
        setSelectedItemIds(data.items.map((i: PipeOnlineItem) => i.id));
        showNotification(`تعداد ${toPersianDigits(data.items.length)} مشخصه لوله گاز با موفقیت دریافت شد.`, "success");
      } else {
        throw new Error(data.error || "پاسخ نامعتبر از سرور دریافت شد");
      }
    } catch (err: any) {
      console.error("Error loading pipe data:", err);
      showNotification(err.message || "خطا در برقراری ارتباط با مرکز آهن", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlinePrices();
  }, []);

  // Filtered pipes by search query
  const filteredPipes = useMemo(() => {
    if (!searchQuery.trim()) return onlinePipes;
    const q = searchQuery.toLowerCase().trim();
    return onlinePipes.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.diameterInch.includes(q) ||
      String(p.thicknessMm).includes(q)
    );
  }, [onlinePipes, searchQuery]);

  // Check matching existing products in system
  const getExistingMatch = (pipe: PipeOnlineItem): Product | undefined => {
    return products.find(prod => {
      if (prod.pipeDiameterInch && prod.pipeThicknessMm) {
        return prod.pipeDiameterInch === pipe.diameterInch && Number(prod.pipeThicknessMm) === pipe.thicknessMm;
      }
      // Name match
      const pName = prod.name.replace(/\s+/g, ' ');
      return pName.includes("توکار") && pName.includes("سپاهان") && pName.includes(pipe.diameterInch);
    });
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === filteredPipes.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredPipes.map(p => p.id));
    }
  };

  // Execute sync/define with currency conversion
  const handleSaveToDatabase = async () => {
    const itemsToProcess = onlinePipes.filter(p => selectedItemIds.includes(p.id));
    if (itemsToProcess.length === 0) {
      showNotification("لطفاً حداقل یک مورد را انتخاب کنید.", "warning");
      return;
    }

    setIsSyncing(true);
    let createdCount = 0;
    let updatedCount = 0;

    try {
      // 1. Ensure Category exists
      let cat = categories.find(c => c.name.trim() === targetCategory.trim());
      let categoryId = cat?.id;
      if (!cat) {
        const newCat = await addProductCategory({
          name: targetCategory,
          description: "لوله‌های گاز توکار استانداردی تولید گروه صنعتی سپاهان (مانیس گاز)"
        });
        if (newCat) {
          categoryId = newCat.id;
          if (setCategories) {
            setCategories(prev => [...prev, newCat]);
          }
        }
      }

      // 2. Loop through selected items and convert prices
      for (const item of itemsToProcess) {
        const existing = getExistingMatch(item);

        // Raw prices in Toman (website baseline)
        let rawPurchasePriceToman = item.pricePerBranch; // default: branch
        if (pricingBasis === 'kg') {
          rawPurchasePriceToman = item.pricePerKg;
        } else if (pricingBasis === 'meter') {
          rawPurchasePriceToman = item.pricePerMeter;
        }

        // Converted prices to Target Currency
        const convertedPurchasePrice = convertFromToman(rawPurchasePriceToman);
        const convertedPricePerKg = convertFromToman(item.pricePerKg);
        const convertedPricePerBranch = convertFromToman(item.pricePerBranch);
        const convertedPricePerMeter = convertFromToman(item.pricePerMeter);

        // Round according to currency
        const isPersianCurrency = activeCurrencyLabel === "تومان" || activeCurrencyLabel === "ریال";
        const finalPurchasePrice = isPersianCurrency ? Math.round(convertedPurchasePrice) : Number(convertedPurchasePrice.toFixed(2));
        const finalPricePerKg = isPersianCurrency ? Math.round(convertedPricePerKg) : Number(convertedPricePerKg.toFixed(2));
        const finalPricePerBranch = isPersianCurrency ? Math.round(convertedPricePerBranch) : Number(convertedPricePerBranch.toFixed(2));
        const finalPricePerMeter = isPersianCurrency ? Math.round(convertedPricePerMeter) : Number(convertedPricePerMeter.toFixed(2));

        // Suggested Sale Price in Target Currency
        const marginMultiplier = 1 + (Number(profitMarginPercent) || 0) / 100;
        const rawSalePrice = finalPurchasePrice * marginMultiplier;
        const finalSalePrice = isPersianCurrency ? Math.round(rawSalePrice) : Number(rawSalePrice.toFixed(2));

        // Build Product Payload
        const productPayload: Partial<Product> = {
          name: item.name,
          category: targetCategory,
          categoryId: categoryId,
          type: 'product',
          purchasePrice: finalPurchasePrice,
          price: finalSalePrice,
          salePrice: finalSalePrice,
          unit: selectedMainUnit,
          secondaryUnit: selectedSecondaryUnit,
          unitRatio: item.weightPerBranchKg,
          description: `لوله گاز توکار استاندارد سپاهان | سایز: ${item.diameterInch} اینچ | ضخامت: ${item.thicknessMm}mm | قطر: ${item.diameterMm}mm | طول: ${item.lengthM}m | وزن شاخه: ${item.weightPerBranchKg}kg | واحد ارزی: ${activeCurrencyLabel} (نرخ تبدیل: ${activeCurrencyLabel === 'ریال' ? `هر ۱ تومان = ${exchangeRate} ریال` : `هر ۱ ${activeCurrencyLabel} = ${addCommas(exchangeRate)} تومان`}) | قیمت پایه مرکزآهن: ${addCommas(item.pricePerKg)} تومان/کیلو`,
          pipeDiameterInch: item.diameterInch,
          pipeThicknessMm: item.thicknessMm,
          pipeDiameterMm: item.diameterMm,
          pipeLengthM: item.lengthM,
          pipeWeightPerBranchKg: item.weightPerBranchKg,
          pipeLoadingLocation: item.location,
          sourceUrl: sourceUrl,
          pricePerKg: finalPricePerKg,
          pricePerMeter: finalPricePerMeter,
          pricePerBranch: finalPricePerBranch,
          pricingBasis: pricingBasis,
          currency: activeCurrencyLabel,
          exchangeRate: exchangeRate,
          sourcePriceToman: item.pricePerBranch,
          sourceCurrency: "تومان",
          isActive: true
        };

        if (existing) {
          await updateProduct(String(existing.id), productPayload);
          updatedCount++;
        } else {
          // Generate code
          const newCode = `PIPE-${item.diameterInch.replace(/[\s/]/g, '')}-${String(item.thicknessMm).replace('.', '')}`;
          await addProduct({
            ...productPayload,
            code: newCode,
            stock: 0,
            minStock: 5,
          });
          createdCount++;
        }
      }

      // Reload fresh products
      const refreshed = await getProducts();
      setProducts(refreshed);

      setSyncResults({ created: createdCount, updated: updatedCount, currency: activeCurrencyLabel });
      showNotification(
        `عملیات موفق: ${toPersianDigits(createdCount)} کالا جدید و ${toPersianDigits(updatedCount)} کالا با واحد پولی «${activeCurrencyLabel}» به‌روزرسانی شد.`, 
        "success"
      );
    } catch (err: any) {
      console.error("Sync error:", err);
      showNotification(err.message || "خطا در ذخیره‌سازی اطلاعات", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      dir="rtl"
    >
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-l from-indigo-800 via-indigo-700 to-slate-900 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-32 -translate-y-32 blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 text-indigo-100 text-xs font-bold mb-2 backdrop-blur-sm border border-white/10">
                <Globe className="w-3.5 h-3.5 text-indigo-300" />
                استعلام و اتصال وب‌سایت مرکزآهن
                <span className="text-indigo-300/50">•</span>
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                تبدیل هوشمند واحد ارزی سیستم
              </div>
              <h1 className="text-xl md:text-2xl font-black flex items-center gap-2.5">
                تعریف و بروزرسانی قیمت آنلاین لوله گاز توکار سپاهان
              </h1>
              <p className="text-xs md:text-sm text-indigo-100/90 mt-1 max-w-3xl leading-relaxed">
                استخراج برخط مشخصات فنی و قیمت روز لوله‌های گازی سپاهان، با قابلیت تبدیل خودکار نرخ‌های مرکزآهن (تومان) به واحد ارزی پیش‌فرض سیستم (ریال، دلار، یورو و...) و محاسبه مبنای شاخه، کیلوگرم یا متر.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/20 transition-all backdrop-blur-sm"
              >
                <ExternalLink className="w-4 h-4" />
                مشاهده صفحه منبع
              </a>
              <button
                type="button"
                onClick={fetchOnlinePrices}
                disabled={loading || isSyncing}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs md:text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? "در حال دریافت..." : "بروزرسانی آنلاین قیمت‌ها"}
              </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-100">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-indigo-300" />
                آخرین استعلام: {lastFetchedTime ? toPersianDigits(lastFetchedTime) : "درحال اتصال..."}
              </span>
              <span className="hidden sm:inline text-indigo-300/40">|</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-indigo-300" />
                تعداد اقلام: <strong>{toPersianDigits(onlinePipes.length)} ردیف استاندارد</strong>
              </span>
              <span className="hidden sm:inline text-indigo-300/40">|</span>
              <span className="flex items-center gap-1.5 font-medium text-amber-200">
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                واحد انتخابی ذخیره: <strong>{activeCurrencyLabel}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-emerald-200">وضعیت اتصال: آنلاین</span>
            </div>
          </div>
        </div>

        {/* Sync Result Toast Banner */}
        {syncResults && (
          <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center justify-between text-emerald-800 text-sm font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              عملیات ثبت با موفقیت پایان یافت: {toPersianDigits(syncResults.created)} کالای جدید ایجاد و {toPersianDigits(syncResults.updated)} کالای موجود با واحد ارزی «{syncResults.currency}» به‌روز شدند.
            </div>
            {setActiveTab && (
              <button
                onClick={() => setActiveTab("products")}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                مشاهده در لیست کالاها
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Currency Conversion & Exchange Rate Section */}
        <div className="p-6 bg-gradient-to-r from-amber-50/70 via-indigo-50/50 to-blue-50/60 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/70">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-800">
                  تنظیمات تبدیل واحد ارزی (مرکزآهن به واحد سیستم)
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                واحد ارزی وب‌سایت مرکزآهن به صورت پیش‌فرض <strong>«تومان»</strong> است. در صورت تمایل می‌توانید آن را به ریال، دلار، یورو و... بر اساس نرخ برابری تبدیل و ذخیره نمایید.
              </p>
            </div>

            {/* System Default Currency Indicator & Sync */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs">
              <span className="text-slate-500 font-bold">واحد پیش‌فرض سیستم:</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-black">
                {systemDefaultCurrency}
              </span>
              {targetCurrency !== systemDefaultCurrency && (
                <button
                  type="button"
                  onClick={() => handleCurrencyChange(systemDefaultCurrency)}
                  className="mr-2 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                  title="تطبیق با واحد پیش‌فرض تعریف‌شده در تنظیمات فروشگاه"
                >
                  <Repeat className="w-3 h-3" />
                  تطبیق با سیستم
                </button>
              )}
            </div>
          </div>

          {/* Currency Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs font-semibold">
            {/* Source Currency Display */}
            <div>
              <label className="block text-slate-600 font-bold mb-1.5">
                واحد ارزی منبع (سایت مرکزآهن):
              </label>
              <div className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2.5 font-black text-slate-700 flex items-center justify-between">
                <span>تومان (IRT)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-bold">ثابت منبع</span>
              </div>
            </div>

            {/* Target Currency Selector */}
            <div>
              <label className="block text-slate-600 font-bold mb-1.5">
                واحد ارزی مقصد برای ثبت در سیستم:
              </label>
              <select
                value={targetCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2.5 font-black text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
              >
                {CURRENCY_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === systemDefaultCurrency ? "★ (ارز سیستم)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Currency Name if Selected */}
            {targetCurrency === "سفارشی" && (
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">
                  نام واحد ارزی سفارشی:
                </label>
                <input
                  type="text"
                  value={customCurrencyName}
                  onChange={(e) => setCustomCurrencyName(e.target.value)}
                  placeholder="مثلاً: درهم، لیر، یوان..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Exchange Rate Input */}
            <div className={targetCurrency === "سفارشی" ? "" : "lg:col-span-2"}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 font-bold">
                  {targetCurrency === "ریال" 
                    ? "ضریب تبدیل (هر ۱ تومان = چند ریال؟):" 
                    : targetCurrency === "تومان"
                    ? "ضریب برابری (بدون تغییر):"
                    : `نرخ روز هر ۱ ${activeCurrencyLabel} به تومان:`}
                </label>
                {targetCurrency !== "تومان" && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    (قابل ویرایش دقیق دستی)
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="0.0001"
                  step={targetCurrency === "ریال" ? "1" : "50"}
                  value={exchangeRate}
                  disabled={targetCurrency === "تومان"}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pl-20 disabled:bg-slate-100 disabled:text-slate-400"
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">
                  {targetCurrency === "ریال" ? "ریال" : "تومان"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Conversion Explanation Formula Banner */}
          <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>فرمول تبدیل فعال: </strong>
                {targetCurrency === "تومان" ? (
                  <span>قیمت‌ها دقیقاً با همان مبالغ تومان سایت مرکزآهن ثبت می‌گردند.</span>
                ) : targetCurrency === "ریال" ? (
                  <span>
                    هر ۱ تومان مرکزآهن ضرب در {toPersianDigits(exchangeRate)} = <strong>قیمت به ریال</strong> در سیستم ثبت می‌شود.
                  </span>
                ) : (
                  <span>
                    قیمت تومان مرکزآهن تقسیم بر {toPersianDigits(addCommas(exchangeRate))} (نرخ ۱ {activeCurrencyLabel}) = <strong>قیمت به {activeCurrencyLabel}</strong> در سیستم ثبت می‌شود.
                  </span>
                )}
              </span>
            </div>

            {/* Live Example Calculation Badge */}
            <div className="px-3 py-1 bg-white rounded-lg border border-slate-200 text-slate-600 font-bold shadow-2xs">
              مثال: ۱۶۰,۵۰۰ تومان/کیلو ➔ <span className="text-indigo-600 font-black">{formatPriceInTargetCurrency(160500)} {activeCurrencyLabel}</span>
            </div>
          </div>
        </div>

        {/* General Settings Toolbar (Unit, Category, Pricing Basis, Margin) */}
        <div className="p-6 bg-slate-50/70 border-b border-slate-200">
          <div className="text-xs font-black text-slate-800 mb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            تنظیمات واحد شمارش، مبنای محاسبه قیمت خرید و دسته‌بندی
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-semibold">
            {/* Basis of purchase price */}
            <div>
              <label className="block text-slate-600 font-bold mb-1.5">
                مبنای قیمت خرید پیش‌فرض:
              </label>
              <select
                value={pricingBasis}
                onChange={(e) => setPricingBasis(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="branch">بر اساس شاخه ۶ متری ({activeCurrencyLabel}/شاخه)</option>
                <option value="kg">بر اساس وزن ({activeCurrencyLabel}/کیلوگرم)</option>
                <option value="meter">بر اساس متر طول ({activeCurrencyLabel}/متر)</option>
              </select>
            </div>

            {/* Target Category */}
            <div>
              <label className="block text-slate-600 font-bold mb-1.5">
                دسته‌بندی کالا:
              </label>
              <input
                type="text"
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                placeholder="مثلاً: لوله گاز توکار سپاهان"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Main Unit */}
            <div>
              <label className="block text-slate-600 font-bold mb-1.5">
                واحد اصلی کالا:
              </label>
              <select
                value={selectedMainUnit}
                onChange={(e) => setSelectedMainUnit(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="شاخه">شاخه (استاندارد ۶ متری)</option>
                <option value="کیلوگرم">کیلوگرم (وزن)</option>
                <option value="متر">متر (طول)</option>
                <option value="بندیل">بندیل</option>
              </select>
            </div>

            {/* Secondary Unit */}
            <div>
              <label className="block text-slate-600 font-bold mb-1.5">
                واحد فرعی کالا:
              </label>
              <select
                value={selectedSecondaryUnit}
                onChange={(e) => setSelectedSecondaryUnit(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="کیلوگرم">کیلوگرم (ضریب = وزن هر شاخه)</option>
                <option value="متر">متر (ضریب = ۶ متر طول)</option>
                <option value="شاخه">شاخه</option>
                <option value="گرم">گرم</option>
              </select>
            </div>

            {/* Margin Percent */}
            <div>
              <label className="block text-slate-600 font-bold mb-1.5">
                درصد سود فروش پیشنهادی:
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={profitMarginPercent}
                  onChange={(e) => setProfitMarginPercent(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pl-8"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">٪</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                ضریب تبدیل واحد فرعی به اصلی بر اساس وزن هر شاخه (جدول سپاهان) اعمال و قیمت‌ها به واحد <strong>{activeCurrencyLabel}</strong> در سیستم ذخیره خواهند شد.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSaveToDatabase}
                disabled={isSyncing || selectedItemIds.length === 0}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer text-xs"
              >
                <Check className="w-4 h-4" />
                {isSyncing ? "در حال ثبت و اعمال..." : `ثبت ${toPersianDigits(selectedItemIds.length)} لوله به واحد «${activeCurrencyLabel}»`}
              </button>
            </div>
          </div>
        </div>

        {/* Filter and Selection Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              {selectedItemIds.length === filteredPipes.length && filteredPipes.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              انتخاب همه ({toPersianDigits(filteredPipes.length)} مورد)
            </button>

            <span className="text-slate-300">|</span>

            <span className="text-xs font-bold text-slate-500">
              {toPersianDigits(selectedItemIds.length)} لوله برای ثبت انتخاب شده است
            </span>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در سایز، اینچ یا ضخامت..."
              className="w-full pl-3 pr-9 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Pipes Table with Converted & Source Prices */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-extrabold">
                <th className="p-3.5 w-10 text-center">#</th>
                <th className="p-3.5">سایز (اینچ)</th>
                <th className="p-3.5">ضخامت (mm)</th>
                <th className="p-3.5">طول (متر)</th>
                <th className="p-3.5">وزن هر شاخه</th>
                <th className="p-3.5">
                  <div>قیمت خرید کیلویی</div>
                  <div className="text-[10px] text-indigo-600 font-black">({activeCurrencyLabel})</div>
                </th>
                <th className="p-3.5">
                  <div>قیمت خرید هر شاخه</div>
                  <div className="text-[10px] text-indigo-600 font-black">({activeCurrencyLabel})</div>
                </th>
                <th className="p-3.5">
                  <div>قیمت خرید هر متر</div>
                  <div className="text-[10px] text-indigo-600 font-black">({activeCurrencyLabel})</div>
                </th>
                <th className="p-3.5 bg-indigo-50/50 text-indigo-900">
                  <div>قیمت فروش پیشنهادی ({toPersianDigits(profitMarginPercent)}٪+)</div>
                  <div className="text-[10px] text-emerald-700 font-black">({activeCurrencyLabel})</div>
                </th>
                <th className="p-3.5 text-center">وضعیت در سیستم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredPipes.map((pipe) => {
                const isSelected = selectedItemIds.includes(pipe.id);
                const existing = getExistingMatch(pipe);

                // Raw Toman prices from source
                const rawKg = pipe.pricePerKg;
                const rawBranch = pipe.pricePerBranch;
                const rawMeter = pipe.pricePerMeter;
                const rawSelectedBasis = pricingBasis === 'kg' ? rawKg : pricingBasis === 'meter' ? rawMeter : rawBranch;

                // Converted values
                const convertedKg = convertFromToman(rawKg);
                const convertedBranch = convertFromToman(rawBranch);
                const convertedMeter = convertFromToman(rawMeter);
                const convertedPurchaseBasis = convertFromToman(rawSelectedBasis);
                
                // Sale price calculation
                const convertedSale = convertedPurchaseBasis * (1 + profitMarginPercent / 100);

                const isPersianCurrency = activeCurrencyLabel === "تومان" || activeCurrencyLabel === "ریال";

                return (
                  <tr
                    key={pipe.id}
                    onClick={() => toggleSelect(pipe.id)}
                    className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/20' : ''}`}
                  >
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleSelect(pipe.id)}
                        className="cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </td>

                    <td className="p-3 font-black text-slate-900 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                        {toPersianDigits(pipe.diameterInch)}
                      </span>
                      <div>
                        <div>{pipe.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">قطر خارجی: {toPersianDigits(pipe.diameterMm)} میلی‌متر</div>
                      </div>
                    </td>

                    <td className="p-3 font-bold text-slate-800">
                      {toPersianDigits(pipe.thicknessMm)} میل
                    </td>

                    <td className="p-3 font-bold text-slate-800">
                      {toPersianDigits(pipe.lengthM)} متر
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900">{toPersianDigits(pipe.weightPerBranchKg)} کیلوگرم</div>
                      <div className="text-[10px] text-slate-400">ضریب تبدیل واحد فرعی</div>
                    </td>

                    {/* Price per Kg */}
                    <td className="p-3">
                      <div className="font-black text-slate-900">
                        {formatPriceInTargetCurrency(rawKg)}{" "}
                        <span className="text-[10px] text-indigo-600 font-bold">{activeCurrencyLabel}</span>
                      </div>
                      {targetCurrency !== "تومان" && (
                        <div className="text-[10px] text-slate-400">
                          (منبع: {toPersianDigits(addCommas(rawKg))} تومان)
                        </div>
                      )}
                    </td>

                    {/* Price per Branch */}
                    <td className="p-3">
                      <div className="font-black text-indigo-700">
                        {formatPriceInTargetCurrency(rawBranch)}{" "}
                        <span className="text-[10px] text-indigo-600 font-bold">{activeCurrencyLabel}</span>
                      </div>
                      {targetCurrency !== "تومان" && (
                        <div className="text-[10px] text-slate-400">
                          (منبع: {toPersianDigits(addCommas(rawBranch))} تومان)
                        </div>
                      )}
                    </td>

                    {/* Price per Meter */}
                    <td className="p-3">
                      <div className="font-bold text-slate-700">
                        {formatPriceInTargetCurrency(rawMeter)}{" "}
                        <span className="text-[10px] text-indigo-600 font-bold">{activeCurrencyLabel}</span>
                      </div>
                      {targetCurrency !== "تومان" && (
                        <div className="text-[10px] text-slate-400">
                          (منبع: {toPersianDigits(addCommas(rawMeter))} تومان)
                        </div>
                      )}
                    </td>

                    {/* Suggested Sale Price */}
                    <td className="p-3 bg-indigo-50/40 font-black text-emerald-700">
                      <div>
                        {isPersianCurrency 
                          ? toPersianDigits(addCommas(Math.round(convertedSale))) 
                          : toPersianDigits(addCommas(convertedSale.toFixed(2)))}{" "}
                        <span className="text-[10px] text-emerald-600">{activeCurrencyLabel}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        (واحد {selectedMainUnit})
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      {existing ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <CheckCircle2 className="w-3 h-3 text-amber-600" />
                          موجود (به‌روزرسانی)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          <PlusCircle className="w-3 h-3 text-blue-600" />
                          کالای جدید
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info and actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              قیمت‌ها پس از تبدیل به واحد ارزی <strong>«{activeCurrencyLabel}»</strong> مستقیماً در فاکتورها، انبار و گزارش‌های مالی سیستم منعکس خواهند گردید.
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={isSyncing || selectedItemIds.length === 0}
            className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {isSyncing ? "در حال ثبت و ذخیره‌سازی..." : `ثبت نهایی اقلام به واحد «${activeCurrencyLabel}» (${toPersianDigits(selectedItemIds.length)} کالا)`}
          </button>
        </div>
      </div>

      {/* Educational & Technical Specifications Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm mb-2">
            <ArrowRightLeft className="w-4 h-4" />
            تبدیل نرخ‌های ارزی و ریالی
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            در صورتی که دفاتر یا فاکتورهای شما بر مبنای <strong>ریال</strong> است، با انتخاب ریال تمام مبالغ در ۱۰ ضرب می‌شوند؛ و در صورتی که بر مبنای <strong>ارزهای خارجی (دلار، یورو، درهم و...)</strong> کار می‌کنید، با وارد کردن نرخ روز، تمام قیمت‌های خرید و فروش به ارز مورد نظرتان تبدیل می‌گردند.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm mb-2">
            <Ruler className="w-4 h-4" />
            واحدهای سه‌گانه (شاخه، کیلو، متر)
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            امکان تعریف کالا با واحد اصلی شاخه و واحد فرعی کیلوگرم همراه با انتساب ضریب وزنی استاندارد کارخانه سپاهان برای هر سایز لوله فراهم است.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm mb-2">
            <Sparkles className="w-4 h-4" />
            تطبیق خودکار با تنظیمات سیستم
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            این صفحه به صورت هوشمند واحد پولی پیش‌فرض تنظیم‌شده در بخش پیکربندی فروشگاه شما (مانند ریال یا دلار) را شناسایی و به عنوان واحد هدف پیشنهاد می‌دهد.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
