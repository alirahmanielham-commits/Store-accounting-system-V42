import React, { useState, useRef, useMemo } from 'react';
import { 
  FileText, Copy, Check, RotateCcw, Smartphone, 
  ChevronDown, Send, Sparkles, User, DollarSign, Calendar,
  CreditCard, Tag, AlertTriangle, Layers, Eye, RefreshCw
} from 'lucide-react';

interface SmsTemplateEditorProps {
  settingsForm: any;
  setSettingsForm: React.Dispatch<React.SetStateAction<any>>;
  storeName?: string;
  currency?: string;
}

export interface TemplateDefinition {
  key: string;
  title: string;
  category: 'invoices' | 'treasury' | 'checks' | 'warehouse' | 'loans';
  categoryLabel: string;
  description: string;
  defaultTemplate: string;
  presetAlternatives?: { label: string; text: string }[];
}

export const SMS_TEMPLATES_CONFIG: TemplateDefinition[] = [
  {
    key: 'smsTemplateInvoice',
    title: 'فاکتور فروش (خریدار)',
    category: 'invoices',
    categoryLabel: 'فاکتورها',
    description: 'ارسال خودکار برای خریدار بلافاصله پس از ثبت یا چاپ فاکتور فروش.',
    defaultTemplate: 'مشتری گرامی {name}، فاکتور فروش شماره {invoice_number} به مبلغ {amount} {currency} در تاریخ {date} ثبت گردید. با تشکر از خرید شما. {store_name}',
    presetAlternatives: [
      {
        label: 'رسمی و محترمانه',
        text: 'جناب آقای/سرکار خانم {name}، صورتحساب فروش به شماره {invoice_number} به مبلغ {amount} {currency} صادر گردید. از حسن انتخاب و اعتماد شما سپاسگزاریم. {store_name}',
      },
      {
        label: 'کوتاه و اقتصادی',
        text: 'فاکتور {invoice_number} | مبلغ: {amount} {currency} | تاریخ: {date} | با تشکر، {store_name}',
      },
      {
        label: 'همراه با مانده حساب',
        text: 'مشتری گرامی {name}، فاکتور {invoice_number} به مبلغ {amount} {currency} ثبت شد. مانده حساب شما: {balance}. {store_name}',
      },
    ],
  },
  {
    key: 'smsTemplatePurchase',
    title: 'فاکتور خرید (تأمین‌کننده)',
    category: 'invoices',
    categoryLabel: 'فاکتورها',
    description: 'ارسال پیامک تایید ثبت فاکتور خرید اقلام برای تأمین‌کننده یا مدیر خرید.',
    defaultTemplate: 'تأمین‌کننده گرامی {name}، فاکتور خرید شماره {invoice_number} به مبلغ {amount} {currency} در تاریخ {date} در سیستم ثبت گردید. {store_name}',
    presetAlternatives: [
      {
        label: 'کوتاه',
        text: 'ثبت فاکتور خرید شماره {invoice_number} به مبلغ {amount} {currency}. با تشکر، {store_name}',
      },
    ],
  },
  {
    key: 'smsTemplateReturn',
    title: 'برگشت از فروش / برگشت از خرید',
    category: 'invoices',
    categoryLabel: 'فاکتورها',
    description: 'ارسال پیامک تایید مرجوعی کالا به طرف حساب و ثبت سند بستانکاری/بدهکاری.',
    defaultTemplate: 'همکار/مشتری گرامی {name}، فاکتور مرجوعی شماره {invoice_number} به مبلغ {amount} {currency} در تاریخ {date} با موفقیت ثبت و در حساب شما اعمال گردید. {store_name}',
  },
  {
    key: 'smsTemplateReceipt',
    title: 'رسید دریافت وجه (خزانه‌داری)',
    category: 'treasury',
    categoryLabel: 'خزانه‌داری و مالی',
    description: 'ارسال تاییدیه دریافت وجه نقد، واریزی کارت یا حواله به پرداخت‌کننده وجه.',
    defaultTemplate: '{name} گرامی، رسید دریافت شماره {receipt_number} به مبلغ {amount} {currency} در تاریخ {date} با موفقیت در سیستم ثبت گردید. با تشکر. {store_name}',
    presetAlternatives: [
      {
        label: 'همراه با مانده حساب',
        text: '{name} گرامی، مبلغ {amount} {currency} با رسید {receipt_number} در تاریخ {date} دریافت و به حساب شما منظور گردید. مانده حساب: {balance}. {store_name}',
      },
      {
        label: 'کوتاه و سریع',
        text: 'دریافت وجه: {amount} {currency} | رسید: {receipt_number} | تاریخ: {date} | {store_name}',
      },
    ],
  },
  {
    key: 'smsTemplatePayment',
    title: 'رسید پرداخت وجه (خزانه‌داری)',
    category: 'treasury',
    categoryLabel: 'خزانه‌داری و مالی',
    description: 'ارسال رسید پرداخت و تسویه حساب مالی به دریافت‌کننده وجه.',
    defaultTemplate: '{name} گرامی، رسید پرداخت شماره {receipt_number} به مبلغ {amount} {currency} در تاریخ {date} ثبت و به حساب شما منظور گردید. {store_name}',
  },
  {
    key: 'smsTemplateCheck',
    title: 'چک دریافتی / صیادی',
    category: 'checks',
    categoryLabel: 'اسناد تجاری و چک',
    description: 'ارسال مشخصات چک دریافتی به صاحب چک یا یادآوری موعد سررسید وصول.',
    defaultTemplate: '{name} گرامی، چک دریافتی شماره {check_number} عهده بانک {bank_name} به مبلغ {amount} {currency} (سررسید {due_date}) در سیستم ثبت گردید. با تشکر. {store_name}',
    presetAlternatives: [
      {
        label: 'یادآوری سررسید وصول',
        text: '{name} گرامی، یادآوری می‌گردد چک شماره {check_number} به مبلغ {amount} {currency} در تاریخ {due_date} سررسید می‌شود. لطفا نسبت به تامین موجودی اقدام فرمایید. {store_name}',
      },
    ],
  },
  {
    key: 'smsTemplatePayableCheck',
    title: 'چک پرداختی (صادره)',
    category: 'checks',
    categoryLabel: 'اسناد تجاری و چک',
    description: 'ارسال مشخصات چک صادره به ذینفع و ثبت سند پرداختنی.',
    defaultTemplate: '{name} گرامی، چک صادره شماره {check_number} به مبلغ {amount} {currency} با سررسید {due_date} عهده بانک {bank_name} در سیستم ثبت و تحویل گردید. {store_name}',
  },
  {
    key: 'smsTemplateWarehouseReceipt',
    title: 'رسید ورود به انبار',
    category: 'warehouse',
    categoryLabel: 'انبارداری و کالا',
    description: 'ارسال پیامک تایید ورود اقلام به انبار به تحویل‌دهنده کالا یا انباردار.',
    defaultTemplate: 'همکار گرامی {name}، رسید ورود به انبار شماره {invoice_number} در تاریخ {date} در سیستم ثبت و کالاها دریافت گردید. {store_name}',
  },
  {
    key: 'smsTemplateWarehouseRemittance',
    title: 'حواله خروج از انبار (رسید خروج)',
    category: 'warehouse',
    categoryLabel: 'انبارداری و کالا',
    description: 'ارسال پیامک صدور بارنامه و تحویل کالا از انبار به مشتری یا راننده.',
    defaultTemplate: 'همکار گرامی {name}، حواله خروج از انبار شماره {invoice_number} در تاریخ {date} صادر و بار تحویل گردید. {store_name}',
  },
  {
    key: 'smsTemplateInvoiceDue',
    title: 'یادآوری موعد سررسید فاکتور',
    category: 'invoices',
    categoryLabel: 'فاکتورها',
    description: 'ارسال خودکار قبل از موعد سررسید فاکتورهای نسیه و مدت‌دار به مشتریان.',
    defaultTemplate: 'مشتری گرامی {name}، فاکتور شماره {invoice_number} به مبلغ {amount} {currency} در تاریخ {due_date} سررسید می‌گردد. لطفا جهت تسویه حساب اقدام نمایید. با تشکر، {store_name}',
  },
  {
    key: 'smsTemplateDebt',
    title: 'هشدار سقف بدهی و مطالبات',
    category: 'treasury',
    categoryLabel: 'خزانه‌داری و مالی',
    description: 'ارسال خودکار هنگام عبور مانده بدهی مشتری از سقف مجاز اعتبار.',
    defaultTemplate: 'مشتری گرامی {name}، مانده بدهی شما مبلغ {balance} {currency} می‌باشد و از سقف مجاز اعتبار عبور کرده است. لطفا در اسرع وقت نسبت به تسویه حساب اقدام فرمایید. {store_name}',
  },
  {
    key: 'smsTemplateInstallment',
    title: 'تسویه و سررسید قسط وام',
    category: 'loans',
    categoryLabel: 'اقساط و وام',
    description: 'ارسال پیامک تایید پرداخت هر قسط یا یادآوری موعد پرداخت اقساط وام.',
    defaultTemplate: '{name} گرامی، قسط شماره {installment_number} وام {loan_number} به مبلغ {amount} {currency} در تاریخ {date} با موفقیت دریافت و تسویه شد. {store_name}',
  },
];

