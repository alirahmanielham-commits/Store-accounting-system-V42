import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, Upload, Download, RefreshCw, FileUp, 
  Layers, Search, Sliders, CheckCircle2, AlertCircle, 
  ArrowRight, ShieldCheck, CheckSquare, Square, Package, 
  Copy, Check, Flame, Sparkles, Building2, TrendingUp, 
  TrendingDown, Filter, Trash2, HelpCircle, Coins, 
  ArrowUpDown, Percent, Info, ChevronDown, CheckCheck
} from 'lucide-react';
import { Product, ProductCategory } from '../../types';
import { addProduct, updateProduct, getProducts, addProductCategory } from '../../services/dataService';
import { addCommas, toPersianDigits } from '../../utils/format';
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

// Persian to Latin digit converter
function normalizePersianDigits(str: string | number): string {
  if (typeof str === 'number') return str.toString();
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str.toString();
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    res = res.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  return res;
}

// Clean number parser (handles commas, spaces, decimals)
function parseCleanNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = normalizePersianDigits(val).replace(/[,،\s_]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Infer category type from product name or text
function inferNewpipeCategory(name: string, catText?: string): { categoryType: NewpipeCategory; persianCategory: string } {
  const combined = `${name} ${catText || ''}`.toLowerCase();
  
  if (combined.includes('کلمپ')) {
    return { categoryType: 'clamp', persianCategory: 'اتصالات کلمپی' };
  }
  if (combined.includes('پرس') || combined.includes('press')) {
    return { categoryType: 'press', persianCategory: 'اتصالات پرسی' };
  }
  if (combined.includes('کوپل') || combined.includes('مهره ماسوره')) {
    return { categoryType: 'coupeli', persianCategory: 'اتصالات کوپلی' };
  }
  if (combined.includes('رزوه') || combined.includes('دنده') || combined.includes('مغزی') || combined.includes('بوشن')) {
    return { categoryType: 'threaded', persianCategory: 'اتصالات رزوه‌ای' };
  }
  if (combined.includes('کلکتور') || combined.includes('نیوکلکتور') || combined.includes('فلومتر')) {
    return { categoryType: 'collector', persianCategory: 'کلکتور و نیوکلکتور' };
  }
  if (combined.includes('شیر') || combined.includes('پیسوار') || combined.includes('پروانه')) {
    return { categoryType: 'valve', persianCategory: 'شیرآلات تاسیساتی' };
  }
  if (combined.includes('پلیمری') || combined.includes('درپوش') || combined.includes('اورینگ') || combined.includes('بست')) {
    return { categoryType: 'polymer_fitting', persianCategory: 'ملزومات پلیمری و یدکی' };
  }
  if (combined.includes('فلزی') || combined.includes('جعبه') || combined.includes('پایه') || combined.includes('صفحه نصب')) {
    return { categoryType: 'metal_fitting', persianCategory: 'ملزومات فلزی' };
  }
  if (combined.includes('عایق') || combined.includes('فوم') || combined.includes('چسب') || combined.includes('ترموستات')) {
    return { categoryType: 'insulation_tools', persianCategory: 'عایق، فوم و ملزومات' };
  }
  if (combined.includes('لوله') || combined.includes('pipe') || combined.includes('pex') || combined.includes('pert')) {
    return { categoryType: 'pipe', persianCategory: 'لوله‌های پنج لایه' };
  }

  return { categoryType: 'pipe', persianCategory: catText || 'محصولات نیوپایپ' };
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
  // CRITICAL REQUIREMENT: Items MUST start as empty []!
  // Products must NOT exist on this page beforehand, and must ONLY be populated by uploading an Excel file.
  const [items, setItems] = useState<NewpipeProductItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'existing_changed' | 'existing_same' | 'existing'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  // Uploaded file metadata
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [excelRawWorkbook, setExcelRawWorkbook] = useState<XLSX.WorkBook | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pricing & Currency Controls
  const systemDefaultCurrency = useMemo(() => {
    const raw = storeSettings?.currency?.trim() || "تومان";
    if (raw === "IRR" || raw === "ریال") return "ریال";
    if (raw === "USD" || raw === "دلار") return "دلار";
    if (raw === "EUR" || raw === "یورو") return "یورو";
    return "تومان";
  }, [storeSettings?.currency]);

  // Excel price currency setting: official lists are typically in Rials, local lists might be in Tomans
  const [excelPriceUnit, setExcelPriceUnit] = useState<'rial' | 'toman'>('rial');
  const [targetCurrency, setTargetCurrency] = useState<string>(systemDefaultCurrency);
  
  // Wholesaler purchase discount from official factory list (e.g. 10% to 25%)
  const [supplierDiscountPercent, setSupplierDiscountPercent] = useState<number>(0);
  // Suggested retail profit margin
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(15);
  // Whether official list price already contains 10% VAT
  const [vatIncludedInExcel, setVatIncludedInExcel] = useState<boolean>(true);
  
  const [autoCreateSubCategories, setAutoCreateSubCategories] = useState<boolean>(true);
  const [unifiedCategoryName, setUnifiedCategoryName] = useState<string>("محصولات نیوپایپ");

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<{ updated: number; created: number } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // When items load or change, auto-select all
  useEffect(() => {
    if (items.length > 0) {
      setSelectedItemIds(items.map(i => i.id));
    } else {
      setSelectedItemIds([]);
    }
  }, [items]);

  // Exchange rate multiplier to convert Rial/Toman to system target currency
  const currencyRateMultiplier = useMemo(() => {
    // If Excel price is in Toman:
    // 1 Toman = 1 Toman (if target is Toman), 10 Rials (if target is Rial)
    // If Excel price is in Rial:
    // 1 Rial = 0.1 Toman, 1 Rial
    const isRial = excelPriceUnit === 'rial';

    if (targetCurrency === "ریال") {
      return isRial ? 1 : 10;
    }
    if (targetCurrency === "تومان") {
      return isRial ? 0.1 : 1;
    }
    if (targetCurrency === "دلار") {
      const rateInToman = storeSettings?.exchangeRates?.["USD"] || 950000;
      return isRial ? (0.1 / rateInToman) : (1 / rateInToman);
    }
    if (targetCurrency === "یورو") {
      const rateInToman = storeSettings?.exchangeRates?.["EUR"] || 1050000;
      return isRial ? (0.1 / rateInToman) : (1 / rateInToman);
    }
    return isRial ? 0.1 : 1;
  }, [excelPriceUnit, targetCurrency, storeSettings]);

  // Existing products lookup map by code, barcode, and name
  const existingProductsMap = useMemo(() => {
    const codeMap = new Map<string, Product>();
    const nameMap = new Map<string, Product>();
    for (const p of products) {
      if (p.code) codeMap.set(p.code.trim().toLowerCase(), p);
      if (p.barcode) codeMap.set(p.barcode.trim().toLowerCase(), p);
      if (p.name) nameMap.set(p.name.trim().toLowerCase(), p);
    }
    return { codeMap, nameMap };
  }, [products]);

  // Check if item exists in system
  const checkExistingProduct = (item: NewpipeProductItem): Product | null => {
    if (item.code && existingProductsMap.codeMap.has(item.code.trim().toLowerCase())) {
      return existingProductsMap.codeMap.get(item.code.trim().toLowerCase()) || null;
    }
    if (item.name && existingProductsMap.nameMap.has(item.name.trim().toLowerCase())) {
      return existingProductsMap.nameMap.get(item.name.trim().toLowerCase()) || null;
    }
    return null;
  };

  // Calculate prices for an item
  const calculateItemPrices = (item: NewpipeProductItem) => {
    // 1. Raw list price from Excel
    let rawPrice = item.priceRial;

    // 2. Adjust for VAT if user toggled off
    if (!vatIncludedInExcel && item.hasVatIncluded) {
      rawPrice = Math.round(rawPrice / 1.1);
    }

    // 3. Apply supplier discount (تخفیف خرید از لیست کارخانه)
    const afterSupplierDiscount = rawPrice * (1 - supplierDiscountPercent / 100);

    // 4. Convert to target currency
    const purchasePrice = Math.round(afterSupplierDiscount * currencyRateMultiplier);

    // 5. Calculate suggested sale price with profit margin
    const salePrice = Math.round(purchasePrice * (1 + profitMarginPercent / 100));

    return { 
      rawListPrice: rawPrice,
      purchasePrice, 
      salePrice 
    };
  };

  // Process rows from SheetJS
  const processSheetRows = (sheet: XLSX.WorkSheet) => {
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
    if (!rawData || rawData.length === 0) {
      showNotification("شیت انتخاب‌شده خالی است یا ساختار جدولی ندارد.", "warning");
      return;
    }

    const parsedItems: NewpipeProductItem[] = [];

    // Helper to find value from row by checking various common column header names
    const getCol = (row: Record<string, any>, patterns: RegExp[], fallback: any = ""): any => {
      const keys = Object.keys(row);
      for (const pattern of patterns) {
        const foundKey = keys.find(k => pattern.test(k.trim().toLowerCase()));
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== "") {
          return row[foundKey];
        }
      }
      return fallback;
    };

    rawData.forEach((row, idx) => {
      // 1. Code
      const codeVal = getCol(row, [
        /^(کد|کد کالا|کد_کالا|کد محصول|کد نیوپایپ|کدکالا|code|item_?code|product_?code|id)$/i,
        /کد/i,
        /code/i
      ]);
      const code = normalizePersianDigits(codeVal || "").trim();

      // 2. Name
      const nameVal = getCol(row, [
        /^(نام|نام کالا|نام_کالا|شرح|شرح کالا|شرح_کالا|عنوان|عنوان کالا|نام محصول|شرح محصول|name|item_?name|title|description)$/i,
        /شرح/i,
        /نام/i,
        /name/i
      ]);
      const name = (nameVal || "").toString().trim();

      // Skip invalid header rows or empty rows
      if (!name && !code) return;
      if (name.includes("نام کالا") || name.includes("شرح کالا") || code.includes("کد کالا")) return;

      // 3. Size
      const sizeVal = getCol(row, [
        /^(سایز|سایز کالا|اندازه|ابعاد|قطر|size|dimension)$/i,
        /سایز/i,
        /size/i
      ], "");
      const size = (sizeVal || "").toString().trim();

      // 4. Category
      const catVal = getCol(row, [
        /^(دسته|دسته‌بندی|دسته بندی|گروه|گروه کالا|طبقه|category|group)$/i,
        /دسته/i,
        /گروه/i
      ], "");
      const subCatVal = getCol(row, [
        /^(زیر دسته|زیرگروه|زیر دسته بندی|subcategory|sub_?category)$/i,
        /زیر/i
      ], "");

      const { categoryType, persianCategory } = inferNewpipeCategory(name, catVal);

      // 5. Price
      const priceVal = getCol(row, [
        /^(قیمت|قیمت لیست|قیمت ریال|قیمت تومان|قیمت واحد|نرخ|فی|قیمت مصرف کننده|قیمت کارخانه|قیمت مصوب|مبلغ|price|list_?price|unit_?price|amount)$/i,
        /قیمت/i,
        /نرخ/i,
        /فی/i,
        /price/i
      ], 0);
      const parsedPrice = parseCleanNumber(priceVal);

      // 6. Packaging & Units
      const unitVal = getCol(row, [
        /^(واحد|واحد اصلی|واحد سنجش|واحد شمارش|unit)$/i,
        /واحد/i
      ], "");
      const secondaryUnitVal = getCol(row, [
        /^(واحد فرعی|واحد دوم|واحد۲|secondary_?unit)$/i,
        /فرعی/i
      ], "");
      const unitRatioVal = parseCleanNumber(getCol(row, [
        /^(ضریب|نسبت|ضریب تبدیل|نسبت تبدیل|ratio|unit_?ratio)$/i,
        /ضریب/i,
        /نسبت/i
      ], 0));

      const boxCount = parseCleanNumber(getCol(row, [
        /^(تعداد در جعبه|جعبه|تعداد جعبه|box|box_?count|inner_?box)$/i,
        /جعبه/i
      ], 0));
      const cartonCount = parseCleanNumber(getCol(row, [
        /^(تعداد در کارتن|کارتن|تعداد کارتن|carton|carton_?count)$/i,
        /کارتن/i
      ], 0));
      const rollMeter = parseCleanNumber(getCol(row, [
        /^(متراژ کلاف|کلاف|متراژ|طول کلاف|roll|roll_?meter)$/i,
        /کلاف/i,
        /متراژ/i
      ], 0));
      const branchLengthM = parseCleanNumber(getCol(row, [
        /^(شاخه|طول شاخه|branch|branch_?length)$/i,
        /شاخه/i
      ], 0));

      // Infer default unit if missing
      let unit = unitVal.toString().trim();
      if (!unit) {
        if (rollMeter > 0 || branchLengthM > 0 || name.includes("لوله")) {
          unit = "متر";
        } else {
          unit = "عدد";
        }
      }

      let secUnit = secondaryUnitVal.toString().trim();
      let ratio = unitRatioVal;

      if (!secUnit) {
        if (cartonCount > 0) {
          secUnit = "کارتن";
          if (!ratio) ratio = cartonCount;
        } else if (boxCount > 0) {
          secUnit = "جعبه";
          if (!ratio) ratio = boxCount;
        } else if (rollMeter > 0) {
          secUnit = "کلاف";
          if (!ratio) ratio = rollMeter;
        } else if (branchLengthM > 0) {
          secUnit = "شاخه";
          if (!ratio) ratio = branchLengthM;
        }
      }

      const id = `excel-np-${idx}-${code || Math.random().toString(36).substring(2, 8)}`;

      parsedItems.push({
        id,
        code: code || `NP-${(idx + 1).toString().padStart(4, '0')}`,
        name: name || `کالای نیوپایپ ${code}`,
        persianCategory: persianCategory,
        categoryType: categoryType,
        subCategory: subCatVal || undefined,
        size: size || "-",
        boxCount: boxCount > 0 ? boxCount : undefined,
        cartonCount: cartonCount > 0 ? cartonCount : undefined,
        rollMeter: rollMeter > 0 ? rollMeter : undefined,
        branchLengthM: branchLengthM > 0 ? branchLengthM : undefined,
        unit: unit,
        secondaryUnit: secUnit || undefined,
        unitRatio: ratio > 0 ? ratio : undefined,
        priceRial: parsedPrice,
        priceToman: Math.round(parsedPrice / 10),
        hasVatIncluded: true
      });
    });

    if (parsedItems.length === 0) {
      showNotification("هیچ ردیف معتبری در فایل اکسل شناسایی نشد. لطفاً قالب اکسل را بررسی کنید.", "error");
      return;
    }

    // Check if prices seem to be in Rials or Tomans
    const avgPrice = parsedItems.reduce((s, it) => s + it.priceRial, 0) / parsedItems.length;
    if (avgPrice < 100000 && avgPrice > 100) {
      setExcelPriceUnit('toman');
    } else {
      setExcelPriceUnit('rial');
    }

    setItems(parsedItems);
    showNotification(`تعداد ${toPersianDigits(parsedItems.length)} قلم کالا با موفقیت از فایل اکسل استخراج گردید.`, "success");
  };

  // Handle file input change
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readExcelFile(file);
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
        readExcelFile(file);
      } else {
        showNotification("لطفاً فایل اکسل معتبر با پسوند xlsx یا xls یا csv انتخاب کنید.", "warning");
      }
    }
  };

  // Read Excel File with XLSX
  const readExcelFile = (file: File) => {
    setIsParsingExcel(true);
    setUploadedFileName(file.name);
    setUploadedFileSize((file.size / 1024).toFixed(1) + " کیلوبایت");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        
        setExcelRawWorkbook(workbook);
        setSheetNames(workbook.SheetNames);

        if (workbook.SheetNames.length > 0) {
          const firstSheet = workbook.SheetNames[0];
          setSelectedSheet(firstSheet);
          processSheetRows(workbook.Sheets[firstSheet]);
        }
      } catch (err: any) {
        console.error("Excel parse error:", err);
        showNotification("خطا در پردازش فایل اکسل: " + (err.message || "فایل ناخوانا است"), "error");
      } finally {
        setIsParsingExcel(false);
      }
    };

    reader.onerror = () => {
      setIsParsingExcel(false);
      showNotification("خطا در خواندن فایل از حافظه.", "error");
    };

    reader.readAsArrayBuffer(file);
  };

  // Switch Sheet
  const handleSheetChange = (sheetName: string) => {
    if (!excelRawWorkbook || !excelRawWorkbook.Sheets[sheetName]) return;
    setSelectedSheet(sheetName);
    processSheetRows(excelRawWorkbook.Sheets[sheetName]);
  };

  // Clear loaded file and items
  const handleResetAndClear = () => {
    setItems([]);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setExcelRawWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setSelectedItemIds([]);
    setSyncSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showNotification("اطلاعات فایل پاکسازی شد. اکنون صفحه آماده دریافت فایل جدید است.", "info");
  };

  // Download official / sample Excel template
  const handleDownloadSampleExcel = () => {
    try {
      const sampleRows = NEWPIPE_OFFICIAL_CATALOG.slice(0, 25).map(item => ({
        "کد کالا": item.code,
        "نام و شرح کالا": item.name,
        "سایز": item.size,
        "دسته بندی": item.persianCategory,
        "قیمت لیست (ریال)": item.priceRial,
        "واحد اصلی": item.unit,
        "واحد فرعی": item.secondaryUnit || "",
        "ضریب تبدیل": item.unitRatio || "",
        "تعداد در جعبه": item.boxCount || "",
        "تعداد در کارتن": item.cartonCount || "",
        "متراژ کلاف": item.rollMeter || "",
        "طول شاخه": item.branchLengthM || ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(sampleRows);
      // Auto width
      worksheet['!cols'] = [
        { wch: 15 }, // کد کالا
        { wch: 40 }, // نام و شرح کالا
        { wch: 12 }, // سایز
        { wch: 22 }, // دسته بندی
        { wch: 18 }, // قیمت لیست
        { wch: 12 }, // واحد اصلی
        { wch: 12 }, // واحد فرعی
        { wch: 12 }, // ضریب
        { wch: 14 }, // جعبه
        { wch: 14 }, // کارتن
        { wch: 14 }, // کلاف
        { wch: 12 }, // شاخه
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "لیست قیمت نیوپایپ");
      XLSX.writeFile(workbook, "قالب_اکسل_لیست_قیمت_نیوپایپ.xlsx");
      showNotification("قالب اکسل استاندارد نیوپایپ با موفقیت دانلود شد.", "success");
    } catch (err) {
      console.error("Export template error:", err);
      showNotification("خطا در ایجاد فایل اکسل نمونه", "error");
    }
  };

  // Quick load sample dataset (useful for instant preview/testing)
  const handleQuickLoadTestData = () => {
    setIsParsingExcel(true);
    setTimeout(() => {
      setItems(NEWPIPE_OFFICIAL_CATALOG);
      setUploadedFileName("نمونه_کاتالوگ_رسمی_نیوپایپ.xlsx (تستی)");
      setUploadedFileSize("۳۵۰ قلم استاندارد");
      setSheetNames(["کاتالوگ جامع"]);
      setSelectedSheet("کاتالوگ جامع");
      setExcelPriceUnit('rial');
      setIsParsingExcel(false);
      showNotification(`تعداد ${toPersianDigits(NEWPIPE_OFFICIAL_CATALOG.length)} قلم کالای استاندارد نیوپایپ بارگذاری گردید.`, "success");
    }, 300);
  };

  // Export current processed list to Excel
  const handleExportCurrentList = () => {
    if (items.length === 0) return;
    try {
      const exportData = filteredItems.map(item => {
        const { purchasePrice, salePrice } = calculateItemPrices(item);
        const existing = checkExistingProduct(item);
        return {
          "کد کالا": item.code,
          "نام کالا": item.name,
          "سایز": item.size,
          "گروه": item.persianCategory,
          "قیمت لیست": item.priceRial,
          [`قیمت خرید (${targetCurrency})`]: purchasePrice,
          [`قیمت فروش پیشنهادی (${targetCurrency})`]: salePrice,
          "وضعیت سیستم": existing ? "موجود در سیستم" : "کالای جدید",
          "قیمت فعلی سیستم": existing?.price || 0,
          "واحد": item.unit,
          "بسته‌بندی": item.cartonCount ? `کارتن: ${item.cartonCount}` : item.boxCount ? `جعبه: ${item.boxCount}` : item.rollMeter ? `کلاف: ${item.rollMeter}m` : ""
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "اقلام نیوپایپ");
      XLSX.writeFile(wb, `نیوپایپ_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showNotification("فایل اکسل با موفقیت ایجاد و دانلود شد.", "success");
    } catch (e) {
      showNotification("خطا در صدور فایل اکسل", "error");
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Category Tab
      if (selectedCategoryTab !== 'all' && item.categoryType !== selectedCategoryTab) {
        return false;
      }

      // 2. Status Filter
      const existing = checkExistingProduct(item);
      const { purchasePrice, salePrice } = calculateItemPrices(item);

      if (statusFilter === 'new' && existing) return false;
      if (statusFilter === 'existing' && !existing) return false;
      if (statusFilter === 'existing_changed') {
        if (!existing) return false;
        // Check if price changed
        const currentPrice = existing.purchasePrice || existing.price || 0;
        if (Math.abs(currentPrice - purchasePrice) < 1) return false;
      }
      if (statusFilter === 'existing_same') {
        if (!existing) return false;
        const currentPrice = existing.purchasePrice || existing.price || 0;
        if (Math.abs(currentPrice - purchasePrice) >= 1) return false;
      }

      // 3. Search Query
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
  }, [items, selectedCategoryTab, statusFilter, searchQuery, existingProductsMap, supplierDiscountPercent, profitMarginPercent, targetCurrency, excelPriceUnit, vatIncludedInExcel]);

  // Counts for status tabs
  const statusCounts = useMemo(() => {
    let newCount = 0;
    let existingChangedCount = 0;
    let existingSameCount = 0;

    for (const it of items) {
      const existing = checkExistingProduct(it);
      if (!existing) {
        newCount++;
      } else {
        const { purchasePrice } = calculateItemPrices(it);
        const currentPrice = existing.purchasePrice || existing.price || 0;
        if (Math.abs(currentPrice - purchasePrice) >= 1) {
          existingChangedCount++;
        } else {
          existingSameCount++;
        }
      }
    }

    return {
      total: items.length,
      new: newCount,
      existingChanged: existingChangedCount,
      existingSame: existingSameCount,
      existingTotal: existingChangedCount + existingSameCount
    };
  }, [items, existingProductsMap, supplierDiscountPercent, profitMarginPercent, targetCurrency, excelPriceUnit, vatIncludedInExcel]);

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

  const handleSelectOnlyNew = () => {
    const newIds = filteredItems.filter(i => !checkExistingProduct(i)).map(i => i.id);
    setSelectedItemIds(newIds);
  };

  const handleSelectOnlyChanged = () => {
    const changedIds = filteredItems.filter(i => {
      const ex = checkExistingProduct(i);
      if (!ex) return false;
      const { purchasePrice } = calculateItemPrices(i);
      const current = ex.purchasePrice || ex.price || 0;
      return Math.abs(current - purchasePrice) >= 1;
    }).map(i => i.id);
    setSelectedItemIds(changedIds);
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

  // Sync a single item
  const handleSyncSingleItem = async (item: NewpipeProductItem) => {
    const { purchasePrice, salePrice } = calculateItemPrices(item);
    const existing = checkExistingProduct(item);

    let categoryToUse = unifiedCategoryName;
    if (autoCreateSubCategories) {
      categoryToUse = `نیوپایپ - ${item.persianCategory}`;
    }

    const desc = `کد نیوپایپ: ${item.code} | سایز: ${item.size}${item.boxCount ? ` | تعداد در جعبه: ${item.boxCount}` : ""}${item.cartonCount ? ` | تعداد در کارتن: ${item.cartonCount}` : ""}${item.rollMeter ? ` | متراژ کلاف: ${item.rollMeter}m` : ""}${item.branchLengthM ? ` | طول شاخه: ${item.branchLengthM}m` : ""}`;
    const unitRatioDirection = getUnitRatioDirection(null, item.unit || existing?.unit || "عدد", item.secondaryUnit);

    try {
      if (existing) {
        await updateProduct(existing.id.toString(), {
          purchasePrice,
          price: salePrice,
          code: item.code,
          unit: item.unit || existing.unit || "عدد",
          secondaryUnit: item.secondaryUnit || existing.secondaryUnit,
          unitRatio: item.unitRatio || existing.unitRatio || 1,
          unitRatioDirection,
          category: categoryToUse || existing.category,
          description: `${existing.description ? existing.description + "\n" : ""}${desc}`
        });
        showNotification(`قیمت و اطلاعات کالای "${item.name}" با موفقیت بروزرسانی شد.`, "success");
      } else {
        await addProduct({
          name: item.name,
          code: item.code,
          barcode: item.code,
          category: categoryToUse,
          type: 'product',
          unit: item.unit || "عدد",
          secondaryUnit: item.secondaryUnit,
          unitRatio: item.unitRatio || 1,
          unitRatioDirection,
          purchasePrice,
          price: salePrice,
          stock: 0,
          minStock: 5,
          isActive: true,
          description: desc
        });
        showNotification(`کالای جدید "${item.name}" با موفقیت در انبار ثبت گردید.`, "success");
      }

      // Refresh product list
      const refreshed = await getProducts();
      setProducts(refreshed);
    } catch (err: any) {
      showNotification("خطا در ثبت کالا: " + (err.message || ""), "error");
    }
  };

  // Batch Sync Selected Items into Database
  const handleSyncSelected = () => {
    const selectedItems = items.filter(i => selectedItemIds.includes(i.id));
    if (selectedItems.length === 0) {
      showNotification("لطفاً حداقل یک کالا را جهت ثبت یا به‌روزرسانی انتخاب کنید.", "warning");
      return;
    }

    const newItemsCount = selectedItems.filter(i => !checkExistingProduct(i)).length;
    const existingItemsCount = selectedItems.length - newItemsCount;

    confirmAction(
      `آیا از ثبت ${toPersianDigits(newItemsCount)} کالای جدید و به‌روزرسانی قیمت ${toPersianDigits(existingItemsCount)} کالای موجود در انبار اطمینان دارید؟`,
      async () => {
        setIsSyncing(true);
        let updatedCount = 0;
        let createdCount = 0;

        try {
          // 1. Ensure target unified category exists
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

          // 2. Process each item sequentially
          for (const item of selectedItems) {
            const { purchasePrice, salePrice } = calculateItemPrices(item);
            const existing = checkExistingProduct(item);

            let categoryToUse = unifiedCategoryName;
            if (autoCreateSubCategories) {
              categoryToUse = `نیوپایپ - ${item.persianCategory}`;
            }

            const desc = `کد نیوپایپ: ${item.code} | سایز: ${item.size}${item.boxCount ? ` | تعداد در جعبه: ${item.boxCount}` : ""}${item.cartonCount ? ` | تعداد در کارتن: ${item.cartonCount}` : ""}${item.rollMeter ? ` | متراژ کلاف: ${item.rollMeter}m` : ""}${item.branchLengthM ? ` | طول شاخه: ${item.branchLengthM}m` : ""}`;
            const unitRatioDirection = getUnitRatioDirection(null, item.unit || existing?.unit || "عدد", item.secondaryUnit);

            if (existing) {
              await updateProduct(existing.id.toString(), {
                purchasePrice: purchasePrice,
                price: salePrice,
                code: item.code,
                unit: item.unit || existing.unit || "عدد",
                secondaryUnit: item.secondaryUnit || existing.secondaryUnit,
                unitRatio: item.unitRatio || existing.unitRatio || 1,
                unitRatioDirection: unitRatioDirection,
                category: categoryToUse || existing.category,
                description: `${existing.description ? existing.description + "\n" : ""}${desc}`
              });
              updatedCount++;
            } else {
              await addProduct({
                name: item.name,
                code: item.code,
                barcode: item.code,
                category: categoryToUse,
                type: 'product',
                unit: item.unit || "عدد",
                secondaryUnit: item.secondaryUnit,
                unitRatio: item.unitRatio || 1,
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
            `عملیات موفق: ${toPersianDigits(createdCount)} کالای جدید ثبت و ${toPersianDigits(updatedCount)} کالا به‌روزرسانی شد.`,
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
          <div className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-700/20">
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>نیوپایپ (فایل اکسل Excel)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-normal bg-white/20 text-white">
              صفحه فعال
            </span>
          </div>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="bg-gradient-to-l from-emerald-800 via-teal-900 to-zinc-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0">
              <FileSpreadsheet className="w-8 h-8 text-emerald-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400 text-zinc-950">
                  اکسل نیوپایپ - Newpipe Excel
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm">
                  خواندن هوشمند ستون‌ها
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/20 text-teal-200 border border-teal-400/30">
                  ثبت کالای جدید و بروزرسانی قیمت
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                ثبت و به‌روزرسانی کالاهای نیوپایپ از فایل اکسل (Excel)
              </h1>
              <p className="text-white/80 text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
                این صفحه بر اساس بارگذاری فایل اکسل کار می‌کند. فایل اکسل تامین‌کننده یا لیست قیمت نیوپایپ را بارگذاری نمایید تا اقلام و قیمت‌ها استخراج شده، با انبار مقایسه شوند و امکان ثبت کالای جدید یا به‌روزرسانی قیمت‌های موجود به صورت تکی یا دسته‌جمعی فراهم گردد.
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
              onClick={handleDownloadSampleExcel}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs flex items-center gap-2 border border-white/20 transition-all shadow-sm"
              title="دانلود فایل نمونه اکسل جهت مشاهده ستون‌ها"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              دانلود قالب اکسل نمونه
            </button>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx,.xls,.csv" 
        className="hidden" 
      />

      {/* Upload Zone & Actions */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`bg-white border-2 border-dashed transition-all rounded-2xl p-6 shadow-sm group relative ${
          items.length === 0 
            ? 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/20' 
            : 'border-slate-200 hover:border-emerald-300'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-5 text-center lg:text-right">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 flex-shrink-0 ${
              uploadedFileName 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-emerald-50 text-emerald-600'
            }`}>
              <FileUp className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <h3 className="font-black text-zinc-900 text-sm md:text-base">
                  {uploadedFileName 
                    ? `فایل بارگذاری‌شده: ${uploadedFileName}` 
                    : "بارگذاری فایل اکسل لیست قیمت نیوپایپ (XLSX / XLS / CSV)"}
                </h3>
                {uploadedFileSize && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    {uploadedFileSize}
                  </span>
                )}
              </div>
              <p className="text-zinc-500 text-xs mt-1 max-w-2xl leading-relaxed">
                {uploadedFileName 
                  ? `تعداد ${toPersianDigits(items.length)} قلم کالا استخراج شده است. می‌توانید فیلتر کنید، درصدها را تغییر دهید و به انبار منتقل نمایید.` 
                  : "فایل اکسل خود را اینجا بکشید و رها کنید یا از دکمه زیر فایل را انتخاب نمایید. ستون‌های کد کالا، نام، قیمت و سایز به صورت خودکار شناسایی می‌شوند."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsingExcel}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-200" />
              {uploadedFileName ? "تغییر و بارگذاری فایل دیگر" : "انتخاب فایل اکسل..."}
            </button>

            {items.length === 0 && (
              <button
                type="button"
                onClick={handleQuickLoadTestData}
                disabled={isParsingExcel}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                title="بارگذاری داده‌های کاتالوگ نیوپایپ جهت تست فوری بدون نیاز به فایل خارجی"
              >
                <Sparkles className="w-4 h-4" />
                بارگذاری سریع نمونه تستی
              </button>
            )}

            {items.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExportCurrentList}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="خروجی اکسل از لیست جاری همراه با محاسبات جدید"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  خروجی اکسل
                </button>
                <button
                  type="button"
                  onClick={handleResetAndClear}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="حذف اطلاعات بارگذاری‌شده و بازگشت به حالت اولیه"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  پاکسازی
                </button>
              </>
            )}
          </div>
        </div>

        {/* Multi-Sheet Tabs if workbook has more than 1 sheet */}
        {sheetNames.length > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="font-bold text-slate-500 flex-shrink-0">انتخاب شیت اکسل:</span>
            {sheetNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleSheetChange(name)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  selectedSheet === name 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty State when no Excel is loaded */}
      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center border border-emerald-100 shadow-inner">
            <FileSpreadsheet className="w-10 h-10" />
          </div>
          
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-black text-zinc-900">
              هیچ کالایی بارگذاری نشده است
            </h3>
            <p className="text-zinc-500 text-xs leading-relaxed">
              بر اساس تنظیمات این صفحه، هیچ کالایی از پیش نمایش داده نمی‌شود. برای شروع، فایل اکسل لیست قیمت نیوپایپ را از بخش بالا بارگذاری کنید تا اقلام استخراج شوند.
            </p>
          </div>

          {/* Guidelines Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-right text-xs pt-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="font-black text-zinc-800 flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>شناسایی هوشمند ستون‌ها</span>
              </div>
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                ستون‌های کد کالا، نام، قیمت، سایز، واحد و بسته‌بندی بر اساس سرستون‌های فارسی یا انگلیسی خودکار تشخیص داده می‌شوند.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="font-black text-zinc-800 flex items-center gap-1.5 text-teal-700">
                <ArrowUpDown className="w-4 h-4" />
                <span>مقایسه قیمت با انبار فعلی</span>
              </div>
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                سیستم کالاهای موجود را شناسایی کرده و درصد افزایش یا کاهش قیمت جدید نسبت به قیمت فعلی را نشان می‌دهد.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="font-black text-zinc-800 flex items-center gap-1.5 text-amber-700">
                <Percent className="w-4 h-4" />
                <span>اعمال تخفیف و سود پیشنهادی</span>
              </div>
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                می‌توانید تخفیف خرید از لیست کارخانه (مثلاً ۱۵٪) و حاشیه سود فروش پیشنهادی را به صورت درصدی تنظیم نمایید.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              بارگذاری فایل اکسل شما
            </button>
            <button
              type="button"
              onClick={handleDownloadSampleExcel}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              دانلود قالب اکسل نمونه
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Pricing Controls & Calculations Settings Bar */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-black text-zinc-800 text-sm">
                    تنظیمات ارزی و فرمول محاسبات قیمت خرید و فروش
                  </h3>
                  <p className="text-zinc-400 text-[11px]">
                    قیمت‌های استخراج‌شده از اکسل با فرمول زیر به قیمت خرید و فروش تبدیل می‌شوند.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Excel Price Unit Toggle */}
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-zinc-600">واحد قیمت در اکسل:</span>
                  <select
                    value={excelPriceUnit}
                    onChange={(e) => setExcelPriceUnit(e.target.value as 'rial' | 'toman')}
                    className="bg-transparent font-bold text-zinc-800 focus:outline-none cursor-pointer"
                  >
                    <option value="rial">ریال (لیست رسمی نیوپایپ)</option>
                    <option value="toman">تومان</option>
                  </select>
                </div>

                {/* Target Currency in Database */}
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs">
                  <span className="font-medium text-zinc-600">واحد پول سیستم:</span>
                  <select
                    value={targetCurrency}
                    onChange={(e) => setTargetCurrency(e.target.value)}
                    className="bg-transparent font-bold text-zinc-800 focus:outline-none cursor-pointer"
                  >
                    <option value="تومان">تومان (پیش‌فرض)</option>
                    <option value="ریال">ریال</option>
                    <option value="دلار">دلار (USD)</option>
                    <option value="یورو">یورو (EUR)</option>
                  </select>
                </div>

                {/* Supplier Purchase Discount % */}
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs" title="تخفیف دریافت شده از کارخانه یا تامین‌کننده">
                  <span className="font-medium text-zinc-600">تخفیف خرید از لیست:</span>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={supplierDiscountPercent}
                    onChange={(e) => setSupplierDiscountPercent(Number(e.target.value) || 0)}
                    className="w-12 text-center bg-white border border-zinc-300 rounded-lg py-0.5 font-bold text-emerald-700 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-zinc-500 font-bold">٪</span>
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
                    className="w-12 text-center bg-white border border-zinc-300 rounded-lg py-0.5 font-bold text-zinc-800 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-zinc-500 font-bold">٪</span>
                </div>

                {/* VAT Toggle */}
                <button
                  type="button"
                  onClick={() => setVatIncludedInExcel(!vatIncludedInExcel)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                    vatIncludedInExcel
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-zinc-100 border-zinc-300 text-zinc-600"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {vatIncludedInExcel ? "با احتساب ۱۰٪ ارزش افزوده" : "بدون ارزش افزوده (خالص)"}
                </button>

                {/* Auto Category Mode */}
                <button
                  type="button"
                  onClick={() => setAutoCreateSubCategories(!autoCreateSubCategories)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                    autoCreateSubCategories
                      ? "bg-teal-50 border-teal-300 text-teal-700"
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
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                <span>تعداد کل اقلام در اکسل: <strong>{toPersianDigits(statusCounts.total)}</strong></span>
                <span>•</span>
                <span>کالای جدید: <strong className="text-blue-700">{toPersianDigits(statusCounts.new)}</strong></span>
                <span>•</span>
                <span>موجود در سیستم: <strong className="text-emerald-700">{toPersianDigits(statusCounts.existingTotal)}</strong></span>
                <span>•</span>
                <span>انتخاب‌شده جهت ثبت: <strong className="text-emerald-800 font-black">{toPersianDigits(selectedItemIds.length)}</strong></span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSyncSelected}
                  disabled={isSyncing || selectedItemIds.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center flex-shrink-0">
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
                type="button"
                onClick={() => setSyncSummary(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-3 py-1 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                بستن
              </button>
            </div>
          )}

          {/* Category Tabs & Filter Toolbar */}
          <div className="space-y-3">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedCategoryTab('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
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
                if (count === 0) return null;
                const isActive = selectedCategoryTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryTab(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-sm'
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
                  placeholder="جستجو در کد، نام، سایز، دسته نیوپایپ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-white text-zinc-900 font-bold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
                  >
                    همه ({toPersianDigits(statusCounts.total)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('new')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'new' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
                  >
                    جدید ({toPersianDigits(statusCounts.new)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('existing_changed')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'existing_changed' ? 'bg-white text-amber-700 font-bold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
                  >
                    تغییر قیمت ({toPersianDigits(statusCounts.existingChanged)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('existing')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'existing' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
                  >
                    موجود در سیستم ({toPersianDigits(statusCounts.existingTotal)})
                  </button>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="انتخاب همه اقلام فیلترشده"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-zinc-600" />
                    انتخاب همه
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllFiltered}
                    className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="عدم انتخاب همه"
                  >
                    <Square className="w-3.5 h-3.5 text-zinc-600" />
                    عدم انتخاب
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectOnlyNew}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="فقط انتخاب کالاهای جدید جهت ثبت"
                  >
                    فقط جدید
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectOnlyChanged}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="فقط انتخاب کالاهای دارای تغییر قیمت"
                  >
                    فقط تغییر قیمت
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
                    <th className="py-3.5 px-4 w-28 text-left">قیمت لیست اکسل</th>
                    <th className="py-3.5 px-4 w-32 text-left">قیمت خرید ({targetCurrency})</th>
                    <th className="py-3.5 px-4 w-32 text-left">فروش پیشنهادی (+{profitMarginPercent}%)</th>
                    <th className="py-3.5 px-4 w-36 text-center">وضعیت انبار و تغییر قیمت</th>
                    <th className="py-3.5 px-4 w-24 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-zinc-400">
                        <Package className="w-10 h-10 mx-auto mb-2 text-zinc-300" />
                        هیچ کالایی با فیلترها و جستجوی مشخص‌شده یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      const existing = checkExistingProduct(item);
                      const { purchasePrice, salePrice, rawListPrice } = calculateItemPrices(item);

                      // Calculate price difference percentage if existing
                      let priceDiffPercent: number | null = null;
                      if (existing) {
                        const currentPurchase = existing.purchasePrice || existing.price || 0;
                        if (currentPurchase > 0) {
                          priceDiffPercent = Math.round(((purchasePrice - currentPurchase) / currentPurchase) * 100);
                        }
                      }

                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-emerald-50/40 transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-50/20' : ''
                          }`}
                          onClick={() => toggleItemSelection(item.id)}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(item.id)}
                              className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          {/* Product Code */}
                          <td className="py-3 px-4 font-mono font-bold text-zinc-700">
                            <div className="flex items-center gap-1.5">
                              <span>{item.code}</span>
                              <button
                                type="button"
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
                              <span className="text-zinc-400">| واحد: {item.unit}</span>
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
                            {!item.rollMeter && !item.branchLengthM && !item.boxCount && !item.cartonCount && (
                              <span className="text-zinc-400">-</span>
                            )}
                          </td>

                          {/* Official List Price in Excel */}
                          <td className="py-3 px-4 text-left font-mono font-medium text-zinc-500">
                            {addCommas(toPersianDigits(rawListPrice))}
                            <span className="text-[10px] mr-1">{excelPriceUnit === 'rial' ? 'ریال' : 'تومان'}</span>
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

                          {/* System Status & Comparison */}
                          <td className="py-3 px-4 text-center">
                            {existing ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  موجود در سیستم
                                </span>
                                {priceDiffPercent !== null && priceDiffPercent !== 0 ? (
                                  <span className={`text-[10px] font-bold mt-1 flex items-center gap-0.5 ${
                                    priceDiffPercent > 0 ? 'text-amber-600' : 'text-teal-600'
                                  }`}>
                                    {priceDiffPercent > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {priceDiffPercent > 0 ? `+${toPersianDigits(priceDiffPercent)}% افزایش` : `${toPersianDigits(priceDiffPercent)}% کاهش`}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-zinc-400 mt-0.5">بدون تغییر قیمت</span>
                                )}
                                {existing.purchasePrice ? (
                                  <span className="text-[9px] text-zinc-400">
                                    خرید قبلی: {addCommas(toPersianDigits(existing.purchasePrice))}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                کالای جدید
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleSyncSingleItem(item)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                existing 
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {existing ? "بروزرسانی" : "ثبت کالا"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
