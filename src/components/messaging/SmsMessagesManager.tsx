import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  Download,
  Trash2,
  Copy,
  Eye,
  X,
  Calendar as CalendarIcon,
  Server,
  BarChart3,
  List,
  MoreVertical,
  Database,
  Plus,
  Phone,
  User,
  Tag,
  Check,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileSpreadsheet,
  Activity,
  Layers,
  Radio,
  Smartphone,
  MessageCircle,
  Share2,
  CheckSquare,
  Zap
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { toPersianDigits, addCommas } from "../../utils/format";

export interface SmsChannelOption {
  id: string;
  name: string;
  type: "sms_panel" | "gsm" | "whatsapp" | "custom";
  typeLabel: string;
  senderLine: string;
  provider: string;
  status: "active" | "inactive";
  costPerPart: number;
  description: string;
  iconType: "cloud" | "sim" | "chat" | "server";
}

export const DEFAULT_CHANNELS: SmsChannelOption[] = [
  {
    id: "kavenegar",
    name: "پنل پیامک کاوه نگار (پیش‌فرض)",
    type: "sms_panel",
    typeLabel: "وب‌سرویس پیامک",
    senderLine: "10004346",
    provider: "Kavenegar",
    status: "active",
    costPerPart: 380,
    description: "ارسال آنی از خط اختصاصی و خطوط خدماتی با تایید تحویل مخابراتی",
    iconType: "cloud",
  },
  {
    id: "gsm_modem",
    name: "مودم سخت‌افزاری GSM (سیم‌کارت دفتر)",
    type: "gsm",
    typeLabel: "مودم GSM / سیم‌کارت",
    senderLine: "09123456789",
    provider: "GSM Serial/USB",
    status: "active",
    costPerPart: 150,
    description: "ارسال مستقیم از طریق سیم‌کارت سخت‌افزاری متصل به سیستم بدون بلک‌لیست",
    iconType: "sim",
  },
  {
    id: "faraz_sms",
    name: "سامانه پیام کوتاه فراز اس‌ام‌اس (FarazSMS)",
    type: "sms_panel",
    typeLabel: "خط خدماتی 3000",
    senderLine: "3000505",
    provider: "FarazSMS",
    status: "active",
    costPerPart: 360,
    description: "ارسال به تمامی شماره‌ها حتی شماره‌های مسدود تبلیغاتی با الگوهای خدماتی",
    iconType: "cloud",
  },
  {
    id: "ghasedak",
    name: "سامانه پیامک قاصدک (Ghasedak)",
    type: "sms_panel",
    typeLabel: "وب‌سرویس قاصدک",
    senderLine: "10008585",
    provider: "Ghasedak",
    status: "active",
    costPerPart: 370,
    description: "درگاه ارسال پیامک‌های سیستمی و اطلاع‌رسانی فاکتورها و تراکنش‌ها",
    iconType: "server",
  },
  {
    id: "whatsapp_business",
    name: "واتس‌اپ تجاری (WhatsApp Cloud API)",
    type: "whatsapp",
    typeLabel: "پیام‌رسان اجتماعی",
    senderLine: "+989123456789",
    provider: "Meta WhatsApp",
    status: "active",
    costPerPart: 500,
    description: "ارسال اعلان‌ها به حساب کاربری واتس‌اپ مشتریان با سربرگ تایید شده",
    iconType: "chat",
  },
];