interface DynamicVariable {
  key: string;
  tag: string;
  name: string;
  example: string;
  description: string;
  group: 'customer' | 'invoice' | 'banking' | 'loans' | 'system';
  groupLabel: string;
}

export const DYNAMIC_VARIABLES: DynamicVariable[] = [
  // مخاطب و شخص
  {
    key: 'name',
    tag: '{name}',
    name: 'نام مشتری / طرف حساب',
    example: 'علی محمدی',
    description: 'نام و نام خانوادگی خریدار، فروشنده یا شخص طرف معامله',
    group: 'customer',
    groupLabel: 'مخاطب و طرف حساب',
  },
  {
    key: 'phone',
    tag: '{phone}',
    name: 'شماره تلفن مخاطب',
    example: '۰۹۱۲۳۴۵۶۷۸۹',
    description: 'شماره تماس ثبت‌شده طرف حساب',
    group: 'customer',
    groupLabel: 'مخاطب و طرف حساب',
  },
  {
    key: 'balance',
    tag: '{balance}',
    name: 'مانده حساب لحظه‌ای',
    example: '۱,۴۵۰,۰۰۰ تومان بدهکار',
    description: 'وضعیت بدهکاری یا بستانکاری طرف حساب در لحظه صدور پیامک',
    group: 'customer',
    groupLabel: 'مخاطب و طرف حساب',
  },

  // فاکتور و مالی
  {
    key: 'invoice_number',
    tag: '{invoice_number}',
    name: 'شماره فاکتور / سند',
    example: 'INV-1048',
    description: 'شماره سریال منحصر‌به‌فرد فاکتور یا سند خروج/ورود انبار',
    group: 'invoice',
    groupLabel: 'فاکتور و اسناد مالی',
  },
  {
    key: 'receipt_number',
    tag: '{receipt_number}',
    name: 'شماره رسید دریافت / پرداخت',
    example: 'RD-5201',
    description: 'شماره رسید سند ثبت‌شده در خزانه‌داری',
    group: 'invoice',
    groupLabel: 'فاکتور و اسناد مالی',
  },
  {
    key: 'amount',
    tag: '{amount}',
    name: 'مبلغ تراکنش / فاکتور',
    example: '۲,۴۵۰,۰۰۰',
    description: 'مبلغ کل فاکتور، رسید یا چک با جداکننده سه رقمی هزارگان',
    group: 'invoice',
    groupLabel: 'فاکتور و اسناد مالی',
  },
  {
    key: 'currency',
    tag: '{currency}',
    name: 'واحد پول',
    example: 'تومان',
    description: 'واحد پول سیستم (تومان، ریال یا تعریف‌شده در تنظیمات)',
    group: 'invoice',
    groupLabel: 'فاکتور و اسناد مالی',
  },
  {
    key: 'date',
    tag: '{date}',
    name: 'تاریخ ثبت سند',
    example: '۱۴۰۳/۰۶/۲۱',
    description: 'تاریخ خورشیدی یا میلادی صدور فاکتور یا سند',
    group: 'invoice',
    groupLabel: 'فاکتور و اسناد مالی',
  },
  {
    key: 'due_date',
    tag: '{due_date}',
    name: 'تاریخ موعد سررسید',
    example: '۱۴۰۳/۰۷/۱۵',
    description: 'تاریخ سررسید فاکتور نسیه، چک صیادی یا قسط وام',
    group: 'invoice',
    groupLabel: 'فاکتور و اسناد مالی',
  },

  // اسناد بانکی و چک
  {
    key: 'check_number',
    tag: '{check_number}',
    name: 'شماره چک / شناسه صیادی',
    example: '۷۴۸۹۲۰۱۵۴',
    description: 'شماره سریال چک یا شناسه ۱۶ رقمی صیادی',
    group: 'banking',
    groupLabel: 'بانک و چک صیادی',
  },
  {
    key: 'bank_name',
    tag: '{bank_name}',
    name: 'نام بانک صادرکننده',
    example: 'بانک ملت',
    description: 'نام بانک عهده چک یا حساب مبدا/مقصد',
    group: 'banking',
    groupLabel: 'بانک و چک صیادی',
  },

  // اقساط و تسهیلات
  {
    key: 'installment_number',
    tag: '{installment_number}',
    name: 'شماره قسط',
    example: '۳',
    description: 'شماره ردیف قسط تسویه‌شده یا در حال سررسید',
    group: 'loans',
    groupLabel: 'وام و اقساط',
  },
  {
    key: 'loan_number',
    tag: '{loan_number}',
    name: 'شماره پرونده وام',
    example: 'LN-204',
    description: 'شماره قرارداد یا پرونده تسهیلات پرداختی',
    group: 'loans',
    groupLabel: 'وام و اقساط',
  },

  // سیستم و فروشگاه
  {
    key: 'store_name',
    tag: '{store_name}',
    name: 'نام فروشگاه / کسب‌وکار',
    example: 'بازرگانی رحمانی',
    description: 'نام تجاری مجموعه تعریف‌شده در تنظیمات عمومی سیستم',
    group: 'system',
    groupLabel: 'سیستم و فروشگاه',
  },
  {
    key: 'link',
    tag: '{link}',
    name: 'لینک اینترنتی فاکتور',
    example: 'https://app.com/inv/1048',
    description: 'آدرس مشاهده آنلاین و دانلود نسخه دیجیتال فاکتور',
    group: 'system',
    groupLabel: 'سیستم و فروشگاه',
  },
];

