import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LogIn, ArrowLeft, BookOpen, Bell, Activity, Newspaper, ChevronLeft, 
  ShieldCheck, Search, Database, Package, ShoppingCart, Calculator, 
  Box, Users, Clock, BarChart3, Settings, CheckCircle2, 
  Sparkles, Layers, ArrowRightLeft, FileText, Phone, HelpCircle, 
  ChevronDown, ChevronUp, Send, Share2, Tag, Calendar, ExternalLink,
  Lock, RefreshCw, Smartphone, Laptop, Check, X, Printer, Barcode,
  Coins, TrendingUp, AlertTriangle, MonitorCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPersianDigits, addCommas } from '../utils/format';
import QuickPriceInquiry from './inventory/QuickPriceInquiry';
import { useAuth } from '../context/AuthContext';

interface NewsArticle {
  id: number;
  title: string;
  date: string;
  category: string;
  readTime: string;
  summary: string;
  content: string[];
  highlights?: string[];
  isImportant?: boolean;
}

export default function WelcomePage({ onLoginClick }: { onLoginClick: () => void }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>({});
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [showFullPricePage, setShowFullPricePage] = useState(false);
  
  // News state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newsSearchQuery, setNewsSearchQuery] = useState<string>('');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  // Active module preview tab in interactive showcase
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);

  // FAQ state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Quick Support Contact Form
  const [contactForm, setContactForm] = useState({ name: '', phone: '', subject: 'پشتیبانی فنی', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Quick In-Page Price Search state for embedded widget
  const [embeddedSearchTerm, setEmbeddedSearchTerm] = useState('');

  // Handle hash scrolling on initial mount or hash change
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const targetElement = document.querySelector(hash);
        if (targetElement) {
          setTimeout(() => {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await fetch('/api/databases');
        const data = await res.json();
        if (data.success && data.databases) {
          setBusinesses(data.databases);
          if (data.databases.length > 0 && !selectedBusiness) {
            setSelectedBusiness(data.databases[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch businesses", e);
      }
    };
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (!selectedBusiness) {
      setStoreProducts([]);
      setStoreSettings({});
      return;
    }

    const fetchStoreData = async () => {
      setIsLoadingStore(true);
      try {
        const [productsRes, settingsRes] = await Promise.all([
          fetch('/api/data/products', { headers: { 'x-store-id': selectedBusiness } }),
          fetch('/api/data/settings', { headers: { 'x-store-id': selectedBusiness } })
        ]);
        
        const productsData = await productsRes.json();
        const settingsData = await settingsRes.json();
        
        if (Array.isArray(productsData)) {
          setStoreProducts(productsData);
        }
        if (settingsData && !Array.isArray(settingsData)) {
          setStoreSettings(settingsData);
        }
      } catch (e) {
        console.error("Failed to fetch store data", e);
      } finally {
        setIsLoadingStore(false);
      }
    };

    fetchStoreData();
  }, [selectedBusiness]);

  // Comprehensive News Database
  const newsArticles: NewsArticle[] = [
    {
      id: 1,
      title: "انتشار نسخه جامع تراز با پایش لحظه‌ای کاردکس و اسناد خودکار",
      date: "۱۴۰۴/۱۱/۲۵",
      category: "بروزرسانی سیستم",
      readTime: "۳ دقیقه",
      isImportant: true,
      summary: "در این نسخه، ثبت اسناد دوبل به صورت آنی با صدور فاکتور و رسیدهای انبار همگام شده و سرعت بارگذاری گزارش‌های مالی تا ۳ برابر ارتقا یافته است.",
      highlights: [
        "اتصال بلادرنگ اسناد دوبل حسابداری به انبار و خزانه‌داری",
        "ترازنامه و سود و زیان لحظه‌ای با تفکیک مراکز هزینه",
        "بهبود رابط کاربری و عملکرد فوق‌العاده در مدیریت چک‌ها",
        "موتور جستجوی پیشرفته بارکد و کالاهای دارای ویژگی"
      ],
      content: [
        "با تلاش تیم مهندسی نرم‌افزار، نسخه جدید سامانه جامع تراز هم‌اکنون در دسترس قرار گرفته است. این بروزرسانی با هدف افزایش چشمگیر سرعت ثبت اسناد، کاهش خطای انسانی و ارائه گزارش‌های دقیق به مدیران مالی طراحی شده است.",
        "تمامی محاسبات کاردکس ریالی میانگین موزون اکنون به صورت خودکار و در کسری از ثانیه به‌روز می‌شوند، به نحوی که سود ناخالص هر فاکتور و مانده واقعی کالاها بدون نیاز به فرآیندهای دستی قابل رویت است.",
        "امکانات جدید کارتابل چک نیز به کاربران اجازه می‌دهد سررسید اسناد دریافتنی و پرداختنی را در تقویم مالی پایش کرده و هشدارهای سررسید را دریافت نمایند."
      ]
    },
    {
      id: 2,
      title: "راهنمای تطبیق محاسبات مالیاتی با جدیدترین بخشنامه‌های رسمی",
      date: "۱۴۰۴/۱۱/۱۸",
      category: "قوانین مالیاتی",
      readTime: "۴ دقیقه",
      summary: "بررسی الزامات صدور فاکتورهای رسمی، محاسبه خودکار مالیات بر ارزش افزوده و نحوه دریافت خروجی استاندارد جهت تسلیم اظهارنامه فصلی.",
      highlights: [
        "محاسبه نرخ مالیات بر ارزش افزوده طبق مصوبه سال جاری",
        "تولید فایل استاندارد گزارش معاملات فصلی (ماده ۱۶۹ مکرر)",
        "پشتیبانی کامل از شناسه کالا و خدمت و کدهای اختصاصی"
      ],
      content: [
        "به منظور انطباق کامل با قوانین سازمان امور مالیاتی، ساختار محاسبه و صدور فاکتورهای رسمی در سیستم تراز بازبینی شد.",
        "کاربران محترم می‌توانند با یک کلیک در بخش تنظیمات مالیاتی، نرخ‌های مصوب را فعال کرده تا در تمامی فاکتورهای خرید، فروش و برگشتی، ستون‌های ارزش افزوده و عوارض به صورت خودکار تفکیک گردند."
      ]
    },
    {
      id: 3,
      title: "وبینار آموزشی: ترفندهای مدیریت جریان نقدینگی و خزانه‌داری در شرایط نوسان بازار",
      date: "۱۴۰۴/۱۱/۱۰",
      category: "آموزش و کاربری",
      readTime: "۲ دقیقه",
      summary: "در این دوره کاربردی، روش‌های نوین بودجه‌بندی نقدی، کنترل وصول مطالبات معوق و استفاده بهینه از چک‌های مدت‌دار آموزش داده می‌شود.",
      highlights: [
        "بررسی نسبت‌های نقدینگی و پیش‌بینی وجوه نقد ۳۰ روزه",
        "تکنیک‌های جلوگیری از راکد ماندن سرمایه در انبارها",
        "پرسش و پاسخ اختصاصی با مشاوران ارشد حسابداری"
      ],
      content: [
        "مدیریت بهینه جریان نقدینگی شریان حیاتی هر بنگاه اقتصادی است. در این وبینار رایگان ویژه کاربران تراز، به بررسی کاربردی‌ترین ابزارهای سیستم در کنترل گردش وجوه نقد پرداخته خواهد شد.",
        "لینک اختصاصی حضور در وبینار از طریق پنل کاربری و پیامک برای تمامی کاربران فعال ارسال گردیده است."
      ]
    },
    {
      id: 4,
      title: "ارتقای سیستم پشتیبان‌گیری چندلایه و امنیت ابری داده‌های کسب‌وکار",
      date: "۱۴۰۴/۱۰/۲۸",
      category: "امنیت و داده",
      readTime: "۳ دقیقه",
      summary: "پیاده‌سازی رمزنگاری پیشرفته، امکان پشتیبان‌گیری خودکار روزانه روی فضای ابری و محلی، و ثبت تاریخچه دقیق تمامی تراکنش‌ها.",
      highlights: [
        "رمزنگاری ۲۵۶ بیتی کلیه پایگاه‌های داده اختصاصی",
        "قابلیت بازیابی نقطه زمانی در صورت قطعی یا خطا",
        "لاگ امنیتی جامع برای نظارت بر ورود و فعالیت کاربران"
      ],
      content: [
        "امنیت و حفظ حریم خصوصی اطلاعات مالی و تجاری شما اولویت نخست ماست. ساختار پایگاه داده سیستم به گونه‌ای ارتقا یافته که علاوه بر ذخیره‌سازی محلی برای دسترسی بدون اینترنت، از همگام‌سازی ابری با بالاترین استانداردهای امنیتی پشتیبانی می‌کند."
      ]
    }
  ];

  // System Modules Specifications
  const systemModules = [
    {
      id: 'commerce',
      title: 'بازرگانی و فروش هوشمند',
      subtitle: 'صدور سریع انواع فاکتورها و تحلیل سودآوری',
      icon: ShoppingCart,
      color: 'emerald',
      features: [
        'صدور فاکتور فروش، خرید، پیش‌فاکتور و مرجوعی‌ها',
        'محاسبه لحظه‌ای سود و زیان ناخالص هر سطر فاکتور',
        'اعمال تخفیفات درصدی، مبلغی و سطری با شفافیت کامل',
        'تسویه چندگانه (نقد، پوز بانکی، چک، معین مشتری)',
        'چاپ انواع فاکتور رسمی، استاندارد، فشرده و فیش حرارتی'
      ],
      stats: 'پوشش ۱۰۰٪ استانداردهای بازرگانی'
    },
    {
      id: 'accounting',
      title: 'حسابداری دوبل و خزانه‌داری',
      subtitle: 'مدیریت ترازها، اسناد دوبل و کارتابل چک',
      icon: Calculator,
      color: 'amber',
      features: [
        'کدینگ استاندارد درخت حساب‌ها (کل، معین، تفصیلی)',
        'ثبت خودکار اسناد حسابداری از کلیه عملیات سیستم',
        'کارتابل جامع چک‌های دریافتی، پرداختی و هشدار سررسید',
        'تراز آزمایشی ۴ ستونی، ترازنامه و صورت سود و زیان',
        'بستن خودکار حساب‌های موقت و انتقال به سال مالی جدید'
      ],
      stats: 'دقت مالیاتی و انطباق استاندارد'
    },
    {
      id: 'inventory',
      title: 'انبارداری و کنترل موجودی',
      subtitle: 'کاردکس لحظه‌ای، چندانباره و انبارگردانی',
      icon: Box,
      color: 'blue',
      features: [
        'کاردکس ریالی و تعدادی به روش میانگین موزون متحرک',
        'مدیریت نامحدود انبارها، حواله و رسیدهای انتقال بین انبار',
        'پشتیبانی از واحدهای اصلی و فرعی با ضریب تبدیل خودکار',
        'هشدار نقطه سفارش کالا و جلوگیری از کسری موجودی',
        'فرآیند سریع انبارگردانی با بارکدخوان و مغایرت‌گیری'
      ],
      stats: 'پایش ریالی و تعدادی دقیق'
    },
    {
      id: 'crm',
      title: 'مدیریت اشخاص و CRM',
      subtitle: 'دفتر معین، پیگیری مطالبات و پنل پیامک',
      icon: Users,
      color: 'purple',
      features: [
        'پرونده کامل مشتریان، تامین‌کنندگان، بازاریاب‌ها و همکاران',
        'ارائه صورت‌حساب معین و گردش حساب شفاف به طرف‌حساب',
        'ویترین مانیتورینگ مطالبات معوق و خوش‌حسابی مشتریان',
        'ارسال پیامک خودکار مانده‌حساب، سررسید چک و تبریک',
        'گروه‌بندی و تعیین سقف اعتبار ریالی برای هر خریدار'
      ],
      stats: 'ارتباط یکپارچه با مشتریان'
    },
    {
      id: 'hr',
      title: 'منابع انسانی و حقوق و دستمزد',
      subtitle: 'تردد پرسنل، قراردادها و صدور فیش حقوقی',
      icon: Clock,
      color: 'rose',
      features: [
        'ثبت ورود، خروج، مرخصی و ماموریت پرسنل به تفکیک شیفت',
        'مدیریت احکام کارگزینی، اضافه‌کار، پاداش و کسورات قانونی',
        'محاسبه خودکار بیمه تامین اجتماعی و مالیات حقوق',
        'صدور و چاپ فیش حقوقی استاندارد به صورت تکی و گروهی',
        'قراردادهای کاری پرسنل و تعهدات استیجاری محل کار'
      ],
      stats: 'محاسبه دقیق قانون کار'
    },
    {
      id: 'reports',
      title: 'گزارشات و هوش تجاری',
      subtitle: 'داشبوردهای تحلیلی عملکرد دوره‌ای و روندهای بازار',
      icon: BarChart3,
      color: 'teal',
      features: [
        'داشبورد مدیریتی شاخص‌های کلیدی عملکرد (KPIs)',
        'تحلیل کالاهای پرفروش، کم‌گردش و حاشیه سود به تفکیک گروه',
        'نمودارهای مقایسه‌ای فروش ماهانه و فصلی',
        'گزارش گردش نقدینگی و تحلیل وضعیت بدهکاران/بستانکاران',
        'خروجی آسان اکسل، PDF و قالب‌های چاپی سفارشی'
      ],
      stats: 'دید ۳۶۰ درجه از کسب‌وکار'
    }
  ];

  // FAQ Items
  const faqItems = [
    {
      q: "آیا سیستم حسابداری تراز به صورت آفلاین هم کار می‌کند؟",
      a: "بله، سیستم تراز با معماری هیبریدی طراحی شده است. شما می‌توانید حتی در زمان قطعی کامل اینترنت تمامی فاکتورها، انبارداری و دریافت/پرداخت‌ها را بدون وقفه ثبت کنید. به محض اتصال مجدد به اینترنت، داده‌ها به صورت خودکار و امن با پایگاه داده همگام‌سازی می‌گردند."
    },
    {
      q: "نحوه استعلام سریع قیمت کالاها توسط پرسنل یا مشتریان چگونه است؟",
      a: "شما می‌توانید بدون نیاز به ورود به پنل اصلی، از ماژول «استعلام سریع قیمت» در صفحه اصلی یا حالت تمام‌صفحه استفاده کنید. با اسکن بارکد با دستگاه بارکدخوان یا جستجوی نام کالا، قیمت روز، وضعیت موجودی انبار و کالاهای مشابه فوراً نمایش داده می‌شود."
    },
    {
      q: "آیا سیستم از استانداردهای جدید مالیاتی و فاکتور رسمی پشتیبانی می‌کند؟",
      a: "بله، تراز به صورت کامل از قوانین مالیات بر ارزش افزوده، تفکیک عوارض، درج شناسه کالا و خدمت و فرمت‌های استاندارد دارایی پشتیبانی می‌کند و قابلیت استخراج گزارشات فصلی برای اظهارنامه‌های مالیاتی را دارد."
    },
    {
      q: "پشتیبان‌گیری از اطلاعات چگونه انجام می‌شود و امنیت داده‌ها چقدر است؟",
      a: "سیستم مجهز به سیستم بک‌آپ‌گیری خودکار چندلایه است. نسخه پشتیبان به صورت رمزنگاری‌شده هم روی سیستم محلی و هم روی سرورهای امن ابری ذخیره می‌شود تا در صورت بروز هرگونه خرابی سخت‌افزاری، اطلاعات شما در امن‌ترین حالت ممکن محافظت گردد."
    },
    {
      q: "آیا می‌توان همزمان چند شعبه یا فروشگاه مستقل را مدیریت کرد؟",
      a: "بله، ساختار چندکسب‌وکاری سیستم به شما اجازه می‌دهد چندین فروشگاه، انبار یا شرکت مجزا را در یک سامانه تعریف کرده و به راحتی با تغییر پایگاه داده، حسابداری هر کدام را به تفکیک مدیریت نمایید."
    }
  ];

  // Filtered news
  const filteredNews = useMemo(() => {
    return newsArticles.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = !newsSearchQuery.trim() || 
        item.title.toLowerCase().includes(newsSearchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(newsSearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, newsSearchQuery]);

  // Embedded instant product search
  const embeddedSearchResults = useMemo(() => {
    if (!embeddedSearchTerm.trim() || !storeProducts.length) return [];
    const term = embeddedSearchTerm.trim().toLowerCase();
    return storeProducts.filter(p => 
      p.isActive !== false && (
        p.name?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term)
      )
    ).slice(0, 4);
  }, [embeddedSearchTerm, storeProducts]);

  const currency = storeSettings?.currency || 'تومان';

  // If full price inquiry page is open
  if (showFullPricePage && selectedBusiness) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col" dir="rtl">
        <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                  <MonitorCheck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900">سامانه جامع استعلام سریع کالا و قیمت</h1>
                  <p className="text-xs text-slate-500 font-medium">کسب‌و‌کار فعال: {businesses.find(b => b.id === selectedBusiness)?.name || 'پیش‌فرض'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFullPricePage(false)}
                className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-bold bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all cursor-pointer"
              >
                بازگشت به صفحه اصلی
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <QuickPriceInquiry products={storeProducts} settings={storeSettings} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900" dir="rtl">
      
      {/* 1. TOP BAR CONTRACT: Zone 1 (Wordmark) — Zone 2 (4-6 Clean Links) — Zone 3 (Primary Actions) */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Zone 1: Single element brand wordmark */}
            <a href="/" className="flex items-center gap-3 text-slate-900 hover:opacity-90 transition-opacity">
              <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                <Activity className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  سامانه جامع <span className="text-indigo-600">تراز</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400">حسابداری و مدیریت بازرگانی</span>
              </div>
            </a>

            {/* Zone 2: 4-6 Clean text navigation links with subtle hover underlines */}
            <nav className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-600">
              <a href="#" className="hover:text-indigo-600 transition-colors">صفحه اصلی</a>
              <a href="#inquiry" className="hover:text-indigo-600 transition-colors">استعلام سریع قیمت</a>
              <a href="#modules" className="hover:text-indigo-600 transition-colors">امکانات و بخش‌ها</a>
              <a href="#news" className="hover:text-indigo-600 transition-colors">اخبار و اطلاعیه‌ها</a>
              <a href="#faq" className="hover:text-indigo-600 transition-colors">سوالات متداول</a>
              <a href="#support" className="hover:text-indigo-600 transition-colors">پشتیبانی</a>
            </nav>

            {/* Zone 3: 1-2 Primary user actions */}
            <div className="flex items-center gap-3">
              {user ? (
                <button
                  onClick={onLoginClick}
                  className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-5 py-2.5 rounded-xl font-black text-sm transition-all border border-indigo-200/60 shadow-xs cursor-pointer"
                >
                  <span className="truncate max-w-[140px]">{user.name || user.username}</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={onLoginClick}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>ورود به سیستم</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* 2. HERO SECTION: High-impact typography, clear value proposition, and quick interactive launcher */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/70 pt-16 pb-20 lg:pt-24 lg:pb-32">
        {/* Subtle geometric background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-50/70 rounded-full blur-3xl opacity-70 -translate-y-1/2" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-emerald-50/60 rounded-full blur-3xl opacity-60 translate-y-1/3" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Right Column: Hero Text & Main CTAs (7 cols) */}
            <div className="lg:col-span-7 text-right space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>سامانه حسابداری، انبارداری و خزانه‌داری نسخه ۱۴۰۴</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-[1.25] tracking-tight">
                مدیریت هوشمند و یکپارچه مالی کسب‌و‌کار با <span className="text-indigo-600">سامانه تراز</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium max-w-2xl">
                راهکاری جامع برای صدور فاکتورهای فروش و خرید، انبارداری چندگانه با کاردکس لحظه‌ای، ثبت خودکار اسناد دوبل حسابداری، مدیریت چک‌ها و محاسبه حقوق و دستمزد پرسنل.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {user ? (
                  <button 
                    onClick={onLoginClick}
                    className="flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3.5 rounded-xl font-black text-base transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
                  >
                    <span>ورود به داشبورد کاری</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                ) : (
                  <button 
                    onClick={onLoginClick}
                    className="flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3.5 rounded-xl font-black text-base transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
                  >
                    <span>ورود به پنل کاربری</span>
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}

                <a 
                  href="#inquiry"
                  className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 px-6 py-3.5 rounded-xl font-black text-base transition-all border border-slate-200 shadow-xs cursor-pointer"
                >
                  <Search className="w-4 h-4 text-indigo-600" />
                  <span>استعلام سریع قیمت</span>
                </a>

                <a 
                  href="#news"
                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  <Newspaper className="w-4 h-4 text-slate-500" />
                  <span>آخرین اطلاعیه‌ها</span>
                </a>
              </div>

              {/* Trust markers & quantitative highlights */}
              <div className="pt-8 border-t border-slate-150 grid grid-cols-3 gap-4 max-w-xl">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">۱۰۰٪</div>
                  <div className="text-xs font-bold text-slate-500 mt-0.5">کارکرد پیوسته آفلاین</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-indigo-600 font-mono">۰٫۰۲ ثانیه</div>
                  <div className="text-xs font-bold text-slate-500 mt-0.5">سرعت صدور سند دوبل</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">۶ ماژول</div>
                  <div className="text-xs font-bold text-slate-500 mt-0.5">یکپارچگی کامل سیستم</div>
                </div>
              </div>

            </div>

            {/* Left Column: Interactive Feature Live Showcase Card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-amber-500"></div>
                
                {/* Showcase Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">مرکز کنترل یکپارچه کسب‌و‌کار</h3>
                      <p className="text-[11px] text-slate-400 font-medium">پایش لحظه‌ای انبار، فروش و خزانه‌داری</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    فعال و آماده‌به‌کار
                  </div>
                </div>

                {/* Quick Snapshot Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/60">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>انبار و کاردکس</span>
                      <Box className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="text-sm font-black text-white font-mono">میانگین موزون</div>
                    <div className="text-[10px] text-emerald-400 mt-1 font-bold">✓ محاسبه خودکار بهای تمام‌شده</div>
                  </div>

                  <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/60">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>حسابداری دوبل</span>
                      <Calculator className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="text-sm font-black text-white font-mono">تراز لحظه‌ای</div>
                    <div className="text-[10px] text-emerald-400 mt-1 font-bold">✓ انطباق با کدینگ استاندارد</div>
                  </div>
                </div>

                {/* Quick In-Hero Search Demonstration */}
                <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 space-y-3">
                  <div className="text-xs font-black text-slate-300 flex items-center justify-between">
                    <span>تست سریع موتور استعلام کالا</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {toPersianDigits(storeProducts.length)} قلم کالای فعال
                    </span>
                  </div>
                  
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={embeddedSearchTerm}
                      onChange={(e) => setEmbeddedSearchTerm(e.target.value)}
                      placeholder="نام یا کد کالا را اینجا تایپ کنید..." 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pr-9 pl-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>

                  {embeddedSearchResults.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {embeddedSearchResults.map(prod => (
                        <div key={prod.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 text-xs border border-slate-800">
                          <span className="font-bold text-slate-200 truncate max-w-[160px]">{prod.name}</span>
                          <span className="font-mono font-black text-emerald-400">
                            {toPersianDigits(addCommas(prod.price || 0))} {currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : embeddedSearchTerm ? (
                    <div className="text-center py-2 text-[11px] text-slate-400">موردی با این عبارت یافت نشد</div>
                  ) : (
                    <div className="text-[11px] text-slate-400 leading-relaxed">
                      با تایپ نام یا اسکن بارکد، مشخصات کالا در کسری از ثانیه استعلام می‌شود.
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <a href="#inquiry" className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1">
                    مشاهده فرم کامل استعلام قیمت
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </a>
                  <button 
                    onClick={() => {
                      if (businesses.length > 0) setShowFullPricePage(true);
                    }}
                    className="text-slate-300 hover:text-white font-bold bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    حالت تمام‌صفحه
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. QUICK PRICE INQUIRY SECTION (#inquiry) */}
      <section id="inquiry" className="py-16 bg-slate-100/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-wider mb-2">
                <Search className="w-4 h-4" />
                <span>صندوق استعلام و جستجوی کالا</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                استعلام سریع قیمت و موجودی کالا
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                بدون نیاز به ورود به سیستم، قیمت به‌روز و وضعیت موجودی کالاها را بررسی کنید.
              </p>
            </div>

            {/* Store switcher dropdown */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600 whitespace-nowrap">انتخاب فروشگاه:</label>
              <div className="relative min-w-[200px]">
                <Database className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={selectedBusiness}
                  onChange={(e) => setSelectedBusiness(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl py-2.5 pr-9 pl-4 text-xs font-bold focus:ring-2 focus:ring-indigo-600 outline-none appearance-none shadow-xs"
                >
                  {businesses.map((b, idx) => (
                    <option key={`bus-${idx}`} value={b.id}>{b.name}</option>
                  ))}
                  {businesses.length === 0 && (
                    <option value="">درحال بارگذاری پایگاه‌های داده...</option>
                  )}
                </select>
              </div>

              <button
                onClick={() => setShowFullPricePage(true)}
                className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Laptop className="w-4 h-4" />
                <span>نمای تمام‌صفحه</span>
              </button>
            </div>
          </div>

          {/* Embedded QuickPriceInquiry Component */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoadingStore ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                <span className="text-xs font-bold">درحال دریافت اطلاعات انبار و کالاها...</span>
              </div>
            ) : (
              <QuickPriceInquiry products={storeProducts} settings={storeSettings} />
            )}
          </div>

        </div>
      </section>

      {/* 4. COMPREHENSIVE SYSTEM MODULES & CAPABILITIES (#modules) */}
      <section id="modules" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-black mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>معماری ماژولار و جامع</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              پوشش کامل تمامی نیازهای حسابداری و مدیریت مالی
            </h2>
            <p className="text-slate-500 text-base mt-3">
              هر بخش با طراحی ارگونومیک و بالاترین استانداردهای مالی توسعه داده شده است.
            </p>
          </div>

          {/* Module Selector Tab bar */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl max-w-4xl mx-auto mb-12 overflow-x-auto custom-scrollbar">
            {systemModules.map((mod, idx) => {
              const Icon = mod.icon;
              const isActive = activeModuleIndex === idx;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModuleIndex(idx)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex-1 justify-center ${
                    isActive 
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{mod.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Active Module Detailed Showcase Card */}
          {(() => {
            const currentMod = systemModules[activeModuleIndex];
            const Icon = currentMod.icon;
            return (
              <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8 lg:p-12 transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                  
                  <div className="lg:col-span-7 space-y-6 text-right">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">{currentMod.title}</h3>
                        <p className="text-slate-500 text-sm font-medium">{currentMod.subtitle}</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      {currentMod.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-3xs">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-sm font-bold text-slate-700 leading-relaxed">{feat}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 flex items-center gap-4">
                      <button 
                        onClick={onLoginClick}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                      >
                        <span>ورود و استفاده از این بخش</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-slate-400">
                        وضعیت: {currentMod.stats}
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                      <div className="text-xs font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                        نمای کلی امکانات کلیدی
                      </div>
                      
                      <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-5 h-5 text-indigo-600" />
                            <span className="text-xs font-extrabold text-slate-800">امنیت و ثبت خودکار لاگ</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">تایید شده</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Printer className="w-5 h-5 text-indigo-600" />
                            <span className="text-xs font-extrabold text-slate-800">خروجی چاپی و اکسل</span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">فرمت‌های متنوع</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Coins className="w-5 h-5 text-indigo-600" />
                            <span className="text-xs font-extrabold text-slate-800">محاسبات ریالی استاندارد</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">بدون خطا</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          تمامی تراکنش‌ها در این بخش به طور مستقیم با دفتر روزنامه، معین اشخاص و تراز مالیاتی لینک می‌باشند.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

        </div>
      </section>

      {/* 5. NEWS & ANNOUNCEMENTS SECTION (#news) */}
      <section id="news" className="py-20 bg-slate-50/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-wider mb-2">
                <Newspaper className="w-4 h-4" />
                <span>پایگاه اطلاع‌رسانی و اخبار سامانه</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                اخبار، بخشنامه‌ها و تغییرات سیستم
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                از آخرین بروزرسانی‌ها، اطلاعیه‌های مالیاتی و ترفندهای حسابداری باخبر شوید.
              </p>
            </div>

            {/* News Live Search */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={newsSearchQuery}
                onChange={(e) => setNewsSearchQuery(e.target.value)}
                placeholder="جستجو در اخبار و بخشنامه‌ها..."
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl py-2.5 pr-10 pl-4 text-xs font-medium focus:ring-2 focus:ring-indigo-600 outline-none shadow-xs"
              />
              {newsSearchQuery && (
                <button 
                  onClick={() => setNewsSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* News Category Filter Tabs */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
            {[
              { id: 'all', label: 'همه اطلاعیه‌ها' },
              { id: 'بروزرسانی سیستم', label: 'بروزرسانی سیستم' },
              { id: 'قوانین مالیاتی', label: 'قوانین مالیاتی' },
              { id: 'آموزش و کاربری', label: 'آموزش و کاربری' },
              { id: 'امنیت و داده', label: 'امنیت و داده' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* News Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredNews.map((article) => (
              <article 
                key={article.id}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Clean unboxed metadata with typographic separators */}
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3">
                    <span className="text-indigo-600 font-black">{article.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{article.date}</span>
                    <span aria-hidden="true">·</span>
                    <span>زمان مطالعه: {article.readTime}</span>
                    {article.isImportant && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-rose-600 font-bold">مهم</span>
                      </>
                    )}
                  </div>

                  <h3 
                    onClick={() => setSelectedArticle(article)}
                    className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug cursor-pointer mb-3"
                  >
                    {article.title}
                  </h3>

                  <p className="text-slate-600 text-sm leading-relaxed mb-5 line-clamp-3 text-justify">
                    {article.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedArticle(article)}
                    className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 group-hover:gap-2 transition-all cursor-pointer"
                  >
                    <span>مطالعه متن کامل مقاله</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(`${window.location.origin}/#news`);
                      }
                      setSelectedArticle(article);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    title="اشتراک‌گذاری"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          {filteredNews.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
              <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-700">هیچ خبری با معیارهای جستجو پیدا نشد</p>
              <button 
                onClick={() => { setSelectedCategory('all'); setNewsSearchQuery(''); }}
                className="mt-3 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                نمایش تمام اطلاعیه‌ها
              </button>
            </div>
          )}

        </div>
      </section>

      {/* 6. FAQ & KNOWLEDGE BASE ACCORDION (#faq) */}
      <section id="faq" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-black mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>پاسخ به پرسش‌های شما</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900">سوالات متداول کاربران</h2>
            <p className="text-slate-500 text-sm mt-2">
              پاسخ به سوالات پرتکرار درباره امکانات، پایداری، بک‌آپ‌گیری و نحوه استفاده از سیستم.
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div 
                  key={idx}
                  className="bg-slate-50 border border-slate-200/90 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full text-right p-5 flex items-center justify-between gap-4 font-black text-sm text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <div className={`w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-200/50 pt-3">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 7. SUPPORT & DIRECT INQUIRY (#support) */}
      <section id="support" className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6 text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-950 text-indigo-300 text-xs font-black border border-indigo-800/60">
                <Phone className="w-3.5 h-3.5" />
                <span>پشتیبانی و ارتباط مستقیم</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                همواره در کنار شما و کسب‌و‌کارتان هستیم
              </h2>

              <p className="text-slate-400 text-sm leading-relaxed max-w-lg font-medium">
                تیم کارشناسان فنی و حسابداری ما برای پاسخگویی به پرسش‌ها، راهنمایی راه‌اندازی و سفارشی‌سازی فرم‌های فاکتور و گزارشات در خدمت شما هستند.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">تلفن تماس پشتیبانی ۲۴ ساعته</div>
                    <div className="text-sm font-black text-white font-mono" dir="ltr">021 - 8899 0011</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">امنیت و پشتیبان‌گیری ابری خودکار</div>
                    <div className="text-sm font-black text-white">رمزنگاری پیشرفته پایگاه داده و فایل‌ها</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Contact Form */}
            <div className="lg:col-span-6">
              <div className="bg-slate-800 rounded-3xl p-7 border border-slate-700 shadow-2xl">
                <h3 className="text-lg font-black text-white mb-1">ارسال پیام یا درخواست پشتیبانی</h3>
                <p className="text-xs text-slate-400 mb-6 font-medium">فرم زیر را تکمیل کنید تا کارشناسان ما سریعاً با شما تماس بگیرند.</p>

                {contactSubmitted ? (
                  <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-6 rounded-2xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                    <h4 className="font-black text-sm">پیام شما با موفقیت ثبت شد</h4>
                    <p className="text-xs text-emerald-200/80">همکاران ما به زودی با شما تماس خواهند گرفت.</p>
                    <button 
                      onClick={() => {
                        setContactSubmitted(false);
                        setContactForm({ name: '', phone: '', subject: 'پشتیبانی فنی', message: '' });
                      }}
                      className="mt-3 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      ارسال پیام جدید
                    </button>
                  </div>
                ) : (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      setContactSubmitted(true);
                    }}
                    className="space-y-4 text-right"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">نام و نام خانوادگی:</label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="مثلاً علی رحمانی"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">شماره تماس:</label>
                        <input
                          type="tel"
                          required
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          placeholder="0912..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-left"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">موضوع:</label>
                      <select
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      >
                        <option value="پشتیبانی فنی">پشتیبانی فنی و کاربری</option>
                        <option value="مشاوره حسابداری">مشاوره امکانات حسابداری و انبار</option>
                        <option value="درخواست آموزش">درخواست وبینار یا جلسه آموزشی</option>
                        <option value="انتقادات و پیشنهادات">پیشنهاد قابلیت جدید</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">متن پیام:</label>
                      <textarea
                        rows={3}
                        required
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="توضیحات درخواست خود را بنویسید..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-medium resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>ثبت و ارسال پیام به پشتیبانی</span>
                    </button>
                  </form>
                )}

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-base font-black text-white">سامانه جامع تراز</span>
              <span className="text-xs text-slate-500">· پلتفرم ابری و محلی مدیریت مالی کسب‌و‌کار</span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-400">
              <a href="#" className="hover:text-white transition-colors">صفحه اصلی</a>
              <a href="#inquiry" className="hover:text-white transition-colors">استعلام قیمت</a>
              <a href="#modules" className="hover:text-white transition-colors">بخش‌های کاری</a>
              <a href="#news" className="hover:text-white transition-colors">اخبار و بخشنامه‌ها</a>
              <a href="#faq" className="hover:text-white transition-colors">راهنما و سوالات</a>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
            <p>© ۱۴۰۴ تمامی حقوق مادی و معنوی برای سامانه جامع حسابداری تراز محفوظ است.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>کلیه سرویس‌ها و پایگاه داده فعال می‌باشند</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ARTICLE READER MODAL (When clicking on any news article) */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100 font-sans"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span className="text-indigo-600 font-black">{selectedArticle.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{selectedArticle.date}</span>
                </div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-right">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {selectedArticle.title}
                </h2>

                <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100 text-xs sm:text-sm font-bold text-indigo-950 leading-relaxed">
                  {selectedArticle.summary}
                </div>

                {selectedArticle.highlights && selectedArticle.highlights.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">نکات و دستاوردهای کلیدی:</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedArticle.highlights.map((h, hIdx) => (
                        <div key={hIdx} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-2 text-sm text-slate-700 leading-relaxed text-justify">
                  {selectedArticle.content.map((paragraph, pIdx) => (
                    <p key={pIdx}>{paragraph}</p>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  بستن پنجره
                </button>
                <button
                  onClick={() => {
                    setSelectedArticle(null);
                    onLoginClick();
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>ورود به سیستم و اعمال تنظیمات</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
