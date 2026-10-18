import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  Plus,
  Search,
  Copy,
  Check,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Code,
  Terminal,
  Server,
  Activity,
  Calendar,
  Clock,
  Globe,
  Sliders,
  AlertTriangle,
  Send,
  Zap,
  CheckCircle2,
  XCircle,
  FileCode,
  Layers,
  Sparkles,
  Smartphone,
  Info,
  X,
  Filter,
  ArrowUpRight,
  UserCheck,
} from "lucide-react";

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  secretKey: string;
  userId: string;
  userName: string;
  userRole: string;
  scopes: string[];
  rateLimitPerMin: number;
  allowedIps: string;
  allowedOrigins: string;
  createdAt: string;
  expiresAt: string | null;
  status: "active" | "revoked" | "expired";
  lastUsedAt: string;
  lastUsedIp: string;
  totalRequestsCount: number;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  keyId: string;
  keyName: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  statusCode: number;
  ip: string;
  latencyMs: number;
  userAgent: string;
}

interface ApiManagementCenterProps {
  users?: any[];
  showNotification?: (message: string, type: "success" | "error" | "warning" | "info") => void;
}

const DEFAULT_SCOPES = [
  { id: "sales:read", name: "مشاهده فاکتورهای فروش و خرید", category: "فروش و تجاری" },
  { id: "sales:write", name: "صدور و ویرایش فاکتورهای فروش و خرید", category: "فروش و تجاری" },
  { id: "receipts:read", name: "مشاهده رسیدهای خزانه‌داری", category: "خزانه‌داری" },
  { id: "receipts:write", name: "ثبت رسید دریافت و پرداخت وجه", category: "خزانه‌داری" },
  { id: "persons:read", name: "مشاهده لیست اشخاص و مانده حساب", category: "اشخاص و مشتریان" },
  { id: "persons:write", name: "تعریف و ویرایش اطلاعات اشخاص", category: "اشخاص و مشتریان" },
  { id: "inventory:read", name: "استعلام موجودی کالا و قیمت‌گذاری", category: "انبارداری" },
  { id: "inventory:write", name: "ثبت انبارگردانی و شمارش کالا", category: "انبارداری" },
  { id: "reports:read", name: "مشاهده گزارشات مطالبات و بدهکاران", category: "گزارشات" },
  { id: "checks:read", name: "مشاهده کارتابل چک‌های صیادی", category: "چک‌ها" },
];

const INITIAL_API_KEYS: ApiKeyItem[] = [
  {
    id: "ak_sys_admin",
    name: "کلید مستر مدیر کل سیستم (Full Admin)",
    key: "taraz_mob_ak_admin_9f8a7b6c5d4e3f2a1b0c",
    secretKey: "taraz_mob_ak_admin_9f8a7b6c5d4e3f2a1b0c",
    userId: "1",
    userName: "مدیر ارشد سیستم",
    userRole: "admin",
    scopes: DEFAULT_SCOPES.map((s) => s.id),
    rateLimitPerMin: 600,
    allowedIps: "",
    allowedOrigins: "*",
    createdAt: "1403/01/01 - 09:00",
    expiresAt: null,
    status: "active",
    lastUsedAt: "هم‌اکنون",
    lastUsedIp: "192.168.1.10",
    totalRequestsCount: 14250,
  },
  {
    id: "ak_sales_rep",
    name: "اپلیکیشن همراه فروشنده میدانی (آقای احمدی)",
    key: "taraz_mob_ak_sales_rep_4e8f9a1b2c3d4e5f6a",
    secretKey: "taraz_mob_ak_sales_rep_4e8f9a1b2c3d4e5f6a",
    userId: "2",
    userName: "رضا احمدی",
    userRole: "user",
    scopes: ["sales:read", "sales:write", "receipts:read", "receipts:write", "persons:read", "inventory:read"],
    rateLimitPerMin: 120,
    allowedIps: "",
    allowedOrigins: "*",
    createdAt: "1403/06/15 - 14:30",
    expiresAt: "1404/06/15",
    status: "active",
    lastUsedAt: "۱۰ دقیقه پیش",
    lastUsedIp: "5.218.140.22",
    totalRequestsCount: 3840,
  },
  {
    id: "ak_warehouse",
    name: "تبلت انبار مرکزی و بارکدخوان (شمارش کالا)",
    key: "taraz_mob_ak_warehouse_7b8c9d0e1f2a3b4c5d",
    secretKey: "taraz_mob_ak_warehouse_7b8c9d0e1f2a3b4c5d",
    userId: "3",
    userName: "انباردار مرکزی",
    userRole: "accountant",
    scopes: ["inventory:read", "inventory:write", "sales:read"],
    rateLimitPerMin: 300,
    allowedIps: "192.168.1.0/24",
    allowedOrigins: "*",
    createdAt: "1403/07/01 - 08:15",
    expiresAt: null,
    status: "active",
    lastUsedAt: "۳ ساعت پیش",
    lastUsedIp: "192.168.1.55",
    totalRequestsCount: 1920,
  },
];

