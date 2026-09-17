import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, Globe, CheckCircle2, AlertCircle, ArrowUpDown, 
  ExternalLink, Layers, Scale, Ruler, Hash, CheckSquare, Square, 
  ArrowRight, ShieldCheck, Tag, PlusCircle, Check, Info, 
  FileText, Sliders, ChevronDown, Clock, Search, Sparkles,
  Coins, DollarSign, ArrowRightLeft, Repeat, Building2, Flame
} from 'lucide-react';
import { Product, ProductCategory } from '../../types';
import { addProduct, updateProduct, getProducts, getProductCategories, addProductCategory } from '../../services/dataService';
import { addCommas, toPersianDigits, formatNumber, getBaseValueInToman } from '../../utils/format';

export type PipeCategoryType = 'sepahan' | 'kecho' | 'copper' | 'galvanized';

export interface PipeCategoryTabConfig {
  id: PipeCategoryType;
  title: string;
  badge: string;
  url: string;
  categoryName: string;
  brand: string;
  defaultMainUnit: string;
  defaultSecondaryUnit: string;
  defaultBasis: 'branch' | 'kg' | 'meter';
  defaultLength: number;
  description: string;
  factoryName: string;
}

export const PIPE_TABS_CONFIG: PipeCategoryTabConfig[] = [
  {
    id: 'sepahan',
    title: 'لوله گاز توکار سپاهان',
    badge: 'گاز خانگی و صنعتی',
    url: 'https://www.markazeahan.com/company/%D9%84%D9%88%D9%84%D9%87-%DA%AF%D8%A7%D8%B2-%D8%AA%D9%88%DA%A9%D8%A7%D8%B1-%D8%B3%D9%BE%D8%A7%D9%87%D8%A7%D9%86/',
    categoryName: 'لوله گاز توکار سپاهان',
    brand: 'گروه صنعتی سپاهان (مانیس گاز)',
    defaultMainUnit: 'شاخه',
    defaultSecondaryUnit: 'متر',
    defaultBasis: 'branch',
    defaultLength: 6,
    description: 'لوله‌های استاندارد گاز توکار و روکار تولیدی شرکت سپاهان با نشان استاندارد ملی ایران و تست هیدرواستاتیک.',
    factoryName: 'کارخانه اصفهان'
  },
  {
    id: 'kecho',
    title: 'لوله گاز توکار کچو',
    badge: 'گاز استاندارد API',
    url: 'https://www.markazeahan.com/company/%D9%84%D9%88%D9%84%D9%87-%DA%AF%D8%A7%D8%B2-%D8%AA%D9%88%DA%A9%D8%A7%D8%B1-%DA%A9%DA%86%D9%88/',
    categoryName: 'لوله گاز توکار کچو',
    brand: 'صنایع فولاد کچو (توکار)',
    defaultMainUnit: 'شاخه',
    defaultSecondaryUnit: 'متر',
    defaultBasis: 'branch',
    defaultLength: 6,
    description: 'لوله‌های گاز خانگی و تجاری تولید گروه صنایع فولاد کچو با تاییدیه نظام مهندسی و شرکت ملی گاز ایران.',
    factoryName: 'کارخانه کچو اصفهان'
  },
  {
    id: 'copper',
    title: 'لوله مسی (کلاف و شاخه)',
    badge: 'برودتی و تاسیساتی',
    url: 'https://www.markazeahan.com/product-category/copper-pipe/',
    categoryName: 'لوله مسی',
    brand: 'مس قائم / باهنر / بابک',
    defaultMainUnit: 'کیلوگرم',
    defaultSecondaryUnit: 'متر',
    defaultBasis: 'kg',
    defaultLength: 50,
    description: 'انواع لوله‌های مسی شاخه و کلاف استاندارد مخصوص تاسیسات برودتی، چیلر، کولرگازی و خطوط تهویه مطبوع.',
    factoryName: 'مس قائم / باهنر'
  },
  {
    id: 'galvanized',
    title: 'لوله گالوانیزه (ضخامت ۲.۵)',
    badge: 'آب‌رسانی و گلخانه‌ای',
    url: 'https://www.markazeahan.com/company/galvanized-pipe-2-5/',
    categoryName: 'لوله گالوانیزه ۲.۵',
    brand: 'گالوانیزه ساوه / سپنتا / تست',
    defaultMainUnit: 'شاخه',
    defaultSecondaryUnit: 'متر',
    defaultBasis: 'branch',
    defaultLength: 6,
    description: 'لوله‌های درزدار فولادی با پوشش گالوانیزه گرم مقاوم در برابر خوردگی جهت مصارف انتقال سیالات، گلخانه و تاسیسات شهری.',
    factoryName: 'کارخانه تهران / ساوه'
  }
];

