import React from "react";
import {
  Activity,
  Home,
  FileText,
  ShoppingCart,
  ShoppingBag,
  PackagePlus,
  Package,
  Layers,
  Box,
  Users,
  CreditCard,
  ArrowRightLeft,
  BookOpen,
  Calculator,
  UserCheck,
  BarChart3,
  MessageSquare,
  Settings,
  ShieldCheck,
  Calendar,
  Sparkles,
  TrendingUp,
  Receipt,
  RotateCcw,
  ClipboardList,
  Tags,
  QrCode,
  Globe,
  Warehouse,
  History,
  UserCircle,
  Clock,
  Landmark,
  Wallet,
  Coins,
  FileSpreadsheet,
  CheckCircle2,
  Database,
  Cpu,
  RefreshCw,
  Bell,
  Sliders,
  DollarSign,
  PieChart,
  FileCheck,
  Send,
  SlidersHorizontal,
  FolderTree,
  AlertCircle,
  Building2,
  Scale,
  Key,
} from "lucide-react";

export interface SidebarItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  roles: string[];
  badge?: string;
  badgeColor?: "indigo" | "emerald" | "amber" | "rose" | "blue" | "purple" | "cyan";
  description?: string;
  isQuickAction?: boolean;
}

export interface SidebarGroup {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  color?: string;
  description?: string;
  items: SidebarItem[];
}

