import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Keyboard, 
  Search, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Command,
  ArrowRight,
  Hash,
  Sliders,
  Check,
  FilePlus,
  ShoppingCart,
  ShoppingBag,
  PlusCircle,
  MinusCircle,
  CreditCard,
  Box,
  Users,
  MessageSquare,
  TrendingUp,
  Calculator,
  ScanLine,
  RefreshCw,
  Settings,
  Warehouse,
  Barcode,
  Tag,
  BookOpen,
  Send,
  FileSpreadsheet,
  LayoutDashboard,
  Zap
} from 'lucide-react';
import { 
  QuickCodeItem, 
  QuickCodeCategory, 
  CATEGORY_LABELS 
} from '../../services/quickCodeService';
import { toPersianDigits } from '../../utils/format';
import { QuickCodeHUDState } from '../../hooks/useQuickCodeNavigator';

// Icon resolver helper
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  FilePlus,
  PackagePlus: FilePlus,
  RotateCcw: RefreshCw,
  RotateCw: RefreshCw,
  FileText: FileSpreadsheet,
  FileCheck: CheckCircle2,
  ArrowDownLeft: PlusCircle,
  ArrowUpRight: MinusCircle,
  PlusCircle,
  MinusCircle,
  CheckSquare: CheckCircle2,
  CreditCard,
  Plus: PlusCircle,
  PenTool: EditIconFallback,
  Landmark: CreditCard,
  Box,
  Warehouse,
  Barcode,
  Tag,
  Users,
  UserPlus: Users,
  FileContract: FileSpreadsheet,
  BookOpen,
  MessageSquare,
  Send,
  TrendingUp,
  BarChart2: TrendingUp,
  Layers: Box,
  FileSpreadsheet,
  Calculator,
  ScanLine,
  RefreshCw,
  Settings,
  Keyboard,
  Zap,
};

function EditIconFallback(props: any) {
  return <CreditCard {...props} />;
}

interface QuickCodeHUDProps {
  hudState: QuickCodeHUDState;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  items: QuickCodeItem[];
  onExecute: (item: QuickCodeItem) => void;
  onOpenSettings?: () => void;
}

export default function QuickCodeHUD({
  hudState,
  isModalOpen,
  setIsModalOpen,
  items,
  onExecute,
  onOpenSettings,
}: QuickCodeHUDProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isModalOpen]);

  // Filter items
  const filteredItems = useMemo(() => {
    let list = items.filter((item) => item.enabled);

    if (selectedCategory !== 'all') {
      list = list.filter((item) => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.code.includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (CATEGORY_LABELS[item.category as QuickCodeCategory] || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [items, selectedCategory, searchQuery]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.enabled) set.add(item.category);
    });
    return Array.from(set);
  }, [items]);

  return (
    <>
      {/* 1. Floating Keypad HUD (Triggered when typing 2-digit numbers directly anywhere in the app) */}
      <AnimatePresence>
        {hudState.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
            dir="rtl"
          >
            <div
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${
                hudState.status === 'success'
                  ? 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-500/20 text-white'
                  : hudState.status === 'error'
                  ? 'bg-slate-900/95 border-rose-500/50 shadow-rose-500/20 text-white'
                  : 'bg-slate-900/95 border-indigo-500/50 shadow-indigo-500/20 text-white'
              }`}
            >
              {/* Digit Box */}
              <div
                className={`flex items-center justify-center min-w-[56px] h-14 px-3 rounded-xl font-mono text-2xl font-black tracking-widest border shadow-inner ${
                  hudState.status === 'success'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : hudState.status === 'error'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 animate-pulse'
                }`}
                dir="ltr"
              >
                {hudState.code}
                {hudState.code.length === 1 && (
                  <span className="inline-block w-3 h-1 bg-indigo-400 mx-0.5 rounded-full animate-bounce" />
                )}
              </div>

              {/* Status & Message */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  {hudState.status === 'typing' && (
                    <Keyboard className="w-4 h-4 text-indigo-400 animate-pulse" />
                  )}
                  {hudState.status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {hudState.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-xs font-bold text-slate-300">
                    {hudState.status === 'typing'
                      ? 'کلید دسترسی سریع'
                      : hudState.status === 'success'
                      ? 'دسترسی سریع موفق'
                      : 'عدم انطباق کد'}
                  </span>
                </div>

                <div className="text-sm font-extrabold text-white mt-0.5">
                  {hudState.message || hudState.title}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Quick-Dial Command Palette Modal (Alt + K or Header Dial Button) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 sm:p-6" dir="rtl">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shadow-inner">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                      شماره‌گیر دسترسی سریع
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 font-mono" dir="ltr">
                        Alt + K
                      </span>
                    </h2>
                    <p className="text-xs text-slate-300/80 mt-0.5">
                      با تایپ کد ۲ رقمی در هر جای برنامه، صفحه یا عملیات مربوطه فورا اجرا می‌شود
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenSettings && (
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        onOpenSettings();
                      }}
                      title="تنظیم و ویرایش کدها"
                      className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search Bar & Categories */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-3 shrink-0">
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      // If user enters exactly 2 digits and hits an item, execute immediately
                      if (/^\d{2}$/.test(val)) {
                        const targetItem = items.find((i) => i.enabled && i.code === val);
                        if (targetItem) {
                          setIsModalOpen(false);
                          onExecute(targetItem);
                        }
                      }
                    }}
                    placeholder="جستجو با عنوان، کد ۲ رقمی (مثلا ۲۲ برای صدور فاکتور)..."
                    className="w-full pl-4 pr-11 py-3 bg-white rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    همه دسته‌ها ({items.filter((i) => i.enabled).length})
                  </button>
                  {categories.map((catKey) => {
                    const count = items.filter((i) => i.enabled && i.category === catKey).length;
                    return (
                      <button
                        key={catKey}
                        onClick={() => setSelectedCategory(catKey)}
                        className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                          selectedCategory === catKey
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {CATEGORY_LABELS[catKey as QuickCodeCategory] || catKey} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
                    <Keyboard className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm font-bold">هیچ کد یا عملیاتی مطابق با جستجوی شما یافت نشد</p>
                    <p className="text-xs text-slate-400 mt-1">
                      می‌توانید کدهای سفارشی دلخواه خود را در صفحه تنظیمات تعریف کنید
                    </p>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const IconComponent = ICON_MAP[item.iconName] || Keyboard;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setIsModalOpen(false);
                          onExecute(item);
                        }}
                        className="w-full text-right p-3.5 rounded-2xl border border-slate-100 bg-white hover:bg-indigo-50/60 hover:border-indigo-200 transition-all group flex items-center justify-between cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition flex items-center justify-center shrink-0">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-800 group-hover:text-indigo-900 transition truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
                                {CATEGORY_LABELS[item.category as QuickCodeCategory] || item.category}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* 2-Digit Badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div
                            className="px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-800 font-mono text-sm font-black tracking-wider transition border border-slate-200 group-hover:border-indigo-600 shadow-sm"
                            dir="ltr"
                          >
                            {item.code}
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:-translate-x-1 transition shrink-0" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    نیازی به باز کردن این پنجره نیست! در هر کجای برنامه <strong className="text-slate-700">عدد ۲ رقمی</strong> را تایپ کنید.
                  </span>
                </div>

                {onOpenSettings && (
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      onOpenSettings();
                    }}
                    className="font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    مدیریت و تغییر کدها
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
