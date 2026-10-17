import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Store, ChevronDown, Check, Plus, Settings2, Search, Building2, RefreshCw } from 'lucide-react';

interface BusinessItem {
  id: string;
  name: string;
  companyName?: string;
  company_name?: string;
  currency?: string;
  db_type?: string;
}

interface HeaderBusinessSelectorProps {
  activeStoreId: string;
  availableStores: BusinessItem[];
  onSwitchBusiness: (storeId: string) => Promise<void> | void;
  onOpenBusinessManager?: () => void;
  isSwitching?: boolean;
}

export default function HeaderBusinessSelector({
  activeStoreId,
  availableStores = [],
  onSwitchBusiness,
  onOpenBusinessManager,
  isSwitching = false
}: HeaderBusinessSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentStore = useMemo(() => {
    return availableStores.find(s => s.id === activeStoreId) || {
      id: activeStoreId || 'default',
      name: 'کسب‌وکار اصلی',
      companyName: 'کسب‌وکار اصلی'
    };
  }, [availableStores, activeStoreId]);

  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return availableStores;
    const q = searchQuery.trim().toLowerCase();
    return availableStores.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.companyName && s.companyName.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q))
    );
  }, [availableStores, searchQuery]);

  const handleSelect = async (storeId: string) => {
    if (storeId === activeStoreId) {
      setIsOpen(false);
      return;
    }
    try {
      setSwitchingId(storeId);
      await onSwitchBusiness(storeId);
    } finally {
      setSwitchingId(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-right" ref={dropdownRef} dir="rtl">
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-3xs group ${
          isOpen
            ? 'bg-indigo-100/90 border-indigo-300 ring-2 ring-indigo-200/50'
            : 'bg-indigo-50/80 hover:bg-indigo-100/90 border-indigo-200/80 hover:border-indigo-300'
        } ${isSwitching ? 'opacity-70 cursor-wait' : ''}`}
        title="کسب‌وکار فعال - برای جابجایی سریع کلیک کنید"
        aria-expanded={isOpen}
      >
        <div className="flex flex-col text-right">
          <div className="flex items-center gap-1.5">
            {isSwitching ? (
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
            ) : (
              <Store className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
            )}
            <span className="text-xs font-black text-slate-900 group-hover:text-indigo-900 truncate max-w-[130px] sm:max-w-[190px]">
              {currentStore.name || 'کسب‌وکار اصلی'}
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
              فعال
            </span>
          </div>
          <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
            <span>تغییر کسب‌وکار</span>
            <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200/80 p-2 z-[9999] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-2 border-b border-slate-100 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black text-slate-800">کسب‌وکارهای در دسترس</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {availableStores.length} مورد
              </span>
            </div>

            {/* Search Input if more than 3 businesses */}
            {availableStores.length > 3 && (
              <div className="relative mt-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی کسب‌وکار..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Business List */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 px-1 py-0.5 custom-scrollbar">
            {filteredStores.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                کسب‌وکاری با این مشخصات یافت نشد
              </div>
            ) : (
              filteredStores.map((store) => {
                const isActive = store.id === activeStoreId;
                const isItemSwitching = switchingId === store.id;

                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => handleSelect(store.id)}
                    disabled={isItemSwitching}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50/80 border border-indigo-200 text-indigo-950 font-bold'
                        : 'hover:bg-slate-50 border border-transparent text-slate-700 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isItemSwitching ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Store className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex flex-col text-right">
                        <span className="text-xs font-bold truncate">
                          {store.name || 'کسب‌وکار'}
                        </span>
                        {(store.companyName || store.company_name) && (
                          <span className="text-[10px] text-slate-500 truncate">
                            {store.companyName || store.company_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 mr-2">
                      {isActive ? (
                        <div className="flex items-center gap-1 text-[10px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full shadow-3xs">
                          <Check className="w-3 h-3" />
                          <span>فعال</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-bold px-2 py-0.5 rounded-lg border border-indigo-100">
                          انتخاب
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Actions Footer */}
          {onOpenBusinessManager && (
            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-1.5 px-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenBusinessManager();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-slate-700 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                <span>مدیریت کسب‌وکارها</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenBusinessManager();
                }}
                className="flex items-center justify-center gap-1 py-2 px-3 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer"
                title="ایجاد کسب‌وکار جدید"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>جدید</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
