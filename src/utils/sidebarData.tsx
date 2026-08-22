import React from "react";
import { MessageSquare,
  BarChart3,
  ShoppingCart,
  PackagePlus,
  Users,
  Calculator,
  Package,
  Box,
  CreditCard,
  ArrowRightLeft,
  BookOpen,
  Settings,
  Calendar,
  Activity,
  UserCheck
} from "lucide-react";

export interface SidebarItem {
  id: string;
  label: string;
  roles: string[];
}

export interface SidebarGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: SidebarItem[];
}

export const allSidebarGroups: SidebarGroup[] = [
  {
    id: "personal_workspace",
    label: "فضای کاری شخصی",
    icon: <Activity className="w-5 h-5" />,
    items: [
      { id: "personal_notes", label: "یادداشت‌های شخصی", roles: ["admin", "accountant", "manager", "cashier", "viewer"] },
      { id: "welcome_page", label: "صفحه اصلی (خوش‌آمدگویی)", roles: ["admin", "accountant", "manager", "cashier", "viewer"] },
    ],
  },

  {
    id: "sales_operations",
    label: "عملیات فروش",
    icon: <ShoppingCart className="w-5 h-5" />,
    items: [
      { id: "create_sale", label: "ثبت فاکتور فروش", roles: ["admin", "cashier", "accountant"] },
      { id: "create_sale_return", label: "برگشت از فروش", roles: ["admin", "cashier", "accountant"] },
      { id: "list_sale", label: "لیست فاکتورهای فروش", roles: ["admin", "cashier", "accountant", "viewer"] },
      { id: "list_sale_return", label: "لیست برگشتی‌های فروش", roles: ["admin", "cashier", "accountant", "viewer"] },
      { id: "analytical_dashboard", label: "داشبورد تحلیلی فروش", roles: ["admin", "accountant", "viewer"] },
    ],
  },
  {
    id: "purchase_operations",
    label: "عملیات خرید",
    icon: <PackagePlus className="w-5 h-5" />,
    items: [
      { id: "create_purchase", label: "ثبت فاکتور خرید", roles: ["admin", "accountant"] },
      { id: "create_purchase_return", label: "برگشت از خرید", roles: ["admin", "accountant"] },
      { id: "list_purchase", label: "لیست فاکتورهای خرید", roles: ["admin", "accountant", "viewer"] },
      { id: "list_purchase_return", label: "لیست برگشتی‌های خرید", roles: ["admin", "accountant", "viewer"] },
      { id: "product_last_prices", label: "آخرین قیمت‌های کالا", roles: ["admin", "accountant", "viewer"] },
      { id: "order_list", label: "لیست سفارش خرید (نیازسنجی)", roles: ["admin", "accountant", "viewer"] },
    ],
  },
  {
    id: "products_management",
    label: "کالا و خدمات",
    icon: <Package className="w-5 h-5" />,
    items: [
      { id: "products", label: "مدیریت کالا و خدمات", roles: ["admin", "accountant"] },
      { id: "bulk_barcode_generator", label: "تولید گروهی بارکد", roles: ["admin", "accountant"] },
      { id: "product_categories", label: "گروه‌بندی کالاها", roles: ["admin", "accountant"] },
      { id: "product_view", label: "کارت کالا", roles: ["admin", "accountant", "viewer"] },
      { id: "quick_price_inquiry", label: "استعلام سریع قیمت", roles: ["admin", "accountant", "cashier", "viewer"] },
      { id: "kardex", label: "کاردکس کالا (تاریخچه)", roles: ["admin", "accountant", "viewer"] },
      { id: "inventory_report", label: "گزارش موجودی کالا", roles: ["admin", "accountant", "viewer"] },
    ],
  },
  {
    id: "warehousing",
    label: "انبارداری",
    icon: <Box className="w-5 h-5" />,
    items: [
      { id: "warehouses", label: "مدیریت انبارها", roles: ["admin", "accountant"] },
      { id: "create_warehouse_doc", label: "صدور رسید/حواله انبار", roles: ["admin", "accountant"] },
      { id: "list_warehouse_docs", label: "لیست اسناد انبار", roles: ["admin", "accountant", "viewer"] },
      { id: "stocktaking", label: "انبارگردانی", roles: ["admin", "manager"] },
      { id: "kardex", label: "کاردکس کالا (تاریخچه)", roles: ["admin", "accountant", "viewer"] },
      { id: "inventory_report", label: "گزارش موجودی انبارها", roles: ["admin", "accountant", "viewer"] },
    ],
  },
  {
    id: "persons",
    label: "مدیریت اشخاص و CRM",
    icon: <Users className="w-5 h-5" />,
    items: [
      { id: "persons", label: "مدیریت اشخاص", roles: ["admin", "accountant", "cashier"] },
      { id: "person_groups", label: "گروه‌بندی اشخاص", roles: ["admin", "accountant"] },
      { id: "person_roles", label: "نقش‌های اشخاص", roles: ["admin", "accountant"] },
      { id: "person_categories", label: "برچسب‌ها و دسته‌بندی‌ها", roles: ["admin", "accountant"] },
      { id: "person_profile", label: "پروفایل شخص", roles: ["admin", "accountant", "cashier", "viewer"] },
      { id: "person_opening_balances", label: "مانده اول دوره اشخاص", roles: ["admin", "accountant"] },
      { id: "person_ledger", label: "دفتر کل اشخاص", roles: ["admin", "accountant", "viewer"] },
      { id: "debts_credits", label: "گزارش بدهکاران و بستانکاران", roles: ["admin", "accountant", "viewer"] },
      { id: "crm_dashboard", label: "داشبورد CRM", roles: ["admin", "viewer"] },
    ],
  },
  {
    id: "banking",
    label: "خزانه و بانکداری",
    icon: <CreditCard className="w-5 h-5" />,
    items: [
      { id: "accounts", label: "حساب‌های بانکی", roles: ["admin", "accountant"] },
      { id: "cashboxes", label: "صندوق‌ها", roles: ["admin", "accountant", "cashier"] },
      { id: "transfer", label: "انتقال وجه بین حساب‌ها", roles: ["admin", "accountant"] },
    ],
  },
  {
    id: "receipts_payments",
    label: "دریافت و پرداخت",
    icon: <ArrowRightLeft className="w-5 h-5" />,
    items: [
      { id: "create_receive_receipt", label: "ثبت رسید دریافت وجه", roles: ["admin", "accountant", "cashier"] },
      { id: "list_receive_receipt", label: "لیست رسیدهای دریافت", roles: ["admin", "accountant", "viewer"] },
      { id: "create_pay_receipt", label: "ثبت رسید پرداخت وجه", roles: ["admin", "accountant"] },
      { id: "list_pay_receipt", label: "لیست رسیدهای پرداخت", roles: ["admin", "accountant", "viewer"] },
      { id: "quick_refund", label: "استرداد سریع", roles: ["admin", "accountant", "cashier"] },
      { id: "invoice_allocation", label: "تخصیص مبالغ به فاکتورها", roles: ["admin", "accountant"] },
    ],
  },
  {
    id: "checks_management",
    label: "مدیریت چک و اسناد",
    icon: <BookOpen className="w-5 h-5" />,
    items: [
      { id: "check_panel", label: "پنل جامع مدیریت چک", roles: ["admin", "accountant", "manager", "viewer"] },
      { id: "checkbooks", label: "دسته چک ها", roles: ["admin", "accountant", "manager"] },
      { id: "issue_check_form", label: "صدور چک", roles: ["admin", "accountant", "manager"] },
      { id: "issued_checks_page", label: "لیست چک‌های پرداختی", roles: ["admin", "accountant", "manager", "viewer"] },
      { id: "check_card", label: "کارت/برگه چک", roles: ["admin", "accountant", "manager", "viewer"] },
    ],
  },
    {
    id: "loans_management",
    label: "وام و تسهیلات",
    icon: <Calculator className="w-5 h-5" />,
    items: [
      { id: "loans_dashboard", label: "داشبورد وام", roles: ["admin", "accountant", "manager"] },
      { id: "loans_list", label: "لیست وام‌ها", roles: ["admin", "accountant", "manager"] },
      { id: "loans_create", label: "ثبت وام جدید", roles: ["admin", "accountant", "manager"] },
      { id: "loans_payment", label: "پرداخت اقساط", roles: ["admin", "accountant", "manager"] },
      { id: "loans_arrears", label: "معوقات", roles: ["admin", "accountant", "manager"] },
      { id: "loans_reports", label: "گزارشات", roles: ["admin", "accountant", "manager"] },
      { id: "loans_settings", label: "تنظیمات", roles: ["admin", "accountant", "manager"] },
    ],
  },
  {
    id: "salary",
    label: "حقوق و دستمزد",
    icon: <UserCheck className="w-5 h-5" />,
    items: [

      { id: "payroll_settings", label: "تنظیمات کارگاه و احکام", roles: ["admin", "manager"] },

      { id: "employee_profiles", label: "تکمیل اطلاعات پرسنلی", roles: ["admin", "accountant", "manager"] },
      { id: "employee_contracts", label: "قراردادها", roles: ["admin", "accountant", "manager"] },
      { id: "employee_orders", label: "احکام کارگزینی", roles: ["admin", "accountant", "manager"] },
      { id: "daily_attendance", label: "ورود و خروج روزانه", roles: ["admin", "accountant", "manager", "viewer"] },
      { id: "monthly_attendance", label: "کارکرد ماهانه پرسنل", roles: ["admin", "accountant", "manager", "viewer"] },
      { id: "payslips", label: "فیش حقوقی", roles: ["admin", "accountant", "manager", "viewer"] },
    ],
  },
  {
    id: "accounting_core",
    label: "حسابداری مالی (دوبل)",
    icon: <Activity className="w-5 h-5" />,
    items: [
      { id: "financial_years", label: "مدیریت سال‌های مالی", roles: ["admin", "accountant"] },
      { id: "chart_of_accounts", label: "کدینگ حساب‌ها (شجره)", roles: ["admin", "accountant"] },
      { id: "accounting_opening_balances", label: "ثبت اسناد افتتاحیه", roles: ["admin", "accountant"] },
      { id: "accounting_doc_create", label: "صدور سند حسابداری دستی", roles: ["admin", "accountant"] },
      { id: "accounting_docs_list", label: "لیست اسناد حسابداری", roles: ["admin", "accountant", "viewer"] },
      { id: "accounting_verification", label: "تراز آزمایشی و بررسی اسناد", roles: ["admin", "accountant", "viewer"] },
      { id: "accounting_auto_sync", label: "صدور اتوماتیک اسناد معوقه", roles: ["admin", "accountant"] },
      { id: "financial_report", label: "داشبورد و ترازنامه مالی", roles: ["admin", "accountant", "viewer"] },
    ],
  },
  {
    id: "reports",
    label: "مرکز گزارشات جامع",
    icon: <BarChart3 className="w-5 h-5" />,
    items: [
      { id: "analytical_dashboard", label: "داشبورد تحلیلی جامع", roles: ["admin", "accountant", "viewer"] },
      { id: "financial_report", label: "داشبورد مالی", roles: ["admin", "accountant", "viewer"] },
      { id: "crm_dashboard", label: "داشبورد CRM", roles: ["admin", "viewer"] },
      { id: "inventory_report", label: "گزارش موجودی کالا", roles: ["admin", "accountant", "viewer"] },
      { id: "kardex", label: "کاردکس کالا", roles: ["admin", "accountant", "viewer"] },
      { id: "debts_credits", label: "بدهکاران و بستانکاران", roles: ["admin", "accountant", "viewer"] },
      { id: "person_ledger", label: "دفتر کل اشخاص", roles: ["admin", "accountant", "viewer"] },
      { id: "product_last_prices", label: "آخرین قیمت‌های کالا", roles: ["admin", "accountant", "viewer"] },
      { id: "accounting_verification", label: "تراز آزمایشی", roles: ["admin", "accountant", "viewer"] },
    ],
  },
  {
    id: "messaging_system",
    label: "پیامک و اطلاع‌رسانی",
    icon: <MessageSquare className="w-5 h-5" />,
    items: [
      { id: "send_message", label: "ارسال پیام", roles: ["admin", "manager", "accountant"] },
      { id: "sms_templates", label: "مدیریت قالب‌ها", roles: ["admin", "manager"] },
      { id: "messaging_channels", label: "تنظیمات کانال‌ها", roles: ["admin"] },
      { id: "messaging_logs", label: "گزارشات ارسال", roles: ["admin", "manager"] },
    ],
  },
  {
    id: "admin",
    label: "تنظیمات و ادمین",
    icon: <Settings className="w-5 h-5" />,
    items: [
      { id: "settings", label: "تنظیمات پایه‌ای سیستم", roles: ["admin"] },
      { id: "users_manager", label: "مدیریت دسترسی کاربران", roles: ["admin"] },
      { id: "data_reconciliation", label: "تطبیق و اصلاح داده‌ها", roles: ["admin"] },
      { id: "checklist", label: "چک‌لیست سیستم", roles: ["admin"] },
      { id: "system_diagnostics", label: "عیب‌یابی سیستم", roles: ["admin"] },
      { id: "system_info", label: "جزئیات سیستم", roles: ["admin", "manager", "accountant"] },
      { id: "system_logs", label: "لاگ عملیات کاربران", roles: ["admin"] },
      { id: "database_logs", label: "لاگ دیتابیس", roles: ["admin"] },
      { id: "database", label: "مدیریت پایگاه داده", roles: ["admin"] },
      { id: "update", label: "به‌روزرسانی نرم‌افزار", roles: ["admin"] },
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
        icon: <Calendar className="w-5 h-5" />,
        items: [
          {
            id: "financial_years",
            label: "تعریف و مدیریت سال مالی",
            roles: ["admin", "accountant"],
          },
          {
            id: "settings",
            label: "تنظیمات پایه‌ای (تعیین تقویم)",
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
        return [
          "sales_operations",
          "purchase_operations",
          "products_management",
          "persons",
          "receipts_payments",
          "reports",
        ].includes(g.id) || g.id === "personal_workspace";
      }
      if (systemModule === "inventory") {
        return ["products_management", "warehousing", "reports"].includes(g.id) || g.id === "personal_workspace";
      }
      if (systemModule === "accounting") {
        return [
          "accounting_core",
          "banking",
          "receipts_payments",
          "checks_management",
          "loans_management",
          "salary",
          "persons",
          "reports",
        ].includes(g.id) || g.id === "personal_workspace";
      }
      if (systemModule === "admin") {
        return ["admin", "reports"].includes(g.id) || g.id === "personal_workspace";
      }
      if (systemModule === "crm") {
        return ["persons", "sales_operations", "messaging_system", "reports"].includes(g.id) || g.id === "personal_workspace";
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
      // For specific modules, we can filter what is shown inside the 'reports' group if we want.
      // But the user requested reports of each section to be in that section. We already added them.
      // If the user wants ALL reports in the report group to be filtered by module, we can do this:
      if (g.id === "reports" && systemModule !== "all" && systemModule !== "selector") {
        return {
          ...g,
          items: g.items.filter((item) => {
            if (systemModule === "commerce") return ["analytical_dashboard", "inventory_report", "product_last_prices"].includes(item.id);
            if (systemModule === "inventory") return ["inventory_report", "kardex"].includes(item.id);
            if (systemModule === "accounting") return ["financial_report", "analytical_dashboard", "person_ledger", "debts_credits", "accounting_verification"].includes(item.id);
            if (systemModule === "admin") return ["analytical_dashboard", "financial_report"].includes(item.id);
            if (systemModule === "crm") return ["crm_dashboard", "person_ledger", "analytical_dashboard"].includes(item.id);
            if (systemModule === "hr") return ["analytical_dashboard"].includes(item.id);
            if (systemModule === "reports_module") return true;
            return true;
          }),
        };
      }
      
      // Filter other sections based on module if needed, but usually the section filter is enough.
      return g;
    });
}
