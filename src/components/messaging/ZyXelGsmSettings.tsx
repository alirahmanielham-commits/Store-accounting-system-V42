import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Usb,
  Smartphone,
  Radio,
  Signal,
  Send,
  Inbox,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Terminal,
  Copy,
  Check,
  Info,
  Settings,
  Play,
  Eye,
  MessageSquare,
  Power,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  ArrowDownLeft,
  ArrowUpRight,
  Database
} from "lucide-react";
import {
  gsmUsbService,
  GsmDeviceStatus,
  GsmReceivedMessage,
  AtLogEntry,
  GsmSentResult
} from "../../services/messaging/GsmUsbService";
import { toPersianDigits } from "../../utils/format";

interface ZyXelGsmSettingsProps {
  storeSettings?: any;
  onUpdateSettings?: (key: string, value: any) => void;
  showNotification?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function ZyXelGsmSettings({
  storeSettings,
  onUpdateSettings,
  showNotification
}: ZyXelGsmSettingsProps) {
  const [deviceStatus, setDeviceStatus] = useState<GsmDeviceStatus>(gsmUsbService.status);
  const [activeSubTab, setActiveSubTab] = useState<"status" | "send" | "inbox" | "terminal">("status");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedBaud, setSelectedBaud] = useState<number>(gsmUsbService.status.baudRate || 115200);
  const [selectedProfile, setSelectedProfile] = useState<string>("zyxel_3g");

