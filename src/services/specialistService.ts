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

const STORAGE_KEY = 'person_specialties';
const LEGACY_STORAGE_KEY = 'taraz_person_specialties_catalog_v1';

let memorySpecialtiesCache: PersonSpecialty[] | null = null;

const readFromLocalStorage = (): PersonSpecialty[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Error reading specialties from localStorage", e);
  }
  return [];
};

const writeToLocalStorage = (list: PersonSpecialty[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Error saving specialties to localStorage", e);
  }
};

/**
 * ادغام تخصص‌های پیش‌فرض با تخصص‌های ذخیره‌شده یا سفارشی
 */
export function mergeSpecialties(stored: PersonSpecialty[]): PersonSpecialty[] {
  const map = new Map<string, PersonSpecialty>();

  // ۱. اضافه کردن پیش‌فرض‌ها
  DEFAULT_SPECIALTIES.forEach((s) => map.set(s.id, { ...s, isDefault: true }));

  // ۲. اعمال تخصص‌های ذخیره‌شده / سفارشی
  (stored || []).forEach((s) => {
    if (s && s.id) {
      const existing = map.get(s.id);
      const cleanName = s.name && s.name.trim() ? s.name.trim() : (existing?.name || s.id);
      map.set(s.id, {
        icon: "Wrench",
        color: "#6366f1",
        category: "ساختمانی و فنی",
        ...(existing || {}),
        ...s,
        id: s.id,
        name: cleanName,
        isDefault: existing ? existing.isDefault : false,
      });
    }
  });

  return Array.from(map.values());
}

/**
 * دریافت لیست کلیه تخصص‌ها (از کش حافظه، localStorage و سرور)
 */
export async function getSpecialties(): Promise<PersonSpecialty[]> {
  const localItems = readFromLocalStorage();

  try {
    const serverItems = await getLocalData<PersonSpecialty[]>(STORAGE_KEY, []);
    const combinedSource = [
      ...(Array.isArray(serverItems) ? serverItems : []),
      ...localItems,
    ];

    const merged = mergeSpecialties(combinedSource);
    memorySpecialtiesCache = merged;
    writeToLocalStorage(merged);
    return merged;
  } catch (e) {
    console.warn("Could not read stored specialties from server, using local fallback", e);
  }

  const fallbackMerged = mergeSpecialties(localItems);
  memorySpecialtiesCache = fallbackMerged;
  return fallbackMerged;
}

/**
 * ذخیره لیست کامل تخصص‌ها
 */
export async function saveSpecialties(list: PersonSpecialty[]): Promise<void> {
  const merged = mergeSpecialties(list);
  memorySpecialtiesCache = merged;
  writeToLocalStorage(merged);

  try {
    await saveLocalData(STORAGE_KEY, merged);
  } catch (e) {
    console.warn("Could not save specialties to server, saved to localStorage", e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('specialties_catalog_changed', { detail: merged }));
    window.dispatchEvent(new CustomEvent('app_data_changed', { detail: { key: STORAGE_KEY } }));
  }
}

/**
 * افزودن تخصص جدید
 */
export async function addSpecialty(specialty: Omit<PersonSpecialty, 'id'>): Promise<PersonSpecialty> {
  const current = await getSpecialties();
  const id = `spec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cleanName = (specialty.name || "").trim() || "تخصص جدید";
  
  const newItem: PersonSpecialty = {
    ...specialty,
    name: cleanName,
    id,
    isDefault: false,
  };

  const updated = [newItem, ...current.filter(s => s.id !== id)];
  await saveSpecialties(updated);
  return newItem;
}

/**
 * به‌روزرسانی تخصص موجود (از جمله تغییر نام)
 */
export async function updateSpecialty(id: string, updates: Partial<PersonSpecialty>): Promise<PersonSpecialty[]> {
  const current = await getSpecialties();
  const updated = current.map((s) => {
    if (s.id === id) {
      const cleanName = updates.name !== undefined ? (updates.name.trim() || s.name) : s.name;
      return { ...s, ...updates, name: cleanName };
    }
    return s;
  });
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
 * بازیابی شیء تخصص بر اساس شناسه به همراه فال‌بک هوشمند
 */
export function getSpecialtyById(id: string, catalog?: PersonSpecialty[]): PersonSpecialty {
  const list = catalog || memorySpecialtiesCache || readFromLocalStorage() || DEFAULT_SPECIALTIES;
  const found = list.find((s) => s.id === id);
  if (found && found.name && found.name.trim() && found.name !== id) {
    return found;
  }

  const defFound = DEFAULT_SPECIALTIES.find((s) => s.id === id);
  if (defFound) {
    return defFound;
  }

  // اگر شناسه به فرمت spec_ باشد و هنوز عنوانی برای آن پیدا نشده باشد:
  return {
    id,
    name: `تخصص سفارشی (${id.substring(0, 12)}...)`,
    category: "ساختمانی و فنی",
    icon: "Hammer",
    color: "#6366f1",
    isDefault: false,
  };
}

/**
 * بازیابی نام تخصص جهت نمایش زیبا به کاربر
 */
export function getSpecialtyName(id: string, catalog?: PersonSpecialty[]): string {
  const spec = getSpecialtyById(id, catalog);
  return spec.name;
}

/**
 * خودکارساز ثبت تخصص‌های گم‌شده اشخاص در کاتالوگ با عنوان پیش‌فرض قابل ویرایش
 */
export async function ensureSpecialtiesExist(ids: string[]): Promise<PersonSpecialty[]> {
  if (!ids || ids.length === 0) return await getSpecialties();
  const current = await getSpecialties();
  let hasMissing = false;
  const updated = [...current];

  for (const id of ids) {
    if (!id || typeof id !== 'string') continue;
    const exists = updated.some((s) => s.id === id);
    if (!exists) {
      hasMissing = true;
      updated.push({
        id,
        name: `تخصص جدید (${id.substring(0, 8)})`,
        category: "مهارت‌های فنی",
        icon: "Hammer",
        color: "#6366f1",
        isDefault: false,
      });
    }
  }

  if (hasMissing) {
    await saveSpecialties(updated);
  }
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

