import React from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingCart, 
  Box, 
  Calculator, 
  Settings, 
  LayoutGrid, 
  Users, 
  FileText, 
  PieChart, 
  Store, 
  Clock, 
  Activity, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2,
  Calendar,
  DollarSign
} from 'lucide-react';

interface Props {
  onSelectModule: (module: 'all' | 'commerce' | 'inventory' | 'accounting' | 'admin' | 'crm' | 'hr' | 'reports_module') => void;
  storeSettings?: any;
  invoices?: any[];
  persons?: any[];
  products?: any[];
  transactions?: any[];
  issuedChecks?: any[];
  receivedChecks?: any[];
}

export default function ModuleSelector({ 
  onSelectModule, 
  storeSettings,
  invoices = [],
  persons = [],
  products = [],
  transactions = [],
  issuedChecks = [],
  receivedChecks = []
}: Props) {
  const storeName = storeSettings?.storeName || 'سامانه یکپارچه مدیریت کسب و کار';
  const logoUrl = storeSettings?.logoUrl;

  const parseJalaliToNumber = (dateStr: any) => {
    if (!dateStr || typeof dateStr !== "string") return 0;
    const engDigits = dateStr.replace(/[۰-۹]/g, (w) => "۰۱۲۳۴۵۶۷۸۹".indexOf(w).toString());
    const parts = engDigits.split('/');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const d = parseInt(parts[2], 10) || 0;
      return y * 10000 + m * 100 + d;
    }
    return 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fa-IR").format(amount);
  };

  // Build list of recent activities dynamically
  const activities: any[] = [];

  if (Array.isArray(invoices)) {
    invoices.slice(-10).forEach(inv => {
      let typeText = "فاکتور جدید";
      let iconColor = "text-emerald-600 bg-emerald-50";
      if (inv.type === "sale") { typeText = "فاکتور فروش"; iconColor = "text-emerald-600 bg-emerald-50"; }
      else if (inv.type === "purchase") { typeText = "فاکتور خرید"; iconColor = "text-blue-600 bg-blue-50"; }
      else if (inv.type === "sale_return") { typeText = "مرجوعی فروش"; iconColor = "text-amber-600 bg-amber-50"; }
      else if (inv.type === "purchase_return") { typeText = "مرجوعی خرید"; iconColor = "text-rose-600 bg-rose-50"; }
      else if (inv.type?.includes("warehouse")) { typeText = "سند انبارداری"; iconColor = "text-indigo-600 bg-indigo-50"; }
      
      activities.push({
        id: `inv-${inv.id || "temp-" + Date.now()}`,
        type: "invoice",
        category: inv.type,
        title: typeText,
        description: `ثبت سند شماره ${inv.invoiceNumber || ""} به مبلغ ${formatCurrency(inv.totalAmount || 0)} تومان`,
        date: inv.date,
        sortVal: inv.createdAt || parseJalaliToNumber(inv.date),
        iconColor,
      });
    });
  }

  if (Array.isArray(persons)) {
    persons.slice(-10).forEach(p => {
      let roleText = "شخص جدید";
      if (p.role === "customer") roleText = "مشتری جدید";
      else if (p.role === "supplier") roleText = "تأمین‌کننده جدید";
      else if (p.role === "employee") roleText = "پرسنل جدید";
      activities.push({
        id: `person-${p.id || "temp-" + Date.now()}`,
        type: "person",
        title: roleText,
        description: `تعریف "${p.name}" با شماره ${p.phone || "بدون شماره"}`,
        date: p.registrationDate || "",
        sortVal: p.createdAt || parseJalaliToNumber(p.registrationDate || ""),
        iconColor: "text-rose-500 bg-rose-50",
      });
    });
  }

  if (Array.isArray(transactions)) {
    transactions.slice(-10).forEach(t => {
      const isDeposit = t.type === "deposit";
      activities.push({
        id: `tx-${t.id || "temp-" + Date.now()}`,
        type: "transaction",
        title: isDeposit ? "دریافت نقد/بانک" : "پرداخت نقد/بانک",
        description: `انتقال مبلغ ${formatCurrency(t.amount || 0)} تومان بابت ${t.description || "ثبت مالی"}`,
        date: t.date,
        sortVal: t.createdAt || parseJalaliToNumber(t.date),
        iconColor: isDeposit ? "text-teal-600 bg-teal-50" : "text-rose-600 bg-rose-50",
      });
    });
  }

  if (Array.isArray(issuedChecks)) {
    issuedChecks.slice(-5).forEach(c => {
      activities.push({
        id: `issued-check-${c.id || "temp-" + Date.now()}`,
        type: "check",
        title: "صدور چک بانکی",
        description: `شماره ${c.checkNumber || ""} به مبلغ ${formatCurrency(c.amount || 0)} تومان`,
        date: c.issueDate || "",
        sortVal: c.createdAt || parseJalaliToNumber(c.issueDate || ""),
        iconColor: "text-purple-600 bg-purple-50",
      });
    });
  }

  if (Array.isArray(receivedChecks)) {
    receivedChecks.slice(-5).forEach(c => {
      activities.push({
        id: `received-check-${c.id || "temp-" + Date.now()}`,
        type: "check",
        title: "وصول/دریافت چک",
        description: `چک بانک ${c.bankName || ""} به مبلغ ${formatCurrency(c.amount || 0)} تومان`,
        date: c.receiveDate || "",
        sortVal: c.createdAt || parseJalaliToNumber(c.receiveDate || ""),
        iconColor: "text-indigo-600 bg-indigo-50",
      });
    });
  }

  const sortedActivities = activities
    .sort((a, b) => b.sortVal - a.sortVal)
    .slice(0, 6);

  const modules = [
    {
      id: 'commerce',
      title: 'بازرگانی و فروش',
      description: 'مشتریان، خرید و فروش، پیش‌فاکتورها و تخفیف‌ها.',
      icon: <ShoppingCart className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-500 hover:shadow-emerald-200/40',
      iconBg: 'bg-emerald-100/70',
    },
    {
      id: 'inventory',
      title: 'انبار و کالا',
      description: 'انبارداری، تعریف کالا، اسناد ورود/خروج و موجودی.',
      icon: <Box className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50/50 border-amber-100 hover:border-amber-500 hover:shadow-amber-200/40',
      iconBg: 'bg-amber-100/70',
    },
    {
      id: 'accounting',
      title: 'حسابداری و مالی',
      description: 'صندوق، دریافت/پرداخت، اسناد معین، چک‌ها و وام.',
      icon: <Calculator className="w-5 h-5 text-indigo-600" />,
      color: 'bg-indigo-50/50 border-indigo-100 hover:border-indigo-500 hover:shadow-indigo-200/40',
      iconBg: 'bg-indigo-100/70',
    },
    {
      id: 'crm',
      title: 'ارتباط با مشتریان (CRM)',
      description: 'پرونده جامع مشتری، پیگیری‌ها و وفادارسازی.',
      icon: <Users className="w-5 h-5 text-rose-600" />,
      color: 'bg-rose-50/50 border-rose-100 hover:border-rose-500 hover:shadow-rose-200/40',
      iconBg: 'bg-rose-100/70',
    },
    {
      id: 'hr',
      title: 'منابع انسانی و حقوق',
      description: 'مدیریت پرسنل، کارکرد، وام‌ها و صدور فیش حقوقی.',
      icon: <FileText className="w-5 h-5 text-cyan-600" />,
      color: 'bg-cyan-50/50 border-cyan-100 hover:border-cyan-500 hover:shadow-cyan-200/40',
      iconBg: 'bg-cyan-100/70',
    },
    {
      id: 'reports_module',
      title: 'گزارشات و تحلیل‌ها',
      description: 'داشبوردهای مدیریتی، تحلیل فروش و تراز مالی.',
      icon: <PieChart className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-50/50 border-purple-100 hover:border-purple-500 hover:shadow-purple-200/40',
      iconBg: 'bg-purple-100/70',
    },
    {
      id: 'admin',
      title: 'تنظیمات و پیکربندی',
      description: 'مدیریت کاربران، سال مالی، پیامک‌ها و پشتیبان‌گیری.',
      icon: <Settings className="w-5 h-5 text-slate-600" />,
      color: 'bg-slate-50/50 border-slate-100 hover:border-slate-500 hover:shadow-slate-200/40',
      iconBg: 'bg-slate-200/70',
    },
    {
      id: 'all',
      title: 'داشبورد جامع (همه بخش‌ها)',
      description: 'ورود به محیط یکپارچه و تجمیع‌شده تمام بخش‌ها.',
      icon: <LayoutGrid className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-50/50 border-blue-200 hover:border-blue-600 hover:shadow-blue-200/50 col-span-2',
      iconBg: 'bg-blue-100/80',
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden" dir="rtl">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 45, 0],
            opacity: [0.25, 0.4, 0.25],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[15%] -right-[5%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-indigo-100/30 to-purple-100/30 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            rotate: [0, -45, 0],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[15%] -left-[5%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-blue-100/30 to-emerald-100/30 blur-[100px]"
        />
      </div>
      
      <div className="w-full max-w-7xl mx-auto relative z-10 flex flex-col gap-6">
        {/* Compact Elegant Header */}
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-200/60 pb-5"
        >
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={storeName} 
              className="w-16 h-16 object-contain bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100"
            />
          ) : (
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100">
              <Store className="w-8 h-8" />
            </div>
          )}
          <div className="text-center sm:text-right">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">{storeName}</h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
              جهت ورود، لطفاً بخش کاری یا ماژول مورد نظر خود را انتخاب نمایید.
            </p>
          </div>
        </motion.div>

        {/* Dual Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* RIGHT PANEL: Module selector (Compact grid of 8 cards) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="lg:col-span-7 flex flex-col justify-start"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-5 bg-indigo-600 rounded-full"></span>
              <h2 className="text-base font-bold text-slate-900">بخش‌های کاری و دسترسی سریع</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {modules.map((m, idx) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 + 0.1 }}
                  onClick={() => onSelectModule(m.id as any)}
                  className={`cursor-pointer rounded-2xl p-3.5 border transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md flex items-start gap-3.5 ${m.color} group bg-white/90 backdrop-blur-sm`}
                >
                  <div className={`p-2.5 rounded-xl ${m.iconBg} transition-all duration-300 group-hover:scale-105 group-hover:rotate-2 shadow-sm border border-white/80 shrink-0`}>
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-950 mb-0.5 group-hover:text-indigo-600 transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
                      {m.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* LEFT PANEL: Reports & Activities Summary */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="lg:col-span-5 flex flex-col bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm overflow-hidden"
          >
            {/* KPI Counters Grid */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="text-sm font-black text-slate-950">{formatCurrency(invoices.length)}</span>
                <span className="text-[10px] text-slate-500 font-bold mt-0.5">اسناد</span>
              </div>
              <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center">
                <Box className="w-4 h-4 text-amber-600 mb-1" />
                <span className="text-sm font-black text-slate-950">{formatCurrency(products.length)}</span>
                <span className="text-[10px] text-slate-500 font-bold mt-0.5">کالاها</span>
              </div>
              <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center">
                <Users className="w-4 h-4 text-rose-600 mb-1" />
                <span className="text-sm font-black text-slate-950">{formatCurrency(persons.length)}</span>
                <span className="text-[10px] text-slate-500 font-bold mt-0.5">مشتریان</span>
              </div>
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center">
                <Activity className="w-4 h-4 text-indigo-600 mb-1" />
                <span className="text-sm font-black text-slate-950">{formatCurrency(transactions.length)}</span>
                <span className="text-[10px] text-slate-500 font-bold mt-0.5">تراکنش‌ها</span>
              </div>
            </div>

            {/* Timeline Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  آخرین فعالیت‌های ثبت شده در سیستم
                </h3>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">زنده</span>
            </div>

            {/* Timeline Area */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {sortedActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                  <Activity className="w-8 h-8 stroke-1 mb-2 opacity-60" />
                  <p className="text-xs font-semibold">هنوز فعالیتی ثبت نشده است.</p>
                  <p className="text-[10px] mt-1 text-slate-500">پس از ایجاد فاکتور، اشخاص یا اسناد، گزارش زنده آن اینجا نمایش می‌یابد.</p>
                </div>
              ) : (
                sortedActivities.map((act) => (
                  <div key={act.id} className="group/item flex gap-3 items-start border-r-2 border-slate-100 pr-3 relative hover:border-indigo-400 transition-colors py-1">
                    <div className="absolute right-[-5px] top-2 w-2.5 h-2.5 rounded-full bg-slate-200 group-hover/item:bg-indigo-500 transition-colors border-2 border-white" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-bold text-slate-900">{act.title}</span>
                        {act.date && (
                          <span className="text-[9px] text-slate-400 font-mono font-bold shrink-0 flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            {act.date}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed truncate group-hover/item:text-slate-800 transition-colors">
                        {act.description}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Summary Tip */}
            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center gap-2.5">
              <div className="bg-indigo-50 p-1.5 rounded-xl">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  تاکنون در این سال مالی، جمعاً <strong className="text-slate-950 font-black">{formatCurrency(invoices.length)}</strong> سند بازرگانی و انبارداری و <strong className="text-slate-950 font-black">{formatCurrency(transactions.length)}</strong> تراکنش مالی با موفقیت تراز شده‌اند.
                </p>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