const INITIAL_LOGS: ApiLogEntry[] = [
  {
    id: "log_101",
    timestamp: "1403/07/25 - 12:25:10",
    keyId: "ak_sales_rep",
    keyName: "اپلیکیشن همراه فروشنده میدانی (آقای احمدی)",
    endpoint: "/api/v1/mobile/products/search",
    method: "GET",
    statusCode: 200,
    ip: "5.218.140.22",
    latencyMs: 38,
    userAgent: "TarazMobileApp/2.5.0 (Android 14)",
  },
  {
    id: "log_102",
    timestamp: "1403/07/25 - 12:24:45",
    keyId: "ak_sales_rep",
    keyName: "اپلیکیشن همراه فروشنده میدانی (آقای احمدی)",
    endpoint: "/api/v1/mobile/receipts/receive",
    method: "POST",
    statusCode: 200,
    ip: "5.218.140.22",
    latencyMs: 95,
    userAgent: "TarazMobileApp/2.5.0 (Android 14)",
  },
  {
    id: "log_103",
    timestamp: "1403/07/25 - 12:20:00",
    keyId: "ak_unknown",
    keyName: "درخواست بدون کلید معتبر",
    endpoint: "/api/v1/mobile/invoices/sale",
    method: "POST",
    statusCode: 401,
    ip: "185.220.101.5",
    latencyMs: 12,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5)",
  },
  {
    id: "log_104",
    timestamp: "1403/07/25 - 11:15:22",
    keyId: "ak_warehouse",
    keyName: "تبلت انبار مرکزی و بارکدخوان (شمارش کالا)",
    endpoint: "/api/v1/mobile/inventory/stocktaking",
    method: "POST",
    statusCode: 200,
    ip: "192.168.1.55",
    latencyMs: 44,
    userAgent: "TarazBarcodeScanner/1.1 (Expo SDK 51)",
  },
];

