import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  subLabel?: React.ReactNode;
  badge?: string;
  searchStr?: string;
  imageUrl?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  menuPlacement?: 'top' | 'bottom';
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'انتخاب کنید...',
  searchPlaceholder = 'جستجو...',
  disabled = false,
  menuPlacement = 'bottom'
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setSearchQuery(''); // clear search when closing
    }
  }, [isOpen]);

  const filteredOptions = options.filter(
    (opt) => {
      if (!searchQuery) return true;
      const terms = searchQuery.toLowerCase().split(' ').filter(Boolean);
      const searchable = (
        opt.label + ' ' + 
        (typeof opt.subLabel === 'string' ? opt.subLabel : '') + ' ' + 
        (opt.searchStr || '')
      ).toLowerCase();
      
      return terms.every((term) => searchable.includes(term));
    }
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-2.5 border ${
          isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-200'
        } rounded-xl bg-white text-right flex items-center justify-between transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-indigo-400'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedOption?.imageUrl && (
            <img src={selectedOption.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 border border-gray-200" />
          )}
          <span className={`truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: menuPlacement === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-full ${menuPlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col`}
          >
            <div className="p-2 border-b border-gray-100 flex items-center gap-2 sticky top-0 bg-white z-10">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full text-sm outline-none bg-transparent"
                dir="rtl"
              />
            </div>
            <div className="overflow-y-auto w-full custom-scrollbar">
              {filteredOptions.length > 0 ? (
                <ul className="py-1">
                  {filteredOptions.map((opt, index) => {
                    const isSelected = String(opt.value) === String(value);
                    return (
                      <li
                        key={`${opt.value}-${index}`}
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                        }}
                        className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {opt.imageUrl && (
                            <img src={opt.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200" />
                          )}
                          <div className="flex flex-col">
                             <span className={`text-sm ${isSelected ? 'font-bold text-indigo-900' : 'text-gray-800'}`}>
                               {opt.label}
                             </span>
                             {opt.subLabel && <span className="text-xs text-gray-500 mt-0.5">{opt.subLabel}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           {opt.badge && (
                             <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                               {opt.badge}
                             </span>
                           )}
                           {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="py-4 text-center text-sm text-gray-500">موردی یافت نشد.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