export const SmsTemplateEditor: React.FC<SmsTemplateEditorProps> = ({
  settingsForm,
  setSettingsForm,
  storeName,
  currency = 'تومان',
}) => {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('smsTemplateInvoice');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [variableFilter, setVariableFilter] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find active template config
  const currentTemplateDef = useMemo(() => {
    return (
      SMS_TEMPLATES_CONFIG.find((t) => t.key === selectedTemplateKey) ||
      SMS_TEMPLATES_CONFIG[0]
    );
  }, [selectedTemplateKey]);

  // Current text in form, fallback to default template
  const currentText = (settingsForm[selectedTemplateKey] !== undefined && settingsForm[selectedTemplateKey] !== null)
    ? settingsForm[selectedTemplateKey]
    : currentTemplateDef.defaultTemplate;

  // Insert variable tag into textarea at cursor
  const handleInsertVariable = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const nextText = (currentText || '') + tag;
      setSettingsForm((prev: any) => ({
        ...prev,
        [selectedTemplateKey]: nextText,
      }));
      setIsDropdownOpen(false);
      return;
    }

    const startPos = textarea.selectionStart ?? currentText.length;
    const endPos = textarea.selectionEnd ?? currentText.length;
    const before = currentText.substring(0, startPos);
    const after = currentText.substring(endPos);

    const nextText = before + tag + after;
    setSettingsForm((prev: any) => ({
      ...prev,
      [selectedTemplateKey]: nextText,
    }));

    setIsDropdownOpen(false);

    // Re-focus and position cursor right after inserted tag
    setTimeout(() => {
      textarea.focus();
      const newCursor = startPos + tag.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 50);
  };

  // Reset to default
  const handleResetToDefault = () => {
    setSettingsForm((prev: any) => ({
      ...prev,
      [selectedTemplateKey]: currentTemplateDef.defaultTemplate,
    }));
  };

  // Copy template text
  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(currentText);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  // Live rendered text with sample data
  const sampleData: Record<string, string> = useMemo(() => {
    const todayStr = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    return {
      name: 'علی محمدی',
      phone: '۰۹۱۲۳۴۵۶۷۸۹',
      balance: '۱,۴۵۰,۰۰۰ تومان بدهکار',
      invoice_number: 'INV-1403-1048',
      receipt_number: 'RD-5021',
      amount: '۲,۴۵۰,۰۰۰',
      currency: currency || settingsForm.currency || 'تومان',
      date: todayStr,
      due_date: '۱۴۰۳/۰۷/۱۵',
      check_number: '۷۴۸۹۲۰۱۵۴',
      bank_name: 'بانک ملت',
      installment_number: '۳',
      loan_number: 'LN-204',
      store_name: storeName || settingsForm.store_name || 'بازرگانی رحمانی',
      link: 'hesab.io/inv/1048',
    };
  }, [storeName, currency, settingsForm.currency, settingsForm.store_name]);

  const renderedPreviewText = useMemo(() => {
    let result = currentText || '';
    Object.entries(sampleData).forEach(([key, val]) => {
      const reg = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(reg, val);
    });
    return result;
  }, [currentText, sampleData]);

  // Copy rendered preview
  const handleCopyPreview = () => {
    navigator.clipboard.writeText(renderedPreviewText);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  // SMS length calculation (Persian standard: 1st SMS = 70 chars, then 67 chars each)
  const charCount = renderedPreviewText.length;
  const smsSegments = useMemo(() => {
    if (charCount <= 0) return 1;
    if (charCount <= 70) return 1;
    return Math.ceil((charCount - 70) / 67) + 1;
  }, [charCount]);

  const charsRemainingInSegment = useMemo(() => {
    if (charCount <= 70) return 70 - charCount;
    const extra = charCount - 70;
    const rem = extra % 67;
    return rem === 0 ? 0 : 67 - rem;
  }, [charCount]);

  // Filtered variables for dropdown
  const filteredVariables = useMemo(() => {
    if (!variableFilter.trim()) return DYNAMIC_VARIABLES;
    const q = variableFilter.trim().toLowerCase();
    return DYNAMIC_VARIABLES.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.tag.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
    );
  }, [variableFilter]);

  // Grouped variables
  const groupedVariables = useMemo(() => {
    const groups: { [key: string]: { label: string; items: DynamicVariable[] } } = {};
    filteredVariables.forEach((v) => {
      if (!groups[v.group]) {
        groups[v.group] = { label: v.groupLabel, items: [] };
      }
      groups[v.group].items.push(v);
    });
    return Object.values(groups);
  }, [filteredVariables]);

  // Common quick chips
  const quickPillVariables = [
    { tag: '{name}', label: 'نام مشتری' },
    { tag: '{invoice_number}', label: 'شماره فاکتور' },
    { tag: '{amount}', label: 'مبلغ' },
    { tag: '{currency}', label: 'واحد پول' },
    { tag: '{date}', label: 'تاریخ' },
    { tag: '{store_name}', label: 'نام فروشگاه' },
    { tag: '{balance}', label: 'مانده حساب' },
  ];

  return (
    <div className="border-t border-gray-100 pt-8" id="sms-advanced-template-editor">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            ویرایشگر پیشرفته قالب‌های پیامک (SMS Templates)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            شخصی‌سازی متن پیامک‌های ارسالی با استفاده از منوی کشویی متغیرهای داینامیک و مشاهده پیش‌نمایش زنده در گوشی تلفن همراه
          </p>
        </div>

        {/* Template Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-600 shrink-0 flex items-center gap-1">
            <Layers className="w-4 h-4 text-indigo-500" />
            انتخاب قالب:
          </label>
          <div className="relative min-w-[220px]">
            <select
              id="select-sms-template-key"
              value={selectedTemplateKey}
              onChange={(e) => setSelectedTemplateKey(e.target.value)}
              className="w-full text-xs font-bold text-gray-800 bg-white border border-gray-300 rounded-xl px-3 py-2.5 pr-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none shadow-sm cursor-pointer transition-all hover:border-indigo-300"
            >
              {SMS_TEMPLATES_CONFIG.map((tpl) => (
                <option key={tpl.key} value={tpl.key}>
                  {tpl.title} ({tpl.categoryLabel})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout: Left (Editor + Variables) & Right (Phone Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Editor & Dropdown Menu (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Template Info Card */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-950">
                  قالب فعال: {currentTemplateDef.title}
                </span>
                <span className="text-[10px] bg-white text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 font-bold">
                  {currentTemplateDef.categoryLabel}
                </span>
              </div>
              <p className="text-[11px] text-indigo-800/80 mt-1 leading-relaxed">
                {currentTemplateDef.description}
              </p>
            </div>
          </div>

          {/* Dynamic Variables Insertion Toolbar */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-extrabold text-gray-800">
                  افزودن متغیر داینامیک:
                </span>
              </div>

              {/* PRIMARY DROPDOWN MENU FOR DYNAMIC VARIABLES */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="btn-open-variables-dropdown"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>منوی کشویی متغیرها (Variables)</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Popover Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-right animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Search inside variables */}
                    <div className="p-3 bg-gray-50 border-b border-gray-100">
                      <div className="relative">
                        <input
                          type="text"
                          value={variableFilter}
                          onChange={(e) => setVariableFilter(e.target.value)}
                          placeholder="جستجوی متغیر..."
                          className="w-full text-xs px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                          autoFocus
                        />
                        <Tag className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1.5 px-0.5">
                        روی هر متغیر کلیک کنید تا در موقعیت نشانگر در متن پیامک درج شود:
                      </p>
                    </div>

                    {/* Categorized List */}
                    <div className="max-h-72 overflow-y-auto p-2 space-y-3 divide-y divide-gray-100">
                      {groupedVariables.map((grp) => (
                        <div key={grp.label} className="pt-2 first:pt-0">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 px-2">
                            {grp.label}
                          </div>
                          <div className="space-y-1">
                            {grp.items.map((item) => (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => handleInsertVariable(item.tag)}
                                className="w-full text-right p-2 rounded-lg hover:bg-indigo-50/80 transition-colors flex items-center justify-between group border border-transparent hover:border-indigo-100"
                              >
                                <div>
                                  <div className="text-xs font-bold text-gray-800 group-hover:text-indigo-700 flex items-center gap-1.5">
                                    <span>{item.name}</span>
                                    <code className="text-[10px] font-mono bg-gray-100 group-hover:bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded" dir="ltr">
                                      {item.tag}
                                    </code>
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                    {item.description}
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono text-gray-400 group-hover:text-indigo-600 bg-gray-50 group-hover:bg-white px-1.5 py-0.5 rounded border border-gray-100 shrink-0 ml-2" dir="ltr">
                                  {item.example}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      {filteredVariables.length === 0 && (
                        <div className="p-4 text-center text-xs text-gray-500">
                          متغیری با این عنوان یافت نشد.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Click Variable Pills */}
            <div>
              <div className="text-[11px] text-gray-500 mb-1.5">
                کلیک سریع برای درج متغیرهای پرتکرار:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickPillVariables.map((pv) => (
                  <button
                    key={pv.tag}
                    type="button"
                    onClick={() => handleInsertVariable(pv.tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-gray-200 transition shadow-2xs active:scale-95 cursor-pointer"
                    title={`درج ${pv.label} در متن`}
                  >
                    <span>{pv.label}</span>
                    <span className="text-[10px] text-indigo-600 font-mono" dir="ltr">
                      {pv.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Text Editor Area */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <span>متن قالب پیامک</span>
                <span className="text-[10px] text-gray-400 font-normal">
                  (متغیرها با آکولاد <code>{'{نام_متغیر}'}</code> درج می‌شوند)
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyTemplate}
                  className="text-xs text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-100 transition flex items-center gap-1"
                  title="کپی کردن متن قالب"
                >
                  {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTemplate ? 'کپی شد' : 'کپی'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition flex items-center gap-1"
                  title="بازنشانی متن به حالت اولیه پیش‌فرض"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بازنشانی پیش‌فرض</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                id="sms-template-textarea"
                rows={5}
                value={currentText}
                onChange={(e) => {
                  setSettingsForm((prev: any) => ({
                    ...prev,
                    [selectedTemplateKey]: e.target.value,
                  }));
                }}
                placeholder="متن قالب پیامک را اینجا بنویسید..."
                className="w-full text-sm font-medium text-gray-900 leading-relaxed p-3.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-inner resize-y transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Character & SMS Part Counter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-medium">
                  طول پیش‌نمایش نهایی: <strong className="text-gray-800">{charCount}</strong> کاراکتر
                </span>
                <span className="text-gray-300">|</span>
                <span className="inline-flex items-center gap-1">
                  تعداد پیامک:
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                    smsSegments === 1
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : smsSegments === 2
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {smsSegments} پیامک فارسی
                  </span>
                </span>
                <span className="text-[11px] text-gray-400">
                  ({charsRemainingInSegment} کاراکتر مانده تا پارت بعدی)
                </span>
              </div>

              <span className="text-[10px] text-gray-400 text-left sm:text-right">
                استاندارد پیامک فارسی (۷۰ کاراکتر پارت ۱ + ۶۷ کاراکتر پارت‌های بعد)
              </span>
            </div>
          </div>

          {/* Preset Alternatives (if available) */}
          {currentTemplateDef.presetAlternatives && currentTemplateDef.presetAlternatives.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
              <div className="text-xs font-extrabold text-gray-700 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                متن‌های آماده پیشنهادی برای این قالب:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentTemplateDef.presetAlternatives.map((alt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSettingsForm((prev: any) => ({
                        ...prev,
                        [selectedTemplateKey]: alt.text,
                      }));
                    }}
                    className="text-right p-2.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition text-xs group"
                  >
                    <div className="font-bold text-gray-800 group-hover:text-indigo-700 mb-1">
                      {alt.label}
                    </div>
                    <div className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {alt.text}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Mobile Phone Message Bubble Preview (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-sm">
            {/* Phone Mockup Frame */}
            <div className="bg-slate-900 rounded-[2.5rem] p-3.5 shadow-2xl border-4 border-slate-700/80 relative">
              {/* Phone Speaker & Camera Notch */}
              <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-950" />
                <div className="w-8 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Screen Area */}
              <div className="bg-[#f0f2f5] rounded-[2rem] overflow-hidden min-h-[420px] flex flex-col justify-between p-3 border border-slate-200/50">
                {/* Screen Header (Sender Info) */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2.5 shadow-xs border border-gray-100 flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-800">
                        {settingsForm.notify_sender_number || '3000xxxx'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {storeName || settingsForm.store_name || 'سامانه اطلاع‌رسانی'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    پیامک زنده
                  </span>
                </div>

                {/* Message Bubble Container */}
                <div className="flex-1 flex flex-col justify-end space-y-2 py-2">
                  {/* Timestamp banner */}
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-gray-400 bg-black/5 px-2.5 py-0.5 rounded-full">
                      امروز • {sampleData.date}
                    </span>
                  </div>

                  {/* SMS Bubble */}
                  <div className="self-end max-w-[92%] bg-white text-gray-800 rounded-2xl rounded-tr-xs p-3.5 shadow-sm border border-gray-200/80 relative text-right">
                    <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap select-text">
                      {renderedPreviewText || 'متن پیامک خالی است...'}
                    </p>

                    {/* Bubble Footer info */}
                    <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[9px] text-gray-400">
                      <span>{smsSegments} پیامک</span>
                      <span className="flex items-center gap-1 font-mono">
                        <span>14:30</span>
                        <Check className="w-3 h-3 text-emerald-500 inline" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Screen Bottom bar */}
                <div className="bg-white/80 rounded-xl p-2 border border-gray-200 flex items-center justify-between text-[10px] text-gray-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-indigo-500" />
                    پیش‌نمایش داده‌های واقعی
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPreview}
                    className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                  >
                    {copiedPreview ? 'کپی شد!' : 'کپی متن پیام'}
                  </button>
                </div>
              </div>

              {/* Phone Home Bar */}
              <div className="w-24 h-1 bg-slate-600 rounded-full mx-auto mt-2" />
            </div>

            {/* Note under mockup */}
            <p className="text-center text-[11px] text-gray-400 mt-2.5">
              متغیرها در هنگام ارسال واقعی با مشخصات مخاطب و فاکتور جایگزین می‌گردند.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
