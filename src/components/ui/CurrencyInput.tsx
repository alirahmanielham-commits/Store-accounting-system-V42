import React, { useState, useEffect } from 'react';
import { addCommas, removeCommas, getActiveStoreSettings } from '../../utils/format';

export default function CurrencyInput({ value, onChange, placeholder, className, disabled, onBlur, storeSettings }: any) {
  const [localVal, setLocalVal] = useState(value ? addCommas(value) : "");
  
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setLocalVal(addCommas(value));
    }
  }, [value]);
  
  return (
    <input
      type="text"
      value={localVal}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      onBlur={onBlur}
      onChange={(e) => {
        const settings = storeSettings || getActiveStoreSettings();
        const useDecimals = Boolean(settings?.use_decimals);
        const places = typeof settings?.decimal_places === 'number' ? settings.decimal_places : 2;

        let clean = removeCommas(e.target.value).replace(/[^0-9.-]/g, "");
        if (!useDecimals) {
          clean = clean.replace(/\./g, "");
        } else {
          const parts = clean.split('.');
          if (parts.length > 2) {
            clean = parts[0] + '.' + parts.slice(1).join('');
          }
          const finalParts = clean.split('.');
          if (finalParts.length > 1 && finalParts[1].length > places) {
            return;
          }
        }
        setLocalVal(addCommas(clean));
        onChange({ target: { value: clean } });
      }}
    />
  );
}
