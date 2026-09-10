import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Trash2, Edit2, Key, CheckCircle, XCircle, MessageSquare, 
  Settings, X, Check, Server, Radio, Smartphone, AlertCircle, ChevronDown, 
  Activity, Clock, Crown, GripVertical, Copy, ArrowRight, ArrowLeft, Filter, RefreshCw,
  Mail, Bell, ShieldAlert, Usb, Send, Inbox, Signal, Terminal, Power,
  CheckSquare, Square, Phone, Info
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { 
  gsmUsbService, 
  GsmDeviceStatus, 
  GsmReceivedMessage, 
  AtLogEntry,
  GsmSentResult 
} from "../../services/messaging/GsmUsbService";
import { toPersianDigits } from "../../utils/format";

export interface ChannelConfig {
  id: string;
  name: string;
  type: 'sms_panel' | 'gsm' | 'whatsapp' | 'telegram' | 'email' | 'push';
  isEnabled: boolean;
  priority: number;
  status: 'connected' | 'disconnected' | 'rate-limited';
  lastUsed: string;
  config: Record<string, string>;
  dailyRateLimit: number;
  activeHours: { start: string; end: string };
  defaultSenderId: string;
}

const defaultChannels: ChannelConfig[] = [
  {
    id: "ch-gsm-1",
    name: "مودم سخت‌افزاری GSM (اتصال USB)",
    type: "gsm",
    isEnabled: true, // Active and priority 1
    priority: 1,
    status: "connected",
    lastUsed: "هم‌اکنون",
    dailyRateLimit: 2500,
    activeHours: { start: "00:00", end: "23:59" },
    defaultSenderId: "09123456789",
    config: {
      port: "USB-Serial (Web Serial)",
      baudRate: "115200",
      simOperator: "همراه اول (IR-MCI)",
      atTimeout: "5000",
      storage: "SM"
    }
  },
  {
    id: "ch-1",
    name: "پنل پیامک کاوه نگار",
    type: "sms_panel",
    isEnabled: false, // Disabled per user request
    priority: 2,
    status: "disconnected",
    lastUsed: "۲ روز پیش",
    dailyRateLimit: 10000,
    activeHours: { start: "00:00", end: "23:59" },
    defaultSenderId: "10004346",
    config: {
      apiKey: "kaveh_5f4d8e8a9b...",
      lineNumber: "10004346",
    }
  },
  {
    id: "ch-3",
    name: "واتس‌اپ تجاری",
    type: "whatsapp",
    isEnabled: false, // Disabled per user request
    priority: 3,
    status: "disconnected",
    lastUsed: "۱ هفته پیش",
    dailyRateLimit: 1000,
    activeHours: { start: "08:00", end: "22:00" },
    defaultSenderId: "BrandName",
    config: {
      instanceId: "wa_inst_8472",
      token: "wa_token_xxx",
    }
  },
  {
    id: "ch-4",
    name: "ربات تلگرام پشتیبانی",
    type: "telegram",
    isEnabled: false, // Disabled per user request
    priority: 4,
    status: "disconnected",
    lastUsed: "۵ روز پیش",
    dailyRateLimit: 5000,
    activeHours: { start: "00:00", end: "23:59" },
    defaultSenderId: "SupportBot",
    config: {
      botToken: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
    }
  }
];