export const allSidebarGroups: SidebarGroup[] = [
  // 1. میزکار و امور روزمره
  {
    id: "personal_workspace",
    label: "میزکار و امور روزمره",
    shortLabel: "میزکار",
    color: "indigo",
    icon: <Home className="w-5 h-5" />,
    description: "صفحه اصلی، پیگیری‌ها و یادداشت‌های شخصی",
    items: [
      {
        id: "welcome_page",
        label: "صفحه اصلی (داشبورد ورود)",
        shortLabel: "صفحه اصلی",
        icon: <Home className="w-4 h-4 text-indigo-500" />,
        roles: ["admin", "accountant", "manager", "cashier", "viewer"],
      },
      {
        id: "personal_notes",
        label: "یادداشت‌ها و پیگیری‌ها",
        shortLabel: "یادداشت‌ها",
        icon: <FileText className="w-4 h-4 text-sky-500" />,
        roles: ["admin", "accountant", "manager", "cashier", "viewer"],
      },
      {
        id: "checklist",
        label: "چک‌لیست کارهای روزانه",
        shortLabel: "چک‌لیست",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        roles: ["admin", "manager", "accountant"],
      },
    ],
  },

  // 2. عملیات فروش و بازرگانی
  {
    id: "sales_operations",
    label: "فروش و درآمدها",
    shortLabel: "فروش",
    color: "emerald",
    icon: <ShoppingCart className="w-5 h-5" />,
    description: "فاکتورهای فروش، مرجوعی‌ها و تحلیل سودآوری",
    items: [
      {
        id: "create_sale",
        label: "ثبت فاکتور فروش کالا",
        shortLabel: "فروش جدید",
        icon: <ShoppingBag className="w-4 h-4 text-emerald-600" />,
        roles: ["admin", "cashier", "accountant"],
        badge: "سریع",
        badgeColor: "emerald",
        isQuickAction: true,
      },
      {
        id: "list_sale",
        label: "لیست فاکتورهای فروش",
        shortLabel: "لیست فروش",
        icon: <ClipboardList className="w-4 h-4 text-slate-600" />,
        roles: ["admin", "cashier", "accountant", "viewer"],
      },
      {
        id: "create_sale_return",
        label: "ثبت برگشت از فروش",
        shortLabel: "برگشتی فروش",
        icon: <RotateCcw className="w-4 h-4 text-rose-500" />,
        roles: ["admin", "cashier", "accountant"],
      },
      {
        id: "list_sale_return",
        label: "لیست برگشتی‌های فروش",
        shortLabel: "لیست برگشتی",
        icon: <ClipboardList className="w-4 h-4 text-rose-400" />,
        roles: ["admin", "cashier", "accountant", "viewer"],
      },
      {
        id: "sales_report",
        label: "گزارش فروش و سود و زیان",
        shortLabel: "سود و زیان",
        icon: <TrendingUp className="w-4 h-4 text-amber-500" />,
        roles: ["admin", "cashier", "accountant", "viewer"],
        badge: "تحلیلی",
        badgeColor: "amber",
      },
      {
        id: "analytical_dashboard",
        label: "داشبورد تحلیلی فروش",
        shortLabel: "داشبورد فروش",
        icon: <BarChart3 className="w-4 h-4 text-indigo-500" />,
        roles: ["admin", "accountant", "viewer"],
      },
    ],
  },

  // 3. عملیات خرید و تأمین کالا
  {
    id: "purchase_operations",
    label: "خرید و تأمین کالا",
    shortLabel: "خرید",
    color: "rose",
    icon: <PackagePlus className="w-5 h-5" />,
    description: "فاکتورهای خرید، برگشت به تأمین‌کننده و نیازسنجی",
    items: [
      {
        id: "create_purchase",
        label: "ثبت فاکتور خرید جدید",
        shortLabel: "خرید جدید",
        icon: <PackagePlus className="w-4 h-4 text-rose-600" />,
        roles: ["admin", "accountant"],
        badge: "ورود انبار",
        badgeColor: "rose",
        isQuickAction: true,
      },
      {
        id: "list_purchase",
        label: "لیست فاکتورهای خرید",
        shortLabel: "لیست خرید",
        icon: <ClipboardList className="w-4 h-4 text-slate-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "create_purchase_return",
        label: "ثبت برگشت از خرید",
        shortLabel: "برگشت خرید",
        icon: <RotateCcw className="w-4 h-4 text-amber-600" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "list_purchase_return",
        label: "لیست برگشتی‌های خرید",
        shortLabel: "لیست برگشت",
        icon: <ClipboardList className="w-4 h-4 text-amber-500" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "order_list",
        label: "سفارشات خرید (نیازسنجی کالا)",
        shortLabel: "نیازسنجی",
        icon: <ShoppingBag className="w-4 h-4 text-purple-500" />,
        roles: ["admin", "accountant", "viewer"],
        badge: "موجودی کم",
        badgeColor: "purple",
      },
      {
        id: "product_last_prices",
        label: "تاریخچه آخرین قیمت‌های خرید و فروش",
        shortLabel: "آخرین قیمت‌ها",
        icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
        roles: ["admin", "accountant", "viewer"],
      },
    ],
  },

  // 4. کالا، خدمات و قیمت‌گذاری
  {
    id: "products_management",
    label: "کالاها، خدمات و نرخ‌نامه",
    shortLabel: "کالا و قیمت",
    color: "blue",
    icon: <Package className="w-5 h-5" />,
    description: "تعریف کالاها، دسته‌بندی، بارکد و استعلام قیمت آنلاین",
    items: [
      {
        id: "products",
        label: "فهرست و مدیریت کالا و خدمات",
        shortLabel: "مدیریت کالا",
        icon: <Package className="w-4 h-4 text-blue-600" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "product_categories",
        label: "دسته‌بندی و گروه‌بندی کالاها",
        shortLabel: "دسته‌بندی‌ها",
        icon: <Tags className="w-4 h-4 text-indigo-500" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "quick_price_inquiry",
        label: "استعلام سریع قیمت و موجودی",
        shortLabel: "استعلام سریع",
        icon: <Sparkles className="w-4 h-4 text-amber-500" />,
        roles: ["admin", "accountant", "cashier", "viewer"],
        badge: "پوز",
        badgeColor: "amber",
      },
      {
        id: "product_view",
        label: "شناسنامه و کارت کالا",
        shortLabel: "کارت کالا",
        icon: <FileText className="w-4 h-4 text-cyan-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "bulk_barcode_generator",
        label: "تولید و چاپ گروهی بارکد",
        shortLabel: "چاپ بارکد",
        icon: <QrCode className="w-4 h-4 text-slate-700" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "online_pipe_pricing",
        label: "استعلام آنلاین نرخ لوله (سپاهان، مس، کچو)",
        shortLabel: "قیمت آنلاین لوله",
        icon: <Globe className="w-4 h-4 text-teal-600" />,
        roles: ["admin", "accountant"],
        badge: "آنلاین",
        badgeColor: "emerald",
      },
      {
        id: "newpipe_pricing",
        label: "استعلام و بروزرسانی نیوپایپ",
        shortLabel: "قیمت نیوپایپ",
        icon: <Globe className="w-4 h-4 text-blue-500" />,
        roles: ["admin", "accountant"],
      },
    ],
  },

  // 5. انبارداری و انبارگردانی
  {
    id: "warehousing",
    label: "انبارداری و موجودی کالا",
    shortLabel: "انبارداری",
    color: "amber",
    icon: <Box className="w-5 h-5" />,
    description: "تعریف انبارها، رسید/حواله، کاردکس و انبارگردانی",
    items: [
      {
        id: "warehouses",
        label: "مدیریت انبارها و موقعیت‌ها",
        shortLabel: "انبارها",
        icon: <Warehouse className="w-4 h-4 text-amber-600" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "create_warehouse_doc",
        label: "صدور رسید و حواله انبار",
        shortLabel: "رسید/حواله",
        icon: <FileText className="w-4 h-4 text-indigo-500" />,
        roles: ["admin", "accountant"],
        badge: "انبار",
        badgeColor: "indigo",
      },
      {
        id: "list_warehouse_docs",
        label: "بایگانی و لیست اسناد انبار",
        shortLabel: "لیست اسناد انبار",
        icon: <ClipboardList className="w-4 h-4 text-slate-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "stocktaking",
        label: "انبارگردانی و مغایرت‌گیری",
        shortLabel: "انبارگردانی",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        roles: ["admin", "manager"],
        badge: "کنترل دوره",
        badgeColor: "emerald",
      },
      {
        id: "kardex",
        label: "کاردکس کالا (تاریخچه گردش)",
        shortLabel: "کاردکس",
        icon: <History className="w-4 h-4 text-purple-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "inventory_report",
        label: "گزارش موجودی و ارزش ریالی انبارها",
        shortLabel: "موجودی انبارها",
        icon: <BarChart3 className="w-4 h-4 text-blue-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
    ],
  },

  // 6. طرف‌حساب‌ها و مدیریت ارتباط با مشتریان (CRM)
  {
    id: "persons",
    label: "اشخاص، طرف‌حساب و CRM",
    shortLabel: "طرف‌حساب‌ها",
    color: "purple",
    icon: <Users className="w-5 h-5" />,
    description: "بانک طرف‌حساب‌ها، دفتر معین اشخاص، مطالبات و پرونده مشتری",
    items: [
      {
        id: "persons",
        label: "مدیریت جامع اشخاص و مشتریان",
        shortLabel: "بانک اشخاص",
        icon: <Users className="w-4 h-4 text-purple-600" />,
        roles: ["admin", "accountant", "cashier"],
      },
      {
        id: "person_profile",
        label: "پرونده و پروفایل طرف‌حساب",
        shortLabel: "پرونده شخص",
        icon: <UserCircle className="w-4 h-4 text-indigo-500" />,
        roles: ["admin", "accountant", "cashier", "viewer"],
      },
      {
        id: "person_ledger",
        label: "دفتر معین و صورت‌حساب اشخاص",
        shortLabel: "معین اشخاص",
        icon: <FileSpreadsheet className="w-4 h-4 text-teal-600" />,
        roles: ["admin", "accountant", "viewer"],
        badge: "مالی",
        badgeColor: "emerald",
      },
      {
        id: "debts_credits",
        label: "گزارش بدهکاران و بستانکاران",
        shortLabel: "بدهکار / بستانکار",
        icon: <Coins className="w-4 h-4 text-rose-500" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "debtors_showcase",
        label: "ویترین مطالبات و اخطارهای معوق",
        shortLabel: "ویترین مطالبات",
        icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
        roles: ["admin", "accountant", "viewer"],
        badge: "پیگیری",
        badgeColor: "amber",
      },
      {
        id: "crm_dashboard",
        label: "داشبورد ارتباط با مشتریان (CRM)",
        shortLabel: "داشبورد CRM",
        icon: <Activity className="w-4 h-4 text-purple-500" />,
        roles: ["admin", "viewer"],
      },
      {
        id: "person_opening_balances",
        label: "مانده اول دوره طرف‌حساب‌ها",
        shortLabel: "مانده اول دوره",
        icon: <Calculator className="w-4 h-4 text-slate-600" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "person_groups",
        label: "گروه‌بندی اشخاص",
        shortLabel: "گروه‌های اشخاص",
        icon: <Tags className="w-4 h-4 text-slate-500" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "person_roles",
        label: "نقش‌های حقوقی و تجاری اشخاص",
        shortLabel: "نقش‌ها",
        icon: <FolderTree className="w-4 h-4 text-slate-500" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "person_categories",
        label: "برچسب‌ها و طبقه‌بندی طرف‌حساب",
        shortLabel: "برچسب‌ها",
        icon: <Tags className="w-4 h-4 text-slate-400" />,
        roles: ["admin", "accountant"],
      },
    ],
  },

  // 7. خزانه، نقد و بانک
  {
    id: "receipts_payments",
    label: "خزانه‌داری، دریافت و پرداخت",
    shortLabel: "خزانه و نقد",
    color: "teal",
    icon: <CreditCard className="w-5 h-5" />,
    description: "رسیدهای دریافت، پرداخت، بانک‌ها، صندوق‌ها و انتقال وجه",
    items: [
      {
        id: "create_receive_receipt",
        label: "ثبت رسید دریافت وجه (نقد/بانک)",
        shortLabel: "دریافت وجه",
        icon: <Receipt className="w-4 h-4 text-emerald-600" />,
        roles: ["admin", "accountant", "cashier"],
        badge: "ورودی",
        badgeColor: "emerald",
        isQuickAction: true,
      },
      {
        id: "list_receive_receipt",
        label: "لیست رسیدهای دریافت وجه",
        shortLabel: "رسیدهای دریافت",
        icon: <ClipboardList className="w-4 h-4 text-emerald-500" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "create_pay_receipt",
        label: "ثبت رسید پرداخت وجه (نقد/بانک)",
        shortLabel: "پرداخت وجه",
        icon: <Receipt className="w-4 h-4 text-rose-600" />,
        roles: ["admin", "accountant"],
        badge: "خروجی",
        badgeColor: "rose",
        isQuickAction: true,
      },
      {
        id: "list_pay_receipt",
        label: "لیست رسیدهای پرداخت وجه",
        shortLabel: "رسیدهای پرداخت",
        icon: <ClipboardList className="w-4 h-4 text-rose-500" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "accounts",
        label: "مدیریت حساب‌های بانکی و کارتخوان‌ها",
        shortLabel: "حساب‌های بانکی",
        icon: <Landmark className="w-4 h-4 text-blue-600" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "cashboxes",
        label: "مدیریت صندوق‌های نقدی",
        shortLabel: "صندوق‌ها",
        icon: <Wallet className="w-4 h-4 text-amber-600" />,
        roles: ["admin", "accountant", "cashier"],
      },
      {
        id: "transfer",
        label: "انتقال وجه بین حساب‌ها و صندوق‌ها",
        shortLabel: "انتقال وجه",
        icon: <ArrowRightLeft className="w-4 h-4 text-indigo-500" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "quick_refund",
        label: "استرداد و بازگشت سریع وجه",
        shortLabel: "استرداد سریع",
        icon: <RotateCcw className="w-4 h-4 text-amber-500" />,
        roles: ["admin", "accountant", "cashier"],
      },
      {
        id: "invoice_allocation",
        label: "تخصیص وجوه دریافتی به فاکتورها",
        shortLabel: "تخصیص فاکتورها",
        icon: <FileCheck className="w-4 h-4 text-teal-600" />,
        roles: ["admin", "accountant"],
      },
    ],
  },

  // 8. چک و اسناد تجاری
  {
    id: "checks_management",
    label: "مدیریت چک و اسناد تجاری",
    shortLabel: "مدیریت چک",
    color: "sky",
    icon: <BookOpen className="w-5 h-5" />,
    description: "کارتابل چک‌های دریافتی، پرداختی، دسته‌چک و کارت چک",
    items: [
      {
        id: "check_panel",
        label: "میزکار و داشبورد جامع چک‌ها",
        shortLabel: "میزکار چک",
        icon: <BookOpen className="w-4 h-4 text-sky-600" />,
        roles: ["admin", "accountant", "manager", "viewer"],
        badge: "داشبورد",
        badgeColor: "blue",
      },
      {
        id: "receive_check_form",
        label: "ثبت برگه چک دریافتی جدید",
        shortLabel: "دریافت چک",
        icon: <FileText className="w-4 h-4 text-emerald-600" />,
        roles: ["admin", "accountant", "manager"],
        badge: "ورودی",
        badgeColor: "emerald",
      },
      {
        id: "received_checks_page",
        label: "کارتابل و لیست چک‌های دریافتی",
        shortLabel: "چک‌های دریافتی",
        icon: <ClipboardList className="w-4 h-4 text-emerald-600" />,
        roles: ["admin", "accountant", "manager", "viewer"],
      },
      {
        id: "issue_check_form",
        label: "صدور برگه چک پرداختی جدید",
        shortLabel: "صدور چک",
        icon: <FileText className="w-4 h-4 text-rose-600" />,
        roles: ["admin", "accountant", "manager"],
        badge: "خروجی",
        badgeColor: "rose",
      },
      {
        id: "issued_checks_page",
        label: "کارتابل و لیست چک‌های پرداختی",
        shortLabel: "چک‌های پرداختی",
        icon: <ClipboardList className="w-4 h-4 text-rose-600" />,
        roles: ["admin", "accountant", "manager", "viewer"],
      },
      {
        id: "checkbooks",
        label: "مدیریت و ثبت دسته‌چک‌های بانکی",
        shortLabel: "دسته‌چک‌ها",
        icon: <FolderTree className="w-4 h-4 text-slate-600" />,
        roles: ["admin", "accountant", "manager"],
      },
      {
        id: "check_card",
        label: "پرونده و کارت وضعیت برگه چک",
        shortLabel: "کارت چک",
        icon: <CreditCard className="w-4 h-4 text-indigo-500" />,
        roles: ["admin", "accountant", "manager", "viewer"],
      },
    ],
  },

  // 9. وام و تسهیلات بانکی
  {
    id: "loans_management",
    label: "تسهیلات، وام و اقساط",
    shortLabel: "وام و اقساط",
    color: "amber",
    icon: <Calculator className="w-5 h-5" />,
    description: "تعریف تسهیلات، تقسیط خودکار، ثبت اقساط و معوقات",
    items: [
      {
        id: "loans_dashboard",
        label: "داشبورد وضعیت تسهیلات و وام‌ها",
        shortLabel: "داشبورد وام",
        icon: <Activity className="w-4 h-4 text-amber-600" />,
        roles: ["admin", "accountant", "manager"],
      },
      {
        id: "loans_create",
        label: "ثبت تسهیلات / وام جدید",
        shortLabel: "وام جدید",
        icon: <Calculator className="w-4 h-4 text-emerald-600" />,
        roles: ["admin", "accountant", "manager"],
        badge: "جدید",
        badgeColor: "emerald",
      },
      {
        id: "loans_list",
        label: "لیست پرونده‌های وام و تسهیلات",
        shortLabel: "لیست وام‌ها",
        icon: <ClipboardList className="w-4 h-4 text-slate-600" />,
        roles: ["admin", "accountant", "manager"],
      },
      {
        id: "loans_payment",
        label: "پرداخت و وصول اقساط وام",
        shortLabel: "پرداخت اقساط",
        icon: <Receipt className="w-4 h-4 text-blue-500" />,
        roles: ["admin", "accountant", "manager"],
      },
      {
        id: "loans_arrears",
        label: "مدیریت اقساط سررسید شده و معوق",
        shortLabel: "معوقات وام",
        icon: <AlertCircle className="w-4 h-4 text-rose-500" />,
        roles: ["admin", "accountant", "manager"],
        badge: "پیگیری",
        badgeColor: "rose",
      },
      {
        id: "loans_reports",
        label: "گزارشات آماری و مانده اصل و سود",
        shortLabel: "گزارشات وام",
        icon: <BarChart3 className="w-4 h-4 text-purple-500" />,
        roles: ["admin", "accountant", "manager"],
      },
      {
        id: "loans_settings",
        label: "تنظیمات ضرایب و کارمزد وام‌ها",
        shortLabel: "تنظیمات وام",
        icon: <Settings className="w-4 h-4 text-slate-500" />,
        roles: ["admin", "accountant", "manager"],
      },
    ],
  },

  // 10. حقوق، دستمزد، کارگزینی و قراردادها
  {
    id: "salary",
    label: "حقوق، دستمزد و کارگزینی",
    shortLabel: "حقوق و پرسنل",
    color: "rose",
    icon: <UserCheck className="w-5 h-5" />,
    description: "اطلاعات پرسنلی، قراردادها، کارکرد ماهانه و فیش حقوقی",
    items: [
      {
        id: "employee_profiles",
        label: "تکمیل و پرونده اطلاعات پرسنل",
        shortLabel: "پرونده پرسنلی",
        icon: <Users className="w-4 h-4 text-rose-600" />,
        roles: ["admin", "accountant", "manager"],
      },
      {
        id: "payslips",
        label: "محاسبه و صدور فیش‌های حقوقی",
        shortLabel: "فیش حقوقی",
        icon: <Receipt className="w-4 h-4 text-emerald-600" />,
        roles: ["admin", "accountant", "manager", "viewer"],
        badge: "ماهانه",
        badgeColor: "emerald",
      },
      {
        id: "monthly_attendance",
        label: "کارکرد ماهانه، کسر و اضافه کار",
        shortLabel: "کارکرد ماهانه",
        icon: <Clock className="w-4 h-4 text-blue-600" />,
        roles: ["admin", "accountant", "manager", "viewer"],
      },
      {
        id: "daily_attendance",
        label: "ثبت تردد و داده‌های روزانه پرسنل",
        shortLabel: "تردد روزانه",
        icon: <Calendar className="w-4 h-4 text-indigo-500" />,
        roles: ["admin", "accountant", "manager", "viewer"],
      },
      {
        id: "employee_contracts",
        label: "قراردادهای کاری پرسنل",
        shortLabel: "قراردادها",
        icon: <FileText className="w-4 h-4 text-slate-600" />,
        roles: ["admin", "accountant", "manager"],
      },
      {
        id: "rent_contracts",
        label: "قراردادهای اجاره و تعهدات املاک",
        shortLabel: "قراردادهای اجاره",
        icon: <Building2 className="w-4 h-4 text-amber-600" />,
        roles: ["admin", "accountant", "manager"],
      },
      {
        id: "employee_orders",
        label: "احکام پرسنلی و کارگزینی",
        shortLabel: "احکام کارگزینی",
        icon: <FileCheck className="w-4 h-4 text-purple-600" />,
        roles: ["admin", "accountant", "manager"],
      },
      {
        id: "workplaces",
        label: "مدیریت کارگاه‌ها و ردیف‌های بیمه",
        shortLabel: "کارگاه‌ها",
        icon: <Warehouse className="w-4 h-4 text-slate-600" />,
        roles: ["admin", "manager"],
      },
      {
        id: "order_templates",
        label: "قالب‌های پیش‌فرض حکم کارگزینی",
        shortLabel: "قالب‌های حکم",
        icon: <FolderTree className="w-4 h-4 text-slate-500" />,
        roles: ["admin", "manager"],
      },
    ],
  },

  // 11. حسابداری مالی و دفاتر دوبل
  {
    id: "accounting_core",
    label: "حسابداری مالی و دفاتر دوبل",
    shortLabel: "حسابداری دوبل",
    color: "cyan",
    icon: <Activity className="w-5 h-5" />,
    description: "سال‌های مالی، درختواره کدینگ، اسناد حسابداری، تراز و دفاتر کل",
    items: [
      {
        id: "financial_years",
        label: "مدیریت سال‌های مالی و بستن دوره",
        shortLabel: "سال‌های مالی",
        icon: <Calendar className="w-4 h-4 text-indigo-600" />,
        roles: ["admin", "accountant"],
        badge: "پایه",
        badgeColor: "indigo",
      },
      {
        id: "chart_of_accounts",
        label: "کدینگ و شجره حساب‌ها (کل/معین)",
        shortLabel: "کدینگ حساب‌ها",
        icon: <FolderTree className="w-4 h-4 text-teal-600" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "accounting_doc_create",
        label: "صدور سند حسابداری دستی (دوبل)",
        shortLabel: "سند حسابداری",
        icon: <FileText className="w-4 h-4 text-blue-600" />,
        roles: ["admin", "accountant"],
        badge: "تراز",
        badgeColor: "emerald",
      },
      {
        id: "accounting_docs_list",
        label: "دفتر روزنامه و اسناد حسابداری",
        shortLabel: "دفتر روزنامه",
        icon: <ClipboardList className="w-4 h-4 text-slate-700" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "account_ledger",
        label: "دفتر کل و معین حسابداری",
        shortLabel: "دفاتر کل و معین",
        icon: <FileSpreadsheet className="w-4 h-4 text-purple-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "accounting_verification",
        label: "تراز آزمایشی و مغایرت‌گیری اسناد",
        shortLabel: "تراز آزمایشی",
        icon: <Scale className="w-4 h-4 text-emerald-600" />,
        roles: ["admin", "accountant", "viewer"],
        badge: "تراز",
        badgeColor: "emerald",
      },
      {
        id: "accounting_opening_balances",
        label: "اسناد افتتاحیه دوره مالی",
        shortLabel: "سند افتتاحیه",
        icon: <Receipt className="w-4 h-4 text-slate-500" />,
        roles: ["admin", "accountant"],
      },
      {
        id: "financial_report",
        label: "ترازنامه مالی و داشبورد عملکرد",
        shortLabel: "ترازنامه مالی",
        icon: <BarChart3 className="w-4 h-4 text-indigo-500" />,
        roles: ["admin", "accountant", "viewer"],
        badge: "ترازنامه",
        badgeColor: "purple",
      },
    ],
  },

  // 12. مرکز گزارشات جامع و تحلیلی
  {
    id: "reports",
    label: "مرکز گزارشات و هوش تجاری",
    shortLabel: "گزارشات جامع",
    color: "indigo",
    icon: <BarChart3 className="w-5 h-5" />,
    description: "گزارشات تجمیعی، ترازنامه‌ها، سود و زیان و تحلیل‌های فروش",
    items: [
      {
        id: "sales_report",
        label: "گزارش جامع فروش و سود و زیان کالاها",
        shortLabel: "سود و زیان فروش",
        icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
        roles: ["admin", "accountant", "cashier", "viewer"],
        badge: "کلیدی",
        badgeColor: "emerald",
      },
      {
        id: "analytical_dashboard",
        label: "داشبورد تحلیلی و مقایسه‌ای دوره‌ها",
        shortLabel: "داشبورد تحلیلی",
        icon: <BarChart3 className="w-4 h-4 text-indigo-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "financial_report",
        label: "داشبورد مالی و ترازنامه عمومی",
        shortLabel: "داشبورد مالی",
        icon: <PieChart className="w-4 h-4 text-purple-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "inventory_report",
        label: "گزارش جامع موجودی و گردش انبارها",
        shortLabel: "گزارش موجودی",
        icon: <Box className="w-4 h-4 text-blue-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "kardex",
        label: "کاردکس و ریز گردش فیزیکی/ریالی کالا",
        shortLabel: "کاردکس کالا",
        icon: <History className="w-4 h-4 text-sky-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "debts_credits",
        label: "تراز بدهکاران و بستانکاران شرکت",
        shortLabel: "مانده اشخاص",
        icon: <Coins className="w-4 h-4 text-rose-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "person_ledger",
        label: "دفتر معین و ریز حساب اشخاص",
        shortLabel: "معین اشخاص",
        icon: <FileSpreadsheet className="w-4 h-4 text-teal-600" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "accounting_verification",
        label: "تراز آزمایشی چهار و هشت ستونی",
        shortLabel: "تراز آزمایشی",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        roles: ["admin", "accountant", "viewer"],
      },
      {
        id: "crm_dashboard",
        label: "داشبورد تحلیل رفتار مشتریان (CRM)",
        shortLabel: "تحلیل CRM",
        icon: <Activity className="w-4 h-4 text-purple-500" />,
        roles: ["admin", "viewer"],
      },
      {
        id: "product_last_prices",
        label: "گزارش آخرین نرخ‌های خرید و فروش",
        shortLabel: "آخرین نرخ‌ها",
        icon: <DollarSign className="w-4 h-4 text-amber-500" />,
        roles: ["admin", "accountant", "viewer"],
      },
    ],
  },

  // 13. اطلاع‌رسانی، پیامک و پیام‌رسانی
  {
    id: "messaging_system",
    label: "پیامک و ارتباط هوشمند",
    shortLabel: "پیامک",
    color: "sky",
    icon: <MessageSquare className="w-5 h-5" />,
    description: "ارسال پیامک تکی و گروهی، قالب‌های خودکار و لاگ ارسال",
    items: [
      {
        id: "send_message",
        label: "ارسال پیامک و اعلان جدید",
        shortLabel: "ارسال پیامک",
        icon: <Send className="w-4 h-4 text-sky-600" />,
        roles: ["admin", "manager", "accountant"],
        badge: "سریع",
        badgeColor: "blue",
      },
      {
        id: "sms_messages",
        label: "آرشیو و مدیریت پیامک‌های سیستم",
        shortLabel: "آرشیو پیامک",
        icon: <MessageSquare className="w-4 h-4 text-slate-700" />,
        roles: ["admin", "manager", "accountant"],
      },
      {
        id: "sms_templates",
        label: "قالب‌ها و متن‌های خودکار پیامک",
        shortLabel: "قالب‌های پیامک",
        icon: <FileText className="w-4 h-4 text-purple-600" />,
        roles: ["admin", "manager"],
      },
      {
        id: "messaging_channels",
        label: "تنظیمات درگاه‌ها و خطوط پیامک",
        shortLabel: "خطوط پیامک",
        icon: <Sliders className="w-4 h-4 text-amber-600" />,
        roles: ["admin"],
      },
      {
        id: "messaging_logs",
        label: "لاگ و گزارشات تحویل پیام‌ها",
        shortLabel: "لاگ پیامک",
        icon: <ClipboardList className="w-4 h-4 text-slate-500" />,
        roles: ["admin", "manager"],
      },
    ],
  },

  // 14. تنظیمات سیستم، امنیت و مدیریت پایگاه داده
  {
    id: "admin",
    label: "تنظیمات، کاربران و پشتیبان",
    shortLabel: "تنظیمات",
    color: "slate",
    icon: <Settings className="w-5 h-5" />,
    description: "تنظیمات کسب‌وکار، سطح دسترسی کاربران، لاگ‌ها و نگهداری دیتابیس",
    items: [
      {
        id: "settings",
        label: "تنظیمات عمومی، فروشگاه و فاکتور",
        shortLabel: "تنظیمات عمومی",
        icon: <Sliders className="w-4 h-4 text-slate-700" />,
        roles: ["admin"],
        badge: "اصلی",
        badgeColor: "indigo",
      },
      {
        id: "users_manager",
        label: "مدیریت کاربران و سطح دسترسی‌ها",
        shortLabel: "کاربران و دسترسی",
        icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
        roles: ["admin"],
      },
      {
        id: "system_diagnostics",
        label: "مرکز عیب‌یابی و پایش سلامت سیستم",
        shortLabel: "پایش سلامت",
        icon: <Cpu className="w-4 h-4 text-blue-600" />,
        roles: ["admin"],
      },
      {
        id: "unvouchered_financials",
        label: "عیب‌یابی عملیات مالی فاقد سند",
        shortLabel: "اسناد معوق",
        icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
        roles: ["admin", "accountant"],
        badge: "کنترل",
        badgeColor: "rose",
      },
      {
        id: "sync_manager",
        label: "مدیریت همگام‌سازی ابری و آفلاین",
        shortLabel: "همگام‌سازی",
        icon: <RefreshCw className="w-4 h-4 text-indigo-500" />,
        roles: ["admin"],
      },
      {
        id: "data_reconciliation",
        label: "تطبیق و بازسازی هوشمند داده‌ها",
        shortLabel: "تطبیق داده‌ها",
        icon: <RefreshCw className="w-4 h-4 text-teal-600" />,
        roles: ["admin"],
      },
      {
        id: "database",
        label: "مدیریت و پشتیبان‌گیری پایگاه داده",
        shortLabel: "پشتیبان‌گیری",
        icon: <Database className="w-4 h-4 text-emerald-600" />,
        roles: ["admin"],
      },
      {
        id: "system_logs",
        label: "لاگ وقایع و فعالیت‌های کاربران",
        shortLabel: "لاگ کاربران",
        icon: <Activity className="w-4 h-4 text-slate-600" />,
        roles: ["admin"],
      },
      {
        id: "database_logs",
        label: "لاگ وقایع پایگاه داده و سیستم",
        shortLabel: "لاگ دیتابیس",
        icon: <Database className="w-4 h-4 text-slate-500" />,
        roles: ["admin"],
      },
      {
        id: "system_info",
        label: "مشخصات فنی و وضعیت نرم‌افزار",
        shortLabel: "درباره سیستم",
        icon: <FileText className="w-4 h-4 text-slate-500" />,
        roles: ["admin", "manager", "accountant"],
      },
      {
        id: "update",
        label: "بروزرسانی و تاریخچه تغییرات سیستم",
        shortLabel: "بروزرسانی",
        icon: <RefreshCw className="w-4 h-4 text-indigo-500" />,
        roles: ["admin"],
      },
    ],
  },
];

export function getFilteredSidebarGroups(
  systemModule: string,
  hasCheckedFinancialYears: boolean,
  activeFinancialYear: any
): SidebarGroup[] {
  if (hasCheckedFinancialYears && !activeFinancialYear) {
    return [
      {
        id: "financial_years_setup",
        label: "راه‌اندازی سال مالی",
        shortLabel: "سال مالی",
        color: "amber",
        icon: <Calendar className="w-5 h-5" />,
        description: "جهت آغاز به کار با نرم‌افزار، لطفاً سال مالی خود را ایجاد فرمایید",
        items: [
          {
            id: "financial_years",
            label: "تعریف و راه‌اندازی سال مالی اول",
            shortLabel: "ایجاد سال مالی",
            icon: <Calendar className="w-4 h-4 text-amber-600" />,
            roles: ["admin", "accountant"],
            badge: "اقدام لازم",
            badgeColor: "amber",
          },
          {
            id: "settings",
            label: "تنظیمات تقویم و مشخصات فروشگاه",
            shortLabel: "تنظیمات",
            icon: <Settings className="w-4 h-4 text-slate-600" />,
            roles: ["admin"],
          },
        ],
      },
    ];
  }

  return allSidebarGroups
    .filter((g) => {
      if (systemModule === "all" || systemModule === "selector") return true;

      if (systemModule === "commerce") {
        return (
          [
            "sales_operations",
            "purchase_operations",
            "products_management",
            "persons",
            "receipts_payments",
            "reports",
          ].includes(g.id) || g.id === "personal_workspace"
        );
      }
      if (systemModule === "inventory") {
        return (
          ["products_management", "warehousing", "reports"].includes(g.id) ||
          g.id === "personal_workspace"
        );
      }
      if (systemModule === "accounting") {
        return (
          [
            "accounting_core",
            "receipts_payments",
            "checks_management",
            "loans_management",
            "salary",
            "persons",
            "reports",
          ].includes(g.id) || g.id === "personal_workspace"
        );
      }
      if (systemModule === "admin") {
        return ["admin", "reports"].includes(g.id) || g.id === "personal_workspace";
      }
      if (systemModule === "crm") {
        return (
          ["persons", "sales_operations", "messaging_system", "reports"].includes(g.id) ||
          g.id === "personal_workspace"
        );
      }
      if (systemModule === "hr") {
        return ["salary", "persons", "reports"].includes(g.id) || g.id === "personal_workspace";
      }
      if (systemModule === "reports_module") {
        return ["reports"].includes(g.id) || g.id === "personal_workspace";
      }
      return true;
    })
    .map((g) => {
      // If module is filtered, ensure reports group presents the most relevant reports
      if (g.id === "reports" && systemModule !== "all" && systemModule !== "selector") {
        return {
          ...g,
          items: g.items.filter((item) => {
            if (systemModule === "commerce") {
              return [
                "sales_report",
                "analytical_dashboard",
                "inventory_report",
                "product_last_prices",
              ].includes(item.id);
            }
            if (systemModule === "inventory") {
              return ["inventory_report", "kardex"].includes(item.id);
            }
            if (systemModule === "accounting") {
              return [
                "financial_report",
                "analytical_dashboard",
                "person_ledger",
                "debts_credits",
                "accounting_verification",
              ].includes(item.id);
            }
            if (systemModule === "admin") {
              return ["analytical_dashboard", "financial_report"].includes(item.id);
            }
            if (systemModule === "crm") {
              return ["crm_dashboard", "person_ledger", "analytical_dashboard"].includes(item.id);
            }
            if (systemModule === "hr") {
              return ["analytical_dashboard"].includes(item.id);
            }
            if (systemModule === "reports_module") return true;
            return true;
          }),
        };
      }
      return g;
    });
}
