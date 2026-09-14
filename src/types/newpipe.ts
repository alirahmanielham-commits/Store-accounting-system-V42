export type NewpipeCategory = 
  | 'pipe'
  | 'press'
  | 'coupeli'
  | 'threaded'
  | 'clamp'
  | 'collector'
  | 'valve'
  | 'metal_fitting'
  | 'polymer_fitting'
  | 'insulation_tools';

export interface NewpipeProductItem {
  id: string;
  code: string;
  name: string;
  persianCategory: string;
  categoryType: NewpipeCategory;
  subCategory?: string;
  size: string;
  boxCount?: number;
  cartonCount?: number;
  rollMeter?: number;
  branchLengthM?: number;
  unit: string;
  secondaryUnit?: string;
  unitRatio?: number;
  priceRial: number;
  priceToman: number;
  pageNumber?: number;
  hasVatIncluded?: boolean;
}

export interface NewpipeCategoryMeta {
  id: NewpipeCategory;
  title: string;
  badge: string;
  color: string;
}

export const NEWPIPE_CATEGORIES_META: NewpipeCategoryMeta[] = [
  { id: 'pipe', title: 'لوله‌های پنج لایه', badge: 'PEX و PERT', color: 'indigo' },
  { id: 'press', title: 'اتصالات پرسی', badge: 'پرس هیدرولیک', color: 'blue' },
  { id: 'coupeli', title: 'اتصالات کوپلی', badge: 'مهره ماسوره‌ای', color: 'amber' },
  { id: 'threaded', title: 'اتصالات رزوه‌ای', badge: 'دنده‌ای برنجی', color: 'emerald' },
  { id: 'clamp', title: 'اتصالات کلمپی', badge: 'سایز بالا', color: 'purple' },
  { id: 'collector', title: 'کلکتور و نیوکلکتور', badge: 'فلومتر و ترموستاتیک', color: 'rose' },
  { id: 'valve', title: 'شیرآلات تاسیساتی', badge: 'پروانه‌ای، گازی، پیسوار', color: 'cyan' },
  { id: 'metal_fitting', title: 'ملزومات فلزی', badge: 'جعبه، صفحه نصب، پایه', color: 'slate' },
  { id: 'polymer_fitting', title: 'ملزومات پلیمری و یدکی', badge: 'درپوش، بست، اورینگ', color: 'teal' },
  { id: 'insulation_tools', title: 'عایق، فوم و ملزومات', badge: 'فوم EPE، چسب، ترموستات', color: 'orange' },
];
