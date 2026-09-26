import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  CreditCard,
  UserCircle,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  ListOrdered,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
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
        id: "create_receive_receipt",
        title: "ثبت رسید دریافت وجه",
        icon: ArrowDownLeft,
        badge: "ورودی",
        description: "ثبت واریز نقدی، پوز و چک به صندوق یا حساب",
      },
      {
        id: "create_pay_receipt",
        title: "ثبت رسید پرداخت وجه",
        icon: ArrowUpRight,
        badge: "خروجی",
        description: "ثبت پرداخت نقدی یا حواله بانکی به طرف‌حساب",
      },
      {
        id: "list_receive_receipt",
        title: "لیست رسیدهای دریافت",
        icon: ListOrdered,
        description: "مشاهده و جستجوی دریافت‌های ثبت شده",
      },
      {
        id: "list_pay_receipt",
        title: "لیست رسیدهای پرداخت",
        icon: ListOrdered,
        description: "مشاهده و جستجوی پرداخت‌های ثبت شده",
      },
    ],
  },
  {
    id: "checks",
    title: "ثبت و مدیریت چک",
    shortTitle: "ثبت چک",
    icon: BookOpen,
    defaultTab: "receive_check_form",
    color: "sky",
    activeColor: "bg-sky-600 text-white",
    subItems: [
      {
        id: "receive_check_form",
        title: "ثبت برگه چک دریافتی جدید",
        icon: Plus,
        badge: "جدید",
        description: "ثبت مشخصات چک صیادی دریافتی از مشتری",
      },
      {
        id: "received_checks_page",
        title: "کارتابل و لیست چک‌های دریافتی",
        icon: BookOpen,
        description: "مشاهده وضعیت، وصول، استرداد و خرج چک دریافتی",
      },
      {
        id: "paid_checks_page",
        title: "کارتابل چک‌های پرداختی",
        icon: BookOpen,
        description: "مدیریت چک‌های صادره از دسته‌چک شرکت",
      },
      {
        id: "check_panel",
        title: "میزکار و داشبورد چک‌ها",
        icon: Sparkles,
        description: "آمار سررسید چک‌های نزدیک و وصولی‌ها",
      },
    ],
  },
  {
    id: "invoices_products",
    title: "ثبت فاکتورها و ثبت کالا",
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
        description: "صدور سریع فاکتور فروش نقدی یا نسیه",
      },
      {
        id: "create_purchase",
        title: "ثبت فاکتور خرید جدید",
        icon: Plus,
        badge: "خرید",
        description: "ثبت فاکتور خرید و ورود کالا به انبار",
      },
      {
        id: "products",
        title: "ثبت و مدیریت کالا و خدمات",
        icon: Package,
        badge: "کالاها",
        description: "تعریف کالای جدید، قیمت‌گذاری و موجودی",
      },
      {
        id: "list_sale",
        title: "لیست فاکتورهای فروش",
        icon: ListOrdered,
        description: "مشاهده و چاپ مجدد فاکتورهای فروش صادر شده",
      },
      {
        id: "list_purchase",
        title: "لیست فاکتورهای خرید",
        icon: ListOrdered,
        description: "مشاهده و جستجوی فاکتورهای خرید ثبت شده",
      },
    ],
  },
  {
    id: "persons_ledger",
    title: "ثبت شخص و مشاهده کارت حساب و پروفایل",
    shortTitle: "شخص و حساب",
    icon: Users,
    defaultTab: "persons",
    color: "purple",
    activeColor: "bg-purple-600 text-white",
    subItems: [
      {
        id: "persons",
        title: "ثبت و مدیریت اشخاص و مشتریان",
        icon: Users,
        badge: "اشخاص",
        description: "تعریف طرف‌حساب جدید و ویرایش اطلاعات تماس",
      },
      {
        id: "person_ledger",
        title: "کارت حساب (دفتر معین طرف‌حساب)",
        icon: FileSpreadsheet,
        badge: "معین",
        description: "ریز تراکنش‌ها، گردش بدهکار و بستانکار و مانده شخص",
      },
      {
        id: "person_profile",
        title: "پرونده و پروفایل جامع شخص",
        icon: UserCircle,
        description: "اطلاعات هویتی، سوابق فاکتورها، چک‌ها و اسناد شخص",
      },
    ],
  },
  {
    id: "debtors_creditors",
    title: "گزارش بدهکاران و بستانکاران",
    shortTitle: "بدهکار/بستانکار",
    icon: Coins,
    defaultTab: "debts_credits",
    color: "rose",
    activeColor: "bg-rose-600 text-white",
    subItems: [
      {
        id: "debts_credits",
        title: "گزارش جامع بدهکاران و بستانکاران",
        icon: Coins,
        badge: "گزارش",
        description: "صورت مانده بدهی و طلب تمام طرف‌حساب‌ها با فیلتر",
      },
      {
        id: "debtors_showcase",
        title: "ویترین مطالبات و اخطارهای معوق",
        icon: AlertCircle,
        badge: "معوقات",
        description: "فهرست مشتریان دارای بدهی سررسید گذشته",
      },
    ],
  },
];