  // Direct Send State
  const [recipientNumber, setRecipientNumber] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastSentResult, setLastSentResult] = useState<GsmSentResult | null>(null);

  // Received Messages State
  const [receivedMessages, setReceivedMessages] = useState<GsmReceivedMessage[]>(gsmUsbService.getReceivedMessages());
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<GsmReceivedMessage | null>(null);

  // AT Console State
  const [atCommandInput, setAtCommandInput] = useState("");
  const [atLogs, setAtLogs] = useState<AtLogEntry[]>(gsmUsbService.getLogs());
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);

  // Sim message text test input
  const [simTestSender, setSimTestSender] = useState("09123456789");
  const [simTestText, setSimTestText] = useState("تایید واریز فاکتور شماره ۱۰۸۲ به مبلغ ۴,۸۵۰,۰۰۰ ریال.");
  const [showSimTestModal, setShowSimTestModal] = useState(false);

  useEffect(() => {
    const unsubStatus = gsmUsbService.addStatusListener((newStatus) => {
      setDeviceStatus(newStatus);
    });

    const unsubLogs = gsmUsbService.addLogListener(() => {
      setAtLogs(gsmUsbService.getLogs());
    });

    const unsubMsg = gsmUsbService.addMessageListener((msg) => {
      setReceivedMessages(gsmUsbService.getReceivedMessages());
      if (showNotification) {
        showNotification(`پیامک جدید از ${msg.sender} در مودم دریافت شد`, "info");
      }
    });

    return () => {
      unsubStatus();
      unsubLogs();
      unsubMsg();
    };
  }, [showNotification]);

  const notify = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    if (showNotification) {
      showNotification(msg, type);
    }
  };

  // Connect via Web Serial
  const handleConnectUsb = async () => {
    setIsConnecting(true);
    try {
      const res = await gsmUsbService.connectUsbPort(selectedBaud);
      if (res.success) {
        notify(res.message, "success");
        if (onUpdateSettings) {
          onUpdateSettings("notify_method", "gsm");
          onUpdateSettings("notify_api_key", `USB-Serial (${selectedBaud} bps) - ZyXEL 3G`);
        }
      } else {
        notify(res.message, "error");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect
  const handleDisconnectUsb = async () => {
    await gsmUsbService.disconnect();
    notify("اتصال مودم با پورت USB قطع گردید", "info");
  };

  // Query status via AT commands
  const handleRefreshHardwareStatus = async () => {
    setIsQuerying(true);
    try {
      await gsmUsbService.runInitialHardwareSetup();
      notify("اطلاعات سخت‌افزاری، قدرت سیگنال و سیم‌کارت مودم ZyXEL بروزرسانی شد", "success");
    } catch {
      notify("خطا در استعلام مودم", "error");
    } finally {
      setIsQuerying(false);
    }
  };

  // Profile Change
  const handleProfileChange = (profileKey: string) => {
    setSelectedProfile(profileKey);
    gsmUsbService.setDeviceProfile(profileKey as any);
    notify(`پروفایل مودم به «${profileKey === "zyxel_3g" ? "مودم زایکسل ZyXEL 3G" : profileKey}» تغییر یافت`, "info");
  };

  // Toggle Simulation
  const handleToggleSimulation = (enabled: boolean) => {
    gsmUsbService.setSimulationMode(enabled);
    notify(
      enabled
        ? "حالت شبیه‌ساز سخت‌افزار مودم ZyXEL فعال شد (امکان تست ارسال و دریافت)"
        : "حالت شبیه‌ساز غیرفعال شد (اتصال به سخت‌افزار فیزیکی USB)",
      "info"
    );
  };

  // Direct Send SMS via ZyXEL 3G Modem
  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientNumber.trim()) {
      notify("لطفاً شماره گیرنده را وارد فرمایید", "warning");
      return;
    }
    if (!messageBody.trim()) {
      notify("متن پیامک نمی‌تواند خالی باشد", "warning");
      return;
    }

    setIsSending(true);
    try {
      const res = await gsmUsbService.sendSms(recipientNumber, messageBody);
      setLastSentResult(res);

      if (res.success) {
        notify(`پیامک با موفقیت از طریق مودم ZyXEL 3G به ${recipientNumber} ارسال شد`, "success");
        
        // Also persist to system sms_messages table so it appears in CRM and SMS manager
        try {
          const smsRecord = {
            id: res.messageId || `GSM-${Date.now().toString(36)}`,
            recipientNumber: recipientNumber.trim(),
            recipientName: "گیرنده مستقیم مودم",
            messageBody: messageBody.trim(),
            status: "delivered",
            source: "panel",
            providerId: "zyxel_3g_usb",
            recipientType: "manual",
            partsCount: res.partsCount || 1,
            sentAt: new Date().toISOString(),
            deliveredAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };

          await fetch("/api/data/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operations: [{ key: "sms_messages", type: "append", data: smsRecord }]
            })
          });

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("sms_messages_updated", { detail: { record: smsRecord } }));
          }
        } catch (dbErr) {
          console.warn("Could not persist sms_messages log:", dbErr);
        }

        setMessageBody("");
      } else {
        notify(res.error || "خطا در ارسال پیامک با مودم ZyXEL", "error");
      }
    } finally {
      setIsSending(false);
    }
  };

  // Fetch received SMS
  const handleFetchInbox = async () => {
    setIsLoadingMessages(true);
    try {
      const msgs = await gsmUsbService.fetchReceivedMessages();
      setReceivedMessages(msgs);
      notify(`تعداد ${toPersianDigits(msgs.length)} پیامک از سیم‌کارت مودم بازخوانی شد`, "success");
    } catch {
      notify("خطا در بازخوانی پیامک‌های سیم‌کارت", "error");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Delete received SMS
  const handleDeleteReceived = async (index: number) => {
    const ok = await gsmUsbService.deleteReceivedMessage(index);
    if (ok) {
      setReceivedMessages(gsmUsbService.getReceivedMessages());
      if (selectedMessage?.index === index) setSelectedMessage(null);
      notify("پیامک از سیم‌کارت مودم حذف شد", "success");
    }
  };

  // Execute AT Command from Console
  const handleExecuteAt = async (cmdToRun?: string) => {
    const cmd = cmdToRun || atCommandInput;
    if (!cmd.trim()) return;

    setIsExecutingCommand(true);
    try {
      await gsmUsbService.executeAtCommand(cmd);
      if (!cmdToRun) setAtCommandInput("");
    } finally {
      setIsExecutingCommand(false);
    }
  };

  // Add simulated incoming message
  const handleAddSimulatedIncoming = () => {
    if (!simTestSender.trim() || !simTestText.trim()) return;
    gsmUsbService.simulateIncomingMessage(simTestSender, simTestText);
    setReceivedMessages(gsmUsbService.getReceivedMessages());
    setShowSimTestModal(false);
    notify(`پیامک تستی جدید از ${simTestSender} دریافت شد`, "success");
  };

  // Signal color & bar
  const getSignalMeta = (csq: number) => {
    if (csq >= 20) return { label: "عالی (3G/HSDPA)", color: "text-emerald-600 bg-emerald-50 border-emerald-200", bar: "bg-emerald-500", pct: 95 };
    if (csq >= 14) return { label: "خوب", color: "text-blue-600 bg-blue-50 border-blue-200", bar: "bg-blue-500", pct: 75 };
    if (csq >= 8) return { label: "متوسط", color: "text-amber-600 bg-amber-50 border-amber-200", bar: "bg-amber-500", pct: 45 };
    return { label: "ضعیف", color: "text-rose-600 bg-rose-50 border-rose-200", bar: "bg-rose-500", pct: 20 };
  };

  const signalMeta = getSignalMeta(deviceStatus.csqRaw);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" dir="rtl">
      {/* Top Banner / Device Identity */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <Usb className="w-7 h-7 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  مودم سیم‌کارتی ZyXEL 3G (اتصال پورت USB)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                  مدل ZyXEL MAX218M / 3G Dongle
                </span>
                {deviceStatus.isConnected ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    متصل به پورت USB
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    آماده اتصال
                  </span>
                )}
                {deviceStatus.isSimulated && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                    حالت شبیه‌ساز فعال
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                اتصال مستقیم به دانگل زایکسل از طریق درگاه سریال USB و ارسال و دریافت بلادرنگ پیامک‌های سازمانی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {deviceStatus.isConnected ? (
              <>
                <button
                  onClick={handleRefreshHardwareStatus}
                  disabled={isQuerying}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  title="استعلام مجدد وضعیت آنتن و سیم‌کارت"
                >
                  <RefreshCw className={`w-4 h-4 ${isQuerying ? "animate-spin text-indigo-400" : ""}`} />
                  استعلام وضعیت
                </button>
                <button
                  onClick={handleDisconnectUsb}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Power className="w-4 h-4" />
                  قطع اتصال
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectUsb}
                disabled={isConnecting}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Usb className={`w-4 h-4 ${isConnecting ? "animate-bounce" : ""}`} />
                {isConnecting ? "در حال باز کردن پورت..." : "اتصال به پورت USB مودم"}
              </button>
            )}
          </div>
        </div>

        {/* Quick Hardware Metrics bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block mb-1">سازنده و مدل</span>
            <span className="font-bold text-white truncate block">
              {deviceStatus.manufacturer} - {deviceStatus.model}
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block mb-1">اپراتور سیم‌کارت</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Signal className="w-3.5 h-3.5" />
              {deviceStatus.operator || "همراه اول (IR-MCI)"}
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block mb-1">قدرت آنتن‌دهی</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${signalMeta.bar} transition-all duration-500`}
                  style={{ width: `${deviceStatus.signalStrength}%` }}
                ></div>
              </div>
              <span className="font-mono font-bold text-white">
                {toPersianDigits(deviceStatus.signalStrength)}%
              </span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block mb-1">شناسه IMEI</span>
            <span className="font-mono font-bold text-indigo-300 block truncate">
              {deviceStatus.imei || "863920194827103"}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50/70 px-6 gap-2 overflow-x-auto">
        {[
          { id: "status", label: "پیکربندی و وضعیت مودم", icon: Settings },
          { id: "send", label: "ارسال پیامک از مودم", icon: Send },
          { id: "inbox", label: `صندوق ورودی سیم‌کارت (${toPersianDigits(receivedMessages.length)})`, icon: Inbox },
          { id: "terminal", label: "ترمینال و دستورات AT", icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`py-3.5 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-indigo-600 text-indigo-700 bg-white shadow-xs"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content Container */}
      <div className="p-6">
        {/* TAB 1: STATUS & CONFIGURATION */}
        {activeSubTab === "status" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Port & Device Settings */}
              <div className="lg:col-span-2 space-y-6">
                <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-xs">
                  <h4 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                    <Usb className="w-4 h-4 text-indigo-600" />
                    تنظیمات درگاه اتصال پورت سریال USB
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">
                        پروفایل دستگاه مودم
                      </label>
                      <select
                        value={selectedProfile}
                        onChange={(e) => handleProfileChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="zyxel_3g">مودم ۳G زایکسل (ZyXEL 3G Modem - پیشنهادی)</option>
                        <option value="huawei_3g">مودم هوآوی ۳G/4G (Huawei E303 / E3531)</option>
                        <option value="dlink_3g">مودم دی‌لینک (D-Link DWM-157)</option>
                        <option value="generic">مودم عمومی سیم‌کارتی GSM / 3G USB</option>
                      </select>
                      <span className="text-[11px] text-gray-400 block mt-1">
                        پیکربندی دستورات اولیه متناسب با مودم زایکسل ZyXEL 3G بهینه‌سازی شده است.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5">
                        نرخ تبادل داده (Baud Rate)
                      </label>
                      <select
                        value={selectedBaud}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSelectedBaud(val);
                          gsmUsbService.status.baudRate = val;
                        }}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 font-mono"
                        dir="ltr"
                      >
                        <option value={115200}>115200 bps (پیش‌فرض ZyXEL 3G)</option>
                        <option value={57600}>57600 bps</option>
                        <option value={19200}>19200 bps</option>
                        <option value={9600}>9600 bps</option>
                      </select>
                      <span className="text-[11px] text-gray-400 block mt-1">
                        بیشتر مودم‌های 3G از استاندارد ۱۱۵۲۰۰ برای ارسال سریع پیامک استفاده می‌کنند.
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deviceStatus.isSimulated}
                          onChange={(e) => handleToggleSimulation(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                      <div>
                        <span className="text-xs font-bold text-gray-800 block">
                          حالت شبیه‌ساز نرم‌افزاری مودم (Simulation Mode)
                        </span>
                        <span className="text-[11px] text-gray-500 block">
                          تست کامل ارسال و دریافت بدون نیاز به اتصال فیزیکی یا در مرورگرهای بدون Web Serial
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleRefreshHardwareStatus}
                      className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      تست دستورات AT
                    </button>
                  </div>
                </div>

                {/* ZyXEL Hardware Specs Box */}
                <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-5">
                  <h4 className="font-bold text-indigo-900 text-sm mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    راهنمای اتصال مودم ZyXEL 3G در سیستم
                  </h4>
                  <ul className="text-xs text-indigo-950 space-y-2 leading-relaxed list-disc list-inside">
                    <li>
                      مودم <strong className="font-bold">ZyXEL 3G</strong> را به یکی از درگاه‌های USB رایانه متصل کنید.
                    </li>
                    <li>
                      سیم‌کارت (همراه اول، ایرانسل یا رایتل) با شارژ ریالی یا بسته فعال را داخل مودم قرار دهید و مطمئن شوید پین‌کد آن غیرفعال باشد.
                    </li>
                    <li>
                      با کلیک روی دکمه <strong className="font-bold">«اتصال به پورت USB مودم»</strong>، از پنجره مرورگر پورت سریال مربوط به مودم زایکسل را انتخاب نمایید.
                    </li>
                    <li>
                      سیستم به صورت خودکار دستورات پیکربندی <code className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-indigo-800">AT+CMGF=1</code> و <code className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-indigo-800">AT+CSCS="GSM"</code> را ارسال نموده و وضعیت آنتن را پایش می‌کند.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Live Status Cards */}
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-xs">
                  <h4 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-indigo-600" />
                    وضعیت سیگنال و سیم‌کارت
                  </h4>

                  <div className="space-y-3.5">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-gray-500">کیفیت سیگنال آنتن</span>
                        <span className="font-bold text-gray-700 font-mono">
                          CSQ: {toPersianDigits(deviceStatus.csqRaw)}/31 ({toPersianDigits(deviceStatus.signalStrength)}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${signalMeta.bar} transition-all duration-500`}
                          style={{ width: `${deviceStatus.signalStrength}%` }}
                        ></div>
                      </div>
                      <span className={`inline-block mt-1.5 px-2 py-0.5 text-[11px] font-bold rounded-lg border ${signalMeta.color}`}>
                        {signalMeta.label}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-gray-500">وضعیت سیم‌کارت (SIM)</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        آماده‌به‌کار (READY)
                      </span>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-gray-500">اپراتور شبکه</span>
                      <span className="font-bold text-gray-800">
                        {deviceStatus.operator || "همراه اول (IR-MCI)"}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-gray-500">حافظه پیامک سیم‌کارت</span>
                      <span className="font-bold text-indigo-600 font-mono">
                        {toPersianDigits(receivedMessages.length)} / ۳۰ پیام
                      </span>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-gray-500">آخرین استعلام</span>
                      <span className="text-gray-600 font-bold">{deviceStatus.lastChecked}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-800 leading-relaxed">
                    <strong className="font-bold block mb-0.5">پشتیبانی از کدهای فارسی (UCS-2 Unicode)</strong>
                    کلیه پیامک‌های ارسالی و دریافتی با کدگذاری استاندارد فارسی پردازش شده و مشکل علامت سوال یا به‌هم‌ریختگی حروف در گوشی مخاطب وجود ندارد.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DIRECT SEND SMS VIA ZYXEL 3G MODEM */}
        {activeSubTab === "send" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-600" />
                  ارسال پیامک از طریق سیم‌کارت مودم ZyXEL 3G
                </h4>
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                  هزینه: تعرفه استاندارد سیم‌کارت (بدون فیلتر بلک‌لیست)
                </span>
              </div>

              <form onSubmit={handleSendSms} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    شماره موبایل گیرنده
                  </label>
                  <input
                    type="text"
                    value={recipientNumber}
                    onChange={(e) => setRecipientNumber(e.target.value)}
                    placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 font-mono text-left text-sm"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-700">متن پیامک</label>
                    <span className="text-[11px] text-gray-500 font-mono">
                      کاراکترها: {toPersianDigits(messageBody.length)} | پارت‌ها:{" "}
                      {toPersianDigits(Math.ceil(messageBody.length / 70) || 1)}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="متن پیامک خود را اینجا بنویسید (مثلاً تاییدیه فاکتور، پیامک اطلاع‌رسانی، پیام تست)..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
                    required
                  ></textarea>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs text-gray-500 self-center">متن‌های پیش‌فرض:</span>
                  {[
                    "مشتری گرامی، فاکتور خرید شما با موفقیت صادر گردید. با سپاس از اعتماد شما.",
                    "همکار گرامی، پیش‌فاکتور درخواستی ثبت گردید و آماده پرداخت می‌باشد.",
                    "تست ارتباط با مودم سخت‌افزاری ZyXEL 3G - سیستم حسابداری و فروش"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessageBody(preset)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded-lg transition-colors cursor-pointer"
                    >
                      قالب {toPersianDigits(idx + 1)}
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-500" />
                    پیام به طور مستقیم توسط دستور <code className="font-mono font-bold">AT+CMGS</code> به دکل مخابراتی ارسال می‌شود.
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-4 h-4 ${isSending ? "animate-spin" : ""}`} />
                    {isSending ? "در حال مخابره پیامک..." : "ارسال پیامک از مودم ZyXEL"}
                  </button>
                </div>
              </form>
            </div>

            {/* Last Sent Result Card */}
            {lastSentResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-2xl border ${
                  lastSentResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  {lastSentResult.success ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <h5 className="font-bold text-sm">
                      {lastSentResult.success
                        ? "پیامک با موفقیت از پورت مودم ارسال شد"
                        : "خطا در ارسال پیامک از طریق مودم"}
                    </h5>
                    <div className="text-xs mt-1 flex flex-wrap gap-4 text-gray-600">
                      {lastSentResult.messageId && (
                        <span>شناسه پیام: <strong className="font-mono">{lastSentResult.messageId}</strong></span>
                      )}
                      {lastSentResult.recipient && (
                        <span>گیرنده: <strong className="font-mono">{lastSentResult.recipient}</strong></span>
                      )}
                      {lastSentResult.timestamp && (
                        <span>زمان: {lastSentResult.timestamp}</span>
                      )}
                      {lastSentResult.error && (
                        <span className="text-rose-600 font-bold">{lastSentResult.error}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* TAB 3: INBOX / RECEIVED SMS FROM SIM CARD */}
        {activeSubTab === "inbox" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div>
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-indigo-600" />
                  پیامک‌های دریافتی ذخیره‌شده در سیم‌کارت مودم ZyXEL
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  پیامک‌های واریز وجه، تایید سفارش و پاسخ‌های ارسالی مشتریان به شماره سیم‌کارت مودم
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowSimTestModal(true)}
                  className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  + شبیه‌سازی پیامک ورودی
                </button>
                <button
                  onClick={handleFetchInbox}
                  disabled={isLoadingMessages}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? "animate-spin" : ""}`} />
                  بازخوانی از سیم‌کارت (AT+CMGL)
                </button>
              </div>
            </div>

            {receivedMessages.length === 0 ? (
              <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-300 p-8">
                <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-3 stroke-1" />
                <h5 className="font-bold text-gray-700 text-sm">هیچ پیامکی در حافظه سیم‌کارت موجود نیست</h5>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  پیامک‌های دریافتی جدید به صورت خودکار خوانده شده یا با کلیک بر روی بازخوانی نمایش داده می‌شوند.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {receivedMessages.map((msg) => (
                  <div
                    key={msg.index}
                    className={`border rounded-2xl p-4 transition-all ${
                      msg.status === "unread"
                        ? "bg-indigo-50/40 border-indigo-200 shadow-xs"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {toPersianDigits(msg.index)}
                        </span>
                        <div>
                          <span className="font-bold text-gray-800 text-xs font-mono block">
                            {msg.sender}
                          </span>
                          <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {msg.status === "unread" && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600 text-white">
                            جدید
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setRecipientNumber(msg.sender);
                            setMessageBody(`در پاسخ به: "${msg.text.substring(0, 30)}..."\n`);
                            setActiveSubTab("send");
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors cursor-pointer"
                          title="پاسخ مستقیم"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReceived(msg.index)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف از سیم‌کارت"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-gray-100 text-xs text-gray-700 leading-relaxed font-sans select-text">
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AT TERMINAL & DIAGNOSTICS */}
        {activeSubTab === "terminal" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  کنسول دستورات AT مودم ZyXEL 3G
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  ارسال مستقیم دستورات سخت‌افزاری Hayes AT به درگاه سریال مودم و مشاهده پاسخ‌های دستگاه
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => gsmUsbService.getLogs().splice(0, gsmUsbService.getLogs().length)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  پاک‌کردن لاگ‌ها
                </button>
              </div>
            </div>

            {/* Quick AT Command Shortcuts */}
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-600 self-center">فرمان‌های سریع ZyXEL:</span>
              {[
                { label: "تست ارتباط (AT)", cmd: "AT" },
                { label: "قدرت آنتن (AT+CSQ)", cmd: "AT+CSQ" },
                { label: "وضعیت سیم‌کارت (AT+CPIN?)", cmd: "AT+CPIN?" },
                { label: "سازنده (AT+CGMI)", cmd: "AT+CGMI" },
                { label: "مدل مودم (AT+CGMM)", cmd: "AT+CGMM" },
                { label: "اپراتور شبکه (AT+COPS?)", cmd: "AT+COPS?" },
                { label: "تنظیم حالت متن (AT+CMGF=1)", cmd: "AT+CMGF=1" },
                { label: "حافظه سیم‌کارت (AT+CPMS)", cmd: 'AT+CPMS="SM","SM","SM"' },
                { label: "لیست پیامک‌ها (AT+CMGL)", cmd: 'AT+CMGL="ALL"' }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExecuteAt(item.cmd)}
                  disabled={isExecutingCommand}
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-white hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 border border-gray-300 rounded-lg transition-all cursor-pointer shadow-2xs"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* AT Command Input Box */}
            <div className="flex gap-2">
              <input
                type="text"
                value={atCommandInput}
                onChange={(e) => setAtCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleExecuteAt();
                }}
                placeholder="دستور AT را وارد کنید (مثال: AT+CSQ یا AT+CGSN)..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 font-mono text-xs text-left"
                dir="ltr"
              />
              <button
                onClick={() => handleExecuteAt()}
                disabled={isExecutingCommand}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                ارسال فرمان
              </button>
            </div>

            {/* Terminal Window */}
            <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-xs h-72 overflow-y-auto custom-scrollbar border border-slate-800 shadow-inner" dir="ltr">
              {atLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-24">
                  آماده دریافت فرمان‌های AT...
                </div>
              ) : (
                <div className="space-y-1.5">
                  {atLogs.slice().reverse().map((log) => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                      {log.type === "sent" && (
                        <span className="text-indigo-400 font-bold shrink-0">&gt;&gt;</span>
                      )}
                      {log.type === "received" && (
                        <span className="text-emerald-400 font-bold shrink-0">&lt;&lt;</span>
                      )}
                      {log.type === "info" && (
                        <span className="text-sky-400 font-bold shrink-0">[INFO]</span>
                      )}
                      {log.type === "error" && (
                        <span className="text-rose-400 font-bold shrink-0">[ERR]</span>
                      )}
                      <span
                        className={`break-all ${
                          log.type === "sent"
                            ? "text-indigo-200 font-bold"
                            : log.type === "received"
                            ? "text-emerald-300"
                            : log.type === "error"
                            ? "text-rose-400"
                            : "text-slate-300"
                        }`}
                      >
                        {log.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Simulate Incoming Message */}
      <AnimatePresence>
        {showSimTestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100"
              dir="rtl"
            >
              <h4 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2">
                <Inbox className="w-4 h-4 text-indigo-600" />
                شبیه‌سازی دریافت پیامک در مودم ZyXEL
              </h4>
              <p className="text-xs text-gray-500 mb-4">
                یک پیامک فرضی برای بررسی دریافت پیامک و تست عملکرد سیم‌کارت ارسال کنید.
              </p>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">شماره فرستنده</label>
                  <input
                    type="text"
                    value={simTestSender}
                    onChange={(e) => setSimTestSender(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">متن پیامک ورودی</label>
                  <textarea
                    rows={3}
                    value={simTestText}
                    onChange={(e) => setSimTestText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs leading-relaxed"
                  ></textarea>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimTestModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleAddSimulatedIncoming}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                >
                  ثبت پیامک در مودم
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
