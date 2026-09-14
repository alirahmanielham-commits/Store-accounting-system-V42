import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, Globe, CheckCircle2, AlertCircle, ArrowUpDown, 
  ExternalLink, Layers, Scale, Ruler, Hash, CheckSquare, Square, 
  ArrowRight, ShieldCheck, Tag, PlusCircle, Check, Info, 
  FileText, Sliders, ChevronDown, Clock, Search, Sparkles
} from 'lucide-react';
import { Product, ProductCategory } from '../../types';
import { addProduct, updateProduct, getProducts, getProductCategories, addProductCategory } from '../../services/dataService';
import { addCommas, toPersianDigits, formatNumber } from '../../utils/format';

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
  showNotification: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  confirmAction?: (message: string, onConfirm: () => Promise<void> | void, details?: string) => void;
  setActiveTab?: (tab: string) => void;
}

export default function OnlinePipePricing({
  products,
  setProducts,
  categories,
  setCategories,
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
  const [syncResults, setSyncResults] = useState<{ updated: number; created: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Execute sync/define
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

      // 2. Loop through selected items and either update existing or add new
      for (const item of itemsToProcess) {
        const existing = getExistingMatch(item);

        // Determine prices based on user choice
        let purchasePrice = item.pricePerBranch; // default: branch
        let unitRatio = item.weightPerBranchKg;
        
        if (pricingBasis === 'kg') {
          purchasePrice = item.pricePerKg;
        } else if (pricingBasis === 'meter') {
          purchasePrice = item.pricePerMeter;
        }

        const marginMultiplier = 1 + (Number(profitMarginPercent) || 0) / 100;
        const calculatedSalePrice = Math.round(purchasePrice * marginMultiplier);

        const productPayload: Partial<Product> = {
          name: item.name,
          category: targetCategory,
          categoryId: categoryId,
          type: 'product',
          purchasePrice: purchasePrice,
          price: calculatedSalePrice,
          salePrice: calculatedSalePrice,
          unit: selectedMainUnit,
          secondaryUnit: selectedSecondaryUnit,
          unitRatio: unitRatio,
          description: `لوله گاز توکار استاندارد سپاهان | سایز: ${item.diameterInch} اینچ | ضخامت: ${item.thicknessMm} میلی‌متر | قطر: ${item.diameterMm}mm | طول: ${item.lengthM} متر | وزن هر شاخه: ${item.weightPerBranchKg} کیلوگرم | بارگیری: ${item.location} | منبع: مرکزآهن`,
          pipeDiameterInch: item.diameterInch,
          pipeThicknessMm: item.thicknessMm,
          pipeDiameterMm: item.diameterMm,
          pipeLengthM: item.lengthM,
          pipeWeightPerBranchKg: item.weightPerBranchKg,
          pipeLoadingLocation: item.location,
          sourceUrl: sourceUrl,
          pricePerKg: item.pricePerKg,
          pricePerMeter: item.pricePerMeter,
          pricePerBranch: item.pricePerBranch,
          pricingBasis: pricingBasis,
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

      setSyncResults({ created: createdCount, updated: updatedCount });
      showNotification(
        `عملیات موفق: ${toPersianDigits(createdCount)} کالا جدید تعریف شد و ${toPersianDigits(updatedCount)} کالا بروزرسانی شد.`, 
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
        <div className="bg-gradient-to-l from-indigo-700 via-indigo-600 to-indigo-900 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-32 -translate-y-32 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 text-indigo-100 text-xs font-bold mb-2 backdrop-blur-sm border border-white/10">
                <Globe className="w-3.5 h-3.5 text-indigo-300" />
                استعلام و اتصال وب‌سایت مرکزآهن
              </div>
              <h1 className="text-xl md:text-2xl font-black flex items-center gap-2.5">
                تعریف و بروزرسانی قیمت آنلاین لوله گاز توکار سپاهان
              </h1>
              <p className="text-xs md:text-sm text-indigo-100/90 mt-1 max-w-3xl leading-relaxed">
                استخراج برخط مشخصات فنی و قیمت روز لوله‌های گازی مانیس‌گاز سپاهان، محاسبه خودکار بر مبنای واحد شاخه، کیلوگرم یا متر با قابلیت انتساب واحد فرعی و دسته‌بندی دلخواه.
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
                تعداد اقلام دریافتی: <strong>{toPersianDigits(onlinePipes.length)} ردیف سایز استاندارد</strong>
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
              عملیات ثبت با موفقیت پایان یافت: {toPersianDigits(syncResults.created)} کالای جدید ایجاد و {toPersianDigits(syncResults.updated)} کالای موجود به‌روز شدند.
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

        {/* Settings & Configuration Toolbar */}
        <div className="p-6 bg-slate-50/70 border-b border-slate-200">
          <div className="text-xs font-black text-slate-800 mb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            تنظیمات ثبت، مبنای قیمت خرید، دسته‌بندی و واحدهای شمارش
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
                <option value="branch">بر اساس شاخه ۶ متری (تومان/شاخه)</option>
                <option value="kg">بر اساس وزن (تومان/کیلوگرم)</option>
                <option value="meter">بر اساس متر طول (تومان/متر)</option>
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
                ضریب تبدیل واحد فرعی به اصلی به‌صورت خودکار بر اساس <strong>وزن دقیق هر شاخه (جدول مرکزآهن)</strong> در سیستم تعریف می‌گردد.
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
                {isSyncing ? "در حال ثبت و اعمال..." : `ثبت و به‌روزرسانی ${toPersianDigits(selectedItemIds.length)} لوله در سیستم`}
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

        {/* Pipes Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-extrabold">
                <th className="p-3.5 w-10 text-center">#</th>
                <th className="p-3.5">سایز (اینچ)</th>
                <th className="p-3.5">ضخامت (mm)</th>
                <th className="p-3.5">طول (متر)</th>
                <th className="p-3.5">وزن هر شاخه</th>
                <th className="p-3.5">قیمت خرید کیلویی</th>
                <th className="p-3.5">قیمت خرید هر شاخه</th>
                <th className="p-3.5">قیمت خرید هر متر</th>
                <th className="p-3.5 bg-indigo-50/50 text-indigo-900">قیمت فروش پیشنهادی ({toPersianDigits(profitMarginPercent)}٪+)</th>
                <th className="p-3.5 text-center">وضعیت در سیستم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredPipes.map((pipe) => {
                const isSelected = selectedItemIds.includes(pipe.id);
                const existing = getExistingMatch(pipe);
                const calcPurchasePrice = pricingBasis === 'kg' ? pipe.pricePerKg : pricingBasis === 'meter' ? pipe.pricePerMeter : pipe.pricePerBranch;
                const calcSalePrice = Math.round(calcPurchasePrice * (1 + profitMarginPercent / 100));

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

                    <td className="p-3">
                      <div className="font-black text-slate-800">
                        {toPersianDigits(addCommas(pipe.pricePerKg))} <span className="text-[10px] text-slate-500">تومان</span>
                      </div>
                      <span className="text-[10px] text-slate-400">مرکزآهن ({pipe.location})</span>
                    </td>

                    <td className="p-3">
                      <div className="font-black text-indigo-700">
                        {toPersianDigits(addCommas(pipe.pricePerBranch))} <span className="text-[10px] text-indigo-500">تومان</span>
                      </div>
                      <span className="text-[10px] text-slate-400">وزن × نرخ کیلو</span>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-700">
                        {toPersianDigits(addCommas(pipe.pricePerMeter))} <span className="text-[10px] text-slate-400">تومان</span>
                      </div>
                      <span className="text-[10px] text-slate-400">شاخه ÷ ۶</span>
                    </td>

                    <td className="p-3 bg-indigo-50/40 font-black text-emerald-700">
                      <div>
                        {toPersianDigits(addCommas(calcSalePrice))} <span className="text-[10px] text-emerald-600">تومان</span>
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
              اطلاعات فوق به صورت استاندارد کارخانه سپاهان (استاندارد API 5L / ISIRI 3574 با نام تجاری مانیس گاز) با درج ضخامت و اوزان استاندارد درج گردیده است.
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={isSyncing || selectedItemIds.length === 0}
            className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {isSyncing ? "در حال ثبت و ذخیره‌سازی..." : `ثبت نهایی اقلام انتخابی (${toPersianDigits(selectedItemIds.length)} کالا)`}
          </button>
        </div>
      </div>

      {/* Educational & Technical Specifications Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm mb-2">
            <Ruler className="w-4 h-4" />
            فرمول تبدیل واحد و قیمت
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            در لوله‌های فولادی و گازی سپاهان، خرید معمولاً بر اساس <strong>وزن (کیلوگرم)</strong> انجام می‌شود ولی فروش به پیمانکاران اغلب بر مبنای <strong>شاخه ۶ متری یا متر طول</strong> است. این صفحه هر سه حالت را به همراه ضریب واحد فرعی تنظیم می‌کند.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm mb-2">
            <Tag className="w-4 h-4" />
            سایزها و اوزان لوله توکار سپاهان
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            لوله‌ها در سایزهای ۱/۲ (۷.۶۸kg)، ۳/۴ (۱۰.۲kg)، ۱ اینچ (۱۵.۰۶kg)، ۱ ۱/۴ (۲۰.۵۸kg)، ۱ ۱/۲ (۲۴.۴۲kg) و ۲ اینچ (۳۲.۵۲kg) با طول ثابت ۶ متر تولید می‌شوند.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm mb-2">
            <Sparkles className="w-4 h-4" />
            اتصال دائمی و اتوماتیک
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            با زدن دکمه <strong>بروزرسانی آنلاین قیمت‌ها</strong> در بالای صفحه، بدون نیاز به ورود دستی، آخرین قیمت‌های روز مرکز آهن بازیابی و قیمت‌های خرید و فروش در سیستم به‌روز خواهند شد.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
