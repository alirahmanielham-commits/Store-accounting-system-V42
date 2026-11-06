import React from "react";
import {
  Receipt,
  BookOpen,
  ShoppingBag,
  Users,
  Coins,
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
} from "lucide-react";

export interface MobileRestrictedMenuProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
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

/**
 * Mobile bottom navigation removed per user request:
 * The application exclusively uses the Side Menu (hamburger drawer) on mobile.
 */
export default function MobileRestrictedMenu(_props: MobileRestrictedMenuProps) {
  return null;
}
