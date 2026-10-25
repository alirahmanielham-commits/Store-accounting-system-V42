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
  ArrowRight
} from 'lucide-react';
import { 
  QuickCodeItem, 
  QuickCodeCategory, 
  CATEGORY_LABELS, 
  getQuickCodes, 
  saveQuickCodes, 
  resetQuickCodes,
  isValidQuickCode,
  normalizeDigit
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
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if external change happens
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

  // Handle single code change
  const handleCodeChange = (id: string, newCode: string) => {
    // Keep only digits, up to 2 characters
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
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, enabled: !item.enabled };
        }
        return item;
      })
    );
    setHasChanges(true);
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

  // Save all
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
      confirmAction('آیا از بازنشانی تمامی کدهای دسترسی سریع به مقادیر اولیه کارخانه اطمینان دارید؟', doReset);
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
    if (selectedCategory !== 'all') {
      list = list.filter((i) => i.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.code.includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          (CATEGORY_LABELS[i.category as QuickCodeCategory] || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, selectedCategory, searchQuery]);

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
                هر صفحه و عملیات سیستم دارای یک کد ۲ رقمی یکتاست. کاربر می‌تواند در هر بخش با فشردن رقم‌ها (مانند <strong className="text-amber-300">۲۲</strong> برای صدور فاکتور فروش جدید)، بلافاصله عملیات را اجرا کند.
              </p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            بازنشانی به پیش‌فرض کارخانه
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges && duplicateCodes.size === 0}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md ${
              hasChanges
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse'
                : 'bg-white text-indigo-900 hover:bg-indigo-50'
            }`}
          >
            <Save className="w-4 h-4" />
            ذخیره تغییرات کدها
          </button>
        </div>
      </div>

      {/* Duplicate Alert Banner */}
      {duplicateCodes.size > 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
          <div className="text-xs">
            <span className="font-extrabold text-sm block">هشدار تداخل کدها:</span>
            کدهای ۲ رقمی [{Array.from(duplicateCodes).join('، ')}] به بیش از یک بخش اختصاص داده شده‌اند. برای جلوگیری از خطا هنگام فشردن کلیدها، لطفاً کدهای منحصر‌به‌فرد تعریف کنید.
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در نام صفحه، عملیات یا کد..."
            className="w-full pl-3 pr-10 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            همه موارد ({items.length})
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
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {catLabel} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-50 text-gray-500 font-extrabold uppercase border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">وضعیت</th>
                <th className="py-3.5 px-4 w-32 text-center">کد ۲ رقمی میانبر</th>
                <th className="py-3.5 px-4">عنوان صفحه / عملیات</th>
                <th className="py-3.5 px-4">دسته‌بندی</th>
                <th className="py-3.5 px-4 hidden md:table-cell">توضیحات عملکرد</th>
                <th className="py-3.5 px-4 w-28 text-center">کد پیش‌فرض</th>
                <th className="py-3.5 px-4 w-24 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => {
                const isDupe = duplicateCodes.has(item.code);
                const isInvalid = !isValidQuickCode(item.code);
                const isModified = item.code !== item.defaultCode;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-indigo-50/40 ${
                      !item.enabled ? 'opacity-50 bg-gray-50/50' : ''
                    } ${isDupe ? 'bg-rose-50/60' : ''}`}
                  >
                    {/* Active Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleEnabled(item.id)}
                        className="cursor-pointer text-indigo-600 hover:text-indigo-800 transition p-1"
                        title={item.enabled ? 'غیرفعال‌سازی این میانبر' : 'فعال‌سازی میانبر'}
                      >
                        {item.enabled ? (
                          <ToggleRight className="w-6 h-6 text-indigo-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
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
                              ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200'
                              : isInvalid && item.enabled
                              ? 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-200'
                              : isModified
                              ? 'border-indigo-500 bg-indigo-50/50 text-indigo-800 font-black'
                              : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 focus:border-indigo-500'
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
                      <div className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.id === 'new_sale_invoice' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            مثال کلیدی (۲۲)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                        {CATEGORY_LABELS[item.category as QuickCodeCategory] || item.category}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 text-gray-500 hidden md:table-cell">
                      {item.description}
                    </td>

                    {/* Default Code */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-gray-400" dir="ltr">
                      {item.defaultCode}
                    </td>

                    {/* Reset single button */}
                    <td className="py-3 px-4 text-center">
                      {isModified && (
                        <button
                          onClick={() => handleResetSingle(item.id)}
                          title="بازنشانی این مورد به پیش‌فرض"
                          className="px-2.5 py-1 text-xs rounded-lg text-indigo-600 hover:bg-indigo-50 font-bold transition cursor-pointer"
                        >
                          پیش‌فرض
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              نکته: برای فعال‌سازی از هر کجای برنامه، اطمینان حاصل کنید که نشانگر تایپ در فیلد متنی خاصی قرار ندارد.
            </span>
          </div>

          <div className="flex items-center gap-4 text-gray-600 font-bold">
            <span>تعداد کل: {items.length}</span>
            <span>فعال: {items.filter((i) => i.enabled).length}</span>
            {hasChanges && <span className="text-amber-600">● تغییرات ذخیره نشده</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
