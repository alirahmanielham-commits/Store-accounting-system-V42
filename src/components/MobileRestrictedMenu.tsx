import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { hasPagePermission } from "../utils/permissionUtils";
import {
  Receipt,
  BookOpen,
  ShoppingBag,
  Users,
  Coins,
  ChevronUp,
  X,
  Plus,
  Package,
  UserCircle,
  FileSpreadsheet,
  AlertCircle,
  ListOrdered,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Zap,
  UserPlus,
  Check,
} from "lucide-react";

export interface MobileRestrictedMenuProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setIsPersonModalOpen?: (isOpen: boolean) => void;
  setIsProductModalOpen?: (isOpen: boolean) => void;
}

export interface MobileCategory {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultTab: string;
  color: string;
  activeColor: string;
  subItems: {
    id: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
    badge?: string;
  }[];
}

export const MOBILE_CATEGORIES: MobileCategory[] = [
  {
    id: "receipts_payments",
    title: "دریافت و پرداخت",
    shortTitle: "دریافت/پرداخت",
    icon: Receipt,
    defaultTab: "create_receive_receipt",
    color: "teal",
    activeColor: "bg-teal-600 text-white",
    subItems: [
      {
        id: "keyboard_receipt",
        title: "ثبت سریع رسید با کیبورد",
        icon: Zap,
        badge: "کیبورد",
        description: "ثبت مرحله‌ای و سریع دریافت و پرداخت بدون نیاز به ماوس",
      },
      {
        id: "create_receive_receipt",
        title: "ثبت رسید دریافت وجه",
        icon: ArrowDownLeft,
        badge: "ورودی",
        description: "ثبت واریز نقدی، پوز و چک به صندوق یا حساب بانکی",
      },
      {
        id: "create_pay_receipt",
        title: "ثبت رسید پرداخت وجه",
        icon: ArrowUpRight,
        badge: "خروجی",
        description: "ثبت پرداخت نقدی، کارتخوان یا حواله به طرف‌حساب",
      },
      {
        id: "list_receive_receipt",
        title: "لیست رسیدهای دریافت",
        icon: ListOrdered,
        description: "مشاهده، جستجو و وضعیت کلیه دریافت‌های ثبت شده",
      },
      {
        id: "list_pay_receipt",
        title: "لیست رسیدهای پرداخت",
        icon: ListOrdered,
        description: "مشاهده، جستجو و وضعیت پرداخت‌های ثبت شده",
      },
    ],
  },
  {
    id: "checks",
    title: "ثبت و کارتابل چک‌ها",
    shortTitle: "مدیریت چک",
    icon: BookOpen,
    defaultTab: "receive_check_form",
    color: "sky",
    activeColor: "bg-sky-600 text-white",
    subItems: [
      {
        id: "receive_check_form",
        title: "ثبت چک دریافتی جدید",
        icon: Plus,
        badge: "جدید",
        description: "ثبت برگه چک صیادی جدید دریافتی از مشتری",
      },
      {
        id: "received_checks_page",
        title: "کارتابل چک‌های دریافتی",
        icon: BookOpen,
        description: "پیگیری وضعیت، وصول، استرداد و خرج چک‌های دریافتی",
      },
      {
        id: "issue_check_form",
        title: "صدور چک پرداختی جدید",
        icon: Plus,
        badge: "صدور",
        description: "ثبت و صدور برگه چک جدید از دسته‌چک‌های بانکی",
      },
      {
        id: "issued_checks_page",
        title: "کارتابل چک‌های پرداختی",
        icon: BookOpen,
        description: "مدیریت چک‌های صادره، پاس شده و موعد پرداخت",
      },
      {
        id: "check_panel",
        title: "میزکار و داشبورد جامع چک‌ها",
        icon: Sparkles,
        description: "داشبورد آماری سررسیدها، وصولی‌ها و هشدارهای چک",
      },
    ],
  },
  {
    id: "invoices_products",
    title: "فاکتورها و کالاها",
    shortTitle: "فاکتور و کالا",
    icon: ShoppingBag,
    defaultTab: "create_sale",
    color: "emerald",
    activeColor: "bg-emerald-600 text-white",
    subItems: [
      {
        id: "create_sale",
        title: "ثبت فاکتور فروش کالا",
        icon: Plus,
        badge: "فروش",
        description: "صدور سریع فاکتور فروش نقدی یا نسیه با چاپ فاکتور",
      },
      {
        id: "create_purchase",
        title: "ثبت فاکتور خرید جدید",
        icon: Plus,
        badge: "خرید",
        description: "ثبت فاکتور خرید و افزایش خودکار موجودی انبار",
      },
      {
        id: "products",
        title: "بانک و مدیریت کالا و خدمات",
        icon: Package,
        badge: "کالاها",
        description: "تعریف کالای جدید، قیمت‌گذاری و کنترل موجودی",
      },
      {
        id: "list_sale",
        title: "لیست فاکتورهای فروش",
        icon: ListOrdered,
        description: "مشاهده، جستجو و چاپ مجدد فاکتورهای فروش صادر شده",
      },
      {
        id: "list_purchase",
        title: "لیست فاکتورهای خرید",
        icon: ListOrdered,
        description: "مشاهده و جستجوی فاکتورهای خرید ثبت شده در انبار",
      },
    ],
  },
  {
    id: "persons_ledger",
    title: "اشخاص و طرف‌حساب‌ها",
    shortTitle: "شخص و حساب",
    icon: Users,
    defaultTab: "persons",
    color: "purple",
    activeColor: "bg-purple-600 text-white",
    subItems: [
      {
        id: "create_person",
        title: "ثبت شخص جدید (مخصوص موبایل)",
        icon: UserPlus,
        badge: "موبایل",
        description: "فرم لمسی و ارگونومیک ثبت سریع شخص با انگشت شست",
      },
      {
        id: "persons",
        title: "بانک و مدیریت جامع اشخاص",
        icon: Users,
        badge: "اشخاص",
        description: "فهرست کامل مشتریان، تامین‌کنندگان و همکاران",
      },
      {
        id: "person_ledger",
        title: "کارت حساب و معین اشخاص",
        icon: FileSpreadsheet,
        badge: "معین",
        description: "ریز گردش تراکنش‌ها، مانده بدهی و طلب و چاپ صورت‌حساب",
      },
      {
        id: "person_profile",
        title: "پرونده و پروفایل جامع شخص",
        icon: UserCircle,
        description: "سوابق فاکتورها، چک‌ها، اسناد و تعهدات شخص",
      },
    ],
  },
  {
    id: "debtors_creditors",
    title: "بدهکاران و بستانکاران",
    shortTitle: "بدهکار/بستانکار",
    icon: Coins,
    defaultTab: "debts_credits",
    color: "rose",
    activeColor: "bg-rose-600 text-white",
    subItems: [
      {
        id: "debts_credits",
        title: "تراز بدهکاران و بستانکاران",
        icon: Coins,
        badge: "گزارش",
        description: "صورت مانده بدهی و طلب تمام طرف‌حساب‌ها با فیلتر",
      },
      {
        id: "debtors_showcase",
        title: "ویترین مطالبات و معوقات",
        icon: AlertCircle,
        badge: "معوقات",
        description: "رصد و پیگیری مشتریان دارای مطالبات معوق و سررسید گذشته",
      },
    ],
  },
];