export default function MessagingChannelsView({ showNotification }: { showNotification?: (msg: string, type: string) => void }) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'gsm' | 'channels' | 'logs'>('gsm');

  // Channels state
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [editingChannel, setEditingChannel] = useState<ChannelConfig | null>(null);
  const [isAddGsmModalOpen, setIsAddGsmModalOpen] = useState(false);

  // GSM Service state
  const [gsmStatus, setGsmStatus] = useState<GsmDeviceStatus>(gsmUsbService.status);
  const [isConnectingUsb, setIsConnectingUsb] = useState(false);
  const [isQueryingStatus, setIsQueryingStatus] = useState(false);

  // Send SMS Form state
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendText, setSendText] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [lastSentResult, setLastSentResult] = useState<GsmSentResult | null>(null);

  // Received Messages state
  const [receivedMessages, setReceivedMessages] = useState<GsmReceivedMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<GsmReceivedMessage | null>(null);

  // Terminal state
  const [atLogs, setAtLogs] = useState<AtLogEntry[]>([]);
  const [customAtCmd, setCustomAtCmd] = useState('AT+CSQ');
  const [isExecutingAt, setIsExecutingAt] = useState(false);

  // New GSM Modal Form state
  const [newGsmName, setNewGsmName] = useState('مودم GSM یو‌اس‌بی سیم‌کارت اصلی');
  const [newGsmPort, setNewGsmPort] = useState('Web Serial (پورت خودکار USB)');
  const [newGsmBaud, setNewGsmBaud] = useState('115200');
  const [newGsmSender, setNewGsmSender] = useState('09123456789');
  const [disableOtherChannelsOnAdd, setDisableOtherChannelsOnAdd] = useState(true);

  // Load Channels
  useEffect(() => {
    fetchChannels();
  }, []);

  // Listen to GSM Hardware changes
  useEffect(() => {
    const unsubStatus = gsmUsbService.addStatusListener((status) => {
      setGsmStatus(status);
    });

    const unsubLogs = gsmUsbService.addLogListener(() => {
      setAtLogs(gsmUsbService.getLogs());
    });

    const unsubMsg = gsmUsbService.addMessageListener(() => {
      setReceivedMessages(gsmUsbService.getReceivedMessages());
    });

    setAtLogs(gsmUsbService.getLogs());
    setReceivedMessages(gsmUsbService.getReceivedMessages());

    return () => {
      unsubStatus();
      unsubLogs();
      unsubMsg();
    };
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/data/sms_providers');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Map data from DB
        let mapped: ChannelConfig[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: (d.channelType === 'gsm' ? 'gsm' : d.channelType) || 'sms_panel',
          isEnabled: d.channelType === 'gsm' ? true : Boolean(d.isActive),
          priority: d.priority || (d.channelType === 'gsm' ? 1 : 99),
          status: d.channelType === 'gsm' ? 'connected' : 'disconnected',
          lastUsed: d.channelType === 'gsm' ? 'هم‌اکنون' : 'نامشخص',
          config: {
            apiKey: d.apiKey || '',
            apiEndpoint: d.apiEndpoint || '',
            apiSecret: d.apiSecret || '',
            lineNumber: d.senderNumber || '',
            port: d.metadata?.port || 'USB-Serial',
            baudRate: d.metadata?.baudRate || '115200',
            ...(d.metadata || {})
          },
          dailyRateLimit: d.dailyLimit || (d.channelType === 'gsm' ? 2500 : 10000),
          activeHours: { start: "00:00", end: "23:59" },
          defaultSenderId: d.senderNumber || ""
        }));

        // Ensure at least one GSM provider exists
        const hasGsm = mapped.some(c => c.type === 'gsm');
        if (!hasGsm) {
          mapped.unshift(defaultChannels[0]);
        }

        // Apply policy: GSM is priority 1 & active, others inactive
        mapped = mapped.map(ch => {
          if (ch.type === 'gsm') {
            return { ...ch, priority: 1, isEnabled: true, status: 'connected' as const };
          } else {
            return { ...ch, isEnabled: false, status: 'disconnected' as const };
          }
        }).sort((a, b) => a.priority - b.priority);

        setChannels(mapped);
      } else {
        setChannels(defaultChannels);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
      setChannels(defaultChannels);
    }
  };

  // Enforce GSM-only policy (disable all other channels)
  const handleEnforceGsmOnly = async () => {
    const updated = channels.map(ch => {
      if (ch.type === 'gsm') {
        return { ...ch, priority: 1, isEnabled: true, status: 'connected' as const };
      } else {
        return { ...ch, isEnabled: false, status: 'disconnected' as const };
      }
    }).sort((a, b) => a.priority - b.priority);

    setChannels(updated);

    try {
      const operations = updated.map(ch => ({
        key: 'sms_providers',
        type: 'append',
        data: {
          id: ch.id,
          name: ch.name,
          slug: ch.id,
          channelType: ch.type,
          priority: ch.priority,
          isActive: ch.isEnabled,
          dailyLimit: ch.dailyRateLimit
        }
      }));

      await fetch('/api/data/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations })
      });

      notify("دستگاه GSM به عنوان تنها کانال فعال تنظیم شد و سایر درگاه‌ها غیرفعال شدند", "success");
    } catch (err) {
      console.error(err);
      notify("سیاست کانال GSM بر روی حافظه اعمال شد", "success");
    }
  };

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showNotification) {
      showNotification(msg, type);
    }
  };

  // Reorder logic
  const handleReorder = async (newOrder: ChannelConfig[]) => {
    const updatedChannels = newOrder.map((ch, index) => ({
      ...ch,
      priority: index + 1
    }));
    setChannels(updatedChannels);
    
    try {
      const operations = updatedChannels.map(ch => ({
        key: 'sms_providers',
        type: 'append',
        data: {
          id: ch.id,
          priority: ch.priority
        }
      }));
      
      await fetch('/api/data/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations })
      });
      notify("اولویت کانال‌ها بروزرسانی شد", "success");
    } catch (err) {
      console.error(err);
      notify("خطا در بروزرسانی اولویت‌ها", "error");
    }
  };

  const toggleStatus = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChannels(channels.map(ch => {
      if (ch.id === id) return { ...ch, isEnabled: !ch.isEnabled };
      return ch;
    }));
    notify("وضعیت کانال تغییر کرد", "success");
  };

  const handleSaveChannel = async () => {
    if (!editingChannel) return;
    try {
      const payload = {
        id: editingChannel.id,
        name: editingChannel.name,
        slug: editingChannel.id,
        channelType: editingChannel.type,
        apiEndpoint: editingChannel.config?.apiEndpoint,
        apiKey: editingChannel.config?.apiKey,
        apiSecret: editingChannel.config?.apiSecret,
        senderNumber: editingChannel.config?.lineNumber || editingChannel.defaultSenderId,
        priority: editingChannel.priority,
        isActive: editingChannel.isEnabled,
        dailyLimit: editingChannel.dailyRateLimit,
        metadata: {
          ...editingChannel.config
        }
      };
      
      await fetch('/api/data/sms_providers/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setChannels(channels.map(ch => ch.id === editingChannel.id ? editingChannel : ch));
      setEditingChannel(null);
      notify("پیکربندی کانال ذخیره شد", "success");
    } catch (err) {
      console.error(err);
      notify("خطا در ذخیره تنظیمات کانال", "error");
    }
  };

  // Add new GSM Channel
  const handleAddNewGsmChannel = async () => {
    const newId = `ch-gsm-${Date.now().toString(36)}`;
    const newGsmChannel: ChannelConfig = {
      id: newId,
      name: newGsmName.trim() || "دستگاه GSM متصل به USB",
      type: "gsm",
      isEnabled: true,
      priority: 1,
      status: "connected",
      lastUsed: "هم‌اکنون",
      dailyRateLimit: 3000,
      activeHours: { start: "00:00", end: "23:59" },
      defaultSenderId: newGsmSender.trim() || "09123456789",
      config: {
        port: newGsmPort,
        baudRate: newGsmBaud,
        senderNumber: newGsmSender
      }
    };

    let updatedList = [newGsmChannel, ...channels.filter(c => c.id !== newId)];
    if (disableOtherChannelsOnAdd) {
      updatedList = updatedList.map(c => {
        if (c.id === newId) {
          return { ...c, isEnabled: true, priority: 1 };
        } else {
          return { ...c, isEnabled: false };
        }
      });
    }

    setChannels(updatedList);
    setIsAddGsmModalOpen(false);

    try {
      await fetch('/api/data/sms_providers/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newGsmChannel.id,
          name: newGsmChannel.name,
          slug: newGsmChannel.id,
          channelType: 'gsm',
          senderNumber: newGsmChannel.defaultSenderId,
          priority: 1,
          isActive: true,
          dailyLimit: newGsmChannel.dailyRateLimit,
          metadata: newGsmChannel.config
        })
      });
      notify("دستگاه GSM جدید با موفقیت اضافه شد", "success");
    } catch (e) {
      console.warn("Save note:", e);
      notify("دستگاه GSM جدید ثبت گردید", "success");
    }
  };

  // Web Serial Port Connection Handler
  const handleConnectUsb = async () => {
    setIsConnectingUsb(true);
    try {
      const res = await gsmUsbService.connectUsbPort(Number(gsmStatus.baudRate) || 115200);
      if (res.success) {
        notify(res.message, "success");
      } else {
        notify(res.message, "error");
      }
    } finally {
      setIsConnectingUsb(false);
    }
  };

  // Refresh hardware status via AT+CSQ & AT+COPS?
  const handleQueryHardware = async () => {
    setIsQueryingStatus(true);
    try {
      await gsmUsbService.runInitialHardwareSetup();
      notify("وضعیت سیگنال و سیم‌کارت مودم GSM بروزرسانی شد", "success");
    } catch (e) {
      notify("خطا در استعلام مودم", "error");
    } finally {
      setIsQueryingStatus(false);
    }
  };

  // Direct Send SMS via GSM Modem
  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendRecipient.trim()) {
      notify("لطفاً شماره گیرنده را وارد نمایید", "error");
      return;
    }
    if (!sendText.trim()) {
      notify("لطفاً متن پیامک را وارد نمایید", "error");
      return;
    }

    setIsSendingSms(true);
    try {
      const res = await gsmUsbService.sendSms(sendRecipient, sendText);
      setLastSentResult(res);
      if (res.success) {
        notify(`پیامک با موفقیت از طریق مودم GSM به ${sendRecipient} ارسال گردید`, "success");
        setSendText('');
      } else {
        notify(res.error || "خطا در ارسال پیامک با مودم GSM", "error");
      }
    } finally {
      setIsSendingSms(false);
    }
  };

  // Fetch received SMS from SIM Card
  const handleFetchReceived = async () => {
    setIsLoadingMessages(true);
    try {
      const msgs = await gsmUsbService.fetchReceivedMessages();
      setReceivedMessages(msgs);
      notify(`تعداد ${msgs.length} پیامک از حافظه سیم‌کارت بازخوانی شد`, "success");
    } catch (e) {
      notify("خطا در بازخوانی پیامک‌های سیم‌کارت", "error");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Delete received SMS
  const handleDeleteReceived = async (index: number) => {
    if (confirm(`آیا از حذف پیامک ردیف ${index} از سیم‌کارت مطمئن هستید؟`)) {
      const ok = await gsmUsbService.deleteReceivedMessage(index);
      if (ok) {
        setReceivedMessages(gsmUsbService.getReceivedMessages());
        if (selectedMessage?.index === index) setSelectedMessage(null);
        notify("پیامک از سیم‌کارت حذف شد", "success");
      }
    }
  };

  // Reply to incoming SMS
  const handleReplyToMessage = (msg: GsmReceivedMessage) => {
    setSendRecipient(msg.sender);
    setSendText(`در پاسخ به پیام شما: `);
    setActiveTab('gsm');
    notify(`شماره ${msg.sender} در بخش ارسال بارگذاری شد`, "info");
  };

  // Execute custom AT Command
  const handleExecuteAt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAtCmd.trim()) return;
    setIsExecutingAt(true);
    try {
      await gsmUsbService.executeAtCommand(customAtCmd);
    } catch (err: any) {
      notify(err.message || "خطا در اجرای دستور AT", "error");
    } finally {
      setIsExecutingAt(false);
    }
  };

  const getIconFixed = (type: string) => {
    switch (type) {
      case 'gsm': return <Usb className="w-5 h-5 text-emerald-600" />;
      case 'sms_panel': return <Server className="w-5 h-5" />;
      case 'whatsapp': return <Smartphone className="w-5 h-5" />;
      case 'telegram': return <MessageSquare className="w-5 h-5" />;
      case 'email': return <Mail className="w-5 h-5" />;
      case 'push': return <Bell className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  // Calculations for SMS length
  const charCount = sendText.length;
  const isPersian = /[^\u0000-\u007F]/.test(sendText);
  const partSize = isPersian ? 70 : 160;
  const partsCount = Math.ceil(charCount / partSize) || 1;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-slate-50 min-h-full" dir="rtl">
      
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
            <Radio className="w-4 h-4" />
            <span>مدیریت کانال‌های ارتباطی و درگاه سخت‌افزاری</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2.5">
            دستگاه GSM و تنظیمات کانال‌های پیام‌رسانی
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              USB GSM Dongle
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddGsmModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            افزودن دستگاه GSM جدید
          </button>

          <button
            onClick={handleEnforceGsmOnly}
            title="فعال‌سازی اختصاصی دستگاه GSM و غیرفعال‌سازی همه کانال‌های دیگر"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all border border-slate-300/80 flex items-center gap-2"
          >
            <Power className="w-4 h-4 text-emerald-600" />
            فعال‌سازی انحصاری GSM
          </button>
        </div>
      </div>

      {/* Policy Banner: Highlighting GSM active & others disabled */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Usb className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
              وضعیت کانال‌ها: دستگاه سخت‌افزاری GSM به عنوان کانال فعال انتخاب شده است
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              با توجه به سیاست تعریف شده، ارسال و دریافت پیامک مستقیماً از طریق مودم سیم‌کارتی متصل به درگاه USB انجام می‌شود و کلیه کانال‌های اینترنتی دیگر (پنل کاوه نگار، واتس‌اپ، تلگرام و...) موقتاً در وضعیت غیرفعال قرار دارند.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <span className="text-xs font-bold text-slate-500 bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200">
            کانال‌های غیرفعال: {toPersianDigits(channels.filter(c => !c.isEnabled).length)} درگاه
          </span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-lg border border-emerald-300/60 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            مودم GSM فعال است
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('gsm')}
          className={`px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${
            activeTab === 'gsm' 
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Usb className="w-4 h-4" />
          دستگاه GSM، ارسال و دریافت (USB)
        </button>

        <button
          onClick={() => setActiveTab('channels')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
            activeTab === 'channels' 
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          فهرست کانال‌ها و اولویت‌بندی ({toPersianDigits(channels.length)})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
            activeTab === 'logs' 
              ? 'bg-slate-800 text-white shadow-sm' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          ترمینال دستورات AT و لاگ‌ها
        </button>
      </div>

      {/* TAB 1: GSM DEVICE MANAGEMENT, SEND & RECEIVE */}
      {activeTab === 'gsm' && (
        <div className="space-y-6">
          
          {/* Hardware Status Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <Usb className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-800 text-base md:text-lg">
                      {gsmStatus.model || "مودم سیم‌کارتی GSM USB"}
                    </h3>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      gsmStatus.isConnected 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${gsmStatus.isConnected ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
                      {gsmStatus.isConnected ? 'متصل و آماده ارسال/دریافت' : 'عدم اتصال'}
                    </span>
                    {gsmStatus.isSimulated && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold">
                        حالت شبیه‌ساز فعال
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    پورت فعلی: <span className="font-mono text-slate-700 font-bold">{gsmStatus.portName}</span> | نرخ تبادل: <span className="font-mono font-bold text-slate-700">{gsmStatus.baudRate} bps</span>
                  </p>
                </div>
              </div>

              {/* Hardware Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleConnectUsb}
                  disabled={isConnectingUsb}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Usb className="w-4 h-4" />
                  {isConnectingUsb ? 'در حال اتصال پورت...' : 'اتصال درگاه USB (Web Serial)'}
                </button>

                <button
                  onClick={handleQueryHardware}
                  disabled={isQueryingStatus}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-200 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isQueryingStatus ? 'animate-spin' : ''}`} />
                  استعلام وضعیت مودم
                </button>

                <button
                  onClick={() => gsmUsbService.setSimulationMode(!gsmStatus.isSimulated)}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition-colors border border-amber-200 flex items-center gap-1.5"
                >
                  {gsmStatus.isSimulated ? 'سوئیچ به پورت فیزیکی' : 'تست با شبیه‌ساز'}
                </button>
              </div>
            </div>

            {/* Hardware Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Signal Strength */}
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span className="font-bold flex items-center gap-1">
                    <Signal className="w-3.5 h-3.5 text-emerald-600" />
                    قدرت سیگنال (CSQ)
                  </span>
                  <span className="font-mono font-bold text-slate-700">{toPersianDigits(gsmStatus.signalStrength)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-1">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${gsmStatus.signalStrength}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500">
                  کیفیت آنتن: {gsmStatus.signalStrength > 70 ? 'عالی و پایدار' : gsmStatus.signalStrength > 40 ? 'متوسط' : 'ضعیف'} (CSQ: {toPersianDigits(gsmStatus.csqRaw)})
                </p>
              </div>

              {/* Operator */}
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/70">
                <div className="text-xs text-slate-500 mb-1 font-bold flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-indigo-600" />
                  اپراتور سیم‌کارت
                </div>
                <p className="text-sm font-black text-slate-800">{gsmStatus.operator || 'همراه اول (IR-MCI)'}</p>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">شبکه ثبت شده (Registered)</p>
              </div>

              {/* SIM & Storage */}
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/70">
                <div className="text-xs text-slate-500 mb-1 font-bold flex items-center gap-1">
                  <Inbox className="w-3.5 h-3.5 text-amber-600" />
                  وضعیت سیم‌کارت
                </div>
                <p className="text-sm font-black text-slate-800">
                  {gsmStatus.simStatus === 'ready' ? 'آماده‌به‌کار (Ready)' : 'نیاز به پین‌کد'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  حافظه پیامک: {toPersianDigits(gsmStatus.storageUsed)} از {toPersianDigits(gsmStatus.storageTotal)}
                </p>
              </div>

              {/* IMEI & Manufacturer */}
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/70">
                <div className="text-xs text-slate-500 mb-1 font-bold flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  شناسه سخت‌افزاری (IMEI)
                </div>
                <p className="text-xs font-mono font-bold text-slate-800 truncate" title={gsmStatus.imei}>
                  {gsmStatus.imei}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {gsmStatus.manufacturer || 'SIMCOM Electronics'}
                </p>
              </div>

            </div>
          </div>

          {/* TWO MAIN MODULES: SEND SMS & RECEIVE SMS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT / TOP: SEND SMS (ارسال پیامک مستقیم از مودم GSM) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                    <Send className="w-5 h-5 text-emerald-600" />
                    ارسال پیامک از طریق مودم GSM
                  </h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    درگاه اختصاصی USB
                  </span>
                </div>

                <form onSubmit={handleSendSms} className="space-y-4">
                  {/* Recipient Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>شماره موبایل گیرنده:</span>
                      <span className="text-[11px] text-slate-400 font-normal">نمونه: ۰۹۱۲۳۴۵۶۷۸۹</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="09123456789"
                        value={sendRecipient}
                        onChange={(e) => setSendRecipient(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all text-left"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-700">متن پیامک:</label>
                      <span className="text-[11px] text-slate-500">
                        {toPersianDigits(charCount)} کاراکتر | {toPersianDigits(partsCount)} پارت پیامک
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={sendText}
                      onChange={(e) => setSendText(e.target.value)}
                      placeholder="متن پیامک را در این قسمت وارد نمایید..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all leading-relaxed"
                    ></textarea>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">نمونه‌های سریع:</span>
                    <button
                      type="button"
                      onClick={() => setSendText('سلام و احترام، سفارش و فاکتور شما تایید و در مرحله آماده‌سازی قرار گرفت.')}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition-colors"
                    >
                      تایید فاکتور
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendText('مشتری گرامی، پیامک آزمایشی با موفقیت از مودم سخت‌افزاری GSM ارسال شد.')}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition-colors"
                    >
                      پیام تست مودم
                    </button>
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={isSendingSms}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-100 hover:shadow-emerald-200 flex items-center justify-center gap-2 text-sm mt-2"
                  >
                    <Send className={`w-4 h-4 ${isSendingSms ? 'animate-bounce' : ''}`} />
                    {isSendingSms ? 'در حال ارسال از درگاه مودم GSM...' : 'ارسال مستقیم پیامک با مودم GSM'}
                  </button>
                </form>
              </div>

              {/* Sent Feedback */}
              {lastSentResult && (
                <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
                  lastSentResult.success 
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50/80 border-rose-200 text-rose-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {lastSentResult.success ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                    <span>
                      {lastSentResult.success 
                        ? `ارسال موفق به ${lastSentResult.recipient} (شناسه: ${lastSentResult.messageId})` 
                        : `خطا: ${lastSentResult.error}`}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">{lastSentResult.timestamp}</span>
                </div>
              )}
            </div>

            {/* RIGHT / BOTTOM: RECEIVE SMS (صندوق دریافت پیامک‌های سیم‌کارت) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-black text-slate-800 text-base">
                      صندوق دریافت پیامک‌های سیم‌کارت (Inbox)
                    </h3>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                      {toPersianDigits(receivedMessages.length)} پیام
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleFetchReceived}
                      disabled={isLoadingMessages}
                      title="استعلام پیام‌های جدید از سیم‌کارت"
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                      بازخوانی پیام‌ها
                    </button>
                    <button
                      onClick={() => gsmUsbService.simulateIncomingMessage("0912" + Math.floor(1000000 + Math.random() * 9000000), "سلام و احترام، تاییدیه دریافت شد.")}
                      title="تست پیامک ورودی جدید"
                      className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors border border-indigo-200"
                    >
                      + شبیه‌سازی دریافت
                    </button>
                  </div>
                </div>

                {/* Received Messages List */}
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {receivedMessages.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold">هیچ پیامک دریافتی در حافظه سیم‌کارت ثبت نشده است</p>
                      <p className="text-[11px] text-slate-400 mt-1">روی دکمه «بازخوانی پیام‌ها» کلیک کنید.</p>
                    </div>
                  ) : (
                    receivedMessages.map((msg) => (
                      <div 
                        key={msg.index}
                        className={`p-3.5 rounded-xl border transition-all ${
                          msg.status === 'unread' 
                            ? 'bg-indigo-50/40 border-indigo-200 shadow-xs' 
                            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {msg.sender}
                            </span>
                            {msg.status === 'unread' && (
                              <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-md">
                                جدید
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 font-mono">{msg.timestamp}</span>
                            <button
                              onClick={() => handleDeleteReceived(msg.index)}
                              title="حذف از سیم‌کارت"
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-medium mb-3">
                          {msg.text}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 text-[11px]">
                          <span className="text-slate-400">خانه حافظه سیم: #{toPersianDigits(msg.index)}</span>
                          <button
                            onClick={() => handleReplyToMessage(msg)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            پاسخ سریع به فرستنده
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>پیام‌های خوانده‌شده از طریق پروتکل AT+CMGL بازخوانی شده‌اند.</span>
                <span className="font-bold text-slate-700">پشتیبانی کامل از متن فارسی (UCS2)</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: ALL CHANNELS & FAILOVER HIERARCHY */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-black text-slate-800 text-base">اولویت کانال‌های ارسال پیام</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                کانال‌های ارتباطی را می‌توانید بکشید و رها کنید (Drag & Drop) تا اولویت تغییر کند.
              </p>
            </div>
            
            <button
              onClick={handleEnforceGsmOnly}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors self-start sm:self-center"
            >
              <Check className="w-4 h-4" />
              غیرفعال‌سازی همه به جز دستگاه GSM
            </button>
          </div>

          <Reorder.Group 
            axis="y" 
            values={channels} 
            onReorder={handleReorder}
            className="space-y-3"
          >
            {channels.map((channel) => (
              <Reorder.Item 
                key={channel.id} 
                value={channel}
                className={`bg-white rounded-2xl border p-4.5 transition-all shadow-xs ${
                  channel.type === 'gsm' 
                    ? 'border-emerald-300 ring-2 ring-emerald-50' 
                    : channel.isEnabled 
                      ? 'border-indigo-200' 
                      : 'border-slate-200 opacity-75 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      channel.type === 'gsm' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : channel.isEnabled 
                          ? 'bg-indigo-50 text-indigo-600' 
                          : 'bg-slate-200 text-slate-500'
                    }`}>
                      {getIconFixed(channel.type)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800 text-sm">{channel.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          channel.type === 'gsm'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          اولویت #{toPersianDigits(channel.priority)}
                        </span>
                        {channel.type === 'gsm' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600 text-white rounded-md">
                            کانال اصلی (GSM)
                          </span>
                        )}
                        {!channel.isEnabled && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                            غیرفعال
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        فرستنده پیش‌فرض: <span className="font-mono text-slate-700 font-bold">{channel.defaultSenderId || 'تعریف نشده'}</span> | سقف روزانه: {toPersianDigits(channel.dailyRateLimit.toLocaleString())} پیام
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {/* Toggle Switch */}
                    <div 
                      className="relative inline-flex items-center shrink-0 cursor-pointer"
                      onClick={(e) => toggleStatus(e, channel.id)}
                    >
                      <div className={`w-11 h-6 rounded-full transition-colors ${channel.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <div className={`absolute w-5 h-5 bg-white rounded-full shadow transition-transform top-0.5 left-0.5 ${channel.isEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>

                    <button
                      onClick={() => setEditingChannel(channel)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                      title="پیکربندی تنظیمات"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      )}

      {/* TAB 3: AT COMMANDS TERMINAL & LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg border border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="font-mono text-sm font-bold text-emerald-400">
                  کنسول تعاملی دستورات سخت‌افزاری AT (GSM Serial Console)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {gsmStatus.portName} ({gsmStatus.baudRate} bps)
              </span>
            </div>

            {/* Terminal Window */}
            <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs h-72 overflow-y-auto space-y-1.5 text-left border border-slate-800/80 mb-4" dir="ltr">
              <div className="text-slate-500 font-bold pb-1 border-b border-slate-800">
                # GSM AT Command Engine Ready. Listening on {gsmStatus.portName}...
              </div>
              {atLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-600 shrink-0 text-[10px]">{log.time}</span>
                  {log.type === 'sent' && <span className="text-amber-400 font-bold">&gt;&gt;</span>}
                  {log.type === 'received' && <span className="text-emerald-400 font-bold">&lt;&lt;</span>}
                  {log.type === 'info' && <span className="text-cyan-400 font-bold">[INFO]</span>}
                  {log.type === 'error' && <span className="text-rose-400 font-bold">[ERR]</span>}
                  <span className={`${
                    log.type === 'sent' ? 'text-amber-200' :
                    log.type === 'received' ? 'text-emerald-300' :
                    log.type === 'error' ? 'text-rose-300' : 'text-slate-300'
                  } break-all`}>
                    {log.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Interactive AT Command Input */}
            <form onSubmit={handleExecuteAt} className="flex gap-2" dir="ltr">
              <input
                type="text"
                value={customAtCmd}
                onChange={(e) => setCustomAtCmd(e.target.value)}
                placeholder="AT command (e.g. AT+CSQ, AT+COPS?, AT+CMGF=1, AT+CPMS?)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-emerald-300 outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isExecutingAt}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isExecutingAt ? 'EXEC...' : 'SEND AT'}
              </button>
            </form>

            {/* Quick Command Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
              <span className="text-slate-500 text-[11px]">فرمان‌های متداول:</span>
              <button 
                onClick={() => setCustomAtCmd('AT')} 
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[11px]"
              >
                AT (Ping)
              </button>
              <button 
                onClick={() => setCustomAtCmd('AT+CSQ')} 
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[11px]"
              >
                AT+CSQ (سیگنال)
              </button>
              <button 
                onClick={() => setCustomAtCmd('AT+COPS?')} 
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[11px]"
              >
                AT+COPS? (اپراتور)
              </button>
              <button 
                onClick={() => setCustomAtCmd('AT+CPIN?')} 
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[11px]"
              >
                AT+CPIN? (وضعیت سیم)
              </button>
              <button 
                onClick={() => setCustomAtCmd('AT+CMGL="ALL"')} 
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[11px]"
              >
                AT+CMGL="ALL" (خواندن پیامک‌ها)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW GSM DEVICE (افزودن دستگاه GSM جدید) */}
      <AnimatePresence>
        {isAddGsmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setIsAddGsmModalOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative z-10 border border-slate-200"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Usb className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base">افزودن دستگاه GSM جدید (USB)</h3>
                    <p className="text-xs text-slate-500">پیکربندی سخت‌افزار مودم سیم‌کارتی جهت ارسال و دریافت پیامک</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddGsmModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">نام دستگاه GSM:</label>
                  <input
                    type="text"
                    value={newGsmName}
                    onChange={(e) => setNewGsmName(e.target.value)}
                    placeholder="مثال: مودم GSM سیم‌کارت اول دفتر"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">پورت سخت‌افزاری:</label>
                    <input
                      type="text"
                      value={newGsmPort}
                      onChange={(e) => setNewGsmPort(e.target.value)}
                      placeholder="COM3 یا Web Serial"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">نرخ تبادل (Baud Rate):</label>
                    <select
                      value={newGsmBaud}
                      onChange={(e) => setNewGsmBaud(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white font-mono"
                    >
                      <option value="115200">115200 (پیشنهادی برای دانگل 4G/3G)</option>
                      <option value="9600">9600 (استاندارد SIM800/Wavecom)</option>
                      <option value="19200">19200</option>
                      <option value="38400">38400</option>
                      <option value="57600">57600</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">شماره سیم‌کارت درون مودم:</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newGsmSender}
                    onChange={(e) => setNewGsmSender(e.target.value)}
                    placeholder="09123456789"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono text-slate-800 outline-none focus:border-emerald-500 focus:bg-white text-left"
                  />
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/80 flex items-center gap-3 cursor-pointer" onClick={() => setDisableOtherChannelsOnAdd(!disableOtherChannelsOnAdd)}>
                  <div className="text-emerald-600">
                    {disableOtherChannelsOnAdd ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">
                      غیرفعال‌سازی سایر درگاه‌ها پس از افزودن این دستگاه
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      مطابق درخواست، این مودم به عنوان تنها کانال فعال تنظیم شده و سایر کانال‌ها خاموش می‌شوند.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={handleAddNewGsmChannel}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2 text-sm"
                >
                  <Check className="w-4 h-4" />
                  ثبت و فعال‌سازی دستگاه GSM
                </button>
                <button
                  onClick={() => setIsAddGsmModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWER: EDIT CHANNEL CONFIG */}
      <AnimatePresence>
        {editingChannel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end p-0">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-xs"
              onClick={() => setEditingChannel(null)}
            />
            
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-white w-full sm:max-w-md h-full sm:h-screen sm:rounded-l-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden border-l border-slate-200/60"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    {getIconFixed(editingChannel.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">پیکربندی پیشرفته</h3>
                    <p className="text-xs text-slate-500">{editingChannel.name}</p>
                  </div>
                </div>
                <button onClick={() => setEditingChannel(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/40">
                
                {/* Name & Sender */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500">مشخصات اصلی درگاه</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">نام درگاه:</label>
                    <input
                      type="text"
                      value={editingChannel.name}
                      onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">شماره خط یا سیم‌کارت فرستنده:</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={editingChannel.defaultSenderId}
                      onChange={(e) => setEditingChannel({ ...editingChannel, defaultSenderId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-800 text-left"
                    />
                  </div>
                </div>

                {/* GSM Specific Settings */}
                {editingChannel.type === 'gsm' ? (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-emerald-200">
                    <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <Usb className="w-4 h-4 text-emerald-600" />
                      تنظیمات اتصال پورت سخت‌افزاری GSM
                    </h4>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">پورت سریال (Port):</label>
                      <input
                        type="text"
                        value={editingChannel.config?.port || 'COM3'}
                        onChange={(e) => setEditingChannel({
                          ...editingChannel,
                          config: { ...editingChannel.config, port: e.target.value }
                        })}
                        placeholder="Web Serial یا COM3 یا /dev/ttyUSB0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">نرخ باود (Baud Rate):</label>
                      <select
                        value={editingChannel.config?.baudRate || '115200'}
                        onChange={(e) => setEditingChannel({
                          ...editingChannel,
                          config: { ...editingChannel.config, baudRate: e.target.value }
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono"
                      >
                        <option value="115200">115200 bps</option>
                        <option value="9600">9600 bps</option>
                        <option value="19200">19200 bps</option>
                        <option value="38400">38400 bps</option>
                        <option value="57600">57600 bps</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleConnectUsb}
                      className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors mt-2"
                    >
                      <Usb className="w-3.5 h-3.5" />
                      اتصال مستقیم از درگاه USB
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500">تنظیمات وب‌سرویس و کلیدها</h4>
                    {Object.keys(editingChannel.config || {}).map((key) => (
                      <div key={key} className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">{key}:</label>
                        <input
                          type="text"
                          value={editingChannel.config[key]}
                          onChange={(e) => setEditingChannel({
                            ...editingChannel,
                            config: { ...editingChannel.config, [key]: e.target.value }
                          })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Daily limit & active state */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500">محدودیت‌ها و وضعیت</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">سقف پیام روزانه:</label>
                    <input
                      type="number"
                      value={editingChannel.dailyRateLimit}
                      onChange={(e) => setEditingChannel({
                        ...editingChannel,
                        dailyRateLimit: Number(e.target.value) || 1000
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">فعال بودن این درگاه:</span>
                    <div 
                      className="relative inline-flex items-center shrink-0 cursor-pointer"
                      onClick={() => setEditingChannel({ ...editingChannel, isEnabled: !editingChannel.isEnabled })}
                    >
                      <div className={`w-11 h-6 rounded-full transition-colors ${editingChannel.isEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                      <div className={`absolute w-5 h-5 bg-white rounded-full shadow transition-transform top-0.5 left-0.5 ${editingChannel.isEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-white">
                <button
                  onClick={handleSaveChannel}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 text-sm"
                >
                  <Check className="w-4 h-4" />
                  ذخیره پیکربندی درگاه
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