export default function ApiManagementCenter({
  users = [],
  showNotification,
}: ApiManagementCenterProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(() => {
    try {
      const saved = localStorage.getItem("taraz_api_management_keys_v2");
      return saved ? JSON.parse(saved) : INITIAL_API_KEYS;
    } catch {
      return INITIAL_API_KEYS;
    }
  });

  const [logs] = useState<ApiLogEntry[]>(INITIAL_LOGS);
  const [activeTab, setActiveTab] = useState<"keys" | "logs" | "sandbox">("keys");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "revoked" | "expired">("all");
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdSecretData, setCreatedSecretData] = useState<{ name: string; key: string } | null>(null);
  const [editingKey, setEditingKey] = useState<ApiKeyItem | null>(null);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("taraz_api_management_keys_v2", JSON.stringify(apiKeys));
    } catch (e) {
      console.error("Failed to save API keys", e);
    }
  }, [apiKeys]);

  const filteredKeys = useMemo(() => {
    return apiKeys.filter((k) => {
      if (statusFilter !== "all" && k.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        k.name.toLowerCase().includes(q) ||
        k.userName.toLowerCase().includes(q) ||
        k.key.toLowerCase().includes(q)
      );
    });
  }, [apiKeys, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = apiKeys.length;
    const active = apiKeys.filter((k) => k.status === "active").length;
    const totalRequests = apiKeys.reduce((acc, curr) => acc + (curr.totalRequestsCount || 0), 0);
    const blockedCount = logs.filter((l) => l.statusCode >= 400).length;
    return { total, active, totalRequests, blockedCount };
  }, [apiKeys, logs]);

  const handleCopyKey = (keyString: string, keyId: string) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKeyId(keyId);
    showNotification?.("کلید API در کلیپ‌بورد کپی شد", "success");
    setTimeout(() => setCopiedKeyId(null), 3000);
  };

  const handleToggleStatus = (keyId: string) => {
    setApiKeys((prev) =>
      prev.map((k) => {
        if (k.id === keyId) {
          const newStatus = k.status === "active" ? "revoked" : "active";
          const statusText = newStatus === "active" ? "فعال" : "غیرفعال/لغو";
          showNotification?.(`وضعیت کلید API به «${statusText}» تغییر یافت`, "info");
          return { ...k, status: newStatus };
        }
        return k;
      })
    );
  };

  const handleDeleteKey = (keyId: string) => {
    if (confirm("آیا از حذف این کلید API اطمینان دارید؟ تمامی ارتباطات اپلیکیشن همراه با این کلید قطع خواهد شد.")) {
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      showNotification?.("کلید API با موفقیت حذف گردید", "warning");
    }
  };

  const handleRegenerateKey = async (keyItem: ApiKeyItem) => {
    const cleanUser = (keyItem.userName || "user").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const randomHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const newKey = `taraz_mob_ak_${cleanUser}_${randomHex}`;

    setApiKeys((prev) =>
      prev.map((k) => (k.id === keyItem.id ? { ...k, key: newKey, secretKey: newKey, createdAt: "هم‌اکنون" } : k))
    );

    // Sync with backend
    try {
      await fetch("/api/v1/mobile/api-keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: keyItem.userId,
          username: keyItem.userName,
          role: keyItem.userRole,
          customApiKey: newKey,
        }),
      });
    } catch (e) {
      console.warn("Failed sync API key", e);
    }

    setCreatedSecretData({ name: keyItem.name, key: newKey });
    showNotification?.("کلید API با موفقیت بازسازی (`Rotate`) شد", "success");
  };

  return (
    <div className="bg-slate-50 min-h-[700px] rounded-3xl p-5 md:p-7 shadow-xs border border-slate-200/80 text-right select-none dir-rtl" dir="rtl">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 mb-6 shadow-md flex flex-wrap items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/30 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shadow-inner shrink-0">
            <Key className="w-7 h-7 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">مرکز مدیریت کلیدهای API و وب‌سرویس‌ها</h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full font-bold">
                API Security Gateway v2.5
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
              تعریف کلیدهای دسترسی، مدیریت احراز هویت اپلیکیشن موبایل، تعیین اسکوپ‌های دسترسی و نظارت بر ترافیک شبکه
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("sandbox")}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>تست آنلاین API (Sandbox)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>ایجاد کلید API جدید</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">کل کلیدهای صادرشده</span>
            <div className="text-xl font-black text-slate-900 mt-1 font-mono">{stats.total} کلید</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Key className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">کلیدهای فعال و معتبر</span>
            <div className="text-xl font-black text-emerald-700 mt-1 font-mono">{stats.active} فعال</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">مجموع درخواست‌ها</span>
            <div className="text-xl font-black text-slate-900 mt-1 font-mono">
              {stats.totalRequests.toLocaleString("fa-IR")}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">درخواست‌های مسدودشده</span>
            <div className="text-xl font-black text-rose-600 mt-1 font-mono">{stats.blockedCount} فراخوانی</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 mb-6 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("keys")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "keys"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Key className="w-4 h-4" />
            <span>لیست کلیدهای API فعال</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "logs"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>لاگ امنیتی فراخوانی‌ها (Audit Trail)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sandbox")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "sandbox"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>سندباکس تست درخواست‌ها</span>
          </button>
        </div>

        {activeTab === "keys" && (
          <div className="flex items-center gap-3">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                }`}
              >
                همه
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "active" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600"
                }`}
              >
                فعال
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("revoked")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "revoked" ? "bg-white text-rose-800 shadow-2xs" : "text-slate-600"
                }`}
              >
                غیرفعال
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام کلید، کاربر یا کلید..."
                className="w-full pr-8 pl-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-2xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: API KEYS LIST */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          {filteredKeys.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
              <Key className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
              <h3 className="text-sm font-black text-slate-800">هیچ کلید API با این مشخصات یافت نشد</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                می‌توانید با کلیک روی دکمه «ایجاد کلید API جدید»، کلید جدیدی برای اپلیکیشن موبایل صادر فرمایید.
              </p>
            </div>
          ) : (
            filteredKeys.map((item) => {
              const isCopied = copiedKeyId === item.id;
              const isActive = item.status === "active";

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-5 border transition-all ${
                    isActive
                      ? "border-slate-200/90 hover:border-indigo-300 shadow-xs"
                      : "border-slate-200 bg-slate-50/50 opacity-75"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          isActive
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}
                      >
                        <Key className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-slate-900">{item.name}</h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isActive ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {isActive ? "فعال و عملیاتی" : "غیرفعال / لغو شده"}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                            <span>کاربر: <strong className="text-slate-800">{item.userName}</strong> (@{item.userId})</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>آخرین فعالیت: <strong className="text-slate-700 font-mono">{item.lastUsedAt}</strong> ({item.lastUsedIp})</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyKey(item.key, item.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? "کپی شد" : "کپی کلید"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRegenerateKey(item)}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="بازسازی کلید API جدید"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>بازسازی (Rotate)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item.id)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isActive
                            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        }`}
                        title={isActive ? "غیرفعال‌سازی کلید" : "فعال‌سازی کلید"}
                      >
                        {isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteKey(item.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        title="حذف کلید"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* API Key Visual Code Block */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-300 flex items-center justify-between mb-3 dir-ltr text-left select-all">
                    <span className="truncate">{item.key}</span>
                    <span className="text-[10px] text-slate-500 font-sans ml-2 shrink-0">Header: X-API-Key</span>
                  </div>

                  {/* Scopes & Limits Grid */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-500 font-bold ml-1">دسترسی‌ها (Scopes):</span>
                      {item.scopes.map((s) => (
                        <span key={s} className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[10.5px] font-mono">
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-slate-500 font-medium">
                      <span>محدودیت نرخ: <strong className="text-slate-800 font-mono">{item.rateLimitPerMin} req/min</strong></span>
                      <span>•</span>
                      <span>مجموع فراخوانی‌ها: <strong className="text-indigo-600 font-mono">{item.totalRequestsCount.toLocaleString("fa-IR")}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>لاگ‌های امنیتی ورودی (Real-Time API Traffic Logs)</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">آخرین ۵۰ فراخوانی ثبت‌شده</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-black border-b border-slate-200">
                <tr>
                  <th className="p-3.5">زمان</th>
                  <th className="p-3.5">نام کلید API / کاربر</th>
                  <th className="p-3.5">اندپوینت (Endpoint)</th>
                  <th className="p-3.5">متد</th>
                  <th className="p-3.5">وضعیت HTTP</th>
                  <th className="p-3.5">آی‌پی کلاینت</th>
                  <th className="p-3.5">زمان پاسخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono text-slate-600">{log.timestamp}</td>
                      <td className="p-3.5 font-bold text-slate-800">{log.keyName}</td>
                      <td className="p-3.5 font-mono text-indigo-700 dir-ltr text-left">{log.endpoint}</td>
                      <td className="p-3.5 font-mono font-black">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${log.method === "GET" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${isSuccess ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          {log.statusCode} {isSuccess ? "OK" : "Forbidden"}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{log.ip}</td>
                      <td className="p-3.5 font-mono text-slate-500">{log.latencyMs} ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: API SANDBOX TESTER */}
      {activeTab === "sandbox" && (
        <ApiSandboxTester apiKeys={apiKeys} showNotification={showNotification} />
      )}

      {/* MODAL 1: CREATE API KEY */}
      {showCreateModal && (
        <CreateApiKeyModal
          users={users}
          onClose={() => setShowCreateModal(false)}
          onCreate={(newKeyData) => {
            setApiKeys((prev) => [newKeyData, ...prev]);
            setShowCreateModal(false);
            setCreatedSecretData({ name: newKeyData.name, key: newKeyData.key });
            showNotification?.("کلید API جدید با موفقیت ایجاد گردید", "success");
          }}
        />
      )}

      {/* MODAL 2: CREATED SECRET DISPLAY & CODE SNIPPETS */}
      {createdSecretData && (
        <CreatedSecretModal
          name={createdSecretData.name}
          apiKey={createdSecretData.key}
          onClose={() => setCreatedSecretData(null)}
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENT 1: API SANDBOX TESTER ---
function ApiSandboxTester({
  apiKeys,
  showNotification,
}: {
  apiKeys: ApiKeyItem[];
  showNotification?: (message: string, type: "success" | "error" | "warning" | "info") => void;
}) {
  const [selectedKeyId, setSelectedKeyId] = useState<string>(apiKeys[0]?.id || "");
  const [endpoint, setEndpoint] = useState<string>("/api/v1/mobile/products/search");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify({ personId: "per_101", amount: 1500000, note: "تست سند همراه" }, null, 2)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<any>(null);

  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId) || apiKeys[0];

  const handleSendTestRequest = async () => {
    setIsLoading(true);
    setResponseResult(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (selectedKey) {
        headers["X-API-Key"] = selectedKey.key;
      }

      const opts: RequestInit = {
        method,
        headers,
      };

      if (method === "POST") {
        opts.body = requestBody;
      }

      const res = await fetch(endpoint, opts);
      const data = await res.json();

      setResponseResult({
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        data,
      });

      if (res.ok) {
        showNotification?.(`پاسخ موفق (${res.status} OK) دریافت شد`, "success");
      } else {
        showNotification?.(`خطای ${res.status}: ${data.error || "تایید نشد"}`, "error");
      }
    } catch (e: any) {
      setResponseResult({
        status: 500,
        ok: false,
        data: { error: "ارتباط با سرور برقرار نشد", details: String(e) },
      });
      showNotification?.("خطا در برقراری ارتباط با سرور آزمایشی", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            <span>محیط تست هوشمند درخواست‌های API (API Sandbox Console)</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            تست زنده ارسال درخواست‌ها به وب‌سرویس همراه و بررسی لایه احراز هویت کلید API
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب کلید API تست:</label>
          <select
            value={selectedKeyId}
            onChange={(e) => setSelectedKeyId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
          >
            {apiKeys.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} ({k.userName})
              </option>
            ))}
            <option value="invalid_key">❌ کلید نامعتبر (جهت تست مسدودسازی 401)</option>
            <option value="no_key">⚠️ بدون ارسال کلید API (تست 401 Unauthorized)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب متد و اندپوینت:</label>
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="px-3 py-2 bg-slate-100 font-mono font-bold text-xs rounded-xl border border-slate-200 outline-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>

            <select
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 dir-ltr text-left"
            >
              <option value="/api/v1/mobile/products/search">/api/v1/mobile/products/search</option>
              <option value="/api/v1/mobile/persons/search">/api/v1/mobile/persons/search</option>
              <option value="/api/v1/mobile/receipts/receive">/api/v1/mobile/receipts/receive</option>
              <option value="/api/v1/mobile/invoices/sale">/api/v1/mobile/invoices/sale</option>
              <option value="/api/v1/mobile/reports/debtors">/api/v1/mobile/reports/debtors</option>
              <option value="/api/v1/mobile/products/quick-price">/api/v1/mobile/products/quick-price</option>
              <option value="/api/v1/mobile/inventory/stocktaking">/api/v1/mobile/inventory/stocktaking</option>
              <option value="/api/v1/mobile/sync/batch">/api/v1/mobile/sync/batch</option>
            </select>
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleSendTestRequest}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>ارسال درخواست آزمایشی</span>
          </button>
        </div>
      </div>

      {method === "POST" && (
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">بدنه درخواست JSON (Request Body):</label>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            rows={4}
            className="w-full p-3 bg-slate-900 text-amber-300 font-mono text-xs rounded-xl outline-none border border-slate-800 dir-ltr text-left"
          />
        </div>
      )}

      {/* Response Display Box */}
      {responseResult && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-800 flex items-center gap-2">
              <span>پاسخ سرور (Server JSON Response):</span>
              <span
                className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs ${
                  responseResult.ok
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-rose-100 text-rose-800 border border-rose-300"
                }`}
              >
                {responseResult.status} {responseResult.ok ? "OK" : "Error"}
              </span>
            </span>
          </div>

          <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 dir-ltr text-left max-h-80 select-all">
            {JSON.stringify(responseResult.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENT 2: CREATE API KEY MODAL ---
function CreateApiKeyModal({
  users,
  onClose,
  onCreate,
}: {
  users: any[];
  onClose: () => void;
  onCreate: (keyData: ApiKeyItem) => void;
}) {
  const [name, setName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ? String(users[0].id) : "1");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(DEFAULT_SCOPES.map((s) => s.id));
  const [rateLimit, setRateLimit] = useState(120);
  const [allowedIps, setAllowedIps] = useState("");
  const [expiration, setExpiration] = useState<"never" | "30" | "90" | "365">("never");

  const selectedUser = users.find((u) => String(u.id) === selectedUserId) || users[0] || { name: "کاربر سیستم", username: "user" };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cleanUser = (selectedUser.username || "user").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const randomHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const generatedKey = `taraz_mob_ak_${cleanUser}_${randomHex}`;

    let expDate = null;
    if (expiration !== "never") {
      const days = parseInt(expiration, 10);
      const d = new Date();
      d.setDate(d.getDate() + days);
      expDate = d.toLocaleDateString("fa-IR");
    }

    const newItem: ApiKeyItem = {
      id: `ak_${Date.now()}`,
      name: name.trim(),
      key: generatedKey,
      secretKey: generatedKey,
      userId: String(selectedUser.id || "1"),
      userName: selectedUser.name || selectedUser.username,
      userRole: selectedUser.role || "user",
      scopes: selectedScopes,
      rateLimitPerMin: rateLimit,
      allowedIps: allowedIps.trim(),
      allowedOrigins: "*",
      createdAt: new Date().toLocaleDateString("fa-IR"),
      expiresAt: expDate,
      status: "active",
      lastUsedAt: "هرگز",
      lastUsedIp: "-",
      totalRequestsCount: 0,
    };

    onCreate(newItem);
  };

  const handleToggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-right overflow-hidden dir-rtl">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">ایجاد کلید API اختصاصی جدید</h3>
              <p className="text-xs text-slate-500 font-medium">صدور کلید احراز هویت برای اپلیکیشن موبایل یا سیستم‌های جانبی</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نام یا عنوان کلید API *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: اپلیکیشن همراه فروشنده - آقای احمدی"
              className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تخصیص به کاربر سیستم:</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name} (@{u.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">مدت اعتبار کلید:</label>
              <select
                value={expiration}
                onChange={(e) => setExpiration(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              >
                <option value="never">بدون انقضا (دائمی)</option>
                <option value="30">۳۰ روزه</option>
                <option value="90">۹۰ روزه (۳ ماهه)</option>
                <option value="365">۱ ساله</option>
              </select>
            </div>
          </div>

          {/* Scopes Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">تعیین سطوح دسترسی مجاز (Scopes):</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
              {DEFAULT_SCOPES.map((scope) => {
                const checked = selectedScopes.includes(scope.id);
                return (
                  <label
                    key={scope.id}
                    onClick={() => handleToggleScope(scope.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      checked ? "bg-indigo-50/80 border-indigo-200 text-indigo-950 font-bold" : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => {}} className="rounded text-indigo-600" />
                    <span>{scope.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">محدودیت تعداد درخواست در دقیقه:</label>
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">محدودیت IPهای مجاز (اختیاری):</label>
              <input
                type="text"
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                placeholder="مثال: 192.168.1.0/24 (خالی = همه)"
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
              انصراف
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer">
              تایید و صدور کلید API
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT 3: CREATED SECRET DISPLAY MODAL WITH CODE SNIPPETS ---
function CreatedSecretModal({
  name,
  apiKey,
  onClose,
}: {
  name: string;
  apiKey: string;
  onClose: () => void;
}) {
  const [snippetType, setSnippetType] = useState<"curl" | "rn" | "node" | "python">("curl");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getSnippetText = () => {
    if (snippetType === "curl") {
      return `curl -X GET "https://yourdomain.com/api/v1/mobile/products/search?q=لوله" \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json"`;
    }
    if (snippetType === "rn") {
      return `import axios from 'axios';

const api = axios.create({
  baseURL: 'https://yourdomain.com/api/v1/mobile',
  headers: {
    'X-API-Key': '${apiKey}',
    'Content-Type': 'application/json'
  }
});

// Example Request
const response = await api.get('/products/search');`;
    }
    if (snippetType === "node") {
      return `const response = await fetch('https://yourdomain.com/api/v1/mobile/products/search', {
  method: 'GET',
  headers: {
    'X-API-Key': '${apiKey}',
    'Content-Type': 'application/json'
  }
});
const data = await response.json();`;
    }
    return `import requests

headers = {
    'X-API-Key': '${apiKey}',
    'Content-Type': 'application/json'
}

response = requests.get('https://yourdomain.com/api/v1/mobile/products/search', headers=headers)
print(response.json())`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl text-white overflow-hidden shadow-2xl text-right dir-rtl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">کلید API با موفقیت صادر شد</h3>
              <p className="text-xs text-slate-400 font-medium">{name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 p-3.5 rounded-2xl text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>توجه: این کلید را در جای امن کپی کنید. از این پس برای دسترسی به دیتابیس در اپلیکیشن همراه الزامی است.</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-amber-300 flex items-center justify-between dir-ltr text-left select-all">
            <span className="break-all">{apiKey}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-bold transition-all cursor-pointer shrink-0 ml-2"
            >
              {copied ? "کپی شد" : "کپی کلید"}
            </button>
          </div>

          {/* Code Snippets Generator */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">کد اتّصال نمونه به برنامه:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {(["curl", "rn", "node", "python"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSnippetType(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      snippetType === t ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto dir-ltr text-left select-all">
              {getSnippetText()}
            </pre>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer"
          >
            متوجه شدم و ذخیره کردم
          </button>
        </div>
      </div>
    </div>
  );
}