export const MOBILE_ALLOWED_TABS = new Set(
  MOBILE_CATEGORIES.flatMap((c) => c.subItems.map((s) => s.id)).concat([
    "create_person",
    "quick_receive_payment",
    "receive_payment",
    "receipts",
    "create_receive_check",
    "pay_check_form",
    "create_pay_check",
    "checks",
    "quick_price_inquiry",
    "product_view",
    "product_card",
    "sales_report",
    "purchases_report",
    "create_sale_return",
    "create_purchase_return",
    "person_ledger",
    "person_profile",
    "debtors_showcase",
    "debtors_tracking",
  ])
);

export default function MobileRestrictedMenu({
  activeTab,
  setActiveTab,
}: MobileRestrictedMenuProps) {
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { user } = useAuth();

  // Filter categories and subItems by user permissions
  const permittedCategories = useMemo(() => {
    return MOBILE_CATEGORIES.map((cat) => ({
      ...cat,
      subItems: cat.subItems.filter((sub) => hasPagePermission(user, sub.id)),
    })).filter((cat) => cat.subItems.length > 0);
  }, [user]);

  // Find active category
  const activeCategory = useMemo(() => {
    if (permittedCategories.length === 0) return null;
    return (
      permittedCategories.find((cat) =>
        cat.subItems.some((sub) => sub.id === activeTab)
      ) || permittedCategories[0]
    );
  }, [activeTab, permittedCategories]);

  const displayedCategory = useMemo(() => {
    if (!activeCategory) return null;
    if (selectedCategoryId) {
      return (
        permittedCategories.find((c) => c.id === selectedCategoryId) || activeCategory
      );
    }
    return activeCategory;
  }, [selectedCategoryId, activeCategory, permittedCategories]);

  if (!activeCategory || permittedCategories.length === 0) {
    return null;
  }

  return (
    <div className="block md:hidden select-none w-full print:hidden font-sans" dir="rtl">
      {/* Quick Sub-Actions Bar (Generous touch target height: h-13 / 52px) */}
      <div className="fixed bottom-[72px] inset-x-0 h-13 z-[79] px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
        <div className="text-xs font-black text-slate-500 dark:text-slate-400 shrink-0 pl-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>{activeCategory.shortTitle}:</span>
        </div>

        {activeCategory.subItems.map((sub) => {
          const isCurrentTab = activeTab === sub.id;
          const SubIcon = sub.icon;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setActiveTab(sub.id)}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[42px] rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs ${
                isCurrentTab
                  ? `${activeCategory.activeColor} shadow-md ring-2 ring-black/10 dark:ring-white/20 scale-100`
                  : "bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700"
              }`}
            >
              <SubIcon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{sub.title}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setSelectedCategoryId(activeCategory.id);
            setIsCategorySheetOpen(true);
          }}
          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0 mr-auto flex items-center gap-1.5 text-xs font-black border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-2xs cursor-pointer touch-manipulation"
          title="مشاهده تمام گزینه‌ها"
        >
          <ChevronUp className="w-4 h-4" />
          <span>بیشتر</span>
        </button>
      </div>

      {/* Main Mobile Bottom Navigation Bar (Generous 72px height + pb-safe with 48px+ touch targets) */}
      <div className="fixed bottom-0 inset-x-0 h-[72px] z-[80] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-6px_24px_rgba(0,0,0,0.08)] pb-safe">
        <div className="flex justify-around items-center h-full px-1.5">
          {permittedCategories.map((cat) => {
            const isCategoryActive = activeCategory.id === cat.id;
            const IconComponent = cat.icon;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (activeCategory.id === cat.id) {
                    // If already active, toggle sheet for sub-options
                    setSelectedCategoryId(cat.id);
                    setIsCategorySheetOpen((prev) => !prev);
                  } else {
                    setActiveTab(cat.defaultTab);
                    setSelectedCategoryId(cat.id);
                  }
                }}
                className={`flex-1 flex flex-col items-center justify-center h-full py-1.5 px-0.5 min-h-[58px] relative transition-all cursor-pointer group touch-manipulation active:scale-95 ${
                  isCategoryActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-12 h-10 rounded-2xl flex items-center justify-center transition-all ${
                      isCategoryActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                        : "group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                    }`}
                  >
                    <IconComponent
                      className={`w-5.5 h-5.5 transition-transform ${
                        isCategoryActive ? "stroke-[2.4px]" : "stroke-[1.8px]"
                      }`}
                    />
                  </div>

                  {isCategoryActive && (
                    <motion.div
                      layoutId="mobileActiveCategoryGlow"
                      className="absolute -top-1 w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                    />
                  )}
                </div>

                <span
                  className={`text-[11px] tracking-tight mt-1 transition-all truncate max-w-[70px] ${
                    isCategoryActive
                      ? "font-black text-indigo-600 dark:text-indigo-400"
                      : "font-bold text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {cat.shortTitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Sub-Actions Bottom Sheet Modal */}
      <AnimatePresence>
        {isCategorySheetOpen && displayedCategory && (
          <div className="fixed inset-0 z-[120] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategorySheetOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="relative w-full bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl p-5 pb-safe z-[121] max-h-[82vh] flex flex-col border-t border-slate-200 dark:border-slate-800"
            >
              {/* Sheet Drag Handle */}
              <div className="w-14 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl ${displayedCategory.activeColor} flex items-center justify-center shadow-md`}
                  >
                    {React.createElement(displayedCategory.icon, {
                      className: "w-5.5 h-5.5 text-white",
                    })}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {displayedCategory.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      عملیات و صفحات فعال در نسخه همراه
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCategorySheetOpen(false)}
                  className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors active:scale-95 cursor-pointer touch-manipulation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-item Cards List with Generous Spacing and 48px+ Tappable Targets */}
              <div className="space-y-2.5 overflow-y-auto flex-1 py-1.5 pr-0.5 custom-scrollbar">
                {displayedCategory.subItems.map((sub) => {
                  const isCurrent = activeTab === sub.id;
                  const SubIcon = sub.icon;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(sub.id);
                        setIsCategorySheetOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-3.5 min-h-[64px] rounded-2xl text-right transition-all border active:scale-[0.98] cursor-pointer touch-manipulation ${
                        isCurrent
                          ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 text-indigo-950 dark:text-indigo-100 shadow-sm ring-1 ring-indigo-400/20"
                          : "bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-750 text-slate-800 dark:text-slate-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isCurrent
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <SubIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-black truncate">
                              {sub.title}
                            </span>
                            {sub.badge && (
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg shrink-0 ${
                                  isCurrent
                                    ? "bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200"
                                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                {sub.badge}
                              </span>
                            )}
                          </div>
                          {sub.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">
                              {sub.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 shrink-0 shadow-2xs mr-2">
                          <Check className="w-3.5 h-3.5" />
                          <span>فعال</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Module Switcher inside Sheet with 40px+ Touch Targets */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 shrink-0">
                  بخش‌های همراه:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {MOBILE_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(c.id)}
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all active:scale-95 touch-manipulation cursor-pointer shadow-2xs ${
                        displayedCategory.id === c.id
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700"
                      }`}
                    >
                      {c.shortTitle}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