export interface PipeOnlineItem {
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

export interface OnlinePipePricingProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: ProductCategory[];
  setCategories?: React.Dispatch<React.SetStateAction<ProductCategory[]>>;
  storeSettings?: any;
  showNotification: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  confirmAction?: (message: string, onConfirm: () => Promise<void> | void, details?: string) => void;
  setActiveTab?: (tab: string) => void;
}

export interface CurrencyPreset {
  id: string;
  name: string;
  symbol: string;
  type: 'base' | 'multiplier' | 'divisor';
  defaultRate: number;
  description: string;
}

export const CURRENCY_PRESETS: CurrencyPreset[] = [
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

export const UNIT_PRESETS = [
  {
    id: "branch_meter",
    title: "شاخه (اصلی) / متر (فرعی)",
    mainUnit: "شاخه",
    secondaryUnit: "متر",
    basis: "branch" as const,
    description: "هر شاخه ۶ متر طول (ضریب: ۶)"
  },
  {
    id: "meter_branch",
    title: "متر (اصلی) / شاخه (فرعی)",
    mainUnit: "متر",
    secondaryUnit: "شاخه",
    basis: "meter" as const,
    description: "قیمت‌گذاری بر مبنای متر، هر ۱ شاخه = ۶ متر"
  },
  {
    id: "branch_kg",
    title: "شاخه (اصلی) / کیلوگرم (فرعی)",
    mainUnit: "شاخه",
    secondaryUnit: "کیلوگرم",
    basis: "branch" as const,
    description: "هر شاخه بر مبنای وزن استاندارد جدول (ضریب = وزن شاخه)"
  },
  {
    id: "kg_branch",
    title: "کیلوگرم (اصلی) / شاخه (فرعی)",
    mainUnit: "کیلوگرم",
    secondaryUnit: "شاخه",
    basis: "kg" as const,
    description: "قیمت‌گذاری بر مبنای کیلو، هر ۱ شاخه = وزن شاخه"
  },
  {
    id: "kg_meter",
    title: "کیلوگرم (اصلی) / متر (فرعی)",
    mainUnit: "کیلوگرم",
    secondaryUnit: "متر",
    basis: "kg" as const,
    description: "مناسب لوله مسی و کلاف متری"
  },
  {
    id: "single_branch",
    title: "تک‌واحدی: فقط شاخه",
    mainUnit: "شاخه",
    secondaryUnit: "ندارد",
    basis: "branch" as const,
    description: "بدون واحد فرعی (یکای ساده شاخه)"
  }
];

export const DEFAULT_FALLBACK_PIPES: Record<PipeCategoryType, PipeOnlineItem[]> = {
  sepahan: [
    {
      id: "sepahan_0",
      diameterInch: "1/2",
      thicknessMm: 2.8,
      diameterMm: 21.3,
      lengthM: 6,
      weightPerBranchKg: 7.68,
      location: "کارخانه اصفهان",
      pricePerKg: 160500,
      pricePerBranch: 1232640,
      pricePerMeter: 205440,
      name: "لوله گاز توکار سپاهان ۱/۲ اینچ ضخامت ۲.۸ میل",
      brand: "سپاهان (توکار مانیس گاز)",
      defaultCategory: "لوله گاز توکار سپاهان",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 7.68,
      unitRatioMeter: 6
    },
    {
      id: "sepahan_1",
      diameterInch: "3/4",
      thicknessMm: 2.9,
      diameterMm: 26.7,
      lengthM: 6,
      weightPerBranchKg: 10.2,
      location: "کارخانه اصفهان",
      pricePerKg: 160500,
      pricePerBranch: 1637100,
      pricePerMeter: 272850,
      name: "لوله گاز توکار سپاهان ۳/۴ اینچ ضخامت ۲.۹ میل",
      brand: "سپاهان (توکار مانیس گاز)",
      defaultCategory: "لوله گاز توکار سپاهان",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 10.2,
      unitRatioMeter: 6
    },
    {
      id: "sepahan_2",
      diameterInch: "1",
      thicknessMm: 3.4,
      diameterMm: 33.4,
      lengthM: 6,
      weightPerBranchKg: 15.06,
      location: "کارخانه اصفهان",
      pricePerKg: 166500,
      pricePerBranch: 2507490,
      pricePerMeter: 417915,
      name: "لوله گاز توکار سپاهان ۱ اینچ ضخامت ۳.۴ میل",
      brand: "سپاهان (توکار مانیس گاز)",
      defaultCategory: "لوله گاز توکار سپاهان",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 15.06,
      unitRatioMeter: 6
    },
    {
      id: "sepahan_3",
      diameterInch: "1 1/4",
      thicknessMm: 3.6,
      diameterMm: 42.2,
      lengthM: 6,
      weightPerBranchKg: 20.58,
      location: "کارخانه اصفهان",
      pricePerKg: 160500,
      pricePerBranch: 3303090,
      pricePerMeter: 550515,
      name: "لوله گاز توکار سپاهان ۱ ۱/۴ اینچ ضخامت ۳.۶ میل",
      brand: "سپاهان (توکار مانیس گاز)",
      defaultCategory: "لوله گاز توکار سپاهان",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 20.58,
      unitRatioMeter: 6
    },
    {
      id: "sepahan_4",
      diameterInch: "1 1/2",
      thicknessMm: 3.7,
      diameterMm: 48.3,
      lengthM: 6,
      weightPerBranchKg: 24.42,
      location: "کارخانه اصفهان",
      pricePerKg: 160500,
      pricePerBranch: 3919410,
      pricePerMeter: 653235,
      name: "لوله گاز توکار سپاهان ۱ ۱/۲ اینچ ضخامت ۳.۷ میل",
      brand: "سپاهان (توکار مانیس گاز)",
      defaultCategory: "لوله گاز توکار سپاهان",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 24.42,
      unitRatioMeter: 6
    },
    {
      id: "sepahan_5",
      diameterInch: "2",
      thicknessMm: 3.9,
      diameterMm: 60.3,
      lengthM: 6,
      weightPerBranchKg: 32.52,
      location: "کارخانه اصفهان",
      pricePerKg: 160500,
      pricePerBranch: 5219460,
      pricePerMeter: 869910,
      name: "لوله گاز توکار سپاهان ۲ اینچ ضخامت ۳.۹ میل",
      brand: "سپاهان (توکار مانیس گاز)",
      defaultCategory: "لوله گاز توکار سپاهان",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 32.52,
      unitRatioMeter: 6
    }
  ],
  kecho: [
    {
      id: "kecho_0",
      diameterInch: "1/2",
      thicknessMm: 2.8,
      diameterMm: 21.3,
      lengthM: 6,
      weightPerBranchKg: 8.78,
      location: "کارخانه کچو اصفهان",
      pricePerKg: 147273,
      pricePerBranch: 1293057,
      pricePerMeter: 215510,
      name: "لوله گاز توکار کچو ۱/۲ اینچ ضخامت ۲.۸ میل",
      brand: "کچو (توکار)",
      defaultCategory: "لوله گاز توکار کچو",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 8.78,
      unitRatioMeter: 6
    },
    {
      id: "kecho_1",
      diameterInch: "3/4",
      thicknessMm: 2.9,
      diameterMm: 26.7,
      lengthM: 6,
      weightPerBranchKg: 9.5,
      location: "کارخانه کچو اصفهان",
      pricePerKg: 147273,
      pricePerBranch: 1399094,
      pricePerMeter: 233182,
      name: "لوله گاز توکار کچو ۳/۴ اینچ ضخامت ۲.۹ میل",
      brand: "کچو (توکار)",
      defaultCategory: "لوله گاز توکار کچو",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 9.5,
      unitRatioMeter: 6
    },
    {
      id: "kecho_2",
      diameterInch: "1",
      thicknessMm: 3.4,
      diameterMm: 33.4,
      lengthM: 6,
      weightPerBranchKg: 15.7,
      location: "کارخانه کچو اصفهان",
      pricePerKg: 147273,
      pricePerBranch: 2312186,
      pricePerMeter: 385364,
      name: "لوله گاز توکار کچو ۱ اینچ ضخامت ۳.۴ میل",
      brand: "کچو (توکار)",
      defaultCategory: "لوله گاز توکار کچو",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 15.7,
      unitRatioMeter: 6
    },
    {
      id: "kecho_3",
      diameterInch: "1 1/4",
      thicknessMm: 3.6,
      diameterMm: 42.2,
      lengthM: 6,
      weightPerBranchKg: 21.2,
      location: "کارخانه کچو اصفهان",
      pricePerKg: 147273,
      pricePerBranch: 3122188,
      pricePerMeter: 520365,
      name: "لوله گاز توکار کچو ۱ ۱/۴ اینچ ضخامت ۳.۶ میل",
      brand: "کچو (توکار)",
      defaultCategory: "لوله گاز توکار کچو",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 21.2,
      unitRatioMeter: 6
    },
    {
      id: "kecho_4",
      diameterInch: "1 1/2",
      thicknessMm: 3.7,
      diameterMm: 48.3,
      lengthM: 6,
      weightPerBranchKg: 25.1,
      location: "کارخانه کچو اصفهان",
      pricePerKg: 147273,
      pricePerBranch: 3696552,
      pricePerMeter: 616092,
      name: "لوله گاز توکار کچو ۱ ۱/۲ اینچ ضخامت ۳.۷ میل",
      brand: "کچو (توکار)",
      defaultCategory: "لوله گاز توکار کچو",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 25.1,
      unitRatioMeter: 6
    },
    {
      id: "kecho_5",
      diameterInch: "2",
      thicknessMm: 3.9,
      diameterMm: 60.3,
      lengthM: 6,
      weightPerBranchKg: 33.2,
      location: "کارخانه کچو اصفهان",
      pricePerKg: 147273,
      pricePerBranch: 4889464,
      pricePerMeter: 814911,
      name: "لوله گاز توکار کچو ۲ اینچ ضخامت ۳.۹ میل",
      brand: "کچو (توکار)",
      defaultCategory: "لوله گاز توکار کچو",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 33.2,
      unitRatioMeter: 6
    }
  ],
  copper: [
    {
      id: "copper_0",
      diameterInch: "1/4",
      thicknessMm: 0.8,
      diameterMm: 6.65,
      lengthM: 50,
      weightPerBranchKg: 6.57,
      location: "کارخانه مس قائم",
      pricePerKg: 3000000,
      pricePerBranch: 19710000,
      pricePerMeter: 394200,
      name: "لوله مسی سایز ۱/۴ اینچ (قطر 6.65mm ضخامت 0.8mm کلاف 50m)",
      brand: "مس قائم / باهنر",
      defaultCategory: "لوله مسی",
      mainUnit: "کیلوگرم",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 6.57,
      unitRatioMeter: 50
    },
    {
      id: "copper_1",
      diameterInch: "1/2",
      thicknessMm: 0.7,
      diameterMm: 12.7,
      lengthM: 50,
      weightPerBranchKg: 11.8,
      location: "کارخانه مس قائم",
      pricePerKg: 3000000,
      pricePerBranch: 35400000,
      pricePerMeter: 708000,
      name: "لوله مسی سایز ۱/۲ اینچ (قطر 12.7mm ضخامت 0.7mm کلاف 50m)",
      brand: "مس قائم / باهنر",
      defaultCategory: "لوله مسی",
      mainUnit: "کیلوگرم",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 11.8,
      unitRatioMeter: 50
    },
    {
      id: "copper_2",
      diameterInch: "3/4",
      thicknessMm: 0.7,
      diameterMm: 19.05,
      lengthM: 50,
      weightPerBranchKg: 18.04,
      location: "کارخانه مس قائم",
      pricePerKg: 3000000,
      pricePerBranch: 54120000,
      pricePerMeter: 1082400,
      name: "لوله مسی سایز ۳/۴ اینچ (قطر 19.05mm ضخامت 0.7mm کلاف 50m)",
      brand: "مس قائم / باهنر",
      defaultCategory: "لوله مسی",
      mainUnit: "کیلوگرم",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 18.04,
      unitRatioMeter: 50
    },
    {
      id: "copper_3",
      diameterInch: "1",
      thicknessMm: 0.7,
      diameterMm: 33.4,
      lengthM: 50,
      weightPerBranchKg: 32.14,
      location: "کارخانه مس قائم",
      pricePerKg: 3000000,
      pricePerBranch: 96420000,
      pricePerMeter: 1928400,
      name: "لوله مسی سایز ۱ اینچ (قطر 33.4mm ضخامت 0.7mm کلاف 50m)",
      brand: "مس قائم / باهنر",
      defaultCategory: "لوله مسی",
      mainUnit: "کیلوگرم",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 32.14,
      unitRatioMeter: 50
    }
  ],
  galvanized: [
    {
      id: "galv_0",
      diameterInch: "2 1/2",
      thicknessMm: 2.5,
      diameterMm: 76.1,
      lengthM: 6,
      weightPerBranchKg: 28.5,
      location: "کارخانه تهران",
      pricePerKg: 177273,
      pricePerBranch: 5052281,
      pricePerMeter: 842047,
      name: "لوله گالوانیزه ۲ ۱/۲ اینچ ضخامت ۲.۵ میل (قطر 76.1mm)",
      brand: "گالوانیزه صنعتی / تست",
      defaultCategory: "لوله گالوانیزه ۲.۵",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 28.5,
      unitRatioMeter: 6
    },
    {
      id: "galv_1",
      diameterInch: "3 1/2",
      thicknessMm: 2.5,
      diameterMm: 101.6,
      lengthM: 6,
      weightPerBranchKg: 39.2,
      location: "کارخانه تهران",
      pricePerKg: 177273,
      pricePerBranch: 6949102,
      pricePerMeter: 1158184,
      name: "لوله گالوانیزه ۳ ۱/۲ اینچ ضخامت ۲.۵ میل (قطر 101.6mm)",
      brand: "گالوانیزه صنعتی / تست",
      defaultCategory: "لوله گالوانیزه ۲.۵",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 39.2,
      unitRatioMeter: 6
    },
    {
      id: "galv_2",
      diameterInch: "4",
      thicknessMm: 2.5,
      diameterMm: 114.3,
      lengthM: 6,
      weightPerBranchKg: 43.5,
      location: "کارخانه تهران",
      pricePerKg: 177273,
      pricePerBranch: 7711376,
      pricePerMeter: 1285229,
      name: "لوله گالوانیزه ۴ اینچ ضخامت ۲.۵ میل (قطر 114.3mm)",
      brand: "گالوانیزه صنعتی / تست",
      defaultCategory: "لوله گالوانیزه ۲.۵",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 43.5,
      unitRatioMeter: 6
    },
    {
      id: "galv_3",
      diameterInch: "5",
      thicknessMm: 2.5,
      diameterMm: 141.3,
      lengthM: 6,
      weightPerBranchKg: 53.6,
      location: "کارخانه تهران",
      pricePerKg: 177273,
      pricePerBranch: 9501833,
      pricePerMeter: 1583639,
      name: "لوله گالوانیزه ۵ اینچ ضخامت ۲.۵ میل (قطر 141.3mm)",
      brand: "گالوانیزه صنعتی / تست",
      defaultCategory: "لوله گالوانیزه ۲.۵",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 53.6,
      unitRatioMeter: 6
    },
    {
      id: "galv_4",
      diameterInch: "6",
      thicknessMm: 2.5,
      diameterMm: 168.3,
      lengthM: 6,
      weightPerBranchKg: 64.0,
      location: "کارخانه تهران",
      pricePerKg: 177273,
      pricePerBranch: 11345472,
      pricePerMeter: 1890912,
      name: "لوله گالوانیزه ۶ اینچ ضخامت ۲.۵ میل (قطر 168.3mm)",
      brand: "گالوانیزه صنعتی / تست",
      defaultCategory: "لوله گالوانیزه ۲.۵",
      mainUnit: "شاخه",
      secondaryUnitWeight: "کیلوگرم",
      secondaryUnitMeter: "متر",
      unitRatioWeight: 64.0,
      unitRatioMeter: 6
    }
  ]
};
