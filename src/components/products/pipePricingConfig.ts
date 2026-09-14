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
