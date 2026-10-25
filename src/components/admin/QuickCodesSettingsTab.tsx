import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Keyboard, 
  Search, 
  RotateCcw, 
  Save, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  Hash, 
  Info,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Filter,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  X,
  ExternalLink,
  Zap,
  Sliders,
  CheckSquare
} from 'lucide-react';
import { 
  QuickCodeItem, 
  QuickCodeCategory, 
  QuickCodeType,
  CATEGORY_LABELS, 
  SYSTEM_TARGET_OPTIONS,
  TargetOption,
  getQuickCodes, 
  saveQuickCodes, 
  resetQuickCodes,
  isValidQuickCode,
  normalizeDigit,
  getNextAvailableCode,
  deleteQuickCodeItem,
  checkDuplicateCode
} from '../../services/quickCodeService';
import { playAudioFeedback } from '../../utils/audio';

interface QuickCodesSettingsTabProps {
  showNotification?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  confirmAction?: (message: string, onConfirm: () => void) => void;
}

export default function QuickCodesSettingsTab({
  showNotification,
  confirmAction,
}: QuickCodesSettingsTabProps) {
  const [items, setItems] = useState<QuickCodeItem[]>(() => getQuickCodes());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled' | 'conflict'>('all');
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modal State for Add / Edit Shortcut
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formSourceType, setFormSourceType] = useState<'preset' | 'custom'>('preset');
  const [formSelectedPreset, setFormSelectedPreset] = useState<string>('');
  const [formData, setFormData] = useState<{
    code: string;
    title: string;
    description: string;
    category: QuickCodeCategory;
    type: QuickCodeType;
    target: string;
    enabled: boolean;
  }>({
    code: '',
    title: '',
    description: '',
    category: 'invoices',
    type: 'tab',
    target: '',
    enabled: true,
  });

  // Sync state if external changes happen
  useEffect(() => {
    setItems(getQuickCodes());
  }, []);

  // Duplicate codes calculation
  const duplicateCodes = useMemo(() => {
    const codeCount: Record<string, number> = {};
    items.forEach((item) => {
      if (item.enabled && item.code) {
        codeCount[item.code] = (codeCount[item.code] || 0) + 1;
      }
    });

    const dupes = new Set<string>();
    Object.entries(codeCount).forEach(([code, count]) => {
      if (count > 1) dupes.add(code);
    });
    return dupes;
  }, [items]);

  // Handle single code change in table
  const handleCodeChange = (id: string, newCode: string) => {
    let cleaned = '';
    for (const ch of newCode) {
      const d = normalizeDigit(ch);
      if (d !== null && cleaned.length < 2) {
        cleaned += d;
      }
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, code: cleaned };
        }
        return item;
      })
    );
    setHasChanges(true);
  };

  // Toggle enable/disable
  const handleToggleEnabled = (id: string) => {
    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.enabled;
          playAudioFeedback(nextState ? 'success' : 'info');
          return { ...item, enabled: nextState };
        }
        return item;
      });
      // Auto persist toggles for immediate smoothness
      saveQuickCodes(updated);
      return updated;
    });
    setHasChanges(false);
  };

  // Reset single code to default
  const handleResetSingle = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, code: item.defaultCode, enabled: true };
        }
        return item;
      })
    );
    setHasChanges(true);
  };

  // Delete item with confirmation
  const handleDeleteItem = (id: string, itemTitle: string) => {
    const doDelete = () => {
      setItems((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        saveQuickCodes(updated);
        return updated;
      });
      setHasChanges(false);
      playAudioFeedback('success');
      if (showNotification) {
        showNotification(`میانبر «${itemTitle}» با موفقیت حذف گردید.`, 'info');
      }
    };

    if (confirmAction) {
      confirmAction(`آیا از حذف میانبر و دسترسی سریع «${itemTitle}» اطمینان دارید؟`, doDelete);
    } else if (window.confirm(`آیا از حذف میانبر «${itemTitle}» اطمینان دارید؟`)) {
      doDelete();
    }
  };

  // Open modal for Adding new shortcut
  const handleOpenAddModal = () => {
    const suggestedCode = getNextAvailableCode(items);
    const defaultPreset = SYSTEM_TARGET_OPTIONS[0];

    setEditingItemId(null);
    setFormSourceType('preset');
    setFormSelectedPreset(defaultPreset.target);
    setFormData({
      code: suggestedCode,
      title: defaultPreset.title,
      description: defaultPreset.description,
      category: defaultPreset.category,
      type: defaultPreset.type,
      target: defaultPreset.target,
      enabled: true,
    });
    setIsModalOpen(true);
  };

  // Open modal for Editing shortcut metadata
  const handleOpenEditModal = (item: QuickCodeItem) => {
    setEditingItemId(item.id);
    const matchingPreset = SYSTEM_TARGET_OPTIONS.find((p) => p.target === item.target);

    setFormSourceType(matchingPreset ? 'preset' : 'custom');
    setFormSelectedPreset(matchingPreset ? matchingPreset.target : '');
    setFormData({
      code: item.code,
      title: item.title,
      description: item.description,
      category: item.category,
      type: item.type,
      target: item.target,
      enabled: item.enabled,
    });
    setIsModalOpen(true);
  };

  // Handle preset selection change in modal
  const handlePresetChange = (presetTarget: string) => {
    setFormSelectedPreset(presetTarget);
    const preset = SYSTEM_TARGET_OPTIONS.find((p) => p.target === presetTarget);
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        title: preset.title,
        description: preset.description,
        category: preset.category,
        type: preset.type,
        target: preset.target,
      }));
    }
  };

  // Modal Code Input change with digit normalization
  const handleModalCodeChange = (raw: string) => {
    let cleaned = '';
    for (const ch of raw) {
      const d = normalizeDigit(ch);
      if (d !== null && cleaned.length < 2) {
        cleaned += d;
      }
    }
    setFormData((prev) => ({ ...prev, code: cleaned }));
  };

  // Save Modal Form (Add or Edit)
  const handleSaveModal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isValidQuickCode(formData.code)) {
      if (showNotification) {
        showNotification('لطفاً یک کد ۲ رقمی معتبر (از ۰۰ تا ۹۹) وارد کنید.', 'error');
      }
      playAudioFeedback('error');
      return;
    }

    if (!formData.title.trim()) {
      if (showNotification) {
        showNotification('لطفاً عنوان میانبر را وارد کنید.', 'error');
      }
      playAudioFeedback('error');
      return;
    }

    if (!formData.target.trim()) {
      if (showNotification) {
        showNotification('لطفاً صفحه مقصد یا شناسه عملیات را مشخص کنید.', 'error');
      }
      playAudioFeedback('error');
      return;
    }

    // Check duplicate code against other enabled items
    if (formData.enabled) {
      const dupe = checkDuplicateCode(formData.code, editingItemId || undefined, items);
      if (dupe && dupe.enabled) {
        if (showNotification) {
          showNotification(`کد ${formData.code} در حال حاضر به «${dupe.title}» اختصاص دارد. لطفاً یک کد غیرتکراری انتخاب کنید.`, 'error');
        }
        playAudioFeedback('error');
        return;
      }
    }

    if (editingItemId) {
      // Update existing item
      const updated = items.map((item) => {
        if (item.id === editingItemId) {
          return {
            ...item,
            code: formData.code,
            title: formData.title.trim(),
            description: formData.description.trim(),
            category: formData.category,
            type: formData.type,
            target: formData.target.trim(),
            enabled: formData.enabled,
          };
        }
        return item;
      });
      setItems(updated);
      saveQuickCodes(updated);
      playAudioFeedback('success');
      if (showNotification) {
        showNotification('تغییرات میانبر با موفقیت ذخیره گردید.', 'success');
      }
    } else {
      // Add new item
      const newItem: QuickCodeItem = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code: formData.code,
        defaultCode: formData.code,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        type: formData.type,
        target: formData.target.trim(),
        iconName: formData.type === 'action' ? 'Zap' : 'FileText',
        enabled: formData.enabled,
        isCustom: true,
      };
      const updated = [newItem, ...items];
      setItems(updated);
      saveQuickCodes(updated);
      playAudioFeedback('success');
      if (showNotification) {
        showNotification(`صفحه و میانبر جدید «${newItem.title}» با کد ${newItem.code} به سیستم اضافه شد.`, 'success');
      }
    }

    setIsModalOpen(false);
    setHasChanges(false);
  };

  // Save all changes in table
  const handleSave = () => {
    // Validate: are all enabled items having valid 2-digit codes?
    const invalidItems = items.filter((i) => i.enabled && !isValidQuickCode(i.code));
    if (invalidItems.length > 0) {
      if (showNotification) {
        showNotification(
          `لطفاً برای تمام موارد فعال یک کد ۲ رقمی معتبر (از ۰۰ تا ۹۹) وارد کنید. (${invalidItems[0].title})`,
          'error'
        );
      }
      playAudioFeedback('error');
      return;
    }

    if (duplicateCodes.size > 0) {
      const dupeList = Array.from(duplicateCodes).join('، ');
      if (showNotification) {
        showNotification(
          `کدهای تکراری یافت شدند (${dupeList}). برای جلوگیری از تداخل، هر عملیات باید کد یکتا داشته باشد.`,
          'error'
        );
      }
      playAudioFeedback('error');
      return;
    }

    saveQuickCodes(items);
    setHasChanges(false);
    setSavedSuccess(true);
    playAudioFeedback('success');
    if (showNotification) {
      showNotification('تنظیمات کدهای ۲ رقمی دسترسی سریع با موفقیت ذخیره گردید.', 'success');
    }
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Factory reset
  const handleFactoryReset = () => {
    const doReset = () => {
      const defaults = resetQuickCodes();
      setItems(defaults);
      setHasChanges(false);
      playAudioFeedback('success');
      if (showNotification) {
        showNotification('تمامی کدهای ۲ رقمی به تنظیمات پیش‌فرض کارخانه بازنشانی شدند.', 'info');
      }
    };

    if (confirmAction) {
      confirmAction('آیا از بازنشانی تمامی کدهای دسترسی سریع به مقادیر اولیه کارخانه اطمینان دارید؟ تمامی صفحات سفارشی نیز حذف خواهند شد.', doReset);
    } else if (window.confirm('آیا از بازنشانی تمامی کدهای دسترسی سریع به مقادیر اولیه کارخانه اطمینان دارید؟')) {
      doReset();
    }
  };

  // Print Cheat Sheet
  const handlePrintCheatSheet = () => {
    window.print();
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    let list = items;

    // Filter by Category
    if (selectedCategory !== 'all') {
      list = list.filter((i) => i.category === selectedCategory);
    }

    // Filter by Status
    if (statusFilter === 'enabled') {
      list = list.filter((i) => i.enabled);
    } else if (statusFilter === 'disabled') {
      list = list.filter((i) => !i.enabled);
    } else if (statusFilter === 'conflict') {
      list = list.filter((i) => duplicateCodes.has(i.code));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.code.includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.target.toLowerCase().includes(q) ||
          (CATEGORY_LABELS[i.category as QuickCodeCategory] || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, selectedCategory, statusFilter, searchQuery, duplicateCodes]);

  return (
    <div className="flex flex-col h-full space-y-6" dir="rtl">
      {/* Print-only StyleSheet for Quick-Reference Desk Card */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #quick-codes-print-sheet, #quick-codes-print-sheet * {
            visibility: visible;
          }
          #quick-codes-print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20px;
            display: block !important;
          }
        }
      `}</style>

      {/* Hidden Print Container */}
      <div id="quick-codes-print-sheet" className="hidden print:block text-black font-sans">
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black">راهنمای کدهای دسترسی سریع ۲ رقمی کیبورد</h1>
            <p className="text-sm text-gray-600 mt-1">
              جهت ورود فوری به صفحات یا اجرای عملیات، عدد ۲ رقمی را بدون نیاز به ماوس در کیبورد تایپ کنید.
            </p>
          </div>
          <div className="border-2 border-black px-4 py-2 font-mono text-xl font-bold">
            کلید میانبر: Alt + K
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {items
            .filter((i) => i.enabled)
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 border border-gray-300 rounded-lg text-sm"
              >
                <div>
                  <div className="font-bold">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
                <div className="font-mono text-lg font-black bg-gray-100 px-3 py-1 rounded border border-gray-400">
                  {item.code}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-indigo-700/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-200">
              <Keyboard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                مدیریت کدهای دسترسی سریع کیبورد (۲ رقمی)
              </h2>
              <p className="text-xs text-indigo-200/90 mt-1 max-w-2xl leading-relaxed">
                هر صفحه و عملیات سیستم دارای یک کد ۲ رقمی یکتاست. می‌توانید کدها را تغییر دهید، صفحه یا میانبر دلخواه اضافه کنید، موارد غیرضروری را حذف یا غیرفعال نمایید.
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions Bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20"
          >
            <Plus className="w-4 h-4" />
            افزودن صفحه / میانبر جدید
          </button>

          <button
            onClick={handlePrintCheatSheet}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer border border-white/10"
            title="چاپ برگه میانبرها جهت قرار دادن روی میز کار یا کنار صندوق"
          >
            <Printer className="w-4 h-4" />
            چاپ برگه راهنما
          </button>

          <button
            onClick={handleFactoryReset}
            className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer border border-rose-500/30"
          >
            <RotateCcw className="w-4 h-4" />
            بازنشانی به پیش‌فرض
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges && duplicateCodes.size === 0}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md ${
              hasChanges
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 animate-pulse font-extrabold'
                : 'bg-white text-indigo-900 hover:bg-indigo-50 dark:bg-slate-800 dark:text-slate-100'
            }`}
          >
            <Save className="w-4 h-4" />
            ذخیره تغییرات کدها
          </button>
        </div>
      </div>

      {/* Duplicate Alert Banner */}
      {duplicateCodes.size > 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
          <div className="text-xs">
            <span className="font-extrabold text-sm block">هشدار تداخل کدها:</span>
            کدهای ۲ رقمی [{Array.from(duplicateCodes).join('، ')}] به بیش از یک بخش اختصاص داده شده‌اند. برای جلوگیری از خطا هنگام فشردن کلیدها، لطفاً کدهای منحصر‌به‌فرد تعریف کنید.
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در نام صفحه، عملیات، کد یا مسیر..."
            className="w-full pl-3 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              همه ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('enabled')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'enabled'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              فعال‌ها ({items.filter((i) => i.enabled).length})
            </button>
            <button
              onClick={() => setStatusFilter('disabled')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'disabled'
                  ? 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 shadow-xs'
                  : 'hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              غیرفعال ({items.filter((i) => !i.enabled).length})
            </button>
            {duplicateCodes.size > 0 && (
              <button
                onClick={() => setStatusFilter('conflict')}
                className={`px-3 py-1.5 rounded-lg transition text-rose-600 dark:text-rose-400 ${
                  statusFilter === 'conflict'
                    ? 'bg-rose-50 dark:bg-rose-950/60 shadow-xs font-black'
                    : 'hover:bg-rose-100/50'
                }`}
              >
                تداخل ({duplicateCodes.size})
              </button>
            )}
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            همه دسته‌ها
          </button>
          {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => {
            const count = items.filter((i) => i.category === catKey).length;
            if (count === 0) return null;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === catKey
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {catLabel} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-50 dark:bg-slate-850 text-gray-500 dark:text-slate-400 font-extrabold uppercase border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="py-3.5 px-4 w-14 text-center">وضعیت</th>
                <th className="py-3.5 px-4 w-32 text-center">کد ۲ رقمی</th>
                <th className="py-3.5 px-4">عنوان صفحه / میانبر</th>
                <th className="py-3.5 px-4">دسته‌بندی</th>
                <th className="py-3.5 px-4 hidden md:table-cell">توضیحات و عملکرد</th>
                <th className="py-3.5 px-4 w-28 text-center hidden sm:table-cell">کد پیش‌فرض</th>
                <th className="py-3.5 px-4 w-32 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredItems.map((item) => {
                const isDupe = duplicateCodes.has(item.code);
                const isInvalid = !isValidQuickCode(item.code);
                const isModified = item.code !== item.defaultCode;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 ${
                      !item.enabled ? 'opacity-50 bg-gray-50/50 dark:bg-slate-900/40' : ''
                    } ${isDupe ? 'bg-rose-50/70 dark:bg-rose-950/30' : ''}`}
                  >
                    {/* Active Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleEnabled(item.id)}
                        className="cursor-pointer text-indigo-600 dark:text-indigo-400 transition p-1"
                        title={item.enabled ? 'غیرفعال‌سازی این میانبر (بدون حذف)' : 'فعال‌سازی مجدد میانبر'}
                      >
                        {item.enabled ? (
                          <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-slate-600" />
                        )}
                      </button>
                    </td>

                    {/* Editable 2-Digit Code Input */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5" dir="ltr">
                        <input
                          type="text"
                          maxLength={2}
                          disabled={!item.enabled}
                          value={item.code}
                          onChange={(e) => handleCodeChange(item.id, e.target.value)}
                          className={`w-14 h-10 text-center font-mono text-base font-black rounded-xl border transition shadow-sm ${
                            isDupe
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 ring-2 ring-rose-200 dark:ring-rose-900'
                              : isInvalid && item.enabled
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-200 ring-2 ring-amber-200'
                              : isModified
                              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 font-black'
                              : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 hover:border-gray-300 dark:hover:border-slate-600 focus:border-indigo-500'
                          } focus:outline-none focus:ring-2 focus:ring-indigo-400`}
                        />
                        {isDupe && (
                          <span
                            title="کد تکراری است!"
                            className="text-rose-500 text-xs font-bold"
                          >
                            ⚠️
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-gray-900 dark:text-slate-100 text-sm flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.id === 'keyboard_receipt' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" />
                            ثبت سریع کیبورد (۳۹)
                          </span>
                        )}
                        {item.id === 'new_sale_invoice' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold">
                            فروش جدید (۲۲)
                          </span>
                        )}
                        {item.isCustom && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 font-bold">
                            سفارشی
                          </span>
                        )}
                        {item.type === 'action' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 font-bold">
                            عملیات
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold text-[11px]">
                        {CATEGORY_LABELS[item.category as QuickCodeCategory] || item.category}
                      </span>
                    </td>

                    {/* Description & Target */}
                    <td className="py-3 px-4 text-gray-500 dark:text-slate-400 hidden md:table-cell">
                      <div className="line-clamp-1">{item.description}</div>
                      <div className="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-0.5">
                        مسیر: {item.target}
                      </div>
                    </td>

                    {/* Default Code */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-gray-400 dark:text-slate-500 hidden sm:table-cell" dir="ltr">
                      {item.defaultCode || '-'}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Reset to default code if modified */}
                        {isModified && item.defaultCode && (
                          <button
                            onClick={() => handleResetSingle(item.id)}
                            title="بازنشانی این کد به پیش‌فرض"
                            className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit metadata */}
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          title="ویرایش عنوان، کد یا مقصد"
                          className="p-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteItem(item.id, item.title)}
                          title="حذف کامل این میانبر"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
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
        </div>

        {/* Footer info */}
        <div className="bg-gray-50 dark:bg-slate-850 p-4 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              نکته: با فشردن دو رقم میانبر در کیبورد بدون نیاز به ماوس، مستقیماً به صفحه یا فرم مربوطه منتقل می‌شوید.
            </span>
          </div>

          <div className="flex items-center gap-4 text-gray-600 dark:text-slate-300 font-bold">
            <span>کل صفحات: {items.length}</span>
            <span className="text-emerald-600 dark:text-emerald-400">فعال: {items.filter((i) => i.enabled).length}</span>
            <span className="text-gray-400 dark:text-slate-500">غیرفعال: {items.filter((i) => !i.enabled).length}</span>
            {hasChanges && <span className="text-amber-600 dark:text-amber-400 animate-pulse">● تغییرات ذخیره نشده</span>}
          </div>
        </div>
      </div>

      {/* Add / Edit Shortcut Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-right"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/70 dark:bg-slate-850">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    {editingItemId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-slate-100 text-base">
                      {editingItemId ? 'ویرایش میانبر و کد دسترسی' : 'تعریف و افزودن میانبر صفحه جدید'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      انتخاب صفحه و تخصیص کد ۲ رقمی کیبورد
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveModal} className="p-6 space-y-4">
                {/* Mode: Preset vs Custom */}
                {!editingItemId && (
                  <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFormSourceType('preset')}
                      className={`flex-1 py-2 rounded-lg transition text-center ${
                        formSourceType === 'preset'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-gray-600 dark:text-slate-400'
                      }`}
                    >
                      انتخاب از صفحات موجود سیستم
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSourceType('custom')}
                      className={`flex-1 py-2 rounded-lg transition text-center ${
                        formSourceType === 'custom'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-gray-600 dark:text-slate-400'
                      }`}
                    >
                      ورود دستی مسیر و عملیات
                    </button>
                  </div>
                )}

                {/* Preset Selector */}
                {formSourceType === 'preset' && !editingItemId && (
                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-slate-300 mb-1.5">
                      صفحه یا عملیات مورد نظر
                    </label>
                    <select
                      value={formSelectedPreset}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {SYSTEM_TARGET_OPTIONS.map((opt) => (
                        <option key={opt.target} value={opt.target}>
                          {opt.title} ({CATEGORY_LABELS[opt.category]} - {opt.target})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 2-Digit Code Input & Live Preview */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-slate-300 mb-1.5">
                      کد ۲ رقمی <span className="text-rose-500">*</span>
                    </label>
                    <div dir="ltr" className="relative">
                      <input
                        type="text"
                        maxLength={2}
                        required
                        value={formData.code}
                        onChange={(e) => handleModalCodeChange(e.target.value)}
                        placeholder="39"
                        className="w-full h-11 text-center font-mono text-xl font-black bg-indigo-50/50 dark:bg-slate-800 border-2 border-indigo-500 rounded-xl text-indigo-900 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-slate-300 mb-1.5">
                      عنوان صفحه / میانبر <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="مانند: ثبت سریع رسید با کیبورد"
                      className="w-full h-11 px-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Category & Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-slate-300 mb-1.5">
                      دسته‌بندی
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as QuickCodeCategory })}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => (
                        <option key={catKey} value={catKey}>
                          {catLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-slate-300 mb-1.5">
                      نوع میانبر
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as QuickCodeType })}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="tab">صفحه / برگه (Tab)</option>
                      <option value="action">عملیات سریع / پاپ‌آپ (Action)</option>
                    </select>
                  </div>
                </div>

                {/* Target Route / Identifier */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 dark:text-slate-300 mb-1.5">
                    شناسه تب مقصد / عملیات (Target) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    placeholder="مثال: keyboard_receipt یا list_sale"
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 dark:text-slate-300 mb-1.5">
                    توضیحات عملکرد (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="توضیح کوتاه درباره عملکرد این میانبر..."
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Enable toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                  <div className="text-xs">
                    <span className="font-extrabold block text-gray-800 dark:text-slate-200">وضعیت فعال بودن میانبر</span>
                    <span className="text-gray-500 dark:text-slate-400 text-[11px]">در صورت غیرفعال بودن، کد ۲ رقمی اجرا نخواهد شد.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                    className="cursor-pointer text-indigo-600 dark:text-indigo-400"
                  >
                    {formData.enabled ? (
                      <ToggleRight className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-gray-400 dark:text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-indigo-900/20 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {editingItemId ? 'بروزرسانی میانبر' : 'افزودن و ذخیره میانبر'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