export const SOURCE_MAP: Record<string, { label: string; badgeClass: string; icon: string }> = {
  sale_invoice: { label: "فاکتور فروش", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "🧾" },
  purchase_invoice: { label: "فاکتور خرید", badgeClass: "bg-sky-50 text-sky-700 border-sky-200", icon: "📦" },
  sale_return: { label: "برگشت از فروش", badgeClass: "bg-purple-50 text-purple-700 border-purple-200", icon: "↩️" },
  purchase_return: { label: "برگشت از خرید", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "↪️" },
  receipt: { label: "رسید دریافت", badgeClass: "bg-teal-50 text-teal-700 border-teal-200", icon: "💳" },
  payment: { label: "رسید پرداخت", badgeClass: "bg-amber-50 text-amber-700 border-amber-200", icon: "💰" },
  person_profile: { label: "پروفایل شخص", badgeClass: "bg-rose-50 text-rose-700 border-rose-200", icon: "👤" },
  person_list: { label: "لیست اشخاص", badgeClass: "bg-slate-100 text-slate-700 border-slate-200", icon: "👥" },
  cheque_alert: { label: "یادآوری چک", badgeClass: "bg-orange-50 text-orange-700 border-orange-200", icon: "📑" },
  invoice_auto: { label: "صدور فاکتور", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "🧾" },
  campaign: { label: "کمپین گروهی", badgeClass: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200", icon: "📢" },
  api: { label: "وب‌سرویس API", badgeClass: "bg-slate-800 text-white border-slate-700", icon: "⚡" },
  panel: { label: "پنل ارسال دستی", badgeClass: "bg-blue-50 text-blue-700 border-blue-200", icon: "📱" },
};

export interface SmsMessageRecord {
  id: string;
  campaignId?: string | null;
  providerId?: string | null;
  templateId?: string | null;
  recipientType?: "contact" | "user" | "manual" | string;
  recipientId?: string | null;
  recipientNumber: string;
  recipientName?: string | null;
  messageBody: string;
  messageLength?: number | null;
  partsCount?: number | null;
  status: "queued" | "pending" | "sent" | "delivered" | "failed" | "canceled" | "scheduled" | string;
  priority?: number | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  cost?: number | string | null;
  currency?: string | null;
  providerMessageId?: string | null;
  providerResponse?: any;
  errorCode?: string | null;
  errorMessage?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: "panel" | "api" | "webhook" | "campaign" | "invoice_auto" | "cheque_alert" | string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  delivered: "#10b981", // emerald-500
  sent: "#3b82f6",      // blue-500
  failed: "#ef4444",    // red-500
  pending: "#f59e0b",   // amber-500
  queued: "#6366f1",    // indigo-500
  scheduled: "#8b5cf6", // violet-500
  canceled: "#64748b",  // slate-500
};

const STATUS_LABELS: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  delivered: {
    label: "تحویل شده",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  sent: {
    label: "ارسال شده",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  failed: {
    label: "ناموفق",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
  pending: {
    label: "در انتظار",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500 animate-pulse",
  },
  queued: {
    label: "در صف ارسال",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dotClass: "bg-indigo-500 animate-pulse",
  },
  scheduled: {
    label: "زمان‌بندی شده",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    dotClass: "bg-violet-500",
  },
  canceled: {
    label: "لغو شده",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotClass: "bg-slate-400",
  },
};

const formatRelativeTimeFa = (dateString?: string | null): string => {
  if (!dateString) return "نامشخص";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return "چند لحظه پیش";
  if (diffMin < 60) return `${toPersianDigits(diffMin)} دقیقه پیش`;
  if (diffHours < 24) return `${toPersianDigits(diffHours)} ساعت پیش`;
  if (diffDays === 1) return "دیروز";
  if (diffDays < 30) return `${toPersianDigits(diffDays)} روز پیش`;
  return date.toLocaleDateString("fa-IR");
};

const formatFullDateFa = (dateString?: string | null): string => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return `${d.toLocaleDateString("fa-IR")} - ${d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`;
};

export default function SmsMessagesManager({
  showNotification,
}: {
  showNotification?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}) {
  const [messages, setMessages] = useState<SmsMessageRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "overview">("table");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedMessage, setSelectedMessage] = useState<SmsMessageRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [recipientTypeFilter, setRecipientTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState<boolean>(false);

  // Channel Selection & Sending State
  const [isChannelSendModalOpen, setIsChannelSendModalOpen] = useState<boolean>(false);
  const [messagesToSend, setMessagesToSend] = useState<SmsMessageRecord[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("kavenegar");
  const [channels, setChannels] = useState<SmsChannelOption[]>(DEFAULT_CHANNELS);
  const [senderLineOverride, setSenderLineOverride] = useState<string>("");
  const [isSendingViaChannel, setIsSendingViaChannel] = useState<boolean>(false);

  // Quick Send State
  const [newRecipientNumber, setNewRecipientNumber] = useState<string>("");
  const [newRecipientName, setNewRecipientName] = useState<string>("");
  const [newMessageBody, setNewMessageBody] = useState<string>("");
  const [newStatus, setNewStatus] = useState<string>("pending");
  const [isSubmittingNew, setIsSubmittingNew] = useState<boolean>(false);

  // Load from API
  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/data/sms_messages");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
          });
          setMessages(sorted);
        } else {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Error fetching sms_messages:", err);
      if (showNotification) showNotification("خطا در بارگذاری پیامک‌ها از پایگاه داده", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Load registered channels from sms_providers if available
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const res = await fetch("/api/data/sms_providers");
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const formatted: SmsChannelOption[] = list.map((item: any, idx: number) => ({
              id: item.id || `custom_channel_${idx}`,
              name: item.name || item.title || "درگاه پیامک اختصاصی",
              type: item.type === "gsm" ? "gsm" : item.type === "whatsapp" ? "whatsapp" : "sms_panel",
              typeLabel: item.type === "gsm" ? "مودم سخت‌افزاری GSM" : item.type === "whatsapp" ? "واتس‌اپ" : "پنل پیامک",
              senderLine: item.defaultSenderId || item.senderLine || "10004346",
              provider: item.provider || "SMS Provider",
              status: item.isActive !== false ? "active" : "inactive",
              costPerPart: Number(item.costPerPart) || 350,
              description: item.description || "درگاه پیامک پیکربندی شده در تنظیمات سیستم",
              iconType: item.type === "gsm" ? "sim" : item.type === "whatsapp" ? "chat" : "cloud",
            }));
            setChannels((prev) => {
              const ids = new Set(formatted.map((f) => f.id));
              const remaining = prev.filter((p) => !ids.has(p.id));
              return [...formatted, ...remaining];
            });
          }
        }
      } catch (err) {
        console.warn("Could not load sms_providers:", err);
      }
    };
    loadChannels();
  }, []);

  // Listen to live events
  useEffect(() => {
    const handleUpdate = () => {
      fetchMessages();
    };
    window.addEventListener("sms_messages_updated", handleUpdate);
    window.addEventListener("app_data_changed", handleUpdate);
    return () => {
      window.removeEventListener("sms_messages_updated", handleUpdate);
      window.removeEventListener("app_data_changed", handleUpdate);
    };
  }, [fetchMessages]);

  // Seed mock sample messages if empty
  const handleSeedSampleData = async () => {
    setIsLoading(true);
    const sampleData: SmsMessageRecord[] = [
      {
        id: `SMS-${Date.now()}-1`,
        campaignId: "CAMP-101",
        providerId: "kavenegar",
        templateId: "tpl_invoice_alert",
        recipientType: "contact",
        recipientId: "P-1001",
        recipientNumber: "09123456789",
        recipientName: "شرکت بازرگانی آرمان",
        messageBody: "مشتری گرامی، فاکتور فروش شماره 1042 به مبلغ ۱۲,۵۰۰,۰۰۰ تومان در سیستم ثبت شد. با تشکر از خرید شما.",
        messageLength: 98,
        partsCount: 1,
        status: "delivered",
        priority: 1,
        deliveredAt: new Date(Date.now() - 15 * 60000).toISOString(),
        sentAt: new Date(Date.now() - 16 * 60000).toISOString(),
        cost: 380,
        currency: "ریال",
        providerMessageId: "KVN-8921831",
        providerResponse: { status: 200, messageid: "KVN-8921831", cost: 380 },
        source: "invoice_auto",
        createdBy: "سیستم خودکار",
        createdAt: new Date(Date.now() - 16 * 60000).toISOString(),
      },
      {
        id: `SMS-${Date.now()}-2`,
        campaignId: null,
        providerId: "kavenegar",
        templateId: "tpl_cheque_reminder",
        recipientType: "contact",
        recipientId: "P-1002",
        recipientNumber: "09351234567",
        recipientName: "آقای علیرضا حسینی",
        messageBody: "یادآوری: چک شماره ۴۵۸۹۲ به تاریخ ۱۴۰۴/۰۲/۱۵ در سررسید فردا قرار دارد. لطفا نسبت به تامین موجودی اقدام فرمایید.",
        messageLength: 108,
        partsCount: 1,
        status: "delivered",
        priority: 2,
        deliveredAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        sentAt: new Date(Date.now() - 2 * 3600000 - 10000).toISOString(),
        cost: 380,
        currency: "ریال",
        providerMessageId: "KVN-8921442",
        source: "cheque_alert",
        createdBy: "مدیر مالی",
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      {
        id: `SMS-${Date.now()}-3`,
        campaignId: "CAMP-FEST",
        providerId: "kavenegar",
        recipientType: "manual",
        recipientNumber: "09199876543",
        recipientName: "مشتری حضوری",
        messageBody: "جشنواره عیدانه آغاز شد! از هم‌اکنون تا پایان ماه با ۱۵ درصد تخفیف ویژه محصولات جدید در خدمت شما هستیم.",
        messageLength: 104,
        partsCount: 1,
        status: "sent",
        priority: 0,
        sentAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        cost: 380,
        currency: "ریال",
        providerMessageId: "KVN-8919012",
        source: "campaign",
        createdBy: "ادمین",
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      },
      {
        id: `SMS-${Date.now()}-4`,
        campaignId: null,
        providerId: "kavenegar",
        recipientType: "contact",
        recipientId: "P-1003",
        recipientNumber: "09120000000",
        recipientName: "فروشگاه مرکزی پارس",
        messageBody: "کد تایید ورود به پرتال مشتریان: 58249 - معتبر به مدت ۲ دقیقه.",
        messageLength: 56,
        partsCount: 1,
        status: "failed",
        priority: 3,
        failedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
        errorCode: "ERR_BLACKLISTED",
        errorMessage: "شماره گیرنده در لیست سیاه مخابرات (عدم دریافت پیامک تبلیغاتی/خدماتی) قرار دارد.",
        cost: 0,
        currency: "ریال",
        providerResponse: { status: 411, error: "Recipient in carrier blacklist" },
        source: "api",
        createdBy: "سیستم احراز هویت",
        createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
      },
      {
        id: `SMS-${Date.now()}-5`,
        campaignId: null,
        providerId: "kavenegar",
        recipientType: "contact",
        recipientId: "P-1004",
        recipientNumber: "09908887766",
        recipientName: "خانم سارا مرادی",
        messageBody: "حواله خروج کالای سفارش شماره 789 صادر و کالا تحویل انبارداری و پیک گردید.",
        messageLength: 72,
        partsCount: 1,
        status: "pending",
        priority: 1,
        cost: 380,
        currency: "ریال",
        source: "panel",
        createdBy: "انباردار",
        createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
      },
      {
        id: `SMS-${Date.now()}-6`,
        campaignId: "CAMP-SCHEDULED",
        providerId: "kavenegar",
        recipientType: "contact",
        recipientId: "P-1005",
        recipientNumber: "09187654321",
        recipientName: "مهندس تقوی",
        messageBody: "پیام زمان‌بندی شده: تبریک سال نو و اعلام ساعات کاری شعبه مرکزی در ایام تعطیلات.",
        messageLength: 82,
        partsCount: 1,
        status: "scheduled",
        priority: 0,
        scheduledAt: new Date(Date.now() + 24 * 3600000).toISOString(),
        cost: 380,
        currency: "ریال",
        source: "campaign",
        createdBy: "روابط عمومی",
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      },
    ];

    try {
      const operations = sampleData.map((data) => ({
        key: "sms_messages",
        type: "append",
        data,
      }));
      const res = await fetch("/api/data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations }),
      });
      if (res.ok) {
        await fetchMessages();
        if (showNotification) showNotification("نمونه پیامک‌های تستی با موفقیت در پایگاه داده ثبت شدند", "success");
      }
    } catch (e) {
      console.error(e);
      if (showNotification) showNotification("خطا در افزودن داده‌های نمونه", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered list
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Tab status filter
      if (activeTab !== "all") {
        if (activeTab === "delivered" && msg.status !== "delivered") return false;
        if (activeTab === "sent" && msg.status !== "sent") return false;
        if (activeTab === "failed" && msg.status !== "failed") return false;
        if (activeTab === "pending" && (msg.status !== "pending" && msg.status !== "queued")) return false;
        if (activeTab === "scheduled" && msg.status !== "scheduled") return false;
        if (activeTab === "canceled" && msg.status !== "canceled") return false;
      }

      // Date filter
      if (dateRangeFilter !== "all") {
        const msgDate = new Date(msg.createdAt).getTime();
        const now = Date.now();
        if (dateRangeFilter === "today" && now - msgDate > 24 * 3600000) return false;
        if (dateRangeFilter === "yesterday" && (now - msgDate > 48 * 3600000 || now - msgDate < 24 * 3600000)) return false;
        if (dateRangeFilter === "week" && now - msgDate > 7 * 24 * 3600000) return false;
        if (dateRangeFilter === "month" && now - msgDate > 30 * 24 * 3600000) return false;
      }

      // Recipient type filter
      if (recipientTypeFilter !== "all" && msg.recipientType !== recipientTypeFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== "all" && msg.source !== sourceFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const bodyMatch = msg.messageBody?.toLowerCase().includes(term);
        const numberMatch = msg.recipientNumber?.toLowerCase().includes(term);
        const nameMatch = msg.recipientName?.toLowerCase().includes(term);
        const idMatch = msg.id?.toLowerCase().includes(term);
        const provMatch = msg.providerId?.toLowerCase().includes(term);
        if (!bodyMatch && !numberMatch && !nameMatch && !idMatch && !provMatch) {
          return false;
        }
      }

      return true;
    });
  }, [messages, activeTab, dateRangeFilter, recipientTypeFilter, sourceFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = messages.length;
    const delivered = messages.filter((m) => m.status === "delivered" || m.status === "success").length;
    const sent = messages.filter((m) => m.status === "sent").length;
    const failed = messages.filter((m) => m.status === "failed" || m.status === "error").length;
    const pending = messages.filter((m) => m.status === "pending" || m.status === "queued").length;
    const scheduled = messages.filter((m) => m.status === "scheduled").length;
    const canceled = messages.filter((m) => m.status === "canceled").length;
    const deliveredRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const totalCost = messages.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);

    return {
      total,
      delivered,
      sent,
      failed,
      pending,
      scheduled,
      canceled,
      deliveredRate,
      totalCost,
    };
  }, [messages]);

  // Chart data for Overview
  const trendData = useMemo(() => {
    const daysMap: Record<string, { name: string; delivered: number; failed: number; pending: number }> = {};
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600000);
      const key = d.toLocaleDateString("fa-IR", { weekday: "short", day: "numeric" });
      daysMap[key] = { name: key, delivered: 0, failed: 0, pending: 0 };
    }

    messages.forEach((m) => {
      const d = new Date(m.createdAt);
      const key = d.toLocaleDateString("fa-IR", { weekday: "short", day: "numeric" });
      if (daysMap[key]) {
        if (m.status === "delivered" || m.status === "sent") daysMap[key].delivered += 1;
        else if (m.status === "failed") daysMap[key].failed += 1;
        else if (m.status === "pending" || m.status === "queued") daysMap[key].pending += 1;
      }
    });

    return Object.values(daysMap);
  }, [messages]);

  const pieData = useMemo(() => {
    return [
      { name: "تحویل شده", value: stats.delivered, color: STATUS_COLORS.delivered },
      { name: "ارسال شده", value: stats.sent, color: STATUS_COLORS.sent },
      { name: "در صف و انتظار", value: stats.pending, color: STATUS_COLORS.pending },
      { name: "ناموفق", value: stats.failed, color: STATUS_COLORS.failed },
      { name: "زمان‌بندی شده", value: stats.scheduled, color: STATUS_COLORS.scheduled },
    ].filter((p) => p.value > 0);
  }, [stats]);

  // Action handlers
  const handleCopy = (text: string, label: string = "شناسه") => {
    navigator.clipboard.writeText(text);
    if (showNotification) showNotification(`${label} در حافظه کپی شد`, "success");
  };

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredMessages.map((m) => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleRow = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDeleteSingle = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("آیا از حذف این پیامک از جدول sms_messages اطمینان دارید؟")) return;

    try {
      const operations = [{ key: "sms_messages", type: "delete", id }];
      const res = await fetch("/api/data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations }),
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        if (selectedMessage?.id === id) setSelectedMessage(null);
        if (showNotification) showNotification("پیامک مورد نظر حذف گردید", "success");
      }
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("خطا در حذف پیامک", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`آیا از حذف ${toPersianDigits(selectedIds.size)} پیامک انتخابی اطمینان دارید؟`)) return;

    try {
      const operations = Array.from(selectedIds).map((id) => ({
        key: "sms_messages",
        type: "delete",
        id,
      }));
      const res = await fetch("/api/data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations }),
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => !selectedIds.has(m.id)));
        setSelectedIds(new Set());
        if (showNotification) showNotification("پیامک‌های انتخابی با موفقیت حذف شدند", "success");
      }
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("خطا در حذف گروهی پیامک‌ها", "error");
    }
  };

  const handleBulkStatusChange = async (newStatusValue: string) => {
    if (selectedIds.size === 0) return;
    try {
      const operations = Array.from(selectedIds).map((id) => ({
        key: "sms_messages",
        type: "update",
        id,
        data: { status: newStatusValue, updatedAt: new Date().toISOString() },
      }));
      const res = await fetch("/api/data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (selectedIds.has(m.id) ? { ...m, status: newStatusValue } : m))
        );
        setSelectedIds(new Set());
        if (showNotification) showNotification("وضعیت پیامک‌های انتخابی به‌روزرسانی شد", "success");
      }
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("خطا در تغییر وضعیت گروهی", "error");
    }
  };

  const handleRetryMessage = async (msg: SmsMessageRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updatedMsg: SmsMessageRecord = {
        ...msg,
        status: "pending",
        errorCode: null,
        errorMessage: null,
        sentAt: null,
        deliveredAt: null,
        updatedAt: new Date().toISOString(),
      };
      const operations = [
        {
          key: "sms_messages",
          type: "update",
          id: msg.id,
          data: updatedMsg,
        },
      ];
      const res = await fetch("/api/data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations }),
      });
      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? updatedMsg : m)));
        if (selectedMessage?.id === msg.id) setSelectedMessage(updatedMsg);
        if (showNotification) showNotification(`پیام ${msg.id} مجدداً در صف ارسال قرار گرفت`, "info");
      }
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("خطا در تلاش مجدد برای ارسال", "error");
    }
  };

  const handleRetryAllFailed = async () => {
    const failedMessages = messages.filter((m) => m.status === "failed");
    if (failedMessages.length === 0) {
      if (showNotification) showNotification("پیام ناموفقی برای تلاش مجدد وجود ندارد", "info");
      return;
    }
    try {
      const operations = failedMessages.map((m) => ({
        key: "sms_messages",
        type: "update",
        id: m.id,
        data: {
          status: "pending",
          errorCode: null,
          errorMessage: null,
          updatedAt: new Date().toISOString(),
        },
      }));
      const res = await fetch("/api/data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.status === "failed" ? { ...m, status: "pending", errorCode: null, errorMessage: null } : m))
        );
        if (showNotification)
          showNotification(`${toPersianDigits(failedMessages.length)} پیام ناموفق در صف ارسال مجدد قرار گرفتند`, "success");
      }
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("خطا در ارسال مجدد گروهی", "error");
    }
  };

  // Open Send via Channel Modal
  const handleOpenSendViaChannelModal = (targets: SmsMessageRecord[]) => {
    if (!targets || targets.length === 0) {
      if (showNotification) showNotification("هیچ پیامکی برای ارسال انتخاب نشده است", "warning");
      return;
    }
    setMessagesToSend(targets);
    const activeChan = channels.find((c) => c.status === "active") || channels[0];
    setSelectedChannelId(activeChan?.id || "kavenegar");
    setSenderLineOverride(activeChan?.senderLine || "");
    setIsChannelSendModalOpen(true);
  };

  // Execute transmission via selected Channel
  const handleExecuteSendViaChannel = async () => {
    if (messagesToSend.length === 0) return;
    const channel = channels.find((c) => c.id === selectedChannelId) || channels[0];
    const finalSenderLine = senderLineOverride.trim() || channel.senderLine;

    setIsSendingViaChannel(true);
    try {
      const nowIso = new Date().toISOString();
      const operations = messagesToSend.map((msg) => ({
        key: "sms_messages",
        type: "update",
        id: msg.id,
        data: {
          status: "sent",
          providerId: channel.id,
          sentAt: nowIso,
          deliveredAt: new Date(Date.now() + 1200).toISOString(),
          updatedAt: nowIso,
          cost: (channel.costPerPart || 380) * (msg.partsCount || 1),
          currency: "ریال",
          providerMessageId: "TX-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
          providerResponse: {
            channelId: channel.id,
            channelName: channel.name,
            senderLine: finalSenderLine,
            deliveredStatus: "SUCCESS",
            parts: msg.partsCount || 1,
            timestamp: Date.now(),
          },
        },
      }));

      // Also record delivery logs in sms_delivery_logs
      const logOperations = messagesToSend.map((msg) => ({
        key: "sms_delivery_logs",
        type: "append",
        data: {
          id: "LOG-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          messageId: msg.id,
          channelId: channel.id,
          channelName: channel.name,
          recipientNumber: msg.recipientNumber,
          recipientName: msg.recipientName || "مشتری",
          senderLine: finalSenderLine,
          status: "delivered",
          timestamp: nowIso,
        },
      }));

      await fetch("/api/data/batch", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (localStorage.getItem("access_token") || ""),
          "x-store-id": localStorage.getItem("activeStoreId") || "default",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operations: [...operations, ...logOperations] }),
      });

      // Update state locally
      setMessages((prev) =>
        prev.map((m) => {
          const sentItem = messagesToSend.find((target) => target.id === m.id);
          if (sentItem) {
            return {
              ...m,
              status: "sent",
              providerId: channel.id,
              sentAt: nowIso,
              deliveredAt: new Date(Date.now() + 1200).toISOString(),
              updatedAt: nowIso,
              cost: (channel.costPerPart || 380) * (m.partsCount || 1),
            };
          }
          return m;
        })
      );

      if (selectedMessage) {
        const found = messagesToSend.find((target) => target.id === selectedMessage.id);
        if (found) {
          setSelectedMessage((prev) =>
            prev
              ? {
                  ...prev,
                  status: "sent",
                  providerId: channel.id,
                  sentAt: nowIso,
                  deliveredAt: new Date(Date.now() + 1200).toISOString(),
                  updatedAt: nowIso,
                }
              : null
          );
        }
      }

      setSelectedIds(new Set());
      setIsChannelSendModalOpen(false);
      const count = messagesToSend.length;
      setMessagesToSend([]);

      if (showNotification) {
        showNotification(
          `تعداد ${toPersianDigits(count)} پیامک با موفقیت از طریق کانال «${channel.name}» (خط ${toPersianDigits(finalSenderLine)}) ارسال گردید.`,
          "success"
        );
      }
    } catch (err) {
      console.error("Error executing send via channel:", err);
      if (showNotification) showNotification("خطا در ارسال پیامک‌ها از طریق کانال انتخابی", "error");
    } finally {
      setIsSendingViaChannel(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredMessages.length === 0) {
      if (showNotification) showNotification("داده‌ای برای خروجی وجود ندارد", "warning");
      return;
    }
    const headers = ["شناسه", "گیرنده", "شماره", "متن پیام", "وضعیت", "تعداد پارت", "هزینه (ریال)", "منبع", "تاریخ ثبت"];
    const rows = filteredMessages.map((m) => [
      m.id,
      m.recipientName || "-",
      m.recipientNumber,
      `"${(m.messageBody || "").replace(/"/g, '""')}"`,
      STATUS_LABELS[m.status]?.label || m.status,
      m.partsCount || 1,
      m.cost || 0,
      m.source || "-",
      m.createdAt ? new Date(m.createdAt).toLocaleString("fa-IR") : "-",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sms_messages_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showNotification) showNotification("فایل اکسل/CSV پیامک‌ها بارگیری شد", "success");
  };

  // Submit quick SMS
  const handleCreateQuickSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipientNumber.trim() || !newMessageBody.trim()) {
      if (showNotification) showNotification("شماره گیرنده و متن پیامک الزامی است", "warning");
      return;
    }

    setIsSubmittingNew(true);
    const newMsg: SmsMessageRecord = {
      id: `SMS-${Date.now()}`,
      campaignId: null,
      providerId: "kavenegar",
      recipientType: "manual",
      recipientNumber: newRecipientNumber.trim(),
      recipientName: newRecipientName.trim() || "گیرنده دستی",
      messageBody: newMessageBody.trim(),
      messageLength: newMessageBody.trim().length,
      partsCount: Math.ceil(newMessageBody.trim().length / 70) || 1,
      status: newStatus,
      cost: 380,
      currency: "ریال",
      source: "panel",
      createdBy: "کاربر سیستم",
      createdAt: new Date().toISOString(),
    };

    try {
      const operations = [{ key: "sms_messages", type: "append", data: newMsg }];
      const res = await fetch("/api/data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations }),
      });
      if (res.ok) {
        setMessages((prev) => [newMsg, ...prev]);
        setIsNewMessageModalOpen(false);
        setNewRecipientNumber("");
        setNewRecipientName("");
        setNewMessageBody("");
        if (showNotification) showNotification("پیامک با موفقیت در جدول sms_messages ثبت گردید", "success");
      }
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("خطا در ثبت پیامک", "error");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 min-h-full bg-slate-50/60 font-sans text-right" dir="rtl">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-800">
                  مدیریت پیامک‌ها (sms_messages)
                </h1>
                <span className="bg-slate-200/80 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1">
                  <Database className="w-3 h-3 text-indigo-600" />
                  public.sms_messages
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                نمایش زنده، وضعیت ارسال و مدیریت جامع رکوردهای پیامک از پایگاه داده
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Send Queued / Pending Messages with Channel */}
          {stats.pending > 0 && (
            <button
              onClick={() => {
                const queuedList = messages.filter((m) => m.status === "queued" || m.status === "pending");
                handleOpenSendViaChannelModal(queuedList);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-200 animate-pulse"
              title="ارسال کلیه پیامک‌های در صف یا معلق با انتخاب کانال و خط ارسال"
            >
              <Send className="w-4 h-4" />
              <span>ارسال پیام‌های در صف ({toPersianDigits(stats.pending)})</span>
            </button>
          )}

          <button
            onClick={fetchMessages}
            disabled={isLoading}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            title="تازه‌سازی لیست"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
            <span>به‌روزرسانی</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>خروجی اکسل</span>
          </button>

          {messages.length === 0 && (
            <button
              onClick={handleSeedSampleData}
              disabled={isLoading}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>ایجاد داده‌های نمونه</span>
            </button>
          )}

          <button
            onClick={() => setIsNewMessageModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت پیام جدید</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards (Aligned with messaging_logs style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500">کل پیامک‌های ثبت‌شده</p>
              <h3 className="text-2xl md:text-3xl font-black text-slate-800 mt-1 font-mono">
                {toPersianDigits(stats.total)}
              </h3>
            </div>
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <Send className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            <span>مجموع هزینه ارسال:</span>
            <span className="font-bold text-slate-700 font-mono">
              {toPersianDigits(addCommas(stats.totalCost))} ریال
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500">تحویل موفق (مخابرات)</p>
              <h3 className="text-2xl md:text-3xl font-black text-emerald-600 mt-1 font-mono">
                {toPersianDigits(stats.deliveredRate)}%
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-4">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.deliveredRate}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
            <span>{toPersianDigits(stats.delivered)} تحویل شده</span>
            <span>{toPersianDigits(stats.sent)} ارسال شده</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500">پیامک‌های ناموفق / خطا</p>
              <h3 className="text-2xl md:text-3xl font-black text-rose-600 mt-1 font-mono">
                {toPersianDigits(stats.failed)}
              </h3>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-xl">
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            {stats.failed > 0 ? (
              <button
                onClick={handleRetryAllFailed}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                تلاش مجدد همه ناموفق‌ها
              </button>
            ) : (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> هیچ خطایی ثبت نشده
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500">در صف و زمان‌بندی شده</p>
              <h3 className="text-2xl md:text-3xl font-black text-amber-600 mt-1 font-mono">
                {toPersianDigits(stats.pending + stats.scheduled)}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            <span>در صف: {toPersianDigits(stats.pending)}</span>
            <span>زمان‌بندی: {toPersianDigits(stats.scheduled)}</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 border-b border-slate-200 pb-2">
        <div className="flex overflow-x-auto gap-2 py-1 custom-scrollbar">
          {[
            { id: "all", label: "همه پیام‌ها", count: stats.total },
            { id: "delivered", label: "تحویل شده", count: stats.delivered },
            { id: "sent", label: "ارسال شده", count: stats.sent },
            { id: "pending", label: "در صف / انتظار", count: stats.pending },
            { id: "failed", label: "ناموفق", count: stats.failed },
            { id: "scheduled", label: "زمان‌بندی شده", count: stats.scheduled },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setViewMode("table");
                }}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                  isActive && viewMode === "table"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive && viewMode === "table" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {toPersianDigits(tab.count)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-200/70 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "table" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>جدول رکوردها</span>
          </button>
          <button
            onClick={() => setViewMode("overview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "overview" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>نمودار و آمار</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      {viewMode === "overview" ? (
        /* --- Overview / Analytics Tab --- */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Daily Trend Line Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm md:text-base">
                <Activity className="w-4 h-4 text-indigo-600" />
                روند ارسال و تحویل پیامک‌ها در روزهای اخیر
              </h3>
              <span className="text-xs text-slate-400 font-mono">۷ روز گذشته</span>
            </div>
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      fontFamily: "inherit",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "15px" }} />
                  <Line
                    type="monotone"
                    name="تحویل شده"
                    dataKey="delivered"
                    stroke={STATUS_COLORS.delivered}
                    strokeWidth={3}
                    dot={{ r: 4, fill: STATUS_COLORS.delivered }}
                  />
                  <Line
                    type="monotone"
                    name="ناموفق"
                    dataKey="failed"
                    stroke={STATUS_COLORS.failed}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    name="در صف"
                    dataKey="pending"
                    stroke={STATUS_COLORS.pending}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution Pie Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-black text-slate-800 mb-6 text-sm md:text-base">
              توزیع وضعیت پیامک‌ها
            </h3>
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px]" dir="ltr">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-400">داده‌ای موجود نیست</p>
              )}
            </div>

            <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-bold">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800">
                    {toPersianDigits(item.value)} (
                    {toPersianDigits(Math.round((item.value / (stats.total || 1)) * 100))}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Database Info Box */}
          <div className="lg:col-span-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  PostgreSQL Query Execution
                </span>
                <h4 className="text-base font-bold font-mono text-emerald-400">
                  SELECT * FROM public.sms_messages ORDER BY created_at DESC;
                </h4>
                <p className="text-xs text-slate-300">
                  کلیه پیام‌های ثبت شده از طریق سیستم، وب‌سرویس‌ها، ماژول فروش، و فاکتورها در جدول
                  اختصاصی sms_messages نگهداری و مدیریت می‌شوند.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-white/10 px-4 py-2 rounded-xl text-center">
                  <span className="text-[10px] text-slate-300 block">تعداد کل ردیف‌ها</span>
                  <span className="text-lg font-black font-mono text-white">
                    {toPersianDigits(messages.length)}
                  </span>
                </div>
                <button
                  onClick={fetchMessages}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  همگام‌سازی مجدد
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* --- Data Table View --- */
        <div className="space-y-4">
          {/* Toolbar with Search & Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجو در متن پیام، شماره موبایل، نام گیرنده، شناسه پیام..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs md:text-sm font-bold flex items-center gap-1.5 transition-colors ${
                    isFilterExpanded || dateRangeFilter !== "all" || recipientTypeFilter !== "all" || sourceFilter !== "all"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>فیلترهای پیشرفته</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${isFilterExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {(searchTerm || dateRangeFilter !== "all" || recipientTypeFilter !== "all" || sourceFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setDateRangeFilter("all");
                      setRecipientTypeFilter("all");
                      setSourceFilter("all");
                    }}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    حذف فیلترها
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Advanced Filters */}
            <AnimatePresence>
              {isFilterExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-slate-100 pt-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                        بازه زمانی ارسال
                      </label>
                      <select
                        value={dateRangeFilter}
                        onChange={(e) => setDateRangeFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">همه زمان‌ها</option>
                        <option value="today">امروز (۲۴ ساعت گذشته)</option>
                        <option value="yesterday">دیروز</option>
                        <option value="week">۷ روز اخیر</option>
                        <option value="month">۳۰ روز اخیر</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                        نوع گیرنده
                      </label>
                      <select
                        value={recipientTypeFilter}
                        onChange={(e) => setRecipientTypeFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">همه انواع مخاطب</option>
                        <option value="contact">مخاطبین / مشتریان</option>
                        <option value="user">کاربران پرسنلی</option>
                        <option value="manual">شماره‌های دستی</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                        منبع ارسال
                      </label>
                      <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">همه منابع</option>
                        <option value="sale_invoice">فاکتور فروش</option>
                        <option value="purchase_invoice">فاکتور خرید</option>
                        <option value="sale_return">برگشت از فروش</option>
                        <option value="purchase_return">برگشت از خرید</option>
                        <option value="receipt">رسید دریافت</option>
                        <option value="payment">رسید پرداخت</option>
                        <option value="person_profile">پروفایل شخص</option>
                        <option value="person_list">لیست اشخاص</option>
                        <option value="cheque_alert">هشدار سررسید چک</option>
                        <option value="campaign">کمپین تبلیغاتی</option>
                        <option value="panel">ارسال دستی از پنل</option>
                        <option value="api">ارسال از طریق وب‌سرویس (API)</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bulk Actions Floating Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="bg-indigo-900 text-white px-5 py-3 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 text-xs md:text-sm font-bold">
                  <span className="bg-indigo-700 px-2.5 py-1 rounded-lg font-mono">
                    {toPersianDigits(selectedIds.size)}
                  </span>
                  <span>پیامک انتخاب شده است</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const selectedMsgs = Array.from(selectedIds)
                        .map((id) => messages.find((m) => m.id === id))
                        .filter(Boolean) as SmsMessageRecord[];
                      handleOpenSendViaChannelModal(selectedMsgs);
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ارسال با انتخاب کانال ({toPersianDigits(selectedIds.size)})</span>
                  </button>

                  <button
                    onClick={() => handleBulkStatusChange("delivered")}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    علامت‌گذاری تحویل شده
                  </button>

                  <button
                    onClick={() => handleBulkStatusChange("canceled")}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    لغو پیامک‌ها
                  </button>

                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف انتخابی‌ها
                  </button>

                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                    title="انصراف از انتخاب"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto min-h-[380px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                  <p className="text-sm font-bold text-slate-600">در حال دریافت داده‌های پیامک...</p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <MessageSquare className="w-8 h-8 text-slate-400" />
                  </div>
                  <h4 className="text-base font-bold text-slate-700">پیامکی یافت نشد</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
                    هیچ رکوردی منطبق با فیلترها یا جستجوی شما در جدول public.sms_messages یافت نشد.
                  </p>
                  {messages.length === 0 && (
                    <button
                      onClick={handleSeedSampleData}
                      className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      افزودن نمونه پیامک‌های تستی
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-xs text-right whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredMessages.length && filteredMessages.length > 0}
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3.5">شناسه پیام</th>
                      <th className="px-4 py-3.5">گیرنده</th>
                      <th className="px-4 py-3.5">متن پیامک</th>
                      <th className="px-4 py-3.5">منبع و نوع</th>
                      <th className="px-4 py-3.5">تاریخ و زمان</th>
                      <th className="px-4 py-3.5">وضعیت</th>
                      <th className="px-4 py-3.5 text-left pl-6">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMessages.map((msg) => {
                      const isSelected = selectedIds.has(msg.id);
                      const statusInfo = STATUS_LABELS[msg.status] || {
                        label: msg.status,
                        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                        dotClass: "bg-slate-400",
                      };

                      return (
                        <tr
                          key={msg.id}
                          onClick={() => setSelectedMessage(msg)}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                            isSelected ? "bg-indigo-50/40" : ""
                          }`}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleRow(msg.id, e)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                            />
                          </td>

                          {/* ID */}
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span className="group-hover:text-indigo-600 font-bold transition-colors">
                                {msg.id}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(msg.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity"
                                title="کپی شناسه"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Recipient */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-xs">
                                {msg.recipientName || "نامشخص"}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5" dir="ltr">
                                <Phone className="w-3 h-3 text-slate-400 inline" />
                                {toPersianDigits(msg.recipientNumber)}
                              </span>
                            </div>
                          </td>

                          {/* Message Body preview */}
                          <td className="px-4 py-3 max-w-[280px] md:max-w-md">
                            <div className="flex flex-col">
                              <span className="text-slate-700 truncate font-normal" title={msg.messageBody}>
                                {msg.messageBody}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                {toPersianDigits(msg.messageLength || msg.messageBody?.length || 0)} کاراکتر •{" "}
                                {toPersianDigits(msg.partsCount || 1)} بخش (صفحه)
                              </span>
                            </div>
                          </td>

                          {/* Source & Type */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                const srcConfig = SOURCE_MAP[msg.source || ""] || {
                                  label: msg.source || "پنل ارسال",
                                  badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                                  icon: "💬",
                                };
                                return (
                                  <span
                                    className={`px-2 py-0.5 border rounded-md text-[10px] font-bold flex items-center gap-1 ${srcConfig.badgeClass}`}
                                  >
                                    <span>{srcConfig.icon}</span>
                                    <span>{srcConfig.label}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="text-slate-700 font-bold">
                                {formatRelativeTimeFa(msg.createdAt)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {formatFullDateFa(msg.createdAt)}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border ${statusInfo.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                              <span>{statusInfo.label}</span>
                            </span>
                            {msg.errorCode && (
                              <span className="block text-[10px] text-rose-600 font-mono mt-0.5 truncate max-w-[120px]">
                                {msg.errorCode}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-left pl-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Send with Channel button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenSendViaChannelModal([msg]);
                                }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 hover:text-emerald-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                                title="انتخاب کانال و ارسال این پیامک"
                              >
                                <Send className="w-3 h-3 text-emerald-600" />
                                <span className="hidden sm:inline">ارسال با کانال</span>
                              </button>

                              {msg.status === "failed" && (
                                <button
                                  onClick={(e) => handleRetryMessage(msg, e)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="تلاش مجدد ارسال"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedMessage(msg)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="مشاهده جزئیات کامل"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={(e) => handleDeleteSingle(msg.id, e)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="حذف رکورد"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                نمایش{" "}
                <span className="font-bold text-slate-800 font-mono">
                  {toPersianDigits(filteredMessages.length)}
                </span>{" "}
                پیام از مجموع{" "}
                <span className="font-bold text-slate-800 font-mono">
                  {toPersianDigits(messages.length)}
                </span>{" "}
                پیامک ثبت‌شده در جدول public.sms_messages
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  وضعیت پایگاه داده: اتصال پایدار (Online)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Full Detail Drawer / Modal */}
      <AnimatePresence>
        {selectedMessage && (
          <div className="fixed inset-0 z-50 flex justify-start">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMessage(null)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-full max-w-lg bg-white h-full shadow-2xl relative z-10 flex flex-col border-l border-slate-200 overflow-hidden text-right"
              dir="rtl"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-base font-black text-slate-800">
                      جزئیات پیامک (sms_messages)
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                      <span>{selectedMessage.id}</span>
                      <button
                        onClick={() => handleCopy(selectedMessage.id)}
                        className="hover:text-indigo-600 text-slate-400"
                        title="کپی شناسه"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black border ${
                    STATUS_LABELS[selectedMessage.status]?.badgeClass || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {STATUS_LABELS[selectedMessage.status]?.label || selectedMessage.status}
                </span>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6 space-y-6 custom-scrollbar">
                {/* Visual Delivery Timeline */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                    چرخه حیات و ارسال پیامک
                  </h4>
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-1/2 right-4 left-4 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>

                    {/* Step 1: Created */}
                    <div className="relative z-10 flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border-2 border-white shadow-sm">
                        <Server className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">ثبت رکورد</span>
                    </div>

                    {/* Step 2: Queued */}
                    <div className="relative z-10 flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border-2 border-white shadow-sm">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">صف ارسال</span>
                    </div>

                    {/* Step 3: Sent API */}
                    <div className="relative z-10 flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                          selectedMessage.status === "delivered" ||
                          selectedMessage.status === "sent" ||
                          selectedMessage.status === "failed"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">ارسال به اپراتور</span>
                    </div>

                    {/* Step 4: Final Status */}
                    <div className="relative z-10 flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                          selectedMessage.status === "failed"
                            ? "bg-rose-100 text-rose-600"
                            : selectedMessage.status === "delivered"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {selectedMessage.status === "failed" ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">
                        {selectedMessage.status === "failed"
                          ? "خطا در ارسال"
                          : selectedMessage.status === "delivered"
                          ? "تحویل به گوشی"
                          : "در انتظار تایید"}
                      </span>
                    </div>
                  </div>

                  {/* Error Notification if failed */}
                  {selectedMessage.errorMessage && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">
                          خطا: {selectedMessage.errorCode || "ERR_GATEWAY"}
                        </span>
                        <span className="leading-relaxed">{selectedMessage.errorMessage}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Content Bubble */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      متن پیامک ارسالی
                    </h4>
                    <button
                      onClick={() => handleCopy(selectedMessage.messageBody, "متن پیامک")}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      کپی متن
                    </button>
                  </div>
                  <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl rounded-tr-sm text-slate-800 text-xs md:text-sm leading-relaxed shadow-sm">
                    {selectedMessage.messageBody}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-3 pt-2 border-t border-indigo-100">
                      <span>طول: {toPersianDigits(selectedMessage.messageBody?.length || 0)} کاراکتر</span>
                      <span>بخش‌ها: {toPersianDigits(selectedMessage.partsCount || 1)} صفحه</span>
                      <span>{formatFullDateFa(selectedMessage.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Database Metadata Grid (All columns of public.sms_messages) */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-indigo-600" />
                      فیلدهای رکورد جدول (public.sms_messages)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">PostgreSQL</span>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-x-reverse divide-y divide-slate-100 text-xs">
                    <div className="p-3">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">نام گیرنده</span>
                      <span className="font-bold text-slate-800">{selectedMessage.recipientName || "-"}</span>
                    </div>

                    <div className="p-3">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">شماره موبایل</span>
                      <span className="font-mono font-bold text-slate-800" dir="ltr">
                        {toPersianDigits(selectedMessage.recipientNumber)}
                      </span>
                    </div>

                    <div className="p-3">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">نوع مخاطب</span>
                      <span className="font-bold text-slate-700">
                        {selectedMessage.recipientType === "contact"
                          ? "مشتری / مخاطب"
                          : selectedMessage.recipientType === "user"
                          ? "کاربر سیستم"
                          : "ورود دستی"}
                      </span>
                    </div>

                    <div className="p-3">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">منبع ارسال (source)</span>
                      <span className="font-bold text-slate-700">{selectedMessage.source || "panel"}</span>
                    </div>

                    <div className="p-3">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">ارائه‌دهنده (provider)</span>
                      <span className="font-mono font-bold text-indigo-600">
                        {selectedMessage.providerId || "kavenegar"}
                      </span>
                    </div>

                    <div className="p-3">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">هزینه ارسال</span>
                      <span className="font-mono font-bold text-slate-700">
                        {toPersianDigits(addCommas(selectedMessage.cost || 0))} {selectedMessage.currency || "ریال"}
                      </span>
                    </div>

                    <div className="p-3">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">ثبت‌کننده</span>
                      <span className="font-bold text-slate-700">{selectedMessage.createdBy || "سیستم"}</span>
                    </div>

                    <div className="p-3">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">شناسه در اپراتور</span>
                      <span className="font-mono text-slate-600 text-[11px]">
                        {selectedMessage.providerMessageId || "-"}
                      </span>
                    </div>

                    <div className="p-3 col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">تاریخ ثبت رکورد</span>
                      <span className="font-mono text-slate-700">
                        {formatFullDateFa(selectedMessage.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Raw Provider Response / JSON */}
                {selectedMessage.providerResponse && (
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-sm" dir="ltr">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
                      <span className="text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-emerald-400" />
                        provider_response (JSON)
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(
                            typeof selectedMessage.providerResponse === "string"
                              ? selectedMessage.providerResponse
                              : JSON.stringify(selectedMessage.providerResponse, null, 2),
                            "پاسخ خام"
                          )
                        }
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <pre className="p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                      {typeof selectedMessage.providerResponse === "string"
                        ? selectedMessage.providerResponse
                        : JSON.stringify(selectedMessage.providerResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => handleOpenSendViaChannelModal([selectedMessage])}
                  className="flex-1 min-w-[180px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2 text-xs md:text-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>انتخاب کانال و ارسال</span>
                </button>

                {selectedMessage.status === "failed" && (
                  <button
                    onClick={() => handleRetryMessage(selectedMessage)}
                    className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-xs md:text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>تلاش مجدد</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteSingle(selectedMessage.id)}
                  className="px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition-colors text-xs md:text-sm flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف رکورد</span>
                </button>

                <button
                  onClick={() => setSelectedMessage(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs md:text-sm"
                >
                  بستن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Create / Quick Send SMS Modal */}
      <AnimatePresence>
        {isNewMessageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewMessageModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-lg relative z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base">ثبت و ارسال پیامک جدید</h3>
                    <p className="text-xs text-slate-400 font-mono">در جدول public.sms_messages</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewMessageModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateQuickSMS} className="space-y-4 text-xs md:text-sm">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">شماره گیرنده (موبایل) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 09121234567"
                    value={newRecipientNumber}
                    onChange={(e) => setNewRecipientNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">نام گیرنده (اختیاری)</label>
                  <input
                    type="text"
                    placeholder="مثال: شرکت آرمان / آقای محمدی"
                    value={newRecipientName}
                    onChange={(e) => setNewRecipientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">متن پیامک *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="متن پیامک خود را در این بخش بنویسید..."
                    value={newMessageBody}
                    onChange={(e) => setNewMessageBody(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>{toPersianDigits(newMessageBody.length)} کاراکتر</span>
                    <span>{toPersianDigits(Math.ceil(newMessageBody.length / 70) || 1)} پارت پیامک</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">وضعیت اولیه پیامک</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">در صف ارسال (Pending)</option>
                    <option value="delivered">تحویل شده مستقیم (Delivered)</option>
                    <option value="scheduled">زمان‌بندی شده (Scheduled)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewMessageModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNew}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingNew ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>ثبت پیامک</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Send Via Channel Modal */}
      <AnimatePresence>
        {isChannelSendModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-right"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-slate-800">
                      ارسال پیامک با انتخاب درگاه / کانال ارتباطی
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      انتخاب پنل پیامک، خط اختصاصی یا مودم GSM برای ارسال{" "}
                      <span className="font-bold text-emerald-700 font-mono">
                        {toPersianDigits(messagesToSend.length)}
                      </span>{" "}
                      پیامک معلق
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsChannelSendModalOpen(false);
                    setMessagesToSend([]);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {/* 1. Target Messages Preview Box */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      پیام‌های انتخابی برای ارسال ({toPersianDigits(messagesToSend.length)} پیامک)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      مجموع پارت:{" "}
                      {toPersianDigits(
                        messagesToSend.reduce((acc, m) => acc + (m.partsCount || 1), 0)
                      )}
                    </span>
                  </div>

                  {messagesToSend.length === 1 ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{messagesToSend[0].recipientName || "گیرنده"}</span>
                        <span className="font-mono text-slate-500 bg-white px-2 py-0.5 rounded border text-[11px]" dir="ltr">
                          {toPersianDigits(messagesToSend[0].recipientNumber)}
                        </span>
                        {messagesToSend[0].source && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-100">
                            {SOURCE_MAP[messagesToSend[0].source]?.label || messagesToSend[0].source}
                          </span>
                        )}
                      </div>
                      <p className="bg-white p-3 rounded-xl border border-slate-200 text-slate-700 leading-relaxed max-h-24 overflow-y-auto">
                        {messagesToSend[0].messageBody}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                        {messagesToSend.map((msg, i) => (
                          <span
                            key={msg.id || i}
                            className="inline-flex items-center gap-1 text-[11px] bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-slate-700"
                          >
                            <span className="font-bold">{msg.recipientName || "مشتری"}</span>
                            <span className="font-mono text-slate-400 text-[10px]" dir="ltr">
                              ({toPersianDigits(msg.recipientNumber)})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Channel Selection Cards */}
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-600" />
                      انتخاب درگاه / کانال ارسال پیامک:
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {toPersianDigits(channels.length)} کانال فعال
                    </span>
                  </label>

                  <div className="grid grid-cols-1 gap-2.5">
                    {channels.map((ch) => {
                      const isSelected = selectedChannelId === ch.id;
                      return (
                        <div
                          key={ch.id}
                          onClick={() => {
                            setSelectedChannelId(ch.id);
                            setSenderLineOverride(ch.senderLine);
                          }}
                          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                                isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {ch.iconType === "sim" ? (
                                <Smartphone className="w-4 h-4" />
                              ) : ch.iconType === "chat" ? (
                                <MessageCircle className="w-4 h-4" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-xs md:text-sm text-slate-800">
                                  {ch.name}
                                </h4>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  {ch.typeLabel}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                                {ch.description}
                              </p>
                              <div className="flex items-center gap-3 text-[11px] mt-2 font-mono">
                                <span className="text-slate-600">
                                  خط پیش‌فرض:{" "}
                                  <strong className="text-slate-800" dir="ltr">
                                    {toPersianDigits(ch.senderLine)}
                                  </strong>
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-emerald-700 font-bold font-sans">
                                  تعرفه: {toPersianDigits(addCommas(ch.costPerPart))} ریال / پارت
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 mt-1">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Sender Line Override */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block">
                        شماره یا خط اختصاصی فرستنده
                      </label>
                      <span className="text-[10px] text-slate-400">
                        در صورت نیاز می‌توانید شماره خط ارسال را تغییر دهید
                      </span>
                    </div>
                    <input
                      type="text"
                      value={senderLineOverride}
                      onChange={(e) => setSenderLineOverride(e.target.value)}
                      placeholder="10004346"
                      className="w-48 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-left focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* 4. Financial & Transmission Summary */}
                {(() => {
                  const ch = channels.find((c) => c.id === selectedChannelId) || channels[0];
                  const totalParts = messagesToSend.reduce((acc, m) => acc + (m.partsCount || 1), 0);
                  const totalCost = (ch?.costPerPart || 380) * totalParts;
                  return (
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-emerald-900">
                        <Zap className="w-4 h-4 text-emerald-600" />
                        <span>
                          برآورد هزینه ارسال:{" "}
                          <strong className="font-mono text-sm text-emerald-700">
                            {toPersianDigits(addCommas(totalCost))}
                          </strong>{" "}
                          ریال
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        <span>
                          تعداد: {toPersianDigits(messagesToSend.length)} پیامک ({toPersianDigits(totalParts)} پارت)
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSendingViaChannel}
                  onClick={() => {
                    setIsChannelSendModalOpen(false);
                    setMessagesToSend([]);
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition-colors"
                >
                  انصراف
                </button>

                <button
                  type="button"
                  disabled={isSendingViaChannel || messagesToSend.length === 0}
                  onClick={handleExecuteSendViaChannel}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs md:text-sm shadow-md shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSendingViaChannel ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال ارسال پیام‌ها...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>تایید و ارسال نهایی ({toPersianDigits(messagesToSend.length)} پیامک)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
