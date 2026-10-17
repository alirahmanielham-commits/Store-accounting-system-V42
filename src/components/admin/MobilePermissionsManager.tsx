import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Shield,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  Users,
  Search,
  Key,
  Lock,
  Unlock,
  AlertTriangle,
  Zap,
  Receipt,
  BookOpen,
  ShoppingBag,
  Coins,
  RefreshCw,
  Plus,
  Trash2,
  Laptop,
  FileText,
  Copy,
  Download,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";
import { User } from "../../types";

export interface MobileUserPermission {
  userId: string;
  userName: string;
  userRole: string;
  
  // Treasury
  canCreateReceiveReceipt: boolean;
  canCreatePayReceipt: boolean;
  canViewReceiptsList: boolean;
  
  // Commercial
  canCreateSaleInvoice: boolean;
  canCreatePurchaseInvoice: boolean;
  canViewInvoicesList: boolean;
  canQuickPriceInquiry: boolean;
  canManageProducts: boolean;

  // Checks
  canReceiveCheck: boolean;
  canPayCheck: boolean;
  canViewCheckDashboard: boolean;

  // Persons
  canManagePersons: boolean;
  canViewPersonLedger: boolean;
  canViewPersonProfile: boolean;

  // Reports
  canViewDebtorsReport: boolean;
  canViewDebtorsShowcase: boolean;

  // Security & Hardware
  allowedDeviceIds: string[];
  maxActiveSessions: number;
  updatedAt?: string;
}

const DEFAULT_PERMISSIONS = (userId: string, userName: string, role: string): MobileUserPermission => ({
  userId,
  userName,
  userRole: role,
  canCreateReceiveReceipt: true,
  canCreatePayReceipt: role === "admin" || role === "accountant",
  canViewReceiptsList: true,
  canCreateSaleInvoice: true,
  canCreatePurchaseInvoice: role === "admin" || role === "accountant",
  canViewInvoicesList: true,
  canQuickPriceInquiry: true,
  canManageProducts: role === "admin" || role === "accountant",
  canReceiveCheck: true,
  canPayCheck: role === "admin" || role === "accountant",
  canViewCheckDashboard: true,
  canManagePersons: true,
  canViewPersonLedger: true,
  canViewPersonProfile: true,
  canViewDebtorsReport: true,
  canViewDebtorsShowcase: true,
  allowedDeviceIds: [],
  maxActiveSessions: 2,
});

interface MobilePermissionsManagerProps {
  users?: User[];
  showNotification?: (message: string, type: "success" | "error" | "warning" | "info") => void;
}

