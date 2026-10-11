import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { addCommas, numberToWords, getActiveStoreSettings, toPersianDigits } from "../../utils/format";
import { Plus } from "lucide-react";

const persianToEnglish = (str: string) => {
  const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicNumbers  = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  if (typeof str === 'string') {
    for (let i = 0; i < 10; i++) {
      str = str.replace(persianNumbers[i], i.toString()).replace(arabicNumbers[i], i.toString());
    }
  }
  return str;
};

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: any;
  onChange?: (e: any) => void;
  placeholder?: string;
  className?: string;
  hideWords?: boolean;
  currencyLabel?: string | null;
  showCurrencyBadge?: boolean;
  showConversion?: boolean;
  storeSettings?: any;
  enableFastZeroes?: boolean; // typing 'k' adds 000, 'm' adds 000000
  showQuickChips?: boolean; // Show quick +10k, +100k, +1M buttons
  error?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(({
  value,
  onChange,
  placeholder = "۰",
  className = "",
  hideWords = false,
  currencyLabel,
  showCurrencyBadge,
  showConversion = false,
  storeSettings,
  enableFastZeroes = true,
  showQuickChips = false,
  error,
  ...props
}, ref) => {
  const activeSettings = storeSettings || getActiveStoreSettings();
  const baseCurrency = (currencyLabel !== undefined && currencyLabel !== null && currencyLabel !== "")
    ? currencyLabel
    : (activeSettings?.currency || "تومان");

  // Determine if a currency badge should be rendered inside input
  const hasCurrencyBadge = showCurrencyBadge !== false && currencyLabel !== "" && currencyLabel !== null;

  const [localVal, setLocalVal] = useState(value !== undefined && value !== null ? addCommas(value) : "");
  const internalInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => internalInputRef.current as HTMLInputElement);

  useEffect(() => {
    if (value !== undefined && value !== null && value !== "") {
      const cleanVal = String(value).replace(/,/g, '');
      setLocalVal(addCommas(cleanVal));
    } else {
      setLocalVal("");
    }
  }, [value]);

  const numericValue = Number(persianToEnglish(localVal).replace(/,/g, "")) || 0;

  const triggerChange = (cleanNumStr: string) => {
    setLocalVal(addCommas(cleanNumStr));
    if (onChange) {
      onChange({
        target: {
          value: cleanNumStr,
          name: props.name
        }
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = persianToEnglish(e.target.value).replace(/,/g, "");

    // Quick multiplier: 'k' or 'K' -> adds '000', 'm' or 'M' -> adds '000000'
    if (enableFastZeroes) {
      if (raw.endsWith('k') || raw.endsWith('K') || raw.endsWith('ک')) {
        raw = raw.slice(0, -1) + '000';
      } else if (raw.endsWith('m') || raw.endsWith('M') || raw.endsWith('م')) {
        raw = raw.slice(0, -1) + '000000';
      } else if (raw.endsWith('b') || raw.endsWith('B') || raw.endsWith('مـ')) {
        raw = raw.slice(0, -1) + '000000000';
      }
    }

    if (activeSettings) {
      if (!activeSettings.use_decimals) {
        raw = raw.replace(/\./g, "");
      } else {
        const places = typeof activeSettings.decimal_places === "number" ? activeSettings.decimal_places : 2;
        const parts = raw.split(".");
        if (parts.length > 1 && parts[1].length > places) {
          return;
        }
      }
    }

    if (raw && isNaN(Number(raw)) && raw !== "-" && raw !== "." && raw !== "-.") return;
    triggerChange(raw);
  };

  const handleQuickAdd = (amountToAdd: number) => {
    const nextVal = Math.max(0, numericValue + amountToAdd);
    triggerChange(String(nextVal));
    if (internalInputRef.current) internalInputRef.current.focus();
  };

  return (
    <div className="w-full relative flex flex-col group text-right">
      <div className="relative flex items-center">
        <input
          ref={internalInputRef}
          type="text"
          dir="ltr"
          value={localVal}
          onChange={handleChange}
          placeholder={placeholder}
          className={`${className} text-left font-mono font-bold ${hasCurrencyBadge ? 'pl-3 pr-12' : 'px-2.5'} transition-all ${
            error ? 'border-rose-500 ring-1 ring-rose-500/30' : ''
          }`}
          {...props}
        />

        {/* Currency Badge inside input (strictly chosen system currency) */}
        {hasCurrencyBadge && (
          <div 
            className="absolute right-2.5 flex items-center select-none pointer-events-none px-1 py-0.5 rounded"
          >
            <span className="text-[11px] font-bold text-slate-500">
              {baseCurrency}
            </span>
          </div>
        )}
      </div>

      {/* Quick Add Chips (Optional) */}
      {showQuickChips && !props.disabled && (
        <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto pb-0.5 scrollbar-none" dir="rtl">
          {[10000, 50000, 100000, 500000, 1000000].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => handleQuickAdd(step)}
              className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/80 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" />
              {toPersianDigits(addCommas(step))}
            </button>
          ))}
          {numericValue > 0 && (
            <button
              type="button"
              onClick={() => triggerChange("0")}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              صفر
            </button>
          )}
        </div>
      )}

      {/* Online conversion subtitle & spelled-out words preview */}
      {numericValue > 0 && (
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 mt-1 px-1 gap-2 leading-tight">
          {/* Spelled-out Persian words */}
          {!hideWords && (
            <span className="text-slate-600 font-medium truncate max-w-full" title={numberToWords(numericValue)}>
              {numberToWords(numericValue)} {baseCurrency}
            </span>
          )}
        </div>
      )}

      {error && (
        <span className="text-[11px] text-rose-600 font-bold mt-1 px-1">
          {error}
        </span>
      )}
    </div>
  );
});

CurrencyInput.displayName = "CurrencyInput";

export default CurrencyInput;