export const MOBILE_ALLOWED_TABS = new Set(
  MOBILE_CATEGORIES.flatMap((c) => c.subItems.map((s) => s.id)).concat([
    "quick_receive_payment",
    "receive_payment",
    "create_receive_check",
    "pay_check_form",
    "create_pay_check",
    "checks",
    "quick_price_inquiry",
    "product_view",
  ])
);

export default function MobileRestrictedMenu({
  activeTab,
  setActiveTab,
  setIsPersonModalOpen,
  setIsProductModalOpen,
}: MobileRestrictedMenuProps) {
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Find active category
  const activeCategory = useMemo(() => {
    return (
      MOBILE_CATEGORIES.find((cat) =>
        cat.subItems.some((sub) => sub.id === activeTab)
      ) || MOBILE_CATEGORIES[0]
    );
  }, [activeTab]);

  const displayedCategory = useMemo(() => {
    if (selectedCategoryId) {
      return (
        MOBILE_CATEGORIES.find((c) => c.id === selectedCategoryId) || activeCategory
      );
    }
    return activeCategory;
  }, [selectedCategoryId, activeCategory]);

  return (
    <div className="md:hidden select-none" dir="rtl">
      {/* Quick Sub-Actions Bar (Shown right above the bottom nav for the active category) */}
      <div className="fixed bottom-16 inset-x-0 z-[79] px-2 py-1.5 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <div className="text-[10px] font-black text-slate-400 shrink-0 pl-1 flex items-center gap-1">
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
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 transition-all cursor-pointer ${
                isCurrentTab
                  ? `${activeCategory.activeColor} shadow-xs scale-100 ring-1 ring-black/10`
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 active:scale-95 border border-slate-200/60"
              }`}
            >
              <SubIcon className="w-3.5 h-3.5" />
              <span>{sub.title.split(" ")[0]} {sub.title.split(" ")[1] || ""}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setSelectedCategoryId(activeCategory.id);
            setIsCategorySheetOpen(true);
          }}
          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0 mr-auto flex items-center gap-0.5 text-[10px] font-bold"
          title="مشاهده تمام گزینه‌ها"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span>بیشتر</span>
        </button>
      </div>

      {/* Main Mobile Bottom Navigation Bar (5 Essential Options) */}
      <div className="fixed bottom-0 inset-x-0 z-[80] bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
        <div className="flex justify-around items-center h-16 px-1">
          {MOBILE_CATEGORIES.map((cat) => {
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
                className={`flex-1 flex flex-col items-center justify-center h-full py-1 relative transition-all cursor-pointer group ${
                  isCategoryActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isCategoryActive
                        ? "bg-indigo-50 text-indigo-600 scale-105 shadow-2xs border border-indigo-200/50"
                        : "group-hover:bg-slate-100"
                    }`}
                  >
                    <IconComponent
                      className={`w-5 h-5 transition-transform ${
                        isCategoryActive ? "stroke-[2.5px]" : "stroke-[1.8px]"
                      }`}
                    />
                  </div>

                  {isCategoryActive && (
                    <motion.div
                      layoutId="mobileActiveCategoryGlow"
                      className="absolute -top-1 w-1.5 h-1.5 bg-indigo-600 rounded-full"
                    />
                  )}
                </div>

                <span
                  className={`text-[10px] tracking-tight mt-0.5 transition-all truncate max-w-[68px] ${
                    isCategoryActive ? "font-black text-indigo-700" : "font-bold text-slate-600"
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
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative w-full bg-white rounded-t-3xl shadow-2xl p-5 pb-safe z-[121] max-h-[80vh] flex flex-col border-t border-slate-200"
            >
              {/* Sheet Handle */}
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl ${displayedCategory.activeColor} flex items-center justify-center shadow-xs`}
                  >
                    {React.createElement(displayedCategory.icon, {
                      className: "w-5 h-5 text-white",
                    })}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {displayedCategory.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      عملیات و صفحات فعال در نسخه موبایل
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCategorySheetOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-item List */}
              <div className="space-y-2 overflow-y-auto flex-1 py-1">
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
                      className={`w-full flex items-center justify-between p-3 rounded-2xl text-right transition-all border ${
                        isCurrent
                          ? "bg-indigo-50/80 border-indigo-300 text-indigo-900 shadow-xs"
                          : "bg-white hover:bg-slate-50 border-slate-200/80 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <SubIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black">{sub.title}</span>
                            {sub.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600">
                                {sub.badge}
                              </span>
                            )}
                          </div>
                          {sub.description && (
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                              {sub.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="text-[10px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                          فعال
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Module Switcher inside Sheet */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">
                  بخش‌های همراه:
                </span>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {MOBILE_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(c.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black shrink-0 transition-colors ${
                        displayedCategory.id === c.id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