export default function MobilePermissionsManager({
  users = [],
  showNotification,
}: MobilePermissionsManagerProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [permissionsMap, setPermissionsMap] = useState<Record<string, MobileUserPermission>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState("");

  // Load saved mobile permissions from localStorage / API
  useEffect(() => {
    try {
      const saved = localStorage.getItem("taraz_mobile_permissions_map");
      if (saved) {
        setPermissionsMap(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load mobile permissions", e);
    }
  }, []);

  // Initialize selected user
  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      setSelectedUserId(String(users[0].id));
    }
  }, [users, selectedUserId]);

  const selectedUser = users.find((u) => String(u.id) === selectedUserId) || users[0];

  const currentPermission: MobileUserPermission =
    permissionsMap[selectedUserId] ||
    (selectedUser
      ? DEFAULT_PERMISSIONS(String(selectedUser.id), selectedUser.name, selectedUser.role)
      : DEFAULT_PERMISSIONS("guest", "کاربر", "user"));

  const handleToggle = (key: keyof MobileUserPermission) => {
    if (!selectedUserId) return;
    setPermissionsMap((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...currentPermission,
        [key]: !currentPermission[key],
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const handleApplyRolePreset = (preset: "sales_rep" | "cashier" | "warehouse" | "admin") => {
    if (!selectedUserId) return;
    let presetPerms: Partial<MobileUserPermission> = {};

    if (preset === "sales_rep") {
      presetPerms = {
        canCreateReceiveReceipt: true,
        canCreatePayReceipt: false,
        canViewReceiptsList: true,
        canCreateSaleInvoice: true,
        canCreatePurchaseInvoice: false,
        canViewInvoicesList: true,
        canQuickPriceInquiry: true,
        canManageProducts: false,
        canReceiveCheck: true,
        canPayCheck: false,
        canViewCheckDashboard: false,
        canManagePersons: true,
        canViewPersonLedger: true,
        canViewPersonProfile: true,
        canViewDebtorsReport: true,
        canViewDebtorsShowcase: true,
      };
    } else if (preset === "cashier") {
      presetPerms = {
        canCreateReceiveReceipt: true,
        canCreatePayReceipt: true,
        canViewReceiptsList: true,
        canCreateSaleInvoice: true,
        canCreatePurchaseInvoice: false,
        canViewInvoicesList: true,
        canQuickPriceInquiry: true,
        canManageProducts: false,
        canReceiveCheck: true,
        canPayCheck: true,
        canViewCheckDashboard: true,
        canManagePersons: true,
        canViewPersonLedger: true,
        canViewPersonProfile: true,
        canViewDebtorsReport: true,
        canViewDebtorsShowcase: true,
      };
    } else if (preset === "warehouse") {
      presetPerms = {
        canCreateReceiveReceipt: false,
        canCreatePayReceipt: false,
        canViewReceiptsList: false,
        canCreateSaleInvoice: false,
        canCreatePurchaseInvoice: true,
        canViewInvoicesList: true,
        canQuickPriceInquiry: true,
        canManageProducts: true,
        canReceiveCheck: false,
        canPayCheck: false,
        canViewCheckDashboard: false,
        canManagePersons: false,
        canViewPersonLedger: false,
        canViewPersonProfile: false,
        canViewDebtorsReport: false,
        canViewDebtorsShowcase: false,
      };
    } else if (preset === "admin") {
      presetPerms = {
        canCreateReceiveReceipt: true,
        canCreatePayReceipt: true,
        canViewReceiptsList: true,
        canCreateSaleInvoice: true,
        canCreatePurchaseInvoice: true,
        canViewInvoicesList: true,
        canQuickPriceInquiry: true,
        canManageProducts: true,
        canReceiveCheck: true,
        canPayCheck: true,
        canViewCheckDashboard: true,
        canManagePersons: true,
        canViewPersonLedger: true,
        canViewPersonProfile: true,
        canViewDebtorsReport: true,
        canViewDebtorsShowcase: true,
      };
    }

    setPermissionsMap((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...currentPermission,
        ...presetPerms,
        updatedAt: new Date().toISOString(),
      },
    }));

    showNotification?.("قالب دسترسی نقشی با موفقیت اعمال شد", "info");
  };

  const handleAddDevice = () => {
    if (!newDeviceId.trim()) return;
    const existing = currentPermission.allowedDeviceIds || [];
    if (existing.includes(newDeviceId.trim())) {
      showNotification?.("این شناسه دستگاه قبلاً اضافه شده است", "warning");
      return;
    }

    setPermissionsMap((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...currentPermission,
        allowedDeviceIds: [...existing, newDeviceId.trim()],
      },
    }));
    setNewDeviceId("");
    showNotification?.("شناسه دستگاه جدید به لیست مجاز کاربر اضافه شد", "success");
  };

  const handleRemoveDevice = (devId: string) => {
    setPermissionsMap((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...currentPermission,
        allowedDeviceIds: (currentPermission.allowedDeviceIds || []).filter((id) => id !== devId),
      },
    }));
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    try {
      localStorage.setItem("taraz_mobile_permissions_map", JSON.stringify(permissionsMap));
      showNotification?.("تنظیمات دسترسی اپلیکیشن همراه با موفقیت ذخیره و اعمال شد", "success");
    } catch (e) {
      showNotification?.("خطا در ذخیره‌سازی دسترسی‌های همراه", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptText, setPromptText] = useState("");

  const handleOpenPromptModal = async () => {
    setShowPromptModal(true);
    if (!promptText) {
      setPromptLoading(true);
      try {
        const res = await fetch("/STANDALONE_MOBILE_APP_PROMPT.md");
        if (res.ok) {
          const text = await res.text();
          setPromptText(text);
        } else {
          setPromptText("// فایل STANDALONE_MOBILE_APP_PROMPT.md یافت نشد.");
        }
      } catch (err) {
        setPromptText("// خطا در دریافت متن پرامپت.");
      } finally {
        setPromptLoading(false);
      }
    }
  };

  const handleCopyPrompt = () => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
    setPromptCopied(true);
    showNotification?.("متن پرامپت جامع اپ موبایل در کلیپ‌بورد کپی شد", "success");
    setTimeout(() => setPromptCopied(false), 3000);
  };

  const handleDownloadPrompt = () => {
    if (!promptText) return;
    const blob = new Blob([promptText], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "STANDALONE_MOBILE_APP_PROMPT.md");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification?.("فایل پرامپت مستر دانلود شد", "success");
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 text-right select-none" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 mb-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shadow-inner">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>مدیریت دسترسی‌های اپلیکیشن همراه (Mobile Permission Matrix)</span>
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              تنظیم و کنترل سطوح دسترسی کاربران آنلاین در اپلیکیشن موبایل، ثبت دستگاه‌های مجاز و محدودیت نشست‌ها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenPromptModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs transition-all flex items-center gap-2 shadow-md shadow-violet-600/30 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>پرامپت هوش مصنوعی اپ موبایل (Master Prompt)</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-all flex items-center gap-2 shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>ذخیره نهایی دسترسی‌های همراه</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* User Selection Sidebar */}
        <div className="lg:col-span-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col h-[620px]">
          <div className="text-xs font-black text-slate-800 mb-2 px-1 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>انتخاب کاربر سیستم:</span>
          </div>

          <div className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام یا نام کاربری..."
              className="w-full pr-8 pl-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
            {filteredUsers.map((u) => {
              const isSelected = String(u.id) === selectedUserId;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUserId(String(u.id))}
                  className={`w-full text-right p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs font-black"
                      : "bg-white hover:bg-slate-100/80 border border-slate-200/60 text-slate-800 font-bold"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs truncate">{u.name}</span>
                    <span
                      className={`text-[10px] mt-0.5 font-medium ${
                        isSelected ? "text-indigo-200" : "text-slate-400"
                      }`}
                    >
                      @{u.username} · {u.role === "admin" ? "مدیر" : "کاربر"}
                    </span>
                  </div>
                  {isSelected && <Shield className="w-4 h-4 text-indigo-200 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Permission Configuration Matrix */}
        <div className="lg:col-span-3 space-y-5">
          {/* Active User Summary & Role Presets */}
          <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                {selectedUser?.name.charAt(0) || "U"}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  تنظیم سطح دسترسی همراه: {selectedUser?.name}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  نام کاربری: @{selectedUser?.username} | نقش سازمانی: {selectedUser?.role}
                </span>
              </div>
            </div>

            {/* Quick Role Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 ml-1">قالب‌های آماده:</span>
              <button
                type="button"
                onClick={() => handleApplyRolePreset("sales_rep")}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                فروشنده میدانی
              </button>
              <button
                type="button"
                onClick={() => handleApplyRolePreset("cashier")}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                تحویل‌دار / صندوق‌دار
              </button>
              <button
                type="button"
                onClick={() => handleApplyRolePreset("warehouse")}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                انباردار
              </button>
              <button
                type="button"
                onClick={() => handleApplyRolePreset("admin")}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                دسترسی کامل (مدیر)
              </button>
            </div>
          </div>

          {/* Granular Mobile Operations Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Module 1: Treasury (دریافت و پرداخت) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-3xs">
              <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-100 text-teal-700 font-black text-xs">
                <Receipt className="w-4 h-4 text-teal-600" />
                <span>۱. عملیات خزانه‌داری (دریافت و پرداخت)</span>
              </div>
              <div className="space-y-2.5">
                <ToggleRow
                  label="ثبت رسید دریافت وجه (ورودی)"
                  desc="واریز نقدی، پوز، کارت به کارت و چک دریافتی"
                  checked={currentPermission.canCreateReceiveReceipt}
                  onChange={() => handleToggle("canCreateReceiveReceipt")}
                />
                <ToggleRow
                  label="ثبت رسید پرداخت وجه (خروجی)"
                  desc="پرداخت به طرف‌حساب، برداشت از صندوق یا بانک"
                  checked={currentPermission.canCreatePayReceipt}
                  onChange={() => handleToggle("canCreatePayReceipt")}
                />
                <ToggleRow
                  label="مشاهده لیست و گردش رسیدها"
                  desc="جستجو و مرور رسیدهای ثبت شده همراه"
                  checked={currentPermission.canViewReceiptsList}
                  onChange={() => handleToggle("canViewReceiptsList")}
                />
              </div>
            </div>

            {/* Module 2: Commercial & Invoices (فاکتور و کالا) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-3xs">
              <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-100 text-emerald-700 font-black text-xs">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>۲. فاکتورها، انبار و کالاهـا</span>
              </div>
              <div className="space-y-2.5">
                <ToggleRow
                  label="صدور و ثبت فاکتور فروش کالا"
                  desc="فروش نقدی یا نسیه و ثبت خودکار سند"
                  checked={currentPermission.canCreateSaleInvoice}
                  onChange={() => handleToggle("canCreateSaleInvoice")}
                />
                <ToggleRow
                  label="ثبت فاکتور خرید کالا"
                  desc="ورود کالا به انبار و ثبت بدهکاری تامین‌کننده"
                  checked={currentPermission.canCreatePurchaseInvoice}
                  onChange={() => handleToggle("canCreatePurchaseInvoice")}
                />
                <ToggleRow
                  label="تعریف کالا و استعلام قیمت آنلاین"
                  desc="استعلام موجودی، بارکدخوان و قیمت کالا"
                  checked={currentPermission.canManageProducts}
                  onChange={() => handleToggle("canManageProducts")}
                />
              </div>
            </div>

            {/* Module 3: Checks (مدیریت چک‌ها) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-3xs">
              <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-100 text-sky-700 font-black text-xs">
                <BookOpen className="w-4 h-4 text-sky-600" />
                <span>۳. اسناد تجاری و چک‌ها</span>
              </div>
              <div className="space-y-2.5">
                <ToggleRow
                  label="ثبت برگه چک دریافتی جدید"
                  desc="ثبت مشخصات چک صیادی مشتریان"
                  checked={currentPermission.canReceiveCheck}
                  onChange={() => handleToggle("canReceiveCheck")}
                />
                <ToggleRow
                  label="ثبت چک پرداختی به طرف‌حساب"
                  desc="صدور برگه چک از دسته‌چک‌های شرکت"
                  checked={currentPermission.canPayCheck}
                  onChange={() => handleToggle("canPayCheck")}
                />
                <ToggleRow
                  label="مشاهده کارتابل و داشبورد چک‌ها"
                  desc="وضعیت سررسیدها، وصول و خرج چک"
                  checked={currentPermission.canViewCheckDashboard}
                  onChange={() => handleToggle("canViewCheckDashboard")}
                />
              </div>
            </div>

            {/* Module 4: Persons & Debtors (اشخاص و گزارشات) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-3xs">
              <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-100 text-purple-700 font-black text-xs">
                <Users className="w-4 h-4 text-purple-600" />
                <span>۴. اشخاص، معین و مطالبات</span>
              </div>
              <div className="space-y-2.5">
                <ToggleRow
                  label="تعریف و ویرایش اطلاعات اشخاص"
                  desc="ایجاد طرف‌حساب جدید و ذخیره شماره تماس"
                  checked={currentPermission.canManagePersons}
                  onChange={() => handleToggle("canManagePersons")}
                />
                <ToggleRow
                  label="مشاهده کارت حساب (دفتر معین)"
                  desc="گردش بدهکار/بستانکار و مانده نهایی"
                  checked={currentPermission.canViewPersonLedger}
                  onChange={() => handleToggle("canViewPersonLedger")}
                />
                <ToggleRow
                  label="گزارش بدهکاران و ویترین مطالبات"
                  desc="صورت بدهی مشتریان و اخطارهای معوق"
                  checked={currentPermission.canViewDebtorsReport}
                  onChange={() => handleToggle("canViewDebtorsReport")}
                />
              </div>
            </div>
          </div>

          {/* Security & Device Binding */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-slate-800 font-black text-xs">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>ثبت دستگاه‌های همراه مجاز (Hardware Fingerprinting & Device Binding)</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                حداکثر نشست‌های همزمان: {currentPermission.maxActiveSessions}
              </span>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                placeholder="وارد کردن شناسه یا کد سخت‌افزاری گوشی همراه (Device ID)..."
                className="flex-1 px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddDevice}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن دستگاه</span>
              </button>
            </div>

            {/* Allowed Devices List */}
            <div className="space-y-1.5">
              {(currentPermission.allowedDeviceIds || []).length === 0 ? (
                <p className="text-xs text-slate-400 font-medium py-2">
                  هیچ قفل سخت‌افزاری ثبت نشده است (کاربر می‌تواند با هر گوشی هوشمندی وارد شود).
                </p>
              ) : (
                currentPermission.allowedDeviceIds.map((dev) => (
                  <div
                    key={dev}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{dev}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDevice(dev)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                      title="حذف دستگاه"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Master Mobile AI Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>پرامپت جامع هوش مصنوعی جهت ساخت اپلیکیشن موبایل تراز</span>
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full font-bold">
                      React Native + Expo
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    طراحی‌شده برای ۵ ماژول کامل (فروش/خرید با بارکدخوان، خزانه‌داری/صیاد، اشخاص و تگ، مطالبات، انبارگردانی) + صف آفلاین
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Action Bar */}
            <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>فایل مرجع: <code className="text-indigo-300 font-mono">public/STANDALONE_MOBILE_APP_PROMPT.md</code></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{promptCopied ? "کپی شد!" : "کپی کل پرامپت برای هوش مصنوعی"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPrompt}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود فایل (.md)</span>
                </button>
              </div>
            </div>

            {/* Modal Body / Code Preview */}
            <div className="p-5 flex-1 overflow-y-auto bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed select-text dir-ltr text-left">
              {promptLoading ? (
                <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span>در حال فراخوانی پرامپت جامع از سرور...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">{promptText}</pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400">
              <span>راهنما: این متن را کپی کرده و به عنوان دستور ساخت در Claude، Cursor یا ChatGPT وارد فرمایید.</span>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div
      onClick={onChange}
      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
        checked
          ? "bg-indigo-50/60 border-indigo-200 text-indigo-950"
          : "bg-slate-50/50 border-slate-200/70 text-slate-500 opacity-80"
      }`}
    >
      <div>
        <div className="text-xs font-black">{label}</div>
        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{desc}</p>
      </div>

      <button
        type="button"
        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors shrink-0 ${
          checked ? "bg-indigo-600 justify-end" : "bg-slate-300 justify-start"
        }`}
      >
        <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
      </button>
    </div>
  );
}
