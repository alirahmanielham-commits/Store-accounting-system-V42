import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  FileText, 
  Receipt, 
  Warehouse, 
  CreditCard, 
  Calendar, 
  Plus, 
  Save, 
  Star, 
  Copy, 
  Trash2, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  SlidersHorizontal,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { 
  PrintTemplateProfile, 
  DocumentPrintCategory, 
  defaultPrintProfiles 
} from '../../types/printStudio';
import { PrintTemplateService } from '../../services/printTemplateService';
import PrintStudioCanvas from './PrintStudioCanvas';
import PrintStudioControls from './PrintStudioControls';
import { motion, AnimatePresence } from 'motion/react';

interface PrintStudioHubProps {
  storeSettings?: any;
  invoices?: any[];
  persons?: any[];
  warehouses?: any[];
  transactions?: any[];
  checks?: any[];
  formatCurrency?: (val: any) => string;
  showNotification?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  confirmAction?: (message: string, onConfirm: () => void) => void;
}

export default function PrintStudioHub({
  storeSettings = {},
  invoices = [],
  persons = [],
  warehouses = [],
  transactions = [],
  checks = [],
  formatCurrency,
  showNotification,
  confirmAction,
}: PrintStudioHubProps) {
  // Category state
  const [selectedCategory, setSelectedCategory] = useState<DocumentPrintCategory>('invoice');

  // Profiles list state
  const [profiles, setProfiles] = useState<PrintTemplateProfile[]>(() => {
    return PrintTemplateService.getProfiles();
  });

  // Current active profile state
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    const def = PrintTemplateService.getDefaultProfile('invoice');
    return def.id;
  });

  // Active editable profile working copy
  const [currentProfile, setCurrentProfile] = useState<PrintTemplateProfile>(() => {
    return PrintTemplateService.getDefaultProfile('invoice');
  });

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // New profile modal state
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState<boolean>(false);
  const [newProfileName, setNewProfileName] = useState<string>('');

  // Import JSON modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');

  // When selected category changes, switch active profile to default for category
  useEffect(() => {
    const catProfiles = profiles.filter((p) => p.category === selectedCategory);
    const def = catProfiles.find((p) => p.isDefault) || catProfiles[0] || defaultPrintProfiles[0];
    setActiveProfileId(def.id);
    setCurrentProfile(JSON.parse(JSON.stringify(def)));
    setHasUnsavedChanges(false);
  }, [selectedCategory]);

  // When activeProfileId changes within same category
  const handleSelectProfile = (id: string) => {
    if (hasUnsavedChanges) {
      if (confirmAction) {
        confirmAction('تغییرات ذخیره‌نشده‌ای روی قالب فعلی وجود دارد. آیا مایل به جابجایی هستید؟', () => {
          doSwitchProfile(id);
        });
        return;
      }
    }
    doSwitchProfile(id);
  };

  const doSwitchProfile = (id: string) => {
    const found = profiles.find((p) => p.id === id);
    if (found) {
      setActiveProfileId(id);
      setCurrentProfile(JSON.parse(JSON.stringify(found)));
      setHasUnsavedChanges(false);
    }
  };

  // Handle changes made in inspector
  const handleProfileChange = (updated: PrintTemplateProfile) => {
    setCurrentProfile(updated);
    setHasUnsavedChanges(true);
  };

  // Save changes to current profile
  const handleSave = () => {
    PrintTemplateService.saveProfile(currentProfile);
    const reloaded = PrintTemplateService.getProfiles();
    setProfiles(reloaded);
    setHasUnsavedChanges(false);
    showNotification?.(`تنظیمات قالب «${currentProfile.name}» با موفقیت ذخیره شد.`, 'success');
  };

  // Set as default
  const handleSetDefault = () => {
    PrintTemplateService.setDefaultProfile(currentProfile.id);
    const reloaded = PrintTemplateService.getProfiles();
    setProfiles(reloaded);
    setCurrentProfile({ ...currentProfile, isDefault: true });
    showNotification?.(`قالب «${currentProfile.name}» به عنوان قالب پیش‌فرض این بخش تنظیم شد.`, 'success');
  };

  // Reset to factory defaults of this profile
  const handleResetProfile = () => {
    const factoryDef = defaultPrintProfiles.find((p) => p.id === currentProfile.id) ||
      defaultPrintProfiles.find((p) => p.category === currentProfile.category);
    if (factoryDef) {
      setCurrentProfile({
        ...JSON.parse(JSON.stringify(factoryDef)),
        id: currentProfile.id,
        name: currentProfile.name,
        isDefault: currentProfile.isDefault,
      });
      setHasUnsavedChanges(true);
      showNotification?.('تنظیمات به حالت پیش‌فرض بازنشانی شد. برای اعمال، دکمه ذخیره را بزنید.', 'info');
    }
  };

  // Delete profile
  const handleDeleteProfile = () => {
    const catProfiles = profiles.filter((p) => p.category === selectedCategory);
    if (catProfiles.length <= 1) {
      showNotification?.('حذف تنها قالب موجود در این بخش امکان‌پذیر نیست.', 'error');
      return;
    }

    if (confirmAction) {
      confirmAction(`آیا از حذف قالب «${currentProfile.name}» اطمینان دارید؟`, () => {
        PrintTemplateService.deleteProfile(currentProfile.id);
        const reloaded = PrintTemplateService.getProfiles();
        setProfiles(reloaded);
        const nextDef = PrintTemplateService.getDefaultProfile(selectedCategory);
        setActiveProfileId(nextDef.id);
        setCurrentProfile(JSON.parse(JSON.stringify(nextDef)));
        setHasUnsavedChanges(false);
        showNotification?.('قالب با موفقیت حذف گردید.', 'success');
      });
    }
  };

  // Create clone / new profile
  const handleCreateNewProfile = () => {
    if (!newProfileName.trim()) {
      showNotification?.('لطفاً نام قالب جدید را وارد کنید.', 'error');
      return;
    }
    const cloned = PrintTemplateService.duplicateProfile(currentProfile.id, newProfileName.trim());
    const reloaded = PrintTemplateService.getProfiles();
    setProfiles(reloaded);
    setActiveProfileId(cloned.id);
    setCurrentProfile(cloned);
    setHasUnsavedChanges(false);
    setIsNewProfileModalOpen(false);
    setNewProfileName('');
    showNotification?.(`قالب جدید «${cloned.name}» ایجاد و فعال شد.`, 'success');
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = PrintTemplateService.exportProfilesJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `print_templates_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification?.('فایل پشتیبان قالب‌های چاپ دانلود شد.', 'success');
  };

  // Import JSON
  const handleImportJson = () => {
    if (!importJsonText.trim()) return;
    const res = PrintTemplateService.importProfilesJson(importJsonText);
    if (res.success) {
      const reloaded = PrintTemplateService.getProfiles();
      setProfiles(reloaded);
      const def = PrintTemplateService.getDefaultProfile(selectedCategory);
      setActiveProfileId(def.id);
      setCurrentProfile(JSON.parse(JSON.stringify(def)));
      setHasUnsavedChanges(false);
      setIsImportModalOpen(false);
      setImportJsonText('');
      showNotification?.(`${res.count} قالب با موفقیت بارگذاری شد.`, 'success');
    } else {
      showNotification?.(`خطا در بارگذاری: ${res.error}`, 'error');
    }
  };

  // Reset everything to defaults
  const handleResetAllToFactory = () => {
    if (confirmAction) {
      confirmAction('آیا از بازنشانی کلیه قالب‌های چاپ در تمام بخش‌ها به تنظیمات پیش‌فرض کارخانه اطمینان دارید؟', () => {
        PrintTemplateService.resetToDefaults();
        const reloaded = PrintTemplateService.getProfiles();
        setProfiles(reloaded);
        const def = PrintTemplateService.getDefaultProfile(selectedCategory);
        setActiveProfileId(def.id);
        setCurrentProfile(JSON.parse(JSON.stringify(def)));
        setHasUnsavedChanges(false);
        showNotification?.('تمامی قالب‌ها به پیش‌فرض کارخانه بازنشانی شدند.', 'success');
      });
    }
  };

  // Available profiles for current category
  const currentCategoryProfiles = profiles.filter((p) => p.category === selectedCategory);

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] max-w-full mx-auto" dir="rtl">
      {/* Top Main Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-3xs">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900">مرکز مدیریت و طراحی چاپ</h1>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/60">
                طراحی بصری زنده
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              شخصی‌سازی ابعاد، ستون‌ها، سربرگ و حالت‌های خروجی برای فاکتورها، رسیدها و اسناد سیستم
            </p>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-3xs"
            title="ساخت قالب جدید یا کپی"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>قالب جدید</span>
          </button>

          <button
            onClick={handleExportJson}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
            title="دانلود خروجی تنظیمات (JSON Export)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
            title="بارگذاری فایل تنظیمات (JSON Import)"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetAllToFactory}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shadow-3xs"
            title="بازنشانی همه قالب‌ها به حالت کارخانه"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs transition-all shadow-xs cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 animate-pulse'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>ذخیره تغییرات</span>
          </button>
        </div>
      </div>

      {/* Category Tabs & Profile Selector Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {[
            { id: 'invoice', label: 'فاکتورها و پیش‌فاکتور', icon: FileText },
            { id: 'receipt', label: 'رسیدهای دریافت و پرداخت', icon: Receipt },
            { id: 'warehouse', label: 'اسناد و حواله‌های انبار', icon: Warehouse },
            { id: 'check', label: 'رسیدهای چک صیادی', icon: CreditCard },
            { id: 'loan', label: 'دفترچه اقساط و تسهیلات', icon: Calendar },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as DocumentPrintCategory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Profile Picker & Quick Profile Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">قالب فعال:</span>
            <select
              value={currentProfile.id}
              onChange={(e) => handleSelectProfile(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-3xs cursor-pointer min-w-56"
            >
              {currentCategoryProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isDefault ? '★ (پیش‌فرض سیستم)' : ''}
                </option>
              ))}
            </select>
          </div>

          {!currentProfile.isDefault ? (
            <button
              onClick={handleSetDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs"
              title="تنظیم این قالب به عنوان قالب پیش‌فرض این بخش"
            >
              <Star className="w-3.5 h-3.5 text-amber-600" />
              <span>انتخاب به عنوان پیش‌فرض</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/60 shadow-3xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>قالب پیش‌فرض فعال</span>
            </span>
          )}

          {currentCategoryProfiles.length > 1 && !currentProfile.isDefault && (
            <button
              onClick={handleDeleteProfile}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
              title="حذف این قالب"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Pane Split Layout */}
      <div className="flex-1 overflow-hidden p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Right Pane (Inspector Controls): 5 cols on lg */}
        <div className="lg:col-span-5 xl:col-span-4 h-full overflow-hidden flex flex-col">
          <PrintStudioControls
            profile={currentProfile}
            onChange={handleProfileChange}
            onReset={handleResetProfile}
          />
        </div>

        {/* Left Pane (Live Preview Canvas Stage): 7 cols on lg */}
        <div className="lg:col-span-7 xl:col-span-8 h-full overflow-hidden flex flex-col">
          <PrintStudioCanvas
            profile={currentProfile}
            storeSettings={storeSettings}
            liveInvoices={invoices}
            livePersons={persons}
            liveWarehouses={warehouses}
            liveTransactions={transactions}
            liveChecks={checks}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>

      {/* MODAL: CREATE NEW PROFILE */}
      <AnimatePresence>
        {isNewProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  ایجاد قالب جدید
                </h3>
                <button
                  onClick={() => setIsNewProfileModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4 font-medium">
                این قالب بر اساس تنظیمات و ویژگی‌های قالب فعلی («{currentProfile.name}») به عنوان یک نسخه مستقل تکثیر می‌شود.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نام قالب جدید</label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="مثال: فاکتور رسمی عمده‌فروشی با مهر"
                    className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsNewProfileModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  onClick={handleCreateNewProfile}
                  className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  ایجاد و بازگشایی قالب
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: IMPORT JSON */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-200"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  بارگذاری تنظیمات قالب‌ها (JSON Import)
                </h3>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4 font-medium">
                محتوای فایل پشتیبان JSON صادر شده از سیستم دیگر را در کادر زیر جای‌گذاری کنید:
              </p>

              <div>
                <textarea
                  rows={8}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="محتوای متنی JSON را اینجا الصاق کنید..."
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-left"
                  dir="ltr"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  onClick={handleImportJson}
                  disabled={!importJsonText.trim()}
                  className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  اعمال و درون‌ریزی
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
