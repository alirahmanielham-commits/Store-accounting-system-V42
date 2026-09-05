import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Send,
  MessageSquare,
  AlertCircle,
  Phone,
  Wallet,
  Bell,
  Megaphone,
  Copy,
  Check,
  Building,
  RotateCcw,
  ExternalLink,
  Smartphone,
  History,
  CreditCard,
  Calendar,
  Sparkles,
  Share2,
  ChevronDown,
  Hash,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MessageCircle,
  UserCheck
} from "lucide-react";
import { addDatabaseLog } from "../../services/coreService";
import { addCommas, toPersianDigits, formatDateDisplay } from "../../utils/format";
import { messagingManager } from "../../services/messaging/MessagingManager";

export interface SendPersonMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: any;
  showNotification?: ((msg: string, type?: "success" | "error" | "info") => void) | ((type: string, msg: string) => void);
  calculatePersonBalance?: (id: string | number) => { amount: number; status: string; color?: string; bg?: string; value?: number };
  storeSettings?: any;
}

type MainTab = "composer" | "preview" | "history";
type MessageTopic = "balance" | "reminder" | "notification" | "custom";
type PriorityType = 1 | 2 | 3; // 1: عادی, 2: اولویت بالا, 3: فوری

export default function SendPersonMessageModal({
  isOpen,
  onClose,
  person,
  showNotification,
  calculatePersonBalance,
  storeSettings
}: SendPersonMessageModalProps) {
  const [activeTab, setActiveTab] = useState<MainTab>("composer");
  const [selectedTopic, setSelectedTopic] = useState<MessageTopic>("balance");
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("default");
  const [recipientNumber, setRecipientNumber] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<PriorityType>(1);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Bank accounts & System Templates & History
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [systemTemplates, setSystemTemplates] = useState<any[]>([]);
  const [messageHistory, setMessageHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const notify = (msg: string, type: "success" | "error" | "info" = "success") => {
    if (showNotification) {
      try {
        (showNotification as any)(msg, type);
      } catch {
        (showNotification as any)(type, msg);
      }
    } else {
      console.log(`[${type}] ${msg}`);
    }
  };

  const getPersonName = (p: any): string => {
    if (!p) return "مخاطب گرامی";
    if (p.alias) return p.alias;
    if (p.name) return p.name;
    if (p.firstName || p.lastName) return `${p.firstName || ""} ${p.lastName || ""}`.trim();
    if (p.companyName) return p.companyName;
    return "مخاطب گرامی";
  };

  const storeName = storeSettings?.storeName || storeSettings?.companyName || storeSettings?.title || "مجموعه بازرگانی";
  const currency = storeSettings?.currency || "ریال";

  // Calculate balance information
  const balanceInfo = useMemo(() => {
    if (!person) return { amount: 0, status: "بی‌حساب", formatted: "۰", isDebtor: false, isCreditor: false };
    if (calculatePersonBalance) {
      const b = calculatePersonBalance(person.id);
      const isDeb = b.status === "بدهکار" || (b.value !== undefined && b.value > 0);
      const isCred = b.status === "بستانکار" || (b.value !== undefined && b.value < 0);
      return {
        amount: b.amount || 0,
        status: b.status || (isDeb ? "بدهکار" : isCred ? "بستانکار" : "بی‌حساب"),
        formatted: toPersianDigits(addCommas(b.amount || 0)),
        isDebtor: isDeb,
        isCreditor: isCred
      };
    }
    const rawBal = Number(person.calculatedBalance || person.balance || 0);
    if (rawBal > 0) {
      return { amount: rawBal, status: "بدهکار", formatted: toPersianDigits(addCommas(rawBal)), isDebtor: true, isCreditor: false };
    } else if (rawBal < 0) {
      return { amount: Math.abs(rawBal), status: "بستانکار", formatted: toPersianDigits(addCommas(Math.abs(rawBal))), isDebtor: false, isCreditor: true };
    }
    return { amount: 0, status: "بی‌حساب", formatted: "۰", isDebtor: false, isCreditor: false };
  }, [person, calculatePersonBalance]);

  // Extract all available telephone numbers for this contact
  const availableNumbers = useMemo(() => {
    if (!person) return [];
    const list: { label: string; number: string; type: string }[] = [];

    const addIfValid = (label: string, num?: string, type: string = "phone") => {
      if (!num) return;
      const clean = num.trim();
      if (clean && !list.some(item => item.number === clean)) {
        list.push({ label, number: clean, type });
      }
    };

    if (person.phone) addIfValid("شماره اصلی", person.phone, "main");
    if (person.mobile) addIfValid("موبایل", person.mobile, "mobile");

    if (Array.isArray(person.contacts)) {
      person.contacts.forEach((c: any, idx: number) => {
        const title = c.title || (c.type === "mobile" ? "موبایل" : c.type === "phone" ? "تلفن" : `شماره ${idx + 1}`);
        addIfValid(title, c.number, c.type || "contact");
      });
    }

    return list;
  }, [person]);

  // Fetch accounts, templates, history
  useEffect(() => {
    if (isOpen && person) {
      setActiveTab("composer");
      setSelectedTopic("balance");
      setSelectedPresetKey("default");
      setPriority(1);
      setCopied(false);

      const initialNum = person.phone || person.mobile || (availableNumbers[0]?.number || "");
      setRecipientNumber(initialNum);

      // Load Bank Accounts from /api/data/accounts
      fetch("/api/data/accounts")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setBankAccounts(data);
            if (data.length > 0) {
              setSelectedBankAccountId(data[0].id?.toString() || "");
            }
          }
        })
        .catch(() => {});

      // Load SMS Templates
      fetch("/api/data/sms_templates")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setSystemTemplates(data);
        })
        .catch(() => {});

      // Load SMS History for this person
      fetchPersonSmsHistory();
    }
  }, [isOpen, person]);

  const fetchPersonSmsHistory = async () => {
    if (!person) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/data/sms_messages");
      const allMessages = await res.json();
      if (Array.isArray(allMessages)) {
        const pIdStr = String(person.id);
        const pPhones = [person.phone, person.mobile, ...(person.contacts?.map((c: any) => c.number) || [])].filter(Boolean);
        const filtered = allMessages
          .filter((m: any) => {
            if (m.recipientId && String(m.recipientId) === pIdStr) return true;
            if (m.recipientNumber && pPhones.includes(m.recipientNumber)) return true;
            return false;
          })
          .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        setMessageHistory(filtered);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Generate topic & preset templates
  const generateMessage = (topic: MessageTopic, preset: string = "default"): string => {
    if (!person) return "";
    const name = getPersonName(person);
    const amountStr = `${balanceInfo.formatted} ${currency}`;
    const today = formatDateDisplay(new Date(), storeSettings?.calendarType);

    // Selected Bank Account text
    const activeBank = (bankAccounts || []).find(a => String(a?.id) === String(selectedBankAccountId)) || (bankAccounts || [])[0];
    const bankDetails = activeBank && (activeBank.cardNumber || activeBank.shebaNumber)
      ? `\nشماره کارت جهت واریز: ${activeBank.cardNumber || ""}${activeBank.shebaNumber ? `\nشبا: ${activeBank.shebaNumber}` : ""}${activeBank.bankName ? ` (${activeBank.bankName})` : ""}`
      : "";

    if (topic === "balance") {
      if (balanceInfo.isDebtor) {
        if (preset === "with_bank") {
          return `جناب آقای/سرکار خانم ${name} گرامی،\nبا سلام، مانده بدهی حساب شما نزد ${storeName} مبلغ ${amountStr} می‌باشد.${bankDetails}\nخواهشمند است پس از واریز، شماره پیگیری را ارسال فرمایید.\nبا تشکر، ${storeName}`;
        } else if (preset === "urgent") {
          return `اخطار تسویه حساب:\nهمکار/مشتری گرامی ${name}، پیرو عدم تسویه مانده حساب به مبلغ ${amountStr} نزد ${storeName}، تقاضا دارد حداکثر ظرف ۴۸ ساعت آینده نسبت به تعیین تکلیف و تسویه حساب اقدام فرمایید.\nواحد مالی ${storeName}`;
        } else if (preset === "friendly") {
          return `سلام ${name} عزیز،\nامیدوارم حالتون عالی باشه. طبق بررسی حساب، مانده فاکتورهای شما مبلغ ${amountStr} هست. در صورت امکان ممنون میشم تا پایان هفته نسبت به تسویه اقدام بفرمایید.\nارادتمند، ${storeName}`;
        }
        // default official
        return `جناب آقای/سرکار خانم ${name} گرامی،\nبا سلام و احترام، به اطلاع می‌رساند مانده بدهی حساب شما نزد ${storeName} تا تاریخ ${today} مبلغ ${amountStr} می‌باشد. خواهشمند است در اسرع وقت نسبت به تسویه اقدام فرمایید.\nبا احترام، ${storeName}`;
      } else if (balanceInfo.isCreditor) {
        return `جناب آقای/سرکار خانم ${name} گرامی،\nبا سلام و احترام، مانده بستانکاری حساب شما نزد ${storeName} مبلغ ${amountStr} می‌باشد. جهت دریافت وجه یا هماهنگی ثبت سفارش، با واحد مالی در ارتباط باشید.\nبا سپاس، ${storeName}`;
      } else {
        return `جناب آقای/سرکار خانم ${name} گرامی،\nبا سلام و احترام، وضعیت حساب شما نزد ${storeName} تا تاریخ ${today} کاملاً تسویه و بدون مانده می‌باشد. از حسن اعتماد و خوش‌حسابی شما صمیمانه قدردانیم.\n${storeName}`;
      }
    }

    if (topic === "reminder") {
      if (preset === "check") {
        return `همکار/مشتری گرامی ${name}،\nبا سلام، یادآوری می‌گردد موعد سررسید اسناد/چک بانکی شما نزد ${storeName} فرا رسیده است. لطفاً نسبت به موجودی حساب یا هماهنگی لازم اقدام فرمایید.\nبا احترام، ${storeName}`;
      } else if (preset === "invoice") {
        return `مشتری گرامی ${name}،\nبا سلام، مهلت پرداخت فاکتور به مبلغ ${amountStr} فرا رسیده است. لطفاً جهت پیگیری امور مالی با ما تماس بگیرید.\nبا تشکر، ${storeName}`;
      }
      return `مشتری/همکار گرامی ${name}،\nبا سلام و احترام، پیرو سوابق همکاری و هماهنگی‌های گذشته، یادآوری می‌گردد جهت پیگیری صورت‌حساب و اسناد مالی با مجموعه تماس حاصل فرمایید.\nبا تشکر، ${storeName}`;
    }

    if (topic === "notification") {
      if (preset === "thanks") {
        return `مشتری ارزشمند، ${name} گرامی،\nاز حسن انتخاب و خرید شما از ${storeName} بسیار سپاسگزاریم. رضایت شما بزرگ‌ترین افتخار ماست.\nبا احترام، ${storeName}`;
      } else if (preset === "promo") {
        return `همراه گرامی ${name}،\nجشنواره تخفیفات و شرایط ویژه فروش ${storeName} آغاز شد. مشتاقانه منتظر میزبانی از شما هستیم.\nاطلاعات بیشتر و تماس: ${storeSettings?.phone || storeSettings?.mobile || storeName}`;
      }
      return `همراه گرامی ${name}،\nبا سلام و درود فراوان، از همراهی صمیمانه و مداوم شما با مجموعه ${storeName} کمال تشکر را داریم. همواره آماده ارائه بهترین خدمات به شما عزیزان هستیم.\n${storeName}`;
    }

    return "";
  };

  // Trigger initial message on topic / preset switch
  useEffect(() => {
    if (selectedTopic !== "custom") {
      setMessage(generateMessage(selectedTopic, selectedPresetKey));
    }
  }, [selectedTopic, selectedPresetKey, selectedBankAccountId]);

  // Insert Variable Token
  const handleInsertVariable = (token: string) => {
    const name = getPersonName(person);
    const today = formatDateDisplay(new Date(), storeSettings?.calendarType);
    const activeBank = (bankAccounts || []).find(a => String(a?.id) === String(selectedBankAccountId)) || (bankAccounts || [])[0];

    let val = "";
    switch (token) {
      case "name":
        val = name;
        break;
      case "balance":
        val = balanceInfo.formatted;
        break;
      case "status":
        val = balanceInfo.status;
        break;
      case "currency":
        val = currency;
        break;
      case "storeName":
        val = storeName;
        break;
      case "date":
        val = today;
        break;
      case "card":
        val = activeBank?.cardNumber ? `شماره کارت: ${activeBank.cardNumber}` : "شماره کارت: (ثبت نشده)";
        break;
      case "sheba":
        val = activeBank?.shebaNumber ? `شماره شبا: ${activeBank.shebaNumber}` : "شماره شبا: (ثبت نشده)";
        break;
      case "code":
        val = person.accountingCode ? `کد حسابداری: ${person.accountingCode}` : person.personCode ? `کد شخص: ${person.personCode}` : "";
        break;
      case "deadline":
        val = "مهلت تسویه: تا ۵ روز کاری آینده";
        break;
    }
    setMessage(prev => (prev ? `${prev} ${val}` : val));
  };

  // SMS parts calculation (Persian standard: 70 for 1 part, 67 each for multiple)
  const smsStats = useMemo(() => {
    const len = message.length;
    if (len === 0) return { length: 0, parts: 0 };
    if (len <= 70) return { length: len, parts: 1 };
    return { length: len, parts: Math.ceil(len / 67) };
  }, [message]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      notify("متن پیام در کلیپ‌بورد کپی شد", "success");
    } catch {
      notify("خطا در کپی کردن متن", "error");
    }
  };

  // Clean phone number for international format (e.g. 09123456789 -> 989123456789)
  const getIntlPhone = (num: string) => {
    const clean = num.replace(/\D/g, "");
    if (clean.startsWith("0")) return `98${clean.substring(1)}`;
    if (clean.startsWith("98")) return clean;
    return clean;
  };

  // Dispatches
  const handleSend = async () => {
    const cleanNumber = recipientNumber.trim();
    if (!cleanNumber) {
      notify("لطفاً شماره تماس گیرنده را وارد فرمایید", "error");
      return;
    }
    if (!message.trim()) {
      notify("متن پیام نباید خالی باشد", "error");
      return;
    }

    setIsSending(true);
    try {
      const recipientName = getPersonName(person);

      const msgData = {
        id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recipientType: "contact",
        recipientId: person.id,
        recipientNumber: cleanNumber,
        recipientName,
        messageBody: message,
        messageLength: message.length,
        topic: selectedTopic,
        status: "pending",
        priority,
        createdAt: Date.now()
      };

      // 1. Append to SMS messages queue in database
      await fetch("/api/data/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ key: "sms_messages", type: "append", data: msgData }])
      });

      // 2. Add log entry
      await addDatabaseLog("ارسال پیامک", "sms_messages", msgData.id, null, msgData);

      // 3. Attempt direct transmission via configured providers
      try {
        const provRes = await fetch("/api/data/sms_providers");
        const providers = await provRes.json();
        if (Array.isArray(providers) && providers.length > 0) {
          await messagingManager.loadProviders(providers);
          await messagingManager.sendMessage({
            to: cleanNumber,
            text: message,
            type: "sms"
          });
        }
      } catch (e) {
        console.warn("SMS provider note:", e);
      }

      notify(`پیام به ${recipientName} (${toPersianDigits(cleanNumber)}) در صف ارسال ثبت شد`, "success");
      onClose();
    } catch (err) {
      console.error("Error sending message:", err);
      notify("خطا در ثبت و ارسال پیام", "error");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !person) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto border border-slate-200 z-10"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  ارسال پیام به {getPersonName(person)}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  تنظیم هوشمند متن، مانده حساب، یادآوری سررسید و ارسال چندکاناله
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between px-6 pt-3 pb-0 border-b border-slate-100 bg-white">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("composer")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
                  activeTab === "composer"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                ویرایش و تنظیم پیام
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
                  activeTab === "preview"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                پیش‌نمایش در موبایل
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <History className="w-4 h-4" />
                سوابق پیامک‌ها
                {messageHistory.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-sans">
                    {toPersianDigits(messageHistory.length)}
                  </span>
                )}
              </button>
            </div>

            {/* Status Chip */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold">
              <span
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-black ${
                  balanceInfo.isDebtor
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : balanceInfo.isCreditor
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                {balanceInfo.status}: {balanceInfo.formatted} {currency}
              </span>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {activeTab === "composer" && (
              <>
                {/* Person and Phone Numbers Bar */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                        {person.personType === "legal" ? <Building className="w-5 h-5 text-slate-500" /> : getPersonName(person).charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-800">{getPersonName(person)}</div>
                        <div className="text-xs text-slate-400 font-medium">
                          {person.companyName ? `${person.companyName} - ` : ""}{person.role === "customer" ? "مشتری" : person.role === "supplier" ? "تامین‌کننده" : "طرف حساب"}
                        </div>
                      </div>
                    </div>

                    {/* Balance Status Box */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                      <div className="text-right">
                        <div className="text-[10px] font-black text-slate-400">مانده حساب لحظه‌ای</div>
                        <div className="text-xs font-black text-slate-800 font-sans">
                          <span className={balanceInfo.isDebtor ? "text-rose-600" : balanceInfo.isCreditor ? "text-emerald-600" : "text-slate-600"}>
                            {balanceInfo.status}
                          </span>
                          {" : "}
                          {balanceInfo.formatted} {currency}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recipient Phone Selector */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-500" />
                        شماره همراه گیرنده پیام
                      </label>
                      {availableNumbers.length > 1 && (
                        <span className="text-[11px] text-indigo-600 font-bold">
                          {toPersianDigits(availableNumbers.length)} شماره یافت شد
                        </span>
                      )}
                    </div>

                    {/* Quick selection chips if person has multiple numbers */}
                    {availableNumbers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {availableNumbers.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setRecipientNumber(item.number)}
                            className={`px-2.5 py-1 text-xs font-sans font-bold rounded-lg border transition-all cursor-pointer ${
                              recipientNumber === item.number
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                                : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                            }`}
                            dir="ltr"
                          >
                            <span className="font-sans text-[11px]">{toPersianDigits(item.number)}</span>
                            <span className="mr-1.5 text-[10px] opacity-80">({item.label})</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <input
                        type="text"
                        dir="ltr"
                        value={recipientNumber}
                        onChange={e => setRecipientNumber(e.target.value)}
                        placeholder="0912..."
                        className="w-full pl-3 pr-9 py-2.5 text-sm font-sans font-black bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden transition-all text-slate-800 text-left"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Topics & Preset Categories */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      موضوع و الگوی پیام
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">الگوهای هوشمند با متغیرهای لحظه‌ای</span>
                  </div>

                  {/* 3 Main Topics */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* 1. مانده حساب */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopic("balance");
                        setSelectedPresetKey("default");
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                        selectedTopic === "balance"
                          ? "border-indigo-600 bg-indigo-50/90 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-lg ${selectedTopic === "balance" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <Wallet className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black">مانده حساب</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 leading-tight font-medium">
                        {balanceInfo.isDebtor ? "اعلام بدهی و حساب" : balanceInfo.isCreditor ? "اعلام بستانکاری" : "اعلام تسویه کامل"}
                      </span>
                    </button>

                    {/* 2. یادآوری */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopic("reminder");
                        setSelectedPresetKey("default");
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                        selectedTopic === "reminder"
                          ? "border-indigo-600 bg-indigo-50/90 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-lg ${selectedTopic === "reminder" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black">یادآوری سررسید</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 leading-tight font-medium">
                        سررسید چک، فاکتور و پیگیری
                      </span>
                    </button>

                    {/* 3. اطلاع‌رسانی */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopic("notification");
                        setSelectedPresetKey("default");
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                        selectedTopic === "notification"
                          ? "border-indigo-600 bg-indigo-50/90 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-lg ${selectedTopic === "notification" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black">اطلاع‌رسانی و تشکر</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 leading-tight font-medium">
                        تشکر از خرید، تبریک و اطلاعیه
                      </span>
                    </button>
                  </div>

                  {/* Sub-presets for selected topic */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 ml-1">انواع الگو:</span>
                    {selectedTopic === "balance" && balanceInfo.isDebtor && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedPresetKey("default")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            selectedPresetKey === "default" ? "bg-white text-indigo-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          رسمی اداری
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPresetKey("with_bank")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            selectedPresetKey === "with_bank" ? "bg-white text-indigo-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          همراه با شماره کارت / شبا
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPresetKey("urgent")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            selectedPresetKey === "urgent" ? "bg-white text-rose-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          اخطار تسویه فوری
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPresetKey("friendly")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            selectedPresetKey === "friendly" ? "bg-white text-indigo-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          دوستانه و صمیمی
                        </button>
                      </>
                    )}

                    {selectedTopic === "reminder" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedPresetKey("default")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            selectedPresetKey === "default" ? "bg-white text-indigo-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          پیگیری کلی حساب
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPresetKey("check")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            selectedPresetKey === "check" ? "bg-white text-indigo-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          سررسید چک بانکی
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPresetKey("invoice")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            selectedPresetKey === "invoice" ? "bg-white text-indigo-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          سررسید فاکتور فروش
                        </button>
                      </>
                    )}

                    {selectedTopic === "notification" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedPresetKey("default")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            selectedPresetKey === "default" ? "bg-white text-indigo-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          اطلاعیه عمومی
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPresetKey("thanks")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            selectedPresetKey === "thanks" ? "bg-white text-indigo-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          تشکر از خرید و خوش‌حسابی
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPresetKey("promo")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            selectedPresetKey === "promo" ? "bg-white text-indigo-700 shadow-2xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          جشنواره فروش و تخفیف
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Bank Account Selection for Payment (if available) */}
                {bankAccounts.length > 0 && (
                  <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">حساب بانکی فروشگاه جهت درج در پیام:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedBankAccountId}
                        onChange={e => setSelectedBankAccountId(e.target.value)}
                        className="text-xs font-bold font-sans bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 outline-hidden"
                      >
                        {bankAccounts.map((acc: any) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.bankName || "بانک"} - {acc.cardNumber || acc.accountNumber || acc.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleInsertVariable("card")}
                        className="px-2.5 py-1.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                        title="درج مستقیم شماره کارت در متن پیام"
                      >
                        + درج در متن
                      </button>
                    </div>
                  </div>
                )}

                {/* Textarea for message */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800">متن پیام نهایی</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMessage(generateMessage(selectedTopic, selectedPresetKey))}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
                        title="بازنشانی به الگوی پیش‌فرض"
                      >
                        <RotateCcw className="w-3 h-3" />
                        بازنشانی متن
                      </button>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="text-[11px] text-slate-500 hover:text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                        title="کپی متن"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copied ? "کپی شد" : "کپی متن"}
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={5}
                    value={message}
                    onChange={e => {
                      setMessage(e.target.value);
                      setSelectedTopic("custom");
                    }}
                    className="w-full p-3.5 text-sm text-slate-800 leading-relaxed border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden transition-all shadow-2xs font-sans"
                    placeholder="متن پیام خود را بنویسید..."
                  />

                  {/* Variables & Counters */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-black text-slate-400 ml-1">درج متغیر:</span>
                      <button
                        type="button"
                        onClick={() => handleInsertVariable("name")}
                        className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 rounded-md transition-colors cursor-pointer"
                      >
                        + نام مخاطب
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertVariable("balance")}
                        className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 rounded-md transition-colors cursor-pointer"
                      >
                        + مبلغ مانده
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertVariable("status")}
                        className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 rounded-md transition-colors cursor-pointer"
                      >
                        + وضعیت مانده
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertVariable("storeName")}
                        className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 rounded-md transition-colors cursor-pointer"
                      >
                        + نام مجموعه
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertVariable("card")}
                        className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors cursor-pointer"
                      >
                        + شماره کارت
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertVariable("deadline")}
                        className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 rounded-md transition-colors cursor-pointer"
                      >
                        + مهلت تسویه
                      </button>
                    </div>

                    <div className="text-[11px] font-black text-slate-500 font-sans self-end sm:self-auto" dir="ltr">
                      {toPersianDigits(smsStats.length)} کاراکتر{" "}
                      <span className="text-indigo-600 font-black">
                        ({toPersianDigits(smsStats.parts)} پارت پیامک)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Priority Selection */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-600">اولویت ارسال در صف سامانه:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPriority(1)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        priority === 1
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-black"
                          : "bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      عادی
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority(2)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        priority === 2
                          ? "bg-amber-50 border-amber-200 text-amber-700 font-black"
                          : "bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      اولویت بالا
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority(3)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        priority === 3
                          ? "bg-rose-50 border-rose-200 text-rose-700 font-black"
                          : "bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      فوری
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: MOBILE PREVIEW */}
            {activeTab === "preview" && (
              <div className="flex flex-col items-center justify-center py-4">
                {/* Smartphone Mockup */}
                <div className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-800">
                  {/* Speaker & camera notch */}
                  <div className="w-32 h-4 bg-slate-800 rounded-b-xl mx-auto mb-3 flex items-center justify-center">
                    <div className="w-10 h-1 bg-slate-700 rounded-full"></div>
                  </div>

                  {/* Phone Screen */}
                  <div className="bg-slate-100 rounded-[2rem] p-4 min-h-[380px] flex flex-col justify-between overflow-hidden">
                    {/* Header in simulated phone */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 bg-white/70 -mx-4 -mt-4 px-4 pt-3 backdrop-blur-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                          {storeName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800 truncate max-w-[140px]">{storeName}</div>
                          <div className="text-[10px] text-slate-400 font-sans" dir="ltr">
                            {recipientNumber ? toPersianDigits(recipientNumber) : "پیامک سیستمی"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        آنلاین
                      </span>
                    </div>

                    {/* Chat Messages Body */}
                    <div className="my-auto py-4 space-y-3">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 font-sans bg-slate-200/60 px-2 py-0.5 rounded-full">
                          امروز {toPersianDigits(formatDateDisplay(new Date(), storeSettings?.calendarType))}
                        </span>
                      </div>

                      {/* Chat Bubble */}
                      <div className="bg-white rounded-2xl rounded-tr-xs p-3.5 shadow-sm border border-slate-200/80 text-right space-y-2">
                        <p className="text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap">
                          {message || "متن پیامی هنوز وارد نشده است..."}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 text-indigo-600 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> تحویل شده
                          </span>
                          <span className="font-sans">
                            {new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Info bar at bottom of mockup */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                      <div className="text-[10px] font-bold text-slate-500">
                        گیرنده: <span className="text-slate-800 font-black">{getPersonName(person)}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        حجم پیام: {toPersianDigits(smsStats.length)} حرف ({toPersianDigits(smsStats.parts)} پارت پیامک)
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 text-center mt-3 font-medium">
                  پیش‌نمایش بصری نمایانگر نحوه نمایش پیام در گوشی تلفن همراه طرف حساب می‌باشد.
                </p>
              </div>
            )}

            {/* TAB 3: MESSAGE HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-600" />
                    سوابق پیام‌های ارسال شده به {getPersonName(person)}
                  </h4>
                  <button
                    type="button"
                    onClick={fetchPersonSmsHistory}
                    disabled={isLoadingHistory}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? "animate-spin" : ""}`} />
                    بروزرسانی
                  </button>
                </div>

                {isLoadingHistory ? (
                  <div className="p-8 text-center text-slate-400 text-xs">در حال بارگذاری سوابق...</div>
                ) : messageHistory.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">هنوز پیامی برای این شخص ثبت نشده است.</p>
                    <p className="text-[11px] text-slate-400">پس از ارسال پیام از این بخش، تاریخچه کامل مکاتبات در اینجا ثبت و آرشیو خواهد شد.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto custom-scrollbar">
                    {messageHistory.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 hover:bg-white hover:border-indigo-200 transition-all text-right space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 font-sans" dir="ltr">
                              {toPersianDigits(item.recipientNumber || "")}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700">
                              {item.topic === "balance" ? "مانده حساب" : item.topic === "reminder" ? "یادآوری" : "اطلاع‌رسانی"}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-sans">
                            {formatDateDisplay(new Date(item.createdAt || Date.now()), storeSettings?.calendarType)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-100">
                          {item.messageBody}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.status === "delivered"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "failed"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.status === "delivered" ? "تحویل شده" : item.status === "failed" ? "ناموفق" : "در صف ارسال"}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setMessage(item.messageBody);
                              setActiveTab("composer");
                              notify("متن پیام در کادر ویرایشگر بارگذاری شد", "info");
                            }}
                            className="text-indigo-600 hover:text-indigo-700 font-black flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> استفاده مجدد
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer with Multi-Channel Options */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Quick Messenger / Share Channels */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 ml-1">ارسال از طریق:</span>

              {/* Mobile SMS link */}
              {recipientNumber && (
                <a
                  href={`sms:${recipientNumber.replace(/\s+/g, "")}?body=${encodeURIComponent(message)}`}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                  title="باز کردن اپلیکیشن پیش‌فرض پیامک تلفن همراه"
                >
                  <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                  پیامک گوشی
                </a>
              )}

              {/* WhatsApp Web / App */}
              {recipientNumber && (
                <a
                  href={`https://wa.me/${getIntlPhone(recipientNumber)}?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                  title="ارسال از طریق واتساپ"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  واتساپ
                </a>
              )}

              {/* Eitaa */}
              <a
                href={`https://eitaa.com/share/url?url=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-white border border-amber-200 hover:bg-amber-50 text-amber-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                title="اشتراک‌گذاری در پیام‌رسان ایتا"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-600" />
                ایتا
              </a>

              {/* Bale */}
              <a
                href={`https://ble.ir/share/url?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                title="اشتراک‌گذاری در پیام‌رسان بله"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                بله
              </a>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !recipientNumber.trim() || !message.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-md shadow-indigo-200 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {isSending ? "در حال ارسال..." : "ثبت و ارسال با پیامک"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
