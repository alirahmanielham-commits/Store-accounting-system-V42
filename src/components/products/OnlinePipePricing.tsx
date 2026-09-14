import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, Globe, CheckCircle2, AlertCircle, ArrowUpDown, 
  ExternalLink, Layers, Scale, Ruler, Hash, CheckSquare, Square, 
  ArrowRight, ShieldCheck, Tag, PlusCircle, Check, Info, 
  FileText, Sliders, ChevronDown, Clock, Search, Sparkles,
  Coins, DollarSign, ArrowRightLeft, Repeat, Building2, Flame, FileSpreadsheet
} from 'lucide-react';
import { Product, ProductCategory } from '../../types';
import { addProduct, updateProduct, getProducts, getProductCategories, addProductCategory } from '../../services/dataService';
import { addCommas, toPersianDigits, formatNumber, getBaseValueInToman } from '../../utils/format';
import { 
  PipeCategoryType, 
  PIPE_TABS_CONFIG, 
  PipeOnlineItem, 
  OnlinePipePricingProps, 
  CURRENCY_PRESETS, 
  UNIT_PRESETS, 
  CurrencyPreset 
} from './pipePricingConfig';

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
  // Active Category Tab
  const [activeCategoryTab, setActiveCategoryTab] = useState<PipeCategoryType>('sepahan');
  
  // Current tab configuration
  const currentTabConfig = useMemo(() => {
    return PIPE_TABS_CONFIG.find(t => t.id === activeCategoryTab) || PIPE_TABS_CONFIG[0];
  }, [activeCategoryTab]);

  const [sourceUrl, setSourceUrl] = useState(currentTabConfig.url);
  const [loading, setLoading] = useState(false);
  const [lastFetchedTime, setLastFetchedTime] = useState<string | null>(null);
  const [onlinePipes, setOnlinePipes] = useState<PipeOnlineItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  
  // Customization controls for import/update
  const [pricingBasis, setPricingBasis] = useState<'kg' | 'branch' | 'meter'>('branch');
  const [targetCategory, setTargetCategory] = useState<string>(currentTabConfig.categoryName);
  const [selectedMainUnit, setSelectedMainUnit] = useState<string>(currentTabConfig.defaultMainUnit);
  const [selectedSecondaryUnit, setSelectedSecondaryUnit] = useState<string>(currentTabConfig.defaultSecondaryUnit);
  const [ratioDirection, setRatioDirection] = useState<'direct' | 'inverse'>('direct');
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(10);
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

  // Handle Category Tab Switching
  const handleSwitchCategoryTab = (tabId: PipeCategoryType) => {
    setActiveCategoryTab(tabId);
    const targetConfig = PIPE_TABS_CONFIG.find(t => t.id === tabId) || PIPE_TABS_CONFIG[0];
    setSourceUrl(targetConfig.url);
    setTargetCategory(targetConfig.categoryName);
    setSelectedMainUnit(targetConfig.defaultMainUnit);
    setSelectedSecondaryUnit(targetConfig.defaultSecondaryUnit);
    setPricingBasis(targetConfig.defaultBasis);
    setSearchQuery("");
    setSyncResults(null);
    fetchOnlinePricesForTab(tabId, targetConfig.url);
  };

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
      return Math.round(amountInToman * (exchangeRate || 10));
    }
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
    if (Number.isInteger(converted)) {
      return toPersianDigits(addCommas(converted));
    }
    return toPersianDigits(addCommas(converted.toFixed(2)));
  };

  const activeCurrencyLabel = targetCurrency === "سفارشی" ? (customCurrencyName || "واحد سفارشی") : targetCurrency;

  const applyUnitPreset = (preset: typeof UNIT_PRESETS[0]) => {
    setSelectedMainUnit(preset.mainUnit);
    setSelectedSecondaryUnit(preset.secondaryUnit);
    setPricingBasis(preset.basis);
  };

  // Accurate ratio calculation based on selected units and item properties
  const getComputedUnitRatio = (item: PipeOnlineItem): number => {
    if (!selectedSecondaryUnit || selectedSecondaryUnit === "ندارد" || selectedSecondaryUnit === selectedMainUnit) {
      return 1;
    }

    const length = Number(item.lengthM) || currentTabConfig.defaultLength;
    const weight = Number(item.weightPerBranchKg) || 1;

    // شاخه و متر
    if (selectedMainUnit === "شاخه" && selectedSecondaryUnit === "متر") {
      return ratioDirection === 'direct' ? length : Number((1 / length).toFixed(4));
    }
    if (selectedMainUnit === "متر" && selectedSecondaryUnit === "شاخه") {
      return length;
    }

    // شاخه و کیلوگرم
    if (selectedMainUnit === "شاخه" && selectedSecondaryUnit === "کیلوگرم") {
      return ratioDirection === 'direct' ? weight : Number((1 / weight).toFixed(4));
    }
    if (selectedMainUnit === "کیلوگرم" && selectedSecondaryUnit === "شاخه") {
      return weight;
    }

    // کیلوگرم و متر
    if (selectedMainUnit === "کیلوگرم" && selectedSecondaryUnit === "متر") {
      return Number((weight / length).toFixed(4));
    }
    if (selectedMainUnit === "متر" && selectedSecondaryUnit === "کیلوگرم") {
      return Number((length / weight).toFixed(4));
    }

    if (selectedSecondaryUnit === "متر") return length;
    if (selectedSecondaryUnit === "کیلوگرم") return weight;
    return 1;
  };

  // Human-readable ratio formula and badge
  const getUnitRatioDescription = (item: PipeOnlineItem) => {
    const ratio = getComputedUnitRatio(item);
    if (!selectedSecondaryUnit || selectedSecondaryUnit === "ندارد" || selectedSecondaryUnit === selectedMainUnit) {
      return { 
        formula: `فقط ${selectedMainUnit} (تک‌واحدی)`, 
        ratio: 1, 
        badge: "بدون واحد فرعی" 
      };
    }

    const length = Number(item.lengthM) || currentTabConfig.defaultLength;
    const weight = Number(item.weightPerBranchKg) || 1;

    if (selectedMainUnit === "شاخه" && selectedSecondaryUnit === "متر") {
      return {
        formula: ratioDirection === 'direct' 
          ? `۱ شاخه = ${toPersianDigits(length)} متر` 
          : `۱ متر = ${toPersianDigits((1 / length).toFixed(2))} شاخه`,
        ratio,
        badge: `${toPersianDigits(length)} متر در هر شاخه`
      };
    }

    if (selectedMainUnit === "متر" && selectedSecondaryUnit === "شاخه") {
      return {
        formula: `۱ شاخه = ${toPersianDigits(length)} متر`,
        ratio,
        badge: `ضریب تبدیل: ${toPersianDigits(length)}`
      };
    }

    if (selectedMainUnit === "شاخه" && selectedSecondaryUnit === "کیلوگرم") {
      return {
        formula: ratioDirection === 'direct' 
          ? `۱ شاخه = ${toPersianDigits(weight)} کیلوگرم` 
          : `۱ کیلوگرم = ${toPersianDigits((1 / weight).toFixed(3))} شاخه`,
        ratio,
        badge: `وزن شاخه: ${toPersianDigits(weight)} kg`
      };
    }

    if (selectedMainUnit === "کیلوگرم" && selectedSecondaryUnit === "شاخه") {
      return {
        formula: `۱ شاخه = ${toPersianDigits(weight)} کیلوگرم`,
        ratio,
        badge: `ضریب تبدیل: ${toPersianDigits(weight)}`
      };
    }

    if (selectedMainUnit === "کیلوگرم" && selectedSecondaryUnit === "متر") {
      return {
        formula: `هر ۱ متر = ${toPersianDigits(Number((weight / length).toFixed(2)))} کیلوگرم`,
        ratio,
        badge: `ضریب: ${toPersianDigits(ratio)}`
      };
    }

    return {
      formula: `۱ ${selectedSecondaryUnit} = ${toPersianDigits(ratio)} ${selectedMainUnit}`,
      ratio,
      badge: `ضریب: ${toPersianDigits(ratio)}`
    };
  };

  // Fetch online prices for a specific tab
  const fetchOnlinePricesForTab = async (typeId: PipeCategoryType, urlToFetch?: string) => {
    setLoading(true);
    setSyncResults(null);
    const targetUrl = urlToFetch || sourceUrl;
    try {
      const res = await fetch("/api/scraping/markaz-ahan-pipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, type: typeId })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setOnlinePipes(data.items);
        setLastFetchedTime(new Date().toLocaleTimeString('fa-IR'));
        setSelectedItemIds(data.items.map((i: PipeOnlineItem) => i.id));
        showNotification(`تعداد ${toPersianDigits(data.items.length)} مشخصه ${data.title || 'لوله'} با موفقیت دریافت شد.`, "success");
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
    fetchOnlinePricesForTab(activeCategoryTab, currentTabConfig.url);
  }, []);

  // Filtered pipes by search query
  const filteredPipes = useMemo(() => {
    if (!searchQuery.trim()) return onlinePipes;
    const q = searchQuery.toLowerCase().trim();
    return onlinePipes.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.diameterInch.includes(q) ||
      String(p.thicknessMm).includes(q) ||
      String(p.diameterMm).includes(q)
    );
  }, [onlinePipes, searchQuery]);

  // Check matching existing products in system
  const getExistingMatch = (pipe: PipeOnlineItem): Product | undefined => {
    return products.find(prod => {
      if (prod.pipeDiameterInch && prod.pipeThicknessMm) {
        return prod.pipeDiameterInch === pipe.diameterInch && 
               Number(prod.pipeThicknessMm) === pipe.thicknessMm &&
               (!prod.category || prod.category.includes(currentTabConfig.categoryName) || prod.name.includes(currentTabConfig.categoryName));
      }
      const pName = prod.name.replace(/\s+/g, ' ');
      if (activeCategoryTab === 'sepahan') {
        return pName.includes("توکار") && pName.includes("سپاهان") && pName.includes(pipe.diameterInch);
      } else if (activeCategoryTab === 'kecho') {
        return pName.includes("کچو") && pName.includes(pipe.diameterInch);
      } else if (activeCategoryTab === 'copper') {
        return pName.includes("مسی") && pName.includes(pipe.diameterInch || String(pipe.diameterMm));
      } else if (activeCategoryTab === 'galvanized') {
        return pName.includes("گالوانیزه") && pName.includes(pipe.diameterInch);
      }
      return false;
    });
  };

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
          description: currentTabConfig.description
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

        let rawPurchasePriceToman = item.pricePerBranch;
        if (pricingBasis === 'kg') {
          rawPurchasePriceToman = item.pricePerKg;
        } else if (pricingBasis === 'meter') {
          rawPurchasePriceToman = item.pricePerMeter;
        }

        const convertedPurchasePrice = convertFromToman(rawPurchasePriceToman);
        const convertedPricePerKg = convertFromToman(item.pricePerKg);
        const convertedPricePerBranch = convertFromToman(item.pricePerBranch);
        const convertedPricePerMeter = convertFromToman(item.pricePerMeter);

        const isPersianCurrency = activeCurrencyLabel === "تومان" || activeCurrencyLabel === "ریال";
        const finalPurchasePrice = isPersianCurrency ? Math.round(convertedPurchasePrice) : Number(convertedPurchasePrice.toFixed(2));
        const finalPricePerKg = isPersianCurrency ? Math.round(convertedPricePerKg) : Number(convertedPricePerKg.toFixed(2));
        const finalPricePerBranch = isPersianCurrency ? Math.round(convertedPricePerBranch) : Number(convertedPricePerBranch.toFixed(2));
        const finalPricePerMeter = isPersianCurrency ? Math.round(convertedPricePerMeter) : Number(convertedPricePerMeter.toFixed(2));

        const marginMultiplier = 1 + (Number(profitMarginPercent) || 0) / 100;
        const rawSalePrice = finalPurchasePrice * marginMultiplier;
        const finalSalePrice = isPersianCurrency ? Math.round(rawSalePrice) : Number(rawSalePrice.toFixed(2));

        const computedUnitRatio = getComputedUnitRatio(item);
        const ratioInfo = getUnitRatioDescription(item);
        const unitRatioDirection: 'main_to_secondary' | 'secondary_to_main' =
          (selectedMainUnit === "شاخه" || selectedMainUnit === "کلاف") && (selectedSecondaryUnit === "متر" || selectedSecondaryUnit === "کیلوگرم")
            ? 'main_to_secondary'
            : 'secondary_to_main';

        const productPayload: Partial<Product> = {
          name: item.name,
          category: targetCategory,
          categoryId: categoryId,
          type: 'product',
          purchasePrice: finalPurchasePrice,
          price: finalSalePrice,
          salePrice: finalSalePrice,
          unit: selectedMainUnit,
          secondaryUnit: selectedSecondaryUnit === "ندارد" ? undefined : selectedSecondaryUnit,
          unitRatio: computedUnitRatio,
          unitRatioDirection: unitRatioDirection,
          description: `${item.name} | برند: ${item.brand || currentTabConfig.brand} | سایز: ${item.diameterInch} اینچ | ضخامت: ${item.thicknessMm}mm | قطر خارجی: ${item.diameterMm}mm | طول: ${item.lengthM}m | وزن شاخه: ${item.weightPerBranchKg}kg | واحد اصلی: ${selectedMainUnit} | واحد فرعی: ${selectedSecondaryUnit === 'ندارد' ? 'ندارد' : `${selectedSecondaryUnit} (${ratioInfo.formula})`} | نسبت تبدیل: ${computedUnitRatio} | واحد ارزی: ${activeCurrencyLabel} (نرخ تبدیل: ${activeCurrencyLabel === 'ریال' ? `هر ۱ تومان = ${exchangeRate} ریال` : `هر ۱ ${activeCurrencyLabel} = ${addCommas(exchangeRate)} تومان`}) | قیمت پایه مرکزآهن: ${addCommas(item.pricePerKg)} تومان/کیلو`,
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
          const prefix = activeCategoryTab.toUpperCase();
          const cleanInch = (item.diameterInch || String(item.diameterMm)).replace(/[\s/]/g, '');
          const cleanThick = String(item.thicknessMm).replace('.', '');
          const newCode = `PIPE-${prefix}-${cleanInch}-${cleanThick}`;
          await addProduct({
            ...productPayload,
            code: newCode,
            stock: 0,
            minStock: 5,
          });
          createdCount++;
        }
      }

      const refreshed = await getProducts();
      setProducts(refreshed);

      setSyncResults({ created: createdCount, updated: updatedCount, currency: activeCurrencyLabel });
      showNotification(
        `عملیات موفق: ${toPersianDigits(createdCount)} کالای جدید و ${toPersianDigits(updatedCount)} کالای موجود با واحد پولی «${activeCurrencyLabel}» ثبت و به‌روزرسانی شد.`, 
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
      {/* Category Navigation Bar (All 4 Sources in One Unified Menu) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <div className="px-3 py-2 text-xs font-black text-slate-500 flex items-center gap-1.5 border-l border-slate-200 ml-1">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>منوی صفحات استعلام:</span>
          </div>

          {PIPE_TABS_CONFIG.map((tab) => {
            const isActive = activeCategoryTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSwitchCategoryTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer relative ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-slate-50 text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-700 border border-slate-200/80"
                }`}
              >
                {tab.id === 'copper' ? (
                  <Sparkles className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-amber-600'}`} />
                ) : tab.id === 'galvanized' ? (
                  <ShieldCheck className={`w-4 h-4 ${isActive ? 'text-cyan-200' : 'text-cyan-600'}`} />
                ) : tab.id === 'kecho' ? (
                  <Building2 className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-emerald-600'}`} />
                ) : (
                  <Flame className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-amber-500'}`} />
                )}
                <span>{tab.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-normal ${
                  isActive ? "bg-indigo-700 text-indigo-100" : "bg-white text-slate-500 border border-slate-200"
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}

          <div className="h-6 w-px bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab("newpipe_pricing")}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm hover:from-red-700 hover:to-rose-700 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>نیوپایپ (فایل اکسل Excel)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-normal bg-white/20 text-white">
              بارگذاری اکسل
            </span>
          </button>
        </div>
      </div>

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
                <span className="text-indigo-300/50">•</span>
                <span className="text-emerald-300 font-black">{currentTabConfig.title}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black flex items-center gap-2.5">
                تعریف و بروزرسانی قیمت آنلاین {currentTabConfig.title}
              </h1>
              <p className="text-xs md:text-sm text-indigo-100/90 mt-1 max-w-3xl leading-relaxed">
                {currentTabConfig.description} با قابلیت تبدیل خودکار نرخ‌های روز مرکزآهن (تومان) به واحد ارزی سیستم ({activeCurrencyLabel}) و ثبت بر مبنای شاخه، کیلوگرم یا متر.
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
                onClick={() => fetchOnlinePricesForTab(activeCategoryTab, sourceUrl)}
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
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
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
          <div className="text-xs font-black text-slate-800 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>تنظیمات واحد شمارش، نسبت واحدها و دسته‌بندی کالا ({currentTabConfig.title})</span>
            </div>
            <div className="text-[11px] font-bold text-slate-500">
              واحد اصلی: <span className="text-indigo-600">{selectedMainUnit}</span> | واحد فرعی: <span className="text-indigo-600">{selectedSecondaryUnit}</span>
            </div>
          </div>

          {/* Quick Presets for Unit Configurations */}
          <div className="mb-4 bg-white/80 p-3 rounded-xl border border-slate-200/80">
            <div className="text-[11px] font-black text-slate-600 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              الگوهای سریع واحد و نسبت تبدیل (یک‌کلیک جهت انتخاب عرف بازار):
            </div>
            <div className="flex flex-wrap gap-2">
              {UNIT_PRESETS.map((p) => {
                const isActive = selectedMainUnit === p.mainUnit && selectedSecondaryUnit === p.secondaryUnit;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyUnitPreset(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-600/30"
                        : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40"
                    }`}
                  >
                    <span>{p.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-normal ${isActive ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-500"}`}>
                      {p.description}
                    </span>
                  </button>
                );
              })}
            </div>
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
                <option value="branch">بر اساس شاخه ({activeCurrencyLabel}/شاخه)</option>
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
                placeholder="نام گروه کالا..."
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
                <option value="شاخه">شاخه (پیش‌فرض لوله)</option>
                <option value="کیلوگرم">کیلوگرم (وزن لوله)</option>
                <option value="متر">متر (طول لوله)</option>
                <option value="کلاف">کلاف (مسی)</option>
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
                <option value="متر">متر (طول)</option>
                <option value="کیلوگرم">کیلوگرم (وزن طبق مشخصات)</option>
                <option value="شاخه">شاخه (واحد شمارش)</option>
                <option value="ندارد">بدون واحد فرعی (تک‌واحدی)</option>
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

          {/* Formula preview & Ratio direction */}
          <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-700">
              <Scale className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>فرمول نسبت تبدیل واحد: </strong>
                {selectedSecondaryUnit === "ندارد" ? (
                  <span className="text-slate-500">کالاها فقط با واحد اصلی «{selectedMainUnit}» و بدون واحد فرعی ثبت می‌شوند.</span>
                ) : (
                  <span>
                    در تعریف کالا در نرم‌افزار، نسبت واحد فرعی به صورت هوشمند محاسبه می‌شود (مثلاً برای لوله ۶ متری: <strong>۱ شاخه = ۶ متر</strong> و ضریب تبدیل = <strong>۶</strong> ذخیره می‌گردد).
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveToDatabase}
                disabled={isSyncing || selectedItemIds.length === 0}
                className="w-full lg:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer text-xs"
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
                <th className="p-3.5">سایز (اینچ) / نام کامل</th>
                <th className="p-3.5">ضخامت (mm)</th>
                <th className="p-3.5">طول (متر)</th>
                <th className="p-3.5">وزن هر شاخه/کلاف</th>
                <th className="p-3.5 bg-amber-50/70 text-amber-900 border-x border-amber-200/60">
                  <div>نسبت واحد اصلی و فرعی</div>
                  <div className="text-[10px] text-amber-700 font-bold">
                    {selectedSecondaryUnit === "ندارد" ? "تک‌واحدی" : `${selectedMainUnit} / ${selectedSecondaryUnit}`}
                  </div>
                </th>
                <th className="p-3.5">
                  <div>قیمت خرید کیلویی</div>
                  <div className="text-[10px] text-indigo-600 font-black">({activeCurrencyLabel})</div>
                </th>
                <th className="p-3.5">
                  <div>قیمت خرید هر شاخه/کلاف</div>
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
                const convertedPurchaseBasis = convertFromToman(rawSelectedBasis);
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
                      <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                        {toPersianDigits(pipe.diameterInch || (pipe.diameterMm ? `${pipe.diameterMm}mm` : "-"))}
                      </span>
                      <div>
                        <div>{pipe.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">قطر خارجی: {toPersianDigits(pipe.diameterMm)} میلی‌متر | برند: {pipe.brand}</div>
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
                    </td>

                    {/* Unit ratio column */}
                    <td className="p-3 bg-amber-50/40 border-x border-amber-200/50">
                      {(() => {
                        const ratioInfo = getUnitRatioDescription(pipe);
                        return (
                          <div>
                            <div className="font-bold text-amber-950 flex items-center gap-1">
                              <Scale className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{ratioInfo.formula}</span>
                            </div>
                            <div className="text-[10px] text-amber-800 font-semibold mt-0.5 flex items-center gap-1">
                              <span>ضریب در سیستم:</span>
                              <span className="font-mono font-black text-xs px-1.5 py-0.5 bg-amber-100 rounded border border-amber-300 text-amber-900">
                                {toPersianDigits(ratioInfo.ratio)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
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
            امکان تعریف کالا با واحد اصلی شاخه/کیلوگرم و واحد فرعی کیلوگرم/متر همراه با محاسبه خودکار ضریب تبدیل استاندارد کارخانه‌ها برای هر سایز لوله فراهم است.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm mb-2">
            <Sparkles className="w-4 h-4" />
            تجمیع ۴ دسته لوله در یک پنل
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            از طریق زبانه بالای همین صفحه می‌توانید به آسانی بین <strong>لوله گاز سپاهان</strong>، <strong>لوله گاز کچو</strong>، <strong>لوله مسی</strong> و <strong>لوله گالوانیزه</strong> سوئیچ کرده و استعلام و ثبت گروهی انجام دهید.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
