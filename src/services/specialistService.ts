import { PersonSpecialty, Person } from '../types';
import { getLocalData, saveLocalData } from './coreService';

export const DEFAULT_SPECIALTIES: PersonSpecialty[] = [
  {
    id: "electrician",
    name: "برق‌کار و سیم‌کشی ساختمانی",
    category: "برق و روشنایی",
    icon: "Zap",
    color: "#f59e0b", // Amber
    description: "سیم‌کشی، تابلو برق، نورپردازی، اعلام حریق و آیفون",
    isDefault: true,
  },
  {
    id: "plumbing",
    name: "تأسیسات مکانیکی و لوله‌کشی",
    category: "تأسیسات و آب",
    icon: "Wrench",
    color: "#0284c7", // Sky
    description: "لوله‌کشی آب، شوفاژ، فاضلاب، شیرآلات و پمپ آب",
    isDefault: true,
  },
  {
    id: "mason",
    name: "بنّا و سفت‌کاری ساختمانی",
    category: "ساختمان و سازه",
    icon: "Hammer",
    color: "#b45309", // Warm Brown
    description: "دیوارچینی، بلوک‌کاری، بتن‌ریزی و تخریب و بازسازی",
    isDefault: true,
  },
  {
    id: "painter",
    name: "نقاش، رنگ‌آمیزی و پتینه",
    category: "نازک‌کاری و دکوراسیون",
    icon: "Paintbrush",
    color: "#ec4899", // Pink
    description: "رنگ روغن، پلاستیک، اکرلیک، کناف و پتینه‌کاری",
    isDefault: true,
  },
  {
    id: "welder",
    name: "جوشکار، آهنگر و اسکلت فلزی",
    category: "آهنگری و فلزات",
    icon: "Flame",
    color: "#f97316", // Orange
    description: "ساخت درب و پنجره، نرده، حفاظ و اسکلت سبک",
    isDefault: true,
  },
  {
    id: "carpenter",
    name: "نجار، کابینت‌ساز و دکوراسیون چوبی",
    category: "چوب و ام‌دی‌اف",
    icon: "Axe",
    color: "#84cc16", // Lime
    description: "ساخت و نصب ام‌دی‌اف، کمد دیواری، قرنیز و چوب",
    isDefault: true,
  },
  {
    id: "tiler",
    name: "کاشی‌کار، سرامیک و سنگ‌نما",
    category: "نازک‌کاری و نما",
    icon: "Grid",
    color: "#6366f1", // Indigo
    description: "نصب کاشی و سرامیک پرسلان، سنگ پله و سنگ نما",
    isDefault: true,
  },
  {
    id: "installer",
    name: "نصاب درب، پنجره، کرکره و حفاظ",
    category: "اتصالات و نصب",
    icon: "DoorOpen",
    color: "#14b8a6", // Teal
    description: "نصب درب ضدسرقت، پنجره دوجداره و کرکره برقی",
    isDefault: true,
  },
  {
    id: "plasterer",
    name: "گچ‌کار، سفیدکاری و کناف",
    category: "نازک‌کاری و سقف",
    icon: "Layers",
    color: "#8b5cf6", // Violet
    description: "گچ‌وخاک، سفیدکاری، اجرای سقف کاذب و کناف",
    isDefault: true,
  },
  {
    id: "waterproofing",
    name: "عایق‌کار، قیرگونی و ایزوگام",
    category: "عایق و آب‌بندی",
    icon: "Droplets",
    color: "#06b6d4", // Cyan
    description: "ایزوگام پشت‌بام، سرویس‌ها، استخر و عایق رطوبتی",
    isDefault: true,
  },
  {
    id: "hvac",
    name: "نصاب و سرویس‌کار پکیج و کولر",
    category: "سرمایش و گرمایش",
    icon: "Wind",
    color: "#3b82f6", // Blue
    description: "نصب و راه‌اندازی کولرگازی، چیلر، پکیج و رادیاتور",
    isDefault: true,
  },
  {
    id: "locksmith",
    name: "کلیدساز و قفل‌کار حفاظتی",
    category: "امنیت و قفل",
    icon: "Key",
    color: "#64748b", // Slate
    description: "نصب قفل هوشمند، جک آرام‌بند و سیستم‌های حفاظتی",
    isDefault: true,
  },
];

const STORAGE_KEY = 'taraz_person_specialties_catalog_v1';

/**
 * دریافت لیست کلیه تخصص‌ها
 */
export async function getSpecialties(): Promise<PersonSpecialty[]> {
  try {
    const stored = await getLocalData<PersonSpecialty[]>(STORAGE_KEY, []);
    if (stored && stored.length > 0) {
      return stored;
    }
  } catch (e) {
    console.warn("Could not read stored specialties from local data", e);
  }

  // اگر هنوز ذخیره نشده بود، با پیش‌فرض‌ها ذخیره کن
  try {
    await saveLocalData(STORAGE_KEY, DEFAULT_SPECIALTIES);
  } catch {}
  return DEFAULT_SPECIALTIES;
}

/**
 * ذخیره لیست تخصص‌ها
 */
export async function saveSpecialties(list: PersonSpecialty[]): Promise<void> {
  await saveLocalData(STORAGE_KEY, list);
}

/**
 * افزودن تخصص جدید
 */
export async function addSpecialty(specialty: Omit<PersonSpecialty, 'id'>): Promise<PersonSpecialty> {
  const current = await getSpecialties();
  const id = `spec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newItem: PersonSpecialty = {
    ...specialty,
    id,
    isDefault: false,
  };
  const updated = [newItem, ...current];
  await saveSpecialties(updated);
  return newItem;
}

/**
 * به‌روزرسانی تخصص موجود
 */
export async function updateSpecialty(id: string, updates: Partial<PersonSpecialty>): Promise<PersonSpecialty[]> {
  const current = await getSpecialties();
  const updated = current.map((s) => (s.id === id ? { ...s, ...updates } : s));
  await saveSpecialties(updated);
  return updated;
}

/**
 * حذف تخصص سفارشی
 */
export async function deleteSpecialty(id: string): Promise<PersonSpecialty[]> {
  const current = await getSpecialties();
  const updated = current.filter((s) => s.id !== id);
  await saveSpecialties(updated);
  return updated;
}

/**
 * به‌روزرسانی اطلاعات تخصصی یک شخص
 */
export function updatePersonSpecialistData(
  person: Person,
  data: {
    specialties?: string[];
    availabilityStatus?: 'available' | 'busy' | 'unavailable';
    specialistRating?: number;
    skillNotes?: string;
    dailyWage?: number;
  }
): Person {
  return {
    ...person,
    specialties: data.specialties !== undefined ? data.specialties : person.specialties,
    availabilityStatus: data.availabilityStatus !== undefined ? data.availabilityStatus : person.availabilityStatus,
    specialistRating: data.specialistRating !== undefined ? data.specialistRating : person.specialistRating,
    skillNotes: data.skillNotes !== undefined ? data.skillNotes : person.skillNotes,
    dailyWage: data.dailyWage !== undefined ? data.dailyWage : person.dailyWage,
  };
}
